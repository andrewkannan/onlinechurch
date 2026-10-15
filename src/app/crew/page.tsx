"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Navbar from "@/components/Navbar";
import CrewTrainingAcademy from "@/components/CrewTrainingAcademy";

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
type UserPermission = "ADMIN" | "LEAD" | "OPERATOR";
type DutyStatus = "ON_DUTY" | "STANDBY" | "OFF_DUTY";
type GoNoGoStatus = "GO" | "STANDBY" | "HOLD";
type PreFlightPhase = "T-60M" | "T-30M" | "T-15M" | "T-5M";

interface CrewUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  callsign: string;
  role: CrewRole;
  permission: UserPermission;
  stationAssignment: string;
  status: DutyStatus;
  goStatus: GoNoGoStatus;
  device: string;
  lastActiveAt: string;
  completedLessons?: string[];
  certifiedRoles?: CrewRole[];
}

interface CrewChecklistItem {
  id: string;
  role: CrewRole;
  phase: PreFlightPhase;
  category: string;
  task: string;
  detail: string;
  isCritical: boolean;
  assignedToUserId: string;
  assignedToName: string;
  checked: boolean;
  checkedBy?: string | null;
  checkedAt?: string | null;
}

interface QcLogItem {
  id: string;
  serviceDate: string;
  streamTimestamp: string;
  type: "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT";
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WIN";
  platform: "YOUTUBE" | "INSTAGRAM" | "BOTH";
  station:
    | "CAMERA"
    | "AUDIO"
    | "MODERATOR"
    | "LIGHTING"
    | "NETWORK"
    | "DIRECTOR";
  title: string;
  description: string;
  actionToTake: string;
  assignedTo: string;
  timelineToSolve: string;
  targetDate: string;
  status: "WAITING_DIRECTOR" | "IN_PROGRESS" | "RESOLVED";
  screenshotUrl?: string | null;
  markerPos?: { x: number; y: number } | null;
  loggedBy: string;
  createdAt: string;
  pushedToRoadmap?: boolean;
}

// Apple Pro Refined Department Color System (High contrast, non-neon, distinct per department)
const DEPT_STYLES: Record<
  string,
  {
    label: string;
    code: string;
    dot: string;
    text: string;
    bar: string;
    topBorder: string;
    leftBorder: string;
    pill: string;
    filterActive: string;
    verifiedCard: string;
    selectedCard: string;
    checkSquare: string;
  }
> = {
  CAMERA: {
    label: "Camera",
    code: "CAM",
    dot: "bg-amber-400",
    text: "text-amber-400",
    bar: "bg-amber-400",
    topBorder: "border-t-2 border-t-amber-400",
    leftBorder: "border-l-[3px] border-l-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    filterActive: "bg-amber-400 text-black font-semibold",
    verifiedCard:
      "bg-[#141310] border border-amber-500/25 border-l-[3px] border-l-amber-400 hover:border-amber-400/50",
    selectedCard: "bg-[#1a1710] border border-amber-400 ring-1 ring-amber-400/30",
    checkSquare: "bg-amber-400 text-black",
  },
  AUDIO: {
    label: "Audio",
    code: "AUD",
    dot: "bg-sky-400",
    text: "text-sky-400",
    bar: "bg-sky-400",
    topBorder: "border-t-2 border-t-sky-400",
    leftBorder: "border-l-[3px] border-l-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    filterActive: "bg-sky-400 text-black font-semibold",
    verifiedCard:
      "bg-[#0f1418] border border-sky-500/25 border-l-[3px] border-l-sky-400 hover:border-sky-400/50",
    selectedCard: "bg-[#111a22] border border-sky-400 ring-1 ring-sky-400/30",
    checkSquare: "bg-sky-400 text-black",
  },
  MODERATOR: {
    label: "Moderator",
    code: "MOD",
    dot: "bg-violet-400",
    text: "text-violet-400",
    bar: "bg-violet-400",
    topBorder: "border-t-2 border-t-violet-400",
    leftBorder: "border-l-[3px] border-l-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
    filterActive: "bg-violet-400 text-black font-semibold",
    verifiedCard:
      "bg-[#131118] border border-violet-500/25 border-l-[3px] border-l-violet-400 hover:border-violet-400/50",
    selectedCard:
      "bg-[#191424] border border-violet-400 ring-1 ring-violet-400/30",
    checkSquare: "bg-violet-400 text-black",
  },
  QC: {
    label: "Quality Control",
    code: "QC",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bar: "bg-emerald-400",
    topBorder: "border-t-2 border-t-emerald-400",
    leftBorder: "border-l-[3px] border-l-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    filterActive: "bg-emerald-400 text-black font-semibold",
    verifiedCard:
      "bg-[#0f1512] border border-emerald-500/25 border-l-[3px] border-l-emerald-400 hover:border-emerald-400/50",
    selectedCard:
      "bg-[#111d17] border border-emerald-400 ring-1 ring-emerald-400/30",
    checkSquare: "bg-emerald-400 text-black",
  },
  DIRECTOR: {
    label: "Director",
    code: "DIR",
    dot: "bg-rose-400",
    text: "text-rose-400",
    bar: "bg-rose-400",
    topBorder: "border-t-2 border-t-rose-400",
    leftBorder: "border-l-[3px] border-l-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    filterActive: "bg-rose-400 text-black font-semibold",
    verifiedCard:
      "bg-[#161013] border border-rose-500/25 border-l-[3px] border-l-rose-400 hover:border-rose-400/50",
    selectedCard: "bg-[#1f1317] border border-rose-400 ring-1 ring-rose-400/30",
    checkSquare: "bg-rose-400 text-black",
  },
  LIGHTING: {
    label: "Lighting",
    code: "LX",
    dot: "bg-amber-300",
    text: "text-amber-300",
    bar: "bg-amber-300",
    topBorder: "border-t-2 border-t-amber-300",
    leftBorder: "border-l-[3px] border-l-amber-300",
    pill: "bg-amber-400/10 text-amber-200 border border-amber-400/25",
    filterActive: "bg-amber-300 text-black font-semibold",
    verifiedCard: "bg-[#141310] border border-amber-500/25",
    selectedCard: "bg-[#1a1710] border border-amber-400",
    checkSquare: "bg-amber-300 text-black",
  },
  NETWORK: {
    label: "Network",
    code: "NET",
    dot: "bg-teal-400",
    text: "text-teal-400",
    bar: "bg-teal-400",
    topBorder: "border-t-2 border-t-teal-400",
    leftBorder: "border-l-[3px] border-l-teal-400",
    pill: "bg-teal-500/12 text-teal-300 border border-teal-500/25",
    filterActive: "bg-teal-400 text-black font-semibold",
    verifiedCard: "bg-[#0f1515] border border-teal-500/25",
    selectedCard: "bg-[#111d1d] border border-teal-400",
    checkSquare: "bg-teal-400 text-black",
  },
};

const ROLES_LIST: CrewRole[] = [
  "CAMERA",
  "AUDIO",
  "MODERATOR",
  "QC",
  "DIRECTOR",
];

// Clean Broadcast QC Presets (Zero emojis, crisp broadcast terminology)
const QUICK_QC_PRESETS: {
  label: string;
  type: "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT";
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WIN";
  station:
    | "CAMERA"
    | "AUDIO"
    | "MODERATOR"
    | "LIGHTING"
    | "NETWORK"
    | "DIRECTOR";
  platform: "INSTAGRAM" | "YOUTUBE" | "BOTH";
}[] = [
  {
    label: "IG 9:16 Safe-Zone Edge Clipped",
    type: "ISSUE",
    severity: "MAJOR",
    station: "CAMERA",
    platform: "INSTAGRAM",
  },
  {
    label: "Camera White Balance / Exposure Drift",
    type: "ISSUE",
    severity: "MINOR",
    station: "CAMERA",
    platform: "BOTH",
  },
  {
    label: "Broadcast Bus Audio Too Quiet on Mobile",
    type: "ISSUE",
    severity: "MAJOR",
    station: "AUDIO",
    platform: "BOTH",
  },
  {
    label: "Audio-Video Lip-Sync Delay Detected",
    type: "ISSUE",
    severity: "CRITICAL",
    station: "AUDIO",
    platform: "YOUTUBE",
  },
  {
    label: "Encoder Bitrate Drop / Frame Stutter",
    type: "ISSUE",
    severity: "CRITICAL",
    station: "NETWORK",
    platform: "BOTH",
  },
  {
    label: "Lower-Third / Scripture Cue Delayed",
    type: "IMPROVEMENT",
    severity: "MINOR",
    station: "MODERATOR",
    platform: "YOUTUBE",
  },
  {
    label: "Sub-2s Scripture & Prayer Queue Sync",
    type: "ACHIEVEMENT",
    severity: "WIN",
    station: "MODERATOR",
    platform: "BOTH",
  },
  {
    label: "Crisp Camera Switching & Broadcast Mix",
    type: "ACHIEVEMENT",
    severity: "WIN",
    station: "CAMERA",
    platform: "BOTH",
  },
];

const DIRECTOR_ACTION_PRESETS = [
  "Recalibrate 9:16 center guide on Cam 1",
  "Lock 5600K Kelvin profile on all cameras",
  "Boost broadcast bus +3 dB during spoken prayer",
  "Adjust audio delay +40 ms on switcher input",
  "Stage sermon cue deck by Saturday 6:00 PM",
];

function compressScreenshotDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 960;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CrewAndQcPage() {
  const [users, setUsers] = useState<CrewUserAccount[]>([]);
  const [checklists, setChecklists] = useState<CrewChecklistItem[]>([]);
  const [qcLogs, setQcLogs] = useState<QcLogItem[]>([]);
  const [directorSignOff, setDirectorSignOff] = useState({
    clearedToGoLive: false,
    directorName: "Andrew",
    clearedAt: null as string | null,
    flashNotice: "",
  });

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<
    "PRE_LIVE" | "QC_PAD" | "TEAM_ACCOUNTS" | "TRAINING" | "MEETING_REPORT"
  >("PRE_LIVE");

  // Active logged-in operator
  const [myIdentity, setMyIdentity] = useState<{
    id: string;
    name: string;
    role: CrewRole;
  }>({
    id: "usr-director-1",
    name: "Andrew",
    role: "DIRECTOR",
  });

  // Pre-Flight Filters
  const [stationFilter, setStationFilter] = useState<"ALL" | CrewRole>("ALL");
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | PreFlightPhase>("ALL");
  const [userFilter, setUserFilter] = useState<string>("ALL");

  // Modals & notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [newCheckRole, setNewCheckRole] = useState<CrewRole>("CAMERA");
  const [newCheckPhase, setNewCheckPhase] = useState<PreFlightPhase>("T-30M");
  const [newCheckCategory, setNewCheckCategory] = useState("Verification");
  const [newCheckTask, setNewCheckTask] = useState("");
  const [newCheckDetail, setNewCheckDetail] = useState("");
  const [newCheckUserId, setNewCheckUserId] = useState("usr-camera-1");

  // New User Account Form state (in Team & Accounts tab)
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserCallsign, setNewUserCallsign] = useState("");
  const [newUserRole, setNewUserRole] = useState<CrewRole>("CAMERA");
  const [newUserPermission, setNewUserPermission] =
    useState<UserPermission>("OPERATOR");
  const [newUserStation, setNewUserStation] = useState("");

  // Inline quick-assign task per user card in Team & Accounts tab
  const [userQuickTaskDrafts, setUserQuickTaskDrafts] = useState<
    Record<string, { task: string; phase: PreFlightPhase }>
  >({});

  // QC Pad state
  const [qcPlatform, setQcPlatform] = useState<
    "INSTAGRAM" | "YOUTUBE" | "BOTH"
  >("INSTAGRAM");
  const [qcType, setQcType] = useState<"ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT">(
    "ISSUE"
  );
  const [qcSeverity, setQcSeverity] = useState<
    "CRITICAL" | "MAJOR" | "MINOR" | "WIN"
  >("MAJOR");
  const [qcStation, setQcStation] = useState<
    "CAMERA" | "AUDIO" | "MODERATOR" | "LIGHTING" | "NETWORK" | "DIRECTOR"
  >("CAMERA");
  const [qcTitle, setQcTitle] = useState("");
  const [qcDescription, setQcDescription] = useState("");
  const [qcScreenshot, setQcScreenshot] = useState<string | null>(null);
  const [qcMarker, setQcMarker] = useState<{ x: number; y: number } | null>(
    null
  );
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Director Decision Drafts
  const [directorDrafts, setDirectorDrafts] = useState<
    Record<
      string,
      { actionToTake: string; assignedTo: string; timelineToSolve: string }
    >
  >({});

  // Lightbox preview
  const [previewImageLog, setPreviewImageLog] = useState<QcLogItem | null>(
    null
  );

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const fetchCrewQcData = async () => {
    try {
      const res = await fetch("/api/crew-qc", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.checklists) setChecklists(data.checklists);
      if (data.qcLogs) setQcLogs(data.qcLogs);
      if (data.directorSignOff) setDirectorSignOff(data.directorSignOff);
    } catch (e) {
      console.error("Failed to fetch crew-qc data:", e);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("church_crew_identity_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.role) {
          setMyIdentity(parsed);
        }
      }
    } catch {
      // ignore
    }
    fetchCrewQcData();
    const interval = setInterval(fetchCrewQcData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Paste screenshot support on QC Pad
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (activeTab !== "QC_PAD") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const compressed = await compressScreenshotDataUrl(file);
            setQcScreenshot(compressed);
            triggerToast("Screenshot attached from clipboard");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab]);

  const handleSwitchActiveUser = async (user: CrewUserAccount) => {
    const nextIdentity = { id: user.id, name: user.name, role: user.role };
    setMyIdentity(nextIdentity);
    try {
      localStorage.setItem(
        "church_crew_identity_v3",
        JSON.stringify(nextIdentity)
      );
    } catch {
      // ignore
    }
    await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREW_LOGIN",
        name: user.name,
        role: user.role,
        device: user.device || "Console",
      }),
    });
    triggerToast(`Active operator switched to ${user.name} (${user.role})`);
    fetchCrewQcData();
  };

  const handleToggleCheck = async (id: string) => {
    setChecklists((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
              checkedBy: !item.checked ? myIdentity.name : null,
              checkedAt: !item.checked
                ? new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null,
            }
          : item
      )
    );

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_CHECK",
        id,
        memberName: myIdentity.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
    }
  };

  const handleReassignCheckItem = async (
    checkId: string,
    targetUserId: string
  ) => {
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) return;

    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checkId
          ? {
              ...c,
              assignedToUserId: targetUser.id,
              assignedToName: targetUser.name,
            }
          : c
      )
    );

    await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ASSIGN_CHECK_ITEM",
        id: checkId,
        assignedToUserId: targetUser.id,
        assignedToName: targetUser.name,
      }),
    });
    triggerToast(`Assigned to ${targetUser.name}`);
  };

  const handleCheckAllStation = async (role: CrewRole | "ALL") => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CHECK_ALL_STATION",
        role,
        memberName: myIdentity.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
      triggerToast(
        role === "ALL"
          ? "All pre-flight checks verified"
          : `${role} station verified`
      );
    }
  };

  const handleResetChecklists = async () => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESET_CHECKLISTS" }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
      if (updated.directorSignOff) setDirectorSignOff(updated.directorSignOff);
      triggerToast("Pre-flight checklist reset for new service");
    }
  };

  const handleToggleGoLive = async () => {
    const nextState = !directorSignOff.clearedToGoLive;
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "DIRECTOR_UPDATE",
        clearedToGoLive: nextState,
        directorName: myIdentity.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.directorSignOff) setDirectorSignOff(updated.directorSignOff);
      triggerToast(
        nextState
          ? "Master Control: Broadcast Confirmed On Air"
          : "Broadcast returned to Standby"
      );
    }
  };

  // User Account Management Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_USER",
        user: {
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          callsign: newUserCallsign,
          role: newUserRole,
          permission: newUserPermission,
          stationAssignment: newUserStation,
          status: "ON_DUTY",
        },
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setNewUserCallsign("");
      setNewUserStation("");
      setShowNewUserForm(false);
      triggerToast(`Created account for ${newUserName}`);
    }
  };

  const handleUpdateUser = async (
    id: string,
    patch: Partial<CrewUserAccount>
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_USER",
        id,
        ...patch,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE_USER", id }),
    });
    triggerToast(`Removed ${name}`);
  };

  const handleAssignQuickTaskToUser = async (user: CrewUserAccount) => {
    const draft = userQuickTaskDrafts[user.id];
    if (!draft || !draft.task.trim()) return;

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_CHECK_ITEM",
        item: {
          role: user.role,
          phase: draft.phase || "T-30M",
          category: "Assigned",
          task: draft.task.trim(),
          detail: `Assigned to ${user.name} (${user.callsign})`,
          isCritical: true,
          assignedToUserId: user.id,
          assignedToName: user.name,
        },
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
      setUserQuickTaskDrafts((prev) => ({
        ...prev,
        [user.id]: { task: "", phase: "T-30M" },
      }));
      triggerToast(`Task assigned to ${user.name}`);
    }
  };

  // Training Academy Handlers
  const handleToggleTrainingLesson = async (
    userId: string,
    lessonId: string
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const curr = u.completedLessons || [];
        const exists = curr.includes(lessonId);
        return {
          ...u,
          completedLessons: exists
            ? curr.filter((x) => x !== lessonId)
            : [...curr, lessonId],
        };
      })
    );

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_TRAINING_LESSON",
        userId,
        lessonId,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);
      triggerToast(`Training module progress updated`);
    }
  };

  const handleCertifyUserRole = async (userId: string, role: CrewRole) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const curr = u.certifiedRoles || [];
        return curr.includes(role)
          ? u
          : { ...u, certifiedRoles: [...curr, role] };
      })
    );

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CERTIFY_USER_ROLE",
        userId,
        role,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);
      triggerToast(`Role Certification awarded for ${role}`);
    }
  };

  // QC Pad Handlers
  const handleSelectQcPreset = (preset: (typeof QUICK_QC_PRESETS)[number]) => {
    setQcTitle(preset.label);
    setQcType(preset.type);
    setQcSeverity(preset.severity);
    setQcStation(preset.station);
    setQcPlatform(preset.platform);
  };

  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressScreenshotDataUrl(file);
      setQcScreenshot(compressed);
      setQcMarker({ x: 50, y: 50 });
    } catch (err) {
      console.error("Failed to process screenshot:", err);
    }
  };

  const handleCaptureScreen = async () => {
    try {
      const mediaDevices = navigator.mediaDevices as any;
      if (!mediaDevices || !mediaDevices.getDisplayMedia) {
        screenshotInputRef.current?.click();
        return;
      }
      const stream = await mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const maxW = 960;
      const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        setQcScreenshot(dataUrl);
        setQcMarker({ x: 50, y: 50 });
      }
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      triggerToast("Live frame captured");
    } catch {
      screenshotInputRef.current?.click();
    }
  };

  const handleQueueForDirector = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qcTitle.trim()) {
      triggerToast("Select a preset or enter a brief observation");
      return;
    }

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_QC_LOG",
        log: {
          type: qcType,
          severity: qcType === "ACHIEVEMENT" ? "WIN" : qcSeverity,
          platform: qcPlatform,
          station: qcStation,
          title: qcTitle,
          description: qcDescription,
          actionToTake: "",
          assignedTo: "Pending Director",
          timelineToSolve: "Wait for Director",
          screenshotUrl: qcScreenshot,
          markerPos: qcMarker,
          loggedBy: myIdentity.name,
        },
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      if (updated.qcLogs) setQcLogs(updated.qcLogs);
      setQcTitle("");
      setQcDescription("");
      setQcScreenshot(null);
      setQcMarker(null);
      triggerToast("Added to Technical Director Queue");
    }
  };

  const handleDirectorSaveDecision = async (
    logId: string,
    statusOverride?: "IN_PROGRESS" | "RESOLVED"
  ) => {
    const existing = qcLogs.find((l) => l.id === logId);
    const defaultOwner =
      users.find((u) => u.role === existing?.station)?.name ||
      users[0]?.name ||
      "Kevin Lim";
    const draft = directorDrafts[logId] || {
      actionToTake: existing?.actionToTake || "Adjust station parameter",
      assignedTo:
        existing?.assignedTo && existing.assignedTo !== "Pending Director"
          ? existing.assignedTo
          : defaultOwner,
      timelineToSolve:
        existing?.timelineToSolve &&
        existing.timelineToSolve !== "Wait for Director"
          ? existing.timelineToSolve
          : "Before Saturday Rehearsal",
    };

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "DIRECTOR_DECIDE_QC",
        id: logId,
        actionToTake: draft.actionToTake,
        assignedTo: draft.assignedTo,
        timelineToSolve: draft.timelineToSolve,
        status: statusOverride || "IN_PROGRESS",
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      if (updated.qcLogs) setQcLogs(updated.qcLogs);
      triggerToast("Director decision saved");
    }
  };

  const handlePushToRoadmap = async (id: string) => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "PUSH_QC_TO_ROADMAP", id }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.qcLogs) setQcLogs(updated.qcLogs);
      triggerToast("Added to Timeline & Goals");
    }
  };

  const handleExportMeetingCsv = () => {
    const headers = [
      "Timecode",
      "Category",
      "Platform",
      "Department",
      "Observation",
      "Director Action Plan",
      "Assigned Operator",
      "Target Timeline",
      "Status",
    ];
    const rows = qcLogs.map((l) => [
      l.streamTimestamp,
      l.type,
      l.platform,
      l.station,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${(l.actionToTake || "Pending Director").replace(/"/g, '""')}"`,
      l.assignedTo,
      l.timelineToSolve,
      l.status,
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `post-show-technical-log-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Technical log CSV exported");
  };

  // Computed Readiness Metrics
  const totalChecks = checklists.length;
  const completedChecks = checklists.filter((c) => c.checked).length;
  const pendingCount = totalChecks - completedChecks;
  const overallPct =
    totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
  const is100PercentReady = totalChecks > 0 && completedChecks === totalChecks;

  const waitingDirectorCount = qcLogs.filter(
    (l) => l.status === "WAITING_DIRECTOR"
  ).length;

  const visibleChecklists = useMemo(() => {
    return checklists.filter((c) => {
      if (stationFilter !== "ALL" && c.role !== stationFilter) return false;
      if (phaseFilter !== "ALL" && c.phase !== phaseFilter) return false;
      if (userFilter !== "ALL" && c.assignedToUserId !== userFilter)
        return false;
      return true;
    });
  }, [checklists, stationFilter, phaseFilter, userFilter]);

  const uncheckedVisible = useMemo(
    () => visibleChecklists.filter((c) => !c.checked),
    [visibleChecklists]
  );

  const checkedVisible = useMemo(
    () => visibleChecklists.filter((c) => c.checked),
    [visibleChecklists]
  );

  // Stations that still have unverified items
  const pendingStations = useMemo(() => {
    return ROLES_LIST.map((role) => {
      const items = checklists.filter((c) => c.role === role);
      const remaining = items.filter((c) => !c.checked).length;
      const leadUser = users.find((u) => u.role === role);
      return {
        role,
        label: DEPT_STYLES[role].label,
        remaining,
        operatorName: leadUser ? leadUser.name : DEPT_STYLES[role].label,
        callsign: leadUser ? leadUser.callsign : DEPT_STYLES[role].code,
      };
    }).filter((s) => s.remaining > 0);
  }, [checklists, users]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar />

      {/* Minimalist Apple-Style Floating Notification Pill */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* ===================================================================
            APPLE PRO HEADER BAR & SEGMENTED WORKSPACE SWITCHER
           =================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Broadcast Operations
              </span>
              <span className="text-zinc-700">/</span>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    DEPT_STYLES[myIdentity.role]?.dot || "bg-white"
                  }`}
                />
                <span className="font-medium">{myIdentity.name}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">{myIdentity.role}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("TEAM_ACCOUNTS")}
                  className="text-zinc-400 hover:text-white underline underline-offset-2 ml-1"
                >
                  Switch
                </button>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-white">
              Pre-Flight Verification, Stream QC & Team Management
            </h1>
          </div>

          {/* Apple Segmented Control (4 Core Views) */}
          <div className="inline-flex items-center gap-1 bg-[#131316] p-1 rounded-full border border-white/[0.08] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("PRE_LIVE")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === "PRE_LIVE"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Pre-Flight Check</span>
              <span
                className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "PRE_LIVE"
                    ? "bg-black/10 text-black font-bold"
                    : is100PercentReady
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {overallPct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("QC_PAD")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === "QC_PAD"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Live QC & Director Queue</span>
              {waitingDirectorCount > 0 && (
                <span
                  className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                    activeTab === "QC_PAD"
                      ? "bg-rose-500 text-white font-bold"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {waitingDirectorCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("TEAM_ACCOUNTS")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === "TEAM_ACCOUNTS"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Team & Accounts</span>
              <span
                className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "TEAM_ACCOUNTS"
                    ? "bg-black/10 text-black font-bold"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("TRAINING")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === "TRAINING"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Training Academy</span>
              <span
                className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "TRAINING"
                    ? "bg-black/10 text-black font-bold"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                5 Roles
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("MEETING_REPORT")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap ${
                activeTab === "MEETING_REPORT"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Post-Show Log
            </button>
          </div>
        </div>

        {/* ===================================================================
            VIEW 1: PRE-FLIGHT VERIFICATION & GO / NO-GO POLL
           =================================================================== */}
        {activeTab === "PRE_LIVE" && (
          <div className="space-y-8">
            {/* MASTER READINESS & GO/NO-GO COMMAND BAR */}
            {is100PercentReady ? (
              <div className="rounded-2xl p-5 bg-[#0e1914] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xl tabular-nums">
                    100%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                        All Stations Verified ({completedChecks}/{totalChecks})
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-white tracking-tight mt-0.5">
                      System Cleared for Live Broadcast
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetChecklists}
                    className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.08] transition"
                  >
                    Reset Session
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleGoLive}
                    className={`px-5 py-2 rounded-full text-xs font-semibold transition ${
                      directorSignOff.clearedToGoLive
                        ? "bg-emerald-400 text-black"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {directorSignOff.clearedToGoLive
                      ? `On Air Confirmed (${directorSignOff.clearedAt})`
                      : "Director: Confirm On Air"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 bg-[#121215] border border-white/[0.1] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-2xl tabular-nums">
                    {overallPct}%
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-sm font-semibold text-white tracking-tight">
                        {pendingCount}{" "}
                        {pendingCount === 1
                          ? "Check Pending Verification"
                          : "Checks Pending Verification"}
                      </span>
                      <span className="text-xs text-zinc-500 tabular-nums">
                        ({completedChecks} of {totalChecks} verified)
                      </span>
                    </div>

                    {/* Direct Operator Callouts for Technical Director */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-zinc-400">
                        Holding Go-Live:
                      </span>
                      {pendingStations.map((ps) => {
                        const st = DEPT_STYLES[ps.role];
                        return (
                          <button
                            key={ps.role}
                            type="button"
                            onClick={() => setStationFilter(ps.role)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${st.pill}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                            />
                            <span>
                              {ps.label} · {ps.operatorName}
                            </span>
                            <span className="font-semibold tabular-nums">
                              ({ps.remaining} left)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCheckAllStation("ALL")}
                    className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    Verify All Remaining ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={handleResetChecklists}
                    className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* 5 DEPARTMENT GO / NO-GO STATION CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {ROLES_LIST.map((role) => {
                const style = DEPT_STYLES[role];
                const items = checklists.filter((c) => c.role === role);
                const done = items.filter((c) => c.checked).length;
                const remaining = items.length - done;
                const pct =
                  items.length > 0
                    ? Math.round((done / items.length) * 100)
                    : 0;
                const leadUser = users.find((u) => u.role === role);
                const isSelected = stationFilter === role;

                return (
                  <div
                    key={role}
                    onClick={() =>
                      setStationFilter(stationFilter === role ? "ALL" : role)
                    }
                    className={`cursor-pointer rounded-2xl p-4 transition flex flex-col justify-between ${
                      style.topBorder
                    } ${
                      isSelected
                        ? style.selectedCard
                        : remaining > 0
                        ? "bg-[#151113] border border-rose-500/40 hover:border-rose-400/60"
                        : "bg-[#121215] border border-white/[0.08] hover:border-white/[0.18]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${style.dot}`}
                          />
                          <span className="text-xs font-semibold text-white tracking-tight">
                            {style.label}
                          </span>
                        </div>
                        {remaining > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold tabular-nums">
                            {remaining} Pending
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.pill}`}
                          >
                            GO
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                          {pct}%
                        </span>
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          {done} of {items.length}
                        </span>
                      </div>

                      <div className="w-full h-1 bg-white/[0.07] rounded-full my-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.05] text-zinc-400">
                      <span className="truncate font-medium text-zinc-300">
                        {leadUser ? leadUser.name : "Unassigned"}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {leadUser ? leadUser.callsign : style.code}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FILTER BAR: DEPARTMENT, T-MINUS PHASE, AND OPERATOR */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] rounded-2xl p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStationFilter("ALL")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    stationFilter === "ALL"
                      ? "bg-white text-black font-semibold"
                      : "text-zinc-400 hover:text-white bg-white/[0.03]"
                  }`}
                >
                  All Stations ({totalChecks})
                </button>
                {ROLES_LIST.map((role) => {
                  const style = DEPT_STYLES[role];
                  const isSelected = stationFilter === role;
                  const roleRemaining = checklists.filter(
                    (c) => c.role === role && !c.checked
                  ).length;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setStationFilter(role)}
                      className={`px-3 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 ${
                        isSelected ? style.filterActive : style.pill
                      }`}
                    >
                      <span>{style.label}</span>
                      {roleRemaining > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-semibold tabular-nums">
                          {roleRemaining}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* T-Minus Phase Filter */}
                <select
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value as any)}
                  aria-label="Filter by T-Minus Phase"
                  className="bg-[#18181c] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/30"
                >
                  <option value="ALL">All Phases (T-60m to T-5m)</option>
                  <option value="T-60M">T-60M · Rig & Signal</option>
                  <option value="T-30M">T-30M · Optics & Audio</option>
                  <option value="T-15M">T-15M · Stream & Cues</option>
                  <option value="T-5M">T-5M · Final Go Poll</option>
                </select>

                {/* Operator Filter */}
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  aria-label="Filter by Assigned Operator"
                  className="bg-[#18181c] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/30"
                >
                  <option value="ALL">All Operators</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      Assigned: {u.name} ({u.role})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCheckModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  + Assign Check
                </button>
              </div>
            </div>

            {/* ===============================================================
                SECTION 1 (TOP PRIORITY): PENDING VERIFICATION — NEEDS ACTION
               =============================================================== */}
            {uncheckedVisible.length > 0 && (
              <section className="rounded-3xl p-6 bg-[#151113] border border-rose-500/35 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-500/20 pb-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-400">
                        Pending Verification · {uncheckedVisible.length}{" "}
                        Remaining
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-white tracking-tight">
                      Incomplete Pre-Flight Checks Blocking Go-Live
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCheckAllStation(stationFilter)}
                    className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    Verify All {uncheckedVisible.length} Now
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {uncheckedVisible.map((item) => {
                    const style =
                      DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 bg-[#0c0c0e] border border-rose-500/40 ${style.leftBorder} flex flex-col justify-between gap-4 transition hover:border-rose-400`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${style.pill}`}
                              >
                                {item.role}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                                {item.phase || "T-30M"}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                              Pending
                            </span>
                          </div>

                          <div
                            onClick={() => handleToggleCheck(item.id)}
                            className="cursor-pointer group"
                          >
                            <div className="text-sm font-semibold text-white group-hover:text-zinc-200 tracking-tight">
                              {item.task}
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {item.detail}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Row: Reassign Operator + 1-Tap Verify */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] text-zinc-500 shrink-0">
                              Owner:
                            </span>
                            <select
                              value={item.assignedToUserId || ""}
                              onChange={(e) =>
                                handleReassignCheckItem(
                                  item.id,
                                  e.target.value
                                )
                              }
                              aria-label="Assign operator"
                              className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-200 focus:outline-none focus:border-white/30 truncate"
                            >
                              {users.map((u) => (
                                <option
                                  key={u.id}
                                  value={u.id}
                                  className="bg-[#121215] text-white"
                                >
                                  {u.name} ({u.callsign})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleCheck(item.id)}
                            className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===============================================================
                SECTION 2 (SEPARATED BELOW): VERIFIED & LOCKED BY DEPARTMENT
               =============================================================== */}
            {checkedVisible.length > 0 && (
              <section className="rounded-3xl p-6 bg-[#111114] border border-white/[0.08] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                        Verified & Locked · {checkedVisible.length} Completed
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-white tracking-tight">
                      Completed Subsystem Checks by Department
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-500">
                    Click any card to revert to pending
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {checkedVisible.map((item) => {
                    const style =
                      DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheck(item.id)}
                        className={`cursor-pointer rounded-2xl p-4 transition flex items-center justify-between gap-3 select-none ${style.verifiedCard}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold ${style.checkSquare}`}
                          >
                            ✓
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-white truncate tracking-[-0.01em]">
                              {item.task}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 ${style.pill}`}
                              >
                                {item.role}
                              </span>
                              <span className="text-[11px] text-zinc-400 truncate">
                                {item.detail}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-[11px] font-semibold ${style.text}`}
                          >
                            {item.checkedBy || item.assignedToName}
                          </div>
                          {item.checkedAt && (
                            <div className="text-[10px] text-zinc-500 tabular-nums">
                              {item.checkedAt}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ===================================================================
            VIEW 2: LIVE STREAM TELEMETRY, FAST QC PAD & DIRECTOR QUEUE
           =================================================================== */}
        {activeTab === "QC_PAD" && (
          <div className="space-y-6">
            {/* Broadcast Stream Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl p-4 bg-[#121215] border border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>YouTube CDN Ingest</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-1">
                  1080p60 · 6.8 Mbps
                </div>
                <div className="text-[11px] text-emerald-400 mt-0.5 tabular-nums">
                  0.0% Dropped Frames
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-[#121215] border border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Instagram Vertical RTMP</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-1">
                  9:16 Crop · 4.2 Mbps
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Center Grid Active
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-[#121215] border border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Program Loudness</span>
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-1">
                  -14.2 LUFS
                </div>
                <div className="text-[11px] text-sky-400 mt-0.5 tabular-nums">
                  True Peak -1.8 dBTP
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-[#121215] border border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Director Queue</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      waitingDirectorCount > 0
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-1">
                  {waitingDirectorCount} Pending
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                  {qcLogs.length} Total Logged Today
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT (5 Cols): FAST 1-TAP QC INCIDENT LOGGER */}
              <div className="lg:col-span-5 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                      Quality Control Station
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Rapid Incident & Frame Capture
                    </h2>
                  </div>
                  <span className="text-[11px] text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    Routes to Director
                  </span>
                </div>

                {/* 1. Platform Segmented Bar */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
                  {(["INSTAGRAM", "YOUTUBE", "BOTH"] as const).map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setQcPlatform(plat)}
                      className={`py-1.5 rounded-full text-xs font-medium transition ${
                        qcPlatform === plat
                          ? "bg-white text-black font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {plat === "INSTAGRAM"
                        ? "Instagram 9:16"
                        : plat === "YOUTUBE"
                        ? "YouTube 16:9"
                        : "Both Streams"}
                    </button>
                  ))}
                </div>

                {/* 2. 1-Tap Broadcast Presets */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-400 block">
                    One-Tap Observation Presets
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_QC_PRESETS.map((preset) => {
                      const active = qcTitle === preset.label;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectQcPreset(preset)}
                          className={`text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition ${
                            active
                              ? "bg-white text-black border-white font-semibold"
                              : "bg-[#18181c] hover:bg-white/[0.06] text-zinc-200 border-white/[0.08]"
                          }`}
                        >
                          <div className="truncate">{preset.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              active ? "text-zinc-700" : "text-zinc-500"
                            }`}
                          >
                            {preset.station} · {preset.type}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Custom Observation & Department */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={qcType}
                      onChange={(e) => setQcType(e.target.value as any)}
                      aria-label="Log Type"
                      className="bg-[#18181c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none"
                    >
                      <option value="ISSUE">Issue / Fault</option>
                      <option value="IMPROVEMENT">Refinement</option>
                      <option value="ACHIEVEMENT">Broadcast Win</option>
                    </select>
                    <select
                      value={qcStation}
                      onChange={(e) => setQcStation(e.target.value as any)}
                      aria-label="Station"
                      className="bg-[#18181c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none"
                    >
                      <option value="CAMERA">Camera</option>
                      <option value="AUDIO">Audio</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="LIGHTING">Lighting</option>
                      <option value="NETWORK">Network</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Observation headline..."
                    value={qcTitle}
                    onChange={(e) => setQcTitle(e.target.value)}
                    className="w-full bg-[#18181c] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* 4. Frame Capture / Screenshot */}
                <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-300">
                      Reference Frame (Upload, Grab or Paste)
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        ref={screenshotInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[11px] font-medium border border-white/[0.08] transition"
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={handleCaptureScreen}
                        className="px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
                      >
                        Capture Stream
                      </button>
                    </div>
                  </div>

                  {qcScreenshot && (
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setQcMarker({
                          x: Math.round(
                            ((e.clientX - rect.left) / rect.width) * 100
                          ),
                          y: Math.round(
                            ((e.clientY - rect.top) / rect.height) * 100
                          ),
                        });
                      }}
                      className="relative cursor-crosshair rounded-xl overflow-hidden border border-white/[0.1] bg-black max-h-44 flex items-center justify-center"
                    >
                      <img
                        src={qcScreenshot}
                        alt="Captured stream frame"
                        className="max-h-44 w-auto object-contain"
                      />
                      {qcMarker && (
                        <div
                          style={{
                            left: `${qcMarker.x}%`,
                            top: `${qcMarker.y}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-rose-500 bg-rose-500/25"
                        />
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleQueueForDirector()}
                  className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold text-xs tracking-tight transition"
                >
                  Send to Technical Director Queue
                </button>
              </div>

              {/* RIGHT (7 Cols): TECHNICAL DIRECTOR DECISION QUEUE */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121215] border border-white/[0.08] rounded-3xl p-5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                      Technical Director Review
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Incident & Action Assignment Queue ({waitingDirectorCount}{" "}
                      Awaiting Decision)
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("MEETING_REPORT")}
                    className="px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
                  >
                    Open Post-Show Log
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
                  {qcLogs.map((log) => {
                    const isWaiting = log.status === "WAITING_DIRECTOR";
                    const stStyle =
                      DEPT_STYLES[log.station] || DEPT_STYLES.CAMERA;
                    const defaultOwner =
                      users.find((u) => u.role === log.station)?.name ||
                      users[0]?.name ||
                      "Kevin Lim";
                    const draft = directorDrafts[log.id] || {
                      actionToTake: log.actionToTake || "",
                      assignedTo:
                        log.assignedTo && log.assignedTo !== "Pending Director"
                          ? log.assignedTo
                          : defaultOwner,
                      timelineToSolve:
                        log.timelineToSolve &&
                        log.timelineToSolve !== "Wait for Director"
                          ? log.timelineToSolve
                          : "Before Saturday Rehearsal",
                    };

                    return (
                      <div
                        key={log.id}
                        className={`rounded-2xl p-5 border transition space-y-4 ${
                          stStyle.leftBorder
                        } ${
                          isWaiting
                            ? "bg-[#151210] border-amber-500/40"
                            : "bg-[#121215] border-white/[0.08]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                log.type === "ISSUE"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/25"
                                  : log.type === "ACHIEVEMENT"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                              }`}
                            >
                              {log.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${stStyle.pill}`}
                            >
                              {log.station} · {log.platform}
                            </span>
                            <span className="text-[11px] text-zinc-500 tabular-nums">
                              {log.streamTimestamp}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              isWaiting
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : log.status === "RESOLVED"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-white/[0.06] text-zinc-300"
                            }`}
                          >
                            {isWaiting
                              ? "Awaiting Director"
                              : log.status === "RESOLVED"
                              ? "Resolved"
                              : "Assigned"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white tracking-tight">
                              {log.title}
                            </div>
                            {log.description && (
                              <div className="text-xs text-zinc-400 mt-1">
                                {log.description}
                              </div>
                            )}
                          </div>

                          {log.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageLog(log)}
                              className="w-28 h-16 rounded-xl overflow-hidden border border-white/[0.12] shrink-0 relative bg-black"
                            >
                              <img
                                src={log.screenshotUrl}
                                alt="QC Frame"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-center text-zinc-200 py-0.5 font-medium">
                                Inspect Frame
                              </span>
                            </button>
                          )}
                        </div>

                        {log.type !== "ACHIEVEMENT" && (
                          <div className="bg-[#09090b] border border-white/[0.07] rounded-xl p-3.5 space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mr-1">
                                Presets:
                              </span>
                              {DIRECTOR_ACTION_PRESETS.map((act) => (
                                <button
                                  key={act}
                                  type="button"
                                  onClick={() =>
                                    setDirectorDrafts((prev) => ({
                                      ...prev,
                                      [log.id]: {
                                        ...draft,
                                        actionToTake: act,
                                      },
                                    }))
                                  }
                                  className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[10px] text-zinc-300 hover:text-white transition"
                                >
                                  {act}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <input
                                type="text"
                                placeholder="Director directive..."
                                value={draft.actionToTake}
                                onChange={(e) =>
                                  setDirectorDrafts((prev) => ({
                                    ...prev,
                                    [log.id]: {
                                      ...draft,
                                      actionToTake: e.target.value,
                                    },
                                  }))
                                }
                                className="sm:col-span-5 bg-[#141418] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                              />

                              <select
                                value={draft.assignedTo}
                                onChange={(e) =>
                                  setDirectorDrafts((prev) => ({
                                    ...prev,
                                    [log.id]: {
                                      ...draft,
                                      assignedTo: e.target.value,
                                    },
                                  }))
                                }
                                aria-label="Assign to operator"
                                className="sm:col-span-3 bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              >
                                {users.map((u) => (
                                  <option key={u.id} value={u.name}>
                                    {u.name} ({u.role})
                                  </option>
                                ))}
                              </select>

                              <select
                                value={draft.timelineToSolve}
                                onChange={(e) =>
                                  setDirectorDrafts((prev) => ({
                                    ...prev,
                                    [log.id]: {
                                      ...draft,
                                      timelineToSolve: e.target.value,
                                    },
                                  }))
                                }
                                aria-label="Target timeline"
                                className="sm:col-span-2 bg-[#141418] border border-white/[0.1] rounded-lg px-2 py-1.5 text-xs text-amber-300 focus:outline-none"
                              >
                                <option value="Immediate">Immediate</option>
                                <option value="Before Saturday Rehearsal">
                                  Saturday
                                </option>
                                <option value="By Next Sunday">Next Sun</option>
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDirectorSaveDecision(
                                    log.id,
                                    log.status === "IN_PROGRESS"
                                      ? "RESOLVED"
                                      : "IN_PROGRESS"
                                  )
                                }
                                className="sm:col-span-2 py-1.5 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                              >
                                {isWaiting
                                  ? "Assign"
                                  : log.status === "IN_PROGRESS"
                                  ? "Resolve"
                                  : "Update"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 3: USER ACCOUNT MANAGEMENT, ROLES & TASK ASSIGNMENT
           =================================================================== */}
        {activeTab === "TEAM_ACCOUNTS" && (
          <div className="space-y-6">
            {/* Top Roster Header & Add Account Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-white/[0.08] rounded-3xl p-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Identity, Access & Task Routing
                </span>
                <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                  Production Team Accounts & Role Assignments ({users.length}{" "}
                  Operators)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage operator roles, permissions, hardware stations, and
                  assign pre-flight or live tasks directly to each user.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddCheckModal(true)}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] text-xs font-medium transition"
                >
                  + Assign Checklist Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  {showNewUserForm ? "Cancel" : "+ New User Account"}
                </button>
              </div>
            </div>

            {/* Collapsible Create User Account Drawer */}
            {showNewUserForm && (
              <form
                onSubmit={handleCreateUser}
                className="rounded-3xl p-6 bg-[#141418] border border-white/[0.12] space-y-4"
              >
                <div className="text-sm font-semibold text-white">
                  Create Operator Account
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name (e.g. Marcus Tan)"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Callsign (e.g. CAM-02)"
                    value={newUserCallsign}
                    onChange={(e) => setNewUserCallsign(e.target.value)}
                    className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as CrewRole)}
                    aria-label="Department Role"
                    className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="CAMERA">Department: Camera</option>
                    <option value="AUDIO">Department: Audio</option>
                    <option value="MODERATOR">Department: Moderator</option>
                    <option value="QC">Department: Quality Control</option>
                    <option value="DIRECTOR">Department: Director</option>
                  </select>
                  <select
                    value={newUserPermission}
                    onChange={(e) =>
                      setNewUserPermission(e.target.value as UserPermission)
                    }
                    aria-label="Access Permission"
                    className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="OPERATOR">Permission: Operator</option>
                    <option value="LEAD">Permission: Department Lead</option>
                    <option value="ADMIN">Permission: Admin / Director</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Station / Hardware (e.g. Cam 2 PTZ)"
                    value={newUserStation}
                    onChange={(e) => setNewUserStation(e.target.value)}
                    className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold py-2 px-4 transition"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* User Account Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {users.map((user) => {
                const style = DEPT_STYLES[user.role] || DEPT_STYLES.CAMERA;
                const userChecks = checklists.filter(
                  (c) => c.assignedToUserId === user.id
                );
                const userDone = userChecks.filter((c) => c.checked).length;
                const userPending = userChecks.length - userDone;
                const userQcItems = qcLogs.filter(
                  (l) =>
                    l.assignedTo
                      .toLowerCase()
                      .includes(user.name.toLowerCase()) &&
                    l.status !== "RESOLVED"
                );
                const isCurrentOperator = myIdentity.id === user.id;
                const quickDraft = userQuickTaskDrafts[user.id] || {
                  task: "",
                  phase: "T-30M" as PreFlightPhase,
                };

                return (
                  <div
                    key={user.id}
                    className={`rounded-3xl p-6 bg-[#121215] border border-white/[0.08] ${style.topBorder} flex flex-col justify-between gap-5`}
                  >
                    <div className="space-y-4">
                      {/* Top User Identity & Active Session Row */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-semibold text-sm ${style.pill}`}
                          >
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-white tracking-tight">
                                {user.name}
                              </h3>
                              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07]">
                                {user.callsign}
                              </span>
                              {isCurrentOperator && (
                                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-semibold">
                                  Active Session
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {user.stationAssignment} · {user.device}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCurrentOperator && (
                            <button
                              type="button"
                              onClick={() => handleSwitchActiveUser(user)}
                              className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white text-zinc-200 hover:text-black text-[11px] font-medium border border-white/[0.08] transition"
                            >
                              Operate as {user.name.split(" ")[0]}
                            </button>
                          )}
                          {users.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteUser(user.id, user.name)
                              }
                              className="px-2.5 py-1 rounded-full text-[11px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Role, Permission & Duty Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#09090b] border border-white/[0.06]">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Department Role
                          </label>
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                role: e.target.value as CrewRole,
                              })
                            }
                            aria-label="Department Role"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r} value={r}>
                                {DEPT_STYLES[r].label} ({r})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Access Level
                          </label>
                          <select
                            value={user.permission}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                permission: e.target.value as UserPermission,
                              })
                            }
                            aria-label="Permission Level"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            <option value="ADMIN">Admin / Director</option>
                            <option value="LEAD">Department Lead</option>
                            <option value="OPERATOR">Crew Operator</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Duty Status
                          </label>
                          <select
                            value={user.status}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                status: e.target.value as DutyStatus,
                              })
                            }
                            aria-label="Duty Status"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            <option value="ON_DUTY">On Duty</option>
                            <option value="STANDBY">Standby</option>
                            <option value="OFF_DUTY">Off Duty</option>
                          </select>
                        </div>
                      </div>

                      {/* Operator Training & Role Certification Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#09090b] border border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-zinc-400 mr-1">
                            Certifications:
                          </span>
                          {(user.certifiedRoles || []).length > 0 ? (
                            (user.certifiedRoles || []).map((certRole) => (
                              <span
                                key={certRole}
                                className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold"
                              >
                                {certRole} Certified
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-zinc-500">
                              In Training ({(user.completedLessons || []).length}
                              /20 SOPs)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleSwitchActiveUser(user);
                            setActiveTab("TRAINING");
                          }}
                          className="text-[11px] font-medium text-zinc-300 hover:text-white underline underline-offset-4 transition"
                        >
                          Open Training →
                        </button>
                      </div>

                      {/* Assigned Pre-Flight Tasks List for This User */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-300">
                            Assigned Pre-Flight Tasks ({userDone}/
                            {userChecks.length} Verified)
                          </span>
                          {userPending > 0 ? (
                            <span className="text-[11px] font-semibold text-rose-400">
                              {userPending} Pending
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-400">
                              All Complete
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {userChecks.map((chk) => (
                            <div
                              key={chk.id}
                              onClick={() => handleToggleCheck(chk.id)}
                              className={`cursor-pointer rounded-xl px-3 py-2 border flex items-center justify-between gap-2 text-xs transition ${
                                chk.checked
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                                  : "bg-rose-950/20 border-rose-500/35 text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    chk.checked
                                      ? style.checkSquare
                                      : "border border-rose-400 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span className="truncate font-medium">
                                  {chk.task}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                {chk.phase}
                              </span>
                            </div>
                          ))}
                        </div>

                        {userQcItems.length > 0 && (
                          <div className="pt-2 space-y-1">
                            <span className="text-[11px] font-medium text-amber-300 block">
                              Assigned Live QC Actions ({userQcItems.length})
                            </span>
                            {userQcItems.map((q) => (
                              <div
                                key={q.id}
                                className="rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/25 text-xs flex items-center justify-between gap-2"
                              >
                                <span className="text-amber-100 truncate">
                                  {q.actionToTake || q.title}
                                </span>
                                <span className="text-[10px] text-amber-300 shrink-0">
                                  {q.timelineToSolve}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick-Assign New Task Directly to This User */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                      <select
                        value={quickDraft.phase}
                        onChange={(e) =>
                          setUserQuickTaskDrafts((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...quickDraft,
                              phase: e.target.value as PreFlightPhase,
                            },
                          }))
                        }
                        aria-label="Task Phase"
                        className="bg-[#09090b] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="T-60M">T-60M</option>
                        <option value="T-30M">T-30M</option>
                        <option value="T-15M">T-15M</option>
                        <option value="T-5M">T-5M</option>
                      </select>
                      <input
                        type="text"
                        placeholder={`Assign new task to ${user.name}...`}
                        value={quickDraft.task}
                        onChange={(e) =>
                          setUserQuickTaskDrafts((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...quickDraft,
                              task: e.target.value,
                            },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAssignQuickTaskToUser(user);
                          }
                        }}
                        className="flex-1 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => handleAssignQuickTaskToUser(user)}
                        className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 4: PRODUCTION FLOW, CALLSIGN PROTOCOL & ROLE TRAINING ACADEMY
           =================================================================== */}
        {activeTab === "TRAINING" && (
          <CrewTrainingAcademy
            users={users}
            activeUserId={myIdentity.id}
            onToggleLesson={handleToggleTrainingLesson}
            onCertifyRole={handleCertifyUserRole}
          />
        )}

        {/* ===================================================================
            VIEW 5: POST-SHOW TECHNICAL LOG & MEETING REPORT
           =================================================================== */}
        {activeTab === "MEETING_REPORT" && (
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Post-Show Engineering & Production Log
                </div>
                <h2 className="text-xl font-semibold text-white tracking-tight mt-0.5">
                  Technical Director & QC Review —{" "}
                  {new Date().toLocaleDateString()}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                  Pre-Flight Readiness: {overallPct}% ({completedChecks}/
                  {totalChecks} Verified) · Logged Events: {qcLogs.length} (
                  {qcLogs.filter((l) => l.type === "ISSUE").length} Faults,{" "}
                  {qcLogs.filter((l) => l.type === "IMPROVEMENT").length}{" "}
                  Refinements,{" "}
                  {qcLogs.filter((l) => l.type === "ACHIEVEMENT").length} Wins)
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportMeetingCsv}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  Print Report
                </button>
              </div>
            </div>

            {/* Department Sign-Off Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ROLES_LIST.map((role) => {
                const style = DEPT_STYLES[role];
                const items = checklists.filter((c) => c.role === role);
                const done = items.filter((c) => c.checked).length;
                const leadUser = users.find((u) => u.role === role);
                return (
                  <div
                    key={role}
                    className={`rounded-2xl p-4 text-xs border ${style.verifiedCard}`}
                  >
                    <div className="font-semibold text-white">
                      {style.label}
                    </div>
                    <div
                      className={`${style.text} font-semibold mt-1 tabular-nums`}
                    >
                      {done} of {items.length} Verified
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Lead: {leadUser ? leadUser.name : "Team"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Tabular Technical Log */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Timecode</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Observation</th>
                    <th className="py-3 px-3">Frame</th>
                    <th className="py-3 px-3">Director Directive</th>
                    <th className="py-3 px-3">Assigned Operator</th>
                    <th className="py-3 px-3 text-right">Status / Roadmap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {qcLogs.map((log) => {
                    const stStyle =
                      DEPT_STYLES[log.station] || DEPT_STYLES.CAMERA;
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-3 text-zinc-400 whitespace-nowrap tabular-nums">
                          {log.streamTimestamp}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              log.type === "ISSUE"
                                ? "bg-rose-500/15 text-rose-300"
                                : log.type === "ACHIEVEMENT"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${stStyle.pill}`}
                          >
                            {log.station} · {log.platform}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white">
                            {log.title}
                          </div>
                          {log.description && (
                            <div className="text-[11px] text-zinc-400">
                              {log.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {log.screenshotUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImageLog(log)}
                              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[11px] font-medium"
                            >
                              View Frame
                            </button>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-zinc-200">
                          {log.actionToTake || (
                            <span className="text-amber-400">
                              Awaiting Director
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-white font-medium">
                            {log.assignedTo}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {log.timelineToSolve}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              log.status === "RESOLVED"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : log.status === "WAITING_DIRECTOR"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-white/[0.08] text-zinc-300"
                            }`}
                          >
                            {log.status.replace("_", " ")}
                          </span>
                          {!log.pushedToRoadmap &&
                            log.type !== "ACHIEVEMENT" && (
                              <button
                                type="button"
                                onClick={() => handlePushToRoadmap(log.id)}
                                className="px-2.5 py-0.5 rounded-full bg-white text-black hover:bg-zinc-200 text-[10px] font-semibold transition"
                              >
                                + Timeline
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Assign New Check Item Modal */}
      {showAddCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Assign Pre-Flight Check Task
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCheckModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Department
                  </label>
                  <select
                    value={newCheckRole}
                    onChange={(e) => {
                      const role = e.target.value as CrewRole;
                      setNewCheckRole(role);
                      const matchingUser = users.find((u) => u.role === role);
                      if (matchingUser) setNewCheckUserId(matchingUser.id);
                    }}
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    {ROLES_LIST.map((r) => (
                      <option key={r} value={r}>
                        {DEPT_STYLES[r].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    T-Minus Phase
                  </label>
                  <select
                    value={newCheckPhase}
                    onChange={(e) =>
                      setNewCheckPhase(e.target.value as PreFlightPhase)
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="T-60M">T-60M · Rig & Signal</option>
                    <option value="T-30M">T-30M · Optics & Audio</option>
                    <option value="T-15M">T-15M · Stream & Cues</option>
                    <option value="T-5M">T-5M · Final Go Poll</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Assign to User Account
                </label>
                <select
                  value={newCheckUserId}
                  onChange={(e) => setNewCheckUserId(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.callsign} · {u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Check Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Handheld 3 RF Scan"
                  value={newCheckTask}
                  onChange={(e) => setNewCheckTask(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Technical Specification / Target
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battery > 85% and gain staged at -12dB"
                  value={newCheckDetail}
                  onChange={(e) => setNewCheckDetail(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!newCheckTask.trim()) return;
                  const targetUser = users.find((u) => u.id === newCheckUserId);
                  await fetch("/api/crew-qc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "ADD_CHECK_ITEM",
                      item: {
                        role: newCheckRole,
                        phase: newCheckPhase,
                        category: newCheckCategory || "Check",
                        task: newCheckTask,
                        detail:
                          newCheckDetail || "Standard pre-flight verification",
                        isCritical: true,
                        assignedToUserId: newCheckUserId,
                        assignedToName: targetUser?.name || "Operator",
                      },
                    }),
                  });
                  setNewCheckTask("");
                  setNewCheckDetail("");
                  setShowAddCheckModal(false);
                  triggerToast("Assigned pre-flight check");
                  fetchCrewQcData();
                }}
                className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition mt-2"
              >
                Assign Check Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frame Inspection Lightbox */}
      {previewImageLog && (
        <div
          onClick={() => setPreviewImageLog(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border border-white/[0.1] rounded-3xl max-w-2xl w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {previewImageLog.title} ({previewImageLog.platform})
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageLog(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewImageLog.screenshotUrl || ""}
                alt="QC Frame"
                className="max-h-[65vh] w-auto object-contain"
              />
              {previewImageLog.markerPos && (
                <div
                  style={{
                    left: `${previewImageLog.markerPos.x}%`,
                    top: `${previewImageLog.markerPos.y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-rose-500 bg-rose-500/25"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

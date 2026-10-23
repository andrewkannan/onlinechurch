"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import type {
  ShutdownCheckItem,
  PostmortemFeedbackItem,
  WeeklyCustodyState,
  ArchivedWeeklyReport,
} from "@/components/PostLiveAndPostmortemDesk";
import type {
  WeeklyServiceRoster,
  OperatorBlockoutDate,
} from "@/components/WeeklyServingRosterTable";
import { useAuth } from "@/components/AuthProvider";
import { getRolePermissions, canAccessCrewTab } from "@/lib/rbac";
import {
  formatMYTTime,
  getMalaysiaBroadcastCountdown,
  MalaysiaBroadcastCountdown,
} from "@/lib/malaysiaTime";
import { resolveRobotAvatarUrl } from "@/lib/robotAvatars";

const WeeklyServingRosterTable = dynamic(
  () => import("@/components/WeeklyServingRosterTable"),
  {
    loading: () => (
      <div className="rounded-2xl p-6 bg-[#111114] border border-white/[0.08] text-xs text-zinc-400">
        Loading Weekly Roster...
      </div>
    ),
  }
);

const CrewTrainingAcademy = dynamic(
  () => import("@/components/CrewTrainingAcademy"),
  {
    loading: () => (
      <div className="rounded-2xl p-6 bg-[#111114] border border-white/[0.08] text-xs text-zinc-400">
        Loading Training SOPs...
      </div>
    ),
  }
);

const PostLiveAndPostmortemDesk = dynamic(
  () => import("@/components/PostLiveAndPostmortemDesk"),
  {
    loading: () => (
      <div className="rounded-2xl p-6 bg-[#111114] border border-white/[0.08] text-xs text-zinc-400">
        Loading Postmortem & Shutdown Desk...
      </div>
    ),
  }
);

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
type UserPermission = "ADMIN" | "LEAD" | "OPERATOR";
type DutyStatus = "ON_DUTY" | "STANDBY" | "OFF_DUTY";
type GoNoGoStatus = "GO" | "STANDBY" | "HOLD";
type PreFlightPhase = "T-60M" | "T-30M" | "T-15M" | "T-5M";

const MALAYSIA_PHASE_TIME_MAP: Record<PreFlightPhase, string> = {
  "T-60M": "06:00 AM · Check Start",
  "T-30M": "07:00 AM · Optics & Mix",
  "T-15M": "08:00 AM · Stream Preview",
  "T-5M": "08:25 AM · Go-Live (-5m)",
};

interface CrewUserAccount {
  id: string;
  username: string;
  password?: string;
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
  avatarUrl?: string;
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
    label: "IG Top/Bottom Blur Missing",
    type: "ISSUE",
    severity: "MAJOR",
    station: "CAMERA",
    platform: "INSTAGRAM",
  },
  {
    label: "IG 16:9 Frame Off-Center",
    type: "ISSUE",
    severity: "MAJOR",
    station: "CAMERA",
    platform: "INSTAGRAM",
  },
  {
    label: "IG MAINSTREAM Key Disconnected",
    type: "ISSUE",
    severity: "CRITICAL",
    station: "NETWORK",
    platform: "INSTAGRAM",
  },
  {
    label: "Camera Exposure / WB Drift",
    type: "ISSUE",
    severity: "MINOR",
    station: "CAMERA",
    platform: "BOTH",
  },
  {
    label: "Broadcast Audio Low on Mobile",
    type: "ISSUE",
    severity: "MAJOR",
    station: "AUDIO",
    platform: "BOTH",
  },
  {
    label: "Lip-Sync Delay Detected",
    type: "ISSUE",
    severity: "CRITICAL",
    station: "AUDIO",
    platform: "YOUTUBE",
  },
  {
    label: "Encoder Bitrate Drop",
    type: "ISSUE",
    severity: "CRITICAL",
    station: "NETWORK",
    platform: "BOTH",
  },
  {
    label: "IG Blur + 16:9 Synced & Clean",
    type: "ACHIEVEMENT",
    severity: "WIN",
    station: "CAMERA",
    platform: "INSTAGRAM",
  },
];

const DIRECTOR_ACTION_PRESETS = [
  "Lock 16:9 center + top/bottom blur on IG scene",
  "Verify IG MAINSTREAM RTMPS preview before Go Live",
  "Lock 5600K WB on all cameras",
  "Boost broadcast bus +3 dB",
  "Adjust audio delay +40 ms",
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
  const { user: authUser, openSwitchModal } = useAuth();
  const [users, setUsers] = useState<CrewUserAccount[]>([]);
  const [checklists, setChecklists] = useState<CrewChecklistItem[]>([]);
  const [shutdownChecks, setShutdownChecks] = useState<ShutdownCheckItem[]>([]);
  const [postmortemFeedback, setPostmortemFeedback] = useState<
    PostmortemFeedbackItem[]
  >([]);
  const [weeklyCustody, setWeeklyCustody] = useState<WeeklyCustodyState>({
    weekLabel: "Current Broadcast Week",
    qcLeadName: "Daniel Wong",
    qcLeadCallsign: "QC-01",
    qcLeadSignedOff: true,
    qcLeadSignedAt: "11:52 AM",
    qcSummaryNotes: "",
    streamHealthScore: 96,
    modLeadName: "Hannah Lee",
    modLeadCallsign: "MOD-01",
    modLeadSignedOff: true,
    modLeadSignedAt: "11:54 AM",
    modSummaryNotes: "",
    prayerFollowUpNotes: "",
    directorApproved: false,
    directorName: "Andrew",
    directorApprovedAt: null,
    meetingTakeaways: "",
  });
  const [weeklyReportsArchive, setWeeklyReportsArchive] = useState<
    ArchivedWeeklyReport[]
  >([]);
  const [weeklyRoster, setWeeklyRoster] = useState<WeeklyServiceRoster[]>([]);
  const [rosterBlockouts, setRosterBlockouts] = useState<
    OperatorBlockoutDate[]
  >([]);
  const [qcLogs, setQcLogs] = useState<QcLogItem[]>([]);
  const [directorSignOff, setDirectorSignOff] = useState({
    clearedToGoLive: false,
    directorName: "Andrew",
    clearedAt: null as string | null,
    flashNotice: "",
  });

  const [activeTab, setActiveTab] = useState<
    | "PRE_LIVE"
    | "WEEKLY_ROSTER"
    | "QC_PAD"
    | "POST_LIVE_SHUTDOWN"
    | "MEETING_REPORT"
    | "TRAINING"
  >("PRE_LIVE");

  const [myIdentity, setMyIdentity] = useState<{
    id: string;
    name: string;
    role: CrewRole;
  }>({
    id: authUser?.id || "usr-director-1",
    name: authUser?.name || "Andrew",
    role: authUser?.role || "DIRECTOR",
  });

  const [stationFilter, setStationFilter] = useState<"ALL" | CrewRole>("ALL");
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | PreFlightPhase>("ALL");
  const [userFilter, setUserFilter] = useState<string>("ALL");

  const [simScheduleMode, setSimScheduleMode] = useState<
    "REAL" | "SIM_615AM_CHECK" | "SIM_820AM_FINAL5M" | "SIM_825AM_GOLIVE"
  >("REAL");
  const [mytCountdown, setMytCountdown] = useState<MalaysiaBroadcastCountdown>(
    () => getMalaysiaBroadcastCountdown(new Date(), "REAL")
  );

  useEffect(() => {
    setMytCountdown(getMalaysiaBroadcastCountdown(new Date(), simScheduleMode));
    const timer = setInterval(() => {
      setMytCountdown(
        getMalaysiaBroadcastCountdown(new Date(), simScheduleMode)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [simScheduleMode]);

  useEffect(() => {
    if (authUser) {
      setMyIdentity({
        id: authUser.id,
        name: authUser.name,
        role: authUser.role,
      });
      setStationFilter(authUser.role === "DIRECTOR" ? "ALL" : authUser.role);
      setActiveTab((prev) =>
        canAccessCrewTab(authUser.role, prev)
          ? prev
          : (getRolePermissions(authUser.role).defaultCrewTab as any)
      );
    }
  }, [authUser]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [newCheckRole, setNewCheckRole] = useState<CrewRole>("CAMERA");
  const [newCheckPhase, setNewCheckPhase] = useState<PreFlightPhase>("T-30M");
  const [newCheckCategory] = useState("Verification");
  const [newCheckTask, setNewCheckTask] = useState("");
  const [newCheckDetail, setNewCheckDetail] = useState("");
  const [newCheckUserId, setNewCheckUserId] = useState("usr-camera-1");

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

  const [directorDrafts, setDirectorDrafts] = useState<
    Record<
      string,
      { actionToTake: string; assignedTo: string; timelineToSolve: string }
    >
  >({});

  const [previewImageLog, setPreviewImageLog] = useState<QcLogItem | null>(
    null
  );

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const applyServerState = (data: any) => {
    if (!data) return;
    if (data.users) setUsers(data.users);
    if (data.checklists) setChecklists(data.checklists);
    if (data.shutdownChecks) setShutdownChecks(data.shutdownChecks);
    if (data.postmortemFeedback) setPostmortemFeedback(data.postmortemFeedback);
    if (data.weeklyCustody) setWeeklyCustody(data.weeklyCustody);
    if (data.weeklyReportsArchive)
      setWeeklyReportsArchive(data.weeklyReportsArchive);
    if (data.weeklyRoster) setWeeklyRoster(data.weeklyRoster);
    if (data.rosterBlockouts) setRosterBlockouts(data.rosterBlockouts);
    if (data.qcLogs) setQcLogs(data.qcLogs);
    if (data.directorSignOff) setDirectorSignOff(data.directorSignOff);
  };

  const fetchCrewQcData = async () => {
    try {
      const res = await fetch("/api/crew-qc", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      applyServerState(data);
    } catch (e) {
      console.error("Failed to fetch crew-qc data:", e);
    }
  };

  useEffect(() => {
    fetchCrewQcData();
    const interval = setInterval(fetchCrewQcData, 6000);
    const handleAuthChange = () => fetchCrewQcData();
    window.addEventListener("church-auth-changed", handleAuthChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("church-auth-changed", handleAuthChange);
    };
  }, []);

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

  const handleToggleCheck = async (id: string) => {
    setChecklists((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
              checkedBy: !item.checked ? myIdentity.name : null,
              checkedAt: !item.checked ? formatMYTTime() : null,
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
      if (updated.directorSignOff) setDirectorSignOff(updated.directorSignOff);
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
      if (updated.directorSignOff) setDirectorSignOff(updated.directorSignOff);
      triggerToast(
        role === "ALL"
          ? "All pre-flight checks verified (100% Ready)"
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
      triggerToast("Pre-flight checklist reset");
    }
  };

  const handleToggleGoLive = async () => {
    if (myIdentity.role !== "DIRECTOR") {
      triggerToast("Director Only: Only Technical Director can confirm Go-Live");
      return;
    }
    const nextState = !directorSignOff.clearedToGoLive;
    const allReady =
      checklists.length > 0 && checklists.every((c) => c.checked);
    if (nextState && !allReady) {
      triggerToast("Complete all pre-flight checks before Go-Live");
      return;
    }

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "DIRECTOR_UPDATE",
        clearedToGoLive: nextState,
        directorName: myIdentity.name,
        actorRole: myIdentity.role,
      }),
    });
    const updated = await res.json();
    if (!res.ok) {
      triggerToast(updated.error || "Unable to update Go-Live state");
      return;
    }
    if (updated.directorSignOff) setDirectorSignOff(updated.directorSignOff);
    triggerToast(
      nextState ? "Director Confirmed: Broadcast On Air" : "Returned to Standby"
    );
  };

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
      triggerToast("Training progress updated");
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
      triggerToast(`${role} role certified`);
    }
  };

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
      triggerToast("Queued for Director");
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
      triggerToast("Directive saved");
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
      triggerToast("Added to Action Plan");
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
    triggerToast("CSV exported");
  };

  // Computed Readiness Metrics
  const totalChecks = checklists.length;
  const completedChecks = checklists.filter((c) => c.checked).length;
  const pendingCount = totalChecks - completedChecks;
  const overallPct =
    totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
  const is100PercentReady = totalChecks > 0 && completedChecks === totalChecks;

  const totalShutdownChecks = shutdownChecks.length;
  const completedShutdownChecks = shutdownChecks.filter((c) => c.checked).length;
  const shutdownPct =
    totalShutdownChecks > 0
      ? Math.round((completedShutdownChecks / totalShutdownChecks) * 100)
      : 0;
  const is100PercentShutdown =
    totalShutdownChecks > 0 && completedShutdownChecks === totalShutdownChecks;

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

  const myRoleSpec = getRolePermissions(myIdentity.role);
  const isDirector = myIdentity.role === "DIRECTOR";
  const canLogQc = myRoleSpec.capabilities.logLiveQcScreenshotsAndFaults;
  const canTriageDirectorQueue =
    myRoleSpec.capabilities.triageDirectorQueueDirectives;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-5 space-y-5">
        {/* ===================================================================
            COMPACT COMMAND HEADER & SEGMENTED WORKSPACE SWITCHER
           =================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-semibold tracking-[-0.025em] text-white">
              {isDirector
                ? "Crew & Live QC"
                : `${DEPT_STYLES[myIdentity.role].label} Console`}
            </h1>
            <span className="text-zinc-700">·</span>
            <div className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300">
              <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20 bg-black shrink-0">
                <img
                  src={resolveRobotAvatarUrl(
                    authUser?.avatarUrl,
                    myIdentity.role,
                    authUser?.callsign
                  )}
                  alt={myIdentity.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium text-white">{myIdentity.name}</span>
              <span className="text-zinc-500">({myIdentity.role})</span>
              <button
                type="button"
                onClick={() => openSwitchModal()}
                className="text-zinc-400 hover:text-white underline underline-offset-2 ml-0.5"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Segmented Workspace Control */}
          <div className="inline-flex items-center gap-1 bg-[#131316] p-1 rounded-full border border-white/[0.08] overflow-x-auto">
            {canAccessCrewTab(myIdentity.role, "PRE_LIVE") && (
              <button
                type="button"
                onClick={() => setActiveTab("PRE_LIVE")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "PRE_LIVE"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Pre-Flight</span>
                <span
                  className={`tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === "PRE_LIVE"
                      ? "bg-black/10 text-black font-bold"
                      : is100PercentReady
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {overallPct}%
                </span>
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "WEEKLY_ROSTER") && (
              <button
                type="button"
                onClick={() => setActiveTab("WEEKLY_ROSTER")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "WEEKLY_ROSTER"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Roster</span>
                <span
                  className={`tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === "WEEKLY_ROSTER"
                      ? "bg-black/10 text-black font-bold"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {weeklyRoster.length || 4}w
                </span>
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "QC_PAD") && (
              <button
                type="button"
                onClick={() => setActiveTab("QC_PAD")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "QC_PAD"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>{canLogQc ? "Live QC" : "Directives"}</span>
                {waitingDirectorCount > 0 && (
                  <span
                    className={`tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === "QC_PAD"
                        ? "bg-rose-500 text-white font-bold"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {waitingDirectorCount}
                  </span>
                )}
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "POST_LIVE_SHUTDOWN") && (
              <button
                type="button"
                onClick={() => setActiveTab("POST_LIVE_SHUTDOWN")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "POST_LIVE_SHUTDOWN"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Shutdown</span>
                <span
                  className={`tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === "POST_LIVE_SHUTDOWN"
                      ? "bg-black/10 text-black font-bold"
                      : is100PercentShutdown
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/[0.06] text-zinc-400"
                  }`}
                >
                  {shutdownPct}%
                </span>
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "MEETING_REPORT") && (
              <button
                type="button"
                onClick={() => setActiveTab("MEETING_REPORT")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "MEETING_REPORT"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Postmortem</span>
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "TRAINING") && (
              <button
                type="button"
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "TRAINING"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Training</span>
              </button>
            )}

            {canAccessCrewTab(myIdentity.role, "TEAM_ACCOUNTS") && (
              <Link
                href="/settings"
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <span>Users ({users.length})</span>
              </Link>
            )}
          </div>
        </div>

        {/* ===================================================================
            VIEW 0: WEEKLY SERVING ROSTER TABLE
           =================================================================== */}
        {activeTab === "WEEKLY_ROSTER" && (
          <WeeklyServingRosterTable
            weeklyRoster={weeklyRoster}
            rosterBlockouts={rosterBlockouts}
            users={users}
            currentUser={{
              id: myIdentity.id,
              name: myIdentity.name,
              role: myIdentity.role,
              callsign: authUser?.callsign,
              avatarUrl: authUser?.avatarUrl,
            }}
            onRefreshState={applyServerState}
            onTriggerToast={triggerToast}
          />
        )}

        {/* ===================================================================
            VIEW 1: PRE-FLIGHT VERIFICATION & GO / NO-GO GATE
           =================================================================== */}
        {activeTab === "PRE_LIVE" && (
          <div className="space-y-4">
            {/* COMPACT MYT TIMELINE + BLINKING GO-LIVE GATE */}
            <div className="rounded-2xl p-4 bg-[#111114] border border-white/[0.08] space-y-3.5">
              {/* Top Row: MYT Clock + Milestones + Sim Mode */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#18181c] border border-white/[0.1]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white tabular-nums">
                      {mytCountdown.mytClock}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {mytCountdown.mytDateLabel}
                    </span>
                  </div>

                  {/* 3 Inline Milestone Pills */}
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[11px] text-zinc-300 font-mono">
                    06:00 Check:{" "}
                    <strong className="text-white">
                      {mytCountdown.toCheckStart600.isReached
                        ? "OPEN"
                        : mytCountdown.toCheckStart600.formatted}
                    </strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
                    08:25 Go-Live (-5m):{" "}
                    <strong className="text-white">
                      {mytCountdown.toGoLive825.totalSeconds === 0
                        ? "GO LIVE"
                        : mytCountdown.toGoLive825.formatted}
                    </strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[11px] text-zinc-300 font-mono">
                    08:30 Service:{" "}
                    <strong className="text-white">
                      {mytCountdown.toService830.isReached
                        ? "LIVE"
                        : mytCountdown.toService830.formatted}
                    </strong>
                  </span>
                </div>

                {/* Sim Clock Switcher */}
                <div className="inline-flex items-center gap-1 bg-[#17171b] p-0.5 rounded-full border border-white/[0.07]">
                  {(
                    [
                      { id: "REAL", label: "Live MYT" },
                      { id: "SIM_615AM_CHECK", label: "6:15 AM" },
                      { id: "SIM_820AM_FINAL5M", label: "8:20 AM" },
                      { id: "SIM_825AM_GOLIVE", label: "8:25 AM" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSimScheduleMode(mode.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                        simScheduleMode === mode.id
                          ? "bg-white text-black font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Readiness Gate Bar (Blinking Red if Missing, Blinking Green if 100%, Solid Emerald if On Air) */}
              {is100PercentReady ? (
                directorSignOff.clearedToGoLive ? (
                  <div className="rounded-xl p-3.5 bg-[#0b1f16] border-2 border-emerald-400 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-extrabold text-sm tabular-nums">
                        ON AIR
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          Broadcast Confirmed On Air · Signed by{" "}
                          {directorSignOff.directorName} ({directorSignOff.clearedAt})
                        </div>
                        <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                          {completedChecks}/{totalChecks} Verified · YT 1080p60 · IG Blur+16:9 · -14 LUFS
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDirector && (
                        <>
                          <button
                            type="button"
                            onClick={handleResetChecklists}
                            className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-medium"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleGoLive}
                            className="px-3.5 py-1.5 rounded-full bg-white/[0.1] text-emerald-300 border border-emerald-400/40 text-xs font-semibold"
                          >
                            Standby
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab("POST_LIVE_SHUTDOWN")}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-400 text-black text-xs font-bold"
                      >
                        Shutdown →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3.5 bg-[#0a2217] border-2 border-emerald-400 animate-pulse flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-extrabold text-base tabular-nums">
                        100% READY
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          All {totalChecks} Checks Verified — Ready for 8:25 AM Go-Live
                        </div>
                        <div className="text-[11px] text-emerald-200 mt-0.5">
                          CAM 5600K · AUD -14 LUFS · IG Blur+16:9 · YT 1080p60
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDirector ? (
                        <>
                          <button
                            type="button"
                            onClick={handleResetChecklists}
                            className="px-3 py-1.5 rounded-full bg-white/[0.08] text-zinc-200 text-xs font-medium"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleGoLive}
                            className="px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold ring-2 ring-white"
                          >
                            Director: Confirm Go Live
                          </button>
                        </>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-400/20 border border-emerald-400 text-emerald-200 text-xs font-bold">
                          Awaiting Director Confirmation
                        </span>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-xl p-3.5 bg-[#1c0d11] border-2 border-rose-500 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-extrabold text-base tabular-nums animate-pulse">
                      {overallPct}%
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {pendingCount} Pre-Flight{" "}
                          {pendingCount === 1 ? "Check" : "Checks"} Missing
                        </span>
                        <span className="text-[11px] font-mono text-rose-200">
                          ({completedChecks}/{totalChecks} Verified)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pendingStations.map((ps) => {
                          const st = DEPT_STYLES[ps.role];
                          return (
                            <button
                              key={ps.role}
                              type="button"
                              onClick={() => setStationFilter(ps.role)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${st.pill}`}
                            >
                              {ps.label}: {ps.remaining}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/45 text-rose-200 text-[11px] font-semibold animate-pulse">
                      Go-Live Locked · Director Only
                    </span>
                    {isDirector ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCheckAllStation("ALL")}
                          className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold"
                        >
                          Verify All ({pendingCount})
                        </button>
                        <button
                          type="button"
                          onClick={handleResetChecklists}
                          className="px-3 py-1.5 rounded-full bg-white/[0.05] text-zinc-300 border border-white/[0.08] text-xs font-medium"
                        >
                          Reset
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckAllStation(myIdentity.role)}
                        className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold"
                      >
                        Verify {DEPT_STYLES[myIdentity.role].label}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 5 DEPARTMENT STATION CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                    className={`cursor-pointer rounded-2xl p-3.5 transition flex flex-col justify-between ${
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
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-white">
                          {style.label}
                        </span>
                        {remaining > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold tabular-nums">
                            {remaining} left
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.pill}`}
                          >
                            GO
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-semibold text-white tabular-nums">
                          {pct}%
                        </span>
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          {done}/{items.length}
                        </span>
                      </div>

                      <div className="w-full h-1 bg-white/[0.07] rounded-full my-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.05] text-zinc-400">
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

            {/* FILTER BAR */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#121215] border border-white/[0.08] rounded-2xl p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStationFilter("ALL")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    stationFilter === "ALL"
                      ? "bg-white text-black font-semibold"
                      : "text-zinc-400 hover:text-white bg-white/[0.03]"
                  }`}
                >
                  All ({totalChecks})
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
                      className={`px-3 py-1 rounded-full text-xs transition flex items-center gap-1.5 ${
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
                <select
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value as any)}
                  aria-label="Filter by Phase"
                  className="bg-[#18181c] border border-white/[0.1] rounded-full px-3 py-1 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="ALL">All Phases (06:00–08:25 AM)</option>
                  <option value="T-60M">06:00 AM · Check Start</option>
                  <option value="T-30M">07:00 AM · Optics & Mix</option>
                  <option value="T-15M">08:00 AM · Stream Preview</option>
                  <option value="T-5M">08:25 AM · Early Go-Live</option>
                </select>

                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  aria-label="Filter by Operator"
                  className="bg-[#18181c] border border-white/[0.1] rounded-full px-3 py-1 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="ALL">All Operators</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>

                {isDirector && (
                  <button
                    type="button"
                    onClick={() => setShowAddCheckModal(true)}
                    className="px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    + Add Check
                  </button>
                )}
              </div>
            </div>

            {/* PENDING CHECKS */}
            {uncheckedVisible.length > 0 && (
              <section className="rounded-2xl p-5 bg-[#151113] border border-rose-500/35 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <h2 className="text-sm font-semibold text-white">
                      Pending Checks ({uncheckedVisible.length} Remaining)
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckAllStation(stationFilter)}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    Verify All {uncheckedVisible.length}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {uncheckedVisible.map((item) => {
                    const style =
                      DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl p-3.5 bg-[#0c0c0e] border border-rose-500/40 ${style.leftBorder} flex flex-col justify-between gap-3 transition hover:border-rose-400`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${style.pill}`}
                              >
                                {item.role}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {MALAYSIA_PHASE_TIME_MAP[
                                  item.phase || "T-30M"
                                ] || item.phase}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase text-rose-400">
                              Pending
                            </span>
                          </div>

                          <div
                            onClick={() => handleToggleCheck(item.id)}
                            className="cursor-pointer"
                          >
                            <div className="text-sm font-semibold text-white">
                              {item.task}
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {item.detail}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
                          <select
                            value={item.assignedToUserId || ""}
                            onChange={(e) =>
                              handleReassignCheckItem(item.id, e.target.value)
                            }
                            aria-label="Assign operator"
                            className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none truncate"
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

                          <button
                            type="button"
                            onClick={() => handleToggleCheck(item.id)}
                            className="px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0"
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

            {/* VERIFIED CHECKS */}
            {checkedVisible.length > 0 && (
              <section className="rounded-2xl p-5 bg-[#111114] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">
                      Verified & Locked ({checkedVisible.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Click card to undo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {checkedVisible.map((item) => {
                    const style =
                      DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheck(item.id)}
                        className={`cursor-pointer rounded-xl p-3.5 transition flex items-center justify-between gap-3 select-none ${style.verifiedCard}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-[11px] font-bold ${style.checkSquare}`}
                          >
                            ✓
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.task}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {item.role} · {item.detail}
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

            {/* COMPACT IG 9:16 BLUR + 16:9 CENTER SPEC STRIP */}
            {(stationFilter === "ALL" ||
              stationFilter === "QC" ||
              stationFilter === "CAMERA" ||
              stationFilter === "DIRECTOR") && (
              <section className="rounded-2xl p-4 bg-[#121215] border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      IG Live 9:16 Spec · Stream Key: MAINSTREAM
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">
                    Top Blur Fill + Centered 16:9 Landscape Feed + Bottom Blur Fill
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="px-3 py-2 rounded-xl bg-[#09090b] border border-white/[0.06]">
                    <span className="text-amber-400 font-semibold block">
                      1. Top Blur
                    </span>
                    <span className="text-zinc-400">Gaussian fill, 0 gap</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[#09090b] border border-white/[0.06]">
                    <span className="text-emerald-400 font-semibold block">
                      2. Center 16:9
                    </span>
                    <span className="text-zinc-400">Uncropped 1080p60</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[#09090b] border border-white/[0.06]">
                    <span className="text-amber-400 font-semibold block">
                      3. Bottom Blur
                    </span>
                    <span className="text-zinc-400">Clean behind chat</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[#09090b] border border-white/[0.06]">
                    <span className="text-sky-400 font-semibold block">
                      4. RTMPS Key
                    </span>
                    <span className="text-zinc-400">MAINSTREAM preview</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ===================================================================
            VIEW 2: LIVE STREAM TELEMETRY, FAST QC PAD & DIRECTOR QUEUE
           =================================================================== */}
        {activeTab === "QC_PAD" && (
          <div className="space-y-5">
            {/* Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl p-3.5 bg-[#121215] border border-white/[0.08]">
                <div className="text-[11px] text-zinc-400">YouTube 16:9</div>
                <div className="text-base font-semibold text-white tabular-nums mt-0.5">
                  1080p60 · 6.8 Mbps
                </div>
                <div className="text-[11px] text-emerald-400">0.0% Drops</div>
              </div>

              <div className="rounded-2xl p-3.5 bg-[#121215] border border-white/[0.08]">
                <div className="text-[11px] text-zinc-400">IG Live RTMPS</div>
                <div className="text-base font-semibold text-white mt-0.5">
                  16:9 + Blur Fill
                </div>
                <div className="text-[11px] text-sky-400">Key: MAINSTREAM</div>
              </div>

              <div className="rounded-2xl p-3.5 bg-[#121215] border border-white/[0.08]">
                <div className="text-[11px] text-zinc-400">Audio Bus</div>
                <div className="text-base font-semibold text-white tabular-nums mt-0.5">
                  -14.2 LUFS
                </div>
                <div className="text-[11px] text-sky-400">Peak -1.8 dBTP</div>
              </div>

              <div className="rounded-2xl p-3.5 bg-[#121215] border border-white/[0.08]">
                <div className="text-[11px] text-zinc-400">Director Queue</div>
                <div className="text-base font-semibold text-white tabular-nums mt-0.5">
                  {waitingDirectorCount} Pending
                </div>
                <div className="text-[11px] text-zinc-400">
                  {qcLogs.length} Logged
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT: FAST 1-TAP QC LOGGER */}
              {canLogQc && (
                <div className="lg:col-span-5 bg-[#121215] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <h2 className="text-sm font-semibold text-white">
                      Log QC Issue / Frame Capture
                    </h2>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      Routes to Director
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
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
                          ? "IG Live"
                          : plat === "YOUTUBE"
                          ? "YouTube"
                          : "Both"}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_QC_PRESETS.map((preset) => {
                      const active = qcTitle === preset.label;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectQcPreset(preset)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition ${
                            active
                              ? "bg-white text-black border-white font-semibold"
                              : "bg-[#18181c] hover:bg-white/[0.06] text-zinc-200 border-white/[0.08]"
                          }`}
                        >
                          <div className="truncate">{preset.label}</div>
                          <div
                            className={`text-[10px] ${
                              active ? "text-zinc-700" : "text-zinc-500"
                            }`}
                          >
                            {preset.station} · {preset.type}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={qcType}
                        onChange={(e) => setQcType(e.target.value as any)}
                        aria-label="Log Type"
                        className="bg-[#18181c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="ISSUE">Issue / Fault</option>
                        <option value="IMPROVEMENT">Refinement</option>
                        <option value="ACHIEVEMENT">Win</option>
                      </select>
                      <select
                        value={qcStation}
                        onChange={(e) => setQcStation(e.target.value as any)}
                        aria-label="Station"
                        className="bg-[#18181c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                      placeholder="Observation..."
                      value={qcTitle}
                      onChange={(e) => setQcTitle(e.target.value)}
                      className="w-full bg-[#18181c] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="bg-[#09090b] border border-white/[0.08] rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-300">
                        Frame Screenshot
                      </span>
                      <div className="flex items-center gap-1.5">
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
                          className="px-2.5 py-1 rounded-full bg-white/[0.06] text-zinc-200 text-[11px] border border-white/[0.08]"
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={handleCaptureScreen}
                          className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-semibold"
                        >
                          Capture
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
                        className="relative cursor-crosshair rounded-lg overflow-hidden border border-white/[0.1] bg-black max-h-40 flex items-center justify-center"
                      >
                        <img
                          src={qcScreenshot}
                          alt="Captured frame"
                          className="max-h-40 w-auto object-contain"
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
                    className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition"
                  >
                    Send to Director Queue
                  </button>
                </div>
              )}

              {/* RIGHT: DIRECTOR DECISION QUEUE */}
              <div
                className={`${
                  canLogQc ? "lg:col-span-7" : "lg:col-span-12"
                } space-y-3.5`}
              >
                <div className="flex items-center justify-between gap-2 bg-[#121215] border border-white/[0.08] rounded-2xl p-4">
                  <h2 className="text-sm font-semibold text-white">
                    {canTriageDirectorQueue
                      ? `Director Action Queue (${waitingDirectorCount} Awaiting)`
                      : `Station Directives (${qcLogs.length})`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("MEETING_REPORT")}
                    className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-200 border border-white/[0.08] text-xs"
                  >
                    Postmortem →
                  </button>
                </div>

                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
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
                        className={`rounded-2xl p-4 border transition space-y-3 ${
                          stStyle.leftBorder
                        } ${
                          isWaiting
                            ? "bg-[#151210] border-amber-500/40"
                            : "bg-[#121215] border-white/[0.08]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
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
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${stStyle.pill}`}
                            >
                              {log.station} · {log.platform}
                            </span>
                            <span className="text-[11px] text-zinc-500 tabular-nums">
                              {log.streamTimestamp}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              isWaiting
                                ? "bg-amber-500/20 text-amber-300"
                                : log.status === "RESOLVED"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-white/[0.06] text-zinc-300"
                            }`}
                          >
                            {isWaiting
                              ? "Waiting"
                              : log.status === "RESOLVED"
                              ? "Resolved"
                              : "Assigned"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-white">
                            {log.title}
                          </div>

                          {log.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageLog(log)}
                              className="w-24 h-14 rounded-lg overflow-hidden border border-white/[0.12] shrink-0 relative bg-black"
                            >
                              <img
                                src={log.screenshotUrl}
                                alt="QC Frame"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                        </div>

                        {log.type !== "ACHIEVEMENT" &&
                          (canTriageDirectorQueue ? (
                            <div className="bg-[#09090b] border border-white/[0.07] rounded-xl p-3 space-y-2.5">
                              <div className="flex flex-wrap items-center gap-1">
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
                                    className="px-2 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[10px] text-zinc-300"
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
                                  className="sm:col-span-5 bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                                  aria-label="Assign operator"
                                  className="sm:col-span-3 bg-[#141418] border border-white/[0.1] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
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
                                  aria-label="Timeline"
                                  className="sm:col-span-2 bg-[#141418] border border-white/[0.1] rounded-lg px-2 py-1.5 text-xs text-amber-300 focus:outline-none"
                                >
                                  <option value="Immediate">Immediate</option>
                                  <option value="Before Saturday Rehearsal">
                                    Saturday
                                  </option>
                                  <option value="By Next Sunday">
                                    Next Sun
                                  </option>
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
                                  className="sm:col-span-2 py-1.5 px-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold"
                                >
                                  {isWaiting
                                    ? "Assign"
                                    : log.status === "IN_PROGRESS"
                                    ? "Resolve"
                                    : "Update"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-white">
                                {log.actionToTake || "Awaiting Director review"}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {log.assignedTo} ·{" "}
                                <strong className="text-amber-300">
                                  {log.timelineToSolve}
                                </strong>
                              </span>
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 4: TRAINING ACADEMY
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
            VIEW 5 & 6: POST-LIVE SHUTDOWN & POSTMORTEM CORNER
           =================================================================== */}
        {(activeTab === "POST_LIVE_SHUTDOWN" ||
          activeTab === "MEETING_REPORT") && (
          <PostLiveAndPostmortemDesk
            mode={activeTab === "POST_LIVE_SHUTDOWN" ? "SHUTDOWN" : "POSTMORTEM"}
            onSwitchMode={(nextMode) =>
              setActiveTab(
                nextMode === "SHUTDOWN" ? "POST_LIVE_SHUTDOWN" : "MEETING_REPORT"
              )
            }
            users={users}
            myIdentity={myIdentity}
            preFlightChecklists={checklists}
            shutdownChecks={shutdownChecks}
            postmortemFeedback={postmortemFeedback}
            weeklyCustody={weeklyCustody}
            weeklyReportsArchive={weeklyReportsArchive}
            qcLogs={qcLogs}
            onRefreshData={(updated) => {
              if (updated) {
                applyServerState(updated);
              } else {
                fetchCrewQcData();
              }
            }}
            onTriggerToast={triggerToast}
            onPreviewFrame={(log) => setPreviewImageLog(log)}
            onPushToRoadmap={handlePushToRoadmap}
            onExportCsv={handleExportMeetingCsv}
          />
        )}
      </main>

      {/* Assign New Check Item Modal */}
      {showAddCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white">
                Add Pre-Flight Check
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
                    Phase
                  </label>
                  <select
                    value={newCheckPhase}
                    onChange={(e) =>
                      setNewCheckPhase(e.target.value as PreFlightPhase)
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="T-60M">06:00 AM · Check Start</option>
                    <option value="T-30M">07:00 AM · Optics & Mix</option>
                    <option value="T-15M">08:00 AM · Stream Preview</option>
                    <option value="T-5M">08:25 AM · Early Go-Live</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Operator
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
                  Check Task
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Mic 3 RF Scan"
                  value={newCheckTask}
                  onChange={(e) => setNewCheckTask(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Target Spec
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battery > 85%, gain -12 dB"
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
                        detail: newCheckDetail || "Verified",
                        isCritical: true,
                        assignedToUserId: newCheckUserId,
                        assignedToName: targetUser?.name || "Operator",
                      },
                    }),
                  });
                  setNewCheckTask("");
                  setNewCheckDetail("");
                  setShowAddCheckModal(false);
                  triggerToast("Check added");
                  fetchCrewQcData();
                }}
                className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition mt-2"
              >
                Save Check
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
            className="bg-[#121215] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-5 space-y-4"
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
            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
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

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck,
  Camera,
  Mic,
  MessageSquare,
  Eye,
  Clapperboard,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Plus,
  RotateCcw,
  Upload,
  Monitor,
  Clock,
  ArrowUpRight,
  Trash2,
  Trophy,
  Lightbulb,
  Bug,
  X,
  Check,
  UserCheck,
  Sparkles,
  Crosshair,
  Radio,
} from "lucide-react";
import { YouTubeIcon, InstagramIcon } from "@/components/Icons";

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";

const LOCAL_CREW_USER_KEY = "church_live_hub_crew_identity_v1";

/**
 * Compresses a screenshot File/Blob/VideoFrame to a crisp 850px JPEG data URL
 * so screenshots save fast and reliably in both SQLite and JSON store.
 */
async function compressScreenshotFile(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 850;
        const maxH = 600;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CrewCheckAndQcPage() {
  // Active Crew Identity (Mobile / Station Login)
  const [myIdentity, setMyIdentity] = useState<{
    name: string;
    role: CrewRole;
    device: string;
  }>({
    name: "Andrew (Director)",
    role: "DIRECTOR",
    device: "Director Command Console",
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState("Andrew");
  const [loginRole, setLoginRole] = useState<CrewRole>("DIRECTOR");
  const [loginDevice, setLoginDevice] = useState("Mobile Phone");

  // Main Sub-Tab: PRE_LIVE_CHECK vs QC_WEEKLY_LOG
  const [activeSection, setActiveSection] = useState<
    "PRE_LIVE_CHECK" | "QC_WEEKLY_LOG"
  >("PRE_LIVE_CHECK");
  const [stationFilter, setStationFilter] = useState<CrewRole | "ALL">("ALL");

  // Server State
  const [checklists, setChecklists] = useState<any[]>([]);
  const [activeCrew, setActiveCrew] = useState<any[]>([]);
  const [qcLogs, setQcLogs] = useState<any[]>([]);
  const [directorSignOff, setDirectorSignOff] = useState<{
    clearedToGoLive: boolean;
    directorName: string;
    clearedAt: string | null;
    flashNotice: string;
  }>({
    clearedToGoLive: false,
    directorName: "Andrew (Director)",
    clearedAt: null,
    flashNotice:
      "Pre-Flight Check in progress — Please complete all station checks on your phones!",
  });

  // Modals & UI State
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [showNewQcModal, setShowNewQcModal] = useState(false);
  const [previewImageLog, setPreviewImageLog] = useState<any | null>(null);
  const [qcFilter, setQcFilter] = useState<string>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add Check Item Form
  const [newCheck, setNewCheck] = useState({
    role: "CAMERA" as CrewRole,
    category: "Pre-Flight Check",
    task: "",
    detail: "",
    isCritical: true,
  });

  // New QC Log Form (with Live Screenshot & Pinpoint Marker)
  const [newQc, setNewQc] = useState({
    serviceDate: new Date().toISOString().slice(0, 10),
    streamTimestamp: `Live ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    type: "ISSUE" as "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT",
    severity: "MAJOR" as "CRITICAL" | "MAJOR" | "MINOR" | "WIN",
    platform: "INSTAGRAM" as "YOUTUBE" | "INSTAGRAM" | "BOTH",
    station: "CAMERA" as
      | "CAMERA"
      | "AUDIO"
      | "MODERATOR"
      | "LIGHTING"
      | "NETWORK"
      | "DIRECTOR",
    title: "",
    description: "",
    actionToTake: "",
    assignedTo: "Kevin (Camera Lead)",
    timelineToSolve: "Before Saturday Rehearsal",
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6)
      .toISOString()
      .slice(0, 10),
    screenshotUrl: null as string | null,
    markerPos: null as { x: number; y: number } | null,
  });

  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchCrewQcData = async () => {
    try {
      const res = await fetch("/api/crew-qc", { cache: "no-store" });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
      if (data.activeCrew) setActiveCrew(data.activeCrew);
      if (data.qcLogs) setQcLogs(data.qcLogs);
      if (data.directorSignOff) setDirectorSignOff(data.directorSignOff);
    } catch (e) {
      console.error("Failed to load Crew & QC data:", e);
    }
  };

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(LOCAL_CREW_USER_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setMyIdentity(parsed);
        setLoginName(parsed.name);
        setLoginRole(parsed.role);
      }
    } catch {}

    fetchCrewQcData();
    const interval = setInterval(fetchCrewQcData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Support Ctrl+V Clipboard Screenshot Paste when QC Modal is open
  useEffect(() => {
    if (!showNewQcModal) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const dataUrl = await compressScreenshotFile(blob);
            setNewQc((prev) => ({ ...prev, screenshotUrl: dataUrl }));
            triggerToast("📋 Live screenshot pasted from clipboard!");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showNewQcModal]);

  // Crew Member Phone / Station Login
  const handleCrewLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    const identity = {
      name: loginName.trim(),
      role: loginRole,
      device: loginDevice || "Mobile Phone",
    };
    setMyIdentity(identity);
    try {
      localStorage.setItem(LOCAL_CREW_USER_KEY, JSON.stringify(identity));
    } catch {}

    // Auto-filter to their station if not Director, or switch to QC tab if QC
    if (loginRole === "QC") {
      setStationFilter("QC");
    } else if (loginRole !== "DIRECTOR") {
      setStationFilter(loginRole);
    } else {
      setStationFilter("ALL");
    }

    setShowLoginModal(false);
    triggerToast(`Signed in as ${identity.name} (${identity.role} Station)`);

    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREW_LOGIN",
          name: identity.name,
          role: identity.role,
          device: identity.device,
        }),
      });
      const data = await res.json();
      if (data.activeCrew) setActiveCrew(data.activeCrew);
    } catch {}
  };

  // Toggle Pre-Live Checklist Item
  const handleToggleCheck = async (id: string) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setChecklists((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextChecked = !item.checked;
        return {
          ...item,
          checked: nextChecked,
          checkedBy: nextChecked ? myIdentity.name : null,
          checkedAt: nextChecked ? nowTime : null,
        };
      })
    );

    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_CHECK",
          id,
          memberName: myIdentity.name,
        }),
      });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
    } catch {}
  };

  // Director Master Go-Live Sign-Off
  const handleToggleGoLiveClearance = async () => {
    const nextState = !directorSignOff.clearedToGoLive;
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setDirectorSignOff((prev) => ({
      ...prev,
      clearedToGoLive: nextState,
      directorName: myIdentity.name,
      clearedAt: nextState ? nowTime : null,
    }));

    triggerToast(
      nextState
        ? "🟢 DIRECTOR GREENLIGHT GRANTED — ALL STATIONS CLEARED TO GO LIVE!"
        : "Pre-Live Clearance returned to Standby."
    );

    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DIRECTOR_UPDATE",
          clearedToGoLive: nextState,
          directorName: myIdentity.name,
        }),
      });
    } catch {}
  };

  // Reset all checklists for next service
  const handleResetChecklists = async () => {
    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_CHECKLISTS" }),
      });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
      if (data.directorSignOff) setDirectorSignOff(data.directorSignOff);
      triggerToast("All station checklists reset for new service!");
    } catch {}
  };

  // Add custom checklist item
  const handleAddCheckItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheck.task.trim()) return;
    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CHECK_ITEM", item: newCheck }),
      });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
      setNewCheck({
        role: "CAMERA",
        category: "Pre-Flight Check",
        task: "",
        detail: "",
        isCritical: true,
      });
      setShowAddCheckModal(false);
      triggerToast("Added new pre-live check item!");
    } catch {}
  };

  // Screenshot Method 1: Upload from Phone / Device File
  const handleScreenshotFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressScreenshotFile(file);
    setNewQc((prev) => ({ ...prev, screenshotUrl: compressed }));
    triggerToast("📸 Screenshot attached! Click anywhere on the image to pinpoint the issue.");
  };

  // Screenshot Method 2: 1-Click Live Browser / Stream Screen Capture
  const handleCaptureLiveScreen = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        triggerToast("Use 'Upload Phone Screenshot' on mobile devices.");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      const maxW = 850;
      const ratio = Math.min(1, maxW / (video.videoWidth || 850));
      canvas.width = Math.round((video.videoWidth || 850) * ratio);
      canvas.height = Math.round((video.videoHeight || 480) * ratio);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setNewQc((prev) => ({ ...prev, screenshotUrl: dataUrl }));
        triggerToast("🖥️ Live stream frame captured!");
      }
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // User cancelled screen picker
    }
  };

  // Click on screenshot preview to place a red target marker (x%, y%)
  const handleScreenshotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setNewQc((prev) => ({ ...prev, markerPos: { x, y } }));
  };

  // Save New Quality Checker (QC) Log Entry
  const handleSaveQcLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQc.title.trim()) return;

    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_QC_LOG",
          log: {
            ...newQc,
            loggedBy: myIdentity.name,
          },
        }),
      });
      const data = await res.json();
      if (data.qcLogs) setQcLogs(data.qcLogs);
      setShowNewQcModal(false);
      setNewQc({
        serviceDate: new Date().toISOString().slice(0, 10),
        streamTimestamp: `Live ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        type: "ISSUE",
        severity: "MAJOR",
        platform: "INSTAGRAM",
        station: "CAMERA",
        title: "",
        description: "",
        actionToTake: "",
        assignedTo: "Kevin (Camera Lead)",
        timelineToSolve: "Before Saturday Rehearsal",
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6)
          .toISOString()
          .slice(0, 10),
        screenshotUrl: null,
        markerPos: null,
      });
      triggerToast("Quality Checker log & action timeline saved!");
    } catch {}
  };

  // Cycle QC Status (OPEN -> IN_PROGRESS -> RESOLVED)
  const handleCycleQcStatus = async (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "OPEN"
        ? "IN_PROGRESS"
        : currentStatus === "IN_PROGRESS"
        ? "RESOLVED"
        : "OPEN";

    setQcLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: nextStatus } : l))
    );
    triggerToast(`QC item marked as ${nextStatus.replace("_", " ")}`);

    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_QC_STATUS",
          id,
          status: nextStatus,
        }),
      });
    } catch {}
  };

  // Push QC Action Item directly to Timeline & Goals (/roadmap)
  const handlePushToRoadmap = async (id: string) => {
    setQcLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, pushedToRoadmap: true } : l))
    );
    triggerToast("🚀 Action item pushed to Timeline & Goals (/roadmap)!");
    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUSH_QC_TO_ROADMAP", id }),
      });
    } catch {}
  };

  // Station Progress Computations for Director Board
  const stationsMeta: {
    role: CrewRole;
    label: string;
    icon: any;
    color: string;
    border: string;
  }[] = [
    {
      role: "CAMERA",
      label: "Camera Crew",
      icon: Camera,
      color: "text-amber-400",
      border: "border-amber-500/30",
    },
    {
      role: "AUDIO",
      label: "Audio & Sound",
      icon: Mic,
      color: "text-sky-400",
      border: "border-sky-500/30",
    },
    {
      role: "MODERATOR",
      label: "Chat Moderator",
      icon: MessageSquare,
      color: "text-violet-400",
      border: "border-violet-500/30",
    },
    {
      role: "QC",
      label: "Quality Checker",
      icon: Eye,
      color: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    {
      role: "DIRECTOR",
      label: "Director",
      icon: Clapperboard,
      color: "text-rose-400",
      border: "border-rose-500/30",
    },
  ];

  const totalChecks = checklists.length;
  const completedChecks = checklists.filter((c) => c.checked).length;
  const overallReadinessPct =
    totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  const uncheckedCritical = checklists.filter(
    (c) => c.isCritical && !c.checked
  );

  const visibleChecklists = useMemo(() => {
    if (stationFilter === "ALL") return checklists;
    return checklists.filter((c) => c.role === stationFilter);
  }, [checklists, stationFilter]);

  const filteredQcLogs = useMemo(() => {
    return qcLogs.filter((l) => {
      if (qcFilter === "ISSUE") return l.type === "ISSUE";
      if (qcFilter === "IMPROVEMENT") return l.type === "IMPROVEMENT";
      if (qcFilter === "ACHIEVEMENT") return l.type === "ACHIEVEMENT";
      if (qcFilter === "OPEN") return l.status !== "RESOLVED";
      if (qcFilter === "YOUTUBE")
        return l.platform === "YOUTUBE" || l.platform === "BOTH";
      if (qcFilter === "INSTAGRAM")
        return l.platform === "INSTAGRAM" || l.platform === "BOTH";
      return true;
    });
  }, [qcLogs, qcFilter]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400/40 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Top Crew Identity & Mobile Station Switcher Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Smartphone className="w-3.5 h-3.5" />
                <span> Logged in: {myIdentity.name}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Station: {myIdentity.role}
              </span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold ml-1"
              >
                Switch Crew Login / Phone Role
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pre-Live Crew Readiness & Live Quality Checker (QC) Hub
            </h1>
            <p className="text-xs text-slate-400">
              Every team member (Camera, Audio, Moderator, Quality Checker, Director) logs in from their phone to check off pre-flight tasks, while QC records live YouTube/IG screenshots, issues, and improvements.
            </p>
          </div>

          {/* Primary Mode Switcher: Pre-Live Checklists vs Live QC Log */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveSection("PRE_LIVE_CHECK")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  activeSection === "PRE_LIVE_CHECK"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Pre-Live Checklists ({overallReadinessPct}%)</span>
              </button>

              <button
                onClick={() => setActiveSection("QC_WEEKLY_LOG")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  activeSection === "QC_WEEKLY_LOG"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Quality Checker (QC) Log ({qcLogs.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            SECTION 1: DIRECTOR MASTER BOARD & STATION PRE-LIVE CHECKLISTS
           =================================================================== */}
        {activeSection === "PRE_LIVE_CHECK" && (
          <div className="space-y-6">
            {/* Director Master Go-Live Clearance Banner */}
            <div
              className={`rounded-2xl p-5 border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
                directorSignOff.clearedToGoLive
                  ? "bg-gradient-to-r from-emerald-950/70 via-emerald-900/30 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                  : uncheckedCritical.length === 0
                  ? "bg-gradient-to-r from-indigo-950/60 to-slate-900 border-indigo-500/50"
                  : "bg-slate-900/90 border-amber-500/40"
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                      directorSignOff.clearedToGoLive
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {directorSignOff.clearedToGoLive
                      ? "🟢 CLEARED TO GO LIVE"
                      : `⏳ PRE-FLIGHT IN PROGRESS (${overallReadinessPct}% READY)`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {completedChecks} of {totalChecks} checks verified •{" "}
                    {uncheckedCritical.length === 0
                      ? "All critical checks passed!"
                      : `${uncheckedCritical.length} critical checks remaining`}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-bold text-white">
                  {directorSignOff.clearedToGoLive
                    ? `Final Go-Live Greenlight granted by ${directorSignOff.directorName} at ${directorSignOff.clearedAt}`
                    : directorSignOff.flashNotice}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setShowAddCheckModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Check Item</span>
                </button>

                <button
                  onClick={handleResetChecklists}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset for New Service</span>
                </button>

                <button
                  onClick={handleToggleGoLiveClearance}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition ${
                    directorSignOff.clearedToGoLive
                      ? "bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40"
                      : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {directorSignOff.clearedToGoLive
                      ? "Greenlight Active (Click to Standby)"
                      : "Director: Grant Go-Live Greenlight"}
                  </span>
                </button>
              </div>
            </div>

            {/* 5 Station Progress Overview Cards (Director View) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {stationsMeta.map((st) => {
                const Icon = st.icon;
                const stItems = checklists.filter((c) => c.role === st.role);
                const stDone = stItems.filter((c) => c.checked).length;
                const stPct =
                  stItems.length > 0
                    ? Math.round((stDone / stItems.length) * 100)
                    : 0;
                const activePerson = activeCrew.find((c) => c.role === st.role);
                const isSelected = stationFilter === st.role;

                return (
                  <div
                    key={st.role}
                    onClick={() =>
                      setStationFilter(
                        stationFilter === st.role ? "ALL" : st.role
                      )
                    }
                    className={`cursor-pointer rounded-2xl p-4 border transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500 shadow-lg"
                        : stPct === 100
                        ? "bg-emerald-950/15 border-emerald-500/40"
                        : "bg-slate-900/85 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Icon className={`w-4 h-4 ${st.color}`} />
                          <span>{st.label}</span>
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            stPct === 100
                              ? "text-emerald-400"
                              : "text-indigo-300"
                          }`}
                        >
                          {stPct}%
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1.5 truncate">
                        {activePerson ? (
                          <span className="text-emerald-300 font-medium">
                            ● {activePerson.name}
                          </span>
                        ) : (
                          <span>Waiting for login...</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>
                          {stDone}/{stItems.length} checks
                        </span>
                        <span>{stPct === 100 ? "READY ✓" : "In Progress"}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stPct === 100
                              ? "bg-emerald-500"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${stPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Station Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setStationFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    stationFilter === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  All Stations ({totalChecks})
                </button>
                {stationsMeta.map((st) => (
                  <button
                    key={st.role}
                    onClick={() => setStationFilter(st.role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      stationFilter === st.role
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {st.label} Only
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Tap any checklist item on your phone to sign off with your name & timestamp
              </span>
            </div>

            {/* Mobile-Friendly Station Checklists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {visibleChecklists.map((item) => {
                const stMeta =
                  stationsMeta.find((s) => s.role === item.role) ||
                  stationsMeta[0];
                const StIcon = stMeta.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`cursor-pointer rounded-2xl p-4 border transition flex items-start gap-3.5 select-none ${
                      item.checked
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : item.isCritical
                        ? "bg-slate-900/90 border-slate-700 hover:border-indigo-500/50"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Large Mobile Tap Checkbox */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition ${
                        item.checked
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                          : "bg-slate-800 border border-slate-600 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            <StIcon className={`w-3 h-3 ${stMeta.color}`} />
                            <span>{item.role}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {item.category}
                          </span>
                          {item.isCritical && !item.checked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              CRITICAL
                            </span>
                          )}
                        </div>

                        {item.checked && item.checkedBy && (
                          <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>
                              {item.checkedBy} • {item.checkedAt}
                            </span>
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm font-bold leading-snug ${
                          item.checked
                            ? "line-through text-slate-400"
                            : "text-white"
                        }`}
                      >
                        {item.task}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2: QUALITY CHECKER (QC) WEEKLY LOG, LIVE SCREENSHOTS & TIMELINE
           =================================================================== */}
        {activeSection === "QC_WEEKLY_LOG" && (
          <div className="space-y-6">
            {/* QC Summary KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>ISSUES REPORTED</span>
                  <Bug className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-1.5">
                  {qcLogs.filter((l) => l.type === "ISSUE").length}
                </div>
                <div className="text-[11px] text-rose-300 mt-1">
                  {
                    qcLogs.filter(
                      (l) => l.type === "ISSUE" && l.status !== "RESOLVED"
                    ).length
                  }{" "}
                  active pending resolution
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>IMPROVEMENTS LOGGED</span>
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-1.5">
                  {qcLogs.filter((l) => l.type === "IMPROVEMENT").length}
                </div>
                <div className="text-[11px] text-amber-300 mt-1">
                  Camera, Audio & Chat polish items
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>SERVICE WINS / ACHIEVEMENTS</span>
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-1.5">
                  {qcLogs.filter((l) => l.type === "ACHIEVEMENT").length}
                </div>
                <div className="text-[11px] text-emerald-300 mt-1">
                  Excellence moments recorded live
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>LIVE SCREENSHOT LOGGER</span>
                  <Camera className="w-4 h-4 text-indigo-400" />
                </div>
                <button
                  onClick={() => setShowNewQcModal(true)}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Log QC Issue / Screenshot</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: `All QC Logs (${qcLogs.length})` },
                  { id: "ISSUE", label: "🚨 Issues Only" },
                  { id: "IMPROVEMENT", label: "💡 Improvements" },
                  { id: "ACHIEVEMENT", label: "🏆 Achievements" },
                  { id: "OPEN", label: "⏳ Open Action Items" },
                  { id: "YOUTUBE", label: "▶️ YouTube" },
                  { id: "INSTAGRAM", label: "📸 Instagram" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setQcFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      qcFilter === tab.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowNewQcModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture YT/IG Screenshot & Log</span>
              </button>
            </div>

            {/* Weekly Quality Checker Cards */}
            <div className="space-y-4">
              {filteredQcLogs.map((log) => {
                const isIssue = log.type === "ISSUE";
                const isWin = log.type === "ACHIEVEMENT";

                return (
                  <div
                    key={log.id}
                    className={`rounded-2xl p-5 border transition ${
                      isWin
                        ? "bg-emerald-950/15 border-emerald-500/40"
                        : isIssue && log.status !== "RESOLVED"
                        ? "bg-slate-900/90 border-rose-500/40"
                        : "bg-slate-900/85 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Left Content Column */}
                      <div className="flex-1 space-y-3">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${
                                isIssue
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : isWin
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {isIssue
                                ? "🚨 ISSUE"
                                : isWin
                                ? "🏆 ACHIEVEMENT"
                                : "💡 IMPROVEMENT"}
                            </span>

                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200">
                              {log.platform}
                            </span>

                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/40">
                              {log.station} STATION
                            </span>

                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                {log.serviceDate} • {log.streamTimestamp}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleCycleQcStatus(log.id, log.status)
                              }
                              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                                log.status === "RESOLVED"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : log.status === "IN_PROGRESS"
                                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              }`}
                            >
                              {log.status === "RESOLVED"
                                ? "✓ RESOLVED"
                                : log.status === "IN_PROGRESS"
                                ? "● IN PROGRESS"
                                : "○ OPEN ACTION"}
                            </button>

                            {!log.pushedToRoadmap ? (
                              <button
                                onClick={() => handlePushToRoadmap(log.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-semibold transition"
                                title="Send this item to the Timeline & Goals tab"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Push to Timeline</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-indigo-400 font-semibold">
                                ✓ In Roadmap
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Observation */}
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {log.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {log.description}
                          </p>
                        </div>

                        {/* Action Plan & Resolution Timeline Box */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 text-xs">
                          <div className="md:col-span-2">
                            <div className="text-[10px] font-bold uppercase text-emerald-400">
                              Action to Take / Fix Plan:
                            </div>
                            <div className="text-slate-200 font-medium mt-0.5">
                              {log.actionToTake || "Monitor during next service"}
                            </div>
                          </div>

                          <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3">
                            <div>
                              <span className="text-slate-400">Owner: </span>
                              <strong className="text-white">
                                {log.assignedTo}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Timeline: </span>
                              <strong className="text-amber-300">
                                {log.timelineToSolve}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Target Date: </span>
                              <strong className="text-indigo-300">
                                {log.targetDate}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Live Screenshot Thumbnail (if attached) */}
                      {log.screenshotUrl && (
                        <div
                          onClick={() => setPreviewImageLog(log)}
                          className="lg:w-64 shrink-0 cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-black self-start"
                        >
                          <img
                            src={log.screenshotUrl}
                            alt={log.title}
                            className="w-full h-40 object-cover group-hover:opacity-90 transition"
                          />
                          {log.markerPos && (
                            <div
                              style={{
                                left: `${log.markerPos.x}%`,
                                top: `${log.markerPos.y}%`,
                              }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse flex items-center justify-center"
                            >
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                          )}
                          <div className="bg-slate-950/90 px-2.5 py-1.5 text-[10px] text-slate-300 flex items-center justify-between">
                            <span>📸 Live {log.platform} Screenshot</span>
                            <span className="text-indigo-400 font-bold">
                              Click to Enlarge
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Switch Crew Member Mobile Login */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Crew Member Mobile / Station Sign-In
                </h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrewLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kevin (Cam 1) or Daniel (QC)"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Select Your Station Role *
                </label>
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as CrewRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="DIRECTOR">
                    🎬 Broadcast Director (Master Overview)
                  </option>
                  <option value="CAMERA">📹 Camera Operator</option>
                  <option value="AUDIO">🎚️ Audio & Sound Engineer</option>
                  <option value="MODERATOR">💬 Online Chat Moderator</option>
                  <option value="QC">
                    🔍 Quality Checker (Live Stream Inspector)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Device
                </label>
                <input
                  type="text"
                  placeholder="e.g., iPhone / Android / iPad"
                  value={loginDevice}
                  onChange={(e) => setLoginDevice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Sign In to Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Quality Checker Issue / Improvement / Achievement with Live Screenshot */}
      {showNewQcModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Quality Checker (QC): Log Issue, Improvement or Win + Live Screenshot
                </h3>
              </div>
              <button
                onClick={() => setShowNewQcModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQcLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Log Type
                  </label>
                  <select
                    value={newQc.type}
                    onChange={(e) =>
                      setNewQc({ ...newQc, type: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-semibold"
                  >
                    <option value="ISSUE">🚨 Issue / Glitch</option>
                    <option value="IMPROVEMENT">💡 Improvement</option>
                    <option value="ACHIEVEMENT">🏆 Achievement / Win</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Platform
                  </label>
                  <select
                    value={newQc.platform}
                    onChange={(e) =>
                      setNewQc({ ...newQc, platform: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-semibold"
                  >
                    <option value="INSTAGRAM">📸 Instagram Live</option>
                    <option value="YOUTUBE">▶️ YouTube Live</option>
                    <option value="BOTH">Both Platforms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Station Affected
                  </label>
                  <select
                    value={newQc.station}
                    onChange={(e) =>
                      setNewQc({ ...newQc, station: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-semibold"
                  >
                    <option value="CAMERA">Camera</option>
                    <option value="AUDIO">Audio</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="LIGHTING">Lighting</option>
                    <option value="NETWORK">Network / Stream</option>
                    <option value="DIRECTOR">Director</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Stream Timestamp
                  </label>
                  <input
                    type="text"
                    value={newQc.streamTimestamp}
                    onChange={(e) =>
                      setNewQc({ ...newQc, streamTimestamp: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              {/* Live Screenshot Capture & Upload Box */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>
                        Attach Live YouTube / Instagram Screenshot (Optional)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upload a phone screenshot, capture a live browser window, or press{" "}
                      <kbd className="bg-slate-800 px-1.5 py-0.5 rounded">
                        Ctrl+V
                      </kbd>{" "}
                      to paste from clipboard.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Screenshot</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCaptureLiveScreen}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
                    >
                      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Capture Live Stream Window</span>
                    </button>
                  </div>
                </div>

                {newQc.screenshotUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-amber-300">
                      <span className="flex items-center gap-1">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>
                          Tap/click anywhere on the screenshot below to place a red issue marker!
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewQc((prev) => ({
                            ...prev,
                            screenshotUrl: null,
                            markerPos: null,
                          }))
                        }
                        className="text-rose-400 hover:underline"
                      >
                        Remove Screenshot
                      </button>
                    </div>

                    <div
                      onClick={handleScreenshotClick}
                      className="relative cursor-crosshair rounded-xl overflow-hidden border border-slate-700 bg-black max-h-60 flex items-center justify-center"
                    >
                      <img
                        src={newQc.screenshotUrl}
                        alt="QC Screenshot Preview"
                        className="max-h-60 w-auto object-contain"
                      />
                      {newQc.markerPos && (
                        <div
                          style={{
                            left: `${newQc.markerPos.x}%`,
                            top: `${newQc.markerPos.y}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Observation / Issue Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Instagram Live vertical frame cut off worship leader on stage left"
                  value={newQc.title}
                  onChange={(e) =>
                    setNewQc({ ...newQc, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Detailed Observation
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what happened on the stream and how it affected viewers..."
                  value={newQc.description}
                  onChange={(e) =>
                    setNewQc({ ...newQc, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-emerald-300 mb-1 font-semibold">
                  Action to Take (How to Solve It) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Reposition Cam 2 tripod 1 meter back and mark stage floor tape"
                  value={newQc.actionToTake}
                  onChange={(e) =>
                    setNewQc({ ...newQc, actionToTake: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={newQc.assignedTo}
                    onChange={(e) =>
                      setNewQc({ ...newQc, assignedTo: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 mb-1 font-medium">
                    Timeline to Solve
                  </label>
                  <select
                    value={newQc.timelineToSolve}
                    onChange={(e) =>
                      setNewQc({ ...newQc, timelineToSolve: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Immediate (Fixed Live)">
                      Immediate (Fixed Live)
                    </option>
                    <option value="Before Wednesday Mid-Week">
                      Before Wednesday Mid-Week
                    </option>
                    <option value="Before Saturday Rehearsal">
                      Before Saturday Rehearsal
                    </option>
                    <option value="By Next Sunday Pre-Check">
                      By Next Sunday Pre-Check
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Target Resolution Date
                  </label>
                  <input
                    type="date"
                    value={newQc.targetDate}
                    onChange={(e) =>
                      setNewQc({ ...newQc, targetDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewQcModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save QC Log & Action Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Custom Pre-Live Check Item */}
      {showAddCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Add Pre-Live Station Checklist Item
              </h3>
              <button
                onClick={() => setShowAddCheckModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCheckItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Station Role
                  </label>
                  <select
                    value={newCheck.role}
                    onChange={(e) =>
                      setNewCheck({
                        ...newCheck,
                        role: e.target.value as CrewRole,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CAMERA">Camera</option>
                    <option value="AUDIO">Audio</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="QC">Quality Checker</option>
                    <option value="DIRECTOR">Director</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCheck.category}
                    onChange={(e) =>
                      setNewCheck({ ...newCheck, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Checklist Task *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Check wireless tally light battery on Cam 2"
                  value={newCheck.task}
                  onChange={(e) =>
                    setNewCheck({ ...newCheck, task: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Verification Detail
                </label>
                <textarea
                  rows={2}
                  value={newCheck.detail}
                  onChange={(e) =>
                    setNewCheck({ ...newCheck, detail: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCheckModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Add Check Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Full-Size Screenshot Lightbox */}
      {previewImageLog && (
        <div
          onClick={() => setPreviewImageLog(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {previewImageLog.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {previewImageLog.platform} • {previewImageLog.streamTimestamp}{" "}
                  • Action: {previewImageLog.actionToTake}
                </p>
              </div>
              <button
                onClick={() => setPreviewImageLog(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewImageLog.screenshotUrl}
                alt={previewImageLog.title}
                className="max-h-[70vh] w-auto object-contain"
              />
              {previewImageLog.markerPos && (
                <div
                  style={{
                    left: `${previewImageLog.markerPos.x}%`,
                    top: `${previewImageLog.markerPos.y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse flex items-center justify-center"
                >
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Smartphone,
  Plus,
  RotateCcw,
  Upload,
  Monitor,
  Clock,
  ArrowUpRight,
  Trophy,
  Lightbulb,
  Bug,
  X,
  Check,
  Zap,
  Crosshair,
  Printer,
  Download,
  FileSpreadsheet,
  BellRing,
} from "lucide-react";

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";

const LOCAL_CREW_USER_KEY = "church_live_hub_crew_identity_v1";

// 1-Tap Presets for Quality Checker (Zero typing required during live!)
const QUICK_QC_CHIPS: {
  label: string;
  type: "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT";
  station: "CAMERA" | "AUDIO" | "MODERATOR" | "LIGHTING" | "NETWORK";
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WIN";
}[] = [
  { label: "📱 IG 9:16 Crop Cut Off", type: "ISSUE", station: "CAMERA", severity: "MAJOR" },
  { label: "📷 Cam Framing / Headroom", type: "ISSUE", station: "CAMERA", severity: "MAJOR" },
  { label: "🔍 Camera Soft / Out of Focus", type: "ISSUE", station: "CAMERA", severity: "CRITICAL" },
  { label: "💡 Stage Lighting Too Dark", type: "IMPROVEMENT", station: "LIGHTING", severity: "MINOR" },
  { label: "🔇 Pastor Mic Too Low", type: "ISSUE", station: "AUDIO", severity: "CRITICAL" },
  { label: "🔊 Audio Clipping / Echo", type: "ISSUE", station: "AUDIO", severity: "CRITICAL" },
  { label: "🎹 Boost Altar Pad +3dB", type: "IMPROVEMENT", station: "AUDIO", severity: "MINOR" },
  { label: "⏱️ Audio-Video Sync Delay", type: "ISSUE", station: "AUDIO", severity: "MAJOR" },
  { label: "📡 Stream Frame Drop / Lag", type: "ISSUE", station: "NETWORK", severity: "CRITICAL" },
  { label: "💬 Late Chat Scripture Cue", type: "IMPROVEMENT", station: "MODERATOR", severity: "MINOR" },
  { label: "🏆 Great Multi-Cam Switch!", type: "ACHIEVEMENT", station: "CAMERA", severity: "WIN" },
  { label: "🏆 Fast Prophetic Chat Sync!", type: "ACHIEVEMENT", station: "MODERATOR", severity: "WIN" },
];

// 1-Tap Director Action Presets
const DIRECTOR_QUICK_ACTIONS = [
  "Fix Immediately on Live",
  "Mark Stage Floor / 9:16 Grid",
  "Adjust Soundboard Bus +3dB",
  "Drill in Saturday Rehearsal",
  "Check Cable / Encoder Setup",
];

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
  const [myIdentity, setMyIdentity] = useState<{
    name: string;
    role: CrewRole;
    device: string;
  }>({
    name: "Andrew",
    role: "DIRECTOR",
    device: "Director Console",
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState("Andrew");
  const [loginRole, setLoginRole] = useState<CrewRole>("DIRECTOR");

  // 3 Fast Modes: PRE_LIVE | QC_PAD | MEETING_REPORT
  const [activeTab, setActiveTab] = useState<
    "PRE_LIVE" | "QC_PAD" | "MEETING_REPORT"
  >("PRE_LIVE");
  const [stationFilter, setStationFilter] = useState<CrewRole | "ALL">("ALL");

  const [checklists, setChecklists] = useState<any[]>([]);
  const [activeCrew, setActiveCrew] = useState<any[]>([]);
  const [qcLogs, setQcLogs] = useState<any[]>([]);
  const [directorSignOff, setDirectorSignOff] = useState<{
    clearedToGoLive: boolean;
    directorName: string;
    clearedAt: string | null;
  }>({
    clearedToGoLive: false,
    directorName: "Andrew",
    clearedAt: null,
  });

  // Fast QC Pad State (Minimal clicks for QC during live)
  const [qcPlatform, setQcPlatform] = useState<"INSTAGRAM" | "YOUTUBE" | "BOTH">(
    "INSTAGRAM"
  );
  const [qcType, setQcType] = useState<"ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT">(
    "ISSUE"
  );
  const [qcStation, setQcStation] = useState<
    "CAMERA" | "AUDIO" | "MODERATOR" | "LIGHTING" | "NETWORK"
  >("CAMERA");
  const [qcTitle, setQcTitle] = useState("");
  const [qcNote, setQcNote] = useState("");
  const [qcScreenshot, setQcScreenshot] = useState<string | null>(null);
  const [qcMarker, setQcMarker] = useState<{ x: number; y: number } | null>(
    null
  );

  // Director Decision Drafts per QC Log ID
  const [directorDrafts, setDirectorDrafts] = useState<
    Record<
      string,
      { actionToTake: string; assignedTo: string; timelineToSolve: string }
    >
  >({});

  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [newCheckTask, setNewCheckTask] = useState("");
  const [newCheckRole, setNewCheckRole] = useState<CrewRole>("CAMERA");
  const [previewImageLog, setPreviewImageLog] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const fetchCrewQcData = async () => {
    try {
      const res = await fetch("/api/crew-qc", { cache: "no-store" });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
      if (data.activeCrew) setActiveCrew(data.activeCrew);
      if (data.qcLogs) {
        setQcLogs(data.qcLogs);
        setDirectorDrafts((prev) => {
          const next = { ...prev };
          for (const l of data.qcLogs) {
            if (!next[l.id]) {
              next[l.id] = {
                actionToTake: l.actionToTake || "",
                assignedTo:
                  l.assignedTo && l.assignedTo !== "Pending Director"
                    ? l.assignedTo
                    : l.station === "CAMERA"
                    ? "Kevin (Cam)"
                    : l.station === "AUDIO"
                    ? "Jason (Audio)"
                    : l.station === "MODERATOR"
                    ? "Hannah (Mod)"
                    : "Tech Lead",
                timelineToSolve:
                  l.timelineToSolve && l.timelineToSolve !== "Wait for Director"
                    ? l.timelineToSolve
                    : "Before Saturday Rehearsal",
              };
            }
          }
          return next;
        });
      }
      if (data.directorSignOff) setDirectorSignOff(data.directorSignOff);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CREW_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMyIdentity(parsed);
        setLoginName(parsed.name);
        setLoginRole(parsed.role);
      }
    } catch {}
    fetchCrewQcData();
    const interval = setInterval(fetchCrewQcData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Clipboard Paste Screenshot Support on QC Pad
  useEffect(() => {
    if (activeTab !== "QC_PAD") return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const dataUrl = await compressScreenshotFile(blob);
            setQcScreenshot(dataUrl);
            triggerToast("📋 Screenshot pasted!");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab]);

  // Switch Crew Role Login
  const handleCrewLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    const identity = {
      name: loginName.trim(),
      role: loginRole,
      device: "Mobile",
    };
    setMyIdentity(identity);
    try {
      localStorage.setItem(LOCAL_CREW_USER_KEY, JSON.stringify(identity));
    } catch {}

    if (loginRole === "QC") {
      setStationFilter("QC");
    } else if (loginRole !== "DIRECTOR") {
      setStationFilter(loginRole);
    } else {
      setStationFilter("ALL");
    }
    setShowLoginModal(false);
    triggerToast(`Logged in: ${identity.name} (${identity.role})`);

    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREW_LOGIN",
          name: identity.name,
          role: identity.role,
          device: "Phone",
        }),
      });
      fetchCrewQcData();
    } catch {}
  };

  // Toggle Single Check Item
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

  // 1-Tap Check Entire Station
  const handleCheckAllStation = async (role: CrewRole | "ALL") => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setChecklists((prev) =>
      prev.map((item) => {
        if (role !== "ALL" && item.role !== role) return item;
        return {
          ...item,
          checked: true,
          checkedBy: item.checkedBy || myIdentity.name,
          checkedAt: item.checkedAt || nowTime,
        };
      })
    );
    triggerToast(`✓ ${role} marked 100% Ready!`);

    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECK_ALL_STATION",
          role,
          memberName: myIdentity.name,
        }),
      });
      const data = await res.json();
      if (data.checklists) setChecklists(data.checklists);
    } catch {}
  };

  // Reset All Checklists
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
      triggerToast("Checklists reset for new service.");
    } catch {}
  };

  // Director Greenlight Toggle
  const handleToggleGoLive = async () => {
    const nextState = !directorSignOff.clearedToGoLive;
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setDirectorSignOff({
      clearedToGoLive: nextState,
      directorName: myIdentity.name,
      clearedAt: nextState ? nowTime : null,
    });
    triggerToast(
      nextState ? "🟢 LIVE ON AIR CONFIRMED!" : "Returned to Pre-Live Mode"
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

  // QC 1-Tap Chip Handler (Fills or Immediately Queues!)
  const handleSelectQcChip = (chip: (typeof QUICK_QC_CHIPS)[0]) => {
    setQcType(chip.type);
    setQcStation(chip.station);
    setQcTitle(chip.label);
  };

  // Submit QC Item to Director Queue (Fast — No Action/Owner required from QC!)
  const handleQueueForDirector = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qcTitle.trim()) {
      triggerToast("Tap a quick tag or enter a short title first.");
      return;
    }

    const nowStamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_QC_LOG",
          log: {
            serviceDate: new Date().toISOString().slice(0, 10),
            streamTimestamp: nowStamp,
            type: qcType,
            severity:
              qcType === "ACHIEVEMENT"
                ? "WIN"
                : qcType === "IMPROVEMENT"
                ? "MINOR"
                : "MAJOR",
            platform: qcPlatform,
            station: qcStation,
            title: qcTitle.trim(),
            description: qcNote.trim(),
            screenshotUrl: qcScreenshot,
            markerPos: qcMarker,
            loggedBy: myIdentity.name,
          },
        }),
      });
      const data = await res.json();
      if (data.qcLogs) setQcLogs(data.qcLogs);

      setQcTitle("");
      setQcNote("");
      setQcScreenshot(null);
      setQcMarker(null);
      triggerToast("⚡ Sent to Director Queue!");
    } catch {}
  };

  // Director Saves Action Plan, Owner & Timeline on a Queued QC Item
  const handleDirectorSaveDecision = async (
    logId: string,
    nextStatus: "IN_PROGRESS" | "RESOLVED" = "IN_PROGRESS"
  ) => {
    const draft = directorDrafts[logId] || {
      actionToTake: "Review with crew",
      assignedTo: "Tech Lead",
      timelineToSolve: "Before Saturday Rehearsal",
    };

    setQcLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? {
              ...l,
              actionToTake: draft.actionToTake,
              assignedTo: draft.assignedTo,
              timelineToSolve: draft.timelineToSolve,
              status: nextStatus,
            }
          : l
      )
    );
    triggerToast(
      nextStatus === "RESOLVED"
        ? "✓ Marked Resolved!"
        : "✓ Director Action Plan Assigned!"
    );

    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DIRECTOR_DECIDE_QC",
          id: logId,
          actionToTake: draft.actionToTake,
          assignedTo: draft.assignedTo,
          timelineToSolve: draft.timelineToSolve,
          status: nextStatus,
        }),
      });
    } catch {}
  };

  // Push to Roadmap
  const handlePushToRoadmap = async (id: string) => {
    setQcLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, pushedToRoadmap: true } : l))
    );
    triggerToast("🚀 Added to Timeline & Goals!");
    try {
      await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUSH_QC_TO_ROADMAP", id }),
      });
    } catch {}
  };

  // Screenshot Upload / Screen Capture
  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressScreenshotFile(file);
    setQcScreenshot(dataUrl);
    triggerToast("📸 Screenshot ready! Tap image to mark red spot.");
  };

  const handleCaptureScreen = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        screenshotInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 850 / (video.videoWidth || 850));
      canvas.width = Math.round((video.videoWidth || 850) * ratio);
      canvas.height = Math.round((video.videoHeight || 480) * ratio);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setQcScreenshot(canvas.toDataURL("image/jpeg", 0.82));
        triggerToast("🖥️ Stream frame captured!");
      }
      stream.getTracks().forEach((t) => t.stop());
    } catch {}
  };

  // Export End-of-Live Meeting Report as CSV
  const handleExportMeetingCsv = () => {
    const headers = [
      "Time",
      "Type",
      "Platform",
      "Station",
      "QC Observation",
      "Director Action Plan",
      "Assigned Owner",
      "Timeline",
      "Status",
    ];
    const rows = qcLogs.map((l) => [
      l.streamTimestamp,
      l.type,
      l.platform,
      l.station,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.actionToTake || "Pending Director").replace(/"/g, '""')}"`,
      `"${l.assignedTo || ""}"`,
      `"${l.timelineToSolve || ""}"`,
      l.status,
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `director-qc-meeting-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("📥 Meeting CSV downloaded!");
  };

  // Readiness Math
  const totalChecks = checklists.length;
  const completedChecks = checklists.filter((c) => c.checked).length;
  const overallPct =
    totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
  const is100PercentReady = totalChecks > 0 && completedChecks === totalChecks;

  const waitingDirectorCount = qcLogs.filter(
    (l) => l.status === "WAITING_DIRECTOR"
  ).length;

  const stationsMeta: {
    role: CrewRole;
    label: string;
    icon: any;
    color: string;
  }[] = [
    { role: "CAMERA", label: "Camera", icon: Camera, color: "text-amber-400" },
    { role: "AUDIO", label: "Audio", icon: Mic, color: "text-sky-400" },
    {
      role: "MODERATOR",
      label: "Moderator",
      icon: MessageSquare,
      color: "text-violet-400",
    },
    { role: "QC", label: "QC", icon: Eye, color: "text-emerald-400" },
    {
      role: "DIRECTOR",
      label: "Director",
      icon: Clapperboard,
      color: "text-rose-400",
    },
  ];

  const visibleChecklists = useMemo(() => {
    if (stationFilter === "ALL") return checklists;
    return checklists.filter((c) => c.role === stationFilter);
  }, [checklists, stationFilter]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400/40 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-4 space-y-4">
        {/* COMPACT TOP BAR: Role Badge + 3 Fast Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {myIdentity.name} ({myIdentity.role})
              </span>
              <span className="text-[10px] underline ml-1 text-indigo-400">
                Switch Role
              </span>
            </button>

            <span className="text-sm font-extrabold text-white tracking-tight">
              Crew Check, Fast QC & Director Meeting Hub
            </span>
          </div>

          {/* 3 Primary Fast Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("PRE_LIVE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === "PRE_LIVE"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1. Pre-Live Check ({overallPct}%)</span>
            </button>

            <button
              onClick={() => setActiveTab("QC_PAD")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === "QC_PAD"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                2. Fast QC & Director Queue
                {waitingDirectorCount > 0
                  ? ` (${waitingDirectorCount} Waiting)`
                  : ""}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("MEETING_REPORT")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === "MEETING_REPORT"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>3. End-of-Live Meeting Report</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            TAB 1: FAST PRE-LIVE CHECK & 100% READY ALERT
           =================================================================== */}
        {activeTab === "PRE_LIVE" && (
          <div className="space-y-4">
            {/* AUTOMATIC 100% READY ALERT BANNER */}
            {is100PercentReady ? (
              <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/20 border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center shrink-0">
                    <BellRing className="w-6 h-6 text-slate-950" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider">
                      100% ALL STATIONS VERIFIED ({completedChecks}/{totalChecks})
                    </div>
                    <div className="text-lg sm:text-xl font-black tracking-tight">
                      🟢 WE ARE READY TO GO LIVE!
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleResetChecklists}
                    className="px-3 py-2 rounded-xl bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 text-xs font-extrabold transition"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={handleToggleGoLive}
                    className="px-5 py-2.5 rounded-xl bg-slate-950 text-emerald-400 hover:bg-slate-900 text-xs font-black shadow-lg transition"
                  >
                    {directorSignOff.clearedToGoLive
                      ? `✓ LIVE ON AIR (${directorSignOff.clearedAt})`
                      : "DIRECTOR: CONFIRM ON AIR"}
                  </button>
                </div>
              </div>
            ) : (
              /* IN-PROGRESS BANNER (< 100%) */
              <div className="rounded-2xl p-4 bg-slate-900/90 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-amber-400">
                    {overallPct}%
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      ⏳ Pre-Live Check: {completedChecks}/{totalChecks} Verified
                      ({totalChecks - completedChecks} Remaining)
                    </div>
                    <div className="text-xs text-slate-400">
                      Tap your station below to complete checks
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCheckAllStation("ALL")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                  >
                    ✓ Check All 100%
                  </button>
                  <button
                    onClick={handleResetChecklists}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* 5 Compact Station Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {stationsMeta.map((st) => {
                const Icon = st.icon;
                const items = checklists.filter((c) => c.role === st.role);
                const done = items.filter((c) => c.checked).length;
                const pct =
                  items.length > 0
                    ? Math.round((done / items.length) * 100)
                    : 0;
                const crew = activeCrew.find((c) => c.role === st.role);
                const isSelected = stationFilter === st.role;

                return (
                  <div
                    key={st.role}
                    onClick={() =>
                      setStationFilter(
                        stationFilter === st.role ? "ALL" : st.role
                      )
                    }
                    className={`cursor-pointer rounded-xl p-3 border transition ${
                      isSelected
                        ? "bg-indigo-950/50 border-indigo-500"
                        : pct === 100
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${st.color}`} />
                        {st.label}
                      </span>
                      <span
                        className={`text-xs font-black ${
                          pct === 100 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full my-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === 100 ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate">
                        {crew ? `● ${crew.name}` : "No login"}
                      </span>
                      <span>
                        {done}/{items.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter & Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setStationFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    stationFilter === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  All ({totalChecks})
                </button>
                {stationsMeta.map((st) => (
                  <button
                    key={st.role}
                    onClick={() => setStationFilter(st.role)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      stationFilter === st.role
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {stationFilter !== "ALL" && (
                  <button
                    onClick={() => handleCheckAllStation(stationFilter)}
                    className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold"
                  >
                    ✓ Check All {stationFilter}
                  </button>
                )}
                <button
                  onClick={() => setShowAddCheckModal(true)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  + Add Check
                </button>
              </div>
            </div>

            {/* ULTRA-CLEAN 1-LINE TAP TILES (Zero Clutter) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {visibleChecklists.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleCheck(item.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition flex items-center justify-between gap-3 select-none ${
                    item.checked
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-slate-900 border-slate-700 hover:border-indigo-500"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition ${
                        item.checked
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 border border-slate-600 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold truncate ${
                          item.checked
                            ? "text-slate-300 line-through"
                            : "text-white"
                        }`}
                      >
                        {item.task}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.role} • {item.detail}
                      </div>
                    </div>
                  </div>

                  {item.checked && item.checkedBy && (
                    <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                      ✓ {item.checkedBy}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: FAST 1-TAP QC PAD & DIRECTOR DECISION QUEUE
           =================================================================== */}
        {activeTab === "QC_PAD" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT (5 Cols): QC 1-TAP RAPID LOGGER (No Action/Owner typing needed!) */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400">
                    STEP 1 • FOR QUALITY CHECKER (QC)
                  </span>
                  <h2 className="text-sm font-bold text-white">
                    Fast 1-Tap Live Issue & Screenshot Pad
                  </h2>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                  Queues for Director
                </span>
              </div>

              {/* 1. Platform Toggle */}
              <div className="grid grid-cols-3 gap-2">
                {(["INSTAGRAM", "YOUTUBE", "BOTH"] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setQcPlatform(plat)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      qcPlatform === plat
                        ? plat === "INSTAGRAM"
                          ? "bg-pink-600 text-white border-pink-400"
                          : plat === "YOUTUBE"
                          ? "bg-red-600 text-white border-red-400"
                          : "bg-indigo-600 text-white border-indigo-400"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {plat === "INSTAGRAM"
                      ? "📸 IG Live"
                      : plat === "YOUTUBE"
                      ? "▶️ YT Live"
                      : "🌐 Both"}
                  </button>
                ))}
              </div>

              {/* 2. Instant 1-Tap Issue / Win Chips */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                  Tap Issue or Achievement (Auto-Fills):
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_QC_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSelectQcChip(chip)}
                      className={`text-left px-2.5 py-2 rounded-xl text-[11px] font-bold border transition truncate ${
                        qcTitle === chip.label
                          ? "bg-indigo-600 text-white border-indigo-400"
                          : "bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Short Title & Optional Note */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={qcType}
                    onChange={(e) => setQcType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
                  >
                    <option value="ISSUE">🚨 Issue</option>
                    <option value="IMPROVEMENT">💡 Improve</option>
                    <option value="ACHIEVEMENT">🏆 Win</option>
                  </select>
                  <select
                    value={qcStation}
                    onChange={(e) => setQcStation(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
                  >
                    <option value="CAMERA">Camera</option>
                    <option value="AUDIO">Audio</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="LIGHTING">Lighting</option>
                    <option value="NETWORK">Network</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Or type short observation..."
                    value={qcTitle}
                    onChange={(e) => setQcTitle(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* 4. Fast Screenshot Attach / Capture */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300">
                    📸 Screenshot (Upload, Capture or Ctrl+V)
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
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureScreen}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Monitor className="w-3 h-3" /> Grab Screen
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
                    className="relative cursor-crosshair rounded-lg overflow-hidden border border-slate-700 bg-black max-h-40 flex items-center justify-center"
                  >
                    <img
                      src={qcScreenshot}
                      alt="Preview"
                      className="max-h-40 w-auto object-contain"
                    />
                    {qcMarker && (
                      <div
                        style={{
                          left: `${qcMarker.x}%`,
                          top: `${qcMarker.y}%`,
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* 5. 1-Click Send to Director Queue */}
              <button
                type="button"
                onClick={() => handleQueueForDirector()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                <Zap className="w-4 h-4" />
                <span>+ SEND TO DIRECTOR QUEUE</span>
              </button>
            </div>

            {/* RIGHT (7 Cols): DIRECTOR DECISION QUEUE */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-amber-400">
                    STEP 2 • FOR BROADCAST DIRECTOR
                  </span>
                  <h2 className="text-sm font-bold text-white">
                    Director Decision Queue ({waitingDirectorCount} Waiting
                    for Director Update)
                  </h2>
                </div>

                <button
                  onClick={() => setActiveTab("MEETING_REPORT")}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold"
                >
                  Open Full Meeting Report →
                </button>
              </div>

              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {qcLogs.map((log) => {
                  const isWaiting = log.status === "WAITING_DIRECTOR";
                  const draft = directorDrafts[log.id] || {
                    actionToTake: log.actionToTake || "",
                    assignedTo: log.assignedTo || "Kevin (Cam)",
                    timelineToSolve:
                      log.timelineToSolve || "Before Saturday Rehearsal",
                  };

                  return (
                    <div
                      key={log.id}
                      className={`rounded-2xl p-4 border transition space-y-3 ${
                        isWaiting
                          ? "bg-slate-900 border-amber-500/50 shadow-lg"
                          : log.status === "RESOLVED"
                          ? "bg-slate-900/60 border-emerald-500/30"
                          : "bg-slate-900/80 border-indigo-500/40"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              log.type === "ISSUE"
                                ? "bg-rose-500/20 text-rose-300"
                                : log.type === "ACHIEVEMENT"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {log.type}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200">
                            {log.platform} • {log.station}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {log.streamTimestamp}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isWaiting
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                              : log.status === "RESOLVED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          }`}
                        >
                          {isWaiting
                            ? "⏳ WAITING FOR DIRECTOR"
                            : log.status === "RESOLVED"
                            ? "✓ RESOLVED"
                            : "● ACTION ASSIGNED"}
                        </span>
                      </div>

                      {/* QC Observation & Screenshot Row */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {log.title}
                          </div>
                          {log.description && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {log.description}
                            </div>
                          )}
                        </div>

                        {log.screenshotUrl && (
                          <div
                            onClick={() => setPreviewImageLog(log)}
                            className="w-28 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer relative bg-black"
                          >
                            <img
                              src={log.screenshotUrl}
                              alt="QC"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center text-indigo-300 font-bold">
                              View Screenshot
                            </span>
                          </div>
                        )}
                      </div>

                      {/* DIRECTOR DECISION CONTROLS (Fast 1-Tap Chips + Assign) */}
                      {log.type !== "ACHIEVEMENT" && (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-amber-400 mr-1">
                              Director Quick Action:
                            </span>
                            {DIRECTOR_QUICK_ACTIONS.map((act) => (
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
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] text-slate-300 hover:text-white transition"
                              >
                                {act}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              placeholder="Director: Action to take..."
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
                              className="sm:col-span-5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                              className="sm:col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                            >
                              <option value="Kevin (Cam)">Kevin (Cam)</option>
                              <option value="Jason (Audio)">Jason (Audio)</option>
                              <option value="Hannah (Mod)">Hannah (Mod)</option>
                              <option value="Daniel (QC)">Daniel (QC)</option>
                              <option value="Andrew (Director)">
                                Andrew (Director)
                              </option>
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
                              className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-300"
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
                              className="sm:col-span-2 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                            >
                              {isWaiting
                                ? "Assign"
                                : log.status === "IN_PROGRESS"
                                ? "✓ Resolve"
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
        )}

        {/* ===================================================================
            TAB 3: END-OF-LIVE QC & DIRECTOR MEETING REPORT
           =================================================================== */}
        {activeTab === "MEETING_REPORT" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-extrabold uppercase text-amber-400">
                  POST-SERVICE DEBRIEF & ACTION SHEET
                </div>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Director & Quality Checker (QC) Meeting Report —{" "}
                  {new Date().toLocaleDateString()}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-Flight Readiness: {overallPct}% ({completedChecks}/
                  {totalChecks} Checked) • Total QC Items: {qcLogs.length} (
                  {qcLogs.filter((l) => l.type === "ISSUE").length} Issues,{" "}
                  {qcLogs.filter((l) => l.type === "IMPROVEMENT").length}{" "}
                  Improvements,{" "}
                  {qcLogs.filter((l) => l.type === "ACHIEVEMENT").length} Wins)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportMeetingCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Meeting Report</span>
                </button>
              </div>
            </div>

            {/* Station Sign-Off Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stationsMeta.map((st) => {
                const items = checklists.filter((c) => c.role === st.role);
                const done = items.filter((c) => c.checked).length;
                const crew = activeCrew.find((c) => c.role === st.role);
                return (
                  <div
                    key={st.role}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs"
                  >
                    <div className="font-bold text-white">{st.label}</div>
                    <div className="text-emerald-400 font-semibold mt-0.5">
                      {done}/{items.length} Checked
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Signed: {crew ? crew.name : "Team"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Meeting Action Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3">QC Observation</th>
                    <th className="py-2.5 px-3">Screenshot</th>
                    <th className="py-2.5 px-3">Director Action Plan</th>
                    <th className="py-2.5 px-3">Owner & Timeline</th>
                    <th className="py-2.5 px-3 text-right">Status / Roadmap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {qcLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {log.streamTimestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === "ISSUE"
                              ? "bg-rose-500/20 text-rose-300"
                              : log.type === "ACHIEVEMENT"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-300">
                        {log.station} ({log.platform})
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{log.title}</div>
                        {log.description && (
                          <div className="text-[11px] text-slate-400">
                            {log.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {log.screenshotUrl ? (
                          <button
                            onClick={() => setPreviewImageLog(log)}
                            className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-bold"
                          >
                            📸 View Image
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-300">
                        {log.actionToTake || (
                          <span className="text-amber-400">
                            ⏳ Waiting for Director
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-white font-semibold">
                          {log.assignedTo}
                        </div>
                        <div className="text-[11px] text-amber-300">
                          {log.timelineToSolve}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "RESOLVED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : log.status === "WAITING_DIRECTOR"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          }`}
                        >
                          {log.status.replace("_", " ")}
                        </span>
                        {!log.pushedToRoadmap && log.type !== "ACHIEVEMENT" && (
                          <button
                            onClick={() => handlePushToRoadmap(log.id)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] text-slate-300 hover:text-white font-bold"
                          >
                            + Timeline
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Switch Role Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Crew Mobile Sign-In
              </h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCrewLogin} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Your Name (e.g. Kevin)"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value as CrewRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              >
                <option value="DIRECTOR">🎬 Director</option>
                <option value="CAMERA">📹 Camera Crew</option>
                <option value="AUDIO">🎚️ Audio Crew</option>
                <option value="MODERATOR">💬 Chat Moderator</option>
                <option value="QC">🔍 Quality Checker (QC)</option>
              </select>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Check Item Modal */}
      {showAddCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Add Quick Check Item
              </h3>
              <button
                onClick={() => setShowAddCheckModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <select
              value={newCheckRole}
              onChange={(e) => setNewCheckRole(e.target.value as CrewRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="CAMERA">Camera</option>
              <option value="AUDIO">Audio</option>
              <option value="MODERATOR">Moderator</option>
              <option value="QC">QC</option>
              <option value="DIRECTOR">Director</option>
            </select>
            <input
              type="text"
              placeholder="Short check name (e.g. Cam 2 Battery)"
              value={newCheckTask}
              onChange={(e) => setNewCheckTask(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              onClick={async () => {
                if (!newCheckTask.trim()) return;
                await fetch("/api/crew-qc", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "ADD_CHECK_ITEM",
                    item: {
                      role: newCheckRole,
                      category: "Check",
                      task: newCheckTask,
                      detail: "Station check",
                      isCritical: true,
                    },
                  }),
                });
                setNewCheckTask("");
                setShowAddCheckModal(false);
                fetchCrewQcData();
              }}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Save Check
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox */}
      {previewImageLog && (
        <div
          onClick={() => setPreviewImageLog(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {previewImageLog.title} ({previewImageLog.platform})
              </span>
              <button
                onClick={() => setPreviewImageLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewImageLog.screenshotUrl}
                alt="QC"
                className="max-h-[65vh] w-auto object-contain"
              />
              {previewImageLog.markerPos && (
                <div
                  style={{
                    left: `${previewImageLog.markerPos.x}%`,
                    top: `${previewImageLog.markerPos.y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

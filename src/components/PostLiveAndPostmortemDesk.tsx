"use client";

import React, { useState, useEffect, useMemo } from "react";

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
type ShutdownStage = "STREAM_CLOSE" | "DATA_ARCHIVE" | "GEAR_STRIKE";

export interface ShutdownCheckItem {
  id: string;
  role: CrewRole;
  stage: ShutdownStage;
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

export interface PostmortemFeedbackItem {
  id: string;
  serviceDate: string;
  authorName: string;
  authorRole: CrewRole;
  authorCallsign: string;
  category: "WIN" | "BOTTLENECK" | "ACTION_IDEA";
  department: CrewRole;
  comment: string;
  actionItem?: string;
  convertedToCheck?: boolean;
  createdAt: string;
}

export interface WeeklyCustodyState {
  weekLabel: string;
  qcLeadName: string;
  qcLeadCallsign: string;
  qcLeadSignedOff: boolean;
  qcLeadSignedAt: string | null;
  qcSummaryNotes: string;
  streamHealthScore: number;
  modLeadName: string;
  modLeadCallsign: string;
  modLeadSignedOff: boolean;
  modLeadSignedAt: string | null;
  modSummaryNotes: string;
  prayerFollowUpNotes: string;
  directorApproved: boolean;
  directorName: string;
  directorApprovedAt: string | null;
  meetingTakeaways: string;
}

export interface ArchivedWeeklyReport {
  id: string;
  weekLabel: string;
  savedAt: string;
  qcLeadName: string;
  qcLeadCallsign: string;
  modLeadName: string;
  modLeadCallsign: string;
  directorName: string;
  streamHealthScore: number;
  preFlightPct: number;
  shutdownPct: number;
  totalIssues: number;
  totalWins: number;
  qcSummaryNotes: string;
  modSummaryNotes: string;
  prayerFollowUpNotes: string;
  meetingTakeaways: string;
}

interface PostLiveAndPostmortemDeskProps {
  mode: "SHUTDOWN" | "POSTMORTEM";
  onSwitchMode: (mode: "SHUTDOWN" | "POSTMORTEM") => void;
  users: Array<{
    id: string;
    username: string;
    name: string;
    callsign: string;
    role: CrewRole;
  }>;
  myIdentity: {
    id: string;
    name: string;
    role: CrewRole;
  };
  preFlightChecklists: Array<{
    id: string;
    role: CrewRole;
    checked: boolean;
  }>;
  shutdownChecks: ShutdownCheckItem[];
  postmortemFeedback: PostmortemFeedbackItem[];
  weeklyCustody: WeeklyCustodyState;
  weeklyReportsArchive: ArchivedWeeklyReport[];
  qcLogs: Array<{
    id: string;
    streamTimestamp: string;
    type: "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT";
    severity: string;
    platform: string;
    station: string;
    title: string;
    description: string;
    actionToTake: string;
    assignedTo: string;
    timelineToSolve: string;
    status: string;
    screenshotUrl?: string | null;
    markerPos?: { x: number; y: number } | null;
    pushedToRoadmap?: boolean;
  }>;
  onRefreshData: (updatedState?: any) => void;
  onTriggerToast: (msg: string) => void;
  onPreviewFrame: (log: any) => void;
  onPushToRoadmap: (id: string) => void;
  onExportCsv: () => void;
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
    checkSquare: "bg-rose-400 text-black",
  },
};

const ROLES_LIST: CrewRole[] = [
  "CAMERA",
  "AUDIO",
  "MODERATOR",
  "QC",
  "DIRECTOR",
];

const STAGE_LABELS: Record<ShutdownStage, string> = {
  STREAM_CLOSE: "1. Stream & Feed Close",
  DATA_ARCHIVE: "2. Data & Recording Archive",
  GEAR_STRIKE: "3. Hardware Strike & Power-Down",
};

export default function PostLiveAndPostmortemDesk({
  mode,
  onSwitchMode,
  users,
  myIdentity,
  preFlightChecklists,
  shutdownChecks,
  postmortemFeedback,
  weeklyCustody,
  weeklyReportsArchive,
  qcLogs,
  onRefreshData,
  onTriggerToast,
  onPreviewFrame,
  onPushToRoadmap,
  onExportCsv,
}: PostLiveAndPostmortemDeskProps) {
  // Shutdown filter state
  const [stationFilter, setStationFilter] = useState<"ALL" | CrewRole>("ALL");
  const [stageFilter, setStageFilter] = useState<"ALL" | ShutdownStage>("ALL");
  const [showAddShutdownModal, setShowAddShutdownModal] = useState(false);
  const [newShutRole, setNewShutRole] = useState<CrewRole>("CAMERA");
  const [newShutStage, setNewShutStage] =
    useState<ShutdownStage>("GEAR_STRIKE");
  const [newShutTask, setNewShutTask] = useState("");
  const [newShutDetail, setNewShutDetail] = useState("");

  // Live service telemetry for Moderator Lead's Weekly Report
  const [liveTelemetry, setLiveTelemetry] = useState({
    peakYT: 145,
    peakIG: 88,
    totalPrayers: 6,
    prayersCovered: 6,
    totalVisitors: 9,
  });

  // Editable Custody Notes state
  const [qcNotesDraft, setQcNotesDraft] = useState(
    weeklyCustody?.qcSummaryNotes || ""
  );
  const [streamScoreDraft, setStreamScoreDraft] = useState(
    weeklyCustody?.streamHealthScore ?? 96
  );
  const [modNotesDraft, setModNotesDraft] = useState(
    weeklyCustody?.modSummaryNotes || ""
  );
  const [prayerFollowUpDraft, setPrayerFollowUpDraft] = useState(
    weeklyCustody?.prayerFollowUpNotes || ""
  );
  const [takeawaysDraft, setTakeawaysDraft] = useState(
    weeklyCustody?.meetingTakeaways || ""
  );

  // Team Feedback Form state
  const [fbCategory, setFbCategory] = useState<
    "WIN" | "BOTTLENECK" | "ACTION_IDEA"
  >("ACTION_IDEA");
  const [fbDept, setFbDept] = useState<CrewRole>(myIdentity.role || "CAMERA");
  const [fbComment, setFbComment] = useState("");
  const [fbActionItem, setFbActionItem] = useState("");

  useEffect(() => {
    if (weeklyCustody) {
      setQcNotesDraft(weeklyCustody.qcSummaryNotes || "");
      setStreamScoreDraft(weeklyCustody.streamHealthScore ?? 96);
      setModNotesDraft(weeklyCustody.modSummaryNotes || "");
      setPrayerFollowUpDraft(weeklyCustody.prayerFollowUpNotes || "");
      setTakeawaysDraft(weeklyCustody.meetingTakeaways || "");
    }
  }, [weeklyCustody]);

  // Fetch live service/prayer/visitor counts for Moderator Lead report
  useEffect(() => {
    async function loadMinistryMetrics() {
      try {
        const [srvRes, pryRes, visRes] = await Promise.all([
          fetch("/api/service", { cache: "no-store" }),
          fetch("/api/prayers", { cache: "no-store" }),
          fetch("/api/visitors", { cache: "no-store" }),
        ]);
        const srv = srvRes.ok ? await srvRes.json() : null;
        const pry = pryRes.ok ? await pryRes.json() : [];
        const vis = visRes.ok ? await visRes.json() : [];

        const prayersArr = Array.isArray(pry) ? pry : [];
        const visitorsArr = Array.isArray(vis) ? vis : [];

        setLiveTelemetry({
          peakYT: srv?.session?.peakViewersYT ?? 145,
          peakIG: srv?.session?.peakViewersIG ?? 88,
          totalPrayers: prayersArr.length,
          prayersCovered: prayersArr.filter((p: any) => p.status === "PRAYED")
            .length,
          totalVisitors: visitorsArr.length,
        });
      } catch {
        // fallback metrics retained
      }
    }
    loadMinistryMetrics();
  }, []);

  // Computed Shutdown Metrics
  const totalShutdown = shutdownChecks.length;
  const completedShutdown = shutdownChecks.filter((c) => c.checked).length;
  const pendingShutdownCount = totalShutdown - completedShutdown;
  const shutdownPct =
    totalShutdown > 0
      ? Math.round((completedShutdown / totalShutdown) * 100)
      : 0;
  const is100PercentShutDown =
    totalShutdown > 0 && completedShutdown === totalShutdown;

  // Computed Pre-Flight Metrics
  const totalPreFlight = preFlightChecklists.length;
  const completedPreFlight = preFlightChecklists.filter(
    (c) => c.checked
  ).length;
  const preFlightPct =
    totalPreFlight > 0
      ? Math.round((completedPreFlight / totalPreFlight) * 100)
      : 100;

  const visibleShutdownChecks = useMemo(() => {
    return shutdownChecks.filter((c) => {
      if (stationFilter !== "ALL" && c.role !== stationFilter) return false;
      if (stageFilter !== "ALL" && c.stage !== stageFilter) return false;
      return true;
    });
  }, [shutdownChecks, stationFilter, stageFilter]);

  const uncheckedShutdown = useMemo(
    () => visibleShutdownChecks.filter((c) => !c.checked),
    [visibleShutdownChecks]
  );

  const checkedShutdown = useMemo(
    () => visibleShutdownChecks.filter((c) => c.checked),
    [visibleShutdownChecks]
  );

  const pendingShutdownStations = useMemo(() => {
    return ROLES_LIST.map((role) => {
      const items = shutdownChecks.filter((c) => c.role === role);
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
  }, [shutdownChecks, users]);

  // Handlers
  const handleToggleShutdownItem = async (id: string) => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_SHUTDOWN_CHECK",
        id,
        memberName: myIdentity.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
    }
  };

  const handleCheckAllShutdownStation = async (role: CrewRole | "ALL") => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CHECK_ALL_SHUTDOWN_STATION",
        role,
        memberName: myIdentity.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast(
        role === "ALL"
          ? "All stations verified 100% shut down"
          : `${DEPT_STYLES[role].label} station shut down verified`
      );
    }
  };

  const handleResetShutdown = async () => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESET_SHUTDOWN_CHECKS" }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast("Post-live shutdown checklist reset");
    }
  };

  const handleAddShutdownCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShutTask.trim()) return;
    const targetUser = users.find((u) => u.role === newShutRole);
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_SHUTDOWN_CHECK",
        item: {
          role: newShutRole,
          stage: newShutStage,
          category: "Strike Check",
          task: newShutTask.trim(),
          detail: newShutDetail.trim() || "Safe post-live shutdown verification",
          isCritical: true,
          assignedToUserId: targetUser?.id,
          assignedToName: targetUser?.name,
        },
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      setNewShutTask("");
      setNewShutDetail("");
      setShowAddShutdownModal(false);
      onTriggerToast("Added post-live shutdown check");
    }
  };

  const handleUpdateCustody = async (patch: Partial<WeeklyCustodyState>) => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_WEEKLY_CUSTODY",
        patch,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast("Weekly report custody updated");
    }
  };

  const handleArchiveWeeklyReport = async () => {
    // First save any current draft notes
    await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_WEEKLY_CUSTODY",
        patch: {
          qcSummaryNotes: qcNotesDraft,
          streamHealthScore: Number(streamScoreDraft) || 96,
          modSummaryNotes: modNotesDraft,
          prayerFollowUpNotes: prayerFollowUpDraft,
          meetingTakeaways: takeawaysDraft,
        },
      }),
    });

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ARCHIVE_WEEKLY_REPORT" }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast(
        "Weekly Report locked & held by QC Lead and Moderator Lead"
      );
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbComment.trim()) return;
    const currentMember = users.find((u) => u.id === myIdentity.id);
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_POSTMORTEM_FEEDBACK",
        feedback: {
          authorName: myIdentity.name,
          authorRole: myIdentity.role,
          authorCallsign: currentMember?.callsign || myIdentity.role.slice(0, 3),
          category: fbCategory,
          department: fbDept,
          comment: fbComment.trim(),
          actionItem: fbActionItem.trim(),
        },
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      setFbComment("");
      setFbActionItem("");
      onTriggerToast("Feedback added to Postmortem Corner");
    }
  };

  const handleConvertFeedbackToCheck = async (id: string) => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CONVERT_FEEDBACK_TO_CHECK",
        id,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast("Added to Next-Week Pre-Flight Checklist");
    }
  };

  // =========================================================================
  // VIEW A: POST-LIVE SAFE SHUTDOWN CHECKLIST
  // =========================================================================
  if (mode === "SHUTDOWN") {
    return (
      <div className="space-y-6">
        {/* Top Master Safe Shutdown Hero Card */}
        <div
          className={`rounded-3xl p-6 sm:p-7 border transition-all ${
            is100PercentShutDown
              ? "bg-[#0d1912] border-emerald-500/40"
              : "bg-[#121215] border-white/[0.08]"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    is100PercentShutDown ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  {is100PercentShutDown
                    ? "All Stations Safely Closed · Ready for Postmortem"
                    : `Post-Live Strike & Safe Shutdown (${pendingShutdownCount} Remaining)`}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-white">
                {is100PercentShutDown
                  ? "100% Safe Shutdown Verified — Proceed to Postmortem Corner"
                  : "Complete Station Shutdown Before Leaving for Postmortem"}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {is100PercentShutDown
                  ? "All encoders, camera cards, audio consoles, and prayer queues have been safely closed and archived. All crew members proceed to the Postmortem Corner."
                  : "Verify stream termination, recording backups, wireless mic collection, and sequential power-down across all 5 departments before convening in the Postmortem Corner."}
              </p>

              {/* Quick Jump Pills for Stations with Pending Shutdown Items */}
              {!is100PercentShutDown && pendingShutdownStations.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-rose-400 mr-1">
                    Stations Not Yet Closed:
                  </span>
                  {pendingShutdownStations.map((st) => (
                    <button
                      key={st.role}
                      type="button"
                      onClick={() =>
                        setStationFilter(
                          stationFilter === st.role ? "ALL" : st.role
                        )
                      }
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-200 transition"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          DEPT_STYLES[st.role].dot
                        }`}
                      />
                      <span className="font-semibold">{st.label}</span>
                      <span className="text-rose-300/80">
                        ({st.operatorName})
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-black font-bold text-[10px] tabular-nums">
                        {st.remaining} Left
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Progress & Postmortem Transition Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <div className="px-5 py-3.5 rounded-2xl bg-[#09090b] border border-white/[0.07] text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Safe Shutdown
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white tabular-nums mt-0.5">
                  {shutdownPct}%
                </div>
                <div className="text-[11px] text-zinc-400 tabular-nums">
                  {completedShutdown} of {totalShutdown} Closed
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchMode("POSTMORTEM")}
                  className={`px-6 py-3.5 rounded-full font-semibold text-xs tracking-tight transition shadow-lg ${
                    is100PercentShutDown
                      ? "bg-emerald-400 text-black hover:bg-emerald-300"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {is100PercentShutDown
                    ? "Enter Postmortem Corner →"
                    : "Go to Postmortem Corner →"}
                </button>

                {!is100PercentShutDown && (
                  <button
                    type="button"
                    onClick={() => handleCheckAllShutdownStation("ALL")}
                    className="px-5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
                  >
                    Verify All Stations Closed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5-Department Shutdown Progress Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {ROLES_LIST.map((role) => {
            const style = DEPT_STYLES[role];
            const items = shutdownChecks.filter((c) => c.role === role);
            const done = items.filter((c) => c.checked).length;
            const remaining = items.length - done;
            const pct =
              items.length > 0 ? Math.round((done / items.length) * 100) : 0;
            const isSelected = stationFilter === role;
            const leadUser = users.find((u) => u.role === role);

            return (
              <div
                key={role}
                onClick={() =>
                  setStationFilter(stationFilter === role ? "ALL" : role)
                }
                className={`cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 bg-[#121215] border ${
                  style.topBorder
                } ${
                  isSelected
                    ? "border-white/40 ring-1 ring-white/20"
                    : "border-white/[0.08] hover:border-white/[0.18]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${style.pill}`}
                    >
                      {style.code}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1.5">
                      {style.label}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {leadUser
                        ? `${leadUser.name} · ${leadUser.callsign}`
                        : "Unassigned"}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-semibold text-white tabular-nums">
                      {pct}%
                    </span>
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${
                        remaining > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {remaining > 0 ? `${remaining} Open` : "Closed"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${style.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 tabular-nums">
                    <span>
                      {done}/{items.length} Strike Checks
                    </span>
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckAllShutdownStation(role);
                        }}
                        className="text-zinc-200 hover:text-white font-medium underline underline-offset-2"
                      >
                        Close All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage & Department Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] rounded-2xl p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStageFilter("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                stageFilter === "ALL"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All Stages
            </button>
            {(
              ["STREAM_CLOSE", "DATA_ARCHIVE", "GEAR_STRIKE"] as ShutdownStage[]
            ).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() =>
                  setStageFilter(stageFilter === stage ? "ALL" : stage)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  stageFilter === stage
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddShutdownModal(!showAddShutdownModal)}
              className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              {showAddShutdownModal ? "Cancel" : "+ Add Strike Check"}
            </button>
            <button
              type="button"
              onClick={handleResetShutdown}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white text-xs font-medium border border-white/[0.08] transition"
            >
              Reset Shutdown
            </button>
          </div>
        </div>

        {/* Collapsible Add Shutdown Check Form */}
        {showAddShutdownModal && (
          <form
            onSubmit={handleAddShutdownCheck}
            className="rounded-3xl p-5 bg-[#141418] border border-white/[0.12] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
          >
            <select
              value={newShutRole}
              onChange={(e) => setNewShutRole(e.target.value as CrewRole)}
              aria-label="Department"
              className="sm:col-span-2 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
            >
              {ROLES_LIST.map((r) => (
                <option key={r} value={r}>
                  {DEPT_STYLES[r].label}
                </option>
              ))}
            </select>
            <select
              value={newShutStage}
              onChange={(e) => setNewShutStage(e.target.value as ShutdownStage)}
              aria-label="Shutdown Stage"
              className="sm:col-span-3 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="STREAM_CLOSE">1. Stream &amp; Feed Close</option>
              <option value="DATA_ARCHIVE">
                2. Data &amp; Recording Archive
              </option>
              <option value="GEAR_STRIKE">
                3. Hardware Strike &amp; Power-Down
              </option>
            </select>
            <input
              type="text"
              required
              placeholder="Shutdown task (e.g. Power off stage HDMI splitter)"
              value={newShutTask}
              onChange={(e) => setNewShutTask(e.target.value)}
              className="sm:col-span-3 bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Detail / instruction..."
              value={newShutDetail}
              onChange={(e) => setNewShutDetail(e.target.value)}
              className="sm:col-span-2 bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="sm:col-span-2 py-2 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              Add Check
            </button>
          </form>
        )}

        {/* SECTION 1: PENDING SHUTDOWN ITEMS (ACTION REQUIRED) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  uncheckedShutdown.length > 0
                    ? "bg-rose-500"
                    : "bg-emerald-400"
                }`}
              />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Pending Safe Shutdown Tasks ({uncheckedShutdown.length})
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Tap any card after verifying equipment or stream closure
            </span>
          </div>

          {uncheckedShutdown.length === 0 ? (
            <div className="rounded-2xl p-6 bg-[#0d1912] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-300">
                  All Post-Live Shutdown Tasks Complete
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Every station has safely closed its feed, archived data, and
                  powered down hardware.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSwitchMode("POSTMORTEM")}
                className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition shrink-0"
              >
                Proceed to Postmortem Corner →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {uncheckedShutdown.map((item) => {
                const style = DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleShutdownItem(item.id)}
                    className={`cursor-pointer rounded-2xl p-5 bg-[#161113] border border-rose-500/35 hover:border-rose-400/70 ${style.leftBorder} transition flex items-start justify-between gap-4`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg border-2 border-rose-400 bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${style.pill}`}
                          >
                            {style.label}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-zinc-400">
                            {STAGE_LABELS[item.stage]}
                          </span>
                          {item.isCritical && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold">
                              Safety Critical
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {item.task}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {item.detail}
                        </div>
                        <div className="text-[11px] text-zinc-500 pt-0.5">
                          Assigned:{" "}
                          <span className="text-zinc-300 font-medium">
                            {item.assignedToName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold shrink-0 transition"
                    >
                      Verify Closed
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: COMPLETED & VERIFIED SHUTDOWN ITEMS */}
        {checkedShutdown.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Safely Closed &amp; Verified ({checkedShutdown.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {checkedShutdown.map((item) => {
                const style = DEPT_STYLES[item.role] || DEPT_STYLES.CAMERA;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleShutdownItem(item.id)}
                    className={`cursor-pointer rounded-2xl p-4 transition flex items-start justify-between gap-3 ${style.verifiedCard}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${style.checkSquare}`}
                      >
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}
                          >
                            {style.label}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {item.checkedAt || "Verified"}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {item.task}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Closed by {item.checkedBy || item.assignedToName}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: POSTMORTEM CORNER & WEEKLY REPORT CUSTODY (QC LEAD + MOD LEAD)
  // =========================================================================
  const bothLeadsSignedOff =
    weeklyCustody.qcLeadSignedOff && weeklyCustody.modLeadSignedOff;

  return (
    <div className="space-y-6">
      {/* Top Custody Hero Banner: QC Lead & Moderator Lead Hold the Weekly Report */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Postmortem Corner · Team Debrief &amp; Weekly Custody
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-zinc-200 border border-white/[0.08]">
                {weeklyCustody.weekLabel}
              </span>
              {bothLeadsSignedOff ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Report Held by QC Lead &amp; Moderator Lead
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Awaiting Co-Custodian Sign-Off
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
              Postmortem Team Meeting, Feedback &amp; Weekly Held Report
            </h2>
            <p className="text-xs text-zinc-400">
              Quality Control Lead ({weeklyCustody.qcLeadName} ·{" "}
              {weeklyCustody.qcLeadCallsign}) and Moderator Lead (
              {weeklyCustody.modLeadName} · {weeklyCustody.modLeadCallsign})
              jointly hold this week&apos;s report for mid-week follow-up and
              Saturday rehearsal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onSwitchMode("SHUTDOWN")}
              className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.08] transition"
            >
              Shutdown Check ({shutdownPct}%)
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleArchiveWeeklyReport}
              className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition shadow-sm"
            >
              Lock &amp; Hold Weekly Report
            </button>
          </div>
        </div>

        {/* 3-Card Weekly Report Custody Sign-Off Bar (QC Lead + Moderator Lead + Director) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Custodian 1: QC Lead */}
          <div className="rounded-2xl p-4 bg-[#0f1512] border border-emerald-500/30 border-l-[3px] border-l-emerald-400 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Weekly Report Custodian 1 · QC Lead
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {weeklyCustody.qcLeadName} ({weeklyCustody.qcLeadCallsign})
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.qcLeadSignedOff
                  ? `Holding Technical Report · Signed ${
                      weeklyCustody.qcLeadSignedAt || "Today"
                    }`
                  : "Pending QC Lead Sign-Off"}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({
                  qcLeadSignedOff: !weeklyCustody.qcLeadSignedOff,
                })
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                weeklyCustody.qcLeadSignedOff
                  ? "bg-emerald-400 text-black"
                  : "bg-white/[0.08] text-white hover:bg-white hover:text-black"
              }`}
            >
              {weeklyCustody.qcLeadSignedOff ? "Holding Report ✓" : "Sign & Hold"}
            </button>
          </div>

          {/* Custodian 2: Moderator Lead */}
          <div className="rounded-2xl p-4 bg-[#131118] border border-violet-500/30 border-l-[3px] border-l-violet-400 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                  Weekly Report Custodian 2 · Moderator Lead
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {weeklyCustody.modLeadName} ({weeklyCustody.modLeadCallsign})
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.modLeadSignedOff
                  ? `Holding Engagement & Prayer Report · Signed ${
                      weeklyCustody.modLeadSignedAt || "Today"
                    }`
                  : "Pending Moderator Lead Sign-Off"}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({
                  modLeadSignedOff: !weeklyCustody.modLeadSignedOff,
                })
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                weeklyCustody.modLeadSignedOff
                  ? "bg-violet-400 text-black"
                  : "bg-white/[0.08] text-white hover:bg-white hover:text-black"
              }`}
            >
              {weeklyCustody.modLeadSignedOff
                ? "Holding Report ✓"
                : "Sign & Hold"}
            </button>
          </div>

          {/* Technical Director Sign-Off */}
          <div className="rounded-2xl p-4 bg-[#161013] border border-rose-500/30 border-l-[3px] border-l-rose-400 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  Master Control · Technical Director
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">
                {weeklyCustody.directorName} (TD-01)
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.directorApproved
                  ? `Postmortem Approved · ${
                      weeklyCustody.directorApprovedAt || "Today"
                    }`
                  : "Reviewing Postmortem Action Plan"}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({
                  directorApproved: !weeklyCustody.directorApproved,
                })
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                weeklyCustody.directorApproved
                  ? "bg-rose-400 text-black"
                  : "bg-white/[0.08] text-white hover:bg-white hover:text-black"
              }`}
            >
              {weeklyCustody.directorApproved ? "Approved ✓" : "Approve Plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Co-Custodian Dual Report Decks: QC Lead Report (Left) + Moderator Lead Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PILLAR 1: QC LEAD WEEKLY TECHNICAL REPORT */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-emerald-400 rounded-3xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                Custodian 1 · Quality Control Lead ({weeklyCustody.qcLeadName})
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Weekly Stream Health &amp; Technical QC Report
              </h3>
            </div>
            <div className="flex items-center gap-2 bg-[#09090b] border border-white/[0.08] rounded-2xl px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                QC Score
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={streamScoreDraft}
                onChange={(e) => setStreamScoreDraft(Number(e.target.value))}
                aria-label="Stream Health Score"
                className="w-12 bg-transparent text-sm font-semibold text-emerald-400 text-right tabular-nums focus:outline-none"
              />
              <span className="text-xs text-zinc-500">/100</span>
            </div>
          </div>

          {/* QC KPI Strip */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Pre-Flight
              </div>
              <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                {preFlightPct}%
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Safe Strike
              </div>
              <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                {shutdownPct}%
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Faults / Fixes
              </div>
              <div className="text-lg font-semibold text-amber-400 tabular-nums mt-0.5">
                {qcLogs.filter((l) => l.type !== "ACHIEVEMENT").length}
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Stream Wins
              </div>
              <div className="text-lg font-semibold text-emerald-400 tabular-nums mt-0.5">
                {qcLogs.filter((l) => l.type === "ACHIEVEMENT").length}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              QC Lead Weekly Technical Summary (Held for Saturday Rehearsal)
            </label>
            <textarea
              rows={3}
              value={qcNotesDraft}
              onChange={(e) => setQcNotesDraft(e.target.value)}
              placeholder="Record weekly stream stability, audio loudness, camera framing, and action items..."
              className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({
                  qcSummaryNotes: qcNotesDraft,
                  streamHealthScore: Number(streamScoreDraft) || 96,
                  qcLeadSignedOff: true,
                })
              }
              className="px-4 py-2 rounded-full bg-emerald-400 text-black hover:bg-emerald-300 text-xs font-semibold transition"
            >
              Save &amp; Hold QC Report
            </button>
          </div>
        </div>

        {/* PILLAR 2: MODERATOR LEAD WEEKLY ENGAGEMENT & PASTORAL REPORT */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-violet-400 rounded-3xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                Custodian 2 · Moderator Lead ({weeklyCustody.modLeadName})
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Weekly Live Chat, Prayer Queue &amp; Visitor Report
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-violet-500/12 text-violet-300 border border-violet-500/25 text-[11px] font-semibold tabular-nums">
              {liveTelemetry.peakYT + liveTelemetry.peakIG} Peak Live
            </span>
          </div>

          {/* Moderator KPI Strip */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                YouTube Peak
              </div>
              <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                {liveTelemetry.peakYT}
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Instagram Peak
              </div>
              <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                {liveTelemetry.peakIG}
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                Prayers Covered
              </div>
              <div className="text-lg font-semibold text-violet-300 tabular-nums mt-0.5">
                {liveTelemetry.prayersCovered}/{liveTelemetry.totalPrayers}
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 uppercase">
                New Visitors
              </div>
              <div className="text-lg font-semibold text-emerald-400 tabular-nums mt-0.5">
                {liveTelemetry.totalVisitors}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Moderator Weekly Chat Summary
              </label>
              <textarea
                rows={3}
                value={modNotesDraft}
                onChange={(e) => setModNotesDraft(e.target.value)}
                placeholder="Summarize YT/IG chat response, scripture cue engagement..."
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Mid-Week Prayer &amp; Visitor Follow-Up
              </label>
              <textarea
                rows={3}
                value={prayerFollowUpDraft}
                onChange={(e) => setPrayerFollowUpDraft(e.target.value)}
                placeholder="List prayer requests & visitors held for mid-week pastoral care..."
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({
                  modSummaryNotes: modNotesDraft,
                  prayerFollowUpNotes: prayerFollowUpDraft,
                  modLeadSignedOff: true,
                })
              }
              className="px-4 py-2 rounded-full bg-violet-400 text-black hover:bg-violet-300 text-xs font-semibold transition"
            >
              Save &amp; Hold Moderator Report
            </button>
          </div>
        </div>
      </div>

      {/* POSTMORTEM CORNER: TEAM MEETING & FEEDBACK BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (5 cols): Submit Team Feedback & Meeting Takeaways */}
        <div className="lg:col-span-5 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Postmortem Corner · Crew Debrief Input
            </span>
            <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
              Log Team Meeting Feedback
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Share station wins, bottlenecks, or next-week improvements during
              the post-service meeting.
            </p>
          </div>

          <form onSubmit={handleAddFeedback} className="space-y-3.5">
            {/* Category Segmented Pills */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#09090b] p-1 rounded-2xl border border-white/[0.08]">
              {(
                [
                  { id: "WIN", label: "Broadcast Win" },
                  { id: "BOTTLENECK", label: "Bottleneck" },
                  { id: "ACTION_IDEA", label: "Next Week Idea" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFbCategory(cat.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    fbCategory === cat.id
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Department Station
              </label>
              <select
                value={fbDept}
                onChange={(e) => setFbDept(e.target.value as CrewRole)}
                aria-label="Target Department"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>
                    {DEPT_STYLES[r].label} ({r})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Team Feedback / Observation
              </label>
              <textarea
                rows={2}
                required
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="What happened during today's service?"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Action Item for Next Sunday (Optional)
              </label>
              <input
                type="text"
                value={fbActionItem}
                onChange={(e) => setFbActionItem(e.target.value)}
                placeholder="e.g. Add 9:16 frame tape on Cam 1 monitor"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              Post to Postmortem Board ({myIdentity.name})
            </button>
          </form>

          {/* Director & Team Meeting Key Takeaways */}
          <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Agreed Meeting Action Plan for Next Week
              </label>
              <button
                type="button"
                onClick={() =>
                  handleUpdateCustody({ meetingTakeaways: takeawaysDraft })
                }
                className="text-[11px] font-semibold text-white hover:text-zinc-300 underline underline-offset-2"
              >
                Save Plan
              </button>
            </div>
            <textarea
              rows={3}
              value={takeawaysDraft}
              onChange={(e) => setTakeawaysDraft(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Right (7 cols): Live Team Feedback Cards & 1-Click Pre-Flight Conversion */}
        <div className="lg:col-span-7 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                All-Hands Retrospective
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Team Meeting Feedback &amp; Next-Week Improvements (
                {postmortemFeedback.length})
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Convert any item into a Pre-Flight Check for next week
            </span>
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {postmortemFeedback.map((fb) => {
              const deptStyle =
                DEPT_STYLES[fb.department] || DEPT_STYLES.CAMERA;
              return (
                <div
                  key={fb.id}
                  className={`rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] ${deptStyle.leftBorder} space-y-2.5`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          fb.category === "WIN"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                            : fb.category === "BOTTLENECK"
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/25"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                        }`}
                      >
                        {fb.category === "WIN"
                          ? "Win"
                          : fb.category === "BOTTLENECK"
                          ? "Bottleneck"
                          : "Action Idea"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${deptStyle.pill}`}
                      >
                        {deptStyle.label}
                      </span>
                      <span className="text-xs font-medium text-zinc-300">
                        {fb.authorName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        ({fb.authorCallsign})
                      </span>
                    </div>

                    {fb.convertedToCheck ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                        Added to Pre-Flight ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertFeedbackToCheck(fb.id)}
                        className="px-3 py-1 rounded-full bg-white/[0.07] hover:bg-white hover:text-black text-zinc-200 text-[11px] font-medium border border-white/[0.1] transition"
                      >
                        + Add to Next-Week Pre-Flight
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-white leading-relaxed">
                    {fb.comment}
                  </p>

                  {fb.actionItem && (
                    <div className="rounded-xl px-3 py-2 bg-[#141418] border border-white/[0.06] text-xs text-zinc-300">
                      <span className="text-zinc-500 font-semibold mr-1.5">
                        Next Sunday Action:
                      </span>
                      {fb.actionItem}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TIMECODED STREAM QC INCIDENT TABLE */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Timecoded Service Telemetry Log
            </span>
            <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
              Stream QC Observations &amp; Director Directives ({qcLogs.length})
            </h3>
          </div>
        </div>

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
                          onClick={() => onPreviewFrame(log)}
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
                      {!log.pushedToRoadmap && log.type !== "ACHIEVEMENT" && (
                        <button
                          type="button"
                          onClick={() => onPushToRoadmap(log.id)}
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

      {/* WEEKLY HELD REPORTS ARCHIVE (CUSTODY OF QC LEAD & MODERATOR LEAD) */}
      {weeklyReportsArchive.length > 0 && (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Weekly Report Vault
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Weekly Reports Held by QC Lead &amp; Moderator Lead (
                {weeklyReportsArchive.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeklyReportsArchive.map((rep) => (
              <div
                key={rep.id}
                className="rounded-2xl p-5 bg-[#09090b] border border-white/[0.08] space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {rep.weekLabel}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Locked {rep.savedAt} · Held by {rep.qcLeadName} (
                      {rep.qcLeadCallsign}) &amp; {rep.modLeadName} (
                      {rep.modLeadCallsign})
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold tabular-nums">
                    Score {rep.streamHealthScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl p-2 bg-[#141418] border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-500">Pre-Flight</div>
                    <div className="text-xs font-semibold text-white tabular-nums">
                      {rep.preFlightPct}%
                    </div>
                  </div>
                  <div className="rounded-xl p-2 bg-[#141418] border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-500">Shutdown</div>
                    <div className="text-xs font-semibold text-white tabular-nums">
                      {rep.shutdownPct}%
                    </div>
                  </div>
                  <div className="rounded-xl p-2 bg-[#141418] border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-500">Faults</div>
                    <div className="text-xs font-semibold text-amber-300 tabular-nums">
                      {rep.totalIssues}
                    </div>
                  </div>
                  <div className="rounded-xl p-2 bg-[#141418] border border-white/[0.06]">
                    <div className="text-[10px] text-zinc-500">Wins</div>
                    <div className="text-xs font-semibold text-emerald-300 tabular-nums">
                      {rep.totalWins}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-zinc-300">
                    <span className="text-emerald-400 font-semibold mr-1.5">
                      QC Lead:
                    </span>
                    {rep.qcSummaryNotes}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-violet-400 font-semibold mr-1.5">
                      Moderator Lead:
                    </span>
                    {rep.modSummaryNotes}
                  </div>
                  {rep.meetingTakeaways && (
                    <div className="text-zinc-400 pt-1 border-t border-white/[0.06] whitespace-pre-line">
                      <span className="text-zinc-200 font-semibold block mb-0.5">
                        Postmortem Action Plan:
                      </span>
                      {rep.meetingTakeaways}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

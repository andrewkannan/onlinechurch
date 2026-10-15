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
  const isDirector = myIdentity.role === "DIRECTOR";
  const canEditQcCustody =
    myIdentity.role === "QC" || myIdentity.role === "DIRECTOR";
  const canEditModCustody =
    myIdentity.role === "MODERATOR" || myIdentity.role === "DIRECTOR";
  const canArchiveReport =
    myIdentity.role === "DIRECTOR" ||
    myIdentity.role === "QC" ||
    myIdentity.role === "MODERATOR";

  // Shutdown filter state
  const [stationFilter, setStationFilter] = useState<"ALL" | CrewRole>(
    myIdentity.role === "DIRECTOR" ? "ALL" : myIdentity.role
  );
  const [stageFilter, setStageFilter] = useState<"ALL" | ShutdownStage>("ALL");
  const [showAddShutdownModal, setShowAddShutdownModal] = useState(false);
  const [newShutRole, setNewShutRole] = useState<CrewRole>("CAMERA");
  const [newShutStage, setNewShutStage] =
    useState<ShutdownStage>("GEAR_STRIKE");
  const [newShutTask, setNewShutTask] = useState("");
  const [newShutDetail, setNewShutDetail] = useState("");

  useEffect(() => {
    setStationFilter(myIdentity.role === "DIRECTOR" ? "ALL" : myIdentity.role);
    setFbDept(myIdentity.role || "CAMERA");
  }, [myIdentity.role]);

  // Live service telemetry, comments, and prayers for Moderator Lead's Weekly Report
  const [liveTelemetry, setLiveTelemetry] = useState({
    peakYT: 145,
    peakIG: 88,
    totalPrayers: 6,
    prayersCovered: 6,
    totalVisitors: 9,
  });
  const [chatComments, setChatComments] = useState<
    Array<{
      id: string;
      platform: "YOUTUBE" | "INSTAGRAM";
      authorName: string;
      authorHandle: string;
      text: string;
      timestamp: string;
      isPrayerRequest: boolean;
      prayerCategory?: string;
      urgency?: string;
      replied?: boolean;
      replyText?: string;
    }>
  >([]);

  // Meeting Report View & Filter States (QC Solved/Unsolved + Moderator Views/Comments/Feedbacks)
  const [reportDeckFocus, setReportDeckFocus] = useState<
    "SPLIT" | "QC_ONLY" | "MOD_ONLY"
  >("SPLIT");
  const [qcReportStatusFilter, setQcReportStatusFilter] = useState<
    "ALL" | "UNSOLVED" | "SOLVED"
  >("ALL");
  const [qcReportStationFilter, setQcReportStationFilter] = useState<string>("ALL");
  const [modReportTab, setModReportTab] = useState<
    "COMMENTS" | "FEEDBACKS" | "VIEWS_SUMMARY"
  >("COMMENTS");
  const [modCommentFilter, setModCommentFilter] = useState<
    "ALL" | "YOUTUBE" | "INSTAGRAM" | "PRAYER"
  >("ALL");
  const [modFeedbackFilter, setModFeedbackFilter] = useState<
    "ALL" | "MODERATOR" | "WIN" | "BOTTLENECK"
  >("ALL");

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

  // Fetch live service views, viewer comments (/api/live-chat), prayers, and visitors for Moderator Lead report
  useEffect(() => {
    async function loadMinistryMetrics() {
      try {
        const [srvRes, pryRes, visRes, chatRes] = await Promise.all([
          fetch("/api/service", { cache: "no-store" }),
          fetch("/api/prayers", { cache: "no-store" }),
          fetch("/api/visitors", { cache: "no-store" }),
          fetch("/api/live-chat", { cache: "no-store" }),
        ]);
        const srv = srvRes.ok ? await srvRes.json() : null;
        const pry = pryRes.ok ? await pryRes.json() : [];
        const vis = visRes.ok ? await visRes.json() : [];
        const chatData = chatRes.ok ? await chatRes.json() : null;

        const prayersArr = Array.isArray(pry) ? pry : [];
        const visitorsArr = Array.isArray(vis) ? vis : [];
        const messagesArr = Array.isArray(chatData?.messages)
          ? chatData.messages
          : [];

        setLiveTelemetry({
          peakYT: srv?.session?.peakViewersYT ?? 145,
          peakIG: srv?.session?.peakViewersIG ?? 88,
          totalPrayers: prayersArr.length,
          prayersCovered: prayersArr.filter((p: any) => p.status === "PRAYED")
            .length,
          totalVisitors: visitorsArr.length,
        });
        setChatComments(messagesArr);
      } catch {
        // fallback metrics retained
      }
    }
    loadMinistryMetrics();
  }, [mode]);

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

  const handleToggleQcLogStatus = async (
    id: string,
    currentStatus: string
  ) => {
    const nextStatus =
      currentStatus === "RESOLVED" ? "IN_PROGRESS" : "RESOLVED";
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_QC_STATUS",
        id,
        status: nextStatus,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRefreshData(updated);
      onTriggerToast(
        nextStatus === "RESOLVED"
          ? "QC Log marked as SOLVED"
          : "QC Log reopened as UNSOLVED"
      );
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
  // VIEW B: MEETING REPORT — QC (ALL LOGS: SOLVED & UNSOLVED) + MODERATOR (VIEWS, COMMENTS & FEEDBACKS)
  // =========================================================================
  const bothLeadsSignedOff =
    weeklyCustody.qcLeadSignedOff && weeklyCustody.modLeadSignedOff;

  // QC Reported Logs Breakdown: Solved vs. Unsolved
  const solvedQcLogs = qcLogs.filter((l) => l.status === "RESOLVED");
  const unsolvedQcLogs = qcLogs.filter((l) => l.status !== "RESOLVED");

  const filteredQcReportLogs = qcLogs.filter((log) => {
    if (qcReportStatusFilter === "SOLVED" && log.status !== "RESOLVED") {
      return false;
    }
    if (qcReportStatusFilter === "UNSOLVED" && log.status === "RESOLVED") {
      return false;
    }
    if (
      qcReportStationFilter !== "ALL" &&
      log.station !== qcReportStationFilter
    ) {
      return false;
    }
    return true;
  });

  // Moderator Views, Comments & Feedbacks Breakdown
  const totalCombinedViews = liveTelemetry.peakYT + liveTelemetry.peakIG;
  const ytSharePct =
    totalCombinedViews > 0
      ? Math.round((liveTelemetry.peakYT / totalCombinedViews) * 100)
      : 50;
  const igSharePct = 100 - ytSharePct;

  const filteredModComments = chatComments.filter((msg) => {
    if (modCommentFilter === "YOUTUBE" && msg.platform !== "YOUTUBE") {
      return false;
    }
    if (modCommentFilter === "INSTAGRAM" && msg.platform !== "INSTAGRAM") {
      return false;
    }
    if (modCommentFilter === "PRAYER" && !msg.isPrayerRequest) {
      return false;
    }
    return true;
  });

  const filteredModFeedbacks = postmortemFeedback.filter((fb) => {
    if (modFeedbackFilter === "MODERATOR" && fb.department !== "MODERATOR") {
      return false;
    }
    if (modFeedbackFilter === "WIN" && fb.category !== "WIN") {
      return false;
    }
    if (modFeedbackFilter === "BOTTLENECK" && fb.category === "WIN") {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Custody Header Bar: QC Lead & Moderator Lead Co-Custody */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Meeting Report · Postmortem Corner
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-zinc-200 border border-white/[0.08]">
                {weeklyCustody.weekLabel}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  bothLeadsSignedOff
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {bothLeadsSignedOff
                  ? "Held by QC Lead & Moderator Lead ✓"
                  : "Awaiting Custodian Sign-Off"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
              Weekly Meeting Report · QC Logs &amp; Moderator Engagement
            </h2>
            <p className="text-xs text-zinc-400">
              QC Lead ({weeklyCustody.qcLeadName}) reviews all reported logs (
              <span className="text-emerald-300 font-medium">
                {solvedQcLogs.length} Solved
              </span>{" "}
              ·{" "}
              <span className="text-rose-300 font-medium">
                {unsolvedQcLogs.length} Unsolved
              </span>
              ) and Moderator Lead ({weeklyCustody.modLeadName}) holds stream
              views ({totalCombinedViews}), comments ({chatComments.length}),
              and feedbacks ({postmortemFeedback.length}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Switcher: Split vs QC Only vs Moderator Only */}
            <div className="flex items-center bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
              {(
                [
                  { id: "SPLIT", label: "Split View" },
                  {
                    id: "QC_ONLY",
                    label: `QC Report (${qcLogs.length})`,
                  },
                  {
                    id: "MOD_ONLY",
                    label: `Moderator Report (${chatComments.length + postmortemFeedback.length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReportDeckFocus(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                    reportDeckFocus === tab.id
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onExportCsv}
              className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
            >
              Export CSV
            </button>
            {canArchiveReport && (
              <button
                type="button"
                onClick={handleArchiveWeeklyReport}
                className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition shadow-sm"
              >
                Lock &amp; Hold Report
              </button>
            )}
          </div>
        </div>

        {/* 3-Card Custodian Sign-Off Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Custodian 1: QC Lead */}
          <div className="rounded-2xl p-4 bg-[#0f1512] border border-emerald-500/30 border-l-[3px] border-l-emerald-400 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Custodian 1 · QC Lead
              </span>
              <div className="text-sm font-semibold text-white mt-0.5">
                {weeklyCustody.qcLeadName} ({weeklyCustody.qcLeadCallsign})
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.qcLeadSignedOff
                  ? `Signed ${weeklyCustody.qcLeadSignedAt || "Today"}`
                  : `${solvedQcLogs.length} Solved · ${unsolvedQcLogs.length} Unsolved`}
              </div>
            </div>
            {canEditQcCustody ? (
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
                {weeklyCustody.qcLeadSignedOff
                  ? "Holding Report ✓"
                  : "Sign & Hold"}
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/[0.05] text-[10px] font-semibold text-zinc-400 border border-white/[0.08]">
                {weeklyCustody.qcLeadSignedOff ? "QC Signed ✓" : "QC Lead"}
              </span>
            )}
          </div>

          {/* Custodian 2: Moderator Lead */}
          <div className="rounded-2xl p-4 bg-[#131118] border border-violet-500/30 border-l-[3px] border-l-violet-400 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                Custodian 2 · Moderator Lead
              </span>
              <div className="text-sm font-semibold text-white mt-0.5">
                {weeklyCustody.modLeadName} ({weeklyCustody.modLeadCallsign})
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.modLeadSignedOff
                  ? `Signed ${weeklyCustody.modLeadSignedAt || "Today"}`
                  : `${totalCombinedViews} Views · ${chatComments.length} Comments · ${postmortemFeedback.length} Feedbacks`}
              </div>
            </div>
            {canEditModCustody ? (
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
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/[0.05] text-[10px] font-semibold text-zinc-400 border border-white/[0.08]">
                {weeklyCustody.modLeadSignedOff ? "MOD Signed ✓" : "MOD Lead"}
              </span>
            )}
          </div>

          {/* Technical Director Sign-Off */}
          <div className="rounded-2xl p-4 bg-[#161013] border border-rose-500/30 border-l-[3px] border-l-rose-400 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                Master Control · Director
              </span>
              <div className="text-sm font-semibold text-white mt-0.5">
                {weeklyCustody.directorName} (TD-01)
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {weeklyCustody.directorApproved
                  ? `Approved ${weeklyCustody.directorApprovedAt || "Today"}`
                  : "Reviewing Action Plan"}
              </div>
            </div>
            {isDirector ? (
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
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/[0.05] text-[10px] font-semibold text-zinc-400 border border-white/[0.08]">
                {weeklyCustody.directorApproved
                  ? "Director Approved ✓"
                  : "Director Only"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN MEETING REPORT DECKS: QC REPORT (LEFT) + MODERATOR REPORT (RIGHT) */}
      <div
        className={`grid grid-cols-1 ${
          reportDeckFocus === "SPLIT" ? "lg:grid-cols-2" : ""
        } gap-6 items-start`}
      >
        {/* ================================================================= */}
        {/* DECK 1: QC REPORT — ALL LOGS REPORTED (SOLVED & UNSOLVED)         */}
        {/* ================================================================= */}
        {reportDeckFocus !== "MOD_ONLY" && (
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-emerald-400 rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  QC Report · {weeklyCustody.qcLeadName} (
                  {weeklyCustody.qcLeadCallsign})
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  All Reported QC Logs · Solved &amp; Unsolved
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-[#09090b] border border-white/[0.08] rounded-2xl px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                  Health Score
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!canEditQcCustody}
                  value={streamScoreDraft}
                  onChange={(e) => setStreamScoreDraft(Number(e.target.value))}
                  aria-label="Stream Health Score"
                  className="w-12 bg-transparent text-sm font-semibold text-emerald-400 text-right tabular-nums focus:outline-none disabled:opacity-75"
                />
                <span className="text-xs text-zinc-500">/100</span>
              </div>
            </div>

            {/* QC 4-Metric Summary Strip */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
                <div className="text-[10px] text-zinc-500 uppercase">
                  Total Reported
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                  {qcLogs.length}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#0b1611] border border-emerald-500/25">
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">
                  Solved Logs
                </div>
                <div className="text-lg font-semibold text-emerald-300 tabular-nums mt-0.5">
                  {solvedQcLogs.length}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#171012] border border-rose-500/25">
                <div className="text-[10px] text-rose-400 uppercase font-semibold">
                  Unsolved Logs
                </div>
                <div className="text-lg font-semibold text-rose-300 tabular-nums mt-0.5">
                  {unsolvedQcLogs.length}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
                <div className="text-[10px] text-zinc-500 uppercase">
                  Pre / Shutdown
                </div>
                <div className="text-sm font-semibold text-zinc-200 tabular-nums mt-1">
                  {preFlightPct}% · {shutdownPct}%
                </div>
              </div>
            </div>

            {/* Solved vs Unsolved Filter Tabs + Station Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-2xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setQcReportStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    qcReportStatusFilter === "ALL"
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Logs ({qcLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQcReportStatusFilter("UNSOLVED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    qcReportStatusFilter === "UNSOLVED"
                      ? "bg-rose-500 text-white"
                      : "text-rose-300 hover:bg-rose-500/10"
                  }`}
                >
                  Unsolved ({unsolvedQcLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQcReportStatusFilter("SOLVED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    qcReportStatusFilter === "SOLVED"
                      ? "bg-emerald-400 text-black"
                      : "text-emerald-300 hover:bg-emerald-500/10"
                  }`}
                >
                  Solved ({solvedQcLogs.length})
                </button>
              </div>

              <select
                value={qcReportStationFilter}
                onChange={(e) => setQcReportStationFilter(e.target.value)}
                aria-label="Filter QC Logs by Department"
                className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="ALL">All Stations</option>
                <option value="CAMERA">Camera</option>
                <option value="AUDIO">Audio</option>
                <option value="MODERATOR">Moderator</option>
                <option value="DIRECTOR">Director</option>
              </select>
            </div>

            {/* All Reported QC Logs List (Solved & Unsolved) */}
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {filteredQcReportLogs.length === 0 ? (
                <div className="rounded-2xl p-6 bg-[#09090b] border border-white/[0.06] text-center text-xs text-zinc-500">
                  No QC logs match the selected filter.
                </div>
              ) : (
                filteredQcReportLogs.map((log) => {
                  const isSolved = log.status === "RESOLVED";
                  const stStyle =
                    DEPT_STYLES[log.station] || DEPT_STYLES.CAMERA;
                  return (
                    <div
                      key={log.id}
                      className={`rounded-2xl p-4 border transition space-y-2.5 ${
                        isSolved
                          ? "bg-[#0b130f] border-emerald-500/25 border-l-[3px] border-l-emerald-400"
                          : "bg-[#161012] border-rose-500/30 border-l-[3px] border-l-rose-400"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isSolved
                                ? "bg-emerald-400 text-black"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            {isSolved ? "SOLVED ✓" : "UNSOLVED"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${stStyle.pill}`}
                          >
                            {log.station} · {log.platform}
                          </span>
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
                          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                            {log.streamTimestamp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {log.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => onPreviewFrame(log)}
                              className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 text-[10px] font-semibold transition"
                            >
                              View Frame
                            </button>
                          )}
                          {!isSolved &&
                            !log.pushedToRoadmap &&
                            log.type !== "ACHIEVEMENT" && (
                              <button
                                type="button"
                                onClick={() => onPushToRoadmap(log.id)}
                                className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white hover:text-black text-zinc-200 text-[10px] font-semibold transition"
                              >
                                + Roadmap
                              </button>
                            )}
                          {canEditQcCustody && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleQcLogStatus(log.id, log.status)
                              }
                              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition ${
                                isSolved
                                  ? "bg-white/[0.07] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-200 border border-white/[0.1]"
                                  : "bg-emerald-400 hover:bg-emerald-300 text-black"
                              }`}
                            >
                              {isSolved ? "Mark Unsolved" : "Mark Solved ✓"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-white">
                          {log.title}
                        </div>
                        {log.description && (
                          <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                            {log.description}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[11px]">
                        <div className="text-zinc-300">
                          <span className="text-zinc-500 mr-1">
                            Resolution / Action:
                          </span>
                          {log.actionToTake ? (
                            <span className="font-medium text-zinc-200">
                              {log.actionToTake}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium">
                              Pending Director Directive
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-400">
                          Owner:{" "}
                          <span className="text-zinc-200 font-medium">
                            {log.assignedTo}
                          </span>{" "}
                          ·{" "}
                          <span className="text-zinc-500">
                            {log.timelineToSolve}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* QC Weekly Summary Notes */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  QC Lead Weekly Summary Notes
                </label>
                {canEditQcCustody && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCustody({
                        qcSummaryNotes: qcNotesDraft,
                        streamHealthScore: Number(streamScoreDraft) || 96,
                        qcLeadSignedOff: true,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-full bg-emerald-400 text-black hover:bg-emerald-300 text-[11px] font-semibold transition"
                  >
                    Save &amp; Hold QC Report
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                readOnly={!canEditQcCustody}
                value={qcNotesDraft}
                onChange={(e) => setQcNotesDraft(e.target.value)}
                placeholder="Record weekly stream stability, solved vs unsolved technical items..."
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30 read-only:opacity-80"
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* DECK 2: MODERATOR REPORT — VIEWS, COMMENTS & FEEDBACKS            */}
        {/* ================================================================= */}
        {reportDeckFocus !== "QC_ONLY" && (
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-violet-400 rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                  Moderator Report · {weeklyCustody.modLeadName} (
                  {weeklyCustody.modLeadCallsign})
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Stream Views, Audience Comments &amp; Feedbacks
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-semibold tabular-nums">
                {totalCombinedViews} Total Peak Views
              </span>
            </div>

            {/* Moderator 4-Metric Strip: Views, YT, IG, Comments & Feedbacks */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-2xl p-3 bg-[#13101c] border border-violet-500/25">
                <div className="text-[10px] text-violet-300 uppercase font-semibold">
                  Combined Views
                </div>
                <div className="text-lg font-semibold text-white tabular-nums mt-0.5">
                  {totalCombinedViews}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
                <div className="text-[10px] text-zinc-500 uppercase">
                  YouTube Views
                </div>
                <div className="text-lg font-semibold text-rose-300 tabular-nums mt-0.5">
                  {liveTelemetry.peakYT}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
                <div className="text-[10px] text-zinc-500 uppercase">
                  Instagram Views
                </div>
                <div className="text-lg font-semibold text-fuchsia-300 tabular-nums mt-0.5">
                  {liveTelemetry.peakIG}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-[#09090b] border border-white/[0.06]">
                <div className="text-[10px] text-zinc-500 uppercase">
                  Prayers / Visitors
                </div>
                <div className="text-sm font-semibold text-emerald-300 tabular-nums mt-1">
                  {liveTelemetry.prayersCovered}/{liveTelemetry.totalPrayers} ·{" "}
                  {liveTelemetry.totalVisitors} New
                </div>
              </div>
            </div>

            {/* Moderator Sub-Navigation: Comments vs Feedbacks vs Views Breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-2xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModReportTab("COMMENTS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    modReportTab === "COMMENTS"
                      ? "bg-violet-400 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Live Comments ({chatComments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModReportTab("FEEDBACKS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    modReportTab === "FEEDBACKS"
                      ? "bg-violet-400 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Feedbacks ({postmortemFeedback.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModReportTab("VIEWS_SUMMARY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    modReportTab === "VIEWS_SUMMARY"
                      ? "bg-violet-400 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Views &amp; Reach ({totalCombinedViews})
                </button>
              </div>

              {modReportTab === "COMMENTS" && (
                <select
                  value={modCommentFilter}
                  onChange={(e) =>
                    setModCommentFilter(
                      e.target.value as
                        | "ALL"
                        | "YOUTUBE"
                        | "INSTAGRAM"
                        | "PRAYER"
                    )
                  }
                  aria-label="Filter Live Comments"
                  className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="ALL">All Platforms</option>
                  <option value="YOUTUBE">YouTube Comments</option>
                  <option value="INSTAGRAM">Instagram Comments</option>
                  <option value="PRAYER">Prayer Comments Only</option>
                </select>
              )}

              {modReportTab === "FEEDBACKS" && (
                <select
                  value={modFeedbackFilter}
                  onChange={(e) =>
                    setModFeedbackFilter(
                      e.target.value as
                        | "ALL"
                        | "MODERATOR"
                        | "WIN"
                        | "BOTTLENECK"
                    )
                  }
                  aria-label="Filter Feedbacks"
                  className="bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="ALL">All Feedbacks</option>
                  <option value="MODERATOR">Moderator Only</option>
                  <option value="WIN">Broadcast Wins</option>
                  <option value="BOTTLENECK">Bottlenecks &amp; Ideas</option>
                </select>
              )}
            </div>

            {/* TAB 1: AUDIENCE LIVE COMMENTS (YOUTUBE & INSTAGRAM) */}
            {modReportTab === "COMMENTS" && (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredModComments.length === 0 ? (
                  <div className="rounded-2xl p-6 bg-[#09090b] border border-white/[0.06] text-center text-xs text-zinc-500">
                    No live stream comments match this filter.
                  </div>
                ) : (
                  filteredModComments.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] border-l-[3px] border-l-violet-400 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              msg.platform === "YOUTUBE"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                            }`}
                          >
                            {msg.platform === "YOUTUBE" ? "YouTube" : "Instagram"}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {msg.authorName}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {msg.authorHandle}
                          </span>
                          {msg.isPrayerRequest && (
                            <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-semibold">
                              Prayer · {msg.prayerCategory || "GENERAL"}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            msg.replied
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[0.06] text-zinc-400"
                          }`}
                        >
                          {msg.replied ? "Replied ✓" : "Logged"}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed">
                        &ldquo;{msg.text}&rdquo;
                      </p>

                      {msg.replyText && (
                        <div className="rounded-xl px-3 py-2 bg-[#131118] border border-violet-500/20 text-[11px] text-violet-200">
                          <span className="text-violet-400 font-semibold mr-1.5">
                            Moderator Reply:
                          </span>
                          {msg.replyText}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: TEAM & SERVICE FEEDBACKS */}
            {modReportTab === "FEEDBACKS" && (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredModFeedbacks.length === 0 ? (
                  <div className="rounded-2xl p-6 bg-[#09090b] border border-white/[0.06] text-center text-xs text-zinc-500">
                    No feedbacks match this filter.
                  </div>
                ) : (
                  filteredModFeedbacks.map((fb) => {
                    const deptStyle =
                      DEPT_STYLES[fb.department] || DEPT_STYLES.MODERATOR;
                    return (
                      <div
                        key={fb.id}
                        className={`rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] ${deptStyle.leftBorder} space-y-2`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                fb.category === "WIN"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : fb.category === "BOTTLENECK"
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-amber-500/15 text-amber-300"
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
                              {fb.authorName} ({fb.authorCallsign})
                            </span>
                          </div>

                          {fb.convertedToCheck ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                              In Pre-Flight ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConvertFeedbackToCheck(fb.id)}
                              className="px-2.5 py-1 rounded-full bg-white/[0.07] hover:bg-white hover:text-black text-zinc-200 text-[10px] font-semibold border border-white/[0.1] transition"
                            >
                              + Pre-Flight Check
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-white leading-relaxed">
                          {fb.comment}
                        </p>

                        {fb.actionItem && (
                          <div className="rounded-xl px-3 py-2 bg-[#141418] border border-white/[0.06] text-[11px] text-zinc-300">
                            <span className="text-zinc-500 font-semibold mr-1.5">
                              Next Sunday Action:
                            </span>
                            {fb.actionItem}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: STREAM VIEWS & PASTORAL ENGAGEMENT BREAKDOWN */}
            {modReportTab === "VIEWS_SUMMARY" && (
              <div className="space-y-3.5">
                <div className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      Platform Viewership Split ({totalCombinedViews} Peak Concurrent)
                    </span>
                    <span className="text-zinc-400 tabular-nums">
                      YT {ytSharePct}% · IG {igSharePct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                    <div
                      className="h-full bg-rose-400"
                      style={{ width: `${ytSharePct}%` }}
                    />
                    <div
                      className="h-full bg-fuchsia-400"
                      style={{ width: `${igSharePct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="rounded-xl p-3 bg-[#141418] border border-white/[0.06]">
                      <div className="text-[10px] text-rose-300 uppercase font-semibold">
                        YouTube 16:9 Mainstream
                      </div>
                      <div className="text-base font-semibold text-white tabular-nums mt-0.5">
                        {liveTelemetry.peakYT} Peak Viewers
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {
                          chatComments.filter((c) => c.platform === "YOUTUBE")
                            .length
                        }{" "}
                        live comments logged
                      </div>
                    </div>
                    <div className="rounded-xl p-3 bg-[#141418] border border-white/[0.06]">
                      <div className="text-[10px] text-fuchsia-300 uppercase font-semibold">
                        Instagram Live (Blur Top/Bottom)
                      </div>
                      <div className="text-base font-semibold text-white tabular-nums mt-0.5">
                        {liveTelemetry.peakIG} Peak Viewers
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {
                          chatComments.filter((c) => c.platform === "INSTAGRAM")
                            .length
                        }{" "}
                        live comments logged
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.08]">
                    <div className="text-[10px] text-violet-300 uppercase font-semibold">
                      Prayer Queue Coverage
                    </div>
                    <div className="text-lg font-semibold text-white tabular-nums mt-1">
                      {liveTelemetry.prayersCovered} of{" "}
                      {liveTelemetry.totalPrayers} Prayed
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Auto-captured from YouTube &amp; Instagram chat
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.08]">
                    <div className="text-[10px] text-emerald-300 uppercase font-semibold">
                      First-Time Visitors Connected
                    </div>
                    <div className="text-lg font-semibold text-white tabular-nums mt-1">
                      {liveTelemetry.totalVisitors} Visitors
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Queued for mid-week pastoral follow-up
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Moderator Weekly Summary & Follow-Up Notes */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Moderator Lead Views, Comments &amp; Follow-Up Summary
                </label>
                {canEditModCustody && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCustody({
                        modSummaryNotes: modNotesDraft,
                        prayerFollowUpNotes: prayerFollowUpDraft,
                        modLeadSignedOff: true,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-full bg-violet-400 text-black hover:bg-violet-300 text-[11px] font-semibold transition"
                  >
                    Save &amp; Hold Moderator Report
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <textarea
                  rows={2}
                  readOnly={!canEditModCustody}
                  value={modNotesDraft}
                  onChange={(e) => setModNotesDraft(e.target.value)}
                  placeholder="Summarize YT/IG viewership & comment engagement..."
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30 read-only:opacity-80"
                />
                <textarea
                  rows={2}
                  readOnly={!canEditModCustody}
                  value={prayerFollowUpDraft}
                  onChange={(e) => setPrayerFollowUpDraft(e.target.value)}
                  placeholder="List prayer requests & visitor feedbacks held for mid-week care..."
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-white/30 read-only:opacity-80"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LOG NEW MEETING FEEDBACK & AGREED NEXT-WEEK ACTION PLAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Add Feedback to Moderator &amp; Team Report
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Log Postmortem Feedback or Next-Week Action
              </h3>
            </div>
          </div>

          <form
            onSubmit={handleAddFeedback}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Category
              </label>
              <select
                value={fbCategory}
                onChange={(e) =>
                  setFbCategory(
                    e.target.value as "WIN" | "BOTTLENECK" | "ACTION_IDEA"
                  )
                }
                aria-label="Feedback Category"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="WIN">Broadcast Win</option>
                <option value="BOTTLENECK">Bottleneck</option>
                <option value="ACTION_IDEA">Next Week Idea</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Department
              </label>
              <select
                value={fbDept}
                onChange={(e) => setFbDept(e.target.value as CrewRole)}
                aria-label="Target Department"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>
                    {DEPT_STYLES[r].label} ({r})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Next Sunday Action (Optional)
              </label>
              <input
                type="text"
                value={fbActionItem}
                onChange={(e) => setFbActionItem(e.target.value)}
                placeholder="e.g. Check IG blur seam at 07:30 AM"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="sm:col-span-9">
              <input
                type="text"
                required
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="Write feedback or observation from today's live stream..."
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full h-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
              >
                + Post Feedback
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Master Control Sign-Off
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Agreed Next-Sunday Action Plan
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                handleUpdateCustody({ meetingTakeaways: takeawaysDraft })
              }
              className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white hover:text-black text-xs font-semibold text-white transition"
            >
              Save Plan
            </button>
          </div>
          <textarea
            rows={4}
            value={takeawaysDraft}
            onChange={(e) => setTakeawaysDraft(e.target.value)}
            placeholder="Key takeaways and assigned fixes for next Sunday..."
            className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3.5 text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-white/30"
          />
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
                Locked Weekly Reports ({weeklyReportsArchive.length})
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
                      Locked {rep.savedAt} · QC {rep.qcLeadName} (
                      {rep.qcLeadCallsign}) &amp; MOD {rep.modLeadName} (
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { resolveRobotAvatarUrl } from "@/lib/robotAvatars";

export type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
export type RosterSlotStatus =
  | "CONFIRMED"
  | "PENDING"
  | "SWAP_REQUESTED"
  | "DECLINED";

export interface RosterUserAccount {
  id: string;
  username: string;
  name: string;
  callsign: string;
  role: CrewRole;
  stationAssignment: string;
  avatarUrl?: string;
  certifiedRoles?: CrewRole[];
}

export interface WeeklyRosterSlot {
  role: CrewRole;
  primaryUserId: string;
  primaryUserName: string;
  primaryCallsign: string;
  backupUserId?: string | null;
  backupUserName?: string | null;
  status: RosterSlotStatus;
  confirmedAt?: string | null;
  callTimeMyt: string;
  notes?: string;
  swapRequestedBy?: string | null;
  swapReason?: string | null;
}

export interface WeeklyServiceRoster {
  id: string;
  sundayDateIso: string;
  weekLabel: string;
  serviceTheme: string;
  checkStartMyt: string;
  earlyGoLiveMyt: string;
  serviceStartMyt: string;
  isPublished: boolean;
  syncedToPreFlight?: boolean;
  slots: Record<CrewRole, WeeklyRosterSlot>;
}

export interface OperatorBlockoutDate {
  id: string;
  userId: string;
  userName: string;
  role: CrewRole;
  sundayDateIso: string;
  reason: string;
  createdAt: string;
}

interface WeeklyServingRosterTableProps {
  weeklyRoster: WeeklyServiceRoster[];
  rosterBlockouts: OperatorBlockoutDate[];
  users: RosterUserAccount[];
  currentUser: {
    id: string;
    name: string;
    role: CrewRole;
    callsign?: string;
    avatarUrl?: string;
  };
  onRefreshState: (updatedState: any) => void;
  onTriggerToast: (msg: string) => void;
}

const ROLES_ORDER: CrewRole[] = [
  "DIRECTOR",
  "CAMERA",
  "AUDIO",
  "MODERATOR",
  "QC",
];

const ROLE_STATION_META: Record<
  CrewRole,
  {
    label: string;
    code: string;
    stationDesc: string;
    callTime: string;
    isWeeklyReportCustodian: boolean;
    dot: string;
    text: string;
    pill: string;
    leftBorder: string;
    cellHighlight: string;
  }
> = {
  DIRECTOR: {
    label: "Director",
    code: "TD-01",
    stationDesc: "Master Switcher · 8:25 AM Early Go-Live Sign-Off",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-rose-400",
    text: "text-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    leftBorder: "border-l-[3px] border-l-rose-400",
    cellHighlight: "border-rose-500/30 bg-rose-500/[0.04]",
  },
  CAMERA: {
    label: "Camera",
    code: "CAM-01",
    stationDesc: "Sony FX3 Rig · 5600K & IG Top/Bottom Blur Scene",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-amber-400",
    text: "text-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    leftBorder: "border-l-[3px] border-l-amber-400",
    cellHighlight: "border-amber-500/30 bg-amber-500/[0.04]",
  },
  AUDIO: {
    label: "Audio",
    code: "A1-MIX",
    stationDesc: "Allen & Heath SQ · -14 LUFS Broadcast Mix Bus",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-sky-400",
    text: "text-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    leftBorder: "border-l-[3px] border-l-sky-400",
    cellHighlight: "border-sky-500/30 bg-sky-500/[0.04]",
  },
  MODERATOR: {
    label: "Moderator",
    code: "MOD-01",
    stationDesc: "YouTube & IG Live Chat · Weekly Report Co-Custodian",
    callTime: "07:00 AM MYT",
    isWeeklyReportCustodian: true,
    dot: "bg-violet-400",
    text: "text-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
    leftBorder: "border-l-[3px] border-l-violet-400",
    cellHighlight: "border-violet-500/30 bg-violet-500/[0.04]",
  },
  QC: {
    label: "Quality Control",
    code: "QC-01",
    stationDesc: "1080p60 & IG Blur Telemetry · Weekly Report Co-Custodian",
    callTime: "06:30 AM MYT",
    isWeeklyReportCustodian: true,
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    leftBorder: "border-l-[3px] border-l-emerald-400",
    cellHighlight: "border-emerald-500/30 bg-emerald-500/[0.04]",
  },
};

const STATUS_BADGE_MAP: Record<
  RosterSlotStatus,
  { label: string; style: string; dot: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    style:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35",
    dot: "bg-emerald-400",
  },
  PENDING: {
    label: "Awaiting Confirm",
    style: "bg-amber-500/15 text-amber-300 border border-amber-500/35",
    dot: "bg-amber-400",
  },
  SWAP_REQUESTED: {
    label: "Swap Requested",
    style:
      "bg-rose-500/20 text-rose-300 border border-rose-500/45 animate-pulse",
    dot: "bg-rose-400",
  },
  DECLINED: {
    label: "Unavailable",
    style: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    dot: "bg-zinc-400",
  },
};

export default function WeeklyServingRosterTable({
  weeklyRoster,
  rosterBlockouts,
  users,
  currentUser,
  onRefreshState,
  onTriggerToast,
}: WeeklyServingRosterTableProps) {
  const isDirector = currentUser.role === "DIRECTOR";

  // View & Station Filters
  const [viewMode, setViewMode] = useState<
    "ALL_STATIONS" | "MY_SHIFTS" | "CONFLICTS_AND_SWAPS"
  >("ALL_STATIONS");
  const [roleFilter, setRoleFilter] = useState<"ALL" | CrewRole>("ALL");

  // Active Cell Editor Modal / Popover state
  const [editingCell, setEditingCell] = useState<{
    weekId: string;
    role: CrewRole;
  } | null>(null);

  // Swap Request Modal state
  const [swapPromptCell, setSwapPromptCell] = useState<{
    weekId: string;
    weekLabel: string;
    role: CrewRole;
  } | null>(null);
  const [swapReasonText, setSwapReasonText] = useState("");

  // Blockout / Unavailable Dates Drawer state
  const [showBlockoutDrawer, setShowBlockoutDrawer] = useState(false);
  const [blockoutUserId, setBlockoutUserId] = useState(currentUser.id);
  const [blockoutSundayIso, setBlockoutSundayIso] = useState(
    weeklyRoster[1]?.sundayDateIso || "2026-10-25"
  );
  const [blockoutReason, setBlockoutReason] = useState("");

  // New Week Drawer state
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekTheme, setNewWeekTheme] = useState("");

  // Helper to post roster mutations to /api/crew-qc
  const postRosterAction = async (
    payload: Record<string, any>,
    toastMessage?: string
  ) => {
    try {
      const res = await fetch("/api/crew-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        onRefreshState(updated);
        if (toastMessage) onTriggerToast(toastMessage);
      }
    } catch (e) {
      console.error("Roster action error:", e);
      onTriggerToast("Failed to update weekly serving roster");
    }
  };

  // ===========================================================================
  // ADVANCED CONFLICT, DOUBLE-BOOKING & BLOCKOUT DETECTION ENGINE
  // ===========================================================================
  const rosterDiagnostics = useMemo(() => {
    const conflicts: Array<{
      id: string;
      weekId: string;
      weekLabel: string;
      sundayDateIso: string;
      role: CrewRole;
      type: "SWAP_REQUESTED" | "BLOCKOUT_COLLISION" | "DOUBLE_BOOKED";
      operatorName: string;
      operatorId: string;
      detail: string;
    }> = [];

    let totalSlots = 0;
    let confirmedSlots = 0;
    let pendingSlots = 0;
    let swapRequestedSlots = 0;

    weeklyRoster.forEach((week) => {
      const primaryCountByUser: Record<string, CrewRole[]> = {};

      ROLES_ORDER.forEach((role) => {
        const slot = week.slots[role];
        if (!slot) return;
        totalSlots++;
        if (slot.status === "CONFIRMED") confirmedSlots++;
        if (slot.status === "PENDING") pendingSlots++;
        if (slot.status === "SWAP_REQUESTED") {
          swapRequestedSlots++;
          conflicts.push({
            id: `swap-${week.id}-${role}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            sundayDateIso: week.sundayDateIso,
            role,
            type: "SWAP_REQUESTED",
            operatorName: slot.primaryUserName,
            operatorId: slot.primaryUserId,
            detail:
              slot.swapReason ||
              "Operator requested shift cover for this Sunday",
          });
        }

        // Track primary assignments per user on this Sunday
        if (!primaryCountByUser[slot.primaryUserId]) {
          primaryCountByUser[slot.primaryUserId] = [];
        }
        primaryCountByUser[slot.primaryUserId].push(role);

        // Check blockout collision
        const blockoutMatch = rosterBlockouts.find(
          (b) =>
            b.userId === slot.primaryUserId &&
            b.sundayDateIso === week.sundayDateIso
        );
        if (blockoutMatch && slot.status !== "SWAP_REQUESTED") {
          conflicts.push({
            id: `blk-col-${week.id}-${role}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            sundayDateIso: week.sundayDateIso,
            role,
            type: "BLOCKOUT_COLLISION",
            operatorName: slot.primaryUserName,
            operatorId: slot.primaryUserId,
            detail: `Marked Unavailable: "${blockoutMatch.reason}"`,
          });
        }
      });

      // Check double-booked primary operators on the same Sunday
      Object.entries(primaryCountByUser).forEach(([userId, roles]) => {
        if (roles.length > 1) {
          const usr = users.find((u) => u.id === userId);
          conflicts.push({
            id: `dbl-${week.id}-${userId}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            sundayDateIso: week.sundayDateIso,
            role: roles[1],
            type: "DOUBLE_BOOKED",
            operatorName: usr?.name || "Operator",
            operatorId: userId,
            detail: `Double-booked as Primary on ${roles.join(" & ")} on ${week.weekLabel}`,
          });
        }
      });
    });

    const confirmationPct =
      totalSlots > 0 ? Math.round((confirmedSlots / totalSlots) * 100) : 100;

    return {
      totalSlots,
      confirmedSlots,
      pendingSlots,
      swapRequestedSlots,
      confirmationPct,
      conflicts,
    };
  }, [weeklyRoster, rosterBlockouts, users]);

  // ===========================================================================
  // WORKLOAD & FAIRNESS ANALYTICS PER OPERATOR
  // ===========================================================================
  const operatorWorkloadStats = useMemo(() => {
    return users.map((user) => {
      let primaryCount = 0;
      let backupCount = 0;
      let confirmedCount = 0;
      const assignedWeeks: string[] = [];

      weeklyRoster.forEach((week) => {
        ROLES_ORDER.forEach((role) => {
          const slot = week.slots[role];
          if (!slot) return;
          if (slot.primaryUserId === user.id) {
            primaryCount++;
            if (slot.status === "CONFIRMED") confirmedCount++;
            assignedWeeks.push(
              `${week.weekLabel.replace(/,\s*\d{4}/, "")} (${ROLE_STATION_META[role].code.split("-")[0]})`
            );
          }
          if (slot.backupUserId === user.id) {
            backupCount++;
          }
        });
      });

      const userBlockouts = rosterBlockouts.filter(
        (b) => b.userId === user.id
      );

      return {
        user,
        primaryCount,
        backupCount,
        confirmedCount,
        assignedWeeks,
        userBlockouts,
      };
    });
  }, [users, weeklyRoster, rosterBlockouts]);

  // Filtered Roles to display in the Table Rows
  const visibleRoles = useMemo(() => {
    return ROLES_ORDER.filter((role) => {
      if (roleFilter !== "ALL" && role !== roleFilter) return false;
      if (viewMode === "MY_SHIFTS") {
        // Show role row if currentUser is primary or backup in any week for this role
        return weeklyRoster.some(
          (w) =>
            w.slots[role]?.primaryUserId === currentUser.id ||
            w.slots[role]?.backupUserId === currentUser.id
        );
      }
      if (viewMode === "CONFLICTS_AND_SWAPS") {
        return rosterDiagnostics.conflicts.some((c) => c.role === role);
      }
      return true;
    });
  }, [roleFilter, viewMode, weeklyRoster, currentUser.id, rosterDiagnostics]);

  // ===========================================================================
  // EXPORT CSV & COPY WHATSAPP / TELEGRAM CALL-SHEET
  // ===========================================================================
  const handleExportRosterCsv = () => {
    const headers = [
      "Station Role",
      "Call Time (MYT)",
      "Weekly Custodian",
      ...weeklyRoster.map(
        (w) => `${w.weekLabel} (${w.serviceTheme})`
      ),
    ];

    const rows = ROLES_ORDER.map((role) => {
      const meta = ROLE_STATION_META[role];
      const weekCells = weeklyRoster.map((w) => {
        const s = w.slots[role];
        if (!s) return "Unassigned";
        const backupStr = s.backupUserName ? ` | Backup: ${s.backupUserName}` : "";
        return `"${s.primaryUserName} (${s.primaryCallsign}) [${s.status}]${backupStr}"`;
      });
      return [
        `"${meta.label} (${meta.code})"`,
        `"${meta.callTime}"`,
        meta.isWeeklyReportCustodian ? "YES (Weekly Report)" : "NO",
        ...weekCells,
      ];
    });

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `sunday-serving-roster-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onTriggerToast("Weekly Serving Roster CSV exported");
  };

  const handleCopyWeekCallSheet = (week: WeeklyServiceRoster) => {
    const lines = [
      `📡 *SUNDAY BROADCAST SERVING ROSTER — ${week.weekLabel.toUpperCase()}*`,
      `🎯 Theme: ${week.serviceTheme}`,
      `⏰ Malaysia Schedule: ${week.checkStartMyt} Check · ${week.earlyGoLiveMyt} Go-Live · ${week.serviceStartMyt} Service`,
      `─────────────────────────────────────`,
      ...ROLES_ORDER.map((role) => {
        const s = week.slots[role];
        const meta = ROLE_STATION_META[role];
        const statusIcon =
          s?.status === "CONFIRMED"
            ? "✅"
            : s?.status === "SWAP_REQUESTED"
            ? "🔄"
            : "⏳";
        const backupTxt = s?.backupUserName
          ? ` (Backup: ${s.backupUserName})`
          : "";
        return `${statusIcon} *${meta.label} (${s?.primaryCallsign || meta.code})*: ${s?.primaryUserName || "TBD"}${backupTxt} — Call: ${s?.callTimeMyt || meta.callTime}`;
      }),
      `─────────────────────────────────────`,
      `📋 *Weekly Report Co-Custodians*: ${week.slots.QC?.primaryUserName || "QC"} (QC) & ${week.slots.MODERATOR?.primaryUserName || "MOD"} (Moderator)`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    onTriggerToast(`Copied ${week.weekLabel} Call-Sheet to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. TOP EXECUTIVE ROSTER TELEMETRY & ACTION BAR
         ===================================================================== */}
      <div className="rounded-3xl p-5 sm:p-6 bg-[#121215] border border-white/[0.08] space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
                Malaysia Sunday Broadcast Roster
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs font-mono text-zinc-300">
                06:00 AM Check → 08:25 AM Early Go-Live (-5m) → 08:30 AM Service
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
              Weekly Serving Table &amp; Smart Station Rotation
            </h2>
            <p className="text-xs text-zinc-400">
              Multi-week serving matrix with AI Robotic operator profiles, 1-click shift confirmation, swap coverage, blockout collision detection, and live Pre-Flight sync.
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowBlockoutDrawer(!showBlockoutDrawer)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                showBlockoutDrawer
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1]"
              }`}
            >
              <span>Unavailable / Leave Dates</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px] font-mono">
                {rosterBlockouts.length}
              </span>
            </button>

            {isDirector && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    postRosterAction(
                      { action: "AUTO_ROTATE_ROSTER" },
                      "Smart Auto-Rotation balanced across all Sunday weeks"
                    )
                  }
                  className="px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-400 hover:text-black text-emerald-300 border border-emerald-500/35 text-xs font-semibold transition"
                >
                  Auto-Balance &amp; Rotate ✦
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddWeekModal(!showAddWeekModal)}
                  className="px-3.5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  + Add Sunday Week
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportRosterCsv}
              className="px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards + View Mode Switcher */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Roster Confirmation
              </div>
              <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                {rosterDiagnostics.confirmationPct}%
              </div>
              <div className="text-[11px] text-zinc-400">
                {rosterDiagnostics.confirmedSlots} of {rosterDiagnostics.totalSlots} shifts confirmed
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>

          <div className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Awaiting Confirmation
              </div>
              <div className="text-xl font-bold text-amber-300 tabular-nums mt-0.5">
                {rosterDiagnostics.pendingSlots}
              </div>
              <div className="text-[11px] text-zinc-400">
                Operators can 1-click Confirm
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>

          <div className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Swaps &amp; Conflicts
              </div>
              <div
                className={`text-xl font-bold tabular-nums mt-0.5 ${
                  rosterDiagnostics.conflicts.length > 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                }`}
              >
                {rosterDiagnostics.conflicts.length}
              </div>
              <div className="text-[11px] text-zinc-400">
                {rosterDiagnostics.swapRequestedSlots} open swap requests
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                rosterDiagnostics.conflicts.length > 0
                  ? "bg-rose-500 animate-ping"
                  : "bg-emerald-400"
              }`}
            />
          </div>

          <div className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.06] flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Synced Live Pre-Flight Week
              </div>
              <div className="text-sm font-bold text-emerald-300 truncate mt-1">
                {weeklyRoster.find((w) => w.syncedToPreFlight)?.weekLabel ||
                  weeklyRoster[0]?.weekLabel}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                Custodians:{" "}
                {weeklyRoster.find((w) => w.syncedToPreFlight)?.slots.QC
                  ?.primaryUserName || "Daniel"}{" "}
                &amp;{" "}
                {weeklyRoster.find((w) => w.syncedToPreFlight)?.slots.MODERATOR
                  ?.primaryUserName || "Hannah"}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold shrink-0">
              LIVE
            </span>
          </div>
        </div>

        {/* Filter Bar: View Scope + Station Role Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="inline-flex flex-wrap items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.07]">
            <button
              type="button"
              onClick={() => setViewMode("ALL_STATIONS")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                viewMode === "ALL_STATIONS"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All 5 Stations ({weeklyRoster.length} Weeks)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MY_SHIFTS")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                viewMode === "MY_SHIFTS"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              My Serving Shifts ({currentUser.name})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CONFLICTS_AND_SWAPS")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === "CONFLICTS_AND_SWAPS"
                  ? "bg-rose-500 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Swaps &amp; Conflicts</span>
              {rosterDiagnostics.conflicts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-mono font-bold">
                  {rosterDiagnostics.conflicts.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                roleFilter === "ALL"
                  ? "bg-white text-black font-semibold"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white"
              }`}
            >
              All Roles
            </button>
            {ROLES_ORDER.map((r) => {
              const meta = ROLE_STATION_META[r];
              const active = roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(active ? "ALL" : r)}
                  className={`px-3 py-1 rounded-full text-xs transition flex items-center gap-1.5 ${
                    active
                      ? "bg-white text-black font-semibold"
                      : meta.pill
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. ADD NEW SUNDAY WEEK DRAWER (DIRECTOR)
         ===================================================================== */}
      {showAddWeekModal && isDirector && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            postRosterAction(
              {
                action: "ADD_ROSTER_WEEK",
                serviceTheme:
                  newWeekTheme.trim() || "Sunday Celebration Broadcast",
              },
              "Added new upcoming Sunday column to the Weekly Serving Roster"
            );
            setNewWeekTheme("");
            setShowAddWeekModal(false);
          }}
          className="rounded-2xl p-5 bg-[#141418] border border-white/[0.12] flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div className="flex-1 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              Append Next Sunday Column (+7 Days)
            </span>
            <label className="text-xs text-zinc-300 block">
              Sunday Service Theme / Broadcast Title
            </label>
            <input
              type="text"
              placeholder="e.g. Baptism & Thanksgiving Sunday Broadcast"
              value={newWeekTheme}
              onChange={(e) => setNewWeekTheme(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddWeekModal(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-zinc-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              Add Sunday Week Column
            </button>
          </div>
        </form>
      )}

      {/* =====================================================================
          3. OPERATOR UNAVAILABLE / BLOCKOUT DATES DRAWER
         ===================================================================== */}
      {showBlockoutDrawer && (
        <div className="rounded-3xl p-5 bg-[#141418] border border-white/[0.12] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                Crew Availability &amp; Leave Registry
              </span>
              <h3 className="text-base font-semibold text-white">
                Unavailable / Blockout Sundays
              </h3>
            </div>
            <span className="text-xs text-zinc-400">
              Auto-Rotation automatically skips operators on their blocked-out Sundays
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              postRosterAction(
                {
                  action: "ADD_ROSTER_BLOCKOUT",
                  userId: blockoutUserId,
                  sundayDateIso: blockoutSundayIso,
                  reason:
                    blockoutReason.trim() || "Outstation / Family Commitment",
                },
                "Registered unavailable Sunday blockout date"
              );
              setBlockoutReason("");
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-3">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Operator Account
              </label>
              <select
                value={blockoutUserId}
                onChange={(e) => setBlockoutUserId(e.target.value)}
                disabled={!isDirector}
                aria-label="Operator Account"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-60"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.callsign} · {u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Sunday Date
              </label>
              <select
                value={blockoutSundayIso}
                onChange={(e) => setBlockoutSundayIso(e.target.value)}
                aria-label="Sunday Date"
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {weeklyRoster.map((w) => (
                  <option key={w.id} value={w.sundayDateIso}>
                    {w.weekLabel} ({w.sundayDateIso})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Reason / Leave Note
              </label>
              <input
                type="text"
                placeholder="e.g. Outstation travel / Family wedding"
                value={blockoutReason}
                onChange={(e) => setBlockoutReason(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
              >
                + Log Leave
              </button>
            </div>
          </form>

          {/* Existing Blockouts List */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {rosterBlockouts.length === 0 ? (
              <span className="text-xs text-zinc-500">
                No unavailable Sunday dates logged. All crew available.
              </span>
            ) : (
              rosterBlockouts.map((blk) => (
                <div
                  key={blk.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-amber-500/30 text-xs"
                >
                  <span className="font-semibold text-amber-300">
                    {blk.userName}
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="font-mono text-zinc-200">
                    {blk.sundayDateIso}
                  </span>
                  <span className="text-zinc-400">({blk.reason})</span>
                  {(isDirector || blk.userId === currentUser.id) && (
                    <button
                      type="button"
                      onClick={() =>
                        postRosterAction(
                          { action: "REMOVE_ROSTER_BLOCKOUT", id: blk.id },
                          "Removed blockout date"
                        )
                      }
                      className="text-zinc-500 hover:text-rose-400 font-bold ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          4. REAL-TIME SWAP REQUEST & CONFLICT RADAR BANNER
         ===================================================================== */}
      {rosterDiagnostics.conflicts.length > 0 && (
        <div className="rounded-2xl p-4 bg-[#191014] border border-rose-500/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Active Shift Swap Requests &amp; Schedule Conflicts ({rosterDiagnostics.conflicts.length})
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Any available operator can click &ldquo;Cover Shift&rdquo; or Director can reassign
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {rosterDiagnostics.conflicts.map((conf) => {
              const roleMeta = ROLE_STATION_META[conf.role];
              return (
                <div
                  key={conf.id}
                  className="rounded-xl p-3 bg-[#110b0e] border border-rose-500/30 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${roleMeta.pill}`}
                      >
                        {roleMeta.label}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {conf.weekLabel}
                      </span>
                      <span className="text-xs text-rose-300 font-medium">
                        · {conf.operatorName}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {conf.detail}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {conf.operatorId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() =>
                          postRosterAction(
                            {
                              action: "CLAIM_ROSTER_SWAP",
                              weekId: conf.weekId,
                              role: conf.role,
                              claimingUserId: currentUser.id,
                            },
                            `${currentUser.name} covered ${roleMeta.label} on ${conf.weekLabel}`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black text-[11px] font-bold transition"
                      >
                        ⚡ Cover Shift ({currentUser.name.split(" ")[0]})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingCell({
                          weekId: conf.weekId,
                          role: conf.role,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 text-[11px] font-medium transition"
                    >
                      Reassign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          5. SWAP REQUEST REASON MODAL (WHEN AN OPERATOR CLICKS "REQUEST SWAP")
         ===================================================================== */}
      {swapPromptCell && (
        <div className="rounded-2xl p-4 bg-[#16131a] border border-violet-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="text-xs font-semibold text-violet-300">
              Request Shift Cover — {ROLE_STATION_META[swapPromptCell.role].label} on{" "}
              {swapPromptCell.weekLabel}
            </div>
            <input
              type="text"
              placeholder="Enter reason for swap (e.g., Outstation work trip / Family event)..."
              value={swapReasonText}
              onChange={(e) => setSwapReasonText(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSwapPromptCell(null);
                setSwapReasonText("");
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-zinc-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                postRosterAction(
                  {
                    action: "REQUEST_ROSTER_SWAP",
                    weekId: swapPromptCell.weekId,
                    role: swapPromptCell.role,
                    requestedBy: currentUser.name,
                    reason:
                      swapReasonText.trim() ||
                      "Requesting teammate cover for this Sunday",
                  },
                  `Swap requested for ${ROLE_STATION_META[swapPromptCell.role].label} (${swapPromptCell.weekLabel})`
                );
                setSwapPromptCell(null);
                setSwapReasonText("");
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold transition"
            >
              Submit Swap Request ⇄
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. MULTI-WEEK SUNDAY SERVING MATRIX TABLE (APPLE PRO STUDIO GRID)
         ===================================================================== */}
      <div className="rounded-3xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1150px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#151519]">
                {/* Sticky Station Column Header */}
                <th className="p-4 w-[250px] align-top border-r border-white/[0.07]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Broadcast Station &amp; Role
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    5 Department Positions
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 font-normal">
                    QC &amp; Moderator co-hold the Weekly Report for their rostered Sunday.
                  </div>
                </th>

                {/* Dynamic Upcoming Sunday Week Columns */}
                {weeklyRoster.map((week, idx) => {
                  const weekSlots = ROLES_ORDER.map((r) => week.slots[r]).filter(
                    Boolean
                  );
                  const weekConfirmed = weekSlots.filter(
                    (s) => s.status === "CONFIRMED"
                  ).length;
                  const weekPct =
                    weekSlots.length > 0
                      ? Math.round((weekConfirmed / weekSlots.length) * 100)
                      : 0;

                  return (
                    <th
                      key={week.id}
                      className={`p-4 align-top border-r border-white/[0.06] last:border-r-0 min-w-[245px] ${
                        week.syncedToPreFlight
                          ? "bg-emerald-500/[0.04]"
                          : ""
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            {idx === 0
                              ? "Week 1 · Upcoming"
                              : `Week ${idx + 1} · Rolling`}
                          </span>
                          {week.syncedToPreFlight ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[10px] font-extrabold tracking-tight">
                              Synced to Pre-Flight ✓
                            </span>
                          ) : (
                            isDirector && (
                              <button
                                type="button"
                                onClick={() =>
                                  postRosterAction(
                                    {
                                      action: "SYNC_ROSTER_WEEK_TO_LIVE",
                                      weekId: week.id,
                                    },
                                    `Synced ${week.weekLabel} crew to Live Pre-Flight, Shutdown & Weekly Report Custodians`
                                  )
                                }
                                title="Sync this Sunday's rostered crew into the active Pre-Flight Checklists and Weekly Report Custodians"
                                className="px-2.5 py-0.5 rounded-full bg-white/[0.07] hover:bg-emerald-400 hover:text-black text-zinc-300 text-[10px] font-semibold border border-white/[0.1] transition"
                              >
                                Sync to Live Pre-Flight ⚡
                              </button>
                            )
                          )}
                        </div>

                        <div>
                          <div className="text-base font-bold text-white tracking-tight">
                            {week.weekLabel}
                          </div>
                          {isDirector ? (
                            <input
                              type="text"
                              value={week.serviceTheme}
                              onChange={(e) =>
                                postRosterAction({
                                  action: "UPDATE_ROSTER_WEEK_META",
                                  weekId: week.id,
                                  serviceTheme: e.target.value,
                                })
                              }
                              aria-label="Service Theme"
                              className="mt-1 w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-white/25"
                            />
                          ) : (
                            <div className="text-xs text-zinc-400 font-normal mt-0.5 truncate">
                              {week.serviceTheme}
                            </div>
                          )}
                        </div>

                        {/* MYT Schedule Bar & Confirmation Progress */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                          <span>06:00 Check · 08:25 Go-Live</span>
                          <span
                            className={
                              weekPct === 100
                                ? "text-emerald-400 font-bold"
                                : "text-amber-300 font-bold"
                            }
                          >
                            {weekConfirmed}/5 Ready
                          </span>
                        </div>
                        <div className="w-full h-1 bg-white/[0.07] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              weekPct === 100 ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${weekPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-zinc-500 font-normal">
                            Report:{" "}
                            <strong className="text-zinc-300">
                              {week.slots.QC?.primaryUserName.split(" ")[0]} +{" "}
                              {
                                week.slots.MODERATOR?.primaryUserName.split(
                                  " "
                                )[0]
                              }
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyWeekCallSheet(week)}
                            className="text-[10px] font-medium text-zinc-400 hover:text-white underline underline-offset-2"
                          >
                            Copy Call-Sheet
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.07]">
              {visibleRoles.map((role) => {
                const roleMeta = ROLE_STATION_META[role];

                return (
                  <tr
                    key={role}
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Left Station Row Header */}
                    <td
                      className={`p-4 align-top border-r border-white/[0.07] bg-[#131317] ${roleMeta.leftBorder}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${roleMeta.pill}`}
                          >
                            {roleMeta.label}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {roleMeta.code}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-300 font-medium leading-snug">
                          {roleMeta.stationDesc}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-[10px] font-mono text-zinc-400">
                            Call: {roleMeta.callTime}
                          </span>
                          {roleMeta.isWeeklyReportCustodian && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/12 border border-emerald-500/25 text-[10px] font-semibold text-emerald-300">
                              Weekly Report Custodian
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Weekly Cells for this Station */}
                    {weeklyRoster.map((week) => {
                      const slot = week.slots[role];
                      if (!slot) return <td key={week.id} className="p-3" />;

                      const primaryUserObj = users.find(
                        (u) => u.id === slot.primaryUserId
                      );
                      const backupUserObj = users.find(
                        (u) => u.id === slot.backupUserId
                      );
                      const primaryAvatar = resolveRobotAvatarUrl(
                        primaryUserObj?.avatarUrl,
                        role,
                        slot.primaryCallsign
                      );
                      const backupAvatar = backupUserObj
                        ? resolveRobotAvatarUrl(
                            backupUserObj.avatarUrl,
                            backupUserObj.role,
                            backupUserObj.callsign
                          )
                        : null;

                      const isMyPrimarySlot =
                        slot.primaryUserId === currentUser.id;
                      const isMyBackupSlot =
                        slot.backupUserId === currentUser.id;
                      const isEditingThisCell =
                        editingCell?.weekId === week.id &&
                        editingCell?.role === role;

                      const isCertified =
                        primaryUserObj?.role === role ||
                        (Array.isArray(primaryUserObj?.certifiedRoles) &&
                          primaryUserObj.certifiedRoles.includes(role));

                      const hasBlockoutCollision = rosterBlockouts.some(
                        (b) =>
                          b.userId === slot.primaryUserId &&
                          b.sundayDateIso === week.sundayDateIso
                      );

                      const badgeSpec =
                        STATUS_BADGE_MAP[slot.status] ||
                        STATUS_BADGE_MAP.PENDING;

                      return (
                        <td
                          key={`${week.id}-${role}`}
                          className={`p-3.5 align-top border-r border-white/[0.06] last:border-r-0 transition ${
                            isMyPrimarySlot
                              ? roleMeta.cellHighlight
                              : slot.status === "SWAP_REQUESTED" ||
                                hasBlockoutCollision
                              ? "bg-rose-950/20"
                              : ""
                          }`}
                        >
                          <div className="flex flex-col justify-between h-full space-y-3">
                            {/* Top Row: Status Badge + Edit Button */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeSpec.style}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${badgeSpec.dot}`}
                                  />
                                  <span>{badgeSpec.label}</span>
                                </span>

                                <div className="flex items-center gap-1">
                                  {isMyPrimarySlot && (
                                    <span className="px-1.5 py-0.5 rounded bg-white text-black text-[9px] font-bold uppercase">
                                      You
                                    </span>
                                  )}
                                  {isDirector && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingCell(
                                          isEditingThisCell
                                            ? null
                                            : { weekId: week.id, role }
                                        )
                                      }
                                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.15] text-[10px] text-zinc-300 font-medium transition"
                                    >
                                      {isEditingThisCell ? "Done" : "Edit"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Primary Operator Card with AI Robotic Profile Picture */}
                              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#09090b] border border-white/[0.07]">
                                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0">
                                  <img
                                    src={primaryAvatar}
                                    alt={slot.primaryUserName}
                                    className="w-full h-full object-cover"
                                  />
                                  <span
                                    className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black ${roleMeta.dot}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-white truncate">
                                      {slot.primaryUserName}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-white/[0.05]">
                                      {slot.primaryCallsign}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className={`text-[10px] ${
                                        isCertified
                                          ? "text-emerald-400"
                                          : "text-amber-300"
                                      }`}
                                    >
                                      {isCertified
                                        ? "✓ Role Certified"
                                        : "⚡ Cross-Trained"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Backup / Shadow Operator Pill */}
                              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px]">
                                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                                  Backup:
                                </span>
                                {slot.backupUserName ? (
                                  <div className="flex items-center gap-1.5">
                                    {backupAvatar && (
                                      <img
                                        src={backupAvatar}
                                        alt={slot.backupUserName}
                                        className="w-4 h-4 rounded-full object-cover border border-white/15"
                                      />
                                    )}
                                    <span className="text-zinc-300 font-medium">
                                      {slot.backupUserName}
                                    </span>
                                    {isMyBackupSlot && (
                                      <span className="text-[9px] font-mono text-amber-300">
                                        (You)
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-zinc-600">None</span>
                                )}
                              </div>

                              {/* Shift Assignment Note */}
                              {slot.notes && (
                                <div className="text-[11px] text-zinc-400 leading-snug px-1">
                                  {slot.notes}
                                </div>
                              )}

                              {/* Swap Reason / Blockout Warning if present */}
                              {slot.status === "SWAP_REQUESTED" &&
                                slot.swapReason && (
                                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-200">
                                    <strong>Swap Note:</strong> {slot.swapReason}
                                  </div>
                                )}

                              {hasBlockoutCollision && (
                                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/35 text-[10px] text-amber-200">
                                  ⚠️ Operator logged Leave on {week.weekLabel}
                                </div>
                              )}

                              {/* Inline Director Reassignment Controls */}
                              {isEditingThisCell && isDirector && (
                                <div className="p-2.5 rounded-xl bg-[#16161c] border border-white/[0.15] space-y-2">
                                  <div>
                                    <label className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                                      Primary Operator
                                    </label>
                                    <select
                                      value={slot.primaryUserId}
                                      onChange={(e) =>
                                        postRosterAction(
                                          {
                                            action: "UPDATE_ROSTER_SLOT",
                                            weekId: week.id,
                                            role,
                                            primaryUserId: e.target.value,
                                            status: "CONFIRMED",
                                          },
                                          `Assigned Primary ${roleMeta.label} on ${week.weekLabel}`
                                        )
                                      }
                                      aria-label="Primary Operator"
                                      className="w-full bg-[#09090b] border border-white/[0.12] rounded-lg px-2 py-1 text-[11px] text-white"
                                    >
                                      {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} ({u.callsign} · {u.role})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                                      Backup / Shadow Operator
                                    </label>
                                    <select
                                      value={slot.backupUserId || ""}
                                      onChange={(e) =>
                                        postRosterAction(
                                          {
                                            action: "UPDATE_ROSTER_SLOT",
                                            weekId: week.id,
                                            role,
                                            backupUserId:
                                              e.target.value || null,
                                          },
                                          `Updated Backup ${roleMeta.label} on ${week.weekLabel}`
                                        )
                                      }
                                      aria-label="Backup Operator"
                                      className="w-full bg-[#09090b] border border-white/[0.12] rounded-lg px-2 py-1 text-[11px] text-white"
                                    >
                                      <option value="">No Backup</option>
                                      {users
                                        .filter(
                                          (u) => u.id !== slot.primaryUserId
                                        )
                                        .map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name} ({u.callsign})
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                                      Station Shift Note
                                    </label>
                                    <input
                                      type="text"
                                      defaultValue={slot.notes || ""}
                                      onBlur={(e) =>
                                        postRosterAction({
                                          action: "UPDATE_ROSTER_SLOT",
                                          weekId: week.id,
                                          role,
                                          notes: e.target.value,
                                        })
                                      }
                                      placeholder="Station notes..."
                                      className="w-full bg-[#09090b] border border-white/[0.12] rounded-lg px-2 py-1 text-[11px] text-white"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Bottom Cell Action Footer: 1-Click Confirm / Swap / Cover */}
                            <div className="pt-2 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-1.5">
                              {slot.status === "SWAP_REQUESTED" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    postRosterAction(
                                      {
                                        action: "CLAIM_ROSTER_SWAP",
                                        weekId: week.id,
                                        role,
                                        claimingUserId: currentUser.id,
                                      },
                                      `${currentUser.name} covered ${roleMeta.label} on ${week.weekLabel}`
                                    )
                                  }
                                  className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black text-[11px] font-bold transition text-center"
                                >
                                  ⚡ Cover This Shift ({currentUser.name.split(" ")[0]})
                                </button>
                              ) : isMyPrimarySlot || isDirector ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      postRosterAction(
                                        {
                                          action: "CONFIRM_ROSTER_SLOT",
                                          weekId: week.id,
                                          role,
                                        },
                                        slot.status === "CONFIRMED"
                                          ? `Marked ${roleMeta.label} (${week.weekLabel}) as Pending`
                                          : `Confirmed ${slot.primaryUserName} for ${roleMeta.label} (${week.weekLabel})`
                                      )
                                    }
                                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
                                      slot.status === "CONFIRMED"
                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                                        : "bg-white text-black hover:bg-zinc-200"
                                    }`}
                                  >
                                    {slot.status === "CONFIRMED"
                                      ? "✓ Confirmed"
                                      : "Confirm Shift"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSwapPromptCell({
                                        weekId: week.id,
                                        weekLabel: week.weekLabel,
                                        role,
                                      })
                                    }
                                    className="py-1 px-2 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/[0.07] text-[10px] font-medium transition"
                                  >
                                    ⇄ Swap
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {slot.confirmedAt ||
                                    `Call ${slot.callTimeMyt}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          7. OPERATOR WORKLOAD & FAIRNESS ANALYTICS MATRIX
         ===================================================================== */}
      <div className="rounded-3xl p-5 sm:p-6 bg-[#121215] border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Crew Workload &amp; Rotation Balance
            </span>
            <h3 className="text-base font-semibold text-white">
              Operator Serving Load Across {weeklyRoster.length} Scheduled Sundays
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            Tracks Primary station duty, Backup shadow duty, and Leave dates per account
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {operatorWorkloadStats.map(
            ({
              user,
              primaryCount,
              backupCount,
              confirmedCount,
              assignedWeeks,
              userBlockouts,
            }) => {
              const roleMeta =
                ROLE_STATION_META[user.role] || ROLE_STATION_META.CAMERA;
              const avatarUri = resolveRobotAvatarUrl(
                user.avatarUrl,
                user.role,
                user.callsign
              );

              return (
                <div
                  key={user.id}
                  className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.07] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0">
                        <img
                          src={avatarUri}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {user.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-zinc-400">
                            {user.callsign}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase ${roleMeta.pill}`}
                          >
                            {roleMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="text-sm font-bold text-white tabular-nums">
                          {primaryCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Primary
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="text-sm font-bold text-zinc-300 tabular-nums">
                          {backupCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Backup
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="text-sm font-bold text-emerald-400 tabular-nums">
                          {confirmedCount}/{primaryCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Confirmed
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.05] space-y-1">
                    <div className="text-[10px] text-zinc-400 truncate">
                      <strong className="text-zinc-300">Weeks:</strong>{" "}
                      {assignedWeeks.length > 0
                        ? assignedWeeks.join(", ")
                        : "None"}
                    </div>
                    {userBlockouts.length > 0 && (
                      <div className="text-[10px] text-amber-300 truncate">
                        Leave: {userBlockouts.map((b) => b.sundayDateIso).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

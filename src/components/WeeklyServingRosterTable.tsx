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
    hardwareSpec: string;
    keyDuties: string;
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
    hardwareSpec: "ATEM Switcher · Master Control",
    keyDuties: "All-station poll · 08:25 AM Early Go-Live (-5m) Sign-Off",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-rose-400",
    text: "text-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    leftBorder: "border-l-[3px] border-l-rose-400",
    cellHighlight: "bg-rose-500/[0.04]",
  },
  CAMERA: {
    label: "Camera",
    code: "CAM-01",
    hardwareSpec: "Sony FX3 Rig · Cam 1 & Cam 2",
    keyDuties: "5600K White Balance · IG Top/Bottom Blur + 16:9 Center",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-amber-400",
    text: "text-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    leftBorder: "border-l-[3px] border-l-amber-400",
    cellHighlight: "bg-amber-500/[0.04]",
  },
  AUDIO: {
    label: "Audio",
    code: "A1-MIX",
    hardwareSpec: "Allen & Heath SQ · Broadcast Bus",
    keyDuties: "-14 LUFS Stream Target · Wireless RF Mics & Aux Matrix",
    callTime: "06:00 AM MYT",
    isWeeklyReportCustodian: false,
    dot: "bg-sky-400",
    text: "text-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    leftBorder: "border-l-[3px] border-l-sky-400",
    cellHighlight: "bg-sky-500/[0.04]",
  },
  MODERATOR: {
    label: "Moderator",
    code: "MOD-01",
    hardwareSpec: "YouTube & IG Live Engagement Desk",
    keyDuties: "Live Chat, Prayer Wall & Visitor Welcome · Holds Weekly Report",
    callTime: "07:00 AM MYT",
    isWeeklyReportCustodian: true,
    dot: "bg-violet-400",
    text: "text-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
    leftBorder: "border-l-[3px] border-l-violet-400",
    cellHighlight: "bg-violet-500/[0.04]",
  },
  QC: {
    label: "Quality Control",
    code: "QC-01",
    hardwareSpec: "Dual-Stream Telemetry & Program QC",
    keyDuties: "YT 1080p60 & IG MAINSTREAM Blur QC · Holds Weekly Report",
    callTime: "06:30 AM MYT",
    isWeeklyReportCustodian: true,
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    leftBorder: "border-l-[3px] border-l-emerald-400",
    cellHighlight: "bg-emerald-500/[0.04]",
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

  // View Filter
  const [viewMode, setViewMode] = useState<
    "ALL_STATIONS" | "MY_SHIFTS" | "SWAPS_ONLY"
  >("ALL_STATIONS");

  // Swap Request Inline Prompt
  const [swapPromptCell, setSwapPromptCell] = useState<{
    weekId: string;
    weekLabel: string;
    role: CrewRole;
  } | null>(null);
  const [swapReasonText, setSwapReasonText] = useState("");

  // Unavailable / Leave Dates Drawer
  const [showBlockoutDrawer, setShowBlockoutDrawer] = useState(false);
  const [blockoutUserId, setBlockoutUserId] = useState(currentUser.id);
  const [blockoutSundayIso, setBlockoutSundayIso] = useState(
    weeklyRoster[1]?.sundayDateIso || "2026-10-25"
  );
  const [blockoutReason, setBlockoutReason] = useState("");

  // Add Sunday Week Drawer
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekTheme, setNewWeekTheme] = useState("");

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
  // CONFLICT, DOUBLE-BOOKING & SWAP DIAGNOSTICS
  // ===========================================================================
  const rosterDiagnostics = useMemo(() => {
    const alerts: Array<{
      id: string;
      weekId: string;
      weekLabel: string;
      role: CrewRole;
      type: "SWAP_REQUESTED" | "BLOCKOUT_COLLISION" | "DOUBLE_BOOKED";
      operatorName: string;
      operatorId: string;
      detail: string;
    }> = [];

    let totalSlots = 0;
    let confirmedSlots = 0;

    weeklyRoster.forEach((week) => {
      const assignedByUser: Record<string, CrewRole[]> = {};

      ROLES_ORDER.forEach((role) => {
        const slot = week.slots[role];
        if (!slot) return;
        totalSlots++;
        if (slot.status === "CONFIRMED") confirmedSlots++;

        if (slot.status === "SWAP_REQUESTED") {
          alerts.push({
            id: `swap-${week.id}-${role}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            role,
            type: "SWAP_REQUESTED",
            operatorName: slot.primaryUserName,
            operatorId: slot.primaryUserId,
            detail:
              slot.swapReason ||
              "Requested teammate shift cover for this Sunday",
          });
        }

        if (!assignedByUser[slot.primaryUserId]) {
          assignedByUser[slot.primaryUserId] = [];
        }
        assignedByUser[slot.primaryUserId].push(role);

        const blockoutMatch = rosterBlockouts.find(
          (b) =>
            b.userId === slot.primaryUserId &&
            b.sundayDateIso === week.sundayDateIso
        );
        if (blockoutMatch && slot.status !== "SWAP_REQUESTED") {
          alerts.push({
            id: `blk-${week.id}-${role}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            role,
            type: "BLOCKOUT_COLLISION",
            operatorName: slot.primaryUserName,
            operatorId: slot.primaryUserId,
            detail: `Unavailable: "${blockoutMatch.reason}"`,
          });
        }
      });

      Object.entries(assignedByUser).forEach(([userId, roles]) => {
        if (roles.length > 1) {
          const usr = users.find((u) => u.id === userId);
          alerts.push({
            id: `dbl-${week.id}-${userId}`,
            weekId: week.id,
            weekLabel: week.weekLabel,
            role: roles[1],
            type: "DOUBLE_BOOKED",
            operatorName: usr?.name || "Operator",
            operatorId: userId,
            detail: `Assigned to ${roles.join(" & ")} on the same Sunday`,
          });
        }
      });
    });

    const confirmationPct =
      totalSlots > 0 ? Math.round((confirmedSlots / totalSlots) * 100) : 100;

    return {
      totalSlots,
      confirmedSlots,
      confirmationPct,
      alerts,
    };
  }, [weeklyRoster, rosterBlockouts, users]);

  // ===========================================================================
  // OPERATOR SERVING SUMMARY (NO BACKUP CLUTTER)
  // ===========================================================================
  const operatorSummary = useMemo(() => {
    return users.map((user) => {
      let shiftCount = 0;
      let confirmedCount = 0;
      const datesServed: string[] = [];

      weeklyRoster.forEach((week) => {
        ROLES_ORDER.forEach((role) => {
          const slot = week.slots[role];
          if (slot && slot.primaryUserId === user.id) {
            shiftCount++;
            if (slot.status === "CONFIRMED") confirmedCount++;
            datesServed.push(
              week.weekLabel.replace(/^Sun,\s*/, "").replace(/\s+\d{4}$/, "")
            );
          }
        });
      });

      const leaveDates = rosterBlockouts.filter((b) => b.userId === user.id);

      return {
        user,
        shiftCount,
        confirmedCount,
        datesServed,
        leaveDates,
      };
    });
  }, [users, weeklyRoster, rosterBlockouts]);

  // Filtered Station Rows
  const visibleRoles = useMemo(() => {
    return ROLES_ORDER.filter((role) => {
      if (viewMode === "MY_SHIFTS") {
        return weeklyRoster.some(
          (w) => w.slots[role]?.primaryUserId === currentUser.id
        );
      }
      if (viewMode === "SWAPS_ONLY") {
        return rosterDiagnostics.alerts.some((a) => a.role === role);
      }
      return true;
    });
  }, [viewMode, weeklyRoster, currentUser.id, rosterDiagnostics]);

  // ===========================================================================
  // EXPORT CSV & COPY WHATSAPP SUNDAY CALL-SHEET
  // ===========================================================================
  const handleExportRosterCsv = () => {
    const headers = [
      "Station",
      "Call Time (MYT)",
      "Hardware & Key Duties",
      "Weekly Report Custodian",
      ...weeklyRoster.map((w) => `${w.weekLabel} (${w.serviceTheme})`),
    ];

    const rows = ROLES_ORDER.map((role) => {
      const meta = ROLE_STATION_META[role];
      const weekCells = weeklyRoster.map((w) => {
        const s = w.slots[role];
        if (!s) return "Unassigned";
        return `"${s.primaryUserName} (${s.primaryCallsign}) — ${s.status}${
          s.notes ? ` · ${s.notes}` : ""
        }"`;
      });
      return [
        `"${meta.label} (${meta.code})"`,
        `"${meta.callTime}"`,
        `"${meta.hardwareSpec} — ${meta.keyDuties}"`,
        meta.isWeeklyReportCustodian ? "YES" : "NO",
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
      `📡 *SUNDAY SERVING ROSTER — ${week.weekLabel.toUpperCase()}*`,
      `🎯 Service: ${week.serviceTheme}`,
      `⏰ Schedule: ${week.checkStartMyt} Check · ${week.earlyGoLiveMyt} Go-Live · ${week.serviceStartMyt} Live`,
      `─────────────────────────────────────`,
      ...ROLES_ORDER.map((role) => {
        const s = week.slots[role];
        const meta = ROLE_STATION_META[role];
        const icon =
          s?.status === "CONFIRMED"
            ? "✅"
            : s?.status === "SWAP_REQUESTED"
            ? "🔄"
            : "⏳";
        return `${icon} *${meta.label} (${s?.primaryCallsign || meta.code})*: ${
          s?.primaryUserName || "TBD"
        } · Call ${s?.callTimeMyt || meta.callTime}${
          s?.notes ? ` — ${s.notes}` : ""
        }`;
      }),
      `─────────────────────────────────────`,
      `📋 *Weekly Report Co-Custodians*: ${
        week.slots.QC?.primaryUserName || "QC"
      } (QC) & ${week.slots.MODERATOR?.primaryUserName || "MOD"} (Moderator)`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    onTriggerToast(`Copied ${week.weekLabel} Call-Sheet to clipboard`);
  };

  return (
    <div className="space-y-5">
      {/* =====================================================================
          1. CLEAN TOP CONTROL BAR
         ===================================================================== */}
      <div className="rounded-2xl p-4 sm:p-5 bg-[#121215] border border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              Weekly Serving Roster
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs font-mono text-zinc-300">
              06:00 AM Check → 08:25 AM Go-Live (-5m) → 08:30 AM Service
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold">
              {rosterDiagnostics.confirmedSlots}/{rosterDiagnostics.totalSlots}{" "}
              Confirmed ({rosterDiagnostics.confirmationPct}%)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Sunday Broadcast Crew Schedule &amp; Station Assignments
          </h2>
        </div>

        {/* Filter Pills & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode("ALL_STATIONS")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                viewMode === "ALL_STATIONS"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All 5 Stations
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MY_SHIFTS")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                viewMode === "MY_SHIFTS"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              My Shifts ({currentUser.name.split(" ")[0]})
            </button>
            {rosterDiagnostics.alerts.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("SWAPS_ONLY")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                  viewMode === "SWAPS_ONLY"
                    ? "bg-rose-500 text-white font-semibold"
                    : "text-rose-300 hover:text-white"
                }`}
              >
                <span>Swaps</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-[10px] font-mono font-bold">
                  {rosterDiagnostics.alerts.length}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowBlockoutDrawer(!showBlockoutDrawer)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
              showBlockoutDrawer
                ? "bg-white text-black border-white font-semibold"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1]"
            }`}
          >
            Leave Dates ({rosterBlockouts.length})
          </button>

          {isDirector && (
            <>
              <button
                type="button"
                onClick={() =>
                  postRosterAction(
                    { action: "AUTO_ROTATE_ROSTER" },
                    "Auto-rotated crew across all Sunday weeks"
                  )
                }
                className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-400 hover:text-black text-emerald-300 border border-emerald-500/35 text-xs font-semibold transition"
              >
                Auto-Rotate ✦
              </button>

              <button
                type="button"
                onClick={() => setShowAddWeekModal(!showAddWeekModal)}
                className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
              >
                + Add Sunday
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportRosterCsv}
            className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. COLLAPSIBLE ADD SUNDAY DRAWER & LEAVE DATES DRAWER
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
              "Added next Sunday to the Weekly Serving Table"
            );
            setNewWeekTheme("");
            setShowAddWeekModal(false);
          }}
          className="rounded-2xl p-4 bg-[#141418] border border-white/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold text-emerald-400 shrink-0">
              New Sunday (+7 Days):
            </span>
            <input
              type="text"
              placeholder="Enter Sunday Service Theme (e.g. Baptism & Thanksgiving Sunday)..."
              value={newWeekTheme}
              onChange={(e) => setNewWeekTheme(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddWeekModal(false)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] text-zinc-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              Add Week
            </button>
          </div>
        </form>
      )}

      {showBlockoutDrawer && (
        <div className="rounded-2xl p-4 bg-[#141418] border border-white/[0.12] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">
              Unavailable / Leave Sundays (Auto-Rotate skips operators on leave)
            </span>
            <button
              type="button"
              onClick={() => setShowBlockoutDrawer(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              postRosterAction(
                {
                  action: "ADD_ROSTER_BLOCKOUT",
                  userId: blockoutUserId,
                  sundayDateIso: blockoutSundayIso,
                  reason: blockoutReason.trim() || "Personal / Family Leave",
                },
                "Logged unavailable Sunday date"
              );
              setBlockoutReason("");
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            <select
              value={blockoutUserId}
              onChange={(e) => setBlockoutUserId(e.target.value)}
              disabled={!isDirector}
              aria-label="Operator Account"
              className="sm:col-span-3 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-60"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.callsign})
                </option>
              ))}
            </select>

            <select
              value={blockoutSundayIso}
              onChange={(e) => setBlockoutSundayIso(e.target.value)}
              aria-label="Sunday Date"
              className="sm:col-span-3 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {weeklyRoster.map((w) => (
                <option key={w.id} value={w.sundayDateIso}>
                  {w.weekLabel}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Reason (e.g. Outstation / Family wedding)"
              value={blockoutReason}
              onChange={(e) => setBlockoutReason(e.target.value)}
              className="sm:col-span-4 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />

            <button
              type="submit"
              className="sm:col-span-2 py-2 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              + Log Leave
            </button>
          </form>

          {rosterBlockouts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {rosterBlockouts.map((blk) => (
                <span
                  key={blk.id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#09090b] border border-amber-500/30 text-xs"
                >
                  <strong className="text-amber-300">{blk.userName}</strong>
                  <span className="font-mono text-zinc-300">
                    {blk.sundayDateIso}
                  </span>
                  <span className="text-zinc-400">({blk.reason})</span>
                  {(isDirector || blk.userId === currentUser.id) && (
                    <button
                      type="button"
                      onClick={() =>
                        postRosterAction(
                          { action: "REMOVE_ROSTER_BLOCKOUT", id: blk.id },
                          "Removed leave date"
                        )
                      }
                      className="text-zinc-500 hover:text-rose-400 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          3. SWAP REQUEST REASON PROMPT (WHEN OPERATOR CLICKS "SWAP")
         ===================================================================== */}
      {swapPromptCell && (
        <div className="rounded-2xl p-4 bg-[#181218] border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold text-rose-300 shrink-0">
              Request Swap · {ROLE_STATION_META[swapPromptCell.role].label} (
              {swapPromptCell.weekLabel}):
            </span>
            <input
              type="text"
              placeholder="Reason for swap (e.g. Attending cousin wedding morning session)..."
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
              Confirm Swap Request
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. MAIN WEEKLY SERVING TABLE (CLEAN, DETAILED & EASY TO USE)
         ===================================================================== */}
      <div className="rounded-3xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1120px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#151519]">
                {/* Station & Technical Scope Column Header */}
                <th className="p-4 w-[270px] align-top border-r border-white/[0.07]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Broadcast Station &amp; Scope
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    5 Core Sunday Roles
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-normal leading-snug">
                    Call time starts at 06:00 AM MYT. QC &amp; Moderator hold the Weekly Report.
                  </div>
                </th>

                {/* Upcoming Sunday Columns */}
                {weeklyRoster.map((week, idx) => {
                  const weekSlots = ROLES_ORDER.map((r) => week.slots[r]).filter(
                    Boolean
                  );
                  const weekConfirmed = weekSlots.filter(
                    (s) => s.status === "CONFIRMED"
                  ).length;
                  const allConfirmed =
                    weekSlots.length > 0 && weekConfirmed === weekSlots.length;

                  return (
                    <th
                      key={week.id}
                      className={`p-4 align-top border-r border-white/[0.06] last:border-r-0 min-w-[215px] ${
                        week.syncedToPreFlight ? "bg-emerald-500/[0.04]" : ""
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Week Badge + Live Pre-Flight Sync Button */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            {idx === 0 ? "This Sunday" : `Week ${idx + 1}`}
                          </span>

                          {week.syncedToPreFlight ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[10px] font-bold">
                              Active Pre-Flight ✓
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
                                    `Synced ${week.weekLabel} crew to Live Pre-Flight & Weekly Report`
                                  )
                                }
                                className="px-2 py-0.5 rounded-full bg-white/[0.07] hover:bg-emerald-400 hover:text-black text-zinc-300 text-[10px] font-semibold border border-white/[0.1] transition"
                              >
                                Sync to Pre-Flight ⚡
                              </button>
                            )
                          )}
                        </div>

                        {/* Sunday Date & Service Theme */}
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
                              className="mt-1 w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-white/25 font-normal"
                            />
                          ) : (
                            <div className="text-xs text-zinc-400 font-normal mt-0.5 truncate">
                              {week.serviceTheme}
                            </div>
                          )}
                        </div>

                        {/* Readiness Bar + Copy Call-Sheet */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span
                            className={`font-mono font-semibold ${
                              allConfirmed
                                ? "text-emerald-400"
                                : "text-amber-300"
                            }`}
                          >
                            {weekConfirmed}/5 Confirmed
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyWeekCallSheet(week)}
                            className="text-[11px] font-medium text-zinc-400 hover:text-white underline underline-offset-2"
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
                    {/* Left Station Row Info (Clean & Detailed) */}
                    <td
                      className={`p-4 align-top border-r border-white/[0.07] bg-[#131317] ${roleMeta.leftBorder}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${roleMeta.pill}`}
                          >
                            {roleMeta.label}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            Call {roleMeta.callTime}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white pt-0.5">
                          {roleMeta.hardwareSpec}
                        </div>

                        <div className="text-[11px] text-zinc-400 leading-relaxed">
                          {roleMeta.keyDuties}
                        </div>

                        {roleMeta.isWeeklyReportCustodian && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/12 border border-emerald-500/25 text-[10px] font-semibold text-emerald-300">
                              ★ Holds Weekly Report
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Weekly Serving Cell (No Backup Clutter, Direct & Easy to Use) */}
                    {weeklyRoster.map((week) => {
                      const slot = week.slots[role];
                      if (!slot) return <td key={week.id} className="p-3.5" />;

                      const assignedUser = users.find(
                        (u) => u.id === slot.primaryUserId
                      );
                      const avatarUri = resolveRobotAvatarUrl(
                        assignedUser?.avatarUrl,
                        role,
                        slot.primaryCallsign
                      );
                      const isMySlot = slot.primaryUserId === currentUser.id;
                      const hasLeaveCollision = rosterBlockouts.some(
                        (b) =>
                          b.userId === slot.primaryUserId &&
                          b.sundayDateIso === week.sundayDateIso
                      );

                      return (
                        <td
                          key={`${week.id}-${role}`}
                          className={`p-3.5 align-top border-r border-white/[0.06] last:border-r-0 transition ${
                            slot.status === "SWAP_REQUESTED" ||
                            hasLeaveCollision
                              ? "bg-rose-950/20"
                              : isMySlot
                              ? roleMeta.cellHighlight
                              : ""
                          }`}
                        >
                          <div className="flex flex-col justify-between h-full gap-2.5">
                            <div className="space-y-2.5">
                              {/* Operator Identity Row with AI Robotic Profile Pic */}
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0">
                                  <img
                                    src={avatarUri}
                                    alt={slot.primaryUserName}
                                    className="w-full h-full object-cover"
                                  />
                                  <span
                                    className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black ${roleMeta.dot}`}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  {isDirector ? (
                                    /* Direct 1-Click Operator Dropdown for Director */
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
                                          `Assigned ${roleMeta.label} on ${week.weekLabel}`
                                        )
                                      }
                                      aria-label={`Assign ${roleMeta.label} for ${week.weekLabel}`}
                                      className="w-full bg-[#09090b] border border-white/[0.12] hover:border-white/30 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                                    >
                                      {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} ({u.callsign})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-white truncate">
                                        {slot.primaryUserName}
                                      </span>
                                      {isMySlot && (
                                        <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-bold uppercase">
                                          You
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      {slot.primaryCallsign}
                                    </span>
                                    <span className="text-zinc-700">·</span>
                                    {slot.status === "CONFIRMED" ? (
                                      <span className="text-[10px] font-semibold text-emerald-400">
                                        ✓ Confirmed
                                      </span>
                                    ) : slot.status === "SWAP_REQUESTED" ? (
                                      <span className="text-[10px] font-semibold text-rose-400 animate-pulse">
                                        ⇄ Swap Open
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-amber-300">
                                        • Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Clean Duty Focus Note (Editable by Director, Readable by Crew) */}
                              {isDirector ? (
                                <input
                                  type="text"
                                  defaultValue={slot.notes || ""}
                                  onBlur={(e) => {
                                    if (e.target.value !== (slot.notes || "")) {
                                      postRosterAction({
                                        action: "UPDATE_ROSTER_SLOT",
                                        weekId: week.id,
                                        role,
                                        notes: e.target.value,
                                      });
                                    }
                                  }}
                                  placeholder="Station focus note..."
                                  className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-white/25 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 focus:outline-none"
                                />
                              ) : (
                                slot.notes && (
                                  <div className="text-[11px] text-zinc-400 leading-snug bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/[0.05]">
                                    {slot.notes}
                                  </div>
                                )
                              )}

                              {/* Swap Note or Leave Warning */}
                              {slot.status === "SWAP_REQUESTED" &&
                                slot.swapReason && (
                                  <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-200 leading-snug">
                                    <strong>Swap Reason:</strong>{" "}
                                    {slot.swapReason}
                                  </div>
                                )}

                              {hasLeaveCollision && (
                                <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-200">
                                  ⚠️ On Leave ({week.weekLabel})
                                </div>
                              )}
                            </div>

                            {/* Simple 1-Click Action Footer */}
                            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-1.5">
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
                                  ⚡ Cover Shift ({currentUser.name.split(" ")[0]})
                                </button>
                              ) : isMySlot || isDirector ? (
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
                                          ? `Set ${roleMeta.label} (${week.weekLabel}) to Pending`
                                          : `Confirmed ${slot.primaryUserName} for ${roleMeta.label} (${week.weekLabel})`
                                      )
                                    }
                                    className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
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
                                  Call {slot.callTimeMyt || roleMeta.callTime}
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
          5. CLEAN CREW SERVING SUMMARY CARDS (NO BACKUP CLUTTER)
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {operatorSummary.map(
          ({ user, shiftCount, confirmedCount, datesServed, leaveDates }) => {
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
                className="rounded-2xl p-3.5 bg-[#121215] border border-white/[0.08] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0">
                    <img
                      src={avatarUri}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {user.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {user.callsign}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {datesServed.length > 0
                        ? `Sundays: ${datesServed.join(", ")}`
                        : "No assigned Sundays"}
                    </div>
                    {leaveDates.length > 0 && (
                      <div className="text-[10px] text-amber-300 truncate">
                        Leave: {leaveDates.map((l) => l.sundayDateIso).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-emerald-400 tabular-nums">
                    {confirmedCount}/{shiftCount}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                    Confirmed
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

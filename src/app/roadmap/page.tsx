"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const ExecutivePastorReport = dynamic(
  () => import("@/components/ExecutivePastorReport"),
  { ssr: false }
);

const LOCAL_ROADMAP_KEY = "church_live_hub_roadmap_v2";

const CATEGORY_STYLES: Record<
  string,
  { label: string; pill: string; leftBorder: string }
> = {
  CAMERA_HARDWARE: {
    label: "Equipment",
    pill: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    leftBorder: "border-l-4 border-l-amber-400",
  },
  TEAM_TRAINING: {
    label: "Training",
    pill: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    leftBorder: "border-l-4 border-l-violet-400",
  },
  BROADCAST_PRODUCTION: {
    label: "System",
    pill: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    leftBorder: "border-l-4 border-l-sky-400",
  },
  PASTORAL_CARE: {
    label: "Interaction",
    pill: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    leftBorder: "border-l-4 border-l-emerald-400",
  },
  AUDIENCE_GROWTH: {
    label: "Social & Growth",
    pill: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
    leftBorder: "border-l-4 border-l-pink-400",
  },
};

export default function RoadmapPage() {
  const [viewMode, setViewMode] = useState<"REPORT" | "TRACKER">("REPORT");
  const [goals, setGoals] = useState<any>({
    currentWeeklyAttendance: 25,
    currentYTViewers: 15,
    currentIGViewers: 10,
    phase1TargetAttendance: 50,
    targetYTViewers: 30,
    targetIGViewers: 20,
    currentTeamSize: 5,
    targetTeamSize: 10,
  });
  const [milestones, setMilestones] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [newMs, setNewMs] = useState({
    phase: "PHASE_1",
    category: "CAMERA_HARDWARE",
    title: "",
    description: "",
    targetDate: new Date().toISOString().slice(0, 10),
    owner: "Gaby (Media Director)",
    estimatedBudget: "RM 0",
    attendanceImpact: "50+ Viewers / Wk",
    checklistRaw: "",
  });

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const persistLocal = (nextGoals: any, nextMs: any[]) => {
    try {
      localStorage.setItem(
        LOCAL_ROADMAP_KEY,
        JSON.stringify({ goals: nextGoals, milestones: nextMs })
      );
    } catch {}
  };

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        const cached = localStorage.getItem(LOCAL_ROADMAP_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.goals) setGoals(parsed.goals);
          if (parsed.milestones) setMilestones(parsed.milestones);
        }
      } catch {}

      try {
        const res = await fetch("/api/roadmap", { cache: "no-store" });
        const data = await res.json();
        if (data.goals) setGoals(data.goals);
        if (data.milestones) setMilestones(data.milestones);
        persistLocal(data.goals || goals, data.milestones || []);
      } catch {}
    };
    loadRoadmap();
  }, []);

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMs.title.trim()) return;

    const checklist = newMs.checklistRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        text,
        done: false,
      }));

    const payload = {
      ...newMs,
      checklist:
        checklist.length > 0
          ? checklist
          : [{ id: `chk-${Date.now()}-1`, text: "Complete action item", done: false }],
    };

    const optimisticItem = {
      id: `ms-${Date.now()}`,
      ...payload,
      status: "UPCOMING",
    };
    const nextList = [optimisticItem, ...milestones];
    setMilestones(nextList);
    persistLocal(goals, nextList);
    setShowAddMilestone(false);
    triggerToast("Action plan added");

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_MILESTONE", milestone: payload }),
      });
      const data = await res.json();
      if (data.milestones) {
        setMilestones(data.milestones);
        persistLocal(goals, data.milestones);
      }
    } catch {}

    setNewMs({
      phase: "PHASE_1",
      category: "CAMERA_HARDWARE",
      title: "",
      description: "",
      targetDate: new Date().toISOString().slice(0, 10),
      owner: "Gaby (Media Director)",
      estimatedBudget: "RM 0",
      attendanceImpact: "50+ Viewers / Wk",
      checklistRaw: "",
    });
  };

  const handleCycleStatus = async (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "UPCOMING"
        ? "IN_PROGRESS"
        : currentStatus === "IN_PROGRESS"
        ? "COMPLETED"
        : "UPCOMING";

    const updated = milestones.map((m) =>
      m.id === id ? { ...m, status: nextStatus } : m
    );
    setMilestones(updated);
    persistLocal(goals, updated);
    triggerToast(`Status: ${nextStatus.replace("_", " ")}`);

    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          id,
          updates: { status: nextStatus },
        }),
      });
    } catch {}
  };

  const handleToggleChecklist = async (milestoneId: string, checkId: string) => {
    const updated = milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const list = (m.checklist || []).map((c: any) =>
        c.id === checkId ? { ...c, done: !c.done } : c
      );
      const allDone = list.length > 0 && list.every((c: any) => c.done);
      const anyDone = list.some((c: any) => c.done);
      return {
        ...m,
        checklist: list,
        status: allDone ? "COMPLETED" : anyDone ? "IN_PROGRESS" : m.status,
      };
    });
    setMilestones(updated);
    persistLocal(goals, updated);

    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_CHECKLIST",
          milestoneId,
          checkId,
        }),
      });
    } catch {}
  };

  const handleDeleteMilestone = async (id: string) => {
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    persistLocal(goals, updated);
    triggerToast("Removed");

    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_MILESTONE", id }),
      });
    } catch {}
  };

  const filteredMilestones = milestones.filter((m) =>
    categoryFilter === "ALL" ? true : m.category === categoryFilter
  );
  const activeMilestones = filteredMilestones.filter((m) => m.status !== "COMPLETED");
  const completedMilestones = filteredMilestones.filter((m) => m.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-white text-black px-3.5 py-2 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
        {/* Compact Single-Line Command Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Roadmap &amp; Senior Pastor Report
            </h1>
            <div className="flex items-center bg-[#121215] border border-white/[0.1] rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("REPORT")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  viewMode === "REPORT"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                1. Executive Report &amp; Notes
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TRACKER")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  viewMode === "TRACKER"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                2. Action Checklist ({activeMilestones.length} Active · {completedMilestones.length} Done)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/Senior_Pastor_Executive_Report.pdf"
              download="Senior_Pastor_Executive_Report.pdf"
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition"
            >
              ⬇ Download 2-Page PDF
            </a>
            <a
              href="/Senior_Pastor_Executive_Report.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.1] text-xs font-semibold transition"
            >
              Preview PDF ↗
            </a>
            {viewMode === "TRACKER" && (
              <button
                type="button"
                onClick={() => setShowAddMilestone(true)}
                className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-bold transition"
              >
                + Add Plan
              </button>
            )}
          </div>
        </div>

        {/* MODE 1: EXECUTIVE PASTOR REPORT (DEFAULT) */}
        {viewMode === "REPORT" && <ExecutivePastorReport />}

        {/* MODE 2: COMPACT ACTION PLAN CHECKLIST */}
        {viewMode === "TRACKER" && (
          <div className="space-y-5">
            {/* Compact 4-Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Before (YouTube Only)
                </div>
                <div className="text-2xl font-bold text-white mt-1">10 – 20 / wk</div>
              </div>
              <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4">
                <div className="text-[10px] font-mono uppercase text-sky-400">
                  Added via IG Live (3 Wks)
                </div>
                <div className="text-2xl font-bold text-sky-400 mt-1">+5 – 10 / wk</div>
              </div>
              <div className="bg-[#121215] border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-[10px] font-mono uppercase text-emerald-400">
                  Target Goal (2x Viewers)
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">50+ / wk</div>
              </div>
              <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-4">
                <div className="text-[10px] font-mono uppercase text-amber-400">
                  Equipment Budget (Nov–Dec)
                </div>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  RM 3,800 – 6,300 <span className="text-xs text-zinc-400">+ ATEM</span>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `All (${milestones.length})` },
                { id: "BROADCAST_PRODUCTION", label: "System" },
                { id: "CAMERA_HARDWARE", label: "Equipment" },
                { id: "TEAM_TRAINING", label: "Training" },
                { id: "AUDIENCE_GROWTH", label: "Social & IG" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    categoryFilter === tab.id
                      ? "bg-white text-black font-semibold"
                      : "text-zinc-400 hover:text-white bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Upcoming Plans (1 - 4) */}
            {activeMilestones.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Upcoming Plans ({activeMilestones.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {activeMilestones.map((m) => {
                    const cat = CATEGORY_STYLES[m.category] || CATEGORY_STYLES.CAMERA_HARDWARE;
                    return (
                      <div
                        key={m.id}
                        className={`rounded-2xl p-4 bg-[#121215] border border-white/[0.08] ${cat.leftBorder} flex flex-col justify-between gap-3`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${cat.pill}`}>
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(m.id, m.status)}
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-zinc-300 border border-white/[0.1]"
                              >
                                {m.status.replace("_", " ")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="text-[11px] text-zinc-500 hover:text-rose-400 px-1.5"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-white">{m.title}</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">{m.description}</p>
                          </div>

                          {(m.checklist || []).length > 0 && (
                            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-2.5 space-y-1">
                              {(m.checklist || []).map((item: any) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleToggleChecklist(m.id, item.id)}
                                  className="w-full flex items-center gap-2 text-left text-xs py-1 px-1.5 rounded hover:bg-white/[0.04]"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                      item.done
                                        ? "bg-emerald-400 text-black"
                                        : "border border-white/25 text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                  <span className={item.done ? "line-through text-zinc-500" : "text-zinc-200"}>
                                    {item.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                          <span>Lead: <strong className="text-zinc-200">{m.owner}</strong></span>
                          <div className="flex items-center gap-3">
                            <span>Budget: <strong className="text-amber-300">{m.estimatedBudget}</strong></span>
                            <span>Target: <strong className="text-white">{m.targetDate}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* What Has Been Done (1 - 4) */}
            {completedMilestones.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  What Has Been Done ({completedMilestones.length} Completed)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completedMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl p-3.5 bg-[#0e1512] border border-emerald-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-4 h-4 mt-0.5 rounded bg-emerald-400 text-black flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">{m.title}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{m.description}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(m.id, m.status)}
                        className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Add Plan Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white">Add Action Plan</h3>
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newMs.title}
                  onChange={(e) => setNewMs({ ...newMs, title: e.target.value })}
                  placeholder="e.g. Saturday IG Story Countdown"
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Short Point Summary</label>
                <input
                  type="text"
                  value={newMs.description}
                  onChange={(e) => setNewMs({ ...newMs, description: e.target.value })}
                  placeholder="Key action & goal"
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-400 mb-1">Lead Owner</label>
                  <input
                    type="text"
                    value={newMs.owner}
                    onChange={(e) => setNewMs({ ...newMs, owner: e.target.value })}
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Budget (RM)</label>
                  <input
                    type="text"
                    value={newMs.estimatedBudget}
                    onChange={(e) => setNewMs({ ...newMs, estimatedBudget: e.target.value })}
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Checklist Points (1 per line)</label>
                <textarea
                  rows={3}
                  value={newMs.checklistRaw}
                  onChange={(e) => setNewMs({ ...newMs, checklistRaw: e.target.value })}
                  placeholder={"Step 1\nStep 2"}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-white text-black font-bold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

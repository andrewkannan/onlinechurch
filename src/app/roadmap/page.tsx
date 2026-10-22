"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ExecutivePastorReport from "@/components/ExecutivePastorReport";

const LOCAL_ROADMAP_KEY = "church_live_hub_roadmap_v1";

const CATEGORY_STYLES: Record<
  string,
  {
    label: string;
    code: string;
    dot: string;
    pill: string;
    topBorder: string;
    leftBorder: string;
    bar: string;
  }
> = {
  CAMERA_HARDWARE: {
    label: "Camera & Hardware",
    code: "CAM-HW",
    dot: "bg-amber-400",
    pill: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    topBorder: "border-t-2 border-t-amber-400",
    leftBorder: "border-l-4 border-l-amber-400",
    bar: "bg-amber-400",
  },
  TEAM_TRAINING: {
    label: "Team Training",
    code: "CREW-SOP",
    dot: "bg-violet-400",
    pill: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    topBorder: "border-t-2 border-t-violet-400",
    leftBorder: "border-l-4 border-l-violet-400",
    bar: "bg-violet-400",
  },
  BROADCAST_PRODUCTION: {
    label: "Broadcast Production",
    code: "PROD-ENG",
    dot: "bg-sky-400",
    pill: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    topBorder: "border-t-2 border-t-sky-400",
    leftBorder: "border-l-4 border-l-sky-400",
    bar: "bg-sky-400",
  },
  PASTORAL_CARE: {
    label: "Pastoral Care",
    code: "CARE-24H",
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    topBorder: "border-t-2 border-t-emerald-400",
    leftBorder: "border-l-4 border-l-emerald-400",
    bar: "bg-emerald-400",
  },
  AUDIENCE_GROWTH: {
    label: "Audience Growth",
    code: "GROWTH",
    dot: "bg-pink-400",
    pill: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
    topBorder: "border-t-2 border-t-pink-400",
    leftBorder: "border-l-4 border-l-pink-400",
    bar: "bg-pink-400",
  },
};

export default function RoadmapPage() {
  const [goals, setGoals] = useState<any>({
    currentWeeklyAttendance: 25,
    currentYTViewers: 15,
    currentIGViewers: 10,
    phase1TargetAttendance: 50,
    phase2TargetAttendance: 75,
    phase3TargetAttendance: 100,
    annualVisionAttendance: 150,
    targetYTViewers: 30,
    targetIGViewers: 20,
    currentRepeatingRate: 65,
    targetRepeatingRate: 80,
    currentWatchMinutes: 28,
    targetWatchMinutes: 45,
    currentTeamSize: 5,
    targetTeamSize: 10,
    targetMonthlySalvations: 10,
  });
  const [milestones, setMilestones] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Milestone Form State
  const [newMs, setNewMs] = useState({
    phase: "PHASE_1",
    category: "CAMERA_HARDWARE",
    title: "",
    description: "",
    priority: "HIGH",
    targetDate: new Date().toISOString().slice(0, 10),
    owner: "Production & Media Team",
    hardwareOrToolSpec: "",
    estimatedBudget: "$0",
    attendanceImpact: "+25% Retention / +40 Viewers",
    checklistRaw: "",
  });

  // New Achievement Form State
  const [newAch, setNewAch] = useState({
    title: "",
    description: "",
    category: "ATTENDANCE",
    targetValue: 250,
    currentValue: 142,
    unit: "viewers",
    badgeColor: "amber",
    unlocked: false,
  });

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const persistLocal = (nextGoals: any, nextMs: any[], nextAch: any[]) => {
    try {
      localStorage.setItem(
        LOCAL_ROADMAP_KEY,
        JSON.stringify({
          goals: nextGoals,
          milestones: nextMs,
          achievements: nextAch,
        })
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
          if (parsed.achievements) setAchievements(parsed.achievements);
        }
      } catch {}

      try {
        const res = await fetch("/api/roadmap", { cache: "no-store" });
        const data = await res.json();
        if (data.goals) setGoals(data.goals);
        if (data.milestones) setMilestones(data.milestones);
        if (data.achievements) setAchievements(data.achievements);
        persistLocal(
          data.goals || goals,
          data.milestones || [],
          data.achievements || []
        );
      } catch (e) {
        console.error("Failed to fetch roadmap:", e);
      }
    };
    loadRoadmap();
  }, []);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    persistLocal(goals, milestones, achievements);
    setShowGoalEditor(false);
    triggerToast("Attendance targets updated");
    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_GOALS", goals }),
      });
    } catch {}
  };

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
          : [
              {
                id: `chk-${Date.now()}-1`,
                text: "Complete setup & verification",
                done: false,
              },
            ],
    };

    // Optimistic insertion
    const optimisticItem = {
      id: `ms-${Date.now()}`,
      ...payload,
      status: "UPCOMING",
      phaseLabel:
        payload.phase === "PHASE_1"
          ? "Phase 1: Camera Hardware & Studio Foundation"
          : payload.phase === "PHASE_2"
          ? "Phase 2: Camera Crew & Moderator Training"
          : payload.phase === "PHASE_3"
          ? "Phase 3: Repeating Audience & Multi-Platform Funnel"
          : "Phase 4: Digital Campus & 1,000+ Viewer Expansion",
    };
    const nextList = [optimisticItem, ...milestones];
    setMilestones(nextList);
    persistLocal(goals, nextList, achievements);
    setShowAddMilestone(false);
    triggerToast("Milestone added to timeline");

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_MILESTONE", milestone: payload }),
      });
      const data = await res.json();
      if (data.milestones) {
        setMilestones(data.milestones);
        persistLocal(goals, data.milestones, achievements);
      }
    } catch {}

    setNewMs({
      phase: "PHASE_1",
      category: "CAMERA_HARDWARE",
      title: "",
      description: "",
      priority: "HIGH",
      targetDate: new Date().toISOString().slice(0, 10),
      owner: "Production & Media Team",
      hardwareOrToolSpec: "",
      estimatedBudget: "$0",
      attendanceImpact: "+25% Retention / +40 Viewers",
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
    persistLocal(goals, updated, achievements);
    triggerToast(`Milestone marked ${nextStatus.replace("_", " ")}`);

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

  const handleToggleChecklist = async (
    milestoneId: string,
    checkId: string
  ) => {
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
    persistLocal(goals, updated, achievements);

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
    persistLocal(goals, updated, achievements);
    triggerToast("Milestone removed");

    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_MILESTONE", id }),
      });
    } catch {}
  };

  const handleToggleAchievement = async (id: string) => {
    const updated = achievements.map((a) => {
      if (a.id !== id) return a;
      const nextUnlocked = !a.unlocked;
      return {
        ...a,
        unlocked: nextUnlocked,
        currentValue: nextUnlocked ? a.targetValue : a.currentValue,
        unlockedAt: nextUnlocked ? new Date().toISOString().slice(0, 10) : null,
      };
    });
    setAchievements(updated);
    persistLocal(goals, milestones, updated);
    triggerToast("Achievement status updated");

    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_ACHIEVEMENT", id }),
      });
    } catch {}
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAch.title.trim()) return;

    const optimisticAch = {
      id: `ach-${Date.now()}`,
      ...newAch,
    };
    const nextAch = [optimisticAch, ...achievements];
    setAchievements(nextAch);
    persistLocal(goals, milestones, nextAch);
    setShowAddAchievement(false);
    triggerToast("Custom achievement created");

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ACHIEVEMENT",
          achievement: newAch,
        }),
      });
      const data = await res.json();
      if (data.achievements) {
        setAchievements(data.achievements);
        persistLocal(goals, milestones, data.achievements);
      }
    } catch {}

    setNewAch({
      title: "",
      description: "",
      category: "ATTENDANCE",
      targetValue: 250,
      currentValue: 142,
      unit: "viewers",
      badgeColor: "amber",
      unlocked: false,
    });
  };

  const filteredMilestones = milestones.filter((m) =>
    categoryFilter === "ALL" ? true : m.category === categoryFilter
  );

  const activeMilestones = filteredMilestones.filter(
    (m) => m.status !== "COMPLETED"
  );
  const completedMilestones = filteredMilestones.filter(
    (m) => m.status === "COMPLETED"
  );

  const completedCount = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;
  const inProgressCount = milestones.filter(
    (m) => m.status === "IN_PROGRESS"
  ).length;
  const progressPct =
    milestones.length > 0
      ? Math.round(
          ((completedCount + inProgressCount * 0.5) / milestones.length) * 100
        )
      : 0;

  const phase1Progress = Math.min(
    100,
    Math.round(
      (goals.currentWeeklyAttendance / (goals.phase1TargetAttendance || 200)) *
        100
    )
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight flex items-center gap-2 border border-black/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-8">
        {/* Top Executive Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Production Architecture · Growth &amp; Hardware Roadmap
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] text-[10px] font-semibold tabular-nums">
                {completedCount}/{milestones.length} Milestones Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em]">
              Targeted Attendance, Camera Hardware &amp; Team Training
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl">
              End-to-end production roadmap tracking 4K camera rigging, crew
              SOP training, and repeating audience retention targets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
            <a
              href="/Senior_Pastor_Executive_Report.pdf"
              download="Senior_Pastor_Executive_Report.pdf"
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>📄 Download Executive Report (PDF)</span>
            </a>

            <a
              href="/Senior_Pastor_Executive_Report.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              Preview PDF ↗
            </a>

            <button
              type="button"
              onClick={() => setShowGoalEditor(true)}
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.1] text-xs font-medium transition"
            >
              Configure Targets
            </button>

            <button
              type="button"
              onClick={() => setShowAddMilestone(true)}
              className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              + Add Timeline Milestone
            </button>
          </div>
        </div>

        {/* Interactive Apple-Style Executive Report & Meeting Notes Guideline */}
        <ExecutivePastorReport />

        {/* 4 Apple Bento KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1 */}
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-sky-400 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-xs font-semibold text-white">
                    Phase 1 Peak Target
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-semibold tabular-nums">
                  {phase1Progress}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {goals.currentWeeklyAttendance}
                </span>
                <span className="text-xs text-zinc-400">
                  of {goals.phase1TargetAttendance} peak
                </span>
              </div>

              <div className="w-full h-1 bg-white/[0.07] rounded-full my-3 overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-300"
                  style={{ width: `${phase1Progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.05] text-zinc-400 tabular-nums">
              <span>
                YouTube: {goals.currentYTViewers} → {goals.targetYTViewers}
              </span>
              <span>
                Instagram: {goals.currentIGViewers} → {goals.targetIGViewers}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-emerald-400 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Repeating Audience
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  RETENTION
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {goals.currentRepeatingRate}%
                </span>
                <span className="text-xs text-zinc-400">
                  Target: {goals.targetRepeatingRate}%
                </span>
              </div>

              <div className="w-full h-1 bg-white/[0.07] rounded-full my-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (goals.currentRepeatingRate /
                          (goals.targetRepeatingRate || 75)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.05] text-zinc-400 tabular-nums">
              <span>Watch Duration: {goals.currentWatchMinutes}m</span>
              <span className="text-emerald-300">
                Goal: {goals.targetWatchMinutes}m
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-violet-400 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-xs font-semibold text-white">
                    Certified Production Crew
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-semibold">
                  ROSTER
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {goals.currentTeamSize}
                </span>
                <span className="text-xs text-zinc-400">
                  of {goals.targetTeamSize} operators
                </span>
              </div>

              <div className="w-full h-1 bg-white/[0.07] rounded-full my-3 overflow-hidden">
                <div
                  className="h-full bg-violet-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (goals.currentTeamSize / (goals.targetTeamSize || 12)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.05] text-zinc-400">
              <span>Camera, Audio, Mod &amp; QC</span>
              <span className="font-mono text-zinc-500">5 STATIONS</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-amber-400 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-white">
                    Roadmap Execution
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold tabular-nums">
                  {completedCount}/{milestones.length}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <span className="text-3xl font-semibold text-white tracking-tight">
                  {progressPct}%
                </span>
                <span className="text-xs text-zinc-400">
                  {inProgressCount} active now
                </span>
              </div>

              <div className="w-full h-1 bg-white/[0.07] rounded-full my-3 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.05] text-zinc-400 tabular-nums">
              <span>12-Month Vision</span>
              <span className="text-amber-300 font-semibold">
                {goals.annualVisionAttendance} Viewers
              </span>
            </div>
          </div>
        </div>

        {/* 5-Stage Growth Trajectory Strip */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Phased Scaling Architecture
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Targeted Attendance Trajectory by Upgrade Phase
              </h2>
            </div>
            <span className="text-xs text-zinc-400 px-3 py-1 rounded-full bg-[#09090b] border border-white/[0.08] tabular-nums">
              Baseline: {goals.currentWeeklyAttendance} → Annual Vision:{" "}
              {goals.annualVisionAttendance}+
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {[
              {
                code: "STAGE 01",
                step: "Current Baseline",
                subtitle: "Single Cam & Basic Chat",
                target: goals.currentWeeklyAttendance,
                bar: "bg-zinc-400",
                badge: "Active",
                pct: 25,
              },
              {
                code: "STAGE 02",
                step: "Phase 1 · Hardware",
                subtitle: "4K Multi-Cam & -14 LUFS Mix",
                target: goals.phase1TargetAttendance,
                bar: "bg-amber-400",
                badge: "+40% Watch Time",
                pct: 45,
              },
              {
                code: "STAGE 03",
                step: "Phase 2 · Crew SOP",
                subtitle: "Callsign Protocol & Fast Cues",
                target: goals.phase2TargetAttendance,
                bar: "bg-violet-400",
                badge: "+30% Repeating",
                pct: 65,
              },
              {
                code: "STAGE 04",
                step: "Phase 3 · Retention",
                subtitle: "Pre-Show & 24h Care Funnel",
                target: goals.phase3TargetAttendance,
                bar: "bg-emerald-400",
                badge: "70% Returning",
                pct: 82,
              },
              {
                code: "STAGE 05",
                step: "Phase 4 · Expansion",
                subtitle: "Vertical Clips & Watch Parties",
                target: goals.annualVisionAttendance,
                bar: "bg-sky-400",
                badge: "Annual Vision",
                pct: 100,
              },
            ].map((tier, i) => (
              <div
                key={i}
                className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {tier.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-300 border border-white/[0.08] font-medium">
                      {tier.badge}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    {tier.step}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {tier.subtitle}
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                    {tier.target}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      viewers
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.07] rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${tier.bar} rounded-full`}
                      style={{ width: `${tier.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] rounded-2xl p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All Milestones (${milestones.length})` },
              { id: "CAMERA_HARDWARE", label: "Camera & Hardware" },
              { id: "TEAM_TRAINING", label: "Team Training" },
              { id: "BROADCAST_PRODUCTION", label: "Broadcast Production" },
              { id: "AUDIENCE_GROWTH", label: "Audience Growth" },
              { id: "PASTORAL_CARE", label: "Pastoral Care" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                  categoryFilter === tab.id
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white bg-white/[0.03]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-zinc-500 px-2">
            Click any checklist item or status pill to advance progress
          </span>
        </div>

        {/* SECTION 1 (TOP PRIORITY): ACTIVE & UPCOMING MILESTONES */}
        {activeMilestones.length > 0 && (
          <section className="rounded-3xl p-6 bg-[#121215] border border-white/[0.1] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                    Active Implementation Queue · {activeMilestones.length}{" "}
                    Remaining
                  </span>
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  In-Progress &amp; Upcoming Hardware and Training Milestones
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeMilestones.map((m) => {
                const cat =
                  CATEGORY_STYLES[m.category] ||
                  CATEGORY_STYLES.CAMERA_HARDWARE;
                const doneChecks = (m.checklist || []).filter(
                  (c: any) => c.done
                ).length;
                const totalChecks = (m.checklist || []).length;

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-5 bg-[#09090b] border border-white/[0.1] ${cat.leftBorder} flex flex-col justify-between gap-4 transition hover:border-white/[0.2]`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${cat.pill}`}
                          >
                            {cat.label}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                            {m.phase.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(m.id, m.status)}
                            className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition ${
                              m.status === "IN_PROGRESS"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-white/[0.05] text-zinc-400 border-white/[0.1] hover:text-white"
                            }`}
                          >
                            {m.status.replace("_", " ")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="text-[11px] text-zinc-500 hover:text-rose-400 px-2 py-1 rounded-full transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-white tracking-tight">
                          {m.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {m.hardwareOrToolSpec && (
                          <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-2.5 text-xs">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                              Hardware / Tool Spec
                            </div>
                            <div className="text-zinc-200 font-medium mt-0.5">
                              {m.hardwareOrToolSpec}
                            </div>
                          </div>
                        )}
                        <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-2.5 text-xs">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Projected Impact
                          </div>
                          <div className="text-emerald-300 font-medium mt-0.5">
                            {m.attendanceImpact}
                          </div>
                        </div>
                      </div>

                      {totalChecks > 0 && (
                        <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="font-medium text-zinc-300">
                              Implementation Checklist
                            </span>
                            <span className="tabular-nums">
                              {doneChecks}/{totalChecks} Verified
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {(m.checklist || []).map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  handleToggleChecklist(m.id, item.id)
                                }
                                className="w-full flex items-center gap-2.5 text-left text-xs py-1.5 px-2 rounded-xl hover:bg-white/[0.04] transition"
                              >
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    item.done
                                      ? "bg-emerald-400 text-black"
                                      : "border border-white/25 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span
                                  className={
                                    item.done
                                      ? "line-through text-zinc-500"
                                      : "text-zinc-200"
                                  }
                                >
                                  {item.text}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400 tabular-nums">
                      <span>
                        Owner:{" "}
                        <strong className="text-zinc-200">{m.owner}</strong>
                      </span>
                      <div className="flex items-center gap-3">
                        {m.estimatedBudget && (
                          <span>
                            Budget:{" "}
                            <strong className="text-amber-300">
                              {m.estimatedBudget}
                            </strong>
                          </span>
                        )}
                        <span>
                          Target:{" "}
                          <strong className="text-white">{m.targetDate}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2 (SEPARATED BELOW): COMPLETED MILESTONES */}
        {completedMilestones.length > 0 && (
          <section className="rounded-3xl p-6 bg-[#111114] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                    Verified &amp; Completed · {completedMilestones.length} Done
                  </span>
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Completed Roadmap Upgrades
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                Click status badge to reopen
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {completedMilestones.map((m) => {
                const cat =
                  CATEGORY_STYLES[m.category] ||
                  CATEGORY_STYLES.CAMERA_HARDWARE;
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl p-4 bg-[#0e1512] border border-emerald-500/30 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-emerald-400 text-black flex items-center justify-center text-[11px] font-bold shrink-0">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {m.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${cat.pill}`}
                          >
                            {cat.label}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate">
                            {m.attendanceImpact}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCycleStatus(m.id, m.status)}
                      className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold shrink-0"
                    >
                      Completed
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Ministry Achievements & Milestones Wall */}
        <section className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                Production &amp; Ministry Benchmarks
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                Broadcast Achievements &amp; Growth Benchmarks
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAddAchievement(true)}
              className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition self-start sm:self-auto"
            >
              + Add Benchmark
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((ach) => {
              const pct = Math.min(
                100,
                Math.round((ach.currentValue / (ach.targetValue || 1)) * 100)
              );
              return (
                <div
                  key={ach.id}
                  onClick={() => handleToggleAchievement(ach.id)}
                  className={`cursor-pointer rounded-2xl p-5 border transition flex flex-col justify-between gap-4 ${
                    ach.unlocked
                      ? "bg-[#0e1512] border-emerald-500/35"
                      : "bg-[#09090b] border-white/[0.08] hover:border-white/[0.18]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        {ach.category}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                          ach.unlocked
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/[0.05] text-zinc-400 border border-white/[0.08]"
                        }`}
                      >
                        {ach.unlocked ? "Unlocked" : "In Progress"}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      {ach.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 tabular-nums">
                      <span>
                        {ach.currentValue} / {ach.targetValue} {ach.unit}
                      </span>
                      <span className="font-semibold text-white">
                        {ach.unlocked ? "100%" : `${pct}%`}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.07] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ach.unlocked ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                        style={{ width: `${ach.unlocked ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modal 1: Configure Attendance Targets */}
      {showGoalEditor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                  Target Calibration
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Configure Attendance &amp; Retention Targets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalEditor(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Current Combined Peak
                  </label>
                  <input
                    type="number"
                    value={goals.currentWeeklyAttendance}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        currentWeeklyAttendance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Current YouTube Peak
                  </label>
                  <input
                    type="number"
                    value={goals.currentYTViewers}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        currentYTViewers: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Current Instagram Peak
                  </label>
                  <input
                    type="number"
                    value={goals.currentIGViewers}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        currentIGViewers: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 mb-1 font-medium">
                    Phase 1 Target (Hardware)
                  </label>
                  <input
                    type="number"
                    value={goals.phase1TargetAttendance}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        phase1TargetAttendance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-violet-300 mb-1 font-medium">
                    Phase 2 Target (Training)
                  </label>
                  <input
                    type="number"
                    value={goals.phase2TargetAttendance}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        phase2TargetAttendance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 mb-1 font-medium">
                    Phase 3 Target (Funnel)
                  </label>
                  <input
                    type="number"
                    value={goals.phase3TargetAttendance}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        phase3TargetAttendance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-sky-300 mb-1 font-medium">
                    12-Month Vision Target
                  </label>
                  <input
                    type="number"
                    value={goals.annualVisionAttendance}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        annualVisionAttendance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Repeating Viewer Goal (%)
                  </label>
                  <input
                    type="number"
                    value={goals.targetRepeatingRate}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        targetRepeatingRate: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Certified Crew Target
                  </label>
                  <input
                    type="number"
                    value={goals.targetTeamSize}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        targetTeamSize: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowGoalEditor(false)}
                  className="px-4 py-2 rounded-full text-zinc-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold transition"
                >
                  Save Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Timeline Milestone */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                  Roadmap Deployment
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Add Upgrade or Training Milestone
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Roadmap Phase
                  </label>
                  <select
                    value={newMs.phase}
                    onChange={(e) =>
                      setNewMs({ ...newMs, phase: e.target.value })
                    }
                    aria-label="Roadmap Phase"
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PHASE_1">
                      Phase 1: Camera Hardware &amp; Studio
                    </option>
                    <option value="PHASE_2">
                      Phase 2: Camera &amp; Moderator Training
                    </option>
                    <option value="PHASE_3">
                      Phase 3: Repeating Audience Funnel
                    </option>
                    <option value="PHASE_4">
                      Phase 4: Digital Campus Expansion
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Department Category
                  </label>
                  <select
                    value={newMs.category}
                    onChange={(e) =>
                      setNewMs({ ...newMs, category: e.target.value })
                    }
                    aria-label="Department Category"
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="CAMERA_HARDWARE">Camera &amp; Hardware</option>
                    <option value="TEAM_TRAINING">Team Training</option>
                    <option value="BROADCAST_PRODUCTION">
                      Broadcast Production
                    </option>
                    <option value="AUDIENCE_GROWTH">Audience Growth</option>
                    <option value="PASTORAL_CARE">Pastoral Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Milestone Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deploy Wireless Tally Lights & Train 3 Camera Operators"
                  value={newMs.title}
                  onChange={(e) =>
                    setNewMs({ ...newMs, title: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Objective &amp; Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the hardware installation or crew training scope..."
                  value={newMs.description}
                  onChange={(e) =>
                    setNewMs({ ...newMs, description: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Hardware / Tool Spec
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sony FX30 + Hollyland Solidcom"
                    value={newMs.hardwareOrToolSpec}
                    onChange={(e) =>
                      setNewMs({
                        ...newMs,
                        hardwareOrToolSpec: e.target.value,
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Expected Attendance Impact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +50 Peak Viewers / +25% Retention"
                    value={newMs.attendanceImpact}
                    onChange={(e) =>
                      setNewMs({ ...newMs, attendanceImpact: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Assigned Lead
                  </label>
                  <input
                    type="text"
                    value={newMs.owner}
                    onChange={(e) =>
                      setNewMs({ ...newMs, owner: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Estimated Budget
                  </label>
                  <input
                    type="text"
                    value={newMs.estimatedBudget}
                    onChange={(e) =>
                      setNewMs({ ...newMs, estimatedBudget: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newMs.targetDate}
                    onChange={(e) =>
                      setNewMs({ ...newMs, targetDate: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Verification Checklist Items (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Mount tripod and run SDI cable\nTrain Saturday crew on 9:16 crop\nVerify switch on program feed`}
                  value={newMs.checklistRaw}
                  onChange={(e) =>
                    setNewMs({ ...newMs, checklistRaw: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-2 rounded-full text-zinc-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold transition"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Custom Benchmark */}
      {showAddAchievement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                  Milestone Benchmark
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Create Custom Ministry Benchmark
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAchievement(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddAchievement} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Benchmark Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 300+ Combined Sunday Stream"
                  value={newAch.title}
                  onChange={(e) =>
                    setNewAch({ ...newAch, title: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the benchmark criteria..."
                  value={newAch.description}
                  onChange={(e) =>
                    setNewAch({ ...newAch, description: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Current
                  </label>
                  <input
                    type="number"
                    value={newAch.currentValue}
                    onChange={(e) =>
                      setNewAch({
                        ...newAch,
                        currentValue: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Target
                  </label>
                  <input
                    type="number"
                    value={newAch.targetValue}
                    onChange={(e) =>
                      setNewAch({
                        ...newAch,
                        targetValue: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newAch.unit}
                    onChange={(e) =>
                      setNewAch({ ...newAch, unit: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddAchievement(false)}
                  className="px-4 py-2 rounded-full text-zinc-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold transition"
                >
                  Add Benchmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

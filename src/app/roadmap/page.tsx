"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  Target,
  Camera,
  GraduationCap,
  TrendingUp,
  Trophy,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Users,
  Sparkles,
  CheckSquare,
  Square,
  Calendar,
  DollarSign,
  Cpu,
  Award,
  Sliders,
  X,
  Check,
  Radio,
  HeartHandshake,
} from "lucide-react";

const LOCAL_ROADMAP_KEY = "church_live_hub_roadmap_v1";

export default function RoadmapPage() {
  const [goals, setGoals] = useState<any>({
    currentWeeklyAttendance: 142,
    currentYTViewers: 88,
    currentIGViewers: 54,
    phase1TargetAttendance: 200,
    phase2TargetAttendance: 350,
    phase3TargetAttendance: 500,
    annualVisionAttendance: 1000,
    targetYTViewers: 600,
    targetIGViewers: 400,
    currentRepeatingRate: 58,
    targetRepeatingRate: 75,
    currentWatchMinutes: 28,
    targetWatchMinutes: 45,
    currentTeamSize: 4,
    targetTeamSize: 12,
    targetMonthlySalvations: 25,
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
    setTimeout(() => setToastMsg(null), 3200);
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
    triggerToast("Targeted Attendance & Ministry Goals saved!");
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
    } catch {
      const fallbackItem = {
        id: `ms-${Date.now()}`,
        ...payload,
        status: "UPCOMING",
        phaseLabel:
          payload.phase === "PHASE_1"
            ? "Phase 1: Camera Hardware & Studio Foundation"
            : payload.phase === "PHASE_2"
            ? "Phase 2: Camera Crew & Prophetic Moderator Training"
            : payload.phase === "PHASE_3"
            ? "Phase 3: Repeating Audience & Multi-Platform Funnel"
            : "Phase 4: Digital Campus & 1,000+ Viewer Expansion",
      };
      const next = [fallbackItem, ...milestones];
      setMilestones(next);
      persistLocal(goals, next, achievements);
    }

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
    setShowAddMilestone(false);
    triggerToast("New Timeline Milestone added to roadmap!");
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
    triggerToast(`Milestone marked as ${nextStatus.replace("_", " ")}`);

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
    triggerToast("Timeline item removed.");

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
    triggerToast("Achievement status updated!");

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
    setShowAddAchievement(false);
    triggerToast("New Ministry Achievement added!");
  };

  const filteredMilestones = milestones.filter((m) =>
    categoryFilter === "ALL" ? true : m.category === categoryFilter
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

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "CAMERA_HARDWARE":
        return {
          label: "Camera & Hardware",
          icon: Camera,
          cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      case "TEAM_TRAINING":
        return {
          label: "Team Training",
          icon: GraduationCap,
          cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
        };
      case "BROADCAST_PRODUCTION":
        return {
          label: "Broadcast Production",
          icon: Radio,
          cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
      case "PASTORAL_CARE":
        return {
          label: "Pastoral Care",
          icon: HeartHandshake,
          cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      default:
        return {
          label: "Audience Growth",
          icon: TrendingUp,
          cls: "bg-pink-500/15 text-pink-300 border-pink-500/30",
        };
    }
  };

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
        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              <span>Online Ministry Growth Strategy & Upgrade Timeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Targeted Attendance, Camera Hardware & Team Training Roadmap
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Build and track your end-to-end online service transformation — starting from 4K camera & broadcast audio hardware, training your camera and prophetic chat moderator team, to hitting your targeted attendance milestones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowGoalEditor(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Attendance Targets</span>
            </button>

            <button
              onClick={() => setShowAddMilestone(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timeline Milestone</span>
            </button>
          </div>
        </div>

        {/* Targeted Attendance & KPI Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Next Phase Attendance Target */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Phase 1 Target Attendance</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white">
                  {goals.currentWeeklyAttendance}
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  / {goals.phase1TargetAttendance} peak live
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span className="text-red-400 font-medium">
                  YT: {goals.currentYTViewers} → {goals.targetYTViewers}
                </span>
                <span>•</span>
                <span className="text-pink-400 font-medium">
                  IG: {goals.currentIGViewers} → {goals.targetIGViewers}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Progress to Phase 1 Goal</span>
                <span className="text-indigo-300 font-bold">
                  {phase1Progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${phase1Progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Repeating Audience Retention Goal */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Repeating Viewer Target</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white">
                  {goals.currentRepeatingRate}%
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  / {goals.targetRepeatingRate}% goal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Avg Watch Time: {goals.currentWatchMinutes}m →{" "}
                <span className="text-emerald-300 font-medium">
                  {goals.targetWatchMinutes}m target
                </span>
              </p>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Retention Loyalty Index</span>
                <span className="text-emerald-300 font-bold">
                  {Math.min(
                    100,
                    Math.round(
                      (goals.currentRepeatingRate /
                        (goals.targetRepeatingRate || 75)) *
                        100
                    )
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
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
          </div>

          {/* Card 3: Trained Camera & Moderator Squad */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Trained Media & Chat Team</span>
                <GraduationCap className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white">
                  {goals.currentTeamSize}
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  / {goals.targetTeamSize} certified crew
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Camera Operators, Switcher Director & Prophetic Chat Hosts
              </p>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Team Readiness</span>
                <span className="text-violet-300 font-bold">
                  {Math.min(
                    100,
                    Math.round(
                      (goals.currentTeamSize / (goals.targetTeamSize || 12)) *
                        100
                    )
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
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
          </div>

          {/* Card 4: Overall Roadmap Execution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Timeline Execution</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white">
                  {progressPct}%
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  ({completedCount} done, {inProgressCount} active)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                12-Month Vision Target:{" "}
                <span className="text-amber-300 font-bold">
                  {goals.annualVisionAttendance} Weekly Viewers
                </span>
              </p>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Milestones Completed</span>
                <span className="text-amber-300 font-bold">
                  {completedCount}/{milestones.length}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Attendance Growth Trajectory Staircase (Phase 1 -> Phase 4) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Targeted Attendance Growth Trajectory by Upgrade Phase</span>
              </h2>
              <p className="text-xs text-slate-400">
                How Camera Hardware, Team Training, and Retention Funnels unlock each attendance tier
              </p>
            </div>
            <span className="text-xs bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 px-3 py-1 rounded-lg font-medium">
              Current Baseline: {goals.currentWeeklyAttendance} Live Viewers → Vision: {goals.annualVisionAttendance}+
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                step: "Current Baseline",
                subtitle: "Single Cam + Basic Chat",
                target: goals.currentWeeklyAttendance,
                color: "from-slate-700 to-slate-600",
                border: "border-slate-700",
                badge: "Now",
                pct: 25,
              },
              {
                step: "Phase 1: Camera & Audio",
                subtitle: "4K Multi-Cam + Clean Mix",
                target: goals.phase1TargetAttendance,
                color: "from-amber-600 to-orange-500",
                border: "border-amber-500/40",
                badge: "+40% Watch Time",
                pct: 42,
              },
              {
                step: "Phase 2: Team Training",
                subtitle: "Camera Crew + Fast Cues",
                target: goals.phase2TargetAttendance,
                color: "from-violet-600 to-indigo-500",
                border: "border-violet-500/40",
                badge: "+30% Repeating",
                pct: 62,
              },
              {
                step: "Phase 3: Retention Funnel",
                subtitle: "Pre-Show + 24h Follow-Up",
                target: goals.phase3TargetAttendance,
                color: "from-emerald-600 to-teal-500",
                border: "border-emerald-500/40",
                badge: "70% Returning Flock",
                pct: 80,
              },
              {
                step: "Phase 4: Digital Campus",
                subtitle: "Reels Engine + Watch Parties",
                target: goals.annualVisionAttendance,
                color: "from-indigo-600 to-pink-500",
                border: "border-indigo-500/50",
                badge: "Annual Vision",
                pct: 100,
              },
            ].map((tier, i) => (
              <div
                key={i}
                className={`bg-slate-950/70 border ${tier.border} rounded-xl p-4 flex flex-col justify-between relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Stage {i + 1}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      {tier.badge}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{tier.step}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {tier.subtitle}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-white">
                    {tier.target}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      viewers
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
                      style={{ width: `${tier.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Timeline Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Step-by-Step Upgrade & Training Timeline</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any checklist task to mark it done, or click the status badge on any card to cycle{" "}
                <span className="text-slate-300 font-medium">
                  UPCOMING → IN PROGRESS → COMPLETED
                </span>
              </p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "All Milestones" },
                { id: "CAMERA_HARDWARE", label: "Camera & Hardware" },
                { id: "TEAM_TRAINING", label: "Team Training" },
                { id: "AUDIENCE_GROWTH", label: "Audience Growth" },
                { id: "PASTORAL_CARE", label: "Pastoral Care" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    categoryFilter === tab.id
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMilestones.map((m) => {
              const cat = getCategoryBadge(m.category);
              const CatIcon = cat.icon;
              const doneChecks = (m.checklist || []).filter(
                (c: any) => c.done
              ).length;
              const totalChecks = (m.checklist || []).length;

              return (
                <div
                  key={m.id}
                  className={`bg-slate-900/85 border rounded-2xl p-5 flex flex-col justify-between transition ${
                    m.status === "COMPLETED"
                      ? "border-emerald-500/40 bg-emerald-950/10"
                      : m.status === "IN_PROGRESS"
                      ? "border-indigo-500/40"
                      : "border-slate-800"
                  }`}
                >
                  <div>
                    {/* Top Row: Category Badge, Phase, Status Button, Delete */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cat.cls}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium bg-slate-800/80 px-2.5 py-0.5 rounded-md">
                          {m.phase.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCycleStatus(m.id, m.status)}
                          title="Click to cycle status"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            m.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : m.status === "IN_PROGRESS"
                              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          {m.status === "COMPLETED"
                            ? "✓ COMPLETED"
                            : m.status === "IN_PROGRESS"
                            ? "● IN PROGRESS"
                            : "○ UPCOMING"}
                        </button>

                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-white leading-snug">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {m.description}
                    </p>

                    {/* Hardware / Tool Spec & Impact Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {m.hardwareOrToolSpec && (
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-[11px]">
                          <div className="text-slate-400 font-medium flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-amber-400" />
                            <span>Hardware / Tool Setup:</span>
                          </div>
                          <div className="text-slate-200 font-semibold mt-0.5">
                            {m.hardwareOrToolSpec}
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-[11px]">
                        <div className="text-slate-400 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span>Expected Attendance Impact:</span>
                        </div>
                        <div className="text-emerald-300 font-semibold mt-0.5">
                          {m.attendanceImpact}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Action Checklist */}
                    {totalChecks > 0 && (
                      <div className="mt-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2">
                          <span>IMPLEMENTATION & TRAINING CHECKLIST</span>
                          <span>
                            {doneChecks}/{totalChecks} completed
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
                              className="w-full flex items-start gap-2 text-left text-xs py-1 px-1.5 rounded-lg hover:bg-slate-900 transition"
                            >
                              {item.done ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              )}
                              <span
                                className={
                                  item.done
                                    ? "line-through text-slate-500"
                                    : "text-slate-200"
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

                  {/* Footer Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>
                      Owner: <strong className="text-slate-200">{m.owner}</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      {m.estimatedBudget && (
                        <span>
                          Est. Budget:{" "}
                          <strong className="text-amber-300">
                            {m.estimatedBudget}
                          </strong>
                        </span>
                      )}
                      <span>
                        Target Date:{" "}
                        <strong className="text-indigo-300">
                          {m.targetDate}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ministry Achievements & Trophy Wall */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Online Ministry Achievements & Trophy Wall</span>
              </h2>
              <p className="text-xs text-slate-400">
                Celebrate team milestones as your camera crew, moderators, and online congregation grow. Click any badge to toggle unlocked status.
              </p>
            </div>

            <button
              onClick={() => setShowAddAchievement(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition self-start sm:self-auto"
            >
              <Award className="w-4 h-4" />
              <span>+ Add Custom Achievement</span>
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
                  className={`cursor-pointer rounded-2xl p-4 border transition flex flex-col justify-between ${
                    ach.unlocked
                      ? "bg-gradient-to-br from-amber-950/35 via-slate-900 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-85"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            ach.unlocked
                              ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            {ach.category}
                          </span>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {ach.title}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          ach.unlocked
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {ach.unlocked ? "UNLOCKED" : "LOCKED"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        {ach.currentValue} / {ach.targetValue} {ach.unit}
                      </span>
                      <span>
                        {ach.unlocked && ach.unlockedAt
                          ? `Achieved ${ach.unlockedAt}`
                          : `${pct}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ach.unlocked
                            ? "bg-gradient-to-r from-amber-400 to-emerald-400"
                            : "bg-indigo-500"
                        }`}
                        style={{ width: `${ach.unlocked ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal 1: Edit Attendance Targets */}
      {showGoalEditor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Configure Targeted Attendance & Growth Goals
                </h3>
              </div>
              <button
                onClick={() => setShowGoalEditor(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-indigo-300 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Trained Team Goal (Crew)
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGoalEditor(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Attendance Targets</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Timeline Milestone */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Add Upgrade or Training Milestone to Timeline
                </h3>
              </div>
              <button
                onClick={() => setShowAddMilestone(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Roadmap Phase
                  </label>
                  <select
                    value={newMs.phase}
                    onChange={(e) =>
                      setNewMs({ ...newMs, phase: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="PHASE_1">
                      Phase 1: Camera Hardware & Studio
                    </option>
                    <option value="PHASE_2">
                      Phase 2: Camera & Moderator Training
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
                  <label className="block text-slate-400 mb-1 font-medium">
                    Category
                  </label>
                  <select
                    value={newMs.category}
                    onChange={(e) =>
                      setNewMs({ ...newMs, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CAMERA_HARDWARE">Camera & Hardware</option>
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
                <label className="block text-slate-400 mb-1 font-medium">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Install Wireless Tally Lights & Train 3 New Camera Volunteers"
                  value={newMs.title}
                  onChange={(e) =>
                    setNewMs({ ...newMs, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Description & Objective
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what hardware will be installed or how the team will be trained..."
                  value={newMs.description}
                  onChange={(e) =>
                    setNewMs({ ...newMs, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Camera / Hardware / Tool Spec
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sony FX30 + Hollyland Intercom"
                    value={newMs.hardwareOrToolSpec}
                    onChange={(e) =>
                      setNewMs({
                        ...newMs,
                        hardwareOrToolSpec: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Expected Attendance Impact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., +50 Peak Viewers / +25% Retention"
                    value={newMs.attendanceImpact}
                    onChange={(e) =>
                      setNewMs({ ...newMs, attendanceImpact: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    value={newMs.owner}
                    onChange={(e) =>
                      setNewMs({ ...newMs, owner: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Estimated Budget
                  </label>
                  <input
                    type="text"
                    value={newMs.estimatedBudget}
                    onChange={(e) =>
                      setNewMs({ ...newMs, estimatedBudget: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={newMs.targetDate}
                    onChange={(e) =>
                      setNewMs({ ...newMs, targetDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Action Checklist Items (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Mount tripod and run HDMI cable\nTrain Saturday team on framing\nTest live switch during worship rehearsal`}
                  value={newMs.checklistRaw}
                  onChange={(e) =>
                    setNewMs({ ...newMs, checklistRaw: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Timeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Custom Achievement */}
      {showAddAchievement && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Create Custom Ministry Achievement
                </h3>
              </div>
              <button
                onClick={() => setShowAddAchievement(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAchievement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Achievement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 300+ Combined Easter Sunday Stream"
                  value={newAch.title}
                  onChange={(e) =>
                    setNewAch({ ...newAch, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What milestone does this badge celebrate?"
                  value={newAch.description}
                  onChange={(e) =>
                    setNewAch({ ...newAch, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newAch.unit}
                    onChange={(e) =>
                      setNewAch({ ...newAch, unit: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAchievement(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Add Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

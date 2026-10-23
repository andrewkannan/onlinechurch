import { NextRequest, NextResponse } from "next/server";
import { readFallbackStore, writeFallbackStore } from "@/lib/db";

export interface AttendanceGoals {
  currentWeeklyAttendance: number;
  currentYTViewers: number;
  currentIGViewers: number;
  phase1TargetAttendance: number;
  phase2TargetAttendance: number;
  phase3TargetAttendance: number;
  annualVisionAttendance: number;
  targetYTViewers: number;
  targetIGViewers: number;
  currentRepeatingRate: number;
  targetRepeatingRate: number;
  currentWatchMinutes: number;
  targetWatchMinutes: number;
  currentTeamSize: number;
  targetTeamSize: number;
  targetMonthlySalvations: number;
  updatedAt?: string;
}

export interface RoadmapMilestone {
  id: string;
  phase: "PHASE_1" | "PHASE_2" | "PHASE_3" | "PHASE_4";
  phaseLabel: string;
  category:
    | "CAMERA_HARDWARE"
    | "TEAM_TRAINING"
    | "BROADCAST_PRODUCTION"
    | "AUDIENCE_GROWTH"
    | "PASTORAL_CARE";
  title: string;
  description: string;
  status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING";
  priority: "HIGH" | "MEDIUM" | "LOW";
  targetDate: string;
  owner: string;
  hardwareOrToolSpec?: string;
  estimatedBudget?: string;
  attendanceImpact: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export interface MinistryAchievement {
  id: string;
  title: string;
  description: string;
  category: "HARDWARE" | "TRAINING" | "ATTENDANCE" | "ENGAGEMENT" | "SPIRITUAL";
  targetValue: number;
  currentValue: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  badgeColor: "amber" | "emerald" | "indigo" | "rose" | "violet";
}

const DEFAULT_GOALS: AttendanceGoals = {
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
};

const DEFAULT_MILESTONES: RoadmapMilestone[] = [
  {
    id: "ms-done-qc",
    phase: "PHASE_1",
    phaseLabel: "Completed Since Last Meeting",
    category: "BROADCAST_PRODUCTION",
    title: "1. Quality Checker on Every Service",
    description: "Checks audio & video live and reports immediately to Online Service Director to fix on the spot.",
    status: "COMPLETED",
    priority: "HIGH",
    targetDate: "2026-10-05",
    owner: "Daniel (QC-01) & Andrew (Director)",
    hardwareOrToolSpec: "Live QC Pad + Director Alert Queue",
    estimatedBudget: "RM 0",
    attendanceImpact: "Instant audio/video fixes (<60s)",
    checklist: [
      { id: "qc-1", text: "Assign dedicated Quality Checker every Sunday", done: true },
      { id: "qc-2", text: "Report live faults immediately to Online Service Director", done: true },
    ],
  },
  {
    id: "ms-done-ig",
    phase: "PHASE_1",
    phaseLabel: "Completed Since Last Meeting",
    category: "AUDIENCE_GROWTH",
    title: "2. Instagram Live Streaming (Past 3 Weeks)",
    description: "Added +5 to 10 weekly viewers; more non-believers joining; clearer video quality than YouTube.",
    status: "COMPLETED",
    priority: "HIGH",
    targetDate: "2026-10-12",
    owner: "Online Service Team",
    hardwareOrToolSpec: "Landscape 16:9 + Top/Bottom Blur Frame",
    estimatedBudget: "RM 0",
    attendanceImpact: "+5 to +10 Viewers / Week",
    checklist: [
      { id: "ig-1", text: "Broadcast landscape live with top & bottom blur on IG", done: true },
      { id: "ig-2", text: "Track weekly IG viewer growth (+5 to 10/wk)", done: true },
    ],
  },
  {
    id: "ms-done-cable",
    phase: "PHASE_1",
    phaseLabel: "Completed Since Last Meeting",
    category: "CAMERA_HARDWARE",
    title: "3. Replaced Video Cables (Zero Lag)",
    description: "Fixed within Week 1 after last meeting — no more video lagging or freezing.",
    status: "COMPLETED",
    priority: "HIGH",
    targetDate: "2026-10-05",
    owner: "Kevin (CAM-01) & Andrew",
    hardwareOrToolSpec: "High-Speed Shielded HDMI/SDI Run",
    estimatedBudget: "Completed",
    attendanceImpact: "0 Video Lagging",
    checklist: [
      { id: "cb-1", text: "Replace faulty camera-to-switcher video cables", done: true },
      { id: "cb-2", text: "Verify zero frame drops across 3 Sundays", done: true },
    ],
  },
  {
    id: "ms-done-mod",
    phase: "PHASE_1",
    phaseLabel: "Completed Since Last Meeting",
    category: "PASTORAL_CARE",
    title: "4. More Media Team Live Interaction",
    description: "Active welcome messages, sermon points, and prayer responses on livestreams.",
    status: "COMPLETED",
    priority: "MEDIUM",
    targetDate: "2026-10-12",
    owner: "Hannah (MOD-01) & Media Team",
    hardwareOrToolSpec: "YouTube & IG Live Chat",
    estimatedBudget: "RM 0",
    attendanceImpact: "Higher viewer engagement",
    checklist: [
      { id: "md-1", text: "Welcome viewers & post sermon points in live chat", done: true },
      { id: "md-2", text: "Log weekly views, comments & feedbacks in report", done: true },
    ],
  },
  {
    id: "ms-plan-1",
    phase: "PHASE_1",
    phaseLabel: "Upcoming Plan 1 · Week 1–2",
    category: "BROADCAST_PRODUCTION",
    title: "Plan 1 · Centralised System for Online Team",
    description: "Role checklists, clean Monthly Serving Roster, Sunday 6:00 AM check → 8:25 AM Go-Live gate & Post-Service Report.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-01",
    owner: "Andrew (Online Service Director)",
    hardwareOrToolSpec: "In-House Web Hub",
    estimatedBudget: "RM 0 (In-House)",
    attendanceImpact: "100% Sunday Readiness",
    checklist: [
      { id: "p1-1", text: "Role-based logins & Monthly Serving Roster active", done: true },
      { id: "p1-2", text: "Sunday 6:00 AM check → 8:25 AM Director Go-Live gate", done: true },
      { id: "p1-3", text: "Post-service QC logs & Moderator views/comments report", done: false },
    ],
  },
  {
    id: "ms-plan-2",
    phase: "PHASE_2",
    phaseLabel: "Upcoming Plan 2 · Nov–Dec 2026",
    category: "CAMERA_HARDWARE",
    title: "Plan 2 · Equipment Upgrades (Camera 2, Crowd Mic, ATEM)",
    description: "Camera 2nd View (Nov 2026, more on crowd), Live Crowd Mic (Dec 2026, Sam's quote), and ATEM Switcher (still in checking).",
    status: "UPCOMING",
    priority: "HIGH",
    targetDate: "2026-11-30",
    owner: "Andrew & Sam",
    hardwareOrToolSpec: "Camera 2 (RM 3k–4.5k) · Crowd Mic (RM 800–1.8k) · ATEM (Checking)",
    estimatedBudget: "RM 3,800 – RM 6,300 + ATEM (TBC)",
    attendanceImpact: "Target 50+ Weekly Viewers (2x)",
    checklist: [
      { id: "p2-1", text: "Camera (2nd View) + Tripod/Cable: RM 3,000–4,500 (Targeted Nov 2026 · Crowd/Worship)", done: false },
      { id: "p2-2", text: "Live Crowd Mic + Stand/Cable: RM 800–1,800 (Sam's quote · Targeted Dec 2026)", done: false },
      { id: "p2-3", text: "ATEM Switcher: Confirm final model & quotation (Still in checking)", done: false },
    ],
  },
  {
    id: "ms-plan-3",
    phase: "PHASE_2",
    phaseLabel: "Upcoming Plan 3 · Starting This Week",
    category: "TEAM_TRAINING",
    title: "Plan 3 · Videographers, Cameramen & Media Team Training",
    description: "Starting this week, led by Gaby (Media Director). Training plan chart still pending.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-15",
    owner: "Gaby (Media Director)",
    hardwareOrToolSpec: "Camera 1 & 2nd Crowd/Worship View Training",
    estimatedBudget: "RM 0",
    attendanceImpact: "Trained rotation crew",
    checklist: [
      { id: "p3-1", text: "Kickoff training this week (Led by Gaby - Media Director)", done: true },
      { id: "p3-2", text: "Finalise training plan chart for Videographers & Cameramen", done: false },
      { id: "p3-3", text: "Complete hands-on framing & 2-camera practice", done: false },
    ],
  },
  {
    id: "ms-plan-4",
    phase: "PHASE_3",
    phaseLabel: "Upcoming Plan 4 · Weekly Routine",
    category: "AUDIENCE_GROWTH",
    title: "Plan 4 · Social Media Awareness (Pre-Sunday Reels & Stories)",
    description: "Led by Gaby (Media Director) & Social Media Director to reach 50+ weekly viewers.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-01",
    owner: "Gaby (Media Director) & Social Media Director",
    hardwareOrToolSpec: "IG Reels, Story Countdown & WhatsApp Re-Share",
    estimatedBudget: "RM 0",
    attendanceImpact: "Target 50+ Viewers / Week (2x)",
    checklist: [
      { id: "p4-1", text: "Mid-Week Sermon Highlight Reel", done: false },
      { id: "p4-2", text: "Saturday Reel + IG Story with Countdown for Sunday 8:30 AM Live", done: false },
      { id: "p4-3", text: "Member & Media Team Re-Share to IG Stories & WhatsApp", done: false },
      { id: "p4-4", text: "Sunday Morning 8:00 AM Reminder Story", done: false },
    ],
  },
];

const DEFAULT_ACHIEVEMENTS: MinistryAchievement[] = [
  {
    id: "ach-1",
    title: "Zero Video Lag (Cables Fixed Wk 1)",
    description: "Replaced faulty video cables in Week 1 — 0 frame drops.",
    category: "HARDWARE",
    targetValue: 1,
    currentValue: 1,
    unit: "completed",
    unlocked: true,
    unlockedAt: "2026-10-05",
    badgeColor: "emerald",
  },
  {
    id: "ach-2",
    title: "IG Live Launch (+5–10 Viewers/Wk)",
    description: "3 weeks live on Instagram reaching new non-believers.",
    category: "ATTENDANCE",
    targetValue: 3,
    currentValue: 3,
    unit: "weeks",
    unlocked: true,
    unlockedAt: "2026-10-19",
    badgeColor: "indigo",
  },
  {
    id: "ach-3",
    title: "Double Weekly Viewership (50+ / Wk)",
    description: "Reach 50+ combined weekly viewers across YouTube & Instagram.",
    category: "ATTENDANCE",
    targetValue: 50,
    currentValue: 25,
    unit: "viewers/wk",
    unlocked: false,
    unlockedAt: null,
    badgeColor: "amber",
  },
];

function getRoadmapState() {
  const store = readFallbackStore();
  if (!store.roadmap_v2) {
    store.roadmap_v2 = {
      goals: DEFAULT_GOALS,
      milestones: DEFAULT_MILESTONES,
      achievements: DEFAULT_ACHIEVEMENTS,
    };
    writeFallbackStore("roadmap_v2", store.roadmap_v2);
  }
  return store.roadmap_v2 as {
    goals: AttendanceGoals;
    milestones: RoadmapMilestone[];
    achievements: MinistryAchievement[];
  };
}

export async function GET() {
  const roadmap = getRoadmapState();
  return NextResponse.json(roadmap);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getRoadmapState();

    if (body.action === "UPDATE_GOALS" && body.goals) {
      current.goals = {
        ...current.goals,
        ...body.goals,
        updatedAt: new Date().toISOString(),
      };
    }

    if (body.action === "ADD_MILESTONE" && body.milestone) {
      const m = body.milestone;
      const newMilestone: RoadmapMilestone = {
        id: `ms-${Date.now()}`,
        phase: m.phase || "PHASE_1",
        phaseLabel: m.phaseLabel || "Action Plan",
        category: m.category || "CAMERA_HARDWARE",
        title: String(m.title || "New Action Item").trim(),
        description: String(m.description || "").trim(),
        status: m.status || "UPCOMING",
        priority: m.priority || "MEDIUM",
        targetDate: m.targetDate || new Date().toISOString().slice(0, 10),
        owner: m.owner || "Online Service Team",
        hardwareOrToolSpec: m.hardwareOrToolSpec || "",
        estimatedBudget: m.estimatedBudget || "RM 0",
        attendanceImpact: m.attendanceImpact || "50+ Viewers Goal",
        checklist: Array.isArray(m.checklist) ? m.checklist : [],
      };
      current.milestones = [newMilestone, ...current.milestones];
    }

    if (body.action === "UPDATE_MILESTONE" && body.id) {
      current.milestones = current.milestones.map((m) =>
        m.id === body.id ? { ...m, ...body.updates } : m
      );
    }

    if (body.action === "TOGGLE_CHECKLIST" && body.milestoneId && body.checkId) {
      current.milestones = current.milestones.map((m) => {
        if (m.id !== body.milestoneId) return m;
        const updatedList = (m.checklist || []).map((c) =>
          c.id === body.checkId ? { ...c, done: !c.done } : c
        );
        const allDone =
          updatedList.length > 0 && updatedList.every((c) => c.done);
        const anyDone = updatedList.some((c) => c.done);
        return {
          ...m,
          checklist: updatedList,
          status: allDone
            ? "COMPLETED"
            : anyDone
            ? "IN_PROGRESS"
            : m.status,
        };
      });
    }

    if (body.action === "DELETE_MILESTONE" && body.id) {
      current.milestones = current.milestones.filter((m) => m.id !== body.id);
    }

    if (body.action === "TOGGLE_ACHIEVEMENT" && body.id) {
      current.achievements = current.achievements.map((a) => {
        if (a.id !== body.id) return a;
        const nextUnlocked = !a.unlocked;
        return {
          ...a,
          unlocked: nextUnlocked,
          currentValue: nextUnlocked ? a.targetValue : a.currentValue,
          unlockedAt: nextUnlocked
            ? new Date().toISOString().slice(0, 10)
            : null,
        };
      });
    }

    writeFallbackStore("roadmap_v2", current);
    return NextResponse.json({ success: true, ...current });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update roadmap" },
      { status: 400 }
    );
  }
}

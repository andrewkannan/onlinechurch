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
};

const DEFAULT_MILESTONES: RoadmapMilestone[] = [
  {
    id: "ms-cam-1",
    phase: "PHASE_1",
    phaseLabel: "Phase 1: Camera Hardware & Studio Foundation",
    category: "CAMERA_HARDWARE",
    title: "Primary & Secondary Camera Upgrade (PTZ + Mirrorless Cinema Rig)",
    description:
      "Install dedicated 4K HDMI/SDI primary pulpit camera (tight shot on Pastor) and wide worship angle camera connected via video switcher for dynamic multi-angle cuts.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-01",
    owner: "Media & Production Lead",
    hardwareOrToolSpec: "Sony FX30 / Canon CR-N300 PTZ + Blackmagic ATEM Mini Extreme ISO",
    estimatedBudget: "$2,800",
    attendanceImpact: "+35% Viewer Watch Time & Retention",
    checklist: [
      { id: "c1", text: "Mount Main Pulpit Telephoto Camera on fluid-head tripod", done: true },
      { id: "c2", text: "Set up Wide Angle Congregation / Worship Stage Camera", done: true },
      { id: "c3", text: "Connect HDMI/SDI feeds into ATEM Switcher & test color matching", done: false },
      { id: "c4", text: "Configure vertical 9:16 crop feed for Instagram Live clarity", done: false },
    ],
  },
  {
    id: "ms-cam-2",
    phase: "PHASE_1",
    phaseLabel: "Phase 1: Camera Hardware & Studio Foundation",
    category: "CAMERA_HARDWARE",
    title: "Dedicated Broadcast Audio Bus & Stage Lighting Calibration",
    description:
      "Eliminate room echo by routing a dedicated Post-Fader Aux/Matrix mix from the front-of-house digital console + ambient crowd mics directly into the stream encoder.",
    status: "COMPLETED",
    priority: "HIGH",
    targetDate: "2026-10-20",
    owner: "Sound & Lighting Engineer",
    hardwareOrToolSpec: "XLR Broadcast Matrix Bus + 2x Room Condenser Mics + Key Light 5600K",
    estimatedBudget: "$650",
    attendanceImpact: "+40% First-5-Minute Viewer Retention",
    checklist: [
      { id: "c5", text: "Route dedicated stereo broadcast bus from soundboard to USB audio interface", done: true },
      { id: "c6", text: "Add two ambient congregation mics for worship atmosphere", done: true },
      { id: "c7", text: "Balance pulpit key light & backlight so camera sensor has zero grain", done: true },
    ],
  },
  {
    id: "ms-train-1",
    phase: "PHASE_2",
    phaseLabel: "Phase 2: Camera Crew & Prophetic Moderator Training",
    category: "TEAM_TRAINING",
    title: "Camera Operator Framing, Movement & Worship Flow Training",
    description:
      "Train volunteer camera operators on smooth pan/tilt speeds, rule-of-thirds framing, anticipating prophetic ministry moments, and avoiding jarring zoom jumps.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-15",
    owner: "Production Director",
    hardwareOrToolSpec: "Wireless Tally Lights + Crew Intercom Headsets (Hollyland Solidcom)",
    estimatedBudget: "$800",
    attendanceImpact: "+50 Target Live Viewers (200 Peak Goal)",
    checklist: [
      { id: "c8", text: "Create 1-page Camera Shot Sheet (Worship, Welcome, Sermon, Altar Call)", done: true },
      { id: "c9", text: "Conduct 2-hour Saturday rehearsal with 4 volunteer camera operators", done: false },
      { id: "c10", text: "Train switcher director on lower-thirds scripture & cue timing", done: false },
    ],
  },
  {
    id: "ms-train-2",
    phase: "PHASE_2",
    phaseLabel: "Phase 2: Camera Crew & Prophetic Moderator Training",
    category: "TEAM_TRAINING",
    title: "Online Moderator Team: Fast Prophetic Cue & PDF Sermon Sync Drill",
    description:
      "Train chat moderators to upload Pastor's PDF sermon notes before service, fire one-click prophetic declarations in real-time as the Pastor speaks, and welcome viewers by name within 15 seconds.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    targetDate: "2026-11-22",
    owner: "Online Church Lead & Moderators",
    hardwareOrToolSpec: "Online Church Live Hub (Sermon Cue Queue + Dual Chat Bridge)",
    estimatedBudget: "$0 (In-House System)",
    attendanceImpact: "+30% Repeating Viewer Return Rate",
    checklist: [
      { id: "c11", text: "Train moderators on PDF Sermon Notes auto-import 30 mins pre-service", done: true },
      { id: "c12", text: "Practice 'Amen / Declaration' rapid release within 3 seconds of Pastor's point", done: true },
      { id: "c13", text: "Train Prayer Triage leads on AI pastoral prayer responses & private DM care", done: false },
    ],
  },
  {
    id: "ms-growth-1",
    phase: "PHASE_3",
    phaseLabel: "Phase 3: Repeating Audience & Multi-Platform Funnel",
    category: "AUDIENCE_GROWTH",
    title: "Pre-Service Digital Lobby & Repeating Viewer Check-In Ritual",
    description:
      "Launch a 10-minute pre-service countdown with a live digital host greeting returning regulars by name ('Where are you watching from today?') to boost YouTube & IG algorithm push.",
    status: "UPCOMING",
    priority: "MEDIUM",
    targetDate: "2026-12-06",
    owner: "Digital Hospitality Team",
    hardwareOrToolSpec: "OBS Countdown Scene + Live Chat Check-In Roster",
    estimatedBudget: "$150",
    attendanceImpact: "+150 Live Viewers (350 Peak Goal)",
    checklist: [
      { id: "c14", text: "Design 10-minute high-energy countdown with chat prompt overlays", done: false },
      { id: "c15", text: "Log every chatting viewer into Repeating Audience CRM during first 15 mins", done: false },
      { id: "c16", text: "Set up Instagram keyword DM automation ('Type PRAY or NEW in chat')", done: false },
    ],
  },
  {
    id: "ms-growth-2",
    phase: "PHASE_3",
    phaseLabel: "Phase 3: Repeating Audience & Multi-Platform Funnel",
    category: "PASTORAL_CARE",
    title: "24-Hour Visitor & Prayer Request Follow-Up Pipeline",
    description:
      "Ensure every first-time online visitor and prayer requester receives a personal message or 30-second video prayer from the team before Monday evening.",
    status: "UPCOMING",
    priority: "HIGH",
    targetDate: "2026-12-20",
    owner: "Pastoral Care & Follow-Up Team",
    hardwareOrToolSpec: "Online Church Visitor & Prayer Report Export",
    estimatedBudget: "$0",
    attendanceImpact: "Converts 45% of First-Timers into Repeating Viewers",
    checklist: [
      { id: "c17", text: "Export Sunday Visitor & Prayer Report immediately after benediction", done: false },
      { id: "c18", text: "Assign follow-up pastors to every 'OPEN' and 'FOLLOW_UP' prayer request", done: false },
    ],
  },
  {
    id: "ms-exp-1",
    phase: "PHASE_4",
    phaseLabel: "Phase 4: Digital Campus & 1,000+ Viewer Expansion",
    category: "BROADCAST_PRODUCTION",
    title: " Mid-Week Prophetic Reels/Shorts Engine & Online Watch Parties",
    description:
      "Repurpose Sunday's top 3 prophetic moments into vertical Reels/Shorts with direct reminders for Sunday Live, and launch regional home Watch Parties.",
    status: "UPCOMING",
    priority: "MEDIUM",
    targetDate: "2027-02-01",
    owner: "Digital Campus Pastor & Social Media Team",
    hardwareOrToolSpec: "4K ISO Recording Files + Vertical Clip Templates",
    estimatedBudget: "$300",
    attendanceImpact: "Breakthrough to 500–1,000+ Weekly Viewers",
    checklist: [
      { id: "c19", text: "Cut 3 vertical 60-second prophetic clips every Monday from ISO recordings", done: false },
      { id: "c20", text: "Recruit 5 Online Watch Party hosts in different cities/timezones", done: false },
    ],
  },
];

const DEFAULT_ACHIEVEMENTS: MinistryAchievement[] = [
  {
    id: "ach-1",
    title: "Broadcast Studio Sound & Light Ready",
    description: "Configured clean soundboard matrix audio feed and calibrated stage lighting for stream clarity.",
    category: "HARDWARE",
    targetValue: 1,
    currentValue: 1,
    unit: "milestone",
    unlocked: true,
    unlockedAt: "2026-10-10",
    badgeColor: "emerald",
  },
  {
    id: "ach-2",
    title: "Prophetic Sermon Cue Speed",
    description: "Uploaded Pastor's PDF sermon notes and released 25+ instant prophetic cues into live chat.",
    category: "ENGAGEMENT",
    targetValue: 25,
    currentValue: 25,
    unit: "cues",
    unlocked: true,
    unlockedAt: "2026-10-14",
    badgeColor: "indigo",
  },
  {
    id: "ach-3",
    title: "Multi-Cam Broadcast Upgrade",
    description: "Complete 4K multi-camera setup with switcher cuts for YouTube 16:9 and Instagram 9:16.",
    category: "HARDWARE",
    targetValue: 4,
    currentValue: 2,
    unit: "steps",
    unlocked: false,
    unlockedAt: null,
    badgeColor: "amber",
  },
  {
    id: "ach-4",
    title: "Certified Moderator & Camera Squad",
    description: "Train and certify 12 volunteer camera operators and prophetic chat moderators.",
    category: "TRAINING",
    targetValue: 12,
    currentValue: 4,
    unit: "volunteers",
    unlocked: false,
    unlockedAt: null,
    badgeColor: "violet",
  },
  {
    id: "ach-5",
    title: "Phase 1 Attendance Breakthrough (200+ Live)",
    description: "Reach 200+ combined peak concurrent viewers across YouTube Live and Instagram Live.",
    category: "ATTENDANCE",
    targetValue: 200,
    currentValue: 142,
    unit: "viewers",
    unlocked: false,
    unlockedAt: null,
    badgeColor: "amber",
  },
  {
    id: "ach-6",
    title: "Loyal Online Congregation (70% Repeating)",
    description: "Build a sticky online church family where 70%+ of weekly viewers are returning regulars.",
    category: "ATTENDANCE",
    targetValue: 70,
    currentValue: 58,
    unit: "% retention",
    unlocked: false,
    unlockedAt: null,
    badgeColor: "rose",
  },
];

function getRoadmapState() {
  const store = readFallbackStore();
  if (!store.roadmap) {
    store.roadmap = {
      goals: DEFAULT_GOALS,
      milestones: DEFAULT_MILESTONES,
      achievements: DEFAULT_ACHIEVEMENTS,
    };
    writeFallbackStore("roadmap", store.roadmap);
  }
  return store.roadmap as {
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

    // Action 1: Update attendance goals
    if (body.action === "UPDATE_GOALS" && body.goals) {
      current.goals = {
        ...current.goals,
        ...body.goals,
        updatedAt: new Date().toISOString(),
      };
    }

    // Action 2: Add a new timeline milestone
    if (body.action === "ADD_MILESTONE" && body.milestone) {
      const m = body.milestone;
      const newMilestone: RoadmapMilestone = {
        id: `ms-${Date.now()}`,
        phase: m.phase || "PHASE_1",
        phaseLabel:
          m.phase === "PHASE_1"
            ? "Phase 1: Camera Hardware & Studio Foundation"
            : m.phase === "PHASE_2"
            ? "Phase 2: Camera Crew & Prophetic Moderator Training"
            : m.phase === "PHASE_3"
            ? "Phase 3: Repeating Audience & Multi-Platform Funnel"
            : "Phase 4: Digital Campus & 1,000+ Viewer Expansion",
        category: m.category || "CAMERA_HARDWARE",
        title: String(m.title || "New Upgrade Milestone").trim(),
        description: String(m.description || "").trim(),
        status: m.status || "UPCOMING",
        priority: m.priority || "MEDIUM",
        targetDate: m.targetDate || new Date().toISOString().slice(0, 10),
        owner: m.owner || "Online Ministry Team",
        hardwareOrToolSpec: m.hardwareOrToolSpec || "",
        estimatedBudget: m.estimatedBudget || "$0",
        attendanceImpact: m.attendanceImpact || "+15% Engagement",
        checklist: Array.isArray(m.checklist) ? m.checklist : [],
      };
      current.milestones = [newMilestone, ...current.milestones];
    }

    // Action 3: Toggle or update a milestone
    if (body.action === "UPDATE_MILESTONE" && body.id) {
      current.milestones = current.milestones.map((m) =>
        m.id === body.id ? { ...m, ...body.updates } : m
      );
    }

    // Action 4: Toggle a checklist item inside a milestone
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

    // Action 5: Delete a milestone
    if (body.action === "DELETE_MILESTONE" && body.id) {
      current.milestones = current.milestones.filter((m) => m.id !== body.id);
    }

    // Action 6: Unlock or update an achievement
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

    // Action 7: Add custom achievement
    if (body.action === "ADD_ACHIEVEMENT" && body.achievement) {
      const a = body.achievement;
      const newAch: MinistryAchievement = {
        id: `ach-${Date.now()}`,
        title: String(a.title || "New Ministry Achievement").trim(),
        description: String(a.description || "").trim(),
        category: a.category || "ATTENDANCE",
        targetValue: Number(a.targetValue) || 100,
        currentValue: Number(a.currentValue) || 0,
        unit: a.unit || "viewers",
        unlocked: Boolean(a.unlocked),
        unlockedAt: a.unlocked ? new Date().toISOString().slice(0, 10) : null,
        badgeColor: a.badgeColor || "amber",
      };
      current.achievements = [newAch, ...current.achievements];
    }

    writeFallbackStore("roadmap", current);
    return NextResponse.json({ success: true, ...current });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update roadmap" },
      { status: 400 }
    );
  }
}

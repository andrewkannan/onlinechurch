import { NextRequest, NextResponse } from "next/server";
import { readFallbackStore, writeFallbackStore } from "@/lib/db";

export type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";

export interface CrewChecklistItem {
  id: string;
  role: CrewRole;
  category: string;
  task: string;
  detail: string;
  isCritical: boolean;
  checked: boolean;
  checkedBy?: string | null;
  checkedAt?: string | null;
}

export interface ActiveCrewMember {
  id: string;
  name: string;
  role: CrewRole;
  device: string;
  loggedInAt: string;
  lastActiveAt: string;
}

export interface QcLogItem {
  id: string;
  serviceDate: string;
  streamTimestamp: string;
  type: "ISSUE" | "IMPROVEMENT" | "ACHIEVEMENT";
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WIN";
  platform: "YOUTUBE" | "INSTAGRAM" | "BOTH";
  station: "CAMERA" | "AUDIO" | "MODERATOR" | "LIGHTING" | "NETWORK" | "DIRECTOR";
  title: string;
  description: string;
  actionToTake: string;
  assignedTo: string;
  timelineToSolve: string;
  targetDate: string;
  status: "WAITING_DIRECTOR" | "IN_PROGRESS" | "RESOLVED";
  screenshotUrl?: string | null;
  markerPos?: { x: number; y: number } | null;
  loggedBy: string;
  createdAt: string;
  pushedToRoadmap?: boolean;
}

const DEFAULT_CHECKLISTS: CrewChecklistItem[] = [
  // CAMERA (Short, fast-scan labels)
  {
    id: "chk-cam-1",
    role: "CAMERA",
    category: "Cam 1",
    task: "Pulpit Cam Framing & Focus",
    detail: "Headroom & sharpness locked",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin",
    checkedAt: "09:32 AM",
  },
  {
    id: "chk-cam-2",
    role: "CAMERA",
    category: "Color",
    task: "White Balance 5600K Matched",
    detail: "Cam 1 & Cam 2 colors match",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin",
    checkedAt: "09:35 AM",
  },
  {
    id: "chk-cam-3",
    role: "CAMERA",
    category: "IG 9:16",
    task: "Instagram 9:16 Vertical Safe-Zone",
    detail: "Center grid aligned",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin",
    checkedAt: "09:37 AM",
  },
  {
    id: "chk-cam-4",
    role: "CAMERA",
    category: "Power",
    task: "AC Power & HDMI Signal Lock",
    detail: "Continuous power + switcher feed",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin",
    checkedAt: "09:38 AM",
  },

  // AUDIO
  {
    id: "chk-aud-1",
    role: "AUDIO",
    category: "Stream Mix",
    task: "Broadcast Bus Level (-6dB Peak)",
    detail: "Clean limiter, zero clipping",
    isCritical: true,
    checked: true,
    checkedBy: "Jason",
    checkedAt: "09:30 AM",
  },
  {
    id: "chk-aud-2",
    role: "AUDIO",
    category: "Mics",
    task: "Pastor Main + Backup Mic Tested",
    detail: "Fresh batteries + line check",
    isCritical: true,
    checked: true,
    checkedBy: "Jason",
    checkedAt: "09:34 AM",
  },
  {
    id: "chk-aud-3",
    role: "AUDIO",
    category: "Worship",
    task: "Room Mics & Pad Balance",
    detail: "Congregation ambience blended",
    isCritical: false,
    checked: true,
    checkedBy: "Jason",
    checkedAt: "09:40 AM",
  },
  {
    id: "chk-aud-4",
    role: "AUDIO",
    category: "Sync",
    task: "Audio-Video Lip Sync Verified",
    detail: "Zero echo or delay",
    isCritical: true,
    checked: true,
    checkedBy: "Jason",
    checkedAt: "09:41 AM",
  },

  // MODERATOR
  {
    id: "chk-mod-1",
    role: "MODERATOR",
    category: "Sermon PDF",
    task: "Pastor Sermon Cues Loaded",
    detail: "Scriptures & points ready",
    isCritical: true,
    checked: true,
    checkedBy: "Hannah",
    checkedAt: "09:36 AM",
  },
  {
    id: "chk-mod-2",
    role: "MODERATOR",
    category: "Live Chat",
    task: "YT & IG Chat + Auto-Prayer Ready",
    detail: "Both platforms connected",
    isCritical: true,
    checked: true,
    checkedBy: "Hannah",
    checkedAt: "09:39 AM",
  },
  {
    id: "chk-mod-3",
    role: "MODERATOR",
    category: "Links",
    task: "Giving & Connect Presets Ready",
    detail: "YT link & IG bio prompt",
    isCritical: false,
    checked: true,
    checkedBy: "Hannah",
    checkedAt: "09:41 AM",
  },
  {
    id: "chk-mod-4",
    role: "MODERATOR",
    category: "Roster",
    task: "Visitor & Regular Check-In Open",
    detail: "Ready to log viewers",
    isCritical: false,
    checked: true,
    checkedBy: "Hannah",
    checkedAt: "09:42 AM",
  },

  // QUALITY CHECKER (QC)
  {
    id: "chk-qc-1",
    role: "QC",
    category: "YouTube",
    task: "YT Stream Checked on Monitor/TV",
    detail: "1080p video + clear audio",
    isCritical: true,
    checked: true,
    checkedBy: "Daniel",
    checkedAt: "09:42 AM",
  },
  {
    id: "chk-qc-2",
    role: "QC",
    category: "Instagram",
    task: "IG Stream Checked on Phone",
    detail: "9:16 crop & audio clear",
    isCritical: true,
    checked: true,
    checkedBy: "Daniel",
    checkedAt: "09:43 AM",
  },
  {
    id: "chk-qc-3",
    role: "QC",
    category: "Network",
    task: "Bitrate Stable (0% Dropped Frames)",
    detail: "Ethernet > 50 Mbps",
    isCritical: true,
    checked: true,
    checkedBy: "Daniel",
    checkedAt: "09:43 AM",
  },
  {
    id: "chk-qc-4",
    role: "QC",
    category: "Logger",
    task: "Quick QC Pad Ready for Live",
    detail: "Screenshot & 1-tap log active",
    isCritical: false,
    checked: true,
    checkedBy: "Daniel",
    checkedAt: "09:44 AM",
  },

  // DIRECTOR
  {
    id: "chk-dir-1",
    role: "DIRECTOR",
    category: "Briefing",
    task: "Crew Huddle & Prayer Done",
    detail: "All stations aligned",
    isCritical: true,
    checked: true,
    checkedBy: "Andrew",
    checkedAt: "09:25 AM",
  },
  {
    id: "chk-dir-2",
    role: "DIRECTOR",
    category: "Countdown",
    task: "10-Min Countdown Rolling",
    detail: "Music & timer live",
    isCritical: true,
    checked: true,
    checkedBy: "Andrew",
    checkedAt: "09:50 AM",
  },
  {
    id: "chk-dir-3",
    role: "DIRECTOR",
    category: "Final Go",
    task: "Director Master Sign-Off",
    detail: "All stations 100% verified",
    isCritical: true,
    checked: true,
    checkedBy: "Andrew",
    checkedAt: "09:55 AM",
  },
];

const DEFAULT_ACTIVE_CREW: ActiveCrewMember[] = [
  {
    id: "crew-1",
    name: "Andrew",
    role: "DIRECTOR",
    device: "Director Console",
    loggedInAt: "09:20 AM",
    lastActiveAt: "Now",
  },
  {
    id: "crew-2",
    name: "Kevin",
    role: "CAMERA",
    device: "Phone",
    loggedInAt: "09:28 AM",
    lastActiveAt: "1m",
  },
  {
    id: "crew-3",
    name: "Jason",
    role: "AUDIO",
    device: "iPad",
    loggedInAt: "09:29 AM",
    lastActiveAt: "2m",
  },
  {
    id: "crew-4",
    name: "Hannah",
    role: "MODERATOR",
    device: "Laptop",
    loggedInAt: "09:31 AM",
    lastActiveAt: "Now",
  },
  {
    id: "crew-5",
    name: "Daniel",
    role: "QC",
    device: "Phone",
    loggedInAt: "09:35 AM",
    lastActiveAt: "Now",
  },
];

const DEFAULT_QC_LOGS: QcLogItem[] = [
  {
    id: "qc-seed-1",
    serviceDate: "2026-10-14",
    streamTimestamp: "10:14 AM (+14m)",
    type: "ISSUE",
    severity: "MAJOR",
    platform: "INSTAGRAM",
    station: "CAMERA",
    title: "IG 9:16 Vertical Crop Clipped Right Edge",
    description: "Pastor stepped right during worship exhortation.",
    actionToTake: "",
    assignedTo: "Pending Director",
    timelineToSolve: "Wait for Director",
    targetDate: "2026-10-18",
    status: "WAITING_DIRECTOR",
    screenshotUrl: null,
    markerPos: { x: 78, y: 45 },
    loggedBy: "Daniel (QC)",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "qc-seed-2",
    serviceDate: "2026-10-14",
    streamTimestamp: "10:38 AM (+38m)",
    type: "ACHIEVEMENT",
    severity: "WIN",
    platform: "BOTH",
    station: "MODERATOR",
    title: "Fast 2-Sec Sermon Cue & Scripture Release",
    description: "PDF Cue Deck synced with Pastor; chat engagement +42%.",
    actionToTake: "Keep Saturday 6 PM PDF upload standard",
    assignedTo: "Hannah (Mod)",
    timelineToSolve: "Done",
    targetDate: "2026-10-14",
    status: "RESOLVED",
    screenshotUrl: null,
    markerPos: null,
    loggedBy: "Daniel (QC)",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "qc-seed-3",
    serviceDate: "2026-10-14",
    streamTimestamp: "10:52 AM (+52m)",
    type: "IMPROVEMENT",
    severity: "MINOR",
    platform: "YOUTUBE",
    station: "AUDIO",
    title: "Altar Call Synth Pad Too Quiet on Mobile",
    description: "Needs +3dB boost when band stops playing.",
    actionToTake: "",
    assignedTo: "Pending Director",
    timelineToSolve: "Wait for Director",
    targetDate: "2026-10-21",
    status: "WAITING_DIRECTOR",
    screenshotUrl: null,
    markerPos: null,
    loggedBy: "Daniel (QC)",
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
];

function getCrewQcState() {
  const store = readFallbackStore();
  if (!store.crewQc || !store.crewQc.v2Compact) {
    store.crewQc = {
      v2Compact: true,
      checklists: DEFAULT_CHECKLISTS,
      activeCrew: DEFAULT_ACTIVE_CREW,
      qcLogs: DEFAULT_QC_LOGS,
      directorSignOff: {
        clearedToGoLive: false,
        directorName: "Andrew (Director)",
        clearedAt: null as string | null,
        flashNotice: "Complete your station taps on mobile.",
      },
    };
    writeFallbackStore("crewQc", store.crewQc);
  }
  return store.crewQc as {
    v2Compact: boolean;
    checklists: CrewChecklistItem[];
    activeCrew: ActiveCrewMember[];
    qcLogs: QcLogItem[];
    directorSignOff: {
      clearedToGoLive: boolean;
      directorName: string;
      clearedAt: string | null;
      flashNotice: string;
    };
  };
}

export async function GET() {
  const state = getCrewQcState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const state = getCrewQcState();

    // 1. Crew Member Login
    if (body.action === "CREW_LOGIN" && body.name && body.role) {
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const existingIdx = state.activeCrew.findIndex(
        (c) =>
          c.role === body.role &&
          c.name.toLowerCase() === String(body.name).trim().toLowerCase()
      );

      if (existingIdx >= 0) {
        state.activeCrew[existingIdx].lastActiveAt = "Now";
        state.activeCrew[existingIdx].device =
          body.device || state.activeCrew[existingIdx].device;
      } else {
        state.activeCrew.unshift({
          id: `crew-${Date.now()}`,
          name: String(body.name).trim(),
          role: body.role as CrewRole,
          device: body.device || "Phone",
          loggedInAt: nowTime,
          lastActiveAt: "Now",
        });
      }
    }

    // 2. Toggle Checklist Item
    if (body.action === "TOGGLE_CHECK" && body.id) {
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      state.checklists = state.checklists.map((item) => {
        if (item.id !== body.id) return item;
        const nextChecked = !item.checked;
        return {
          ...item,
          checked: nextChecked,
          checkedBy: nextChecked ? body.memberName || "Crew" : null,
          checkedAt: nextChecked ? nowTime : null,
        };
      });
    }

    // 3. Mark Entire Station 100% Checked in 1 Tap
    if (body.action === "CHECK_ALL_STATION" && body.role) {
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      state.checklists = state.checklists.map((item) => {
        if (body.role !== "ALL" && item.role !== body.role) return item;
        return {
          ...item,
          checked: true,
          checkedBy: item.checkedBy || body.memberName || "Crew",
          checkedAt: item.checkedAt || nowTime,
        };
      });
    }

    // 4. Add Custom Check Item
    if (body.action === "ADD_CHECK_ITEM" && body.item) {
      const i = body.item;
      state.checklists = [
        ...state.checklists,
        {
          id: `chk-${Date.now()}`,
          role: (i.role as CrewRole) || "CAMERA",
          category: String(i.category || "Check").trim(),
          task: String(i.task || "New Check").trim(),
          detail: String(i.detail || "").trim(),
          isCritical: Boolean(i.isCritical),
          checked: false,
          checkedBy: null,
          checkedAt: null,
        },
      ];
    }

    // 5. Reset Checklists
    if (body.action === "RESET_CHECKLISTS") {
      state.checklists = state.checklists.map((item) => ({
        ...item,
        checked: false,
        checkedBy: null,
        checkedAt: null,
      }));
      state.directorSignOff.clearedToGoLive = false;
      state.directorSignOff.clearedAt = null;
    }

    // 6. Director Go-Live Update
    if (body.action === "DIRECTOR_UPDATE") {
      if (body.clearedToGoLive !== undefined) {
        state.directorSignOff.clearedToGoLive = Boolean(body.clearedToGoLive);
        state.directorSignOff.directorName =
          body.directorName || state.directorSignOff.directorName;
        state.directorSignOff.clearedAt = body.clearedToGoLive
          ? new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
      }
    }

    // 7. Fast QC Log Entry -> Enters Queue as WAITING_DIRECTOR
    if (body.action === "ADD_QC_LOG" && body.log) {
      const l = body.log;
      const newLog: QcLogItem = {
        id: `qc-${Date.now()}`,
        serviceDate: l.serviceDate || new Date().toISOString().slice(0, 10),
        streamTimestamp:
          l.streamTimestamp ||
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        type: l.type || "ISSUE",
        severity: l.severity || "MAJOR",
        platform: l.platform || "BOTH",
        station: l.station || "CAMERA",
        title: String(l.title || "QC Alert").trim(),
        description: String(l.description || "").trim(),
        actionToTake: l.actionToTake ? String(l.actionToTake).trim() : "",
        assignedTo: l.assignedTo || "Pending Director",
        timelineToSolve: l.timelineToSolve || "Wait for Director",
        targetDate: l.targetDate || new Date().toISOString().slice(0, 10),
        status: l.type === "ACHIEVEMENT" ? "RESOLVED" : "WAITING_DIRECTOR",
        screenshotUrl: l.screenshotUrl || null,
        markerPos: l.markerPos || null,
        loggedBy: l.loggedBy || "QC",
        createdAt: new Date().toISOString(),
        pushedToRoadmap: false,
      };
      state.qcLogs = [newLog, ...state.qcLogs];
    }

    // 8. Director Decision on a Queued QC Item (Sets Action, Owner, Timeline & Status)
    if (body.action === "DIRECTOR_DECIDE_QC" && body.id) {
      state.qcLogs = state.qcLogs.map((log) => {
        if (log.id !== body.id) return log;
        return {
          ...log,
          actionToTake:
            body.actionToTake !== undefined
              ? String(body.actionToTake)
              : log.actionToTake,
          assignedTo:
            body.assignedTo !== undefined
              ? String(body.assignedTo)
              : log.assignedTo,
          timelineToSolve:
            body.timelineToSolve !== undefined
              ? String(body.timelineToSolve)
              : log.timelineToSolve,
          targetDate:
            body.targetDate !== undefined
              ? String(body.targetDate)
              : log.targetDate,
          status: body.status || "IN_PROGRESS",
        };
      });
    }

    // 9. Update QC Status
    if (body.action === "UPDATE_QC_STATUS" && body.id && body.status) {
      state.qcLogs = state.qcLogs.map((log) =>
        log.id === body.id ? { ...log, status: body.status } : log
      );
    }

    // 10. Push QC Item to Roadmap
    if (body.action === "PUSH_QC_TO_ROADMAP" && body.id) {
      const targetLog = state.qcLogs.find((l) => l.id === body.id);
      if (targetLog) {
        targetLog.pushedToRoadmap = true;
        const fullStore = readFallbackStore();
        if (fullStore.roadmap && Array.isArray(fullStore.roadmap.milestones)) {
          fullStore.roadmap.milestones.unshift({
            id: `ms-qc-${Date.now()}`,
            phase: "PHASE_1",
            phaseLabel: "Phase 1: Camera Hardware & Studio Foundation",
            category:
              targetLog.station === "CAMERA"
                ? "CAMERA_HARDWARE"
                : "TEAM_TRAINING",
            title: `[QC] ${targetLog.title}`,
            description: targetLog.actionToTake || targetLog.description,
            status: "IN_PROGRESS",
            priority: "HIGH",
            targetDate: targetLog.targetDate,
            owner: targetLog.assignedTo,
            hardwareOrToolSpec: `${targetLog.station} (${targetLog.platform})`,
            estimatedBudget: "$0",
            attendanceImpact: "Live Quality Fix",
            checklist: [
              {
                id: `chk-qc-${Date.now()}`,
                text: targetLog.actionToTake || targetLog.title,
                done: false,
              },
            ],
          });
          writeFallbackStore("roadmap", fullStore.roadmap);
        }
      }
    }

    writeFallbackStore("crewQc", state);
    return NextResponse.json({ success: true, ...state });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update Crew & QC" },
      { status: 400 }
    );
  }
}

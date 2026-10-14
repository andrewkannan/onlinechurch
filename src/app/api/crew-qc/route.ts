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
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  screenshotUrl?: string | null;
  markerPos?: { x: number; y: number } | null;
  loggedBy: string;
  createdAt: string;
  pushedToRoadmap?: boolean;
}

const DEFAULT_CHECKLISTS: CrewChecklistItem[] = [
  // CAMERA STATION
  {
    id: "chk-cam-1",
    role: "CAMERA",
    category: "Framing & Optics",
    task: "Main Pulpit Camera (Cam 1) 4K Framing, Focus & Headroom",
    detail: "Verify rule-of-thirds headroom on Pastor's pulpit mark and lock fluid-head tripod drag.",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin (Cam 1)",
    checkedAt: "09:32 AM",
  },
  {
    id: "chk-cam-2",
    role: "CAMERA",
    category: "Color & Exposure",
    task: "White Balance (5600K) & ISO/Aperture Matched Across All Cameras",
    detail: "Match skin tones between Cam 1 (Tight) and Cam 2 (Wide Worship) so cuts look seamless.",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin (Cam 1)",
    checkedAt: "09:35 AM",
  },
  {
    id: "chk-cam-3",
    role: "CAMERA",
    category: "Instagram 9:16",
    task: "Instagram Live 9:16 Vertical Crop Center-Aligned",
    detail: "Ensure Pastor and worship leader stay inside the central 9:16 vertical safe-zone for IG viewers.",
    isCritical: true,
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },
  {
    id: "chk-cam-4",
    role: "CAMERA",
    category: "Power & Signal",
    task: "AC Dummy Batteries Connected & HDMI/SDI Cables Strain-Relieved",
    detail: "Confirm continuous AC power on all cameras and clean 1080p60/4K signal into ATEM switcher.",
    isCritical: true,
    checked: true,
    checkedBy: "Kevin (Cam 1)",
    checkedAt: "09:38 AM",
  },

  // AUDIO STATION
  {
    id: "chk-aud-1",
    role: "AUDIO",
    category: "Broadcast Mix",
    task: "Dedicated Broadcast Matrix / Aux Bus Level Checked (-12dB to -6dB)",
    detail: "Verify broadcast stream audio peaks at -6dB LUFS -14 with limiter engaged so YouTube/IG never clips.",
    isCritical: true,
    checked: true,
    checkedBy: "Jason (Sound)",
    checkedAt: "09:30 AM",
  },
  {
    id: "chk-aud-2",
    role: "AUDIO",
    category: "Microphones",
    task: "Pastor Primary Headset + Handheld Backup Mic Fresh Batteries & Line Check",
    detail: "Confirm 100% battery on wireless receiver and test instant mute/unmute on backup handheld mic.",
    isCritical: true,
    checked: true,
    checkedBy: "Jason (Sound)",
    checkedAt: "09:34 AM",
  },
  {
    id: "chk-aud-3",
    role: "AUDIO",
    category: "Atmosphere",
    task: "Congregation Room Ambience Mics & Worship Pad Balance",
    detail: "Blend stereo room mics during worship and duck -10dB automatically when Pastor speaks.",
    isCritical: false,
    checked: true,
    checkedBy: "Jason (Sound)",
    checkedAt: "09:40 AM",
  },
  {
    id: "chk-aud-4",
    role: "AUDIO",
    category: "Lip Sync",
    task: "Audio-to-Video Lip Sync Delay Verified (40ms Offset Checked)",
    detail: "Clap test on Cam 1 verified in headphones with zero echo or double-audio feed.",
    isCritical: true,
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },

  // MODERATOR STATION
  {
    id: "chk-mod-1",
    role: "MODERATOR",
    category: "Sermon Cues",
    task: "Pastor's PDF Sermon Notes Uploaded & Parsed into 1-Click Cue Deck",
    detail: "Verify all Scripture references, main points, and prophetic declarations are queued in order.",
    isCritical: true,
    checked: true,
    checkedBy: "Sister Hannah (Mod)",
    checkedAt: "09:36 AM",
  },
  {
    id: "chk-mod-2",
    role: "MODERATOR",
    category: "Chat Connections",
    task: "YouTube Live Chat & Instagram Live Comment Bridge Connected",
    detail: "Send a test welcome message and verify Auto-Prayer Queue detection is active.",
    isCritical: true,
    checked: true,
    checkedBy: "Sister Hannah (Mod)",
    checkedAt: "09:39 AM",
  },
  {
    id: "chk-mod-3",
    role: "MODERATOR",
    category: "Links & Presets",
    task: "Giving Link (YT) & Link-in-Bio / DM Prompt (IG) Verified",
    detail: "Confirm clickable URL works on YouTube and pinned instruction comment is ready for Instagram.",
    isCritical: false,
    checked: true,
    checkedBy: "Sister Hannah (Mod)",
    checkedAt: "09:41 AM",
  },
  {
    id: "chk-mod-4",
    role: "MODERATOR",
    category: "Hospitality",
    task: "Repeating Audience Roster Open for First-15-Min Viewer Check-Ins",
    detail: "Greet returning regulars by name and log first-time visitors as they announce location.",
    isCritical: false,
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },

  // QUALITY CHECKER (QC) STATION
  {
    id: "chk-qc-1",
    role: "QC",
    category: "External Stream",
    task: "YouTube Live Stream Verified on Separate Phone & TV Monitor",
    detail: "Check actual public YouTube stream at 1080p60 with headphones to confirm clarity and loudness.",
    isCritical: true,
    checked: true,
    checkedBy: "Daniel (QC)",
    checkedAt: "09:42 AM",
  },
  {
    id: "chk-qc-2",
    role: "QC",
    category: "Instagram Feed",
    task: "Instagram Live Verified on Mobile App (Framing, Comments & Audio)",
    detail: "Ensure Pastor's face is not covered by Instagram Live bottom comment overlay.",
    isCritical: true,
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },
  {
    id: "chk-qc-3",
    role: "QC",
    category: "Network & Bitrate",
    task: "Hardwired Ethernet Speed > 50 Mbps Upload & 0% Dropped Frames",
    detail: "Confirm encoder bitrate is stable at 6,000 kbps with backup 5G hotspot ready.",
    isCritical: true,
    checked: true,
    checkedBy: "Daniel (QC)",
    checkedAt: "09:43 AM",
  },
  {
    id: "chk-qc-4",
    role: "QC",
    category: "QC Logger Ready",
    task: "Live Screenshot & Timestamp QC Log Open for Full Service Monitoring",
    detail: "Ready to capture screenshots of any YT/IG issue, achievement, or improvement during live service.",
    isCritical: false,
    checked: true,
    checkedBy: "Daniel (QC)",
    checkedAt: "09:44 AM",
  },

  // DIRECTOR STATION
  {
    id: "chk-dir-1",
    role: "DIRECTOR",
    category: "Crew Briefing",
    task: "5-Minute Huddle & Prayer with Camera, Audio, Moderator & QC Crew",
    detail: "Align on today's sermon flow, prophetic altar call cues, and emergency hand signals.",
    isCritical: true,
    checked: true,
    checkedBy: "Andrew (Director)",
    checkedAt: "09:25 AM",
  },
  {
    id: "chk-dir-2",
    role: "DIRECTOR",
    category: "Countdown",
    task: "10-Minute Pre-Service Countdown Rolled on Both Platforms",
    detail: "Verify countdown music & graphics are live on YouTube and Instagram.",
    isCritical: true,
    checked: true,
    checkedBy: "Andrew (Director)",
    checkedAt: "09:50 AM",
  },
  {
    id: "chk-dir-3",
    role: "DIRECTOR",
    category: "Final Clearance",
    task: "All Critical Station Checks Green — Director Final Go-Live Sign-Off",
    detail: "Confirm Camera, Audio, Moderator, and QC critical items are checked before transitioning to Stage Live.",
    isCritical: true,
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },
];

const DEFAULT_ACTIVE_CREW: ActiveCrewMember[] = [
  {
    id: "crew-1",
    name: "Andrew (Director)",
    role: "DIRECTOR",
    device: "Director Command Laptop",
    loggedInAt: "09:20 AM",
    lastActiveAt: "Just now",
  },
  {
    id: "crew-2",
    name: "Kevin (Cam 1)",
    role: "CAMERA",
    device: "iPhone 15 Pro (Mobile Login)",
    loggedInAt: "09:28 AM",
    lastActiveAt: "2m ago",
  },
  {
    id: "crew-3",
    name: "Jason (Sound)",
    role: "AUDIO",
    device: "iPad Air (FOH Console)",
    loggedInAt: "09:29 AM",
    lastActiveAt: "4m ago",
  },
  {
    id: "crew-4",
    name: "Sister Hannah (Mod)",
    role: "MODERATOR",
    device: "MacBook Air (Chat Desk)",
    loggedInAt: "09:31 AM",
    lastActiveAt: "1m ago",
  },
  {
    id: "crew-5",
    name: "Daniel (QC)",
    role: "QC",
    device: "Samsung S24 Ultra (QC Monitor)",
    loggedInAt: "09:35 AM",
    lastActiveAt: "Just now",
  },
];

const DEFAULT_QC_LOGS: QcLogItem[] = [
  {
    id: "qc-seed-1",
    serviceDate: "2026-10-14",
    streamTimestamp: "10:14 AM (Stream +14m — Worship)",
    type: "ISSUE",
    severity: "MAJOR",
    platform: "INSTAGRAM",
    station: "CAMERA",
    title: "Pastor stepped slightly outside right edge of 9:16 vertical crop on Instagram",
    description:
      "During the worship exhortation, Cam 1 panned for 16:9 YouTube framing, causing Pastor's shoulder to clip on the 9:16 Instagram vertical feed for 40 seconds.",
    actionToTake:
      "Add 9:16 safe-zone tape markers on the Cam 1 monitor and train Cam 1 operator to keep the speaker inside the center grid.",
    assignedTo: "Kevin (Camera Lead)",
    timelineToSolve: "Before Saturday Rehearsal",
    targetDate: "2026-10-18",
    status: "IN_PROGRESS",
    screenshotUrl: null,
    markerPos: { x: 78, y: 45 },
    loggedBy: "Daniel (QC)",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "qc-seed-2",
    serviceDate: "2026-10-14",
    streamTimestamp: "10:38 AM (Stream +38m — Sermon)",
    type: "ACHIEVEMENT",
    severity: "WIN",
    platform: "BOTH",
    station: "MODERATOR",
    title: "Prophetic Sermon Cues & Scriptures dropped within 2 seconds of Pastor speaking",
    description:
      "Moderator team used the PDF Cue Deck to fire Romans 8:28 and the 3 prophetic declarations immediately as Pastor spoke them. Chat engagement spiked +42%.",
    actionToTake:
      "Standardize receiving Pastor's PDF notes by Saturday 6 PM every week.",
    assignedTo: "Sister Hannah (Moderator Lead)",
    timelineToSolve: "Completed & Standardized",
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
    streamTimestamp: "10:52 AM (Stream +52m — Altar Call)",
    type: "IMPROVEMENT",
    severity: "MINOR",
    platform: "YOUTUBE",
    station: "AUDIO",
    title: "Boost Keyboard Pad +3dB in Broadcast Mix during Altar Call Prayer",
    description:
      "When the band stopped playing and only the soft synth pad remained under Pastor's altar call prayer, the pad was slightly too quiet on mobile phone speakers.",
    actionToTake:
      "Create a dedicated 'Altar Call Broadcast Scene' on the soundboard that raises keys bus +3dB when Pastor enters ministry time.",
    assignedTo: "Jason (Audio Lead)",
    timelineToSolve: "By Next Sunday Pre-Check",
    targetDate: "2026-10-21",
    status: "OPEN",
    screenshotUrl: null,
    markerPos: null,
    loggedBy: "Daniel (QC)",
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
];

function getCrewQcState() {
  const store = readFallbackStore();
  if (!store.crewQc) {
    store.crewQc = {
      checklists: DEFAULT_CHECKLISTS,
      activeCrew: DEFAULT_ACTIVE_CREW,
      qcLogs: DEFAULT_QC_LOGS,
      directorSignOff: {
        clearedToGoLive: false,
        directorName: "Andrew (Director)",
        clearedAt: null as string | null,
        flashNotice: "Pre-Flight Check in progress — Please complete all station checks on your phones!",
      },
    };
    writeFallbackStore("crewQc", store.crewQc);
  }
  return store.crewQc as {
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

    // 1. Crew Member Mobile/Station Login
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
        state.activeCrew[existingIdx].lastActiveAt = "Just now";
        state.activeCrew[existingIdx].device =
          body.device || state.activeCrew[existingIdx].device;
      } else {
        state.activeCrew.unshift({
          id: `crew-${Date.now()}`,
          name: String(body.name).trim(),
          role: body.role as CrewRole,
          device: body.device || "Mobile Browser",
          loggedInAt: nowTime,
          lastActiveAt: "Just now",
        });
      }
    }

    // 2. Toggle a Pre-Live Checklist Item (records who checked it & timestamp)
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
          checkedBy: nextChecked ? body.memberName || "Crew Member" : null,
          checkedAt: nextChecked ? nowTime : null,
        };
      });
    }

    // 3. Add a Custom Checklist Item to a Station
    if (body.action === "ADD_CHECK_ITEM" && body.item) {
      const i = body.item;
      const newItem: CrewChecklistItem = {
        id: `chk-${Date.now()}`,
        role: (i.role as CrewRole) || "CAMERA",
        category: String(i.category || "Pre-Live Check").trim(),
        task: String(i.task || "New Station Check").trim(),
        detail: String(i.detail || "").trim(),
        isCritical: Boolean(i.isCritical),
        checked: false,
        checkedBy: null,
        checkedAt: null,
      };
      state.checklists = [...state.checklists, newItem];
    }

    // 4. Reset All Checklists for a New Service
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

    // 5. Director Master Go-Live Sign-Off or Flash Notice Broadcast
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
      if (body.flashNotice !== undefined) {
        state.directorSignOff.flashNotice = String(body.flashNotice);
      }
    }

    // 6. Add a Quality Checker (QC) Log Entry (with optional YouTube/IG screenshot)
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
        title: String(l.title || "Live Stream QC Observation").trim(),
        description: String(l.description || "").trim(),
        actionToTake: String(l.actionToTake || "").trim(),
        assignedTo: String(l.assignedTo || "Production Lead").trim(),
        timelineToSolve: String(l.timelineToSolve || "By Next Sunday").trim(),
        targetDate: l.targetDate || new Date().toISOString().slice(0, 10),
        status: l.type === "ACHIEVEMENT" ? "RESOLVED" : "OPEN",
        screenshotUrl: l.screenshotUrl || null,
        markerPos: l.markerPos || null,
        loggedBy: l.loggedBy || "Quality Checker",
        createdAt: new Date().toISOString(),
        pushedToRoadmap: false,
      };
      state.qcLogs = [newLog, ...state.qcLogs];
    }

    // 7. Update QC Log Status (OPEN -> IN_PROGRESS -> RESOLVED)
    if (body.action === "UPDATE_QC_STATUS" && body.id && body.status) {
      state.qcLogs = state.qcLogs.map((log) =>
        log.id === body.id ? { ...log, status: body.status } : log
      );
    }

    // 8. Delete QC Log
    if (body.action === "DELETE_QC_LOG" && body.id) {
      state.qcLogs = state.qcLogs.filter((log) => log.id !== body.id);
    }

    // 9. Push QC Issue / Improvement directly into the Roadmap Timeline (/api/roadmap)
    if (body.action === "PUSH_QC_TO_ROADMAP" && body.id) {
      const targetLog = state.qcLogs.find((l) => l.id === body.id);
      if (targetLog) {
        targetLog.pushedToRoadmap = true;
        const fullStore = readFallbackStore();
        if (fullStore.roadmap && Array.isArray(fullStore.roadmap.milestones)) {
          const categoryMap: Record<string, string> = {
            CAMERA: "CAMERA_HARDWARE",
            LIGHTING: "CAMERA_HARDWARE",
            AUDIO: "BROADCAST_PRODUCTION",
            NETWORK: "BROADCAST_PRODUCTION",
            MODERATOR: "TEAM_TRAINING",
            DIRECTOR: "TEAM_TRAINING",
          };
          fullStore.roadmap.milestones.unshift({
            id: `ms-qc-${Date.now()}`,
            phase: "PHASE_1",
            phaseLabel: "Phase 1: Camera Hardware & Studio Foundation",
            category: categoryMap[targetLog.station] || "TEAM_TRAINING",
            title: `[QC Action] ${targetLog.title}`,
            description: `${targetLog.description} — Action: ${targetLog.actionToTake}`,
            status: "IN_PROGRESS",
            priority: targetLog.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
            targetDate: targetLog.targetDate,
            owner: targetLog.assignedTo,
            hardwareOrToolSpec: `${targetLog.station} Station (${targetLog.platform})`,
            estimatedBudget: "$0",
            attendanceImpact: "Fixes Live Stream Quality & Viewer Retention",
            checklist: [
              {
                id: `chk-qc-act-${Date.now()}`,
                text: targetLog.actionToTake || "Complete corrective action",
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
      { error: err.message || "Failed to update Crew & QC state" },
      { status: 400 }
    );
  }
}

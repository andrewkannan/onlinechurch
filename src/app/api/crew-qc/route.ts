import { NextRequest, NextResponse } from "next/server";
import { readFallbackStore, writeFallbackStore } from "@/lib/db";

export type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
export type UserPermission = "ADMIN" | "LEAD" | "OPERATOR";
export type DutyStatus = "ON_DUTY" | "STANDBY" | "OFF_DUTY";
export type GoNoGoStatus = "GO" | "STANDBY" | "HOLD";
export type PreFlightPhase = "T-60M" | "T-30M" | "T-15M" | "T-5M";

export interface CrewUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  callsign: string;
  role: CrewRole;
  permission: UserPermission;
  stationAssignment: string;
  status: DutyStatus;
  goStatus: GoNoGoStatus;
  device: string;
  lastActiveAt: string;
  completedLessons?: string[];
  certifiedRoles?: CrewRole[];
}

export interface CrewChecklistItem {
  id: string;
  role: CrewRole;
  phase: PreFlightPhase;
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

const DEFAULT_USERS: CrewUserAccount[] = [
  {
    id: "usr-director-1",
    name: "Andrew",
    email: "andrew@onlinechurch.org",
    phone: "+65 9100 1100",
    callsign: "TD-01",
    role: "DIRECTOR",
    permission: "ADMIN",
    stationAssignment: "Master Control · ATEM Switcher",
    status: "ON_DUTY",
    goStatus: "GO",
    device: "Mac Studio Console",
    lastActiveAt: "Active now",
    completedLessons: [
      "flow-1",
      "flow-2",
      "flow-3",
      "dir-1",
      "dir-2",
      "dir-3",
      "dir-4",
    ],
    certifiedRoles: ["DIRECTOR", "QC"],
  },
  {
    id: "usr-camera-1",
    name: "Kevin Lim",
    email: "kevin@onlinechurch.org",
    phone: "+65 9200 2200",
    callsign: "CAM-01",
    role: "CAMERA",
    permission: "LEAD",
    stationAssignment: "Cam 1 & 2 · Sony FX3 Rig",
    status: "ON_DUTY",
    goStatus: "STANDBY",
    device: "iPhone 16 Pro",
    lastActiveAt: "1m ago",
    completedLessons: ["flow-1", "flow-2", "cam-1", "cam-2", "cam-3"],
    certifiedRoles: ["CAMERA"],
  },
  {
    id: "usr-audio-1",
    name: "Jason Tan",
    email: "jason@onlinechurch.org",
    phone: "+65 9300 3300",
    callsign: "A1-MIX",
    role: "AUDIO",
    permission: "LEAD",
    stationAssignment: "Broadcast Bus · Allen & Heath SQ",
    status: "ON_DUTY",
    goStatus: "GO",
    device: "iPad Pro",
    lastActiveAt: "2m ago",
    completedLessons: ["flow-1", "flow-2", "aud-1", "aud-2", "aud-3", "aud-4"],
    certifiedRoles: ["AUDIO"],
  },
  {
    id: "usr-mod-1",
    name: "Hannah Lee",
    email: "hannah@onlinechurch.org",
    phone: "+65 9400 4400",
    callsign: "MOD-01",
    role: "MODERATOR",
    permission: "OPERATOR",
    stationAssignment: "YouTube & Instagram Live Desk",
    status: "ON_DUTY",
    goStatus: "GO",
    device: "MacBook Air",
    lastActiveAt: "Active now",
    completedLessons: ["flow-1", "mod-1", "mod-2"],
    certifiedRoles: [],
  },
  {
    id: "usr-qc-1",
    name: "Daniel Wong",
    email: "daniel@onlinechurch.org",
    phone: "+65 9500 5500",
    callsign: "QC-01",
    role: "QC",
    permission: "LEAD",
    stationAssignment: "Stream Telemetry & Program QC",
    status: "ON_DUTY",
    goStatus: "GO",
    device: "iPhone 16",
    lastActiveAt: "Active now",
    completedLessons: ["flow-1", "flow-2", "qc-1", "qc-2", "qc-3", "qc-4"],
    certifiedRoles: ["QC"],
  },
];

const DEFAULT_CHECKLISTS: CrewChecklistItem[] = [
  // CAMERA
  {
    id: "chk-cam-1",
    role: "CAMERA",
    phase: "T-60M",
    category: "Optics",
    task: "Pulpit Camera Framing & Focus Lock",
    detail: "1080p60 · Headroom & sharpness calibrated",
    isCritical: true,
    assignedToUserId: "usr-camera-1",
    assignedToName: "Kevin Lim",
    checked: true,
    checkedBy: "Kevin Lim",
    checkedAt: "09:32 AM",
  },
  {
    id: "chk-cam-2",
    role: "CAMERA",
    phase: "T-30M",
    category: "Colorimetry",
    task: "White Balance 5600K Matched Across Cameras",
    detail: "Cam 1 & Cam 2 color profiles aligned",
    isCritical: true,
    assignedToUserId: "usr-camera-1",
    assignedToName: "Kevin Lim",
    checked: false,
    checkedBy: null,
    checkedAt: null,
  },
  {
    id: "chk-cam-3",
    role: "CAMERA",
    phase: "T-30M",
    category: "Aspect Ratio",
    task: "Instagram 9:16 Vertical Safe-Zone",
    detail: "Center crop markers verified on monitor",
    isCritical: true,
    assignedToUserId: "usr-camera-1",
    assignedToName: "Kevin Lim",
    checked: true,
    checkedBy: "Kevin Lim",
    checkedAt: "09:37 AM",
  },
  {
    id: "chk-cam-4",
    role: "CAMERA",
    phase: "T-60M",
    category: "Signal",
    task: "AC Power & SDI/HDMI Switcher Lock",
    detail: "Continuous power & zero frame drop",
    isCritical: true,
    assignedToUserId: "usr-camera-1",
    assignedToName: "Kevin Lim",
    checked: true,
    checkedBy: "Kevin Lim",
    checkedAt: "09:38 AM",
  },

  // AUDIO
  {
    id: "chk-aud-1",
    role: "AUDIO",
    phase: "T-30M",
    category: "Loudness",
    task: "Broadcast Bus Level (-14 LUFS / -6dB Peak)",
    detail: "Limiter engaged, zero digital clipping",
    isCritical: true,
    assignedToUserId: "usr-audio-1",
    assignedToName: "Jason Tan",
    checked: true,
    checkedBy: "Jason Tan",
    checkedAt: "09:30 AM",
  },
  {
    id: "chk-aud-2",
    role: "AUDIO",
    phase: "T-30M",
    category: "RF & Mics",
    task: "Pastor Primary & Backup Wireless Mics",
    detail: "RF signal clean, battery > 85%",
    isCritical: true,
    assignedToUserId: "usr-audio-1",
    assignedToName: "Jason Tan",
    checked: true,
    checkedBy: "Jason Tan",
    checkedAt: "09:34 AM",
  },
  {
    id: "chk-aud-3",
    role: "AUDIO",
    phase: "T-15M",
    category: "Ambience",
    task: "Room Condenser Mics & Worship Pad Balance",
    detail: "Congregation stereo blend verified",
    isCritical: false,
    assignedToUserId: "usr-audio-1",
    assignedToName: "Jason Tan",
    checked: true,
    checkedBy: "Jason Tan",
    checkedAt: "09:40 AM",
  },
  {
    id: "chk-aud-4",
    role: "AUDIO",
    phase: "T-15M",
    category: "Delay",
    task: "Audio-to-Video Lip Sync Alignment",
    detail: "Frame delay verified on program feed",
    isCritical: true,
    assignedToUserId: "usr-audio-1",
    assignedToName: "Jason Tan",
    checked: true,
    checkedBy: "Jason Tan",
    checkedAt: "09:41 AM",
  },

  // MODERATOR
  {
    id: "chk-mod-1",
    role: "MODERATOR",
    phase: "T-30M",
    category: "Run Sheet",
    task: "Pastor Sermon Cues & Scripture Deck",
    detail: "Lower-thirds & chat prompts staged",
    isCritical: true,
    assignedToUserId: "usr-mod-1",
    assignedToName: "Hannah Lee",
    checked: true,
    checkedBy: "Hannah Lee",
    checkedAt: "09:36 AM",
  },
  {
    id: "chk-mod-2",
    role: "MODERATOR",
    phase: "T-15M",
    category: "Ingest Chat",
    task: "YouTube & Instagram Prayer Router Active",
    detail: "Auto-capture & platform reply verified",
    isCritical: true,
    assignedToUserId: "usr-mod-1",
    assignedToName: "Hannah Lee",
    checked: true,
    checkedBy: "Hannah Lee",
    checkedAt: "09:39 AM",
  },
  {
    id: "chk-mod-3",
    role: "MODERATOR",
    phase: "T-15M",
    category: "Presets",
    task: "Giving & First-Time Visitor Links Ready",
    detail: "Pinned comment & bio links tested",
    isCritical: false,
    assignedToUserId: "usr-mod-1",
    assignedToName: "Hannah Lee",
    checked: true,
    checkedBy: "Hannah Lee",
    checkedAt: "09:41 AM",
  },
  {
    id: "chk-mod-4",
    role: "MODERATOR",
    phase: "T-5M",
    category: "Attendance",
    task: "Audience & Visitor Check-In Roster Open",
    detail: "Tracking repeating & new viewers",
    isCritical: false,
    assignedToUserId: "usr-mod-1",
    assignedToName: "Hannah Lee",
    checked: true,
    checkedBy: "Hannah Lee",
    checkedAt: "09:42 AM",
  },

  // QUALITY CHECKER (QC)
  {
    id: "chk-qc-1",
    role: "QC",
    phase: "T-15M",
    category: "YouTube CDN",
    task: "YouTube 1080p60 Return Feed Verified",
    detail: "External monitor playback & stereo check",
    isCritical: true,
    assignedToUserId: "usr-qc-1",
    assignedToName: "Daniel Wong",
    checked: true,
    checkedBy: "Daniel Wong",
    checkedAt: "09:42 AM",
  },
  {
    id: "chk-qc-2",
    role: "QC",
    phase: "T-15M",
    category: "Instagram CDN",
    task: "Instagram Vertical Stream Verified on Mobile",
    detail: "9:16 framing & mobile loudness clear",
    isCritical: true,
    assignedToUserId: "usr-qc-1",
    assignedToName: "Daniel Wong",
    checked: true,
    checkedBy: "Daniel Wong",
    checkedAt: "09:43 AM",
  },
  {
    id: "chk-qc-3",
    role: "QC",
    phase: "T-15M",
    category: "Telemetry",
    task: "Encoder Bitrate Locked (0.0% Dropped Frames)",
    detail: "Primary Ethernet uplink > 50 Mbps",
    isCritical: true,
    assignedToUserId: "usr-qc-1",
    assignedToName: "Daniel Wong",
    checked: true,
    checkedBy: "Daniel Wong",
    checkedAt: "09:43 AM",
  },
  {
    id: "chk-qc-4",
    role: "QC",
    phase: "T-5M",
    category: "Incident Pad",
    task: "Live QC Telemetry & Frame Capture Armed",
    detail: "Ready to queue incidents for Director",
    isCritical: false,
    assignedToUserId: "usr-qc-1",
    assignedToName: "Daniel Wong",
    checked: true,
    checkedBy: "Daniel Wong",
    checkedAt: "09:44 AM",
  },

  // DIRECTOR
  {
    id: "chk-dir-1",
    role: "DIRECTOR",
    phase: "T-30M",
    category: "Comms",
    task: "Production Comms Roll-Call & Briefing",
    detail: "All 5 stations on intercom loop",
    isCritical: true,
    assignedToUserId: "usr-director-1",
    assignedToName: "Andrew",
    checked: true,
    checkedBy: "Andrew",
    checkedAt: "09:25 AM",
  },
  {
    id: "chk-dir-2",
    role: "DIRECTOR",
    phase: "T-15M",
    category: "Playout",
    task: "Pre-Show Countdown Clock & Holding Slate",
    detail: "Program timer synced to service start",
    isCritical: true,
    assignedToUserId: "usr-director-1",
    assignedToName: "Andrew",
    checked: true,
    checkedBy: "Andrew",
    checkedAt: "09:50 AM",
  },
  {
    id: "chk-dir-3",
    role: "DIRECTOR",
    phase: "T-5M",
    category: "Master Go",
    task: "Technical Director Go / No-Go Sign-Off",
    detail: "All stations verified & cleared for air",
    isCritical: true,
    assignedToUserId: "usr-director-1",
    assignedToName: "Andrew",
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
    device: "Mac Studio Console",
    loggedInAt: "09:20 AM",
    lastActiveAt: "Active now",
  },
  {
    id: "crew-2",
    name: "Kevin Lim",
    role: "CAMERA",
    device: "iPhone 16 Pro",
    loggedInAt: "09:28 AM",
    lastActiveAt: "1m ago",
  },
  {
    id: "crew-3",
    name: "Jason Tan",
    role: "AUDIO",
    device: "iPad Pro",
    loggedInAt: "09:29 AM",
    lastActiveAt: "2m ago",
  },
  {
    id: "crew-4",
    name: "Hannah Lee",
    role: "MODERATOR",
    device: "MacBook Air",
    loggedInAt: "09:31 AM",
    lastActiveAt: "Active now",
  },
  {
    id: "crew-5",
    name: "Daniel Wong",
    role: "QC",
    device: "iPhone 16",
    loggedInAt: "09:35 AM",
    lastActiveAt: "Active now",
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
    description: "Speaker stepped outside right safe-zone during welcome.",
    actionToTake: "",
    assignedTo: "Pending Director",
    timelineToSolve: "Wait for Director",
    targetDate: "2026-10-18",
    status: "WAITING_DIRECTOR",
    screenshotUrl: null,
    markerPos: { x: 78, y: 45 },
    loggedBy: "Daniel Wong",
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
    title: "Sub-2s Sermon Scripture & Lower-Third Sync",
    description: "Cue deck synchronized with message transitions; +42% chat response.",
    actionToTake: "Retain Saturday 6:00 PM run-sheet lock standard",
    assignedTo: "Hannah Lee",
    timelineToSolve: "Completed",
    targetDate: "2026-10-14",
    status: "RESOLVED",
    screenshotUrl: null,
    markerPos: null,
    loggedBy: "Daniel Wong",
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
    title: "Ministry Response Synth Pad Under-Mixed on Mobile",
    description: "Requires +3dB automation lift when band drops out.",
    actionToTake: "",
    assignedTo: "Pending Director",
    timelineToSolve: "Wait for Director",
    targetDate: "2026-10-21",
    status: "WAITING_DIRECTOR",
    screenshotUrl: null,
    markerPos: null,
    loggedBy: "Daniel Wong",
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
];

function getCrewQcState() {
  const store = readFallbackStore();
  if (!store.crewQc || !store.crewQc.v3ApplePro) {
    store.crewQc = {
      v3ApplePro: true,
      users: DEFAULT_USERS,
      checklists: DEFAULT_CHECKLISTS,
      activeCrew: DEFAULT_ACTIVE_CREW,
      qcLogs: DEFAULT_QC_LOGS,
      directorSignOff: {
        clearedToGoLive: false,
        directorName: "Andrew",
        clearedAt: null as string | null,
        flashNotice: "All stations complete pre-flight verification.",
      },
    };
    writeFallbackStore("crewQc", store.crewQc);
  }
  // Ensure users array always exists
  if (!Array.isArray(store.crewQc.users) || store.crewQc.users.length === 0) {
    store.crewQc.users = DEFAULT_USERS;
  }
  return store.crewQc as {
    v3ApplePro: boolean;
    users: CrewUserAccount[];
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

    // 1. Crew Member Login / Switch Active Operator
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
        state.activeCrew[existingIdx].lastActiveAt = "Active now";
        state.activeCrew[existingIdx].device =
          body.device || state.activeCrew[existingIdx].device;
      } else {
        state.activeCrew.unshift({
          id: `crew-${Date.now()}`,
          name: String(body.name).trim(),
          role: body.role as CrewRole,
          device: body.device || "Console",
          loggedInAt: nowTime,
          lastActiveAt: "Active now",
        });
      }

      // Also update matching user account lastActiveAt
      state.users = state.users.map((u) =>
        u.name.toLowerCase() === String(body.name).trim().toLowerCase()
          ? { ...u, status: "ON_DUTY", lastActiveAt: "Active now" }
          : u
      );
    }

    // 2. User Account Management: Add User
    if (body.action === "ADD_USER" && body.user) {
      const u = body.user;
      const role = (u.role as CrewRole) || "CAMERA";
      const newUser: CrewUserAccount = {
        id: `usr-${Date.now()}`,
        name: String(u.name || "New Operator").trim(),
        email: String(u.email || "").trim(),
        phone: String(u.phone || "").trim(),
        callsign:
          String(u.callsign || "").trim() ||
          `${role.slice(0, 3)}-${state.users.length + 1}`,
        role,
        permission: (u.permission as UserPermission) || "OPERATOR",
        stationAssignment:
          String(u.stationAssignment || "").trim() || `${role} Station`,
        status: (u.status as DutyStatus) || "ON_DUTY",
        goStatus: "STANDBY",
        device: String(u.device || "Mobile / Console").trim(),
        lastActiveAt: "Just added",
      };
      state.users = [...state.users, newUser];
    }

    // 3. User Account Management: Update User Role, Permission, Station, Duty, or Go Status
    if (body.action === "UPDATE_USER" && body.id) {
      state.users = state.users.map((u) => {
        if (u.id !== body.id) return u;
        const updated = {
          ...u,
          ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
          ...(body.email !== undefined ? { email: String(body.email).trim() } : {}),
          ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
          ...(body.callsign !== undefined
            ? { callsign: String(body.callsign).trim() }
            : {}),
          ...(body.role !== undefined ? { role: body.role as CrewRole } : {}),
          ...(body.permission !== undefined
            ? { permission: body.permission as UserPermission }
            : {}),
          ...(body.stationAssignment !== undefined
            ? { stationAssignment: String(body.stationAssignment).trim() }
            : {}),
          ...(body.status !== undefined ? { status: body.status as DutyStatus } : {}),
          ...(body.goStatus !== undefined
            ? { goStatus: body.goStatus as GoNoGoStatus }
            : {}),
        };
        return updated;
      });

      // Keep checklist assignedToName in sync if name changed
      if (body.name) {
        state.checklists = state.checklists.map((c) =>
          c.assignedToUserId === body.id
            ? { ...c, assignedToName: String(body.name).trim() }
            : c
        );
      }
    }

    // 4. User Account Management: Delete User
    if (body.action === "DELETE_USER" && body.id) {
      state.users = state.users.filter((u) => u.id !== body.id);
    }

    // 5. Assign / Reassign Checklist Task to a Specific User Account
    if (body.action === "ASSIGN_CHECK_ITEM" && body.id) {
      const targetUser = state.users.find((u) => u.id === body.assignedToUserId);
      state.checklists = state.checklists.map((item) => {
        if (item.id !== body.id) return item;
        return {
          ...item,
          assignedToUserId: body.assignedToUserId || item.assignedToUserId,
          assignedToName:
            targetUser?.name || body.assignedToName || item.assignedToName,
          role: (body.role as CrewRole) || item.role,
        };
      });
    }

    // 6. Toggle Checklist Item
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
          checkedBy: nextChecked
            ? body.memberName || item.assignedToName || "Operator"
            : null,
          checkedAt: nextChecked ? nowTime : null,
        };
      });
    }

    // 7. Mark Entire Station or User's Tasks 100% Checked in 1 Tap
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
          checkedBy:
            item.checkedBy ||
            body.memberName ||
            item.assignedToName ||
            "Operator",
          checkedAt: item.checkedAt || nowTime,
        };
      });
    }

    // 8. Add Custom Check Item (Assigned to User & Role)
    if (body.action === "ADD_CHECK_ITEM" && body.item) {
      const i = body.item;
      const role = (i.role as CrewRole) || "CAMERA";
      const assignedUser =
        state.users.find((u) => u.id === i.assignedToUserId) ||
        state.users.find((u) => u.role === role) ||
        state.users[0];

      state.checklists = [
        {
          id: `chk-${Date.now()}`,
          role,
          phase: (i.phase as PreFlightPhase) || "T-30M",
          category: String(i.category || "Verification").trim(),
          task: String(i.task || "New Station Check").trim(),
          detail: String(i.detail || "Standard pre-flight verification").trim(),
          isCritical: i.isCritical !== undefined ? Boolean(i.isCritical) : true,
          assignedToUserId: assignedUser ? assignedUser.id : "usr-director-1",
          assignedToName:
            i.assignedToName || (assignedUser ? assignedUser.name : "Team"),
          checked: false,
          checkedBy: null,
          checkedAt: null,
        },
        ...state.checklists,
      ];
    }

    // 9. Delete Check Item
    if (body.action === "DELETE_CHECK_ITEM" && body.id) {
      state.checklists = state.checklists.filter((c) => c.id !== body.id);
    }

    // 10. Reset Checklists
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

    // 11. Director Go-Live Update
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

    // 12. Fast QC Log Entry -> Enters Queue as WAITING_DIRECTOR
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
        title: String(l.title || "QC Observation").trim(),
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

    // 13. Director Decision on a Queued QC Item
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

    // 14. Update QC Status
    if (body.action === "UPDATE_QC_STATUS" && body.id && body.status) {
      state.qcLogs = state.qcLogs.map((log) =>
        log.id === body.id ? { ...log, status: body.status } : log
      );
    }

    // 15. Push QC Item to Roadmap
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

    // 16. Toggle Training Lesson Completion for a User Account
    if (body.action === "TOGGLE_TRAINING_LESSON" && body.userId && body.lessonId) {
      state.users = state.users.map((u) => {
        if (u.id !== body.userId) return u;
        const current = Array.isArray(u.completedLessons)
          ? u.completedLessons
          : [];
        const exists = current.includes(body.lessonId);
        const nextLessons = exists
          ? current.filter((id) => id !== body.lessonId)
          : [...current, body.lessonId];
        return { ...u, completedLessons: nextLessons };
      });
    }

    // 17. Certify User for a Specific Broadcast Role
    if (body.action === "CERTIFY_USER_ROLE" && body.userId && body.role) {
      state.users = state.users.map((u) => {
        if (u.id !== body.userId) return u;
        const current = Array.isArray(u.certifiedRoles)
          ? u.certifiedRoles
          : [];
        const role = body.role as CrewRole;
        const exists = current.includes(role);
        const nextRoles = exists
          ? current
          : [...current, role];
        return { ...u, certifiedRoles: nextRoles };
      });
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

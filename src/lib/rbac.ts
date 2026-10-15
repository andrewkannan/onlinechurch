export type CrewRole = "CAMERA" | "AUDIO" | "MODERATOR" | "QC" | "DIRECTOR";

export type AppRoutePath =
  | "/"
  | "/crew"
  | "/roadmap"
  | "/reports"
  | "/settings";

export type CrewWorkspaceTab =
  | "PRE_LIVE"
  | "WEEKLY_ROSTER"
  | "QC_PAD"
  | "POST_LIVE_SHUTDOWN"
  | "MEETING_REPORT"
  | "TEAM_ACCOUNTS"
  | "TRAINING";

export interface RolePermissionSpec {
  role: CrewRole;
  title: string;
  callsignPrefix: string;
  badgeColor: string;
  summary: string;
  defaultLandingRoute: AppRoutePath;
  defaultCrewTab: CrewWorkspaceTab;
  allowedRoutes: AppRoutePath[];
  allowedCrewTabs: CrewWorkspaceTab[];
  capabilities: {
    manageSystemBrandingAndSettings: boolean;
    manageTeamAccountsAndPasswords: boolean;
    assignTasksToAnyStation: boolean;
    confirmMasterGoLiveAndReset: boolean;
    triageDirectorQueueDirectives: boolean;
    logLiveQcScreenshotsAndFaults: boolean;
    holdWeeklyReportQcCustody: boolean;
    holdWeeklyReportModeratorCustody: boolean;
    approveAndArchiveWeeklyReport: boolean;
    convertFeedbackToPreFlightCheck: boolean;
    certifyCrewTraining: boolean;
    manageLiveChatAndPrayers: boolean;
  };
  moduleBreakdown: Array<{
    module: string;
    accessLevel: "FULL_CONTROL" | "CUSTODIAN" | "STATION_ONLY" | "VIEW_ONLY" | "HIDDEN";
    detail: string;
  }>;
}

export const ROLE_ACCESS_MATRIX: Record<CrewRole, RolePermissionSpec> = {
  DIRECTOR: {
    role: "DIRECTOR",
    title: "Technical Director (Master Control)",
    callsignPrefix: "TD-01",
    badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    summary:
      "Unrestricted full-system command across all broadcast routes, all 5 department checklists, Weekly Serving Roster, Director Triage Queue, Team & Account administration, Training certification, and final Weekly Report approval.",
    defaultLandingRoute: "/crew",
    defaultCrewTab: "PRE_LIVE",
    allowedRoutes: ["/", "/crew", "/roadmap", "/reports", "/settings"],
    allowedCrewTabs: [
      "PRE_LIVE",
      "WEEKLY_ROSTER",
      "QC_PAD",
      "POST_LIVE_SHUTDOWN",
      "MEETING_REPORT",
      "TEAM_ACCOUNTS",
      "TRAINING",
    ],
    capabilities: {
      manageSystemBrandingAndSettings: true,
      manageTeamAccountsAndPasswords: true,
      assignTasksToAnyStation: true,
      confirmMasterGoLiveAndReset: true,
      triageDirectorQueueDirectives: true,
      logLiveQcScreenshotsAndFaults: true,
      holdWeeklyReportQcCustody: true,
      holdWeeklyReportModeratorCustody: true,
      approveAndArchiveWeeklyReport: true,
      convertFeedbackToPreFlightCheck: true,
      certifyCrewTraining: true,
      manageLiveChatAndPrayers: true,
    },
    moduleBreakdown: [
      {
        module: "Pre-Flight, Weekly Roster & Safe Shutdown",
        accessLevel: "FULL_CONTROL",
        detail:
          "Manages the multi-week Sunday Serving Roster, auto-rotates crew, syncs roster to Pre-Flight, inspects all 5 stations, and confirms 'On Air'.",
      },
      {
        module: "Live QC & Director Queue",
        accessLevel: "FULL_CONTROL",
        detail:
          "Issues live directives on QC alerts, assigns operators, sets target resolution timelines, and resolves faults.",
      },
      {
        module: "Postmortem Corner & Weekly Report",
        accessLevel: "FULL_CONTROL",
        detail:
          "Approves & locks the co-held QC + Moderator Weekly Report, and converts crew feedback into next week's pre-flight checks.",
      },
      {
        module: "Team & Accounts + Settings",
        accessLevel: "FULL_CONTROL",
        detail:
          "Exclusive access to create/remove crew accounts, reset passwords, assign roles, and edit church branding/settings.",
      },
      {
        module: "Training Academy",
        accessLevel: "FULL_CONTROL",
        detail:
          "Views all 5 role tracks and certifies crew members for live broadcast readiness.",
      },
    ],
  },

  QC: {
    role: "QC",
    title: "Stream Quality Control Lead",
    callsignPrefix: "QC-01",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    summary:
      "Dedicated to live YouTube/IG stream telemetry, 1-tap fault/win logging with frame pin-drop screenshots, pushing fixes to Timeline & Goals, and co-holding the Weekly Technical Report.",
    defaultLandingRoute: "/crew",
    defaultCrewTab: "QC_PAD",
    allowedRoutes: ["/", "/crew", "/roadmap", "/reports"],
    allowedCrewTabs: [
      "PRE_LIVE",
      "WEEKLY_ROSTER",
      "QC_PAD",
      "POST_LIVE_SHUTDOWN",
      "MEETING_REPORT",
      "TRAINING",
    ],
    capabilities: {
      manageSystemBrandingAndSettings: false,
      manageTeamAccountsAndPasswords: false,
      assignTasksToAnyStation: false,
      confirmMasterGoLiveAndReset: false,
      triageDirectorQueueDirectives: false,
      logLiveQcScreenshotsAndFaults: true,
      holdWeeklyReportQcCustody: true,
      holdWeeklyReportModeratorCustody: false,
      approveAndArchiveWeeklyReport: false,
      convertFeedbackToPreFlightCheck: true,
      certifyCrewTraining: false,
      manageLiveChatAndPrayers: false,
    },
    moduleBreakdown: [
      {
        module: "Pre-Flight, Weekly Roster & Safe Shutdown",
        accessLevel: "STATION_ONLY",
        detail:
          "Views Sunday serving schedule, confirms QC shift/swap requests, and verifies QC station checks.",
      },
      {
        module: "Live QC & Director Queue",
        accessLevel: "FULL_CONTROL",
        detail:
          "Primary operator of the 1-Tap QC Pad, YouTube/IG frame capture, pin-drop defect marker, and queue submission.",
      },
      {
        module: "Postmortem Corner & Weekly Report",
        accessLevel: "CUSTODIAN",
        detail:
          "Co-holds the Weekly Report (Pillar 1: QC Technical Report) — edits technical summary and signs off custody.",
      },
      {
        module: "Timeline & Goals + Analytics",
        accessLevel: "FULL_CONTROL",
        detail:
          "Pushes stream faults into Timeline & Goals and reviews weekly broadcast telemetry.",
      },
      {
        module: "Team & Accounts + Settings",
        accessLevel: "HIDDEN",
        detail: "Hidden to keep interface fast and focused during live monitoring.",
      },
    ],
  },

  MODERATOR: {
    role: "MODERATOR",
    title: "Chat & Pastoral Moderator Lead",
    callsignPrefix: "MOD-01",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    summary:
      "Focused on Live Broadcast Studio engagement (YouTube/IG chat, prayer wall, visitor welcome, sermon notes) and co-holding the Weekly Engagement & Pastoral Report.",
    defaultLandingRoute: "/",
    defaultCrewTab: "PRE_LIVE",
    allowedRoutes: ["/", "/crew", "/reports"],
    allowedCrewTabs: [
      "PRE_LIVE",
      "WEEKLY_ROSTER",
      "POST_LIVE_SHUTDOWN",
      "MEETING_REPORT",
      "TRAINING",
    ],
    capabilities: {
      manageSystemBrandingAndSettings: false,
      manageTeamAccountsAndPasswords: false,
      assignTasksToAnyStation: false,
      confirmMasterGoLiveAndReset: false,
      triageDirectorQueueDirectives: false,
      logLiveQcScreenshotsAndFaults: false,
      holdWeeklyReportQcCustody: false,
      holdWeeklyReportModeratorCustody: true,
      approveAndArchiveWeeklyReport: false,
      convertFeedbackToPreFlightCheck: false,
      certifyCrewTraining: false,
      manageLiveChatAndPrayers: true,
    },
    moduleBreakdown: [
      {
        module: "Broadcast Studio (/)",
        accessLevel: "FULL_CONTROL",
        detail:
          "Manages live YouTube/IG chat, prayer request wall, visitor onboarding, scripture/sermon notes, and AI pastoral tools.",
      },
      {
        module: "Pre-Flight & Safe Shutdown",
        accessLevel: "STATION_ONLY",
        detail:
          "Auto-filtered to Moderator station checks (pinned welcome links, nightbot filters, prayer & visitor export).",
      },
      {
        module: "Postmortem Corner & Weekly Report",
        accessLevel: "CUSTODIAN",
        detail:
          "Co-holds the Weekly Report (Pillar 2: Moderator Engagement & Pastoral Report) — edits chat & prayer follow-up notes and signs off custody.",
      },
      {
        module: "Live QC Pad, Team Accounts & Settings",
        accessLevel: "HIDDEN",
        detail:
          "Hidden so Moderators aren't distracted by engineering telemetry or user administration.",
      },
    ],
  },

  CAMERA: {
    role: "CAMERA",
    title: "Camera & Optical Operator",
    callsignPrefix: "CAM-01",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    summary:
      "Streamlined mobile-ready view for rapid Camera Pre-Flight checks, live Director directives assigned to Camera, Safe Hardware Strike, and Postmortem debrief.",
    defaultLandingRoute: "/crew",
    defaultCrewTab: "PRE_LIVE",
    allowedRoutes: ["/crew"],
    allowedCrewTabs: [
      "PRE_LIVE",
      "WEEKLY_ROSTER",
      "QC_PAD",
      "POST_LIVE_SHUTDOWN",
      "MEETING_REPORT",
      "TRAINING",
    ],
    capabilities: {
      manageSystemBrandingAndSettings: false,
      manageTeamAccountsAndPasswords: false,
      assignTasksToAnyStation: false,
      confirmMasterGoLiveAndReset: false,
      triageDirectorQueueDirectives: false,
      logLiveQcScreenshotsAndFaults: false,
      holdWeeklyReportQcCustody: false,
      holdWeeklyReportModeratorCustody: false,
      approveAndArchiveWeeklyReport: false,
      convertFeedbackToPreFlightCheck: false,
      certifyCrewTraining: false,
      manageLiveChatAndPrayers: false,
    },
    moduleBreakdown: [
      {
        module: "Pre-Flight, Weekly Roster & Safe Shutdown",
        accessLevel: "STATION_ONLY",
        detail:
          "Views weekly Sunday serving roster, confirms CAMERA shifts, and checks off 5600K white balance, IG blur framing, and lens strike.",
      },
      {
        module: "Live QC & Queue",
        accessLevel: "VIEW_ONLY",
        detail:
          "Read-only view of live Director directives & frame screenshots assigned to CAMERA so the operator can react immediately.",
      },
      {
        module: "Postmortem Corner",
        accessLevel: "STATION_ONLY",
        detail:
          "Can submit Wins, Bottlenecks, and Action Ideas to the All-Hands Feedback Board and view the Weekly Report.",
      },
      {
        module: "Broadcast Admin, Analytics, Settings & Accounts",
        accessLevel: "HIDDEN",
        detail: "Hidden to eliminate clutter on mobile phones during production.",
      },
    ],
  },

  AUDIO: {
    role: "AUDIO",
    title: "Broadcast & FOH Audio Engineer",
    callsignPrefix: "AUD-01",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    summary:
      "Streamlined mobile-ready view for rapid Audio Pre-Flight checks, live Director directives assigned to Audio, Safe Console/Amp Power-Down, and Postmortem debrief.",
    defaultLandingRoute: "/crew",
    defaultCrewTab: "PRE_LIVE",
    allowedRoutes: ["/crew"],
    allowedCrewTabs: [
      "PRE_LIVE",
      "WEEKLY_ROSTER",
      "QC_PAD",
      "POST_LIVE_SHUTDOWN",
      "MEETING_REPORT",
      "TRAINING",
    ],
    capabilities: {
      manageSystemBrandingAndSettings: false,
      manageTeamAccountsAndPasswords: false,
      assignTasksToAnyStation: false,
      confirmMasterGoLiveAndReset: false,
      triageDirectorQueueDirectives: false,
      logLiveQcScreenshotsAndFaults: false,
      holdWeeklyReportQcCustody: false,
      holdWeeklyReportModeratorCustody: false,
      approveAndArchiveWeeklyReport: false,
      convertFeedbackToPreFlightCheck: false,
      certifyCrewTraining: false,
      manageLiveChatAndPrayers: false,
    },
    moduleBreakdown: [
      {
        module: "Pre-Flight & Safe Shutdown",
        accessLevel: "STATION_ONLY",
        detail:
          "Auto-locked to AUDIO station tasks (-14 LUFS loudness, RF wireless mics, DAW multitrack archive, amp sequencing).",
      },
      {
        module: "Live QC & Queue",
        accessLevel: "VIEW_ONLY",
        detail:
          "Read-only view of live Director directives & audio fault alerts assigned to AUDIO.",
      },
      {
        module: "Postmortem Corner",
        accessLevel: "STATION_ONLY",
        detail:
          "Can submit Wins, Bottlenecks, and Action Ideas to the All-Hands Feedback Board and view the Weekly Report.",
      },
      {
        module: "Broadcast Admin, Analytics, Settings & Accounts",
        accessLevel: "HIDDEN",
        detail: "Hidden to keep FOH & broadcast mix engineers focused on sound.",
      },
    ],
  },
};

export function getRolePermissions(role?: string | null): RolePermissionSpec {
  if (role && role in ROLE_ACCESS_MATRIX) {
    return ROLE_ACCESS_MATRIX[role as CrewRole];
  }
  return ROLE_ACCESS_MATRIX.DIRECTOR;
}

export function canAccessRoute(
  role: string | undefined | null,
  pathname: string
): boolean {
  const spec = getRolePermissions(role);
  if (spec.role === "DIRECTOR") return true;
  const matched = spec.allowedRoutes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
  return matched;
}

export function canAccessCrewTab(
  role: string | undefined | null,
  tab: CrewWorkspaceTab
): boolean {
  const spec = getRolePermissions(role);
  if (spec.role === "DIRECTOR") return true;
  return spec.allowedCrewTabs.includes(tab);
}

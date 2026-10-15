export type RobotRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";

export interface RobotAvatarPreset {
  id: string;
  name: string;
  modelCode: string;
  role: RobotRole;
  description: string;
  accentHex: string;
  secondaryHex: string;
  dataUri: string;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    svg.replace(/\s+/g, " ").trim()
  )}`;
}

/**
 * Generates intricate, high-contrast Apple Vision / Cyber-Broadcast AI Robotic Portrait SVGs.
 * Each robot has a brushed dark-titanium chassis, glowing optical visor, role-specific broadcast gear,
 * and subtle HUD telemetry geometry.
 */
function buildRobotPortraitSvg(config: {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  visorType: "COMMAND" | "OPTICS" | "SONIC" | "NEURAL" | "SENTINEL" | "TITAN" | "VALKYRIE" | "QUANTUM";
  badgeCode: string;
}): string {
  const { id, primaryColor, secondaryColor, visorType, badgeCode } = config;

  // Role-specific visor & head gear inner SVG elements
  let visorAndGear = "";

  if (visorType === "COMMAND") {
    // TD-01 Sovereign AI: Dual tactical command visor + broadcast headset boom + crown antenna
    visorAndGear = `
      <!-- Crown Command Array -->
      <path d="M52 20 L60 10 L68 20 Z" fill="${primaryColor}" opacity="0.9"/>
      <rect x="58" y="8" width="4" height="10" rx="2" fill="#ffffff"/>
      <circle cx="60" cy="7" r="3" fill="${primaryColor}"/>
      <!-- Tactical Visor -->
      <rect x="33" y="46" width="54" height="18" rx="9" fill="#050508" stroke="${primaryColor}" stroke-width="1.8"/>
      <!-- Glowing Command Eyes & HUD Crosshair -->
      <rect x="39" y="52" width="16" height="6" rx="3" fill="${primaryColor}"/>
      <rect x="65" y="52" width="16" height="6" rx="3" fill="${primaryColor}"/>
      <circle cx="47" cy="55" r="1.8" fill="#ffffff"/>
      <circle cx="73" cy="55" r="1.8" fill="#ffffff"/>
      <line x1="58" y1="49" x2="62" y2="49" stroke="${secondaryColor}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="60" y1="51" x2="60" y2="59" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="2 2"/>
      <!-- Master Director Intercom Boom Mic -->
      <path d="M92 62 Q98 76 74 82" fill="none" stroke="#e4e4e7" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="66" y="79" width="10" height="5" rx="2.5" fill="${primaryColor}" stroke="#ffffff" stroke-width="0.8"/>
    `;
  } else if (visorType === "OPTICS") {
    // CAM-01 Cinema Droid: Multi-element cinema camera lens eye + rangefinder sensor
    visorAndGear = `
      <!-- Top Tally Light Hood -->
      <rect x="46" y="15" width="28" height="7" rx="3.5" fill="#18181b" stroke="${primaryColor}" stroke-width="1.5"/>
      <circle cx="60" cy="18.5" r="2.2" fill="#ef4444"/>
      <!-- Asymmetric Cinema Lens Visor -->
      <rect x="32" y="43" width="56" height="23" rx="11" fill="#050508" stroke="${primaryColor}" stroke-width="1.6"/>
      <!-- Left Rangefinder Sensor -->
      <rect x="38" y="51" width="13" height="7" rx="3.5" fill="${secondaryColor}" opacity="0.9"/>
      <circle cx="44.5" cy="54.5" r="2" fill="#ffffff"/>
      <!-- Right Large FX3 Cinema Prime Lens Eye -->
      <circle cx="71" cy="54.5" r="10.5" fill="#09090b" stroke="${primaryColor}" stroke-width="2"/>
      <circle cx="71" cy="54.5" r="6.5" fill="${primaryColor}" opacity="0.35"/>
      <circle cx="71" cy="54.5" r="3.5" fill="#ffffff"/>
      <circle cx="73.5" cy="52" r="1.3" fill="#ffffff"/>
    `;
  } else if (visorType === "SONIC") {
    // A1-MIX Sonic Android: Studio Reference Headphones + Equalizer Waveform Visor
    visorAndGear = `
      <!-- Studio Headphone Arc -->
      <path d="M22 56 A38 38 0 0 1 98 56" fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
      <!-- Large Studio Ear Cups -->
      <rect x="16" y="45" width="11" height="26" rx="5.5" fill="#18181b" stroke="${primaryColor}" stroke-width="2"/>
      <rect x="93" y="45" width="11" height="26" rx="5.5" fill="#18181b" stroke="${primaryColor}" stroke-width="2"/>
      <!-- Sonic Visor -->
      <rect x="33" y="45" width="54" height="20" rx="10" fill="#050508" stroke="${primaryColor}" stroke-width="1.6"/>
      <!-- Live Audio Spectrum Analyzer Bars inside Visor -->
      <rect x="40" y="54" width="3" height="6" rx="1.5" fill="${primaryColor}"/>
      <rect x="45" y="50" width="3" height="10" rx="1.5" fill="${primaryColor}"/>
      <rect x="50" y="48" width="3" height="14" rx="1.5" fill="#ffffff"/>
      <rect x="55" y="52" width="3" height="8" rx="1.5" fill="${secondaryColor}"/>
      <rect x="62" y="51" width="3" height="9" rx="1.5" fill="${secondaryColor}"/>
      <rect x="67" y="48" width="3" height="14" rx="1.5" fill="#ffffff"/>
      <rect x="72" y="50" width="3" height="10" rx="1.5" fill="${primaryColor}"/>
      <rect x="77" y="54" width="3" height="6" rx="1.5" fill="${primaryColor}"/>
    `;
  } else if (visorType === "NEURAL") {
    // MOD-01 Neural Liaison: Curved Apple Vision glass + dual holographic neural antennas + glowing expressive eyes
    visorAndGear = `
      <!-- Dual Neural Halo Antennas -->
      <path d="M36 24 L30 11" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="10" r="3" fill="#ffffff" stroke="${primaryColor}" stroke-width="1.5"/>
      <path d="M84 24 L90 11" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="90" cy="10" r="3" fill="#ffffff" stroke="${primaryColor}" stroke-width="1.5"/>
      <!-- Curved Spatial Glass Faceplate -->
      <rect x="32" y="44" width="56" height="21" rx="10.5" fill="#070510" stroke="${primaryColor}" stroke-width="1.8"/>
      <!-- Expressive Neural Arc Eyes -->
      <path d="M40 56 Q46 49 52 56" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M68 56 Q74 49 80 56" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <!-- Center Heart/Prayer Pulse Node -->
      <circle cx="60" cy="55" r="2.5" fill="${primaryColor}"/>
    `;
  } else if (visorType === "SENTINEL") {
    // QC-01 Telemetry Sentinel: Matrix scanner visor + radar HUD grid + precision laser reticle
    visorAndGear = `
      <!-- Top Telemetry Dish -->
      <rect x="52" y="13" width="16" height="6" rx="3" fill="${primaryColor}"/>
      <!-- Full Matrix Scanner Visor -->
      <rect x="32" y="45" width="56" height="19" rx="9.5" fill="#04100a" stroke="${primaryColor}" stroke-width="1.8"/>
      <!-- Horizontal Scan Line -->
      <line x1="36" y1="54.5" x2="84" y2="54.5" stroke="${primaryColor}" stroke-width="1.2" opacity="0.6"/>
      <!-- Left & Right Hex Target Eyes -->
      <circle cx="46" cy="54.5" r="5.5" fill="none" stroke="${primaryColor}" stroke-width="2"/>
      <circle cx="46" cy="54.5" r="2" fill="#ffffff"/>
      <circle cx="74" cy="54.5" r="5.5" fill="none" stroke="${primaryColor}" stroke-width="2"/>
      <circle cx="74" cy="54.5" r="2" fill="#ffffff"/>
      <!-- Center Check Reticle -->
      <path d="M57 54.5 L59.5 57 L64 52" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  } else if (visorType === "TITAN") {
    visorAndGear = `
      <polygon points="60,10 52,24 68,24" fill="${primaryColor}"/>
      <rect x="33" y="46" width="54" height="16" rx="8" fill="#050508" stroke="${primaryColor}" stroke-width="1.8"/>
      <polygon points="39,51 55,54 39,57" fill="${primaryColor}"/>
      <polygon points="81,51 65,54 81,57" fill="${primaryColor}"/>
      <circle cx="60" cy="54" r="2" fill="#ffffff"/>
    `;
  } else if (visorType === "VALKYRIE") {
    visorAndGear = `
      <path d="M26 38 L18 22 L32 30 Z" fill="${primaryColor}"/>
      <path d="M94 38 L102 22 L88 30 Z" fill="${primaryColor}"/>
      <rect x="32" y="44" width="56" height="20" rx="10" fill="#050508" stroke="${primaryColor}" stroke-width="1.8"/>
      <circle cx="46" cy="54" r="4.5" fill="${primaryColor}"/>
      <circle cx="46" cy="54" r="2" fill="#ffffff"/>
      <circle cx="74" cy="54" r="4.5" fill="${primaryColor}"/>
      <circle cx="74" cy="54" r="2" fill="#ffffff"/>
    `;
  } else {
    // QUANTUM
    visorAndGear = `
      <circle cx="60" cy="15" r="4" fill="${primaryColor}"/>
      <rect x="33" y="44" width="54" height="20" rx="10" fill="#050508" stroke="${primaryColor}" stroke-width="1.8"/>
      <circle cx="60" cy="54" r="7" fill="none" stroke="${primaryColor}" stroke-width="2.2"/>
      <circle cx="60" cy="54" r="3" fill="#ffffff"/>
      <circle cx="43" cy="54" r="2" fill="${secondaryColor}"/>
      <circle cx="77" cy="54" r="2" fill="${secondaryColor}"/>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">
      <defs>
        <radialGradient id="bg-${id}" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.28"/>
          <stop offset="55%" stop-color="#121217" stop-opacity="1"/>
          <stop offset="100%" stop-color="#070709" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="chassis-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3f3f46"/>
          <stop offset="45%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="accent-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${primaryColor}"/>
          <stop offset="100%" stop-color="${secondaryColor}"/>
        </linearGradient>
      </defs>

      <!-- Deep Space Cyber Background -->
      <rect width="120" height="120" rx="28" fill="url(#bg-${id})"/>

      <!-- Subtle Neural Telemetry Ring -->
      <circle cx="60" cy="58" r="48" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1" stroke-dasharray="4 4"/>
      <circle cx="60" cy="58" r="42" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

      <!-- Robotic Shoulders & Torso Armor -->
      <path d="M20 116 C22 92 38 86 60 86 C82 86 98 92 100 116 Z" fill="url(#chassis-${id})" stroke="${primaryColor}" stroke-opacity="0.5" stroke-width="1.5"/>
      <!-- Glowing Chest Core Reactor -->
      <rect x="47" y="95" width="26" height="10" rx="5" fill="#09090b" stroke="${primaryColor}" stroke-width="1.2"/>
      <text x="60" y="102.5" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="6.5" font-weight="bold" letter-spacing="0.8">${badgeCode}</text>

      <!-- Hydraulic Neck Column -->
      <rect x="49" y="76" width="22" height="14" rx="4" fill="#18181b" stroke="#3f3f46" stroke-width="1.2"/>
      <line x1="52" y1="81" x2="68" y2="81" stroke="${primaryColor}" stroke-width="1.2" opacity="0.7"/>
      <line x1="52" y1="85" x2="68" y2="85" stroke="${primaryColor}" stroke-width="1.2" opacity="0.4"/>

      <!-- Side Acoustic / Telemetry Ear Pods -->
      <rect x="20" y="46" width="8" height="20" rx="4" fill="#27272a" stroke="${primaryColor}" stroke-width="1.3"/>
      <rect x="92" y="46" width="8" height="20" rx="4" fill="#27272a" stroke="${primaryColor}" stroke-width="1.3"/>

      <!-- Main Anodized Titanium Robot Head Chassis -->
      <rect x="26" y="22" width="68" height="58" rx="22" fill="url(#chassis-${id})" stroke="#52525b" stroke-width="1.6"/>
      <!-- Inner Faceplate Bezel -->
      <rect x="30" y="26" width="60" height="50" rx="18" fill="#121216" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="1"/>

      <!-- Forehead Callsign LED Strip -->
      <rect x="46" y="31" width="28" height="4" rx="2" fill="url(#accent-${id})"/>

      <!-- Mouth Vocoder Grille -->
      <rect x="47" y="68" width="26" height="4" rx="2" fill="#09090b" stroke="#3f3f46" stroke-width="0.8"/>
      <line x1="53" y1="68" x2="53" y2="72" stroke="${primaryColor}" stroke-width="1"/>
      <line x1="60" y1="68" x2="60" y2="72" stroke="${primaryColor}" stroke-width="1"/>
      <line x1="67" y1="68" x2="67" y2="72" stroke="${primaryColor}" stroke-width="1"/>

      <!-- Role-Specific Visor & Broadcast Hardware -->
      ${visorAndGear}
    </svg>
  `;

  return svgToDataUri(svg);
}

export const AI_ROBOT_AVATAR_PRESETS: RobotAvatarPreset[] = [
  {
    id: "bot-director-prime",
    name: "TD-01 Sovereign Droid",
    modelCode: "TD-01",
    role: "DIRECTOR",
    description: "Master Control Command Android with ATEM tally & intercom boom",
    accentHex: "#fb7185",
    secondaryHex: "#f43f5e",
    dataUri: buildRobotPortraitSvg({
      id: "dir1",
      primaryColor: "#fb7185",
      secondaryColor: "#e11d48",
      visorType: "COMMAND",
      badgeCode: "TD-01",
    }),
  },
  {
    id: "bot-camera-optics",
    name: "CAM-01 Cinema Optics",
    modelCode: "CAM-01",
    role: "CAMERA",
    description: "FX3 Multi-Aperture Optical Droid with 1080p60 rangefinder",
    accentHex: "#fbbf24",
    secondaryHex: "#f59e0b",
    dataUri: buildRobotPortraitSvg({
      id: "cam1",
      primaryColor: "#fbbf24",
      secondaryColor: "#d97706",
      visorType: "OPTICS",
      badgeCode: "CAM-01",
    }),
  },
  {
    id: "bot-audio-sonic",
    name: "A1-MIX Sonic Synth",
    modelCode: "A1-MIX",
    role: "AUDIO",
    description: "Acoustic Broadcast Droid with studio reference cans & LUFS meter",
    accentHex: "#38bdf8",
    secondaryHex: "#0284c7",
    dataUri: buildRobotPortraitSvg({
      id: "aud1",
      primaryColor: "#38bdf8",
      secondaryColor: "#0284c7",
      visorType: "SONIC",
      badgeCode: "A1-MIX",
    }),
  },
  {
    id: "bot-mod-nexus",
    name: "MOD-01 Neural Nexus",
    modelCode: "MOD-01",
    role: "MODERATOR",
    description: "Live Chat & Prayer Liaison AI with YT/IG dual neural antennas",
    accentHex: "#a78bfa",
    secondaryHex: "#7c3aed",
    dataUri: buildRobotPortraitSvg({
      id: "mod1",
      primaryColor: "#a78bfa",
      secondaryColor: "#7c3aed",
      visorType: "NEURAL",
      badgeCode: "MOD-01",
    }),
  },
  {
    id: "bot-qc-sentinel",
    name: "QC-01 Matrix Sentinel",
    modelCode: "QC-01",
    role: "QC",
    description: "Stream Telemetry Inspector Droid with precision laser reticle",
    accentHex: "#34d399",
    secondaryHex: "#059669",
    dataUri: buildRobotPortraitSvg({
      id: "qc1",
      primaryColor: "#34d399",
      secondaryColor: "#059669",
      visorType: "SENTINEL",
      badgeCode: "QC-01",
    }),
  },
  {
    id: "bot-cyber-titan",
    name: "MK-VI Broadcast Titan",
    modelCode: "MK-06",
    role: "DIRECTOR",
    description: "Obsidian Chrome Mecha Unit with high-contrast plasma visor",
    accentHex: "#f472b6",
    secondaryHex: "#db2777",
    dataUri: buildRobotPortraitSvg({
      id: "titan6",
      primaryColor: "#f472b6",
      secondaryColor: "#db2777",
      visorType: "TITAN",
      badgeCode: "MK-06",
    }),
  },
  {
    id: "bot-valkyrie-pro",
    name: "Valkyrie Vision Pro",
    modelCode: "VLK-09",
    role: "MODERATOR",
    description: "Spatial Computing Broadcast Android with aero-wing sensors",
    accentHex: "#818cf8",
    secondaryHex: "#4f46e5",
    dataUri: buildRobotPortraitSvg({
      id: "vlk9",
      primaryColor: "#818cf8",
      secondaryColor: "#4f46e5",
      visorType: "VALKYRIE",
      badgeCode: "VLK-09",
    }),
  },
  {
    id: "bot-quantum-core",
    name: "Q-Core Orbital Droid",
    modelCode: "Q-CORE",
    role: "QC",
    description: "Quantum Optical Iris Unit for ultra-low-latency stream lock",
    accentHex: "#2dd4bf",
    secondaryHex: "#0d9488",
    dataUri: buildRobotPortraitSvg({
      id: "qcore",
      primaryColor: "#2dd4bf",
      secondaryColor: "#0d9488",
      visorType: "QUANTUM",
      badgeCode: "Q-CORE",
    }),
  },
];

const DEFAULT_ROLE_PRESET_ID: Record<RobotRole, string> = {
  DIRECTOR: "bot-director-prime",
  CAMERA: "bot-camera-optics",
  AUDIO: "bot-audio-sonic",
  MODERATOR: "bot-mod-nexus",
  QC: "bot-qc-sentinel",
};

/**
 * Resolves any user's avatarUrl (which can be a preset ID like "bot-director-prime",
 * a data:image/... URI, or an uploaded image URL) into a valid image src.
 * Falls back to the role's default AI Robotic Avatar so every account always has a robotic profile pic.
 */
export function resolveRobotAvatarUrl(
  avatarUrl?: string | null,
  role: RobotRole = "CAMERA",
  callsign?: string
): string {
  if (avatarUrl) {
    const matchedPreset = AI_ROBOT_AVATAR_PRESETS.find(
      (p) => p.id === avatarUrl
    );
    if (matchedPreset) {
      return matchedPreset.dataUri;
    }
    if (
      avatarUrl.startsWith("data:image/") ||
      avatarUrl.startsWith("http") ||
      avatarUrl.startsWith("/")
    ) {
      return avatarUrl;
    }
  }

  const defaultId = DEFAULT_ROLE_PRESET_ID[role] || "bot-camera-optics";
  const fallbackPreset =
    AI_ROBOT_AVATAR_PRESETS.find((p) => p.id === defaultId) ||
    AI_ROBOT_AVATAR_PRESETS[0];

  if (callsign && callsign !== fallbackPreset.modelCode) {
    return generateCustomRobotAvatar(callsign, role, 0);
  }

  return fallbackPreset.dataUri;
}

/**
 * Procedurally synthesizes a custom AI Robotic Profile Picture for any operator callsign/name & role.
 */
export function generateCustomRobotAvatar(
  seedText: string,
  role: RobotRole,
  variantIndex: number = Date.now()
): string {
  const palettes: Array<[string, string]> = [
    ["#fb7185", "#e11d48"],
    ["#fbbf24", "#d97706"],
    ["#38bdf8", "#0284c7"],
    ["#a78bfa", "#7c3aed"],
    ["#34d399", "#059669"],
    ["#f472b6", "#db2777"],
    ["#2dd4bf", "#0d9488"],
    ["#60a5fa", "#2563eb"],
  ];
  const visorTypes: Array<
    "COMMAND" | "OPTICS" | "SONIC" | "NEURAL" | "SENTINEL" | "TITAN" | "VALKYRIE" | "QUANTUM"
  > = [
    "COMMAND",
    "OPTICS",
    "SONIC",
    "NEURAL",
    "SENTINEL",
    "TITAN",
    "VALKYRIE",
    "QUANTUM",
  ];

  let hash = variantIndex;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 100000;
  }

  const [primaryColor, secondaryColor] = palettes[Math.abs(hash) % palettes.length];
  const visorType = visorTypes[Math.abs(hash >> 2) % visorTypes.length];
  const cleanBadge =
    seedText
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 6) || role.slice(0, 4);

  return buildRobotPortraitSvg({
    id: `custom-${Math.abs(hash)}`,
    primaryColor,
    secondaryColor,
    visorType,
    badgeCode: cleanBadge,
  });
}

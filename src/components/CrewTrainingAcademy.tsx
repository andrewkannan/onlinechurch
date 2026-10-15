"use client";

import React, { useState } from "react";

type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";

interface CrewUserAccount {
  id: string;
  name: string;
  callsign: string;
  role: CrewRole;
  permission: string;
  stationAssignment: string;
  completedLessons?: string[];
  certifiedRoles?: CrewRole[];
}

interface TrainingLesson {
  id: string;
  code: string;
  title: string;
  duration: string;
  summary: string;
  targetSpec: string;
  steps: string[];
  commsCallout: string;
  failureRecovery: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface RoleCurriculum {
  role: CrewRole;
  title: string;
  callsignFormat: string;
  stationHardware: string;
  missionStatement: string;
  keyMetrics: { label: string; value: string }[];
  lessons: TrainingLesson[];
  quiz: QuizQuestion[];
}

const CALLSIGN_DIRECTORY: {
  callsign: string;
  role: CrewRole;
  title: string;
  channel: string;
  primaryDuty: string;
  pollResponse: string;
  emergencyPhrase: string;
}[] = [
  {
    callsign: "TD-01",
    role: "DIRECTOR",
    title: "Technical Director / Master Control",
    channel: "CH 1 · Master Production Loop",
    primaryDuty:
      "Commands pre-flight countdown, initiates T-5M Go/No-Go poll, calls camera cuts, and assigns live QC action items.",
    pollResponse: '"All stations report GO. Master Control is cleared for air."',
    emergencyPhrase: '"Hold countdown. Switch to Standby Slate."',
  },
  {
    callsign: "CAM-01 / 02",
    role: "CAMERA",
    title: "Camera Operator (Pulpit & Wide)",
    channel: "CH 1 · Master Production Loop",
    primaryDuty:
      "Maintains 1080p60 focus, 5600K white balance match, and keeps subject inside both 16:9 YouTube and 9:16 Instagram center safe-zones.",
    pollResponse: '"CAM-01 GO. Framing, 5600K color, and 9:16 safe-zone locked."',
    emergencyPhrase: '"TD from CAM-01: Subject stepping outside 9:16 crop, panning right."',
  },
  {
    callsign: "A1-MIX",
    role: "AUDIO",
    title: "Broadcast Audio Engineer",
    channel: "CH 1 · Master Production Loop",
    primaryDuty:
      "Mixes isolated broadcast bus at -14 LUFS, manages wireless RF mics + handheld backup, and aligns A/V frame delay.",
    pollResponse: '"A1-MIX GO. Broadcast bus at -14 LUFS, backup mic hot on Ch 2."',
    emergencyPhrase: '"TD from A1: Primary lav dropout, switching to backup handheld now."',
  },
  {
    callsign: "MOD-01",
    role: "MODERATOR",
    title: "Digital Host & Prayer Moderator",
    channel: "CH 2 · Digital & Graphics Loop",
    primaryDuty:
      "Triggers sermon scripture cues within 2 seconds, monitors auto-captured prayer queue, and replies on matching platform (YT/IG).",
    pollResponse: '"MOD-01 GO. Sermon deck staged, YT and IG prayer routers active."',
    emergencyPhrase: '"TD from MOD-01: Urgent prayer request queued for altar call."',
  },
  {
    callsign: "QC-01",
    role: "QC",
    title: "Stream Quality Controller",
    channel: "CH 1 & 2 · All-Call Telemetry",
    primaryDuty:
      "Audits public YouTube 16:9 TV feed and Instagram 9:16 mobile feed continuously, logging frame/audio faults to the Director Queue.",
    pollResponse: '"QC-01 GO. 0.0% dropped frames, YouTube and IG return feeds clean."',
    emergencyPhrase: '"TD from QC-01: Incident queued with frame capture—check Director Queue."',
  },
];

const PRODUCTION_FLOW_TIMELINE: {
  id: string;
  phase: string;
  window: string;
  title: string;
  leadCallsign: string;
  summary: string;
  checkpoints: string[];
}[] = [
  {
    id: "flow-1",
    phase: "T-60M",
    window: "60 Mins Before Air",
    title: "Power, Signal Lock & Network Ingest",
    leadCallsign: "TD-01 & CAM-01",
    summary:
      "Boot all production hardware on continuous AC power, lock SDI/HDMI switcher inputs at 1080p60, and verify primary Ethernet uplink > 50 Mbps.",
    checkpoints: [
      "Connect AC power to all cameras (never run a live service on battery alone).",
      "Verify ATEM switcher frame sync on Cam 1, Cam 2, and Graphics input.",
      "Run speed & packet-loss test on dedicated broadcast VLAN.",
    ],
  },
  {
    id: "flow-2",
    phase: "T-30M",
    window: "30 Mins Before Air",
    title: "Optics, 5600K Color Match & Broadcast Bus Soundcheck",
    leadCallsign: "CAM-01 & A1-MIX",
    summary:
      "Calibrate camera white balance and dual 16:9 / 9:16 safe-zones while Audio sets broadcast limiter and tests Pastor primary + backup mics.",
    checkpoints: [
      "Dial manual 5600K white balance and match skin tones across Cam 1 and Cam 2.",
      "Align center 9:16 vertical markers so Instagram Live never clips the speaker.",
      "Set broadcast mix bus target to -14 LUFS with -1.5 dBTP brickwall ceiling.",
    ],
  },
  {
    id: "flow-3",
    phase: "T-15M",
    window: "15 Mins Before Air",
    title: "Private CDN Ingest, Sermon Cue Deck & Prayer Router",
    leadCallsign: "QC-01 & MOD-01",
    summary:
      "Start encoder streams to YouTube and Instagram, verify lip-sync on external consumer devices, and arm the auto-prayer chat router.",
    checkpoints: [
      "Verify 0.0% dropped frames and stable 6.8 Mbps bitrate on encoder.",
      "Check YouTube 16:9 on studio TV and Instagram 9:16 on an actual mobile phone.",
      "Load Pastor sermon PDF cues and test platform-matched reply routing.",
    ],
  },
  {
    id: "flow-4",
    phase: "T-5M",
    window: "5 Mins Before Air",
    title: "Formal Intercom Go / No-Go Poll & Countdown Roll",
    leadCallsign: "TD-01 (All Stations)",
    summary:
      "Technical Director polls each station by callsign. All 5 stations must reach 100% verification before Master Control confirms On Air.",
    checkpoints: [
      "Roll 5-minute countdown slate and background worship bed.",
      "TD-01 polls CAM-01, A1-MIX, MOD-01, and QC-01 for verbal 'GO'.",
      "If any item is unverified, TD-01 resolves or reassigns it in the Pending Zone.",
    ],
  },
  {
    id: "flow-5",
    phase: "LIVE",
    window: "During Broadcast",
    title: "Active Stream QC, 1-Tap Incident Queue & Prayer Ministry",
    leadCallsign: "QC-01, MOD-01 & TD-01",
    summary:
      "QC monitors public feeds and uses 1-tap presets + frame capture to queue issues for the Director without interrupting intercom.",
    checkpoints: [
      "QC-01 logs any framing, audio, or bitrate issue in 1 tap (auto-queued as Waiting for Director).",
      "TD-01 reviews queued items, selects an action preset, and assigns an operator.",
      "MOD-01 responds to YouTube & Instagram prayer requests on their source platform.",
    ],
  },
  {
    id: "flow-6",
    phase: "WRAP",
    window: "Post-Broadcast",
    title: "5-Minute Post-Show Debrief & Roadmap Handoff",
    leadCallsign: "TD-01 & QC-01",
    summary:
      "Immediately after stream end, TD-01 and QC-01 open the Post-Show Log to review incidents, celebrate broadcast wins, and push hardware fixes to the Roadmap.",
    checkpoints: [
      "Confirm local ISO and master program recordings are safely saved.",
      "Review the Post-Show Technical Log with all 5 department leads.",
      "Push recurring hardware or training actions directly to Timeline & Goals.",
    ],
  },
];

const INTERCOM_SCENARIOS: {
  id: string;
  title: string;
  context: string;
  lines: { speaker: string; callsign: string; text: string }[];
}[] = [
  {
    id: "scen-1",
    title: "Scenario 1 · The T-5 Minute Go / No-Go Roll Call",
    context:
      "Executed at T-5M before transitioning from the countdown slate to live pulpit video.",
    lines: [
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "All stations, T-minus 5 minutes. Running Go/No-Go poll. Camera?",
      },
      {
        speaker: "Camera Lead",
        callsign: "CAM-01",
        text: "CAM-01 is GO. 5600K locked, 16:9 and 9:16 safe-zones aligned.",
      },
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "Copy. Audio?",
      },
      {
        speaker: "Audio Engineer",
        callsign: "A1-MIX",
        text: "A1-MIX is GO. Broadcast bus at -14 LUFS, Pastor primary and backup mic checked.",
      },
      {
        speaker: "Moderator",
        callsign: "MOD-01",
        text: "MOD-01 is GO. Sermon cues staged, YouTube and IG prayer routers active.",
      },
      {
        speaker: "Quality Control",
        callsign: "QC-01",
        text: "QC-01 is GO. 1080p60 locked at 6.8 Mbps, zero dropped frames.",
      },
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "All stations verified 100%. Standby Cam 1 and House Audio... Going Live in 3, 2, 1, Take Cam 1.",
      },
    ],
  },
  {
    id: "scen-2",
    title: "Scenario 2 · Instagram 9:16 Vertical Safe-Zone Recovery",
    context:
      "When the speaker walks toward the stage edge and clips out of the vertical mobile frame.",
    lines: [
      {
        speaker: "Quality Control",
        callsign: "QC-01",
        text: "TD from QC-01: Speaker stepped outside right 9:16 border on Instagram. Queued frame in Director pad.",
      },
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "Copy QC-01. CAM-02, widen your shot slightly. CAM-01, pan right 10% to re-center the 9:16 guide.",
      },
      {
        speaker: "Camera Lead",
        callsign: "CAM-01",
        text: "CAM-01 re-centered inside 9:16 safe-zone. Ready.",
      },
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "Clean on multiview. Marking QC item resolved.",
      },
    ],
  },
  {
    id: "scen-3",
    title: "Scenario 3 · Wireless Mic Fault & Instant Backup Switchover",
    context:
      "How Audio and Camera coordinate when a primary headset mic experiences RF static.",
    lines: [
      {
        speaker: "Audio Engineer",
        callsign: "A1-MIX",
        text: "TD from A1-MIX: RF pop on Pastor headset. Pre-fader backup handheld is hot on Channel 2.",
      },
      {
        speaker: "Technical Director",
        callsign: "TD-01",
        text: "Copy A1. Cut to Wide Cam 2 while stage manager hands Backup Mic 2. Mute Ch 1 on handoff.",
      },
      {
        speaker: "Audio Engineer",
        callsign: "A1-MIX",
        text: "Ch 1 muted, Ch 2 handheld live at -14 LUFS. Clean audio restored.",
      },
    ],
  },
];

const ROLE_CURRICULUMS: Record<CrewRole, RoleCurriculum> = {
  CAMERA: {
    role: "CAMERA",
    title: "Camera & Optics Operations",
    callsignFormat: "CAM-01 (Tight Pulpit) · CAM-02 (Wide / Stage)",
    stationHardware: "Sony FX3 / PTZ Chain · SDI/HDMI 1080p60 · Tally System",
    missionStatement:
      "Deliver cinema-grade, color-matched framing that simultaneously satisfies 16:9 YouTube widescreen and 9:16 Instagram vertical center-crop viewers.",
    keyMetrics: [
      { label: "Color Temp", value: "5600K Manual" },
      { label: "Shutter Speed", value: "1/120s (60fps)" },
      { label: "Dual Framing", value: "16:9 + 9:16 Grid" },
      { label: "Skin Zebra", value: "70 IRE Target" },
    ],
    lessons: [
      {
        id: "cam-1",
        code: "CAM-101",
        title: "Dual Aspect Framing: 16:9 YouTube + 9:16 Instagram Safe-Zone",
        duration: "6 min",
        summary:
          "Because our broadcast feeds both YouTube widescreen and Instagram vertical simultaneously, the speaker must stay inside the central 9:16 vertical guide.",
        targetSpec: "Eyes at top third line; shoulders inside center 9:16 markers.",
        steps: [
          "Enable on-camera 9:16 vertical center guide markers on your monitor.",
          "Maintain two-finger headroom above the speaker's head—excessive headroom looks amateur on mobile.",
          "When the speaker walks laterally, feather your pan smoothly so they never touch the 9:16 border.",
        ],
        commsCallout:
          '"CAM-01: 16:9 and 9:16 center safe-zone locked on pulpit."',
        failureRecovery:
          "If the speaker moves too fast and exits the 9:16 frame, pause 1 second until TD switches to Wide Cam 2, then whip-pan to re-frame.",
      },
      {
        id: "cam-2",
        code: "CAM-102",
        title: "5600K Colorimetry & Multi-Camera Exposure Matching",
        duration: "8 min",
        summary:
          "Prevent jarring color shifts when the Technical Director cuts between Camera 1 and Camera 2.",
        targetSpec: "Manual 5600K Kelvin, matching Rec.709 picture profile, 70 IRE skin tone.",
        steps: [
          "Never use Auto White Balance (AWB)—stage LED walls will cause color hunting.",
          "Lock both cameras to 5600K (or match custom Kelvin to stage key light).",
          "Set zebra stripes to 70 IRE and adjust iris so forehead highlights just kiss zebra.",
        ],
        commsCallout:
          '"CAM-01 to TD: 5600K Kelvin and 70 IRE skin exposure matched with CAM-02."',
        failureRecovery:
          "If stage lighting dims during worship/prayer, open iris smoothly by 1/2 stop only when your tally light is GREEN (Preview), never when RED (Program).",
      },
      {
        id: "cam-3",
        code: "CAM-103",
        title: "Tally Light Discipline & Smooth Pan/Tilt Mechanics",
        duration: "5 min",
        summary:
          "Know when your camera is live on air (Red Tally) versus cued in preview (Green Tally).",
        targetSpec: "Zero rapid adjustments while Red Tally is active.",
        steps: [
          "GREEN Tally means the Director is about to cut to you—hold your frame rock steady.",
          "RED Tally means you are LIVE on air—only perform slow, fluid-head tripod adjustments.",
          "Wait 2 full seconds after your Red Tally turns off before crash-zooming to a new composition.",
        ],
        commsCallout: '"CAM-01 holding tight frame on Green Tally."',
        failureRecovery:
          "If your tripod gets bumped while live, freeze immediately—do not jerk the handle back; let TD cut away first.",
      },
      {
        id: "cam-4",
        code: "CAM-104",
        title: "AC Power Lock & SDI/HDMI Signal Protection",
        duration: "5 min",
        summary:
          "Eliminate mid-sermon camera blackouts caused by battery depletion or loose HDMI cables.",
        targetSpec: "Continuous AC dummy battery + strain-relieved cable loop.",
        steps: [
          "Verify AC power adapter LED is illuminated and cable is gaffer-taped to tripod leg.",
          "Loop HDMI/SDI cable through the camera cage clamp so a foot tug cannot unseat the port.",
          "Disable camera 'Auto Power Off Temp' and set HDMI Info Display to OFF (Clean Feed).",
        ],
        commsCallout: '"CAM-01: AC power and clean 1080p60 feed locked."',
        failureRecovery:
          "If switcher reports black screen, reseat the SDI/HDMI converter power USB first while TD holds on Cam 2.",
      },
    ],
    quiz: [
      {
        id: "q-cam-1",
        question:
          "Why must Camera Operators keep the speaker centered inside the 9:16 vertical markers?",
        options: [
          "Because the projector screen in the sanctuary is vertical",
          "So the simultaneous Instagram 9:16 vertical stream never clips the speaker off-screen",
          "To reduce network bandwidth on the encoder",
        ],
        correctIndex: 1,
        explanation:
          "Our broadcast feeds both 16:9 YouTube and 9:16 Instagram Live. Keeping the subject inside the 9:16 center guide guarantees both streams look properly framed.",
      },
      {
        id: "q-cam-2",
        question:
          "When is it safe to make a fast zoom or rapid re-frame to a new subject?",
        options: [
          "Only when your Tally Light is OFF (neither Red Program nor Green Preview)",
          "Whenever your Tally Light is Red",
          "During the middle of a scripture reading on Program",
        ],
        correctIndex: 0,
        explanation:
          "Red Tally means you are live on air; Green Tally means the Director is about to cut to you. Only re-frame rapidly when your camera is off tally.",
      },
      {
        id: "q-cam-3",
        question:
          "What white balance setting should be used across all broadcast cameras?",
        options: [
          "Auto White Balance (AWB)",
          "Tungsten 3200K on Cam 1 and Daylight on Cam 2",
          "Manual locked Kelvin (5600K matched across all cameras)",
        ],
        correctIndex: 2,
        explanation:
          "Locking manual 5600K across all cameras prevents color shifts when cutting between angles.",
      },
    ],
  },

  AUDIO: {
    role: "AUDIO",
    title: "Broadcast Audio & Loudness Engineering",
    callsignFormat: "A1-MIX (Broadcast Mix Lead)",
    stationHardware: "Allen & Heath SQ / Digital Bus · LUFS Loudness Meter · RF Rack",
    missionStatement:
      "Deliver an isolated, full-bodied broadcast mix at -14 LUFS that sounds clear on mobile phone speakers and living-room TVs without clipping or echo.",
    keyMetrics: [
      { label: "Target Loudness", value: "-14 LUFS" },
      { label: "True Peak Ceiling", value: "-1.5 dBTP" },
      { label: "RF Battery Floor", value: "> 85% Charge" },
      { label: "A/V Lip-Sync", value: "0 ms Offset" },
    ],
    lessons: [
      {
        id: "aud-1",
        code: "AUD-101",
        title: "Broadcast Bus Loudness (-14 LUFS) vs. Sanctuary Room Mix",
        duration: "7 min",
        summary:
          "What sounds loud in the physical church building often sounds thin and quiet on a smartphone. Learn to mix specifically for the Broadcast Bus.",
        targetSpec: "-14 LUFS integrated loudness, peaking at -6 dBFS / -1.5 dBTP.",
        steps: [
          "Monitor the Broadcast Bus on closed-back studio headphones—never mix the stream by listening to room speakers.",
          "Engage the broadcast bus compressor (3:1 ratio, 2–3 dB gain reduction) and brickwall limiter at -1.5 dBTP.",
          "Keep spoken word (Pastor vocal) hitting -14 LUFS so mobile listeners don't have to max out their phone volume.",
        ],
        commsCallout:
          '"A1-MIX: Broadcast bus calibrated at -14 LUFS, limiter active."',
        failureRecovery:
          "If QC-01 reports mobile audio is too quiet, push the Broadcast Master Bus makeup gain +3 dB while watching the -1.5 dBTP ceiling.",
      },
      {
        id: "aud-2",
        code: "AUD-102",
        title: "Pastor Primary & Backup Wireless RF Protocol",
        duration: "6 min",
        summary:
          "The Pastor's microphone is the single most critical input in the broadcast. Always stage a hot backup.",
        targetSpec: "Fresh batteries (>85%), RF squelch locked, Backup Handheld staged on Ch 2.",
        steps: [
          "Verify wireless transmitter battery shows full bars (>85%) at T-30M.",
          "High-pass filter (HPF) the Pastor's mic at 100 Hz to remove stage rumble and plosives.",
          "Keep Backup Handheld Mic gain-staged and un-assigned from house wedges, ready to unmute in 0.5 seconds.",
        ],
        commsCallout:
          '"A1-MIX: Pastor primary and Ch 2 backup handheld line-checked and clean."',
        failureRecovery:
          "On any RF static or dropout, immediately mute Primary Ch 1, unmute Backup Ch 2, and notify TD-01 on intercom.",
      },
      {
        id: "aud-3",
        code: "AUD-103",
        title: "Room Condenser Mics & Worship-to-Speech Transitions",
        duration: "6 min",
        summary:
          "Avoid the 'dead vacuum' feeling when the band stops playing or the congregation claps.",
        targetSpec: "Stereo room condensers blended at -18 dB; synth pad lifted +3 dB during altar call.",
        steps: [
          "Blend stereo crowd/room condenser mics during worship and congregation responses so online viewers feel present.",
          "Duck room mics by -10 dB during the sermon to keep spoken vocal crisp and dry.",
          "When the Pastor prays over the synth pad, ride the keys/pad fader +3 dB so it translates on phone speakers.",
        ],
        commsCallout: '"A1-MIX: Room ambience and altar pad automation engaged."',
        failureRecovery:
          "If house PA bleeds into room mics causing hollow phase, flip the polarity (Ø) or tighten the room mic delay by 8–12 ms.",
      },
      {
        id: "aud-4",
        code: "AUD-104",
        title: "Audio-to-Video Lip-Sync Delay Alignment",
        duration: "5 min",
        summary:
          "Because video switchers and cameras take ~2–3 frames (33–50 ms) to process video, audio arrives faster than video unless delayed.",
        targetSpec: "40 ms digital delay on Broadcast Audio Bus to match 1080p60 video pipeline.",
        steps: [
          "Have someone clap once on stage in front of Camera 1 during T-15M pre-flight.",
          "Watch the multiview/return feed with QC-01 to verify the sound of the clap matches the visual hand impact.",
          "Apply 35–45 ms output delay on the Broadcast Matrix if audio leads video.",
        ],
        commsCallout: '"A1-MIX: Lip-sync frame delay locked with QC-01."',
        failureRecovery:
          "If YouTube reports drift mid-stream, adjust matrix output delay in 10 ms increments—never reset the console clock live.",
      },
    ],
    quiz: [
      {
        id: "q-aud-1",
        question:
          "What is the target loudness standard for our YouTube and Instagram broadcast mix?",
        options: [
          "-14 LUFS with a -1.5 dBTP true peak limiter",
          "0 dBFS with no limiter",
          "-35 LUFS so it is very quiet",
        ],
        correctIndex: 0,
        explanation:
          "-14 LUFS is the broadcast streaming standard for YouTube and mobile devices, ensuring clear volume without digital distortion.",
      },
      {
        id: "q-aud-2",
        question:
          "Why do we apply ~40 ms of delay to the Broadcast Audio output?",
        options: [
          "To make the sermon last longer",
          "To synchronize audio with the video processing latency of cameras and the switcher (lip-sync)",
          "To mute the congregation",
        ],
        correctIndex: 1,
        explanation:
          "Video processing takes 2–3 frames longer than audio. Delaying broadcast audio by ~40 ms locks lip-sync.",
      },
      {
        id: "q-aud-3",
        question:
          "What should A1-MIX do during the altar call when the band stops and only a soft synth pad is backing the Pastor?",
        options: [
          "Mute the synth pad completely",
          "Ride the synth pad fader up +3 dB so it remains audible on mobile phone speakers",
          "Turn off the Pastor's limiter",
        ],
        correctIndex: 1,
        explanation:
          "Soft pads disappear on small phone speakers unless boosted ~3 dB during spoken prayer transitions.",
      },
    ],
  },

  MODERATOR: {
    role: "MODERATOR",
    title: "Digital Host, Sermon Cues & Prayer Routing",
    callsignFormat: "MOD-01 (Digital Ministry Desk)",
    stationHardware: "Broadcast Console · Live Chat Router · Sermon Cue Deck",
    missionStatement:
      "Turn passive viewers into an engaged online congregation by firing sermon scriptures within 2 seconds and routing every prayer request back to its source platform.",
    keyMetrics: [
      { label: "Cue Response", value: "< 2 Seconds" },
      { label: "Prayer Capture", value: "100% Auto-Routed" },
      { label: "Platform Reply", value: "YT->YT / IG->IG" },
      { label: "Visitor Log", value: "Real-Time Roster" },
    ],
    lessons: [
      {
        id: "mod-1",
        code: "MOD-101",
        title: "Pre-Staging the Pastor Sermon PDF & Sub-2-Second Cue Firing",
        duration: "6 min",
        summary:
          "When the Pastor quotes a scripture or key point, online viewers should see it in the chat and lower-third within 2 seconds.",
        targetSpec: "All scriptures and sermon points imported and verified by T-30M.",
        steps: [
          "Upload or review the Pastor's sermon notes in the Broadcast Cue Deck before T-30M.",
          "Follow the Pastor's spoken cadence—keep your cursor hovering over the next scripture card.",
          "The moment the Pastor announces a verse, click once to broadcast it simultaneously to YouTube and Instagram.",
        ],
        commsCallout:
          '"MOD-01: Sermon cue deck loaded, 12 scriptures staged in sequence."',
        failureRecovery:
          "If the Pastor skips ahead or quotes an unscripted verse, use the AI Scripture Lookup bar to generate and post the verse in under 3 seconds.",
      },
      {
        id: "mod-2",
        code: "MOD-102",
        title: "Intelligent Auto-Prayer Queue & Platform-Matched Replies",
        duration: "7 min",
        summary:
          "Never miss a viewer asking for prayer on YouTube or Instagram, and always reply on the exact platform they messaged from.",
        targetSpec: "100% of prayer requests acknowledged within 60 seconds on origin platform.",
        steps: [
          "Watch the Auto-Prayer Queue—messages containing prayer keywords ('pray for', 'healing', 'family', 'amen') are automatically pulled from YT and IG.",
          "Click 'Reply on YouTube' or 'Reply on Instagram' to send a personal pastoral prayer response back to that exact platform.",
          "Flag urgent healing or salvation requests so the Pastor or prayer team can pray for them by name during ministry time.",
        ],
        commsCallout:
          '"MOD-01: Auto-prayer router active; 4 requests queued and replied."',
        failureRecovery:
          "If a viewer writes an implicit prayer need without keywords, click '+ Manual Prayer Capture' on their chat message to add it to the queue.",
      },
      {
        id: "mod-3",
        code: "MOD-103",
        title: "First-Time Visitor & Repeating Audience Check-In",
        duration: "5 min",
        summary:
          "Track who is new and who is returning week-over-week so our Analytics & Retention reports stay accurate.",
        targetSpec: "Log all active chat participants into the Visitor & Regular Roster.",
        steps: [
          "Post the Welcome & Check-In prompt during the opening worship song.",
          "When viewers say where they are tuning in from, log them in the Attendance Roster.",
          "Tag first-time guests so the follow-up team can connect with them after service.",
        ],
        commsCallout: '"MOD-01: Visitor and repeating audience check-in live."',
        failureRecovery:
          "Cross-check Instagram Live join notifications after service to capture mobile viewers who watched silently.",
      },
      {
        id: "mod-4",
        code: "MOD-104",
        title: "Giving, Connect Card & Altar Call Preset Timing",
        duration: "5 min",
        summary:
          "Release the right call-to-action link at the exact moment the Pastor or Host mentions it.",
        targetSpec: "Pinned YouTube link + Instagram '@Bio Link' prompt synchronized with stage.",
        steps: [
          "During Tithes & Offerings, trigger the Giving Preset (clickable URL on YouTube + bio/DM instruction on Instagram).",
          "During the Altar Call, trigger the Salvation / Prayer Response preset.",
          "Pin the primary action message at the top of YouTube Live chat.",
        ],
        commsCallout: '"MOD-01: Giving and Altar Call presets verified."',
        failureRecovery:
          "Never paste raw long URLs into Instagram Live comments (IG does not make comment URLs clickable)—always use the IG-optimized preset.",
      },
    ],
    quiz: [
      {
        id: "q-mod-1",
        question:
          "When a viewer submits a prayer request on Instagram Live, how does the system route your reply?",
        options: [
          "It sends an email only",
          "It routes the reply directly back to Instagram Live (@username) while logging the request in the central Prayer Queue",
          "It posts it only on YouTube",
        ],
        correctIndex: 1,
        explanation:
          "Platform-matched routing ensures Instagram viewers receive their reply on Instagram and YouTube viewers receive theirs on YouTube.",
      },
      {
        id: "q-mod-2",
        question:
          "What is the target response time for firing a scripture cue when the Pastor announces a verse?",
        options: [
          "Within 2 seconds",
          "After the service ends",
          "5 minutes later",
        ],
        correctIndex: 0,
        explanation:
          "Pre-staging the sermon PDF allows MOD-01 to trigger verses within 2 seconds of the Pastor speaking them.",
      },
      {
        id: "q-mod-3",
        question:
          "Why should MOD-01 log both first-time visitors and returning viewers during the stream?",
        options: [
          "To slow down the chat",
          "So the Analytics & Retention dashboard accurately tracks repeating audience retention and church growth goals",
          "Because YouTube deletes comments after 5 minutes",
        ],
        correctIndex: 1,
        explanation:
          "Logging viewers powers our Repeating vs. First-Time Audience retention metrics in the Analytics tab.",
      },
    ],
  },

  QC: {
    role: "QC",
    title: "Stream Quality Control & Telemetry",
    callsignFormat: "QC-01 (Stream Quality Controller)",
    stationHardware: "16:9 Reference Monitor + 9:16 Mobile Device + Telemetry Pad",
    missionStatement:
      "Act as the eyes and ears of the online congregation—catching framing, audio, or bitrate faults in real time and queuing actionable evidence for the Technical Director.",
    keyMetrics: [
      { label: "Dropped Frames", value: "0.0% Target" },
      { label: "YT Bitrate", value: "6.5–8.0 Mbps" },
      { label: "IG Bitrate", value: "4.0–4.5 Mbps" },
      { label: "Incident Logging", value: "< 5 Secs (1-Tap)" },
    ],
    lessons: [
      {
        id: "qc-1",
        code: "QC-101",
        title: "Dual-Device Public Stream Auditing (TV + Mobile Phone)",
        duration: "6 min",
        summary:
          "Never rely only on the control-room multiview. You must watch the actual public YouTube and Instagram streams as a viewer sees them.",
        targetSpec: "YouTube 1080p60 on reference screen + Instagram 9:16 on cellular phone.",
        steps: [
          "Open the live YouTube broadcast on a dedicated monitor/TV and verify 1080p60 resolution.",
          "Open the live Instagram broadcast on a mobile phone (off studio Wi-Fi if possible) to verify real-world mobile playback.",
          "Alternate headphone monitoring between YouTube and Instagram every 5 minutes.",
        ],
        commsCallout:
          '"QC-01: Public YouTube 16:9 and Instagram 9:16 return feeds verified."',
        failureRecovery:
          "If the studio multiview looks fine but the public stream is buffering, immediately alert TD-01 of a CDN/encoder uplink issue.",
      },
      {
        id: "qc-2",
        code: "QC-102",
        title: "1-Tap Rapid Incident Logging & Red-Reticle Frame Capture",
        duration: "6 min",
        summary:
          "When you spot an issue or broadcast win during the service, log it in under 5 seconds so it enters the Technical Director's Decision Queue.",
        targetSpec: "Select Platform -> Tap Preset -> Grab Screen -> Send to Director Queue.",
        steps: [
          "Select the affected platform ('Instagram 9:16', 'YouTube 16:9', or 'Both Streams').",
          "Tap one of the 8 One-Tap Observation Presets (or type a short headline).",
          "Click 'Capture Stream' (or paste a screenshot) and click the image to place the red target reticle on the exact problem area.",
          "Click 'Send to Technical Director Queue'—do NOT waste time typing action plans; the Director assigns those.",
        ],
        commsCallout:
          '"QC-01 to TD: Logged IG framing clip with screenshot in Director Queue."',
        failureRecovery:
          "For CRITICAL faults (total audio loss or stream offline), call TD-01 on intercom immediately FIRST, then log the screenshot.",
      },
      {
        id: "qc-3",
        code: "QC-103",
        title: "Encoder Bitrate, Frame Drop & Network Telemetry",
        duration: "5 min",
        summary:
          "Spot network degradation before the stream disconnects.",
        targetSpec: "0.0% dropped frames; sustained bitrate within 5% of target.",
        steps: [
          "Monitor the Telemetry Strip at the top of the Live QC tab.",
          "If dropped frames exceed 0.5%, check if non-production devices are saturating the church upload bandwidth.",
          "Log any bitrate dip with timestamp so engineering can correlate router logs after service.",
        ],
        commsCallout:
          '"QC-01: Encoder locked at 6.8 Mbps, 0.0% dropped frames."',
        failureRecovery:
          "If upload bandwidth drops below 5 Mbps, instruct TD-01 to switch encoder profile from 6.8 Mbps to 4.5 Mbps backup profile.",
      },
      {
        id: "qc-4",
        code: "QC-104",
        title: "Logging Broadcast Wins & Post-Show Debrief Preparation",
        duration: "5 min",
        summary:
          "Quality Control isn't just about catching faults—recording 'Broadcast Wins' builds team morale and documents what worked.",
        targetSpec: "Log at least 2 Broadcast Wins per service alongside any issues.",
        steps: [
          "When a camera transition, worship mix, or scripture cue is executed flawlessly, tap a 'Broadcast Win' preset.",
          "Broadcast Wins automatically mark as Resolved and appear in the Post-Show Technical Log.",
          "At the end of the broadcast, open the 'Post-Show Log' tab with TD-01 for the 5-minute team debrief.",
        ],
        commsCallout: '"QC-01: Post-Show Technical Log ready for debrief."',
        failureRecovery:
          "Export the Post-Show Log CSV after every Sunday service for archival.",
      },
    ],
    quiz: [
      {
        id: "q-qc-1",
        question:
          "When QC-01 logs an issue on the Fast QC Pad during the live service, what happens to it?",
        options: [
          "It is deleted after 1 minute",
          "It enters the Technical Director Queue as 'Waiting for Director' so the Director can decide the action and assign an operator",
          "It automatically shuts down the live stream",
        ],
        correctIndex: 1,
        explanation:
          "QC logs the observation and screenshot rapidly; the Technical Director reviews the queue and assigns the action plan, owner, and timeline.",
      },
      {
        id: "q-qc-2",
        question:
          "How can QC-01 highlight the exact area of a visual defect on a captured stream screenshot?",
        options: [
          "By clicking directly on the screenshot preview to place a red target reticle",
          "By printing the image on paper",
          "It is not possible to mark screenshots",
        ],
        correctIndex: 0,
        explanation:
          "Clicking anywhere on the attached screenshot places a red reticle marker at that exact X/Y coordinate for the Director.",
      },
      {
        id: "q-qc-3",
        question:
          "Why must QC-01 monitor an actual mobile phone for Instagram Live in addition to the studio monitor?",
        options: [
          "To play games during the sermon",
          "To verify real-world 9:16 vertical crop and mobile speaker loudness as public viewers experience it",
          "Because studio monitors cannot display color",
        ],
        correctIndex: 1,
        explanation:
          "Public mobile playback reveals 9:16 crop clipping and small-speaker audio translation issues that studio monitors hide.",
      },
    ],
  },

  DIRECTOR: {
    role: "DIRECTOR",
    title: "Technical Director & Master Control Leadership",
    callsignFormat: "TD-01 (Broadcast Director)",
    stationHardware: "Master Control Console · ATEM Switcher · Comms Matrix",
    missionStatement:
      "Lead the production crew with calm precision—clearing 100% of pre-flight checks, calling clean camera cuts, triaging the Live QC Queue, and driving continuous weekly improvement.",
    keyMetrics: [
      { label: "Pre-Flight Gate", value: "100% Verified" },
      { label: "Go/No-Go Poll", value: "T-5M Mandatory" },
      { label: "QC Triage", value: "Assign & Resolve" },
      { label: "Debrief Duration", value: "5 Mins Post-Show" },
    ],
    lessons: [
      {
        id: "dir-1",
        code: "DIR-101",
        title: "Managing the Pending Verification Zone & Reassigning Tasks",
        duration: "6 min",
        summary:
          "Use the separated Top Priority Pending Zone to identify bottlenecks in under 1 second and reassign tasks if an operator is delayed.",
        targetSpec: "Reach 100% All Stations Verified by T-5M.",
        steps: [
          "Watch the Master Readiness Banner—it lists exactly which department and operator still has pending checks.",
          "If an operator is busy rigging hardware, use the 'Owner' dropdown on any pending card to reassign that check to another team member.",
          "When all 19 checks are complete, the banner turns Emerald Green ('100% All Stations Verified'). Click 'Director: Confirm On Air'.",
        ],
        commsCallout:
          '"TD-01: 100% pre-flight verified. Master Control confirming On Air."',
        failureRecovery:
          "If a station declares HOLD at T-5M, keep the Pre-Show Countdown Slate on Program until the blocking check is verified.",
      },
      {
        id: "dir-2",
        code: "DIR-102",
        title: "Calling Clean Camera Cuts & Pacing the Broadcast",
        duration: "7 min",
        summary:
          "Use standard two-step broadcast commands ('Standby... Take') so camera operators are never caught moving on air.",
        targetSpec: "Always cue Preview (Green Tally) 2 seconds before cutting to Program (Red Tally).",
        steps: [
          "Put the next camera in Preview first and announce: 'Standby Cam 2 wide.'",
          "Verify focus and 9:16 framing on the Preview monitor, then command: 'Take Cam 2.'",
          "During high-energy worship, cut on musical bars (every 4–8 seconds); during sermon teaching, hold steady shots (15–30 seconds) to keep focus on the message.",
        ],
        commsCallout: '"Standby Cam 1 tight... Ready... Take Cam 1."',
        failureRecovery:
          "If the active Program camera loses focus or gets bumped, immediately cut to your Wide safety camera (Cam 2) without waiting.",
      },
      {
        id: "dir-3",
        code: "DIR-103",
        title: "Triaging the Live QC Decision Queue & Assigning Operators",
        duration: "6 min",
        summary:
          "Convert QC-01's rapid observations into concrete action assignments in 3 clicks.",
        targetSpec: "Zero items left in 'Awaiting Director' status by the end of service.",
        steps: [
          "Open the 'Live QC & Director Queue' tab whenever the badge shows pending items.",
          "Click a Director Action Preset (or type a custom directive), select the responsible operator from the dropdown, and choose the timeline ('Immediate', 'Saturday', 'Next Sun').",
          "Click 'Assign' to dispatch the action, and 'Resolve' once verified.",
        ],
        commsCallout:
          '"TD-01 to CAM-01: Action assigned from QC queue—re-center 9:16 guide."',
        failureRecovery:
          "For recurring hardware issues that require budget or Saturday maintenance, click '+ Timeline' in the Post-Show Log to push it to the Church Roadmap.",
      },
      {
        id: "dir-4",
        code: "DIR-104",
        title: "User Account Management & Post-Show Debrief Leadership",
        duration: "6 min",
        summary:
          "Onboard new volunteers in the Team & Accounts tab and lead a fast, encouraging 5-minute post-service review.",
        targetSpec: "Every operator assigned a callsign, role, and pre-flight checklist.",
        steps: [
          "In 'Team & Accounts', create accounts for all crew members, assign their department role and permission level, and use the inline task bar to assign station checks.",
          "After the broadcast ends, gather all 5 station leads around the 'Post-Show Log' tab.",
          "Celebrate the logged Broadcast Wins first, review the assigned action items for next week, and export/print the report.",
        ],
        commsCallout:
          '"TD-01: Great broadcast team. Meet at Master Control for our 5-minute Post-Show Log review."',
        failureRecovery:
          "Keep post-show meetings under 5 minutes—because all QC observations and Director actions were already logged live, the report is 100% ready when the stream ends.",
      },
    ],
    quiz: [
      {
        id: "q-dir-1",
        question:
          "What is the proper two-step intercom command before switching cameras on air?",
        options: [
          "Switch randomly without speaking",
          "'Standby Cam X' (check Preview), followed 2 seconds later by 'Take Cam X'",
          "Yell 'Cut!' after already pressing the button",
        ],
        correctIndex: 1,
        explanation:
          "Giving a 'Standby' warning lets the operator freeze their framing on Green Tally before going live on Red Tally.",
      },
      {
        id: "q-dir-2",
        question:
          "What should the Technical Director do if Kevin (Camera) is busy rigging a cable and has 1 Pending Pre-Flight check?",
        options: [
          "Cancel the entire Sunday service",
          "Spot the item in the top Pending Verification zone and either verify it together or reassign its Owner dropdown to another available operator",
          "Ignore it and go live at 75%",
        ],
        correctIndex: 1,
        explanation:
          "The Pending Verification zone isolates unfinished items at the top and lets the Director reassign ownership or verify immediately.",
      },
      {
        id: "q-dir-3",
        question:
          "How can the Director turn a live QC issue into a long-term hardware or training milestone?",
        options: [
          "Click '+ Timeline' on the item in the Post-Show Log to push it directly to the Timeline & Goals roadmap",
          "Write it on a sticky note",
          "Delete the QC log",
        ],
        correctIndex: 0,
        explanation:
          "The '+ Timeline' button pushes any QC log and Director directive directly into the Phase 1/2/3 Roadmap.",
      },
    ],
  },
};

const ROLE_ACCENTS: Record<
  CrewRole,
  {
    label: string;
    dot: string;
    text: string;
    pill: string;
    borderTop: string;
    activeBtn: string;
  }
> = {
  CAMERA: {
    label: "Camera",
    dot: "bg-amber-400",
    text: "text-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    borderTop: "border-t-2 border-t-amber-400",
    activeBtn: "bg-amber-400 text-black font-semibold",
  },
  AUDIO: {
    label: "Audio",
    dot: "bg-sky-400",
    text: "text-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    borderTop: "border-t-2 border-t-sky-400",
    activeBtn: "bg-sky-400 text-black font-semibold",
  },
  MODERATOR: {
    label: "Moderator",
    dot: "bg-violet-400",
    text: "text-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
    borderTop: "border-t-2 border-t-violet-400",
    activeBtn: "bg-violet-400 text-black font-semibold",
  },
  QC: {
    label: "Quality Control",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    borderTop: "border-t-2 border-t-emerald-400",
    activeBtn: "bg-emerald-400 text-black font-semibold",
  },
  DIRECTOR: {
    label: "Director",
    dot: "bg-rose-400",
    text: "text-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    borderTop: "border-t-2 border-t-rose-400",
    activeBtn: "bg-rose-400 text-black font-semibold",
  },
};

interface CrewTrainingAcademyProps {
  users: CrewUserAccount[];
  activeUserId: string;
  onToggleLesson: (userId: string, lessonId: string) => Promise<void>;
  onCertifyRole: (userId: string, role: CrewRole) => Promise<void>;
}

export default function CrewTrainingAcademy({
  users,
  activeUserId,
  onToggleLesson,
  onCertifyRole,
}: CrewTrainingAcademyProps) {
  const [academyMode, setAcademyMode] = useState<
    "PRODUCTION_FLOW" | "ROLE_MODULES"
  >("ROLE_MODULES");
  const [selectedRole, setSelectedRole] = useState<CrewRole>("CAMERA");
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(
    activeUserId || users[0]?.id || "usr-camera-1"
  );
  const [activeScenarioId, setActiveScenarioId] = useState<string>("scen-1");

  // Quiz state per question id
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmittedRole, setQuizSubmittedRole] = useState<
    Record<string, boolean>
  >({});

  const currentTrainee =
    users.find((u) => u.id === selectedTraineeId) || users[0];
  const completedLessons = currentTrainee?.completedLessons || [];
  const certifiedRoles = currentTrainee?.certifiedRoles || [];

  const curriculum = ROLE_CURRICULUMS[selectedRole];
  const roleAccent = ROLE_ACCENTS[selectedRole];

  const roleLessonIds = curriculum.lessons.map((l) => l.id);
  const completedInRole = roleLessonIds.filter((id) =>
    completedLessons.includes(id)
  ).length;
  const roleProgressPct = Math.round(
    (completedInRole / roleLessonIds.length) * 100
  );
  const isRoleCertified = certifiedRoles.includes(selectedRole);

  // Calculate quiz score for current role
  const currentQuizScore = curriculum.quiz.reduce((acc, q) => {
    return quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  const handleGradeQuiz = async () => {
    setQuizSubmittedRole((prev) => ({ ...prev, [selectedRole]: true }));
    if (
      currentQuizScore === curriculum.quiz.length &&
      currentTrainee &&
      !isRoleCertified
    ) {
      await onCertifyRole(currentTrainee.id, selectedRole);
    }
  };

  return (
    <div className="space-y-8">
      {/* ===================================================================
          TOP ACADEMY BAR: TRAINEE SELECTOR & MODULE SWITCHER
         =================================================================== */}
      <div className="rounded-3xl p-6 bg-[#121215] border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Broadcast Production Academy & Standard Operating Procedures
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Production Flow, Intercom Callsigns & Role Certification
          </h2>
          <p className="text-xs text-zinc-400">
            Train operators on T-Minus run-of-show stages, headset etiquette,
            and station-specific SOPs with live progress tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Trainee Selector */}
          <div className="flex items-center gap-2 bg-[#09090b] border border-white/[0.1] rounded-full px-3.5 py-1.5">
            <span className="text-[11px] text-zinc-400">Trainee:</span>
            <select
              value={currentTrainee?.id || ""}
              onChange={(e) => {
                const nextUser = users.find((u) => u.id === e.target.value);
                setSelectedTraineeId(e.target.value);
                if (nextUser) setSelectedRole(nextUser.role);
              }}
              aria-label="Select Trainee Account"
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              {users.map((u) => (
                <option
                  key={u.id}
                  value={u.id}
                  className="bg-[#121215] text-white"
                >
                  {u.name} ({u.callsign} · {u.role})
                </option>
              ))}
            </select>
          </div>

          {/* 2-Mode Segmented Control */}
          <div className="inline-flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setAcademyMode("PRODUCTION_FLOW")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                academyMode === "PRODUCTION_FLOW"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              1. Production Flow & Callsigns
            </button>
            <button
              type="button"
              onClick={() => setAcademyMode("ROLE_MODULES")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                academyMode === "ROLE_MODULES"
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              2. Role Training Modules (5 Roles)
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          MODE 1: PRODUCTION FLOW, CALLSIGN DICTIONARY & INTERCOM SCRIPTS
         =================================================================== */}
      {academyMode === "PRODUCTION_FLOW" && (
        <div className="space-y-8">
          {/* SECTION A: T-MINUS BROADCAST PRODUCTION FLOW */}
          <section className="rounded-3xl p-6 sm:p-8 bg-[#121215] border border-white/[0.08] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Master Run-of-Show Sequence
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mt-0.5">
                  End-to-End Sunday Broadcast Production Flow (T-60M to Wrap)
                </h3>
              </div>
              <span className="text-xs text-zinc-400">
                Click any stage to mark reviewed by {currentTrainee?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {PRODUCTION_FLOW_TIMELINE.map((stage, idx) => {
                const isDone = completedLessons.includes(stage.id);
                return (
                  <div
                    key={stage.id}
                    onClick={() =>
                      currentTrainee &&
                      onToggleLesson(currentTrainee.id, stage.id)
                    }
                    className={`cursor-pointer rounded-2xl p-5 border transition flex flex-col justify-between gap-4 ${
                      isDone
                        ? "bg-[#0e1512] border-emerald-500/35"
                        : "bg-[#09090b] border-white/[0.08] hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-white text-black text-[11px] font-bold font-mono">
                            {stage.phase}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {stage.window}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isDone
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          {isDone ? "Reviewed" : `Stage 0${idx + 1}`}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-white tracking-tight">
                          {stage.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {stage.summary}
                        </p>
                      </div>

                      <ul className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        {stage.checkpoints.map((cp) => (
                          <li
                            key={cp}
                            className="text-[11px] text-zinc-300 flex items-start gap-2"
                          >
                            <span className="w-1 h-1 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                            <span>{cp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-zinc-400">
                        Lead: {stage.leadCallsign}
                      </span>
                      <span className="font-semibold text-white">
                        {isDone ? "✓ Completed" : "Mark Reviewed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION B: CALLSIGN & INTERCOM PROTOCOL TABLE */}
          <section className="rounded-3xl p-6 sm:p-8 bg-[#121215] border border-white/[0.08] space-y-5">
            <div className="border-b border-white/[0.08] pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                Standardized Radio & Headset Protocol
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mt-0.5">
                Official Broadcast Callsigns & Go / No-Go Responses
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rule of Comms: Always state{" "}
                <strong className="text-white">
                  &ldquo;[Target Callsign] from [Your Callsign]&rdquo;
                </strong>{" "}
                before speaking so the Director immediately knows which station
                is calling.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
              {CALLSIGN_DIRECTORY.map((item) => {
                const st = ROLE_ACCENTS[item.role];
                return (
                  <div
                    key={item.callsign}
                    className={`rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] ${st.borderTop} flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${st.pill}`}
                        >
                          {item.callsign}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {item.role}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-white">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {item.channel}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {item.primaryDuty}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/[0.06] text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-semibold">
                          T-5M Go Response:
                        </span>
                        <span className="text-zinc-200 italic">
                          {item.pollResponse}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-rose-400 block font-semibold">
                          Hold / Alert Callout:
                        </span>
                        <span className="text-zinc-300 italic">
                          {item.emergencyPhrase}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION C: INTERACTIVE COMMS DIALOGUE SIMULATOR */}
          <section className="rounded-3xl p-6 sm:p-8 bg-[#121215] border border-white/[0.08] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                  Live Headset Drill
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight mt-0.5">
                  Word-for-Word Intercom Script Rehearsal
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {INTERCOM_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScenarioId(sc.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                      activeScenarioId === sc.id
                        ? "bg-white text-black font-semibold"
                        : "bg-white/[0.05] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sc.title.split("·")[1] || sc.title}
                  </button>
                ))}
              </div>
            </div>

            {INTERCOM_SCENARIOS.filter((s) => s.id === activeScenarioId).map(
              (scenario) => (
                <div key={scenario.id} className="space-y-4">
                  <div className="text-xs text-zinc-400">
                    {scenario.context}
                  </div>
                  <div className="space-y-2.5">
                    {scenario.lines.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex items-center gap-2 sm:w-52 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] font-bold text-white">
                            {line.callsign}
                          </span>
                          <span className="text-xs font-medium text-zinc-400 truncate">
                            {line.speaker}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-zinc-100">
                          &ldquo;{line.text}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </section>
        </div>
      )}

      {/* ===================================================================
          MODE 2: ROLE-BY-ROLE TRAINING MODULES & CERTIFICATION EXAM
         =================================================================== */}
      {academyMode === "ROLE_MODULES" && (
        <div className="space-y-6">
          {/* 5-ROLE SELECTOR PILLS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              ["CAMERA", "AUDIO", "MODERATOR", "QC", "DIRECTOR"] as CrewRole[]
            ).map((role) => {
              const st = ROLE_ACCENTS[role];
              const roleCurr = ROLE_CURRICULUMS[role];
              const doneCount = roleCurr.lessons.filter((l) =>
                completedLessons.includes(l.id)
              ).length;
              const isSelected = selectedRole === role;
              const isCert = certifiedRoles.includes(role);

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`text-left rounded-2xl p-4 transition border ${
                    st.borderTop
                  } ${
                    isSelected
                      ? "bg-[#1a1a20] border-white/30 ring-1 ring-white/20"
                      : "bg-[#121215] border-white/[0.08] hover:border-white/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-white">
                      {st.label}
                    </span>
                    {isCert ? (
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${st.pill}`}
                      >
                        Certified
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 tabular-nums">
                        {doneCount}/{roleCurr.lessons.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 truncate">
                    {roleCurr.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ROLE HERO BRIEFING & HARDWARE SPEC */}
          <div
            className={`rounded-3xl p-6 sm:p-8 bg-[#121215] border border-white/[0.08] ${roleAccent.borderTop} space-y-6`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${roleAccent.pill}`}
                  >
                    {curriculum.role} Track
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Callsign: {curriculum.callsignFormat}
                  </span>
                  {isRoleCertified && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                      Certified: {currentTrainee?.name}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  {curriculum.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                  {curriculum.missionStatement}
                </p>
              </div>

              {/* Trainee Progress Box */}
              <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 min-w-[240px] space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {currentTrainee?.name}&apos;s Progress
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${roleAccent.text}`}
                  >
                    {roleProgressPct}% ({completedInRole}/
                    {curriculum.lessons.length})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${roleAccent.dot}`}
                    style={{ width: `${roleProgressPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {curriculum.stationHardware}
                </div>
              </div>
            </div>

            {/* 4 Key Technical Benchmark Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {curriculum.keyMetrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl p-3.5 bg-[#09090b] border border-white/[0.06]"
                >
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {m.label}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5 tabular-nums">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 4 DETAILED SOP LESSONS FOR THIS ROLE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {curriculum.lessons.map((lesson) => {
                const isCompleted = completedLessons.includes(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className={`rounded-2xl p-5 border transition flex flex-col justify-between gap-4 ${
                      isCompleted
                        ? "bg-[#0e1512] border-emerald-500/35"
                        : "bg-[#09090b] border-white/[0.08]"
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${roleAccent.pill}`}
                          >
                            {lesson.code}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {lesson.duration}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            currentTrainee &&
                            onToggleLesson(currentTrainee.id, lesson.id)
                          }
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                            isCompleted
                              ? "bg-emerald-400 text-black"
                              : "bg-white text-black hover:bg-zinc-200"
                          }`}
                        >
                          {isCompleted
                            ? "✓ Completed"
                            : "Mark Lesson Complete"}
                        </button>
                      </div>

                      <div>
                        <h4 className="text-base font-semibold text-white tracking-tight">
                          {lesson.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {lesson.summary}
                        </p>
                      </div>

                      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] text-xs">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                          Target Broadcast Standard
                        </span>
                        <span className="text-white font-medium">
                          {lesson.targetSpec}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Step-by-Step Execution
                        </div>
                        {lesson.steps.map((st, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-zinc-200 flex items-start gap-2.5"
                          >
                            <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                              0{idx + 1}.
                            </span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/[0.06] text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block">
                          Standard Comms Callout
                        </span>
                        <span className="text-zinc-200 font-mono text-[11px]">
                          {lesson.commsCallout}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block">
                          Live Failure Recovery
                        </span>
                        <span className="text-zinc-400 text-[11px]">
                          {lesson.failureRecovery}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROLE CERTIFICATION KNOWLEDGE CHECK (3 SCENARIO QUESTIONS) */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#121215] border border-white/[0.08] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Operator Qualification Assessment
                </span>
                <h3 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                  {curriculum.title} — Role Certification Check
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Answer all 3 broadcast scenario questions correctly to award{" "}
                  <strong className="text-white">{currentTrainee?.name}</strong>{" "}
                  the official{" "}
                  <strong className="text-white">
                    {curriculum.role} Certified
                  </strong>{" "}
                  credential.
                </p>
              </div>

              {currentTrainee && (
                <button
                  type="button"
                  onClick={() => onCertifyRole(currentTrainee.id, selectedRole)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition shrink-0 ${
                    isRoleCertified
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.1]"
                  }`}
                >
                  {isRoleCertified
                    ? `✓ Certified ${selectedRole} Operator`
                    : "Director: Grant Instant Certification"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {curriculum.quiz.map((q, qIdx) => {
                const selectedOpt = quizAnswers[q.id];
                const isSubmitted = quizSubmittedRole[selectedRole];
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl p-5 bg-[#09090b] border border-white/[0.08] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        Scenario 0{qIdx + 1}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white leading-snug">
                        {q.question}
                      </div>

                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isChosen = selectedOpt === oIdx;
                          const isCorrect = q.correctIndex === oIdx;
                          let optionStyle =
                            "bg-[#141418] border-white/[0.08] text-zinc-300 hover:border-white/25";
                          if (isChosen) {
                            optionStyle =
                              "bg-white text-black border-white font-semibold";
                          }
                          if (isSubmitted) {
                            if (isCorrect) {
                              optionStyle =
                                "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-semibold";
                            } else if (isChosen && !isCorrect) {
                              optionStyle =
                                "bg-rose-500/20 border-rose-500/50 text-rose-200";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: oIdx,
                                }))
                              }
                              className={`w-full text-left p-3 rounded-xl border text-xs transition ${optionStyle}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isSubmitted && (
                      <div className="pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400">
                        <strong className="text-zinc-200">Standard: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
              <div className="text-xs text-zinc-400">
                {quizSubmittedRole[selectedRole] ? (
                  <span>
                    Score:{" "}
                    <strong className="text-white tabular-nums">
                      {currentQuizScore} / {curriculum.quiz.length}
                    </strong>{" "}
                    {currentQuizScore === curriculum.quiz.length
                      ? `— ${currentTrainee?.name} is now Certified for ${selectedRole}!`
                      : "— Review the highlighted explanations above and retry."}
                  </span>
                ) : (
                  <span>Select an answer for each scenario above to verify</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGradeQuiz}
                className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
              >
                Verify Answers & Certify {currentTrainee?.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

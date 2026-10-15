export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

/**
 * Formats a Date into Malaysia Time (MYT, UTC+8) as "hh:mm AM/PM MYT"
 */
export function formatMYTTime(date: Date = new Date()): string {
  const timeStr = date.toLocaleTimeString("en-US", {
    timeZone: MALAYSIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${timeStr} MYT`;
}

/**
 * Formats a Date into Malaysia Time with seconds as "hh:mm:ss AM/PM MYT"
 */
export function formatMYTClockWithSeconds(date: Date = new Date()): string {
  const timeStr = date.toLocaleTimeString("en-US", {
    timeZone: MALAYSIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${timeStr} MYT`;
}

/**
 * Formats a Date into Malaysia Date string (e.g., "Oct 15, 2026")
 */
export function formatMYTDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    timeZone: MALAYSIA_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns YYYY-MM-DD in Malaysia Time (UTC+8)
 */
export function formatMYTIsoDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "10";
  const d = parts.find((p) => p.type === "day")?.value || "15";
  return `${y}-${m}-${d}`;
}

export interface MalaysiaBroadcastCountdown {
  mytClock: string;
  mytDateLabel: string;
  dayName: string;
  windowState:
    | "PRE_SUNDAY"
    | "CHECKING_WINDOW_6AM"
    | "FINAL_10M_ALERT"
    | "EARLY_GO_LIVE_825AM"
    | "SERVICE_LIVE_830AM";
  windowHeadline: string;
  windowSubtext: string;
  // Countdown to 8:25 AM Go-Live (5 mins early before 8:30 AM service)
  toGoLive825: {
    totalSeconds: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  // Countdown to 6:00 AM Check Start
  toCheckStart600: {
    totalSeconds: number;
    formatted: string;
    isReached: boolean;
  };
  // Countdown to 8:30 AM Sunday Service Start
  toService830: {
    totalSeconds: number;
    formatted: string;
    isReached: boolean;
  };
  progressPct600To825: number;
}

function formatDurationHMS(totalSec: number): {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const clamped = Math.max(0, Math.floor(totalSec));
  const days = Math.floor(clamped / 86400);
  const remAfterDays = clamped % 86400;
  const hours = Math.floor(remAfterDays / 3600);
  const remAfterHours = remAfterDays % 3600;
  const minutes = Math.floor(remAfterHours / 60);
  const seconds = remAfterHours % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  const formatted =
    days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;

  return { totalSeconds: clamped, days, hours, minutes, seconds, formatted };
}

/**
 * Computes real-time Malaysia (UTC+8) broadcast countdowns for:
 * - 6:00 AM MYT: Pre-Flight Checking Starts
 * - 8:25 AM MYT: Go-Live (5 mins early before 8:30 AM service)
 * - 8:30 AM MYT: Sunday Service Official Start
 *
 * Also supports an optional simulation mode so the Director & Crew can test
 * Sunday morning phases on any day of the week.
 */
export function getMalaysiaBroadcastCountdown(
  now: Date = new Date(),
  simMode:
    | "REAL"
    | "SIM_615AM_CHECK"
    | "SIM_820AM_FINAL5M"
    | "SIM_825AM_GOLIVE" = "REAL"
): MalaysiaBroadcastCountdown {
  // Convert current instant into Malaysia UTC+8 components
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const mytNow = new Date(utcMs + 8 * 3600000);

  if (simMode !== "REAL") {
    const secTick = mytNow.getSeconds();
    if (simMode === "SIM_615AM_CHECK") {
      // Simulate Sunday 06:15:XX AM MYT (Check window active, 2h 09m to 8:25 AM Go-Live)
      mytNow.setHours(6, 15, secTick, 0);
    } else if (simMode === "SIM_820AM_FINAL5M") {
      // Simulate Sunday 08:20:XX AM MYT (4 mins remaining to 8:25 AM Early Go-Live!)
      mytNow.setHours(8, 20, secTick, 0);
    } else if (simMode === "SIM_825AM_GOLIVE") {
      // Simulate Sunday 08:25:XX AM MYT (Go-Live 5 mins early reached! 4 mins to 8:30 AM Service)
      mytNow.setHours(8, 25, secTick, 0);
    }
  }

  const dayOfWeek = simMode === "REAL" ? mytNow.getDay() : 0; // 0 = Sunday
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = dayNames[dayOfWeek] || "Sunday";

  const h = mytNow.getHours();
  const m = mytNow.getMinutes();
  const s = mytNow.getSeconds();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mytClock = `${String(h12).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")} ${ampm} MYT`;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mytDateLabel = `${dayName.slice(0, 3)}, ${
    monthNames[mytNow.getMonth()]
  } ${mytNow.getDate()} · Malaysia (UTC+8)`;

  const secondsSinceMidnight = h * 3600 + m * 60 + s;
  const sec600AM = 6 * 3600; // 06:00:00 AM (21,600s)
  const sec825AM = 8 * 3600 + 25 * 60; // 08:25:00 AM (30,300s) -> Go Live 5 mins early
  const sec830AM = 8 * 3600 + 30 * 60; // 08:30:00 AM (30,600s) -> Service Start
  const sec1030AM = 10 * 3600 + 30 * 60; // 10:30:00 AM -> Service End

  // If it is Sunday (or simulated Sunday) before 10:30 AM:
  if (dayOfWeek === 0 && secondsSinceMidnight <= sec1030AM) {
    const diff600 = Math.max(0, sec600AM - secondsSinceMidnight);
    const diff825 = Math.max(0, sec825AM - secondsSinceMidnight);
    const diff830 = Math.max(0, sec830AM - secondsSinceMidnight);

    const span600To825 = sec825AM - sec600AM; // 145 mins = 8700s
    const elapsedSince600 = Math.max(0, secondsSinceMidnight - sec600AM);
    const progressPct600To825 = Math.min(
      100,
      Math.round((elapsedSince600 / span600To825) * 100)
    );

    let windowState: MalaysiaBroadcastCountdown["windowState"] =
      "CHECKING_WINDOW_6AM";
    let windowHeadline =
      "Sunday 6:00 AM Check Window Active · Complete All Checks Before 8:25 AM Go-Live";
    let windowSubtext =
      "We go live at 8:25 AM MYT (5 mins before 8:30 AM service) so all streams & audio are verified on air.";

    if (secondsSinceMidnight < sec600AM) {
      windowState = "PRE_SUNDAY";
      windowHeadline = "Counting Down to 6:00 AM MYT Crew Check Start";
      windowSubtext =
        "Pre-flight check opens at 6:00 AM MYT · Stream Go-Live at 8:25 AM MYT · Service at 8:30 AM MYT";
    } else if (
      secondsSinceMidnight >= sec825AM - 600 &&
      secondsSinceMidnight < sec825AM
    ) {
      windowState = "FINAL_10M_ALERT";
      windowHeadline =
        "FINAL COUNTDOWN TO 8:25 AM MYT EARLY GO-LIVE (5 MINS BEFORE SERVICE)";
      windowSubtext =
        "All stations must be 100% verified now so the Technical Director can confirm Go-Live at 8:25 AM MYT.";
    } else if (
      secondsSinceMidnight >= sec825AM &&
      secondsSinceMidnight < sec830AM
    ) {
      windowState = "EARLY_GO_LIVE_825AM";
      windowHeadline =
        "8:25 AM MYT EARLY GO-LIVE WINDOW REACHED (5 MINS BEFORE 8:30 AM SERVICE)";
      windowSubtext =
        "Stream should be LIVE on YouTube & Instagram now · Counting down final 5 mins to 8:30 AM Service Start!";
    } else if (secondsSinceMidnight >= sec830AM) {
      windowState = "SERVICE_LIVE_830AM";
      windowHeadline = "8:30 AM MYT SUNDAY SERVICE LIVE ON AIR";
      windowSubtext =
        "Active broadcast in progress · Monitor QC telemetry & prayer routing.";
    }

    return {
      mytClock,
      mytDateLabel,
      dayName,
      windowState,
      windowHeadline,
      windowSubtext,
      toGoLive825: formatDurationHMS(diff825),
      toCheckStart600: {
        totalSeconds: diff600,
        formatted: formatDurationHMS(diff600).formatted,
        isReached: diff600 === 0,
      },
      toService830: {
        totalSeconds: diff830,
        formatted: formatDurationHMS(diff830).formatted,
        isReached: diff830 === 0,
      },
      progressPct600To825,
    };
  }

  // Otherwise calculate time until the upcoming Sunday 6:00 AM, 8:25 AM, and 8:30 AM MYT
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const secondsUntilNextMidnight = 86400 - secondsSinceMidnight;
  const fullDaysBetween = Math.max(0, daysUntilSunday - 1) * 86400;

  const diff600 = secondsUntilNextMidnight + fullDaysBetween + sec600AM;
  const diff825 = secondsUntilNextMidnight + fullDaysBetween + sec825AM;
  const diff830 = secondsUntilNextMidnight + fullDaysBetween + sec830AM;

  return {
    mytClock,
    mytDateLabel,
    dayName,
    windowState: "PRE_SUNDAY",
    windowHeadline:
      "Sunday Broadcast Schedule: 6:00 AM Check Start · 8:25 AM Early Go-Live · 8:30 AM Service",
    windowSubtext:
      "System locked to Malaysia Time (MYT · UTC+8). Stream goes live 5 mins early at 8:25 AM MYT to verify all feeds before 8:30 AM.",
    toGoLive825: formatDurationHMS(diff825),
    toCheckStart600: {
      totalSeconds: diff600,
      formatted: formatDurationHMS(diff600).formatted,
      isReached: false,
    },
    toService830: {
      totalSeconds: diff830,
      formatted: formatDurationHMS(diff830).formatted,
      isReached: false,
    },
    progressPct600To825: 0,
  };
}

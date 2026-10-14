import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";

export interface ServiceHistoryItem {
  id: string;
  date: string;
  label: string;
  title: string;
  peakYT: number;
  peakIG: number;
  totalPeak: number;
  uniqueViewers: number;
  repeatingViewers: number;
  firstTimeVisitors: number;
  avgWatchMinutes: number;
  chatMessages: number;
  prayerRequests: number;
  cuesReleased: number;
  salvations: number;
  notes?: string;
}

export interface AudienceMember {
  id: string;
  name: string;
  handle: string;
  platform: "YOUTUBE" | "INSTAGRAM" | "BOTH";
  location: string;
  servicesAttended: number;
  firstSeen: string;
  lastSeen: string;
  prayerRequestsCount: number;
  engagementScore: number; // 1-100
  tags: string[];
  notes?: string;
}

const DEFAULT_SERVICE_HISTORY: ServiceHistoryItem[] = [
  {
    id: "srv-w1",
    date: "2026-08-30",
    label: "Aug 30",
    title: "Walking in Faith & Power",
    peakYT: 52,
    peakIG: 31,
    totalPeak: 83,
    uniqueViewers: 165,
    repeatingViewers: 38,
    firstTimeVisitors: 9,
    avgWatchMinutes: 21,
    chatMessages: 94,
    prayerRequests: 6,
    cuesReleased: 12,
    salvations: 2,
  },
  {
    id: "srv-w2",
    date: "2026-09-06",
    label: "Sep 06",
    title: "The Sound of Revival",
    peakYT: 58,
    peakIG: 36,
    totalPeak: 94,
    uniqueViewers: 188,
    repeatingViewers: 46,
    firstTimeVisitors: 11,
    avgWatchMinutes: 23,
    chatMessages: 118,
    prayerRequests: 8,
    cuesReleased: 15,
    salvations: 3,
  },
  {
    id: "srv-w3",
    date: "2026-09-13",
    label: "Sep 13",
    title: "Breaking Generational Barriers",
    peakYT: 65,
    peakIG: 39,
    totalPeak: 104,
    uniqueViewers: 210,
    repeatingViewers: 55,
    firstTimeVisitors: 14,
    avgWatchMinutes: 25,
    chatMessages: 142,
    prayerRequests: 11,
    cuesReleased: 18,
    salvations: 4,
  },
  {
    id: "srv-w4",
    date: "2026-09-20",
    label: "Sep 20",
    title: "Anointed for the Marketplace",
    peakYT: 71,
    peakIG: 42,
    totalPeak: 113,
    uniqueViewers: 229,
    repeatingViewers: 63,
    firstTimeVisitors: 12,
    avgWatchMinutes: 26,
    chatMessages: 156,
    prayerRequests: 9,
    cuesReleased: 20,
    salvations: 2,
  },
  {
    id: "srv-w5",
    date: "2026-09-27",
    label: "Sep 27",
    title: "When Heaven Touches Earth",
    peakYT: 76,
    peakIG: 47,
    totalPeak: 123,
    uniqueViewers: 254,
    repeatingViewers: 71,
    firstTimeVisitors: 15,
    avgWatchMinutes: 27,
    chatMessages: 184,
    prayerRequests: 13,
    cuesReleased: 22,
    salvations: 5,
  },
  {
    id: "srv-w6",
    date: "2026-10-04",
    label: "Oct 04",
    title: "Unshakeable Kingdom Foundations",
    peakYT: 82,
    peakIG: 50,
    totalPeak: 132,
    uniqueViewers: 278,
    repeatingViewers: 79,
    firstTimeVisitors: 16,
    avgWatchMinutes: 28,
    chatMessages: 205,
    prayerRequests: 14,
    cuesReleased: 24,
    salvations: 4,
  },
  {
    id: "srv-w7",
    date: "2026-10-11",
    label: "Oct 11",
    title: "Prophetic Acceleration & Breakthrough",
    peakYT: 88,
    peakIG: 54,
    totalPeak: 142,
    uniqueViewers: 305,
    repeatingViewers: 86,
    firstTimeVisitors: 19,
    avgWatchMinutes: 31,
    chatMessages: 238,
    prayerRequests: 16,
    cuesReleased: 28,
    salvations: 6,
  },
];

const DEFAULT_AUDIENCE_ROSTER: AudienceMember[] = [
  {
    id: "aud-1",
    name: "Sister Hannah Lim",
    handle: "@hannah_lim_sg",
    platform: "YOUTUBE",
    location: "Singapore",
    servicesAttended: 7,
    firstSeen: "2026-08-30",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 3,
    engagementScore: 96,
    tags: ["Core Regular", "Prayer Intercessor", "Amen Leader"],
  },
  {
    id: "aud-2",
    name: "David Tan",
    handle: "@davidtan_official",
    platform: "BOTH",
    location: "Kuala Lumpur, MY",
    servicesAttended: 6,
    firstSeen: "2026-09-06",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 2,
    engagementScore: 92,
    tags: ["Core Regular", "Watch Party Host"],
  },
  {
    id: "aud-3",
    name: "Rachel & Mark Wong",
    handle: "@rachelwong_family",
    platform: "YOUTUBE",
    location: "Johor Bahru, MY",
    servicesAttended: 5,
    firstSeen: "2026-09-13",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 1,
    engagementScore: 88,
    tags: ["Core Regular", "Family Viewer"],
  },
  {
    id: "aud-4",
    name: "Joshua Raj",
    handle: "@joshua.raj99",
    platform: "INSTAGRAM",
    location: "Singapore",
    servicesAttended: 5,
    firstSeen: "2026-09-13",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 2,
    engagementScore: 85,
    tags: ["Core Regular", "IG Live Share"],
  },
  {
    id: "aud-5",
    name: "Priscilla Fernandez",
    handle: "@priscilla_f",
    platform: "INSTAGRAM",
    location: "Perth, AU",
    servicesAttended: 4,
    firstSeen: "2026-09-20",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 4,
    engagementScore: 89,
    tags: ["Core Regular", "Overseas Member"],
  },
  {
    id: "aud-6",
    name: "Kelvin Ooi",
    handle: "@kelvinooi_88",
    platform: "YOUTUBE",
    location: "Penang, MY",
    servicesAttended: 3,
    firstSeen: "2026-09-27",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 1,
    engagementScore: 78,
    tags: ["Core Regular"],
  },
  {
    id: "aud-7",
    name: "Esther Samuel",
    handle: "@esther_sam",
    platform: "BOTH",
    location: "Singapore",
    servicesAttended: 3,
    firstSeen: "2026-09-27",
    lastSeen: "2026-10-11",
    prayerRequestsCount: 2,
    engagementScore: 81,
    tags: ["Core Regular"],
  },
  {
    id: "aud-8",
    name: "Daniel Pillai",
    handle: "@daniel_pillai",
    platform: "YOUTUBE",
    location: "Singapore",
    servicesAttended: 2,
    firstSeen: "2026-10-04",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 1,
    engagementScore: 72,
    tags: ["Returning Viewer"],
  },
  {
    id: "aud-9",
    name: "Chloe Ng",
    handle: "@chloeng.ig",
    platform: "INSTAGRAM",
    location: "Jakarta, ID",
    servicesAttended: 2,
    firstSeen: "2026-10-04",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 0,
    engagementScore: 68,
    tags: ["Returning Viewer"],
  },
  {
    id: "aud-10",
    name: "Marcus Lee",
    handle: "@marcus_lee_sg",
    platform: "YOUTUBE",
    location: "Singapore",
    servicesAttended: 2,
    firstSeen: "2026-10-04",
    lastSeen: "2026-10-11",
    prayerRequestsCount: 1,
    engagementScore: 65,
    tags: ["Returning Viewer"],
  },
  {
    id: "aud-11",
    name: "Grace Mathew",
    handle: "@gracemathew",
    platform: "INSTAGRAM",
    location: "Manila, PH",
    servicesAttended: 1,
    firstSeen: "2026-10-14",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 1,
    engagementScore: 60,
    tags: ["First-Time Visitor", "Connect Card"],
  },
  {
    id: "aud-12",
    name: "samuel_k",
    handle: "@samuel_k",
    platform: "YOUTUBE",
    location: "London, UK",
    servicesAttended: 1,
    firstSeen: "2026-10-14",
    lastSeen: "2026-10-14",
    prayerRequestsCount: 0,
    engagementScore: 55,
    tags: ["First-Time Visitor"],
  },
];

const RETENTION_CURVE = [
  {
    minute: "00m",
    segment: "Pre-Stream Countdown",
    ytViewers: 28,
    igViewers: 19,
    repeatingActive: 38,
    chatRate: 18,
  },
  {
    minute: "10m",
    segment: "Praise & Worship",
    ytViewers: 64,
    igViewers: 44,
    repeatingActive: 74,
    chatRate: 45,
  },
  {
    minute: "25m",
    segment: "Host Welcome & Check-In",
    ytViewers: 78,
    igViewers: 51,
    repeatingActive: 84,
    chatRate: 68,
  },
  {
    minute: "40m",
    segment: "Sermon Word & Scripture Cues",
    ytViewers: 88,
    igViewers: 54,
    repeatingActive: 92,
    chatRate: 85,
  },
  {
    minute: "55m",
    segment: "Prophetic Declarations Peak",
    ytViewers: 86,
    igViewers: 52,
    repeatingActive: 90,
    chatRate: 96,
  },
  {
    minute: "65m",
    segment: "Altar Call & Prayer Triage",
    ytViewers: 79,
    igViewers: 46,
    repeatingActive: 85,
    chatRate: 78,
  },
  {
    minute: "75m",
    segment: "Benediction & Next Steps",
    ytViewers: 68,
    igViewers: 38,
    repeatingActive: 76,
    chatRate: 52,
  },
];

function getStoredAnalytics() {
  const store = readFallbackStore();
  if (!store.analytics) {
    store.analytics = {
      serviceHistory: DEFAULT_SERVICE_HISTORY,
      audienceRoster: DEFAULT_AUDIENCE_ROSTER,
    };
    writeFallbackStore("analytics", store.analytics);
  }
  return store.analytics as {
    serviceHistory: ServiceHistoryItem[];
    audienceRoster: AudienceMember[];
  };
}

export async function GET() {
  const stored = getStoredAnalytics();
  const store = readFallbackStore();

  let dbVisitors: any[] = [];
  let dbPrayers: any[] = [];
  let dbBroadcasts: any[] = [];
  let dbCues: any[] = [];
  let activeService: any = null;

  try {
    await ensureDbReady();
    const [v, p, b, c, s] = await Promise.all([
      db.visitorLog.findMany({ orderBy: { connectedAt: "desc" } }),
      db.prayerRequest.findMany({ orderBy: { createdAt: "desc" } }),
      db.broadcastMessage.findMany({ orderBy: { sentAt: "desc" } }),
      db.sermonCue.findMany({ orderBy: { sortOrder: "asc" } }),
      db.serviceSession.findFirst({
        where: { isActive: true },
        orderBy: { startedAt: "desc" },
      }),
    ]);
    dbVisitors = v;
    dbPrayers = p;
    dbBroadcasts = b;
    dbCues = c;
    activeService = s;
  } catch {}

  // Merge any DB visitors into audienceRoster if not already tracked
  const rosterMap = new Map<string, AudienceMember>();
  for (const member of stored.audienceRoster) {
    rosterMap.set(member.name.toLowerCase(), member);
  }

  for (const v of dbVisitors) {
    const key = (v.name || "").trim().toLowerCase();
    if (!key) continue;
    const existing = rosterMap.get(key);
    if (!existing) {
      rosterMap.set(key, {
        id: `vis-${v.id}`,
        name: v.name,
        handle: v.name.startsWith("@") ? v.name : `@${v.name.toLowerCase().replace(/\s+/g, "_")}`,
        platform: (v.platform as any) || "YOUTUBE",
        location: v.location || "Online",
        servicesAttended: 1,
        firstSeen: new Date(v.connectedAt).toISOString().slice(0, 10),
        lastSeen: new Date(v.connectedAt).toISOString().slice(0, 10),
        prayerRequestsCount: 0,
        engagementScore: 65,
        tags: ["First-Time Visitor", "Live Log"],
      });
    }
  }

  const fullRoster = Array.from(rosterMap.values()).sort(
    (a, b) => b.servicesAttended - a.servicesAttended
  );

  // Sync latest service entry with live activeService if peakViewersYT/IG is higher
  const history = [...stored.serviceHistory];
  if (activeService && history.length > 0) {
    const lastIdx = history.length - 1;
    const last = history[lastIdx];
    const liveYT = activeService.peakViewersYT || 0;
    const liveIG = activeService.peakViewersIG || 0;
    if (liveYT + liveIG > 0) {
      history[lastIdx] = {
        ...last,
        title: activeService.title || last.title,
        peakYT: liveYT,
        peakIG: liveIG,
        totalPeak: liveYT + liveIG,
      };
    }
  }

  const targetAttendance =
    store.roadmap?.goals?.phase1TargetAttendance || 200;

  return NextResponse.json({
    serviceHistory: history,
    audienceRoster: fullRoster,
    retentionCurve: RETENTION_CURVE,
    targetAttendance,
    liveCounts: {
      visitors: dbVisitors.length,
      prayers: dbPrayers.length,
      broadcasts: dbBroadcasts.length,
      cuesTotal: dbCues.length,
      cuesReleased: dbCues.filter((c) => c.isReleased).length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stored = getStoredAnalytics();

    // 1. Increment visit count for an audience member (+1 Sunday Attendance)
    if (body.action === "INCREMENT_VISIT" && body.id) {
      const today = new Date().toISOString().slice(0, 10);
      stored.audienceRoster = stored.audienceRoster.map((m) => {
        if (m.id !== body.id) return m;
        const nextVisits = m.servicesAttended + 1;
        const nextTags = m.tags.filter(
          (t) =>
            t !== "First-Time Visitor" &&
            t !== "Returning Viewer" &&
            t !== "Core Regular"
        );
        if (nextVisits >= 3) nextTags.unshift("Core Regular");
        else if (nextVisits === 2) nextTags.unshift("Returning Viewer");
        else nextTags.unshift("First-Time Visitor");

        return {
          ...m,
          servicesAttended: nextVisits,
          lastSeen: today,
          engagementScore: Math.min(100, m.engagementScore + 5),
          tags: nextTags,
        };
      });
    }

    // 2. Add or Check-In an Audience Member
    if (body.action === "ADD_AUDIENCE_MEMBER" && body.member) {
      const m = body.member;
      const visits = Number(m.servicesAttended) || 1;
      const statusTag =
        visits >= 3
          ? "Core Regular"
          : visits === 2
          ? "Returning Viewer"
          : "First-Time Visitor";

      const newMember: AudienceMember = {
        id: `aud-${Date.now()}`,
        name: String(m.name || "Online Viewer").trim(),
        handle: String(
          m.handle ||
            `@${String(m.name || "viewer")
              .toLowerCase()
              .replace(/\s+/g, "_")}`
        ).trim(),
        platform: m.platform || "YOUTUBE",
        location: m.location || "Online",
        servicesAttended: visits,
        firstSeen: new Date().toISOString().slice(0, 10),
        lastSeen: new Date().toISOString().slice(0, 10),
        prayerRequestsCount: Number(m.prayerRequestsCount) || 0,
        engagementScore: visits >= 3 ? 85 : visits === 2 ? 72 : 60,
        tags: [statusTag, ...(m.tags || [])],
      };

      stored.audienceRoster = [newMember, ...stored.audienceRoster];
    }

    // 3. Log a new Service Snapshot or Update Last Service for Historical Graphs
    if (body.action === "LOG_SERVICE_METRICS" && body.service) {
      const s = body.service;
      const peakYT = Number(s.peakYT) || 0;
      const peakIG = Number(s.peakIG) || 0;
      const totalPeak = peakYT + peakIG;
      const dateStr = s.date || new Date().toISOString().slice(0, 10);
      const parsedDate = new Date(dateStr);
      const label = isNaN(parsedDate.getTime())
        ? dateStr
        : parsedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
          });

      const newEntry: ServiceHistoryItem = {
        id: `srv-${Date.now()}`,
        date: dateStr,
        label,
        title: String(s.title || "Sunday Worship Service").trim(),
        peakYT,
        peakIG,
        totalPeak,
        uniqueViewers: Number(s.uniqueViewers) || Math.round(totalPeak * 2.1),
        repeatingViewers:
          Number(s.repeatingViewers) || Math.round(totalPeak * 0.62),
        firstTimeVisitors: Number(s.firstTimeVisitors) || 12,
        avgWatchMinutes: Number(s.avgWatchMinutes) || 30,
        chatMessages: Number(s.chatMessages) || 180,
        prayerRequests: Number(s.prayerRequests) || 12,
        cuesReleased: Number(s.cuesReleased) || 24,
        salvations: Number(s.salvations) || 3,
      };

      stored.serviceHistory = [...stored.serviceHistory, newEntry];
    }

    writeFallbackStore("analytics", stored);
    return NextResponse.json({
      success: true,
      serviceHistory: stored.serviceHistory,
      audienceRoster: stored.audienceRoster,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update analytics" },
      { status: 400 }
    );
  }
}

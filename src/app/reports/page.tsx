"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import {
  BarChart3,
  Users,
  HeartHandshake,
  UserPlus,
  Send,
  Sparkles,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Repeat,
  Eye,
  Flame,
  Plus,
  Search,
  Award,
  Target,
  Activity,
  X,
  Check,
  Radio,
} from "lucide-react";

const LOCAL_ANALYTICS_KEY = "church_live_hub_analytics_v1";

export default function ReportsPage() {
  const [service, setService] = useState<any>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [audienceRoster, setAudienceRoster] = useState<any[]>([]);
  const [retentionCurve, setRetentionCurve] = useState<any[]>([]);
  const [targetAttendance, setTargetAttendance] = useState<number>(200);

  const [selectedServiceIdx, setSelectedServiceIdx] = useState<number>(-1);
  const [audienceFilter, setAudienceFilter] = useState<string>("ALL");
  const [audienceSearch, setAudienceSearch] = useState<string>("");

  const [showLogServiceModal, setShowLogServiceModal] = useState(false);
  const [showAddViewerModal, setShowAddViewerModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [aiReport, setAiReport] = useState<{
    summary: string;
    actionItems: string;
  } | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Form states for logging a service snapshot
  const [newSrv, setNewSrv] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "Sunday Prophetic & Worship Service",
    peakYT: 95,
    peakIG: 60,
    uniqueViewers: 320,
    repeatingViewers: 98,
    firstTimeVisitors: 21,
    avgWatchMinutes: 33,
    chatMessages: 260,
    prayerRequests: 18,
    cuesReleased: 30,
    salvations: 7,
  });

  // Form states for checking in / adding a viewer
  const [newViewer, setNewViewer] = useState({
    name: "",
    handle: "",
    platform: "YOUTUBE",
    location: "Singapore",
    servicesAttended: 2,
    prayerRequestsCount: 0,
  });

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    const loadAllAnalytics = async () => {
      try {
        const cached = localStorage.getItem(LOCAL_ANALYTICS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.serviceHistory) setServiceHistory(parsed.serviceHistory);
          if (parsed.audienceRoster) setAudienceRoster(parsed.audienceRoster);
        }
      } catch {}

      try {
        const [servRes, prayRes, visRes, bcRes, anaRes] = await Promise.all([
          fetch("/api/service", { cache: "no-store" }),
          fetch("/api/prayers", { cache: "no-store" }),
          fetch("/api/visitors", { cache: "no-store" }),
          fetch("/api/broadcast", { cache: "no-store" }),
          fetch("/api/analytics", { cache: "no-store" }),
        ]);

        const s = await servRes.json();
        const p = await prayRes.json();
        const v = await visRes.json();
        const b = await bcRes.json();
        const a = await anaRes.json();

        if (s.service) setService(s.service);
        if (p.prayers) setPrayers(p.prayers);
        if (v.visitors) setVisitors(v.visitors);
        if (b.messages) setBroadcasts(b.messages);

        if (a.serviceHistory) {
          setServiceHistory(a.serviceHistory);
          setSelectedServiceIdx(a.serviceHistory.length - 1);
        }
        if (a.audienceRoster) setAudienceRoster(a.audienceRoster);
        if (a.retentionCurve) setRetentionCurve(a.retentionCurve);
        if (a.targetAttendance) setTargetAttendance(a.targetAttendance);

        try {
          localStorage.setItem(
            LOCAL_ANALYTICS_KEY,
            JSON.stringify({
              serviceHistory: a.serviceHistory,
              audienceRoster: a.audienceRoster,
            })
          );
        } catch {}
      } catch (e) {
        console.error("Failed to load analytics:", e);
      }
    };

    loadAllAnalytics();
  }, []);

  // Active inspected service snapshot (defaults to latest)
  const currentSnapshot = useMemo(() => {
    if (serviceHistory.length === 0) {
      const liveYT = service?.peakViewersYT || 88;
      const liveIG = service?.peakViewersIG || 54;
      const total = liveYT + liveIG;
      return {
        title: service?.title || "Sunday Worship Service",
        date: new Date().toISOString().slice(0, 10),
        label: "Today",
        peakYT: liveYT,
        peakIG: liveIG,
        totalPeak: total,
        uniqueViewers: Math.round(total * 2.15),
        repeatingViewers: Math.round(total * 0.61),
        firstTimeVisitors: visitors.length || 19,
        avgWatchMinutes: 31,
        chatMessages: broadcasts.length || 238,
        prayerRequests: prayers.length || 16,
        cuesReleased: 28,
        salvations: 6,
      };
    }
    const idx =
      selectedServiceIdx >= 0 && selectedServiceIdx < serviceHistory.length
        ? selectedServiceIdx
        : serviceHistory.length - 1;
    return serviceHistory[idx];
  }, [serviceHistory, selectedServiceIdx, service, visitors, broadcasts, prayers]);

  // Previous service for Week-over-Week delta calculation
  const previousSnapshot = useMemo(() => {
    if (serviceHistory.length < 2) return null;
    const idx =
      selectedServiceIdx > 0
        ? selectedServiceIdx - 1
        : serviceHistory.length - 2;
    return serviceHistory[idx];
  }, [serviceHistory, selectedServiceIdx]);

  const wowGrowthPct = useMemo(() => {
    if (!previousSnapshot || !previousSnapshot.totalPeak) return 14;
    return Math.round(
      ((currentSnapshot.totalPeak - previousSnapshot.totalPeak) /
        previousSnapshot.totalPeak) *
        100
    );
  }, [currentSnapshot, previousSnapshot]);

  // Repeating Audience Breakdown Stats
  const audienceStats = useMemo(() => {
    const totalTracked = audienceRoster.length;
    const coreRegulars = audienceRoster.filter(
      (m) => m.servicesAttended >= 3
    ).length;
    const returningSecondTime = audienceRoster.filter(
      (m) => m.servicesAttended === 2
    ).length;
    const firstTimers = audienceRoster.filter(
      (m) => m.servicesAttended === 1
    ).length;
    const repeatingTotal = coreRegulars + returningSecondTime;
    const repeatingPct =
      currentSnapshot.totalPeak > 0
        ? Math.min(
            98,
            Math.round(
              (currentSnapshot.repeatingViewers / currentSnapshot.totalPeak) *
                100
            )
          )
        : 61;

    const ytMembers = audienceRoster.filter(
      (m) => m.platform === "YOUTUBE" || m.platform === "BOTH"
    ).length;
    const igMembers = audienceRoster.filter(
      (m) => m.platform === "INSTAGRAM" || m.platform === "BOTH"
    ).length;
    const dualPlatform = audienceRoster.filter(
      (m) => m.platform === "BOTH"
    ).length;

    return {
      totalTracked,
      coreRegulars,
      returningSecondTime,
      firstTimers,
      repeatingTotal,
      repeatingPct,
      ytMembers,
      igMembers,
      dualPlatform,
    };
  }, [audienceRoster, currentSnapshot]);

  const filteredAudience = useMemo(() => {
    return audienceRoster.filter((m) => {
      const matchesSearch =
        !audienceSearch.trim() ||
        m.name.toLowerCase().includes(audienceSearch.toLowerCase()) ||
        m.handle.toLowerCase().includes(audienceSearch.toLowerCase()) ||
        (m.location || "").toLowerCase().includes(audienceSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (audienceFilter === "CORE") return m.servicesAttended >= 3;
      if (audienceFilter === "RETURNING") return m.servicesAttended === 2;
      if (audienceFilter === "FIRST_TIME") return m.servicesAttended === 1;
      if (audienceFilter === "YOUTUBE")
        return m.platform === "YOUTUBE" || m.platform === "BOTH";
      if (audienceFilter === "INSTAGRAM")
        return m.platform === "INSTAGRAM" || m.platform === "BOTH";
      return true;
    });
  }, [audienceRoster, audienceFilter, audienceSearch]);

  const handleIncrementVisit = async (id: string, name: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = audienceRoster.map((m) => {
      if (m.id !== id) return m;
      const nextVisits = m.servicesAttended + 1;
      const cleanTags = (m.tags || []).filter(
        (t: string) =>
          t !== "First-Time Visitor" &&
          t !== "Returning Viewer" &&
          t !== "Core Regular"
      );
      if (nextVisits >= 3) cleanTags.unshift("Core Regular");
      else if (nextVisits === 2) cleanTags.unshift("Returning Viewer");
      else cleanTags.unshift("First-Time Visitor");

      return {
        ...m,
        servicesAttended: nextVisits,
        lastSeen: today,
        engagementScore: Math.min(100, (m.engagementScore || 70) + 5),
        tags: cleanTags,
      };
    });

    setAudienceRoster(updated);
    triggerToast(`Checked in ${name} (+1 repeating attendance)!`);

    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "INCREMENT_VISIT", id }),
      });
    } catch {}
  };

  const handleAddViewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewer.name.trim()) return;

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_AUDIENCE_MEMBER",
          member: newViewer,
        }),
      });
      const data = await res.json();
      if (data.audienceRoster) {
        setAudienceRoster(data.audienceRoster);
      }
    } catch {}

    setNewViewer({
      name: "",
      handle: "",
      platform: "YOUTUBE",
      location: "Singapore",
      servicesAttended: 2,
      prayerRequestsCount: 0,
    });
    setShowAddViewerModal(false);
    triggerToast("Viewer added to Repeating Audience Roster!");
  };

  const handleLogService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOG_SERVICE_METRICS",
          service: newSrv,
        }),
      });
      const data = await res.json();
      if (data.serviceHistory) {
        setServiceHistory(data.serviceHistory);
        setSelectedServiceIdx(data.serviceHistory.length - 1);
      }
    } catch {}

    setShowLogServiceModal(false);
    triggerToast("Service metrics logged & graphs updated!");
  };

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Service Title",
      "Peak YouTube",
      "Peak Instagram",
      "Total Peak",
      "Unique Viewers",
      "Repeating Viewers",
      "First-Time Visitors",
      "Avg Watch Mins",
      "Chat Messages",
      "Prayer Requests",
      "Salvations",
    ];
    const rows = serviceHistory.map((s) => [
      s.date,
      `"${(s.title || "").replace(/"/g, '""')}"`,
      s.peakYT,
      s.peakIG,
      s.totalPeak,
      s.uniqueViewers,
      s.repeatingViewers,
      s.firstTimeVisitors,
      s.avgWatchMinutes,
      s.chatMessages,
      s.prayerRequests,
      s.salvations,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `online-church-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Analytics CSV exported!");
  };

  const handleGenerateAiReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceTitle: currentSnapshot.title,
          attendanceYT: currentSnapshot.peakYT,
          attendanceIG: currentSnapshot.peakIG,
          prayerRequests: prayers.map((p) => ({
            name: p.requesterName,
            text: p.requestText,
          })),
          visitors: visitors.map((v) => ({
            name: v.name,
            location: v.location,
          })),
          messagesBroadcasted: currentSnapshot.chatMessages,
          sessionId: service?.id || "default_session",
        }),
      });

      const data = await res.json();
      if (data.report) {
        setAiReport(data.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

  // SVG Chart 1 Dimensions & Scaling (Multi-Week Attendance + Repeating Line)
  const maxChartY = Math.max(
    targetAttendance + 20,
    ...serviceHistory.map((s) => s.totalPeak + 20),
    220
  );

  // Donut Chart Calculations for Audience Loyalty
  const totalDonut = Math.max(
    1,
    audienceStats.coreRegulars +
      audienceStats.returningSecondTime +
      audienceStats.firstTimers
  );
  const corePct = Math.round((audienceStats.coreRegulars / totalDonut) * 100);
  const returningPct = Math.round(
    (audienceStats.returningSecondTime / totalDonut) * 100
  );
  const firstTimePct = Math.max(0, 100 - corePct - returningPct);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400/40 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Top Executive Header & Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/35 to-slate-900 border border-slate-800 rounded-2xl p-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wide">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Executive Online Church Intelligence & Audience Retention</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              {currentSnapshot.title}
            </h1>
            <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Service Date: {currentSnapshot.date}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                {audienceStats.repeatingPct}% Repeating Congregation
              </span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">
                Phase 1 Target: {currentSnapshot.totalPeak} / {targetAttendance} Peak Viewers
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Service Selector Dropdown */}
            {serviceHistory.length > 0 && (
              <select
                value={selectedServiceIdx}
                onChange={(e) => setSelectedServiceIdx(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2"
              >
                {serviceHistory.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {s.label} — {s.title} ({s.totalPeak} Peak)
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowLogServiceModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Service Data</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleGenerateAiReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Pastoral Briefing</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 8 Executive KPI Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* 1. Peak Concurrent */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>PEAK LIVE</span>
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.totalPeak}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-1">
              {wowGrowthPct >= 0 ? `+${wowGrowthPct}%` : `${wowGrowthPct}%`} vs last wk
            </div>
          </div>

          {/* 2. Repeating Audience */}
          <div className="bg-slate-900/85 border border-emerald-500/30 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
              <span>REPEATING</span>
              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.repeatingViewers}{" "}
              <span className="text-xs font-bold text-emerald-400">
                ({audienceStats.repeatingPct}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {audienceStats.coreRegulars} Core Regulars (3+)
            </div>
          </div>

          {/* 3. Total Unique Reach */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>UNIQUE REACH</span>
              <Eye className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.uniqueViewers}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              YT: {currentSnapshot.peakYT} • IG: {currentSnapshot.peakIG} peak
            </div>
          </div>

          {/* 4. Avg Watch Time */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>WATCH TIME</span>
              <Clock className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.avgWatchMinutes}m
            </div>
            <div className="text-[10px] text-violet-300 mt-1">
              {Math.round((currentSnapshot.avgWatchMinutes / 75) * 100)}% of 75m service
            </div>
          </div>

          {/* 5. First-Time Visitors */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>NEW VISITORS</span>
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.firstTimeVisitors}
            </div>
            <div className="text-[10px] text-amber-300 mt-1">
              First-time check-ins
            </div>
          </div>

          {/* 6. Salvations & Decisions */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>SALVATIONS</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.salvations || 6}
            </div>
            <div className="text-[10px] text-rose-300 mt-1">
              Altar call responses
            </div>
          </div>

          {/* 7. Prayer Requests */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>PRAYERS</span>
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.prayerRequests}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {prayers.length} in triage queue
            </div>
          </div>

          {/* 8. Prophetic Cues & Chat */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>CUES & CHAT</span>
              <Send className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1.5">
              {currentSnapshot.cuesReleased}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {currentSnapshot.chatMessages} chat interactions
            </div>
          </div>
        </div>

        {/* ROW 1 OF GRAPHS: Multi-Week Attendance & Repeating Trend + Live 75m Retention Curve */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* GRAPH 1: Multi-Week Attendance, Repeating Audience & Target Goal Chart (7 cols) */}
          <div className="xl:col-span-7 bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Multi-Service Attendance & Repeating Audience Growth</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any Sunday bar to inspect that service. Compares YouTube + Instagram Peak vs Repeating Viewers & Target Goal.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    YouTube Peak
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-pink-500" />
                    Instagram Peak
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Repeating Viewers
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400" />
                    Target ({targetAttendance})
                  </span>
                </div>
              </div>

              {/* SVG Combo Bar + Line Chart */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 700 260"
                  className="w-full h-64 select-none overflow-visible"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 215 - ratio * 180;
                    const val = Math.round(ratio * maxChartY);
                    return (
                      <g key={idx}>
                        <line
                          x1={42}
                          y1={y}
                          x2={680}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={36}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-500 text-[10px]"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target Attendance Dashed Goal Line */}
                  {(() => {
                    const targetY =
                      215 -
                      Math.min(1, targetAttendance / maxChartY) * 180;
                    return (
                      <g>
                        <line
                          x1={42}
                          y1={targetY}
                          x2={680}
                          y2={targetY}
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                        />
                        <rect
                          x={590}
                          y={targetY - 16}
                          width={88}
                          height={15}
                          rx={4}
                          fill="#451a03"
                          stroke="#f59e0b"
                          strokeWidth="0.8"
                        />
                        <text
                          x={634}
                          y={targetY - 6}
                          textAnchor="middle"
                          className="fill-amber-300 text-[9px] font-bold"
                        >
                          Goal: {targetAttendance} Live
                        </text>
                      </g>
                    );
                  })()}

                  {/* Stacked Bars (YT + IG) & Repeating Viewers Line */}
                  {serviceHistory.map((item, idx) => {
                    const count = serviceHistory.length;
                    const slotWidth = 620 / Math.max(1, count);
                    const centerX = 55 + idx * slotWidth + slotWidth / 2;
                    const barW = Math.min(36, slotWidth * 0.55);

                    const ytH = (item.peakYT / maxChartY) * 180;
                    const igH = (item.peakIG / maxChartY) * 180;
                    const totalH = ytH + igH;

                    const ytY = 215 - ytH;
                    const igY = ytY - igH;

                    const isSelected =
                      idx === selectedServiceIdx ||
                      (selectedServiceIdx === -1 && idx === count - 1);

                    return (
                      <g
                        key={item.id}
                        onClick={() => setSelectedServiceIdx(idx)}
                        className="cursor-pointer group"
                      >
                        {/* Selection highlight backdrop */}
                        {isSelected && (
                          <rect
                            x={centerX - barW / 2 - 6}
                            y={25}
                            width={barW + 12}
                            height={194}
                            rx={6}
                            fill="#312e81"
                            fillOpacity="0.25"
                          />
                        )}

                        {/* YouTube Lower Bar */}
                        <rect
                          x={centerX - barW / 2}
                          y={ytY}
                          width={barW}
                          height={Math.max(2, ytH)}
                          rx={2}
                          fill={isSelected ? "#6366f1" : "#4f46e5"}
                        />

                        {/* Instagram Upper Stacked Bar */}
                        <rect
                          x={centerX - barW / 2}
                          y={igY}
                          width={barW}
                          height={Math.max(2, igH)}
                          rx={2}
                          fill={isSelected ? "#ec4899" : "#db2777"}
                        />

                        {/* Total Peak Label Above Bar */}
                        <text
                          x={centerX}
                          y={215 - totalH - 6}
                          textAnchor="middle"
                          className={`text-[10px] font-bold ${
                            isSelected ? "fill-white" : "fill-slate-400"
                          }`}
                        >
                          {item.totalPeak}
                        </text>

                        {/* Date Label on X Axis */}
                        <text
                          x={centerX}
                          y={233}
                          textAnchor="middle"
                          className={`text-[10px] font-medium ${
                            isSelected
                              ? "fill-indigo-300 font-bold"
                              : "fill-slate-400"
                          }`}
                        >
                          {item.label}
                        </text>

                        {/* Repeating % sub-label */}
                        <text
                          x={centerX}
                          y={246}
                          textAnchor="middle"
                          className="fill-emerald-400 text-[9px] font-semibold"
                        >
                          {item.repeatingViewers} rep
                        </text>
                      </g>
                    );
                  })}

                  {/* Repeating Audience Line Polyline */}
                  {serviceHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={serviceHistory
                        .map((item, idx) => {
                          const slotWidth =
                            620 / Math.max(1, serviceHistory.length);
                          const centerX =
                            55 + idx * slotWidth + slotWidth / 2;
                          const repY =
                            215 - (item.repeatingViewers / maxChartY) * 180;
                          return `${centerX},${repY}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Repeating Audience Dots */}
                  {serviceHistory.map((item, idx) => {
                    const slotWidth =
                      620 / Math.max(1, serviceHistory.length);
                    const centerX = 55 + idx * slotWidth + slotWidth / 2;
                    const repY =
                      215 - (item.repeatingViewers / maxChartY) * 180;
                    return (
                      <circle
                        key={`dot-${item.id}`}
                        cx={centerX}
                        cy={repY}
                        r={4}
                        fill="#10b981"
                        stroke="#022c22"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <span>
                Repeating Congregation grew from{" "}
                <strong className="text-emerald-300">
                  {serviceHistory[0]?.repeatingViewers || 38}
                </strong>{" "}
                to{" "}
                <strong className="text-emerald-300">
                  {currentSnapshot.repeatingViewers} returning viewers
                </strong>
              </span>
              <span className="text-indigo-300 font-semibold">
                {Math.max(0, targetAttendance - currentSnapshot.totalPeak)} more viewers needed for Phase 1 Goal
              </span>
            </div>
          </div>

          {/* GRAPH 2: 75-Minute Live Service Retention & Prophetic Engagement Curve (5 cols) */}
          <div className="xl:col-span-5 bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>75-Min Service Retention & Prophetic Peak Curve</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tracks where viewers join, peak during Sermon Cues, and stay through Altar Call
                  </p>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 500 245"
                  className="w-full h-60 select-none overflow-visible"
                >
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((val, i) => {
                    const y = 195 - (val / 100) * 155;
                    return (
                      <g key={i}>
                        <line
                          x1={35}
                          y1={y}
                          x2={480}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={30}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-500 text-[9px]"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Repeating Audience Loyalty Area */}
                  {retentionCurve.length > 1 && (
                    <>
                      <polygon
                        fill="#10b981"
                        fillOpacity="0.12"
                        points={[
                          `45,195`,
                          ...retentionCurve.map((pt, i) => {
                            const x =
                              45 +
                              (i / (retentionCurve.length - 1)) * 425;
                            const y =
                              195 - (pt.repeatingActive / 100) * 155;
                            return `${x},${y}`;
                          }),
                          `470,195`,
                        ].join(" ")}
                      />
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points={retentionCurve
                          .map((pt, i) => {
                            const x =
                              45 +
                              (i / (retentionCurve.length - 1)) * 425;
                            const y =
                              195 - (pt.repeatingActive / 100) * 155;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </>
                  )}

                  {/* Chat Engagement Velocity Line */}
                  {retentionCurve.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      points={retentionCurve
                        .map((pt, i) => {
                          const x =
                            45 + (i / (retentionCurve.length - 1)) * 425;
                          const y = 195 - (pt.chatRate / 100) * 155;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Points & X-axis labels */}
                  {retentionCurve.map((pt, i) => {
                    const x =
                      45 +
                      (i / Math.max(1, retentionCurve.length - 1)) * 425;
                    const repY = 195 - (pt.repeatingActive / 100) * 155;
                    const chatY = 195 - (pt.chatRate / 100) * 155;

                    return (
                      <g key={pt.minute}>
                        <circle
                          cx={x}
                          cy={repY}
                          r={3.5}
                          fill="#10b981"
                        />
                        <circle
                          cx={x}
                          cy={chatY}
                          r={3}
                          fill="#818cf8"
                        />
                        <text
                          x={x}
                          y={repY - 7}
                          textAnchor="middle"
                          className="fill-emerald-300 text-[9px] font-bold"
                        >
                          {pt.repeatingActive}%
                        </text>
                        <text
                          x={x}
                          y={212}
                          textAnchor="middle"
                          className="fill-slate-300 text-[9px] font-bold"
                        >
                          {pt.minute}
                        </text>
                        <text
                          x={x}
                          y={224}
                          textAnchor="middle"
                          className="fill-slate-500 text-[8px]"
                        >
                          {pt.segment.split(" ")[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Green: Repeating Viewer Retention %</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span>Dashed: Live Chat Cue Velocity %</span>
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2 OF GRAPHS: Repeating Audience Loyalty Donut + YouTube vs Instagram Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* GRAPH 3: Audience Composition & Repeating Loyalty Donut (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <span>Congregation Loyalty & Repeating Viewer Breakdown</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Categorizes your online viewers by how many services they have attended
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-5">
                {/* SVG Donut Chart */}
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="18"
                    />
                    {/* Core Regulars Segment (Emerald) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="18"
                      strokeDasharray={`${(corePct / 100) * 351.8} 351.8`}
                      strokeDashoffset="0"
                      transform="rotate(-90 80 80)"
                    />
                    {/* Returning 2nd-Time Segment (Indigo) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="18"
                      strokeDasharray={`${(returningPct / 100) * 351.8} 351.8`}
                      strokeDashoffset={`-${(corePct / 100) * 351.8}`}
                      transform="rotate(-90 80 80)"
                    />
                    {/* First-Time Visitors Segment (Amber) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="18"
                      strokeDasharray={`${(firstTimePct / 100) * 351.8} 351.8`}
                      strokeDashoffset={`-${
                        ((corePct + returningPct) / 100) * 351.8
                      }`}
                      transform="rotate(-90 80 80)"
                    />
                    <text
                      x="80"
                      y="76"
                      textAnchor="middle"
                      className="fill-white text-xl font-extrabold"
                    >
                      {corePct + returningPct}%
                    </text>
                    <text
                      x="80"
                      y="94"
                      textAnchor="middle"
                      className="fill-emerald-400 text-[9px] font-bold uppercase"
                    >
                      Repeating Flock
                    </text>
                  </svg>
                </div>

                {/* Breakdown Legend Cards */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          Core Regulars (3+ Visits)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Loyal weekly pillars
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {audienceStats.coreRegulars} ({corePct}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          2nd-Time Returning
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Came back after 1st visit
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-indigo-400">
                      {audienceStats.returningSecondTime} ({returningPct}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          First-Time Visitors
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Needs 24h follow-up care
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-amber-400">
                      {audienceStats.firstTimers} ({firstTimePct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Dual-Platform Watchers (YT + IG):{" "}
                <strong className="text-white">
                  {audienceStats.dualPlatform} members
                </strong>
              </span>
              <span className="text-emerald-300 font-semibold">
                {audienceStats.totalTracked} Named Profiles Tracked
              </span>
            </div>
          </div>

          {/* GRAPH 4: YouTube Live vs Instagram Live Head-to-Head Comparison (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-pink-400" />
                    <span>Platform Performance: YouTube Live vs Instagram Live</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Side-by-side platform behavior comparison to guide camera framing (16:9 vs 9:16) & moderator focus
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 mt-2">
                {[
                  {
                    metric: "Peak Concurrent Viewers",
                    ytVal: currentSnapshot.peakYT,
                    igVal: currentSnapshot.peakIG,
                    unit: "viewers",
                  },
                  {
                    metric: "Repeating Congregation Members",
                    ytVal: Math.round(currentSnapshot.repeatingViewers * 0.64),
                    igVal: Math.round(currentSnapshot.repeatingViewers * 0.36),
                    unit: "regulars",
                  },
                  {
                    metric: "Average Watch Duration",
                    ytVal: currentSnapshot.avgWatchMinutes + 6,
                    igVal: Math.max(12, currentSnapshot.avgWatchMinutes - 8),
                    unit: "mins",
                  },
                  {
                    metric: "Live Chat & Prophetic Cue Engagement",
                    ytVal: Math.round(currentSnapshot.chatMessages * 0.58),
                    igVal: Math.round(currentSnapshot.chatMessages * 0.42),
                    unit: "msgs",
                  },
                ].map((row, idx) => {
                  const total = Math.max(1, row.ytVal + row.igVal);
                  const ytPct = Math.round((row.ytVal / total) * 100);
                  const igPct = 100 - ytPct;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-400 font-bold">
                          YouTube: {row.ytVal} {row.unit} ({ytPct}%)
                        </span>
                        <span className="text-slate-300 font-semibold">
                          {row.metric}
                        </span>
                        <span className="text-pink-400 font-bold">
                          Instagram: {row.igVal} {row.unit} ({igPct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-indigo-500 transition-all duration-500"
                          style={{ width: `${ytPct}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500"
                          style={{ width: `${igPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-slate-300">
                <strong className="text-red-400">YouTube Live Insight:</strong>{" "}
                Higher watch duration ({currentSnapshot.avgWatchMinutes + 6}m avg) on Smart TVs & laptops; clickable sermon & giving links convert best here.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-slate-300">
                <strong className="text-pink-400">Instagram Live Insight:</strong>{" "}
                Fastest discovery for first-time visitors; use 9:16 vertical camera crop & prompt viewers to DM keywords.
              </div>
            </div>
          </div>
        </div>

        {/* REPEATING AUDIENCE & CONGREGATION CRM ROSTER TABLE */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>
                  Repeating Audience & Online Congregation Attendance Roster
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tracks every individual viewer across services so you can count repeating regulars vs first-time visitors. Click{" "}
                <strong className="text-emerald-300">+1 Visit</strong> when they check in on Sunday!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, @handle, city..."
                  value={audienceSearch}
                  onChange={(e) => setAudienceSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => setShowAddViewerModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Check-In / Add Viewer</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All Tracked (${audienceRoster.length})` },
              {
                id: "CORE",
                label: `Core Regulars 3+ Visits (${audienceStats.coreRegulars})`,
              },
              {
                id: "RETURNING",
                label: `2nd-Time Returning (${audienceStats.returningSecondTime})`,
              },
              {
                id: "FIRST_TIME",
                label: `First-Time Visitors (${audienceStats.firstTimers})`,
              },
              { id: "YOUTUBE", label: "YouTube Viewers" },
              { id: "INSTAGRAM", label: "Instagram Viewers" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setAudienceFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  audienceFilter === pill.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Audience Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Viewer / Handle</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Loyalty Tier</th>
                  <th className="py-2.5 px-3">Services Attended</th>
                  <th className="py-2.5 px-3">Last Seen</th>
                  <th className="py-2.5 px-3 text-right">Quick Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAudience.map((member) => {
                  const isCore = member.servicesAttended >= 3;
                  const isReturning = member.servicesAttended === 2;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{member.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {member.handle}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            member.platform === "YOUTUBE"
                              ? "bg-red-500/15 text-red-300 border border-red-500/30"
                              : member.platform === "INSTAGRAM"
                              ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                              : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {member.platform}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {member.location}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCore
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isReturning
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {isCore
                            ? "★ Core Regular"
                            : isReturning
                            ? "↻ Returning (2x)"
                            : "✦ First-Time"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">
                            {member.servicesAttended}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            services
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {member.lastSeen}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() =>
                            handleIncrementVisit(member.id, member.name)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+1 Visit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Pastoral Summary Card (If generated) */}
        {aiReport && (
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-800/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                AI Executive Pastoral Briefing (Gemini 3.8 Flash)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-indigo-300 text-xs uppercase tracking-wider mb-2">
                  Executive Service Overview
                </h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-line text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  {aiReport.summary}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-emerald-300 text-xs uppercase tracking-wider mb-2">
                  Pastoral Action Items & Follow-ups
                </h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-line text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  {aiReport.actionItems}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Details Grid: Live Visitors & Prayer Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First-Time Visitors Log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" /> First-Time Online
                Visitors Logged
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {visitors.length} logged in live session
              </span>
            </h3>

            {visitors.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No new visitors logged in the live broadcast widget yet. Use "+ Check-In / Add Viewer" above or log from Broadcast tab.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {visitors.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{v.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {v.location || "Online"} • Via {v.platform}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {new Date(v.connectedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prayer Requests Log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-400" /> Prayer
                Requests Logged
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {prayers.length} total
              </span>
            </h3>

            {prayers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No prayer requests logged for this session yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {prayers.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-white mb-1">
                      <span>{p.requesterName}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      "{p.requestText}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal 1: Log Service Snapshot */}
      {showLogServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Log Service Attendance & Repeating Metrics
                </h3>
              </div>
              <button
                onClick={() => setShowLogServiceModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogService} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={newSrv.date}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, date: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Sermon / Service Title
                  </label>
                  <input
                    type="text"
                    value={newSrv.title}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, title: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-red-400 mb-1 font-medium">
                    YouTube Peak
                  </label>
                  <input
                    type="number"
                    value={newSrv.peakYT}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, peakYT: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pink-400 mb-1 font-medium">
                    Instagram Peak
                  </label>
                  <input
                    type="number"
                    value={newSrv.peakIG}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, peakIG: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 mb-1 font-medium">
                    Repeating Viewers
                  </label>
                  <input
                    type="number"
                    value={newSrv.repeatingViewers}
                    onChange={(e) =>
                      setNewSrv({
                        ...newSrv,
                        repeatingViewers: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 mb-1 font-medium">
                    First-Time Visitors
                  </label>
                  <input
                    type="number"
                    value={newSrv.firstTimeVisitors}
                    onChange={(e) =>
                      setNewSrv({
                        ...newSrv,
                        firstTimeVisitors: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Avg Watch (Mins)
                  </label>
                  <input
                    type="number"
                    value={newSrv.avgWatchMinutes}
                    onChange={(e) =>
                      setNewSrv({
                        ...newSrv,
                        avgWatchMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-rose-400 mb-1 font-medium">
                    Salvations / Altar
                  </label>
                  <input
                    type="number"
                    value={newSrv.salvations}
                    onChange={(e) =>
                      setNewSrv({
                        ...newSrv,
                        salvations: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogServiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Graphs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Check-In / Add Viewer to Repeating Roster */}
      {showAddViewerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Check-In Viewer to Repeating Audience Roster
                </h3>
              </div>
              <button
                onClick={() => setShowAddViewerModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddViewer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Viewer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Brother Jonathan Lim"
                  value={newViewer.name}
                  onChange={(e) =>
                    setNewViewer({ ...newViewer, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Chat Handle (@)
                  </label>
                  <input
                    type="text"
                    placeholder="@jonathan_lim"
                    value={newViewer.handle}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, handle: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Platform
                  </label>
                  <select
                    value={newViewer.platform}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, platform: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="YOUTUBE">YouTube Live</option>
                    <option value="INSTAGRAM">Instagram Live</option>
                    <option value="BOTH">Both (YT + IG)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    City / Country
                  </label>
                  <input
                    type="text"
                    value={newViewer.location}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, location: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Services Attended Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newViewer.servicesAttended}
                    onChange={(e) =>
                      setNewViewer({
                        ...newViewer,
                        servicesAttended: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddViewerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

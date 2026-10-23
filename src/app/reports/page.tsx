"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const YouTubeStudioAnalyticsPanel = dynamic(
  () => import("@/components/YouTubeStudioAnalyticsPanel"),
  {
    loading: () => (
      <div className="rounded-2xl p-6 bg-[#121215] border border-white/[0.08] text-xs text-zinc-400">
        Loading YouTube Studio &amp; IG Live Monthly Analytics...
      </div>
    ),
  }
);

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
    setTimeout(() => setToastMsg(null), 2800);
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

        const [s, p, v, b, a] = await Promise.all([
          servRes.json(),
          prayRes.json(),
          visRes.json(),
          bcRes.json(),
          anaRes.json(),
        ]);

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
  }, [
    serviceHistory,
    selectedServiceIdx,
    service,
    visitors,
    broadcasts,
    prayers,
  ]);

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
    triggerToast(`Checked in ${name} (+1 repeating visit)`);

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

    const optimisticMember = {
      id: `aud-${Date.now()}`,
      name: newViewer.name.trim(),
      handle:
        newViewer.handle.trim() ||
        `@${newViewer.name.trim().toLowerCase().replace(/\s+/g, "_")}`,
      platform: newViewer.platform,
      location: newViewer.location || "Online",
      servicesAttended: newViewer.servicesAttended,
      lastSeen: new Date().toISOString().slice(0, 10),
    };
    setAudienceRoster((prev) => [optimisticMember, ...prev]);
    setShowAddViewerModal(false);
    triggerToast("Viewer added to Repeating Audience Roster");

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
  };

  const handleLogService = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowLogServiceModal(false);
    triggerToast("Service telemetry snapshot logged");

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
    triggerToast("Analytics CSV exported");
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

  const maxChartY = Math.max(
    targetAttendance + 20,
    ...serviceHistory.map((s) => s.totalPeak + 20),
    220
  );

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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar />

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight flex items-center gap-2 border border-black/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Top Executive Header & Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Broadcast Telemetry · Audience &amp; Retention Intelligence
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold tabular-nums">
                {audienceStats.repeatingPct}% Repeating Congregation
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em]">
              {currentSnapshot.title}
            </h1>

            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3 tabular-nums">
              <span>Service Date: {currentSnapshot.date}</span>
              <span>·</span>
              <span>
                Phase 1 Target: {currentSnapshot.totalPeak} / {targetAttendance}{" "}
                Peak Viewers
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {serviceHistory.length > 0 && (
              <select
                value={selectedServiceIdx}
                onChange={(e) => setSelectedServiceIdx(Number(e.target.value))}
                aria-label="Select Service Snapshot"
                className="bg-[#121215] border border-white/[0.1] text-zinc-200 text-xs font-medium rounded-full px-3.5 py-2 focus:outline-none"
              >
                {serviceHistory.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {s.label} · {s.title} ({s.totalPeak} Peak)
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowLogServiceModal(true)}
              className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            >
              + Log Service
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            >
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            >
              Print Report
            </button>

            <button
              type="button"
              onClick={handleGenerateAiReport}
              disabled={generatingReport}
              className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition disabled:opacity-40"
            >
              {generatingReport ? "Synthesizing..." : "Executive Briefing"}
            </button>
          </div>
        </div>

        {/* YouTube Studio Data API v3 + OAuth2 Monthly Comparison Panel */}
        <YouTubeStudioAnalyticsPanel onTriggerToast={triggerToast} />

        {/* 8 Executive KPI Bento Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            {
              label: "Peak Live",
              val: currentSnapshot.totalPeak,
              sub: `${wowGrowthPct >= 0 ? `+${wowGrowthPct}%` : `${wowGrowthPct}%`} vs last wk`,
              dot: "bg-sky-400",
              subColor: "text-emerald-400",
            },
            {
              label: "Repeating",
              val: `${currentSnapshot.repeatingViewers} (${audienceStats.repeatingPct}%)`,
              sub: `${audienceStats.coreRegulars} Core Regulars`,
              dot: "bg-emerald-400",
              subColor: "text-zinc-400",
            },
            {
              label: "Unique Reach",
              val: currentSnapshot.uniqueViewers,
              sub: `YT ${currentSnapshot.peakYT} · IG ${currentSnapshot.peakIG}`,
              dot: "bg-zinc-300",
              subColor: "text-zinc-400",
            },
            {
              label: "Watch Time",
              val: `${currentSnapshot.avgWatchMinutes}m`,
              sub: `${Math.round((currentSnapshot.avgWatchMinutes / 75) * 100)}% of 75m`,
              dot: "bg-violet-400",
              subColor: "text-violet-300",
            },
            {
              label: "New Visitors",
              val: currentSnapshot.firstTimeVisitors,
              sub: "First-time check-ins",
              dot: "bg-amber-400",
              subColor: "text-amber-300",
            },
            {
              label: "Salvations",
              val: currentSnapshot.salvations || 6,
              sub: "Altar call responses",
              dot: "bg-rose-400",
              subColor: "text-rose-300",
            },
            {
              label: "Prayers",
              val: currentSnapshot.prayerRequests,
              sub: `${prayers.length} in triage queue`,
              dot: "bg-emerald-400",
              subColor: "text-zinc-400",
            },
            {
              label: "Cues & Chat",
              val: currentSnapshot.cuesReleased,
              sub: `${currentSnapshot.chatMessages} interactions`,
              dot: "bg-sky-400",
              subColor: "text-zinc-400",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-[#121215] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                <span>{kpi.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
              </div>
              <div className="text-xl font-semibold text-white tabular-nums tracking-tight mt-2">
                {kpi.val}
              </div>
              <div className={`text-[10px] mt-1 tabular-nums ${kpi.subColor}`}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ROW 1 OF GRAPHS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* GRAPH 1: Multi-Week Attendance & Repeating Line (7 cols) */}
          <div className="xl:col-span-7 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Multi-Week Trend
                  </span>
                  <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                    Service Attendance &amp; Repeating Audience Trajectory
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    YouTube
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    Instagram
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Repeating
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                    <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
                    Target ({targetAttendance})
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 700 260"
                  className="w-full h-64 select-none overflow-visible"
                >
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
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={36}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-zinc-500 text-[10px]"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {(() => {
                    const targetY =
                      215 - Math.min(1, targetAttendance / maxChartY) * 180;
                    return (
                      <g>
                        <line
                          x1={42}
                          y1={targetY}
                          x2={680}
                          y2={targetY}
                          stroke="#fbbf24"
                          strokeWidth="1.2"
                          strokeDasharray="6 4"
                        />
                        <rect
                          x={590}
                          y={targetY - 16}
                          width={88}
                          height={15}
                          rx={4}
                          fill="#18181b"
                          stroke="#f59e0b"
                          strokeWidth="0.8"
                        />
                        <text
                          x={634}
                          y={targetY - 6}
                          textAnchor="middle"
                          className="fill-amber-300 text-[9px] font-semibold"
                        >
                          Goal: {targetAttendance} Live
                        </text>
                      </g>
                    );
                  })()}

                  {serviceHistory.map((item, idx) => {
                    const count = serviceHistory.length;
                    const slotWidth = 620 / Math.max(1, count);
                    const centerX = 55 + idx * slotWidth + slotWidth / 2;
                    const barW = Math.min(34, slotWidth * 0.52);

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
                        {isSelected && (
                          <rect
                            x={centerX - barW / 2 - 6}
                            y={25}
                            width={barW + 12}
                            height={194}
                            rx={8}
                            fill="rgba(255,255,255,0.04)"
                          />
                        )}

                        <rect
                          x={centerX - barW / 2}
                          y={ytY}
                          width={barW}
                          height={Math.max(2, ytH)}
                          rx={3}
                          fill={isSelected ? "#38bdf8" : "#0284c7"}
                        />

                        <rect
                          x={centerX - barW / 2}
                          y={igY}
                          width={barW}
                          height={Math.max(2, igH)}
                          rx={3}
                          fill={isSelected ? "#f472b6" : "#db2777"}
                        />

                        <text
                          x={centerX}
                          y={215 - totalH - 6}
                          textAnchor="middle"
                          className={`text-[10px] font-semibold ${
                            isSelected ? "fill-white" : "fill-zinc-400"
                          }`}
                        >
                          {item.totalPeak}
                        </text>

                        <text
                          x={centerX}
                          y={233}
                          textAnchor="middle"
                          className={`text-[10px] ${
                            isSelected
                              ? "fill-white font-semibold"
                              : "fill-zinc-500"
                          }`}
                        >
                          {item.label}
                        </text>

                        <text
                          x={centerX}
                          y={246}
                          textAnchor="middle"
                          className="fill-emerald-400 text-[9px] font-medium"
                        >
                          {item.repeatingViewers} rep
                        </text>
                      </g>
                    );
                  })}

                  {serviceHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.2"
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
                        r={3.5}
                        fill="#34d399"
                        stroke="#09090b"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs text-zinc-400 tabular-nums">
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
              <span className="text-zinc-300 font-medium">
                {Math.max(0, targetAttendance - currentSnapshot.totalPeak)} to
                Phase 1 Target
              </span>
            </div>
          </div>

          {/* GRAPH 2: 75-Min Retention Curve (5 cols) */}
          <div className="xl:col-span-5 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="border-b border-white/[0.08] pb-4 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  In-Service Telemetry
                </span>
                <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  75-Minute Service Retention &amp; Cue Velocity
                </h2>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 500 245"
                  className="w-full h-60 select-none overflow-visible"
                >
                  {[0, 25, 50, 75, 100].map((val, i) => {
                    const y = 195 - (val / 100) * 155;
                    return (
                      <g key={i}>
                        <line
                          x1={35}
                          y1={y}
                          x2={480}
                          y2={y}
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={30}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-zinc-500 text-[9px]"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {retentionCurve.length > 1 && (
                    <>
                      <polygon
                        fill="#34d399"
                        fillOpacity="0.1"
                        points={[
                          `45,195`,
                          ...retentionCurve.map((pt, i) => {
                            const x =
                              45 + (i / (retentionCurve.length - 1)) * 425;
                            const y = 195 - (pt.repeatingActive / 100) * 155;
                            return `${x},${y}`;
                          }),
                          `470,195`,
                        ].join(" ")}
                      />
                      <polyline
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.2"
                        points={retentionCurve
                          .map((pt, i) => {
                            const x =
                              45 + (i / (retentionCurve.length - 1)) * 425;
                            const y = 195 - (pt.repeatingActive / 100) * 155;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </>
                  )}

                  {retentionCurve.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
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

                  {retentionCurve.map((pt, i) => {
                    const x =
                      45 +
                      (i / Math.max(1, retentionCurve.length - 1)) * 425;
                    const repY = 195 - (pt.repeatingActive / 100) * 155;
                    const chatY = 195 - (pt.chatRate / 100) * 155;

                    return (
                      <g key={pt.minute}>
                        <circle cx={x} cy={repY} r={3} fill="#34d399" />
                        <circle cx={x} cy={chatY} r={2.5} fill="#38bdf8" />
                        <text
                          x={x}
                          y={repY - 7}
                          textAnchor="middle"
                          className="fill-emerald-300 text-[9px] font-semibold"
                        >
                          {pt.repeatingActive}%
                        </text>
                        <text
                          x={x}
                          y={212}
                          textAnchor="middle"
                          className="fill-zinc-300 text-[9px] font-medium"
                        >
                          {pt.minute}
                        </text>
                        <text
                          x={x}
                          y={224}
                          textAnchor="middle"
                          className="fill-zinc-500 text-[8px]"
                        >
                          {pt.segment.split(" ")[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Repeating Viewer Retention %</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Live Chat Cue Velocity %</span>
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2 OF GRAPHS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* GRAPH 3: Audience Composition Donut (5 cols) */}
          <div className="lg:col-span-5 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="border-b border-white/[0.08] pb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Cohort Breakdown
                </span>
                <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Congregation Loyalty &amp; Repeating Ratio
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-5">
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="16"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="16"
                      strokeDasharray={`${(corePct / 100) * 351.8} 351.8`}
                      strokeDashoffset="0"
                      transform="rotate(-90 80 80)"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="16"
                      strokeDasharray={`${(returningPct / 100) * 351.8} 351.8`}
                      strokeDashoffset={`-${(corePct / 100) * 351.8}`}
                      transform="rotate(-90 80 80)"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="16"
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
                      className="fill-white text-xl font-semibold"
                    >
                      {corePct + returningPct}%
                    </text>
                    <text
                      x="80"
                      y="94"
                      textAnchor="middle"
                      className="fill-emerald-400 text-[9px] font-semibold uppercase tracking-wider"
                    >
                      Repeating
                    </text>
                  </svg>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#09090b] border border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">
                          Core Regulars (3+)
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Weekly congregation
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                      {audienceStats.coreRegulars} ({corePct}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#09090b] border border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">
                          2nd-Time Returning
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Returned after 1st visit
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-sky-300 tabular-nums">
                      {audienceStats.returningSecondTime} ({returningPct}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#09090b] border border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">
                          First-Time Visitors
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          24h follow-up care
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-300 tabular-nums">
                      {audienceStats.firstTimers} ({firstTimePct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 tabular-nums">
              <span>
                Dual-Platform Viewers:{" "}
                <strong className="text-white">
                  {audienceStats.dualPlatform}
                </strong>
              </span>
              <span className="text-zinc-300 font-medium">
                {audienceStats.totalTracked} Profiles Tracked
              </span>
            </div>
          </div>

          {/* GRAPH 4: YouTube vs Instagram Comparison (7 cols) */}
          <div className="lg:col-span-7 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="border-b border-white/[0.08] pb-4 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Stream Distribution
                </span>
                <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  YouTube Live (16:9) vs Instagram Live (9:16)
                </h2>
              </div>

              <div className="space-y-4">
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
                    metric: "Live Chat & Cue Engagement",
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
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-sky-300 font-medium">
                          YouTube: {row.ytVal} {row.unit} ({ytPct}%)
                        </span>
                        <span className="text-zinc-300 font-semibold">
                          {row.metric}
                        </span>
                        <span className="text-pink-300 font-medium">
                          Instagram: {row.igVal} {row.unit} ({igPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#09090b] rounded-full overflow-hidden flex border border-white/[0.06]">
                        <div
                          className="h-full bg-sky-400 transition-all duration-300"
                          style={{ width: `${ytPct}%` }}
                        />
                        <div
                          className="h-full bg-pink-400 transition-all duration-300"
                          style={{ width: `${igPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-[#09090b] border border-white/[0.06] rounded-2xl p-3 text-zinc-400">
                <strong className="text-sky-300">YouTube 16:9:</strong> Higher
                retention ({currentSnapshot.avgWatchMinutes + 6}m avg) on TV and
                desktop displays.
              </div>
              <div className="bg-[#09090b] border border-white/[0.06] rounded-2xl p-3 text-zinc-400">
                <strong className="text-pink-300">Instagram 9:16:</strong>{" "}
                Primary discovery funnel for first-time viewers; maintain clean
                center vertical crop.
              </div>
            </div>
          </div>
        </div>

        {/* REPEATING AUDIENCE ROSTER TABLE */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                Attendance CRM
              </span>
              <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                Repeating Audience &amp; Congregation Check-In Roster
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                placeholder="Search name, @handle, or city..."
                value={audienceSearch}
                onChange={(e) => setAudienceSearch(e.target.value)}
                className="bg-[#09090b] border border-white/[0.1] rounded-full px-4 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
              />

              <button
                type="button"
                onClick={() => setShowAddViewerModal(true)}
                className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
              >
                + Check-In Viewer
              </button>
            </div>
          </div>

          {/* Apple Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-[#09090b] p-1.5 rounded-2xl border border-white/[0.08]">
            {[
              { id: "ALL", label: `All Tracked (${audienceRoster.length})` },
              {
                id: "CORE",
                label: `Core Regulars 3+ (${audienceStats.coreRegulars})`,
              },
              {
                id: "RETURNING",
                label: `2nd-Time (${audienceStats.returningSecondTime})`,
              },
              {
                id: "FIRST_TIME",
                label: `First-Time (${audienceStats.firstTimers})`,
              },
              { id: "YOUTUBE", label: "YouTube" },
              { id: "INSTAGRAM", label: "Instagram" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setAudienceFilter(pill.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                  audienceFilter === pill.id
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Viewer / Handle</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Cohort</th>
                  <th className="py-3 px-3">Services Attended</th>
                  <th className="py-3 px-3">Last Seen</th>
                  <th className="py-3 px-3 text-right">Quick Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredAudience.map((member) => {
                  const isCore = member.servicesAttended >= 3;
                  const isReturning = member.servicesAttended === 2;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-white/[0.02] transition"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {member.handle}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            member.platform === "YOUTUBE"
                              ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                              : member.platform === "INSTAGRAM"
                              ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                              : "bg-white/[0.08] text-zinc-200 border border-white/[0.12]"
                          }`}
                        >
                          {member.platform}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {member.location}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isCore
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : isReturning
                              ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {isCore
                            ? "Core Regular"
                            : isReturning
                            ? "Returning (2x)"
                            : "First-Time"}
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        <span className="text-sm font-semibold text-white">
                          {member.servicesAttended}
                        </span>{" "}
                        <span className="text-[11px] text-zinc-500">
                          services
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 tabular-nums">
                        {member.lastSeen}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleIncrementVisit(member.id, member.name)
                          }
                          className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white text-zinc-200 hover:text-black border border-white/[0.1] text-[11px] font-semibold transition"
                        >
                          +1 Visit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Pastoral Briefing (If generated) */}
        {aiReport && (
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl p-6 space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                Automated Post-Service Synthesis
              </span>
              <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                Executive Pastoral Briefing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-2">
                <h3 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Service Overview
                </h3>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line bg-[#09090b] p-4 rounded-2xl border border-white/[0.08]">
                  {aiReport.summary}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Pastoral Action Items &amp; Follow-Ups
                </h3>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line bg-[#09090b] p-4 rounded-2xl border border-white/[0.08]">
                  {aiReport.actionItems}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Log Service Snapshot */}
      {showLogServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  Telemetry Entry
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Log Service Attendance &amp; Repeating Metrics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogServiceModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleLogService} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={newSrv.date}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, date: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Service Title
                  </label>
                  <input
                    type="text"
                    value={newSrv.title}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, title: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sky-300 mb-1 font-medium">
                    YouTube Peak
                  </label>
                  <input
                    type="number"
                    value={newSrv.peakYT}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, peakYT: Number(e.target.value) })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-pink-300 mb-1 font-medium">
                    Instagram Peak
                  </label>
                  <input
                    type="number"
                    value={newSrv.peakIG}
                    onChange={(e) =>
                      setNewSrv({ ...newSrv, peakIG: Number(e.target.value) })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 mb-1 font-medium">
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
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 mb-1 font-medium">
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
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
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
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-rose-300 mb-1 font-medium">
                    Salvations
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
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowLogServiceModal(false)}
                  className="px-4 py-2 rounded-full text-zinc-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold transition"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Check-In Viewer */}
      {showAddViewerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  Roster Check-In
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Add Viewer to Repeating Roster
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddViewerModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddViewer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Lim"
                  value={newViewer.name}
                  onChange={(e) =>
                    setNewViewer({ ...newViewer, name: e.target.value })
                  }
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Handle (@)
                  </label>
                  <input
                    type="text"
                    placeholder="@jonathan_lim"
                    value={newViewer.handle}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, handle: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Platform
                  </label>
                  <select
                    value={newViewer.platform}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, platform: e.target.value })
                    }
                    aria-label="Platform"
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="YOUTUBE">YouTube Live</option>
                    <option value="INSTAGRAM">Instagram Live</option>
                    <option value="BOTH">Both Streams</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    City / Country
                  </label>
                  <input
                    type="text"
                    value={newViewer.location}
                    onChange={(e) =>
                      setNewViewer({ ...newViewer, location: e.target.value })
                    }
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Services Attended
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
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddViewerModal(false)}
                  className="px-4 py-2 rounded-full text-zinc-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold transition"
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

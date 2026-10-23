"use client";

import React, { useState, useEffect, useRef } from "react";
import type { YouTubeAnalyticsPayload } from "@/app/api/youtube-analytics/route";
import { getLocalChurchConfig, saveChurchConfig } from "@/lib/clientConfig";

interface Props {
  onTriggerToast?: (msg: string) => void;
}

export default function YouTubeStudioAnalyticsPanel({ onTriggerToast }: Props) {
  const [data, setData] = useState<YouTubeAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectDrawer, setShowConnectDrawer] = useState(false);
  const [connectModeTab, setConnectModeTab] = useState<"API_KEY" | "OAUTH2">(
    "API_KEY"
  );

  // Credentials state
  const [channelId, setChannelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [oauthAccessToken, setOauthAccessToken] = useState("");

  const csvInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  const loadAnalytics = async (forceRefresh = false) => {
    if (forceRefresh) setSyncing(true);
    else setLoading(true);

    try {
      const localCfg = getLocalChurchConfig();
      if (localCfg) {
        if (!channelId && localCfg.youtubeChannelId)
          setChannelId(localCfg.youtubeChannelId);
        if (!apiKey && localCfg.youtubeApiKey)
          setApiKey(localCfg.youtubeApiKey);
        if (!googleClientId && localCfg.googleClientId)
          setGoogleClientId(localCfg.googleClientId);
        if (!googleClientSecret && localCfg.googleClientSecret)
          setGoogleClientSecret(localCfg.googleClientSecret);
        if (!oauthAccessToken && localCfg.youtubeOAuthAccessToken)
          setOauthAccessToken(localCfg.youtubeOAuthAccessToken);
      }

      const params = new URLSearchParams();
      if (localCfg?.youtubeApiKey) params.set("apiKey", localCfg.youtubeApiKey);
      if (localCfg?.youtubeChannelId)
        params.set("channelId", localCfg.youtubeChannelId);
      if (localCfg?.youtubeOAuthAccessToken)
        params.set("oauthToken", localCfg.youtubeOAuthAccessToken);

      const res = await fetch(`/api/youtube-analytics?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const payload = (await res.json()) as YouTubeAnalyticsPayload;
        setData(payload);
        if (forceRefresh) {
          notify(
            payload.isLiveConnected
              ? `Synced live data for ${payload.channelInfo.title}`
              : "Refreshed YouTube & IG Live analytics"
          );
        }
      }
    } catch (e) {
      console.error("Failed to load YouTube analytics:", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("oauth") === "connected") {
        notify("Google OAuth2 connected to YouTube Analytics API");
      } else if (urlParams.get("oauth") === "error") {
        notify(
          `OAuth error: ${urlParams.get("reason") || "Authorization failed"}`
        );
      }
    }
  }, []);

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    try {
      await saveChurchConfig({
        youtubeChannelId: channelId.trim(),
        youtubeApiKey: apiKey.trim(),
        googleClientId: googleClientId.trim(),
        googleClientSecret: googleClientSecret.trim(),
        youtubeOAuthAccessToken: oauthAccessToken.trim(),
      });

      const res = await fetch("/api/youtube-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CREDENTIALS",
          youtubeChannelId: channelId.trim(),
          youtubeApiKey: apiKey.trim(),
          googleClientId: googleClientId.trim(),
          googleClientSecret: googleClientSecret.trim(),
          youtubeOAuthAccessToken: oauthAccessToken.trim(),
          clearCsvOverride: true,
        }),
      });

      const json = await res.json();
      if (json.payload) {
        setData(json.payload);
        if (json.payload.apiError) {
          notify(json.payload.apiError);
        } else {
          setShowConnectDrawer(false);
          notify(
            json.payload.isLiveConnected
              ? `Connected to ${json.payload.channelInfo.title}`
              : "Credentials saved"
          );
        }
      }
    } catch (err: any) {
      notify(err?.message || "Failed to connect YouTube API");
    } finally {
      setSyncing(false);
    }
  };

  const handleLaunchGoogleOAuth = async () => {
    try {
      await saveChurchConfig({
        googleClientId: googleClientId.trim(),
        googleClientSecret: googleClientSecret.trim(),
        youtubeChannelId: channelId.trim(),
      });

      const res = await fetch("/api/youtube-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GET_OAUTH_URL",
          googleClientId: googleClientId.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.authUrl) {
        notify(json.error || "Enter Google OAuth Client ID first");
        return;
      }
      window.location.href = json.authUrl;
    } catch (err: any) {
      notify(err?.message || "Could not launch Google OAuth");
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await fetch("/api/youtube-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "IMPORT_STUDIO_CSV",
          csvText: text,
        }),
      });
      const json = await res.json();
      if (res.ok && json.payload) {
        setData(json.payload);
        notify("Imported YouTube Studio CSV export");
      } else {
        notify(json.error || "Invalid CSV format");
      }
    } catch {
      notify("Failed to read CSV file");
    }
  };

  if (loading || !data) {
    return (
      <div className="rounded-2xl p-6 bg-[#121215] border border-white/[0.08] text-xs text-zinc-400">
        Loading YouTube Studio &amp; IG Live Monthly Comparison...
      </div>
    );
  }

  const { lastMonth, thisMonth, momDeltas, targetGoal, weeklyComparisonSeries } =
    data;

  const badgeStyle =
    data.connectionMode === "OAUTH_ANALYTICS_API"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : data.connectionMode === "DATA_API_V3"
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : data.connectionMode === "STUDIO_CSV"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-violet-500/15 text-violet-300 border-violet-500/30";

  const badgeText =
    data.connectionMode === "OAUTH_ANALYTICS_API"
      ? "LIVE · YouTube Studio OAuth2"
      : data.connectionMode === "DATA_API_V3"
      ? "LIVE · YouTube Data API v3"
      : data.connectionMode === "STUDIO_CSV"
      ? "CSV · YouTube Studio Export"
      : "CHURCH BASELINE · Sep vs Oct 2026";

  return (
    <section className="rounded-3xl p-5 sm:p-6 bg-[#111114] border border-white/[0.09] space-y-5">
      {/* ===================================================================
          1. TOP HEADER BAR & API CONNECTION CONTROLS
         =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeStyle}`}
            >
              {badgeText}
            </span>
            <span className="text-xs font-semibold text-white">
              {data.channelInfo.title} ({data.channelInfo.handle})
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              · {data.channelInfo.subscriberCount} Subscribers
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            YouTube Studio + IG Live: Last Month vs. This Month Comparison
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
          >
            Import Studio CSV
          </button>

          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={syncing}
            className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>

          <button
            type="button"
            onClick={() => setShowConnectDrawer(!showConnectDrawer)}
            className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
          >
            {showConnectDrawer
              ? "Close API Setup"
              : data.isLiveConnected
              ? "API Settings"
              : "Connect YouTube API / OAuth"}
          </button>
        </div>
      </div>

      {/* API Error Alert if invalid key/channel entered */}
      {data.apiError && (
        <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
          <span>
            <strong>YouTube API Notice:</strong> {data.apiError} (Showing
            verified church baseline metrics below)
          </span>
          <button
            type="button"
            onClick={() => setShowConnectDrawer(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-semibold shrink-0"
          >
            Fix Credentials
          </button>
        </div>
      )}

      {/* ===================================================================
          2. COLLAPSIBLE YOUTUBE DATA API v3 & GOOGLE OAUTH2 SETUP DRAWER
         =================================================================== */}
      {showConnectDrawer && (
        <form
          onSubmit={handleSaveAndSync}
          className="rounded-2xl p-5 bg-[#16161b] border border-white/[0.12] space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConnectModeTab("API_KEY")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  connectModeTab === "API_KEY"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                1. YouTube Data API v3 (Fastest)
              </button>
              <button
                type="button"
                onClick={() => setConnectModeTab("OAUTH2")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  connectModeTab === "OAUTH2"
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                2. Google OAuth2 (YouTube Analytics API v2)
              </button>
            </div>
            <span className="text-[11px] text-zinc-400">
              Saved automatically to Settings &amp; SQLite
            </span>
          </div>

          {connectModeTab === "API_KEY" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="text-[11px] text-zinc-400 block mb-1">
                  YouTube Channel ID or @Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. @graceonlinechurch or UC..."
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="md:col-span-5">
                <label className="text-[11px] text-zinc-400 block mb-1">
                  YouTube Data API v3 Key (Google Cloud Console)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full py-2 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  {syncing ? "Connecting..." : "Connect & Sync"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Google OAuth 2.0 Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="123456-abc.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Google OAuth 2.0 Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="GOCSPX-..."
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Or Direct OAuth Access Token (`ya29...`)
                  </label>
                  <input
                    type="password"
                    placeholder="ya29.a0..."
                    value={oauthAccessToken}
                    onChange={(e) => setOauthAccessToken(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-zinc-400 font-mono">
                  Authorized Redirect URI:{" "}
                  <strong className="text-zinc-200">
                    http://localhost:3000/api/youtube-analytics/callback
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLaunchGoogleOAuth}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition"
                  >
                    Authorize with Google OAuth2 →
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    Save Token &amp; Sync
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ===================================================================
          3. LAST MONTH VS THIS MONTH VS TARGET GOAL (4 SHARP KPI CARDS)
         =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Weekly Viewers (Last Month vs This Month vs 50+ Goal) */}
        <div className="rounded-2xl p-4 bg-[#16161a] border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              1 · Weekly Livestream Viewers
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold tabular-nums">
              +{momDeltas.weeklyViewersPct}% MoM
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-[#09090b] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-400">Last Month</div>
              <div className="text-base font-bold text-zinc-200 tabular-nums mt-0.5">
                {lastMonth.weeklyViewerRange}
              </div>
              <div className="text-[10px] text-zinc-500">YT Only</div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-300 font-semibold">
                This Month
              </div>
              <div className="text-base font-bold text-white tabular-nums mt-0.5">
                {thisMonth.weeklyViewerRange}
              </div>
              <div className="text-[10px] text-emerald-300">
                YT + IG (+{thisMonth.avgWeeklyIGViewers}/wk)
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-[10px] text-amber-300 font-semibold">
                Target Goal
              </div>
              <div className="text-base font-bold text-amber-300 tabular-nums mt-0.5">
                {targetGoal.weeklyCombinedTarget}+ / wk
              </div>
              <div className="text-[10px] text-amber-200/80">2x Double</div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Monthly Views */}
        <div className="rounded-2xl p-4 bg-[#16161a] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
              2 · Total Monthly Views
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[10px] font-bold tabular-nums">
              +{momDeltas.totalViewsPct}% MoM
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-xs text-zinc-400">
                Last Month:{" "}
                <strong className="text-zinc-200 tabular-nums">
                  {lastMonth.totalViews}
                </strong>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {thisMonth.totalViews} Views
              </div>
            </div>
            <div className="text-right text-[11px] text-zinc-400">
              <div>{thisMonth.servicesCount} Services</div>
              <div className="text-emerald-400 font-medium">
                +{thisMonth.totalViews - lastMonth.totalViews} net views
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Watch Time & Avg View Duration */}
        <div className="rounded-2xl p-4 bg-[#16161a] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
              3 · Watch Time &amp; Duration
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-bold tabular-nums">
              +{momDeltas.avgDurationPct}% Duration
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-xs text-zinc-400">
                Last Month:{" "}
                <strong className="text-zinc-200 tabular-nums">
                  {lastMonth.avgViewDurationFormatted}
                </strong>{" "}
                ({lastMonth.watchTimeHours}h)
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {thisMonth.avgViewDurationFormatted}
              </div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-violet-300 font-semibold tabular-nums">
                {thisMonth.watchTimeHours} hrs total
              </div>
              <div className="text-zinc-400">0 lag after cable fix</div>
            </div>
          </div>
        </div>

        {/* Card 4: Live Chat Engagement & Non-Believer Reach */}
        <div className="rounded-2xl p-4 bg-[#16161a] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-400">
              4 · IG Reach &amp; Chat Interactions
            </span>
            <span className="px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-bold tabular-nums">
              +{momDeltas.engagementPct}% MoM
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-xs text-zinc-400">
                Last Month:{" "}
                <strong className="text-zinc-200 tabular-nums">
                  {lastMonth.likes + lastMonth.comments}
                </strong>{" "}
                interactions
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {thisMonth.likes + thisMonth.comments} Active
              </div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-emerald-300 font-semibold">
                +{thisMonth.subscribersGained} New Subs
              </div>
              <div className="text-zinc-400">Non-believers on IG</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          4. VISUAL WEEK-BY-WEEK COMPARISON (LAST MONTH VS THIS MONTH VS 50+ GOAL)
         =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Cols: Week 1 - Week 4 Comparison Bars */}
        <div className="lg:col-span-7 rounded-2xl p-4 bg-[#16161a] border border-white/[0.08] space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">
              Weekly Viewer Growth: Last Month (YT Only) vs. This Month (YT + IG
              Live)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
                Last Month (YT)
              </span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                This Month YT
              </span>
              <span className="flex items-center gap-1.5 text-pink-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-pink-400" />
                + IG Live
              </span>
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                Target: 50+/wk
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {weeklyComparisonSeries.map((wk) => {
              const maxScale = 55;
              const lastMonthPct = Math.min(
                100,
                Math.round((wk.lastMonthYT / maxScale) * 100)
              );
              const thisYTPct = Math.min(
                100,
                Math.round((wk.thisMonthYT / maxScale) * 100)
              );
              const thisIGPct = Math.min(
                100,
                Math.round((wk.thisMonthIG / maxScale) * 100)
              );

              return (
                <div
                  key={wk.weekLabel}
                  className="p-3 rounded-xl bg-[#0c0c0f] border border-white/[0.06] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {wk.weekLabel}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        · {wk.note}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] tabular-nums">
                      <span className="text-zinc-400">
                        Last: {wk.lastMonthYT}
                      </span>
                      <span className="mx-1.5 text-zinc-600">→</span>
                      <span className="text-emerald-300 font-bold">
                        Now: {wk.thisMonthTotal} (YT {wk.thisMonthYT} + IG{" "}
                        {wk.thisMonthIG})
                      </span>
                    </div>
                  </div>

                  {/* Dual Horizontal Bars */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-500 rounded-full"
                        style={{ width: `${lastMonthPct}%` }}
                      />
                    </div>
                    <div className="w-full h-2.5 bg-white/[0.05] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-sky-400"
                        style={{ width: `${thisYTPct}%` }}
                      />
                      <div
                        className="h-full bg-pink-400"
                        style={{ width: `${thisIGPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Recent Sunday Livestreams Table */}
        <div className="lg:col-span-5 rounded-2xl p-4 bg-[#16161a] border border-white/[0.08] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Synced Sunday Broadcast Breakdown
            </span>
            <span className="text-[11px] text-zinc-400">
              {data.recentStreams.length} Streams
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] uppercase text-zinc-400">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 px-2">YT</th>
                  <th className="py-2 px-2">IG</th>
                  <th className="py-2 px-2">Total</th>
                  <th className="py-2 pl-2 text-right">Avg Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] tabular-nums">
                {data.recentStreams.slice(0, 6).map((st) => (
                  <tr key={st.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-2">
                      <div className="font-medium text-white">
                        {st.dateLabel}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                        {st.title}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-sky-300 font-mono">
                      {st.ytViews}
                    </td>
                    <td className="py-2 px-2 text-pink-300 font-mono">
                      {st.igLiveViewers > 0 ? `+${st.igLiveViewers}` : "—"}
                    </td>
                    <td className="py-2 px-2 font-bold text-emerald-300 font-mono">
                      {st.combinedViewers}
                    </td>
                    <td className="py-2 pl-2 text-right text-zinc-300 font-mono">
                      {st.avgWatchMinutes}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

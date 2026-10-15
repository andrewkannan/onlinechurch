"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import {
  fetchChurchConfig,
  saveChurchConfig,
  processLogoImageFile,
  getLocalChurchConfig,
} from "@/lib/clientConfig";

export default function SettingsPage() {
  const [churchName, setChurchName] = useState("Grace Online Church");
  const [subtitle, setSubtitle] = useState(
    "Live Stream Broadcast & Ministry Hub"
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultTranslation, setDefaultTranslation] = useState("NIV");
  const [geminiKey, setGeminiKey] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramLiveVideoId, setInstagramLiveVideoId] = useState("");

  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant hydration from local cache followed by background DB sync
  const loadSettings = async () => {
    const cached = getLocalChurchConfig();
    if (cached) {
      setChurchName(cached.churchName || "Grace Online Church");
      setSubtitle(cached.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(cached.logoUrl || null);
      setDefaultTranslation(cached.defaultTranslation || "NIV");
      setGeminiKey(cached.geminiApiKey || "");
      setYoutubeApiKey(cached.youtubeApiKey || "");
      setYoutubeLiveChatId(cached.youtubeLiveChatId || "");
      setInstagramToken(cached.instagramAccessToken || "");
      setInstagramLiveVideoId(cached.instagramLiveVideoId || "");
    }

    try {
      const { config, dbConnected: isOnline } = await fetchChurchConfig();
      setChurchName(config.churchName || "Grace Online Church");
      setSubtitle(config.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(config.logoUrl || null);
      setDefaultTranslation(config.defaultTranslation || "NIV");
      setGeminiKey(config.geminiApiKey || "");
      setYoutubeApiKey(config.youtubeApiKey || "");
      setYoutubeLiveChatId(config.youtubeLiveChatId || "");
      setInstagramToken(config.instagramAccessToken || "");
      setInstagramLiveVideoId(config.instagramLiveVideoId || "");
      setDbConnected(isOnline);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSettings();
    const handleExternalUpdate = () => loadSettings();
    window.addEventListener("church-config-updated", handleExternalUpdate);
    return () =>
      window.removeEventListener("church-config-updated", handleExternalUpdate);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processLogoImageFile(file);
      setLogoUrl(dataUrl);
    } catch (err) {
      console.error("Failed to process logo:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const { config, dbConnected: isOnline } = await saveChurchConfig({
        churchName,
        subtitle,
        logoUrl,
        defaultTranslation,
        geminiApiKey: geminiKey,
        youtubeApiKey,
        youtubeLiveChatId,
        instagramAccessToken: instagramToken,
        instagramLiveVideoId,
      });

      setChurchName(config.churchName);
      setSubtitle(config.subtitle);
      setLogoUrl(config.logoUrl);
      setDbConnected(isOnline);
      setFeedback({
        type: "success",
        text: "Organization identity and stream credentials saved",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Could not save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar churchName={churchName} />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Top System Preferences Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              System Configuration · Identity &amp; Stream APIs
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em]">
              Organization Branding &amp; Platform Connections
            </h1>
            <p className="text-xs text-zinc-400">
              Manage your organization mark, default scripture translation, OBS
              Studio dock integration, and live API credentials.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#121215] border border-white/[0.08] text-xs font-medium text-zinc-300 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                dbConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>
              {dbConnected
                ? "Database Connected (SQLite)"
                : "Local Storage Sync Active"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Organization Identity & OBS Dock Guide (6 cols) */}
            <div className="xl:col-span-6 space-y-6">
              {/* 1. Organization Identity */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Section 01
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Organization Identity &amp; Logo Mark
                    </h2>
                  </div>
                  <span className="text-[11px] text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    Global Header
                  </span>
                </div>

                {/* Logo Upload Bento */}
                <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={churchName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white tracking-tight">
                        {churchName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="text-sm font-semibold text-white">
                      Official Organization Mark
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Upload a square PNG, JPG, SVG, or WebP mark. Automatically
                      compressed and synced across the console and printed logs.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                      >
                        Upload Image
                      </button>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/[0.08] text-xs font-medium transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      placeholder="e.g. Grace Online Church"
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Default Bible Translation
                    </label>
                    <select
                      value={defaultTranslation}
                      onChange={(e) => setDefaultTranslation(e.target.value)}
                      aria-label="Default Bible Translation"
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="NIV">
                        NIV · New International Version
                      </option>
                      <option value="ESV">ESV · English Standard Version</option>
                      <option value="NLT">NLT · New Living Translation</option>
                      <option value="KJV">KJV · King James Version</option>
                      <option value="NKJV">NKJV · New King James Version</option>
                      <option value="CSB">CSB · Christian Standard Bible</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                    Console Subtitle
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Live Stream Broadcast & Ministry Hub"
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* OBS Studio Custom Browser Dock Integration */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                      Broadcast Switcher Integration
                    </span>
                    <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Embed Console Directly Inside OBS Studio
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    CUSTOM DOCK
                  </span>
                </div>

                <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2 leading-relaxed">
                  <li>
                    In OBS Studio, open{" "}
                    <strong className="text-white">
                      Docks → Custom Browser Docks
                    </strong>
                    .
                  </li>
                  <li>
                    Enter Dock Name:{" "}
                    <strong className="text-white">Broadcast Control</strong>.
                  </li>
                  <li>
                    Enter URL:{" "}
                    <code className="bg-[#09090b] border border-white/[0.08] text-zinc-200 px-2 py-0.5 rounded font-mono">
                      http://localhost:3000
                    </code>{" "}
                    (or your production URL).
                  </li>
                  <li>
                    Click <strong className="text-white">Apply</strong> and dock
                    the panel next to your multiview monitor.
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Column: AI & Stream Credentials (6 cols) */}
            <div className="xl:col-span-6 space-y-6">
              {/* 2. Gemini API */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                      Section 02
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Google Gemini Intelligence Engine
                    </h2>
                  </div>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-300 hover:text-white underline underline-offset-4 transition"
                  >
                    Get API Key →
                  </a>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Powers sermon outline extraction, scripture formatting,
                    pastoral replies, and executive briefings.
                  </p>
                </div>
              </div>

              {/* 3. YouTube Live */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-400">
                      Section 03 · 16:9 Stream
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      YouTube Live Data API
                    </h2>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      YouTube Data API Key / OAuth Token
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={youtubeApiKey}
                      onChange={(e) => setYoutubeApiKey(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Active Live Chat ID
                    </label>
                    <input
                      type="text"
                      placeholder="Cg0KC..."
                      value={youtubeLiveChatId}
                      onChange={(e) => setYoutubeLiveChatId(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  When left blank, the console operates in Simulation Mode for
                  safe crew rehearsal.
                </p>
              </div>

              {/* 4. Instagram Live */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pink-400">
                      Section 04 · 9:16 Vertical Stream
                    </span>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      Instagram Live Graph API
                    </h2>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-pink-400" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Meta Graph API Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="EAA..."
                      value={instagramToken}
                      onChange={(e) => setInstagramToken(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Live Video Media ID
                    </label>
                    <input
                      type="text"
                      placeholder="1829..."
                      value={instagramLiveVideoId}
                      onChange={(e) => setInstagramLiveVideoId(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Apple Command Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 sticky bottom-4 shadow-2xl">
            <div>
              {feedback ? (
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    feedback.type === "success"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      feedback.type === "success"
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                    }`}
                  />
                  <span>{feedback.text}</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">
                  Changes sync immediately across the navigation bar, broadcast
                  console, and post-show reports.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition disabled:opacity-40"
            >
              {saving ? "Saving Configuration..." : "Save All Configuration"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

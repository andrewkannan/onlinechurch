"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import {
  Settings,
  Sparkles,
  Tv,
  Check,
  ExternalLink,
  Upload,
  Trash2,
  Database,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { YouTubeIcon, InstagramIcon } from "@/components/Icons";

export default function SettingsPage() {
  const [churchName, setChurchName] = useState("Grace Online Church");
  const [subtitle, setSubtitle] = useState("Live Stream Broadcast & Ministry Hub");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultTranslation, setDefaultTranslation] = useState("NIV");
  const [geminiKey, setGeminiKey] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramLiveVideoId, setInstagramLiveVideoId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.config) {
        setChurchName(data.config.churchName || "Grace Online Church");
        setSubtitle(data.config.subtitle || "Live Stream Broadcast & Ministry Hub");
        setLogoUrl(data.config.logoUrl || null);
        setDefaultTranslation(data.config.defaultTranslation || "NIV");
        setGeminiKey(data.config.geminiApiKey || "");
        setYoutubeApiKey(data.config.youtubeApiKey || "");
        setYoutubeLiveChatId(data.config.youtubeLiveChatId || "");
        setInstagramToken(data.config.instagramAccessToken || "");
        setInstagramLiveVideoId(data.config.instagramLiveVideoId || "");
      }
      setDbConnected(Boolean(data.dbConnected));
    } catch {
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    const handleExternalUpdate = () => fetchSettings();
    window.addEventListener("church-config-updated", handleExternalUpdate);
    return () => window.removeEventListener("church-config-updated", handleExternalUpdate);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchName,
          subtitle,
          logoUrl,
          defaultTranslation,
          geminiApiKey: geminiKey,
          youtubeApiKey,
          youtubeLiveChatId,
          instagramAccessToken: instagramToken,
          instagramLiveVideoId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setDbConnected(true);
      window.dispatchEvent(new Event("church-config-updated"));
      setFeedback({
        type: "success",
        text: "Church name, logo, and platform credentials saved to SQLite database!",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Could not save configuration to database",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar churchName={churchName} />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Top Header & Database Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-indigo-400" />
              <span>Church Branding, Logo & Platform Connections</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Customize your church name, upload your official church logo, and configure YouTube, Instagram, and Gemini AI.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shrink-0 ${
              dbConnected
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border-red-800 text-red-300"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>
              {dbConnected
                ? "Database Connected (SQLite Active)"
                : "Database Disconnected"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Loading church configuration from database...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Responsive 2-Column Grid for Widescreen & Desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column: Church Identity, Logo Upload & OBS Guide (6 cols) */}
              <div className="xl:col-span-6 space-y-6">
                {/* Church Branding & Logo Upload Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      1. Church Identity & Logo Upload
                    </h2>
                    <span className="text-[11px] text-indigo-400 font-medium">
                      Displayed across all screens & reports
                    </span>
                  </div>

                  {/* Logo Upload Box */}
                  <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center overflow-hidden shrink-0 border-2 border-indigo-400/40 shadow-lg">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={churchName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-white font-bold">✝</span>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="text-sm font-semibold text-white">
                        Official Church Logo
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Upload a square PNG, JPG, SVG, or WebP image. It will automatically appear in the top navigation bar and printed reports.
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
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Logo Image</span>
                        </button>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl(null)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 text-xs font-medium transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Logo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Church Name & Translation Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Church / Ministry Name
                      </label>
                      <input
                        type="text"
                        required
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        placeholder="e.g. Kingdom Life Church"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Default Bible Translation
                      </label>
                      <select
                        value={defaultTranslation}
                        onChange={(e) => setDefaultTranslation(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="NIV">NIV - New International Version</option>
                        <option value="ESV">ESV - English Standard Version</option>
                        <option value="NLT">NLT - New Living Translation</option>
                        <option value="KJV">KJV - King James Version</option>
                        <option value="NKJV">NKJV - New King James Version</option>
                        <option value="CSB">CSB - Christian Standard Bible</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      Header Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Live Stream Broadcast & Ministry Hub"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* OBS Dock Guide Banner */}
                <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900/80 border border-indigo-800/60 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div className="text-xs space-y-1.5">
                      <h3 className="font-bold text-sm text-white">
                        How to Embed Directly Inside OBS Studio
                      </h3>
                      <p className="text-slate-300 leading-relaxed">
                        You can dock this app right into your OBS interface so your media volunteer never has to leave OBS:
                      </p>
                      <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1">
                        <li>
                          In OBS Studio, click the top menu:{" "}
                          <strong className="text-white">
                            Docks &rarr; Custom Browser Docks...
                          </strong>
                        </li>
                        <li>
                          Enter Dock Name:{" "}
                          <strong className="text-white">Church Chat Hub</strong>
                        </li>
                        <li>
                          Enter URL:{" "}
                          <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
                            http://localhost:3000
                          </code>{" "}
                          (or your hosted domain)
                        </li>
                        <li>
                          Click <strong>Apply</strong> and drag the dock next to your OBS preview!
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI & Live Platform Credentials (6 cols) */}
              <div className="xl:col-span-6 space-y-6">
                {/* AI Settings (Gemini) */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                        2. Google Gemini AI (3.8 Flash)
                      </h2>
                    </div>
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Get free Gemini API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Powers Pastor&apos;s Sermon PDF parsing, instant scripture formatting, prayer reply drafting, and post-service reports.
                    </p>
                  </div>
                </div>

                {/* YouTube Settings */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <YouTubeIcon className="w-4 h-4 text-red-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      3. YouTube Live Stream
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        YouTube Data API Key / Token
                      </label>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Active Live Chat ID
                      </label>
                      <input
                        type="text"
                        placeholder="Cg0KC..."
                        value={youtubeLiveChatId}
                        onChange={(e) => setYoutubeLiveChatId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    When left blank, the app runs in{" "}
                    <strong>Simulation / Test Mode</strong> so your team can safely rehearse without affecting your public channel.
                  </p>
                </div>

                {/* Instagram Settings */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <InstagramIcon className="w-4 h-4 text-pink-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      4. Instagram Live (Professional Account)
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Meta Graph API Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAA..."
                        value={instagramToken}
                        onChange={(e) => setInstagramToken(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Live Video Media ID
                      </label>
                      <input
                        type="text"
                        placeholder="1829..."
                        value={instagramLiveVideoId}
                        onChange={(e) => setInstagramLiveVideoId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Obtained from Meta Live Producer or Graph API for your Instagram Professional Account.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sticky bottom-4 shadow-2xl">
              <div>
                {feedback ? (
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold ${
                      feedback.type === "success"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    All changes are saved directly to your local SQLite database (`dev.db`).
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save All Configuration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

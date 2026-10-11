"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Settings, Key, Sparkles, Tv, Check, ExternalLink } from "lucide-react";
import { YouTubeIcon, InstagramIcon } from "@/components/Icons";

export default function SettingsPage() {
  const [churchName, setChurchName] = useState("Grace Online Church");
  const [defaultTranslation, setDefaultTranslation] = useState("NIV");
  const [geminiKey, setGeminiKey] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramLiveVideoId, setInstagramLiveVideoId] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar churchName={churchName} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <span>Platform Connections & Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure your streaming links, API tokens, and church preferences.
          </p>
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
                <li>In OBS Studio, click the top menu: <strong className="text-white">Docks $\rightarrow$ Custom Browser Docks...</strong></li>
                <li>Enter Dock Name: <strong className="text-white">Church Chat Hub</strong></li>
                <li>Enter URL: <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">http://localhost:3000</code> (or your hosted domain)</li>
                <li>Click <strong>Apply</strong> and drag the dock next to your OBS preview!</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Church Settings */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
              Church Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Church / Ministry Name
                </label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Default Bible Translation
                </label>
                <select
                  value={defaultTranslation}
                  onChange={(e) => setDefaultTranslation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="NIV">NIV - New International Version</option>
                  <option value="ESV">ESV - English Standard Version</option>
                  <option value="NLT">NLT - New Living Translation</option>
                  <option value="KJV">KJV - King James Version</option>
                  <option value="CSB">CSB - Christian Standard Bible</option>
                  <option value="NKJV">NKJV - New King James Version</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Settings (Gemini) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                  Google Gemini AI (3.8 Flash)
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
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Powers real-time scripture formatting, pastoral prayer reply drafting, and post-service reports.
              </p>
            </div>
          </div>

          {/* YouTube Settings */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <YouTubeIcon className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                YouTube Live Stream
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  YouTube Data API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Active Live Chat ID
                </label>
                <input
                  type="text"
                  placeholder="Cg0KC..."
                  value={youtubeLiveChatId}
                  onChange={(e) => setYoutubeLiveChatId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              When left blank, the app runs in <strong>Simulation / Test Mode</strong> so your team can safely rehearse without affecting your public channel.
            </p>
          </div>

          {/* Instagram Settings */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <InstagramIcon className="w-4 h-4 text-pink-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                Instagram Live (Professional Account)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Meta Graph API Access Token
                </label>
                <input
                  type="password"
                  placeholder="EAA..."
                  value={instagramToken}
                  onChange={(e) => setInstagramToken(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Live Video Media ID
                </label>
                <input
                  type="text"
                  placeholder="1829..."
                  value={instagramLiveVideoId}
                  onChange={(e) => setInstagramLiveVideoId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Obtained from Meta Live Producer or Graph API for your Instagram Professional Account.
            </p>
          </div>

          {/* Save Button & Feedback */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4" /> Settings updated successfully!
                </span>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

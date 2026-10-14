"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  BarChart3,
  Settings,
  Flame,
  Edit3,
  Upload,
  Check,
  Database,
  X,
  Trash2,
} from "lucide-react";

interface NavbarProps {
  churchName?: string;
  isLive?: boolean;
}

export default function Navbar({
  churchName: propChurchName,
  isLive = true,
}: NavbarProps) {
  const pathname = usePathname();
  const [churchName, setChurchName] = useState(propChurchName || "Grace Online Church");
  const [subtitle, setSubtitle] = useState("Live Stream Broadcast & Ministry Hub");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  // Quick Branding Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editLogo, setEditLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.config) {
        setChurchName(data.config.churchName || "Grace Online Church");
        setSubtitle(data.config.subtitle || "Live Stream Broadcast & Ministry Hub");
        setLogoUrl(data.config.logoUrl || null);
      }
      setDbConnected(Boolean(data.dbConnected));
    } catch {
      setDbConnected(false);
    }
  };

  useEffect(() => {
    loadConfig();
    const handleConfigUpdate = () => loadConfig();
    window.addEventListener("church-config-updated", handleConfigUpdate);
    return () => window.removeEventListener("church-config-updated", handleConfigUpdate);
  }, []);

  const openQuickEdit = () => {
    setEditName(churchName);
    setEditSubtitle(subtitle);
    setEditLogo(logoUrl);
    setShowEditModal(true);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchName: editName,
          subtitle: editSubtitle,
          logoUrl: editLogo,
        }),
      });
      const data = await res.json();
      if (data.config) {
        setChurchName(data.config.churchName);
        setSubtitle(data.config.subtitle || "Live Stream Broadcast & Ministry Hub");
        setLogoUrl(data.config.logoUrl || null);
        setDbConnected(true);
        window.dispatchEvent(new Event("church-config-updated"));
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Failed to save branding:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-3">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {/* Brand, Logo & Quick Edit */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={openQuickEdit}
              title="Click to upload church logo or change church name"
              className="relative group w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg overflow-hidden shrink-0 border border-indigo-400/30 hover:border-indigo-400 transition"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={churchName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>✝</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-base sm:text-lg text-white tracking-tight truncate">
                  {churchName}
                </h1>
                <button
                  type="button"
                  onClick={openQuickEdit}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Edit Church Name & Logo"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Standby
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            </div>
          </div>

          {/* Platform & Database Status Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                dbConnected
                  ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/50 border-red-800/60 text-red-300"
              }`}
              title={dbConnected ? "SQLite Database Connected" : "Database Disconnected"}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="font-medium">
                {dbConnected ? "DB Connected" : "DB Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-medium">YouTube Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="font-medium">Instagram Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-300">
              <Flame className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini 3.8 AI</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 w-full sm:w-auto justify-center">
            <Link
              href="/"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                pathname === "/"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <Link
              href="/reports"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                pathname === "/reports"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </Link>
            <Link
              href="/settings"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                pathname === "/settings"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Quick Edit Church Branding & Logo Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Church Branding & Logo</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              {/* Logo Upload Section */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-2">
                  Church Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {editLogo ? (
                      <img
                        src={editLogo}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-indigo-400">✝</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                      </button>
                      {editLogo && (
                        <button
                          type="button"
                          onClick={() => setEditLogo(null)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 text-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG, SVG, or WebP (Saved to database)
                    </span>
                  </div>
                </div>
              </div>

              {/* Church Name Input */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Church / Ministry Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Kingdom Life Church"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Subtitle Input */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Header Subtitle
                </label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Live Stream Broadcast & Ministry Hub"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save to Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

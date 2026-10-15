"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  fetchChurchConfig,
  saveChurchConfig,
  processLogoImageFile,
  getLocalChurchConfig,
} from "@/lib/clientConfig";

interface NavbarProps {
  churchName?: string;
  isLive?: boolean;
}

export default function Navbar({
  churchName: propChurchName,
  isLive = true,
}: NavbarProps) {
  const pathname = usePathname();
  const [churchName, setChurchName] = useState(
    propChurchName || "Grace Online Church"
  );
  const [subtitle, setSubtitle] = useState(
    "Live Stream Broadcast & Ministry Hub"
  );
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
    const cached = getLocalChurchConfig();
    if (cached) {
      setChurchName(cached.churchName || "Grace Online Church");
      setSubtitle(cached.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(cached.logoUrl || null);
    }

    const { config, dbConnected: isOnline } = await fetchChurchConfig();
    setChurchName(config.churchName || "Grace Online Church");
    setSubtitle(config.subtitle || "Live Stream Broadcast & Ministry Hub");
    setLogoUrl(config.logoUrl || null);
    setDbConnected(isOnline);
  };

  useEffect(() => {
    loadConfig();
    const handleConfigUpdate = () => loadConfig();
    window.addEventListener("church-config-updated", handleConfigUpdate);
    return () =>
      window.removeEventListener("church-config-updated", handleConfigUpdate);
  }, []);

  const openQuickEdit = () => {
    setEditName(churchName);
    setEditSubtitle(subtitle);
    setEditLogo(logoUrl);
    setShowEditModal(true);
  };

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processLogoImageFile(file);
      setEditLogo(dataUrl);
    } catch (err) {
      console.error("Failed to process logo image:", err);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editName.trim() || "Online Church";
    const trimmedSubtitle =
      editSubtitle.trim() || "Live Stream Broadcast & Ministry Hub";

    setSaving(true);
    setChurchName(trimmedName);
    setSubtitle(trimmedSubtitle);
    setLogoUrl(editLogo);

    try {
      const { config, dbConnected: isOnline } = await saveChurchConfig({
        churchName: trimmedName,
        subtitle: trimmedSubtitle,
        logoUrl: editLogo,
      });
      setChurchName(config.churchName);
      setSubtitle(config.subtitle);
      setLogoUrl(config.logoUrl);
      setDbConnected(isOnline);
    } finally {
      setSaving(false);
      setShowEditModal(false);
    }
  };

  const navItems = [
    { href: "/", label: "Broadcast" },
    { href: "/crew", label: "Pre-Flight & QC" },
    { href: "/roadmap", label: "Timeline & Goals" },
    { href: "/reports", label: "Analytics" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#09090b]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 lg:px-10 py-3">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          {/* Brand, Logo & Quick Edit */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={openQuickEdit}
              title="Edit church name and logo"
              className="relative group w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.12] hover:border-white/30 flex items-center justify-center text-white font-semibold text-sm overflow-hidden shrink-0 transition"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={churchName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="tracking-tight font-bold text-xs">
                  {churchName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-medium text-white transition">
                Edit
              </div>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  onClick={openQuickEdit}
                  className="font-semibold text-[15px] sm:text-base text-white tracking-[-0.02em] truncate cursor-pointer hover:text-zinc-300 transition"
                  title="Click to edit church name"
                >
                  {churchName}
                </h1>
                <button
                  type="button"
                  onClick={openQuickEdit}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition"
                >
                  Edit
                </button>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    On Air
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400">
                    Standby
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 truncate tracking-[-0.01em]">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Minimalist Apple-Style System Telemetry Pills */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-medium">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] text-zinc-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dbConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>{dbConnected ? "Cloud Synced" : "Local Sync"}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>YouTube 1080p60</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span>Instagram 9:16</span>
            </div>
          </div>

          {/* Apple-Style Pill Segmented Navigation */}
          <nav className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] w-full sm:w-auto justify-center overflow-x-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition whitespace-nowrap ${
                    active
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Quick Edit Church Branding & Logo Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Organization Identity
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-xs font-medium text-zinc-400 hover:text-white px-2 py-1 rounded-lg"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-2">
                  Logo Mark
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0">
                    {editLogo ? (
                      <img
                        src={editLogo}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-300">
                        {editName.slice(0, 2).toUpperCase()}
                      </span>
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
                        className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                      >
                        Upload Image
                      </button>
                      {editLogo && (
                        <button
                          type="button"
                          onClick={() => setEditLogo(null)}
                          className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/[0.08] text-xs font-medium transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      PNG, JPG, SVG, or WebP
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Grace Online Church"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Console Subtitle
                </label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Live Stream Broadcast & Ministry Hub"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

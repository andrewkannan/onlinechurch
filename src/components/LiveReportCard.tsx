"use client";

import { useState } from "react";

interface LiveReportCardProps {
  sessionId?: string;
  peakYT: number;
  peakIG: number;
  prayerCount: number;
  visitorCount: number;
  onUpdateStats: (newStats: { peakYT?: number; peakIG?: number }) => void;
  onPrayerAdded: (prayer: any) => void;
  onVisitorAdded: (visitor: any) => void;
}

export default function LiveReportCard({
  sessionId,
  peakYT,
  peakIG,
  prayerCount,
  visitorCount,
  onUpdateStats,
  onPrayerAdded,
  onVisitorAdded,
}: LiveReportCardProps) {
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  // Prayer form state
  const [prayerName, setPrayerName] = useState("");
  const [prayerText, setPrayerText] = useState("");
  const [prayerPlatform, setPrayerPlatform] = useState("BOTH");

  // Visitor form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorLocation, setVisitorLocation] = useState("");
  const [visitorPlatform, setVisitorPlatform] = useState("YOUTUBE");

  const [saving, setSaving] = useState(false);

  const handleSavePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerName.trim() || !prayerText.trim()) return;
    setSaving(true);

    // Optimistic entry for instant UI response
    const optimisticPrayer = {
      id: `pry-opt-${Date.now()}`,
      requesterName: prayerName.trim(),
      requesterHandle: prayerName.trim().startsWith("@")
        ? prayerName.trim()
        : `@${prayerName.trim().toLowerCase().replace(/\s+/g, "_")}`,
      requestText: prayerText.trim(),
      platform: prayerPlatform,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    onPrayerAdded(optimisticPrayer);
    setPrayerName("");
    setPrayerText("");
    setShowPrayerModal(false);

    try {
      await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: optimisticPrayer.requesterName,
          requestText: optimisticPrayer.requestText,
          platform: prayerPlatform,
          sessionId,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    setSaving(true);

    const optimisticVisitor = {
      id: `vis-opt-${Date.now()}`,
      name: visitorName.trim(),
      location: visitorLocation.trim() || "Online",
      platform: visitorPlatform,
      connectedAt: new Date().toISOString(),
    };
    onVisitorAdded(optimisticVisitor);
    setVisitorName("");
    setVisitorLocation("");
    setShowVisitorModal(false);

    try {
      await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: optimisticVisitor.name,
          location: optimisticVisitor.location,
          platform: visitorPlatform,
          sessionId,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const combinedTotal = peakYT + peakIG;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Combined Live Telemetry */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-sky-400 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Combined Live Peak
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-semibold">
              TELEMETRY
            </span>
          </div>

          <div className="my-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-white tabular-nums tracking-tight">
              {combinedTotal}
            </span>
            <span className="text-[11px] text-zinc-400">concurrent viewers</span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.06] text-zinc-400 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>YouTube: {peakYT}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span>Instagram: {peakIG}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Rapid Stream Counter Controls */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-amber-400 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Stream Calibration
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              INSTANT SYNC
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-2">
            <div className="bg-[#09090b] border border-white/[0.08] rounded-xl p-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium mb-1">
                <span>YouTube 16:9</span>
                <button
                  type="button"
                  onClick={() => onUpdateStats({ peakYT: peakYT + 5 })}
                  className="text-[10px] text-amber-300 hover:text-white font-mono"
                >
                  +5
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={peakYT}
                onChange={(e) =>
                  onUpdateStats({
                    peakYT: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                aria-label="YouTube Peak Viewers"
                className="w-full bg-transparent text-base font-semibold text-white tabular-nums focus:outline-none"
              />
            </div>

            <div className="bg-[#09090b] border border-white/[0.08] rounded-xl p-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium mb-1">
                <span>Instagram 9:16</span>
                <button
                  type="button"
                  onClick={() => onUpdateStats({ peakIG: peakIG + 5 })}
                  className="text-[10px] text-amber-300 hover:text-white font-mono"
                >
                  +5
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={peakIG}
                onChange={(e) =>
                  onUpdateStats({
                    peakIG: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                aria-label="Instagram Peak Viewers"
                className="w-full bg-transparent text-base font-semibold text-white tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 pt-1 border-t border-white/[0.05]">
            Updates live analytics and post-show report
          </div>
        </div>

        {/* Card 3: Prayer Triage Counter */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-emerald-400 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Prayer Queue
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
              AUTO-PULL
            </span>
          </div>

          <div className="my-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-white tabular-nums tracking-tight">
              {prayerCount}
            </span>
            <button
              type="button"
              onClick={() => setShowPrayerModal(true)}
              className="px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
            >
              + Log Prayer
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
            Routed by platform (IG to IG · YT to YT)
          </div>
        </div>

        {/* Card 4: First-Time Visitors */}
        <div className="bg-[#121215] border border-white/[0.08] border-t-2 border-t-violet-400 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                First-Time Visitors
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-semibold">
              24H CARE
            </span>
          </div>

          <div className="my-2.5 flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-white tabular-nums tracking-tight">
              {visitorCount}
            </span>
            <button
              type="button"
              onClick={() => setShowVisitorModal(true)}
              className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/[0.12] text-[11px] font-semibold transition"
            >
              + Check-In Visitor
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
            Synced with Repeating Audience CRM
          </div>
        </div>
      </div>

      {/* Log Prayer Modal */}
      {showPrayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  Pastoral Care Queue
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Log Prayer Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrayerModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSavePrayer} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Requester Name or Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Lim or @sarah_live"
                  value={prayerName}
                  onChange={(e) => setPrayerName(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Prayer Need
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the prayer request..."
                  value={prayerText}
                  onChange={(e) => setPrayerText(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Origin Platform
                </label>
                <select
                  value={prayerPlatform}
                  onChange={(e) => setPrayerPlatform(e.target.value)}
                  aria-label="Origin Platform"
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="INSTAGRAM">Instagram Live (9:16)</option>
                  <option value="YOUTUBE">YouTube Live (16:9)</option>
                  <option value="BOTH">Both Streams</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrayerModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition"
                >
                  {saving ? "Saving..." : "Add to Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Visitor Modal */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                  Congregation Check-In
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Record First-Time Visitor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVisitorModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveVisitor} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Visitor Name or Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Location (City / Country)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Singapore or London, UK"
                  value={visitorLocation}
                  onChange={(e) => setVisitorLocation(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Platform
                </label>
                <select
                  value={visitorPlatform}
                  onChange={(e) => setVisitorPlatform(e.target.value)}
                  aria-label="Platform"
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="YOUTUBE">YouTube Live</option>
                  <option value="INSTAGRAM">Instagram Live</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitorModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition"
                >
                  {saving ? "Saving..." : "Save Visitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

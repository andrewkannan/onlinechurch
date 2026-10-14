"use client";

import { useState } from "react";
import { Users, HeartHandshake, UserPlus, Send, CheckCircle2 } from "lucide-react";

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
    if (!prayerName || !prayerText) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: prayerName,
          requestText: prayerText,
          platform: prayerPlatform,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.prayer) {
        onPrayerAdded(data.prayer);
        setPrayerName("");
        setPrayerText("");
        setShowPrayerModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: visitorName,
          location: visitorLocation,
          platform: visitorPlatform,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.visitor) {
        onVisitorAdded(data.visitor);
        setVisitorName("");
        setVisitorLocation("");
        setShowVisitorModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
        {/* Total Combined Viewers */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>COMBINED ATTENDANCE</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {peakYT + peakIG}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-normal">
              peak viewers
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> YT: {peakYT}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500" /> IG: {peakIG}
            </span>
          </div>
        </div>

        {/* Attendance Counter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-medium">
            UPDATE LIVE COUNTS
          </div>
          <div className="grid grid-cols-2 gap-2 my-2">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold">
                YouTube
              </label>
              <input
                type="number"
                min="0"
                value={peakYT}
                onChange={(e) =>
                  onUpdateStats({ peakYT: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white font-semibold focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold">
                Instagram
              </label>
              <input
                type="number"
                min="0"
                value={peakIG}
                onChange={(e) =>
                  onUpdateStats({ peakIG: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white font-semibold focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            Recorded in today's report
          </span>
        </div>

        {/* Prayer Requests Tally */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>PRAYER REQUESTS</span>
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white tracking-tight">
              {prayerCount}
            </span>
            <button
              onClick={() => setShowPrayerModal(true)}
              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition font-medium"
            >
              + Log Prayer
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Stored for pastoral follow-up
          </span>
        </div>

        {/* First-time Visitors Tally */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>FIRST-TIME VISITORS</span>
            <UserPlus className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white tracking-tight">
              {visitorCount}
            </span>
            <button
              onClick={() => setShowVisitorModal(true)}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg transition font-medium"
            >
              + Log Visitor
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Digital connect cards recorded
          </span>
        </div>
      </div>

      {/* Log Prayer Modal */}
      {showPrayerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-emerald-400" /> Log Prayer Request
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a viewer's prayer request to the service report and AI assistant.
            </p>
            <form onSubmit={handleSavePrayer} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Requester Name / Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah J. or @sarah_live"
                  value={prayerName}
                  onChange={(e) => setPrayerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Prayer Need
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Pray for complete healing for my father who is in surgery today..."
                  value={prayerText}
                  onChange={(e) => setPrayerText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Platform
                </label>
                <select
                  value={prayerPlatform}
                  onChange={(e) => setPrayerPlatform(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="BOTH">Both Platforms</option>
                  <option value="YOUTUBE">YouTube Live</option>
                  <option value="INSTAGRAM">Instagram Live</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrayerModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                >
                  {saving ? "Saving..." : "Save Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Visitor Modal */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" /> Log First-Time Visitor
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Record a new viewer tuning in for the first time.
            </p>
            <form onSubmit={handleSaveVisitor} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Visitor Name / Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Location (City / State / Country)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dallas, Texas or London, UK"
                  value={visitorLocation}
                  onChange={(e) => setVisitorLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Platform
                </label>
                <select
                  value={visitorPlatform}
                  onChange={(e) => setVisitorPlatform(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="YOUTUBE">YouTube Live</option>
                  <option value="INSTAGRAM">Instagram Live</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitorModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30"
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

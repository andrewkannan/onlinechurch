"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

export default function ReportsPage() {
  const [service, setService] = useState<any>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<{
    summary: string;
    actionItems: string;
  } | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const [servRes, prayRes, visRes, bcRes] = await Promise.all([
          fetch("/api/service"),
          fetch("/api/prayers"),
          fetch("/api/visitors"),
          fetch("/api/broadcast"),
        ]);
        const s = await servRes.json();
        const p = await prayRes.json();
        const v = await visRes.json();
        const b = await bcRes.json();

        if (s.service) setService(s.service);
        if (p.prayers) setPrayers(p.prayers);
        if (v.visitors) setVisitors(v.visitors);
        if (b.messages) setBroadcasts(b.messages);
      } catch (e) {
        console.error("Failed to load report data:", e);
      }
    };

    loadReportData();
  }, []);

  const handleGenerateAiReport = async () => {
    if (!service) return;
    setGeneratingReport(true);

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceTitle: service.title,
          attendanceYT: service.peakViewersYT || 0,
          attendanceIG: service.peakViewersIG || 0,
          prayerRequests: prayers.map((p) => ({
            name: p.requesterName,
            text: p.requestText,
          })),
          visitors: visitors.map((v) => ({
            name: v.name,
            location: v.location,
          })),
          messagesBroadcasted: broadcasts.length,
          sessionId: service.id,
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

  const totalViewers =
    (service?.peakViewersYT || 0) + (service?.peakViewersIG || 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Reports Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
              Online Service Analytics & Reporting
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              {service?.title || "Sunday Live Service"}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {service?.startedAt
                  ? new Date(service.startedAt).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Today"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>

            <button
              onClick={handleGenerateAiReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate AI Pastoral Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* High Level KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>PEAK LIVE ATTENDANCE</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {totalViewers}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex gap-2">
              <span className="text-red-400">YT: {service?.peakViewersYT || 0}</span>
              <span>•</span>
              <span className="text-pink-400">IG: {service?.peakViewersIG || 0}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>PRAYER REQUESTS</span>
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {prayers.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Logged during stream
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>NEW VISITORS</span>
              <UserPlus className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {visitors.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Connect cards logged
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>MESSAGES BROADCAST</span>
              <Send className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {broadcasts.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Pushed to both chats
            </div>
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

        {/* Service Details Grid: Visitors & Prayer Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First-Time Visitors Log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" /> First-Time Online Visitors
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {visitors.length} total
              </span>
            </h3>

            {visitors.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No new visitors logged for this service yet.
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
                <HeartHandshake className="w-4 h-4 text-emerald-400" /> Prayer Requests Logged
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {prayers.length} total
              </span>
            </h3>

            {prayers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No prayer requests logged for this service yet.
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
    </div>
  );
}

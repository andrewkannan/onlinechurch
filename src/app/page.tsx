"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LiveReportCard from "@/components/LiveReportCard";
import UnifiedOutbox from "@/components/UnifiedOutbox";
import QuickPresetBar from "@/components/QuickPresetBar";
import AiAssistantDock from "@/components/AiAssistantDock";

export default function DashboardPage() {
  const [activeMessage, setActiveMessage] = useState("");
  const [serviceSession, setServiceSession] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [serviceRes, presetsRes, broadcastRes, prayersRes, visitorsRes] =
        await Promise.all([
          fetch("/api/service"),
          fetch("/api/presets"),
          fetch("/api/broadcast"),
          fetch("/api/prayers"),
          fetch("/api/visitors"),
        ]);

      const serviceData = await serviceRes.json();
      const presetsData = await presetsRes.json();
      const broadcastData = await broadcastRes.json();
      const prayersData = await prayersRes.json();
      const visitorsData = await visitorsRes.json();

      if (serviceData.service) setServiceSession(serviceData.service);
      if (presetsData.presets) setPresets(presetsData.presets);
      if (broadcastData.messages) setRecentBroadcasts(broadcastData.messages);
      if (prayersData.prayers) setPrayers(prayersData.prayers);
      if (visitorsData.visitors) setVisitors(visitorsData.visitors);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update live viewer counts
  const handleUpdateStats = async (newStats: { peakYT?: number; peakIG?: number }) => {
    if (!serviceSession) return;
    const updatedYT =
      newStats.peakYT !== undefined ? newStats.peakYT : serviceSession.peakViewersYT;
    const updatedIG =
      newStats.peakIG !== undefined ? newStats.peakIG : serviceSession.peakViewersIG;

    setServiceSession((prev: any) => ({
      ...prev,
      peakViewersYT: updatedYT,
      peakViewersIG: updatedIG,
    }));

    try {
      await fetch("/api/service", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: serviceSession.id,
          peakViewersYT: updatedYT,
          peakViewersIG: updatedIG,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Instant broadcast trigger from preset or AI tool
  const handleInstantBroadcast = async (content: string) => {
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          target: "BOTH",
          sessionId: serviceSession?.id,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setRecentBroadcasts((prev) => [data.message, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar churchName="Grace Online Church" isLive={serviceSession?.isActive ?? true} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Service Session Title & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div>
            <div className="text-xs text-indigo-400 font-semibold tracking-wide uppercase">
              Current Active Service
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {serviceSession?.title || "Sunday Live Worship Service"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Broadcasting to:
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
              YouTube Live
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30">
              Instagram Live
            </span>
          </div>
        </div>

        {/* Live Counters & Tally */}
        <LiveReportCard
          sessionId={serviceSession?.id}
          peakYT={serviceSession?.peakViewersYT || 0}
          peakIG={serviceSession?.peakViewersIG || 0}
          prayerCount={prayers.length}
          visitorCount={visitors.length}
          onUpdateStats={handleUpdateStats}
          onPrayerAdded={(p) => setPrayers((prev) => [p, ...prev])}
          onVisitorAdded={(v) => setVisitors((prev) => [v, ...prev])}
        />

        {/* Core Workspace: Outbox + AI Assistant Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Unified Outbox + Quick Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <UnifiedOutbox
              messageContent={activeMessage}
              onChangeContent={setActiveMessage}
              sessionId={serviceSession?.id}
              recentMessages={recentBroadcasts}
              onBroadcastSuccess={fetchData}
            />

            <QuickPresetBar
              presets={presets}
              onSelectPreset={(content) => setActiveMessage(content)}
              onInstantBroadcast={handleInstantBroadcast}
            />
          </div>

          {/* Right Column: AI Live Ministry Assistant (5 cols) */}
          <div className="lg:col-span-5">
            <AiAssistantDock
              onPushToOutbox={(text) => setActiveMessage(text)}
              onInstantBroadcast={handleInstantBroadcast}
              prayers={prayers}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

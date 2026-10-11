"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LiveReportCard from "@/components/LiveReportCard";
import UnifiedOutbox from "@/components/UnifiedOutbox";
import QuickPresetBar from "@/components/QuickPresetBar";
import AiAssistantDock from "@/components/AiAssistantDock";
import SermonCueDeck, { SermonCueItem } from "@/components/SermonCueDeck";
import PropheticDeck from "@/components/PropheticDeck";
import { FileText, Sparkles, MessageSquare, Flame } from "lucide-react";

export default function DashboardPage() {
  const [activeMessage, setActiveMessage] = useState("");
  const [serviceSession, setServiceSession] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [sermonCues, setSermonCues] = useState<SermonCueItem[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);

  // Workspace Mode Toggles
  const [leftTab, setLeftTab] = useState<"CUE_DECK" | "CUSTOM_OUTBOX">("CUE_DECK");
  const [rightTab, setRightTab] = useState<"PROPHETIC" | "AI_ASSISTANT">("PROPHETIC");

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [serviceRes, presetsRes, broadcastRes, prayersRes, visitorsRes, cuesRes] =
        await Promise.all([
          fetch("/api/service"),
          fetch("/api/presets"),
          fetch("/api/broadcast"),
          fetch("/api/prayers"),
          fetch("/api/visitors"),
          fetch("/api/sermon-notes"),
        ]);

      const serviceData = await serviceRes.json();
      const presetsData = await presetsRes.json();
      const broadcastData = await broadcastRes.json();
      const prayersData = await prayersRes.json();
      const visitorsData = await visitorsRes.json();
      const cuesData = await cuesRes.json();

      if (serviceData.service) setServiceSession(serviceData.service);
      if (presetsData.presets) setPresets(presetsData.presets);
      if (broadcastData.messages) setRecentBroadcasts(broadcastData.messages);
      if (prayersData.prayers) setPrayers(prayersData.prayers);
      if (visitorsData.visitors) setVisitors(visitorsData.visitors);
      if (cuesData.cues) setSermonCues(cuesData.cues);
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

  // Instant broadcast trigger from preset, cue, or AI tool
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

  // Release cue directly
  const handleReleaseCue = async (cue: SermonCueItem) => {
    await handleInstantBroadcast(cue.content);
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

        {/* Core Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Sermon Cue Deck / Custom Outbox (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Left Column Switcher Tabs */}
            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLeftTab("CUE_DECK")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    leftTab === "CUE_DECK"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pastor's Sermon Notes ({sermonCues.length})</span>
                </button>

                <button
                  onClick={() => setLeftTab("CUSTOM_OUTBOX")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    leftTab === "CUSTOM_OUTBOX"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Manual Outbox & Presets</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 hidden sm:inline mr-2">
                {leftTab === "CUE_DECK" ? "1-Click Teleprompter Mode" : "Free Typing Mode"}
              </span>
            </div>

            {/* Left Content View */}
            {leftTab === "CUE_DECK" ? (
              <SermonCueDeck
                cues={sermonCues}
                onReleaseCue={handleReleaseCue}
                onPushToOutbox={(text) => {
                  setActiveMessage(text);
                  setLeftTab("CUSTOM_OUTBOX");
                }}
                onCuesUpdated={fetchData}
                sessionId={serviceSession?.id}
              />
            ) : (
              <div className="space-y-4">
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
            )}
          </div>

          {/* Right Column: Prophetic Deck / AI Assistant (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Right Column Switcher Tabs */}
            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRightTab("PROPHETIC")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightTab === "PROPHETIC"
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Prophetic Flow Deck</span>
                </button>

                <button
                  onClick={() => setRightTab("AI_ASSISTANT")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightTab === "AI_ASSISTANT"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scripture & Prayer AI</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-500 mr-2">
                {rightTab === "PROPHETIC" ? "Spirit-Led Declarations" : "Gemini 3.8"}
              </span>
            </div>

            {/* Right Content View */}
            {rightTab === "PROPHETIC" ? (
              <PropheticDeck
                onPushToOutbox={(text) => {
                  setActiveMessage(text);
                  setLeftTab("CUSTOM_OUTBOX");
                }}
                onInstantBroadcast={handleInstantBroadcast}
              />
            ) : (
              <AiAssistantDock
                onPushToOutbox={(text) => {
                  setActiveMessage(text);
                  setLeftTab("CUSTOM_OUTBOX");
                }}
                onInstantBroadcast={handleInstantBroadcast}
                prayers={prayers}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

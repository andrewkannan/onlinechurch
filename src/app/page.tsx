"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LiveReportCard from "@/components/LiveReportCard";
import UnifiedOutbox from "@/components/UnifiedOutbox";
import QuickPresetBar from "@/components/QuickPresetBar";
import AiAssistantDock from "@/components/AiAssistantDock";
import SermonCueDeck, { SermonCueItem } from "@/components/SermonCueDeck";
import PropheticDeck from "@/components/PropheticDeck";
import LivePrayerChatQueue from "@/components/LivePrayerChatQueue";
import {
  FileText,
  Sparkles,
  MessageSquare,
  Flame,
  Edit3,
  Check,
  X,
  HeartHandshake,
} from "lucide-react";

export default function DashboardPage() {
  const [activeMessage, setActiveMessage] = useState("");
  const [serviceSession, setServiceSession] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [sermonCues, setSermonCues] = useState<SermonCueItem[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);

  // Inline service title edit state
  const [editingServiceTitle, setEditingServiceTitle] = useState(false);
  const [serviceTitleInput, setServiceTitleInput] = useState("");

  // Workspace Mode Toggles
  const [leftTab, setLeftTab] = useState<"CUE_DECK" | "CUSTOM_OUTBOX">("CUE_DECK");
  const [rightTab, setRightTab] = useState<
    "PRAYER_QUEUE" | "PROPHETIC" | "AI_ASSISTANT"
  >("PRAYER_QUEUE");

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

      if (serviceData.service) {
        setServiceSession(serviceData.service);
        setServiceTitleInput(serviceData.service.title || "Sunday Worship & Word Service");
      }
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

  // Save edited service title to database
  const handleSaveServiceTitle = async () => {
    if (!serviceSession || !serviceTitleInput.trim()) {
      setEditingServiceTitle(false);
      return;
    }
    const newTitle = serviceTitleInput.trim();
    setServiceSession((prev: any) => ({ ...prev, title: newTitle }));
    setEditingServiceTitle(false);

    try {
      await fetch("/api/service", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: serviceSession.id,
          title: newTitle,
        }),
      });
    } catch (e) {
      console.error("Failed to update service title:", e);
    }
  };

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
    <div className="min-h-screen bg-slate-950 flex flex-col w-full">
      <Navbar isLive={serviceSession?.isActive ?? true} />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 space-y-5">
        {/* Service Session Title & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-indigo-400 font-semibold tracking-wide uppercase">
              Current Active Service
            </div>

            {editingServiceTitle ? (
              <div className="flex items-center gap-2 mt-1 max-w-xl">
                <input
                  type="text"
                  value={serviceTitleInput}
                  onChange={(e) => setServiceTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveServiceTitle();
                    if (e.key === "Escape") setEditingServiceTitle(false);
                  }}
                  autoFocus
                  className="flex-1 bg-slate-800 border border-indigo-500 rounded-xl px-3 py-1.5 text-base font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveServiceTitle}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
                  title="Save Service Title"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingServiceTitle(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {serviceSession?.title || "Sunday Worship & Word Service"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setServiceTitleInput(
                      serviceSession?.title || "Sunday Worship & Word Service"
                    );
                    setEditingServiceTitle(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Rename Active Service Title"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">Broadcasting to:</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
              YouTube Live
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30">
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

        {/* Core Workspace Grid - Full-Screen Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          {/* Left Column: Sermon Cue Deck / Custom Outbox (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Left Column Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setLeftTab("CUE_DECK")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    leftTab === "CUE_DECK"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pastor&apos;s Sermon Notes ({sermonCues.length})</span>
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

          {/* Right Column: Auto-Prayer Queue / Prophetic Deck / AI Assistant (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Right Column Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setRightTab("PRAYER_QUEUE")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightTab === "PRAYER_QUEUE"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Auto-Prayer Queue ({prayers.length})</span>
                </button>

                <button
                  onClick={() => setRightTab("PROPHETIC")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightTab === "PROPHETIC"
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Prophetic Flow</span>
                </button>

                <button
                  onClick={() => setRightTab("AI_ASSISTANT")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightTab === "AI_ASSISTANT"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scripture AI</span>
                </button>
              </div>
            </div>

            {/* Right Content View */}
            {rightTab === "PRAYER_QUEUE" ? (
              <LivePrayerChatQueue
                sessionId={serviceSession?.id}
                onPrayerCountChange={(updatedPrayers) =>
                  setPrayers(updatedPrayers)
                }
                onBroadcastLogged={fetchData}
              />
            ) : rightTab === "PROPHETIC" ? (
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

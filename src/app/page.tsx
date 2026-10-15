"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import LiveReportCard from "@/components/LiveReportCard";
import UnifiedOutbox from "@/components/UnifiedOutbox";
import QuickPresetBar from "@/components/QuickPresetBar";
import AiAssistantDock from "@/components/AiAssistantDock";
import SermonCueDeck, { SermonCueItem } from "@/components/SermonCueDeck";
import PropheticDeck from "@/components/PropheticDeck";
import LivePrayerChatQueue from "@/components/LivePrayerChatQueue";

export default function DashboardPage() {
  const [activeMessage, setActiveMessage] = useState("");
  const [serviceSession, setServiceSession] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [sermonCues, setSermonCues] = useState<SermonCueItem[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Inline service title edit state
  const [editingServiceTitle, setEditingServiceTitle] = useState(false);
  const [serviceTitleInput, setServiceTitleInput] = useState("");

  // Workspace Mode Toggles
  const [leftTab, setLeftTab] = useState<"CUE_DECK" | "CUSTOM_OUTBOX">(
    "CUE_DECK"
  );
  const [rightTab, setRightTab] = useState<
    "PRAYER_QUEUE" | "PROPHETIC" | "AI_ASSISTANT"
  >("PRAYER_QUEUE");

  // Debounce timer for viewer stats updates
  const statsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  // Fetch initial data in parallel
  const fetchData = async () => {
    try {
      const [
        serviceRes,
        presetsRes,
        broadcastRes,
        prayersRes,
        visitorsRes,
        cuesRes,
      ] = await Promise.all([
        fetch("/api/service", { cache: "no-store" }),
        fetch("/api/presets", { cache: "no-store" }),
        fetch("/api/broadcast", { cache: "no-store" }),
        fetch("/api/prayers", { cache: "no-store" }),
        fetch("/api/visitors", { cache: "no-store" }),
        fetch("/api/sermon-notes", { cache: "no-store" }),
      ]);

      const [
        serviceData,
        presetsData,
        broadcastData,
        prayersData,
        visitorsData,
        cuesData,
      ] = await Promise.all([
        serviceRes.json(),
        presetsRes.json(),
        broadcastRes.json(),
        prayersRes.json(),
        visitorsRes.json(),
        cuesRes.json(),
      ]);

      if (serviceData.service) {
        setServiceSession(serviceData.service);
        setServiceTitleInput(
          serviceData.service.title || "Sunday Worship & Word Service"
        );
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

  // Targeted refresh for cues only (avoids re-fetching 6 endpoints)
  const refreshCuesOnly = async () => {
    try {
      const res = await fetch("/api/sermon-notes", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.cues) setSermonCues(data.cues);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Targeted refresh for broadcasts only
  const refreshBroadcastsOnly = async () => {
    try {
      const res = await fetch("/api/broadcast", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) setRecentBroadcasts(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save edited service title
  const handleSaveServiceTitle = async () => {
    if (!serviceSession || !serviceTitleInput.trim()) {
      setEditingServiceTitle(false);
      return;
    }
    const newTitle = serviceTitleInput.trim();
    setServiceSession((prev: any) => ({ ...prev, title: newTitle }));
    setEditingServiceTitle(false);
    triggerToast("Service title updated");

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

  // Optimistic + Debounced viewer count update for zero input lag
  const handleUpdateStats = (newStats: {
    peakYT?: number;
    peakIG?: number;
  }) => {
    if (!serviceSession) return;
    const updatedYT =
      newStats.peakYT !== undefined
        ? newStats.peakYT
        : serviceSession.peakViewersYT;
    const updatedIG =
      newStats.peakIG !== undefined
        ? newStats.peakIG
        : serviceSession.peakViewersIG;

    setServiceSession((prev: any) => ({
      ...prev,
      peakViewersYT: updatedYT,
      peakViewersIG: updatedIG,
    }));

    if (statsDebounceRef.current) {
      clearTimeout(statsDebounceRef.current);
    }
    statsDebounceRef.current = setTimeout(async () => {
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
    }, 350);
  };

  // Instant optimistic broadcast trigger from preset, cue, or AI tool
  const handleInstantBroadcast = async (content: string) => {
    const optimisticMsg = {
      id: `bc-fast-${Date.now()}`,
      content,
      target: "BOTH",
      status: "SENT",
      sentAt: new Date().toISOString(),
    };
    setRecentBroadcasts((prev) => [optimisticMsg, ...prev]);
    triggerToast("Broadcast dispatched to YouTube & Instagram");

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
        setRecentBroadcasts((prev) => [
          data.message,
          ...prev.filter((m) => m.id !== optimisticMsg.id),
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Release cue directly with optimistic update
  const handleReleaseCue = async (cue: SermonCueItem) => {
    setSermonCues((prev) =>
      prev.map((c) => (c.id === cue.id ? { ...c, isReleased: true } : c))
    );
    await handleInstantBroadcast(cue.content);
  };

  const openPrayerCount = prayers.filter((p) => p.status === "OPEN").length;
  const pendingCuesCount = sermonCues.filter((c) => !c.isReleased).length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar isLive={serviceSession?.isActive ?? true} />

      {/* Minimalist Apple Toast Pill */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight flex items-center gap-2 border border-black/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Top Broadcast Control Header (Apple Bento Style) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Master Broadcast Console · Live Operations
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Dual-Stream Active
              </span>
            </div>

            {editingServiceTitle ? (
              <div className="flex items-center gap-2 pt-1 max-w-xl">
                <input
                  type="text"
                  value={serviceTitleInput}
                  onChange={(e) => setServiceTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveServiceTitle();
                    if (e.key === "Escape") setEditingServiceTitle(false);
                  }}
                  autoFocus
                  className="flex-1 bg-[#121215] border border-white/25 rounded-xl px-3.5 py-1.5 text-base font-semibold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveServiceTitle}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingServiceTitle(false)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.06] text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em] truncate">
                  {serviceSession?.title || "Sunday Worship & Word Service"}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setServiceTitleInput(
                      serviceSession?.title || "Sunday Worship & Word Service"
                    );
                    setEditingServiceTitle(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08] text-[11px] font-medium transition"
                >
                  Rename Service
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/crew"
              className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            >
              Pre-Flight &amp; Stream QC →
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121215] border border-white/[0.08] text-xs font-medium text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>YouTube 16:9</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121215] border border-white/[0.08] text-xs font-medium text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span>Instagram 9:16</span>
            </div>
          </div>
        </div>

        {/* Live Telemetry & Calibration Bar */}
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
          {/* Left Column: Sermon Cue Deck / Manual Outbox (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Apple Segmented Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121215] border border-white/[0.08] p-1.5 rounded-full">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setLeftTab("CUE_DECK")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition flex items-center gap-2 ${
                    leftTab === "CUE_DECK"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Sermon Cue Deck</span>
                  <span
                    className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                      leftTab === "CUE_DECK"
                        ? "bg-black/10 text-black font-bold"
                        : "bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    {pendingCuesCount} Pending
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeftTab("CUSTOM_OUTBOX")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition ${
                    leftTab === "CUSTOM_OUTBOX"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Manual Outbox &amp; Presets
                </button>
              </div>

              <span className="text-[11px] text-zinc-500 hidden sm:inline pr-3">
                {leftTab === "CUE_DECK"
                  ? "Teleprompter Sync"
                  : "Custom Dispatch"}
              </span>
            </div>

            {leftTab === "CUE_DECK" ? (
              <SermonCueDeck
                cues={sermonCues}
                onReleaseCue={handleReleaseCue}
                onPushToOutbox={(text) => {
                  setActiveMessage(text);
                  setLeftTab("CUSTOM_OUTBOX");
                }}
                onCuesUpdated={refreshCuesOnly}
                sessionId={serviceSession?.id}
              />
            ) : (
              <div className="space-y-5">
                <UnifiedOutbox
                  messageContent={activeMessage}
                  onChangeContent={setActiveMessage}
                  sessionId={serviceSession?.id}
                  recentMessages={recentBroadcasts}
                  onBroadcastSuccess={refreshBroadcastsOnly}
                />

                <QuickPresetBar
                  presets={presets}
                  onSelectPreset={(content) => setActiveMessage(content)}
                  onInstantBroadcast={handleInstantBroadcast}
                />
              </div>
            )}
          </div>

          {/* Right Column: Auto-Prayer Queue / Prophetic Flow / Scripture AI (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Apple Segmented Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121215] border border-white/[0.08] p-1.5 rounded-full">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRightTab("PRAYER_QUEUE")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition flex items-center gap-2 ${
                    rightTab === "PRAYER_QUEUE"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Prayer Queue</span>
                  {openPrayerCount > 0 && (
                    <span
                      className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                        rightTab === "PRAYER_QUEUE"
                          ? "bg-rose-500 text-white font-bold"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {openPrayerCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab("PROPHETIC")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition ${
                    rightTab === "PROPHETIC"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Prophetic Decrees
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab("AI_ASSISTANT")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-[-0.01em] transition ${
                    rightTab === "AI_ASSISTANT"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Scripture Desk
                </button>
              </div>
            </div>

            {rightTab === "PRAYER_QUEUE" ? (
              <LivePrayerChatQueue
                sessionId={serviceSession?.id}
                onPrayerCountChange={(updatedPrayers) =>
                  setPrayers(updatedPrayers)
                }
                onBroadcastLogged={refreshBroadcastsOnly}
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

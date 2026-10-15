"use client";

import { useState, useEffect } from "react";

interface LivePrayerChatQueueProps {
  sessionId?: string;
  onPrayerCountChange?: (prayers: any[]) => void;
  onBroadcastLogged?: () => void;
}

export default function LivePrayerChatQueue({
  sessionId,
  onPrayerCountChange,
  onBroadcastLogged,
}: LivePrayerChatQueueProps) {
  const [viewMode, setViewMode] = useState<"PRAYER_QUEUE" | "LIVE_FEED">(
    "PRAYER_QUEUE"
  );
  const [platformFilter, setPlatformFilter] = useState<
    "ALL" | "YOUTUBE" | "INSTAGRAM" | "OPEN"
  >("ALL");

  const [prayers, setPrayers] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [draftingAiId, setDraftingAiId] = useState<string | null>(null);
  const [batchReplying, setBatchReplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Simulator / Incoming Stream Tester state
  const [simPlatform, setSimPlatform] = useState<"INSTAGRAM" | "YOUTUBE">(
    "INSTAGRAM"
  );
  const [simAuthor, setSimAuthor] = useState("@grace_tan_sg");
  const [simText, setSimText] = useState("");
  const [simulating, setSimulating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadLiveQueue = async () => {
    try {
      const res = await fetch("/api/live-chat", { cache: "no-store" });
      const data = await res.json();
      if (data.prayers) {
        setPrayers(data.prayers);
        if (onPrayerCountChange) onPrayerCountChange(data.prayers);

        setReplyDrafts((prev) => {
          const next = { ...prev };
          for (const p of data.prayers) {
            if (next[p.id] === undefined && p.aiDraftedResponse) {
              next[p.id] = p.aiDraftedResponse;
            }
          }
          return next;
        });
      }
      if (data.messages) {
        setChatMessages(data.messages);
      }
    } catch (e) {
      console.error("Failed to load live chat & prayer queue:", e);
    }
  };

  useEffect(() => {
    loadLiveQueue();
    const interval = setInterval(loadLiveQueue, 8000);
    return () => clearInterval(interval);
  }, []);

  // Optimistic Platform-Intelligent Reply (IG -> IG only, YT -> YT only)
  const handleSendPlatformReply = async (prayer: any) => {
    const replyText = (
      replyDrafts[prayer.id] ||
      prayer.aiDraftedResponse ||
      `${
        prayer.requesterHandle || prayer.requesterName
      } We are standing in faith and praying with you right now.`
    ).trim();
    if (!replyText) return;

    const targetPlatform: "INSTAGRAM" | "YOUTUBE" =
      prayer.platform === "INSTAGRAM" ? "INSTAGRAM" : "YOUTUBE";

    setSendingReplyId(prayer.id);

    // Optimistic state update in 0ms
    const optimisticPrayers = prayers.map((p) =>
      p.id === prayer.id
        ? {
            ...p,
            status: "PRAYED",
            repliedPlatform: targetPlatform,
            replySentText: replyText,
          }
        : p
    );
    setPrayers(optimisticPrayers);
    if (onPrayerCountChange) onPrayerCountChange(optimisticPrayers);
    showToast(
      `Reply routed to ${
        targetPlatform === "INSTAGRAM" ? "Instagram Live" : "YouTube Live"
      } for ${prayer.requesterHandle || prayer.requesterName}`
    );

    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPLY_TO_PRAYER",
          prayerId: prayer.id,
          platform: targetPlatform,
          replyText,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.prayers) {
        setPrayers(data.prayers);
        if (onPrayerCountChange) onPrayerCountChange(data.prayers);
      }
      if (onBroadcastLogged) onBroadcastLogged();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReplyId(null);
    }
  };

  // Batch Reply All Open Prayers for High-Speed Moderator Triage
  const handleReplyAllOpen = async () => {
    const openList = prayers.filter((p) => p.status === "OPEN");
    if (openList.length === 0) return;

    setBatchReplying(true);
    const updated = prayers.map((p) => {
      if (p.status !== "OPEN") return p;
      const targetPlatform =
        p.platform === "INSTAGRAM" ? "INSTAGRAM" : "YOUTUBE";
      const text =
        replyDrafts[p.id] ||
        p.aiDraftedResponse ||
        `${
          p.requesterHandle || p.requesterName
        } Our prayer team is standing in agreement with you right now.`;
      return {
        ...p,
        status: "PRAYED",
        repliedPlatform: targetPlatform,
        replySentText: text,
      };
    });
    setPrayers(updated);
    if (onPrayerCountChange) onPrayerCountChange(updated);
    showToast(
      `Dispatched ${openList.length} platform-matched pastoral replies`
    );

    try {
      await Promise.all(
        openList.map((p) => {
          const targetPlatform =
            p.platform === "INSTAGRAM" ? "INSTAGRAM" : "YOUTUBE";
          const replyText =
            replyDrafts[p.id] ||
            p.aiDraftedResponse ||
            `${
              p.requesterHandle || p.requesterName
            } Our prayer team is standing in agreement with you right now.`;
          return fetch("/api/prayers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "REPLY_TO_PRAYER",
              prayerId: p.id,
              platform: targetPlatform,
              replyText,
              sessionId,
            }),
          });
        })
      );
      if (onBroadcastLogged) onBroadcastLogged();
    } catch (e) {
      console.error(e);
    } finally {
      setBatchReplying(false);
    }
  };

  const handleAiRedraft = async (prayer: any) => {
    setDraftingAiId(prayer.id);
    try {
      const res = await fetch("/api/ai/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: prayer.requesterHandle || prayer.requesterName,
          requestText: `[Platform: ${prayer.platform}] ${prayer.requestText}`,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const handlePrefix =
          prayer.requesterHandle && !data.reply.includes(prayer.requesterHandle)
            ? `${prayer.requesterHandle} `
            : "";
        setReplyDrafts((prev) => ({
          ...prev,
          [prayer.id]: `${handlePrefix}${data.reply}`,
        }));
        showToast("Pastoral reply personalized");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingAiId(null);
    }
  };

  const handleIncomingChatSubmit = async (
    e?: React.FormEvent,
    preset?: {
      platform: "INSTAGRAM" | "YOUTUBE";
      author: string;
      text: string;
    }
  ) => {
    if (e) e.preventDefault();
    const payloadPlatform = preset ? preset.platform : simPlatform;
    const payloadAuthor = preset ? preset.author : simAuthor;
    const payloadText = preset ? preset.text : simText;

    if (!payloadText.trim()) return;
    setSimulating(true);

    try {
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INCOMING_MESSAGE",
          platform: payloadPlatform,
          authorName: payloadAuthor.replace(/^@/, ""),
          authorHandle: payloadAuthor.startsWith("@")
            ? payloadAuthor
            : `@${payloadAuthor.replace(/\s+/g, "_")}`,
          text: payloadText,
        }),
      });
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
      if (data.prayers) {
        setPrayers(data.prayers);
        if (onPrayerCountChange) onPrayerCountChange(data.prayers);
      }
      if (data.prayer) {
        setReplyDrafts((prev) => ({
          ...prev,
          [data.prayer.id]: data.prayer.aiDraftedResponse || "",
        }));
      }

      if (!preset) setSimText("");

      if (data.autoPulled) {
        showToast(
          `Auto-pulled prayer from ${
            payloadPlatform === "INSTAGRAM" ? "Instagram" : "YouTube"
          } (${payloadAuthor})`
        );
      } else {
        showToast(`Received ${payloadPlatform} comment from ${payloadAuthor}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleManualPull = async (messageId: string) => {
    try {
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PULL_TO_PRAYER", messageId }),
      });
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
      if (data.prayers) {
        setPrayers(data.prayers);
        if (onPrayerCountChange) onPrayerCountChange(data.prayers);
      }
      if (data.prayer) {
        setReplyDrafts((prev) => ({
          ...prev,
          [data.prayer.id]: data.prayer.aiDraftedResponse || "",
        }));
      }
      setViewMode("PRAYER_QUEUE");
      showToast("Pulled comment into Prayer Queue");
    } catch (e) {
      console.error(e);
    }
  };

  const openPrayersCount = prayers.filter((p) => p.status === "OPEN").length;

  const filteredPrayers = prayers.filter((p) => {
    if (platformFilter === "OPEN") return p.status === "OPEN";
    if (platformFilter === "YOUTUBE") return p.platform === "YOUTUBE";
    if (platformFilter === "INSTAGRAM") return p.platform === "INSTAGRAM";
    return true;
  });

  const openFilteredPrayers = filteredPrayers.filter(
    (p) => p.status === "OPEN"
  );
  const repliedFilteredPrayers = filteredPrayers.filter(
    (p) => p.status !== "OPEN"
  );

  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
      {toast && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-medium flex items-center justify-between">
          <span>{toast}</span>
          <span className="text-[10px] uppercase tracking-wider">Synced</span>
        </div>
      )}

      {/* Top Header & Apple Segmented View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              MOD-01 · Intelligent Prayer Routing
            </span>
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
            Auto-Prayer Queue &amp; Platform Reply (IG to IG · YT to YT)
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("PRAYER_QUEUE")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === "PRAYER_QUEUE"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Prayer Queue</span>
            {openPrayersCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-semibold ${
                  viewMode === "PRAYER_QUEUE"
                    ? "bg-rose-500 text-white"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {openPrayersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode("LIVE_FEED")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === "LIVE_FEED"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Chat Stream</span>
            <span className="text-[10px] tabular-nums opacity-75">
              {chatMessages.length}
            </span>
          </button>
        </div>
      </div>

      {/* Incoming Stream Simulator / Live Ingest Bar */}
      <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-400">
            Simulate Incoming Chat (Auto-Detects Prayer Intent)
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleIncomingChatSubmit(undefined, {
                  platform: "INSTAGRAM",
                  author: "@sarah_lim_ig",
                  text: "Please pray for my father in hospital right now, doctors are running heart tests.",
                })
              }
              className="text-[10px] px-2.5 py-1 rounded-full bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 font-medium transition"
            >
              + Simulate IG Prayer
            </button>
            <button
              type="button"
              onClick={() =>
                handleIncomingChatSubmit(undefined, {
                  platform: "YOUTUBE",
                  author: "@BrotherMarcus",
                  text: "Please pray for my family and financial breakthrough this month.",
                })
              }
              className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium transition"
            >
              + Simulate YT Prayer
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => handleIncomingChatSubmit(e)}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select
            value={simPlatform}
            onChange={(e) =>
              setSimPlatform(e.target.value as "INSTAGRAM" | "YOUTUBE")
            }
            aria-label="Simulated Platform"
            className="bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white shrink-0 focus:outline-none"
          >
            <option value="INSTAGRAM">Instagram 9:16</option>
            <option value="YOUTUBE">YouTube 16:9</option>
          </select>

          <input
            type="text"
            placeholder="@handle"
            value={simAuthor}
            onChange={(e) => setSimAuthor(e.target.value)}
            className="w-full sm:w-32 bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white shrink-0 focus:outline-none"
          />

          <input
            type="text"
            placeholder="Incoming viewer comment..."
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            className="flex-1 bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
          />

          <button
            type="submit"
            disabled={simulating || !simText.trim()}
            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold shrink-0 transition"
          >
            {simulating ? "Ingesting..." : "Ingest"}
          </button>
        </form>
      </div>

      {/* Filter Bar & Batch Reply Action */}
      {viewMode === "PRAYER_QUEUE" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
            {[
              { id: "ALL", label: `All (${prayers.length})` },
              { id: "OPEN", label: `Needs Reply (${openPrayersCount})` },
              {
                id: "INSTAGRAM",
                label: `Instagram (${
                  prayers.filter((p) => p.platform === "INSTAGRAM").length
                })`,
              },
              {
                id: "YOUTUBE",
                label: `YouTube (${
                  prayers.filter((p) => p.platform === "YOUTUBE").length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlatformFilter(f.id as any)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                  platformFilter === f.id
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {openPrayersCount > 1 && (
              <button
                type="button"
                disabled={batchReplying}
                onClick={handleReplyAllOpen}
                className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
              >
                {batchReplying
                  ? "Dispatching..."
                  : `Reply All Open (${openPrayersCount})`}
              </button>
            )}
            <button
              type="button"
              onClick={loadLiveQueue}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-[11px] font-medium transition"
            >
              Sync
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: PRAYER QUEUE (SEPARATED INTO NEEDS REPLY vs REPLIED) */}
      {viewMode === "PRAYER_QUEUE" ? (
        <div className="space-y-5 max-h-[560px] overflow-y-auto pr-1">
          {filteredPrayers.length === 0 && (
            <div className="text-center py-10 text-xs text-zinc-500">
              No prayer requests in this filter.
            </div>
          )}

          {/* PRIORITY SECTION: OPEN PRAYERS AWAITING PLATFORM REPLY */}
          {openFilteredPrayers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-400">
                <span>
                  Needs Pastoral Reply · {openFilteredPrayers.length} Pending
                </span>
                <span>Platform-Locked Dispatch</span>
              </div>

              {openFilteredPrayers.map((p) => {
                const isIG = p.platform === "INSTAGRAM";
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-4 bg-[#151113] border border-rose-500/35 ${
                      isIG
                        ? "border-l-4 border-l-pink-400"
                        : "border-l-4 border-l-rose-500"
                    } space-y-3`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            isIG
                              ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isIG ? "INSTAGRAM 9:16" : "YOUTUBE 16:9"}
                        </span>

                        <span className="font-semibold text-sm text-white">
                          {p.requesterHandle || p.requesterName}
                        </span>

                        {p.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                            {p.category}
                          </span>
                        )}

                        {p.urgency === "HIGH" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            URGENT
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                        Needs Reply
                      </span>
                    </div>

                    <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 text-xs text-zinc-200 leading-relaxed">
                      &ldquo;{p.requestText}&rdquo;
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">
                          Routes directly to{" "}
                          <strong className="text-white">
                            {isIG ? "Instagram Live" : "YouTube Live"}
                          </strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAiRedraft(p)}
                          disabled={draftingAiId === p.id}
                          className="text-[11px] font-medium text-zinc-300 hover:text-white underline underline-offset-4 transition"
                        >
                          {draftingAiId === p.id
                            ? "Drafting..."
                            : "Regenerate Draft"}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <textarea
                          rows={2}
                          value={replyDrafts[p.id] ?? p.aiDraftedResponse ?? ""}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                        />

                        <button
                          type="button"
                          disabled={sendingReplyId === p.id}
                          onClick={() => handleSendPlatformReply(p)}
                          className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition"
                        >
                          {sendingReplyId === p.id
                            ? "Sending..."
                            : isIG
                            ? "Reply on Instagram"
                            : "Reply on YouTube"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* COMPLETED SECTION: REPLIED & PRAYED */}
          {repliedFilteredPrayers.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                <span>
                  Replied &amp; Covered ({repliedFilteredPrayers.length})
                </span>
                <span className="text-zinc-500 font-normal normal-case">
                  Verified Platform Delivery
                </span>
              </div>

              {repliedFilteredPrayers.map((p) => {
                const isIG = p.platform === "INSTAGRAM";
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl p-3.5 bg-[#0e1512] border border-emerald-500/25 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-emerald-400 text-black flex items-center justify-center text-[11px] font-bold shrink-0">
                          ✓
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {p.requesterHandle || p.requesterName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {isIG ? "IG" : "YT"}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Replied on {p.repliedPlatform || p.platform}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-1">
                      Request: &ldquo;{p.requestText}&rdquo;
                    </p>

                    {p.replySentText && (
                      <div className="text-[11px] text-emerald-200 bg-black/30 rounded-xl px-3 py-2 border border-emerald-500/20">
                        Sent: {p.replySentText}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: LIVE INCOMING CHAT FEED */
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {chatMessages.map((msg) => {
            const isIG = msg.platform === "INSTAGRAM";
            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  msg.isPrayerRequest
                    ? "bg-[#0e1512] border-emerald-500/30"
                    : "bg-[#09090b] border-white/[0.08]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isIG
                          ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {isIG ? "IG" : "YT"}
                    </span>

                    <span className="font-semibold text-white">
                      {msg.authorHandle || msg.authorName}
                    </span>

                    {msg.autoPulledToQueue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Auto-Pulled to Queue
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-200 leading-relaxed">{msg.text}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {msg.autoPulledToQueue ? (
                    <button
                      type="button"
                      onClick={() => setViewMode("PRAYER_QUEUE")}
                      className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black text-[11px] font-medium transition"
                    >
                      View in Queue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleManualPull(msg.id)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] text-[11px] font-medium transition"
                    >
                      + Pull to Queue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Loader2,
  Plus,
  Filter,
  CornerDownRight,
  RefreshCw,
} from "lucide-react";
import { YouTubeIcon, InstagramIcon } from "@/components/Icons";

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
    setTimeout(() => setToast(null), 3500);
  };

  const loadLiveQueue = async () => {
    try {
      const res = await fetch("/api/live-chat", { cache: "no-store" });
      const data = await res.json();
      if (data.prayers) {
        setPrayers(data.prayers);
        if (onPrayerCountChange) onPrayerCountChange(data.prayers);

        // Initialize reply drafts for open prayers
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

  // Send platform-intelligent reply (IG -> IG only, YT -> YT only)
  const handleSendPlatformReply = async (prayer: any) => {
    const replyText = (replyDrafts[prayer.id] || "").trim();
    if (!replyText) return;

    const targetPlatform: "INSTAGRAM" | "YOUTUBE" =
      prayer.platform === "INSTAGRAM" ? "INSTAGRAM" : "YOUTUBE";

    setSendingReplyId(prayer.id);
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
      showToast(
        `Reply routed directly to ${
          targetPlatform === "INSTAGRAM" ? "Instagram Live" : "YouTube Live"
        } for ${prayer.requesterHandle || prayer.requesterName}!`
      );
      loadLiveQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReplyId(null);
    }
  };

  // Generate personalized AI prayer response with Gemini
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
          prayer.requesterHandle &&
          !data.reply.includes(prayer.requesterHandle)
            ? `${prayer.requesterHandle} `
            : "";
        setReplyDrafts((prev) => ({
          ...prev,
          [prayer.id]: `${handlePrefix}${data.reply}`,
        }));
        showToast("AI drafted a personal pastoral reply!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingAiId(null);
    }
  };

  // Simulate / Receive Incoming Viewer Chat Message -> Auto-Pulls if Prayer Request
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
          `⚡ Auto-Pulled Prayer Request from ${
            payloadPlatform === "INSTAGRAM" ? "Instagram" : "YouTube"
          } (${payloadAuthor}) into Prayer Queue!`
        );
      } else {
        showToast(
          `New ${payloadPlatform} chat message received from ${payloadAuthor}`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  // Manual Pull to Prayer Queue from Chat Stream
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
      showToast("Pulled message into Prayer Queue for platform reply!");
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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-lg">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3" /> AUTO-DETECT ACTIVE
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Intelligent Prayer Auto-Queue & Platform Reply Router
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatically detects prayer requests from YouTube & Instagram Live chat, pulls them into the queue, and routes your reply back to the exact source platform.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("PRAYER_QUEUE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === "PRAYER_QUEUE"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Prayer Queue ({openPrayersCount} Open)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("LIVE_FEED")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === "LIVE_FEED"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Incoming Chat ({chatMessages.length})</span>
          </button>
        </div>
      </div>

      {/* Incoming Chat Simulator / Live Test Bar */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Test / Simulate Incoming Viewer Chat (Auto-Pulls Prayer Requests):
          </span>

          {/* 1-Click Quick Test Samples */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleIncomingChatSubmit(undefined, {
                  platform: "INSTAGRAM",
                  author: "@sarah_lim_ig",
                  text: "Please pray for my father in hospital right now, doctors are running heart tests 🙏",
                })
              }
              className="text-[10px] px-2 py-1 rounded-lg bg-pink-950/70 hover:bg-pink-900/80 text-pink-300 border border-pink-700/50 font-semibold transition"
            >
              + Test IG Prayer (@sarah_lim_ig)
            </button>
            <button
              type="button"
              onClick={() =>
                handleIncomingChatSubmit(undefined, {
                  platform: "YOUTUBE",
                  author: "@BrotherMarcus",
                  text: "Please pray for my family and financial breakthrough this month!",
                })
              }
              className="text-[10px] px-2 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-700/50 font-semibold transition"
            >
              + Test YT Prayer (@BrotherMarcus)
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
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shrink-0"
          >
            <option value="INSTAGRAM">📸 From Instagram</option>
            <option value="YOUTUBE">▶️ From YouTube</option>
          </select>

          <input
            type="text"
            placeholder="@viewer_handle"
            value={simAuthor}
            onChange={(e) => setSimAuthor(e.target.value)}
            className="w-full sm:w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white shrink-0"
          />

          <input
            type="text"
            placeholder="Type incoming viewer comment (e.g. 'Please pray for my healing...')..."
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />

          <button
            type="submit"
            disabled={simulating || !simText.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shrink-0 transition"
          >
            {simulating ? "Receiving..." : "Receive Chat"}
          </button>
        </form>
      </div>

      {/* Filter Bar for Prayer Queue */}
      {viewMode === "PRAYER_QUEUE" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All Prayers (${prayers.length})` },
              { id: "OPEN", label: `Needs Reply (${openPrayersCount})` },
              {
                id: "INSTAGRAM",
                label: `📸 Instagram (${
                  prayers.filter((p) => p.platform === "INSTAGRAM").length
                })`,
              },
              {
                id: "YOUTUBE",
                label: `▶️ YouTube (${
                  prayers.filter((p) => p.platform === "YOUTUBE").length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlatformFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  platformFilter === f.id
                    ? "bg-slate-200 text-slate-900"
                    : "bg-slate-800/70 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadLiveQueue}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>
      )}

      {/* VIEW 1: AUTO-PULLED PRAYER QUEUE WITH PLATFORM-LOCKED REPLY */}
      {viewMode === "PRAYER_QUEUE" ? (
        <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
          {filteredPrayers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No prayer requests in this filter yet.
            </div>
          ) : (
            filteredPrayers.map((p) => {
              const isIG = p.platform === "INSTAGRAM";
              const isPrayed = p.status === "PRAYED";

              return (
                <div
                  key={p.id}
                  className={`rounded-xl p-4 border transition space-y-3 ${
                    isPrayed
                      ? "bg-slate-950/50 border-emerald-800/40"
                      : isIG
                      ? "bg-gradient-to-r from-pink-950/20 via-slate-900 to-slate-900 border-pink-500/40"
                      : "bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900 border-red-500/40"
                  }`}
                >
                  {/* Top Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Source Platform Badge */}
                      {isIG ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                          <InstagramIcon className="w-3 h-3 text-pink-400" />
                          <span>INSTAGRAM LIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                          <YouTubeIcon className="w-3 h-3 text-red-400" />
                          <span>YOUTUBE LIVE</span>
                        </span>
                      )}

                      <span className="font-bold text-sm text-white">
                        {p.requesterHandle || p.requesterName}
                      </span>

                      {p.autoDetected && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                          ⚡ Auto-Pulled
                        </span>
                      )}

                      {p.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {p.category}
                        </span>
                      )}

                      {p.urgency === "HIGH" && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          <AlertTriangle className="w-3 h-3" /> URGENT
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        isPrayed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {isPrayed
                        ? `✓ REPLIED ON ${p.repliedPlatform || p.platform}`
                        : "● NEEDS REPLY"}
                    </span>
                  </div>

                  {/* Viewer's Original Prayer Request */}
                  <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 text-xs text-slate-200 leading-relaxed">
                    &ldquo;{p.requestText}&rdquo;
                  </div>

                  {/* If already replied, show sent reply summary */}
                  {isPrayed && p.replySentText && (
                    <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-2.5 text-xs text-emerald-200 flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-bold uppercase text-emerald-400">
                          Sent directly to {p.repliedPlatform || p.platform} Chat:
                        </div>
                        <p className="mt-0.5">{p.replySentText}</p>
                      </div>
                    </div>
                  )}

                  {/* Platform-Locked Reply Box */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          Smart Reply routed to{" "}
                          <strong
                            className={
                              isIG ? "text-pink-400" : "text-red-400"
                            }
                          >
                            {isIG ? "Instagram Live Only" : "YouTube Live Only"}
                          </strong>
                          :
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAiRedraft(p)}
                        disabled={draftingAiId === p.id}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold"
                      >
                        {draftingAiId === p.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Drafting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>AI Personalize Reply</span>
                          </>
                        )}
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
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />

                      <button
                        type="button"
                        disabled={sendingReplyId === p.id}
                        onClick={() => handleSendPlatformReply(p)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shrink-0 shadow-lg transition ${
                          isIG
                            ? "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-600/25"
                            : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-600/25"
                        }`}
                      >
                        {sendingReplyId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isIG ? (
                          <InstagramIcon className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <YouTubeIcon className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>
                          {isPrayed
                            ? isIG
                              ? "Resend to IG"
                              : "Resend to YT"
                            : isIG
                            ? "Reply to Instagram"
                            : "Reply to YouTube"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW 2: LIVE INCOMING CHAT FEED FROM BOTH PLATFORMS */
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {chatMessages.map((msg) => {
            const isIG = msg.platform === "INSTAGRAM";
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  msg.isPrayerRequest
                    ? "bg-emerald-950/20 border-emerald-600/40"
                    : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isIG ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        <InstagramIcon className="w-3 h-3 text-pink-400" />
                        IG
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        <YouTubeIcon className="w-3 h-3 text-red-400" />
                        YT
                      </span>
                    )}

                    <span className="font-bold text-white">
                      {msg.authorHandle || msg.authorName}
                    </span>

                    {msg.autoPulledToQueue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        ⚡ Auto-Pulled to Prayer Queue
                      </span>
                    )}

                    {msg.replied && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                        ✓ Replied on {msg.platform}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-200 leading-relaxed">{msg.text}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {msg.autoPulledToQueue ? (
                    <button
                      type="button"
                      onClick={() => setViewMode("PRAYER_QUEUE")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition"
                    >
                      Open in Prayer Queue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleManualPull(msg.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
                    >
                      + Pull to Prayer Queue
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

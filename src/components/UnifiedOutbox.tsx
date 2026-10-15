"use client";

import { useState } from "react";

interface BroadcastItem {
  id: string;
  content: string;
  target: string;
  status: string;
  sentAt: string;
}

interface UnifiedOutboxProps {
  messageContent: string;
  onChangeContent: (text: string) => void;
  onBroadcastSuccess?: () => void;
  recentMessages?: BroadcastItem[];
  sessionId?: string;
}

export default function UnifiedOutbox({
  messageContent,
  onChangeContent,
  onBroadcastSuccess,
  recentMessages = [],
  sessionId,
}: UnifiedOutboxProps) {
  const [targetPlatform, setTargetPlatform] = useState<
    "BOTH" | "YOUTUBE" | "INSTAGRAM"
  >("BOTH");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "simulated";
    text: string;
  } | null>(null);
  const [localMessages, setLocalMessages] = useState<BroadcastItem[]>([]);

  const handleBroadcast = async () => {
    const trimmed = messageContent.trim();
    if (!trimmed) return;

    setSending(true);
    setFeedback(null);

    // Optimistic log insertion for immediate operator feedback
    const optimisticMsg: BroadcastItem = {
      id: `bc-opt-${Date.now()}`,
      content: trimmed,
      target: targetPlatform,
      status: "SENT",
      sentAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [optimisticMsg, ...prev]);
    onChangeContent("");

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          target: targetPlatform,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to broadcast");
      }

      const isSimulated =
        data.results?.youtube?.status === "SIMULATED" ||
        data.results?.instagram?.status === "SIMULATED";

      setFeedback({
        type: isSimulated ? "simulated" : "success",
        text: isSimulated
          ? "Dispatched in Simulation Mode (Live API keys not linked)"
          : `Dispatched live to ${
              targetPlatform === "BOTH" ? "YouTube & Instagram" : targetPlatform
            }`,
      });

      if (onBroadcastSuccess) onBroadcastSuccess();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to send message",
      });
    } finally {
      setSending(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleBroadcast();
    }
  };

  const mergedMessages = [
    ...localMessages.filter(
      (lm) => !recentMessages.some((rm) => rm.content === lm.content)
    ),
    ...recentMessages,
  ];

  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
      {/* Header & Apple Segmented Target Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Manual Chat Dispatch
          </span>
          <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
            Unified Live Stream Outbox
          </h2>
        </div>

        {/* Apple Segmented Control for Target Platform */}
        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
          {(
            [
              { id: "BOTH", label: "Both Streams" },
              { id: "YOUTUBE", label: "YouTube 16:9" },
              { id: "INSTAGRAM", label: "Instagram 9:16" },
            ] as const
          ).map((plat) => (
            <button
              key={plat.id}
              type="button"
              onClick={() => setTargetPlatform(plat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                targetPlatform === plat.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {plat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Composer Box */}
      <div className="space-y-3">
        <textarea
          rows={3}
          value={messageContent}
          onChange={(e) => onChangeContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type scripture, announcement, or call-to-action... (Ctrl+Enter to dispatch)"
          className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition resize-none leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-3 tabular-nums">
            <span
              className={
                messageContent.length > 200 ? "text-amber-400 font-medium" : ""
              }
            >
              {messageContent.length} / 200 chars
            </span>
            <span className="hidden sm:inline text-zinc-500">
              Shortcut: <kbd className="font-mono text-zinc-300">Ctrl+Enter</kbd>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {messageContent && (
              <button
                type="button"
                onClick={() => onChangeContent("")}
                className="px-3 py-1.5 rounded-full text-xs text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.08] transition"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              disabled={sending || !messageContent.trim()}
              onClick={handleBroadcast}
              className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold transition"
            >
              {sending
                ? "Dispatching..."
                : targetPlatform === "BOTH"
                ? "Dispatch to Both Streams"
                : `Dispatch to ${targetPlatform}`}
            </button>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-between border ${
            feedback.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <span>{feedback.text}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-75">
            Confirmed
          </span>
        </div>
      )}

      {/* Recent Dispatched Broadcasts */}
      {mergedMessages.length > 0 && (
        <div className="border-t border-white/[0.08] pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            <span>Recent Dispatched Messages</span>
            <span className="tabular-nums">{mergedMessages.length} Logged</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {mergedMessages.slice(0, 10).map((msg) => (
              <div
                key={msg.id}
                className="bg-[#09090b] border border-white/[0.06] rounded-2xl p-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-zinc-200 leading-relaxed line-clamp-2">
                    {msg.content}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 tabular-nums">
                    <span>
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-zinc-400">{msg.target}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onChangeContent(msg.content)}
                  className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 text-[10px] font-medium border border-white/[0.08] shrink-0 transition"
                >
                  Reuse
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

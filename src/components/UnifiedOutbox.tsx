"use client";

import { useState } from "react";
import { Send, Check, AlertCircle, Clock, Trash2, Sparkles } from "lucide-react";
import { YouTubeIcon, InstagramIcon } from "@/components/Icons";

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
  // Target platforms state
  const [sendToYT, setSendToYT] = useState(true);
  const [sendToIG, setSendToIG] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "simulated";
    text: string;
  } | null>(null);

  // Compute target string
  const getTarget = () => {
    if (sendToYT && sendToIG) return "BOTH";
    if (sendToYT) return "YOUTUBE";
    if (sendToIG) return "INSTAGRAM";
    return "NONE";
  };

  const handleBroadcast = async () => {
    if (!messageContent.trim()) return;
    const target = getTarget();
    if (target === "NONE") {
      setFeedback({
        type: "error",
        text: "Please select at least one platform (YouTube or Instagram).",
      });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent,
          target,
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
          ? "Broadcast sent in Test/Simulation Mode (Live keys not yet linked)."
          : "Successfully broadcasted live to selected platforms!",
      });

      // Clear input
      onChangeContent("");
      if (onBroadcastSuccess) onBroadcastSuccess();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to send message",
      });
    } finally {
      setSending(false);
      // Auto-hide feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleBroadcast();
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Target Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Unified Live Chat Outbox</span>
          </h2>
          <p className="text-xs text-slate-400">
            Send words, scriptures, announcements, and lyrics to both chats at once.
          </p>
        </div>

        {/* Platform Targets Checkboxes */}
        <div className="flex items-center gap-2">
          {/* YouTube Toggle */}
          <button
            type="button"
            onClick={() => setSendToYT(!sendToYT)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              sendToYT
                ? "bg-red-950/60 border-red-600 text-red-300 shadow-sm"
                : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-400"
            }`}
          >
            <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube</span>
            {sendToYT && <Check className="w-3 h-3 text-red-400" />}
          </button>

          {/* Instagram Toggle */}
          <button
            type="button"
            onClick={() => setSendToIG(!sendToIG)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              sendToIG
                ? "bg-pink-950/60 border-pink-600 text-pink-300 shadow-sm"
                : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-400"
            }`}
          >
            <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
            <span>Instagram</span>
            {sendToIG && <Check className="w-3 h-3 text-pink-400" />}
          </button>
        </div>
      </div>

      {/* Input Box Area */}
      <div className="relative">
        <textarea
          rows={3}
          value={messageContent}
          onChange={(e) => onChangeContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message, sermon notes, lyrics, or select a preset below... (Ctrl+Enter to send)"
          className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
        />

        {/* Character Counter & Bottom Toolbar */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
          <div className="flex items-center gap-3">
            <span>
              {messageContent.length} characters
              {messageContent.length > 200 && (
                <span className="text-amber-400 ml-1">
                  (YouTube recommended &lt; 200)
                </span>
              )}
            </span>
            <span className="hidden sm:inline text-slate-500">
              Shortcut: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">Ctrl+Enter</kbd>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {messageContent && (
              <button
                type="button"
                onClick={() => onChangeContent("")}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              disabled={sending || !messageContent.trim()}
              onClick={handleBroadcast}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sending
                  ? "Broadcasting..."
                  : sendToYT && sendToIG
                  ? "Broadcast to Both"
                  : sendToYT
                  ? "Send to YouTube"
                  : "Send to Instagram"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 transition ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
              : feedback.type === "simulated"
              ? "bg-amber-950/60 border border-amber-800 text-amber-300"
              : "bg-red-950/60 border border-red-800 text-red-300"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Recent Sent Broadcasts Log */}
      {recentMessages.length > 0 && (
        <div className="border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent Service Broadcasts
            </span>
            <span className="text-[11px] text-slate-500">
              {recentMessages.length} sent
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentMessages.slice(0, 10).map((msg) => (
              <div
                key={msg.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-2.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex-1">
                  <p className="text-slate-200 line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-300">
                      {msg.target}
                    </span>
                    {msg.status === "SIMULATED" && (
                      <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded text-[10px]">
                        Test Mode
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {(msg.target === "BOTH" || msg.target === "YOUTUBE") && (
                    <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {(msg.target === "BOTH" || msg.target === "INSTAGRAM") && (
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

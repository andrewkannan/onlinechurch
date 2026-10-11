"use client";

import { useState } from "react";
import { Flame, Sparkles, Send, ArrowRight, Loader2, Shield, Heart, Key, Cross } from "lucide-react";

interface PropheticDeckProps {
  onPushToOutbox: (text: string) => void;
  onInstantBroadcast: (text: string) => void;
}

export default function PropheticDeck({
  onPushToOutbox,
  onInstantBroadcast,
}: PropheticDeckProps) {
  const [keyword, setKeyword] = useState("");
  const [sparking, setSparking] = useState(false);
  const [generatedDecrees, setGeneratedDecrees] = useState<string[]>([]);

  // Anointed preset declarations
  const propheticCategories = [
    {
      title: "🩸 Healing & Wholeness",
      icon: <Heart className="w-3.5 h-3.5 text-red-400" />,
      decrees: [
        "🩸 By His stripes you ARE healed! Place your hand where you need healing and receive God's restorative touch right now! 🙌",
        "🩸 We break the power of sickness and infirmity in Jesus' mighty name! Life and strength be restored to your body! ✨",
      ],
    },
    {
      title: "🚪 Breakthrough & Provision",
      icon: <Key className="w-3.5 h-3.5 text-amber-400" />,
      decrees: [
        "🚪 We decree and declare supernatural open doors, debt cancellation, and divine favor over your household in Jesus' name! 🔑",
        "🚪 What the enemy meant for evil, God is turning around for your good right now! Type AMEN if you receive this! 🙌",
      ],
    },
    {
      title: "🕊️ Peace & Deliverance",
      icon: <Shield className="w-3.5 h-3.5 text-sky-400" />,
      decrees: [
        "🕊️ The peace of God which surpasses all understanding guards your heart and mind right now! Fear, anxiety, and depression must GO! ✝️",
        "🕊️ God has not given you a spirit of fear, but of power, love, and a sound mind! Receive His deep peace today! ✨",
      ],
    },
    {
      title: "✝️ Salvation & Surrender",
      icon: <Cross className="w-3.5 h-3.5 text-emerald-400" />,
      decrees: [
        "✝️ God's presence is in your room right now. If you want to surrender your life to Jesus today, type 'JESUS' in the chat! We welcome you! ❤️",
        "✝️ You are not here by accident! Jesus loves you with an everlasting love. Today is your day of salvation! 🌟",
      ],
    },
  ];

  const handleSparkDecrees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSparking(true);

    try {
      const res = await fetch("/api/ai/prophetic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: keyword }),
      });
      const data = await res.json();
      if (data.decrees) {
        setGeneratedDecrees(data.decrees);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSparking(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Prophetic Flow & Faith Declarations
            </h3>
            <span className="text-[10px] text-slate-400">
              Release faith decrees into the chat as the Spirit moves
            </span>
          </div>
        </div>
      </div>

      {/* AI Prophetic Spark Engine */}
      <div className="bg-gradient-to-r from-red-950/30 to-amber-950/20 border border-red-900/40 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Prophetic Spark (Live Anointing Assistance)</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-2.5">
          Type what Pastor is ministering on (e.g. <em>"peace in grief"</em>, <em>"anointing for youth"</em>) to generate instant decrees:
        </p>

        <form onSubmit={handleSparkDecrees} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Healing, Freedom, Financial Breakthrough..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={sparking || !keyword.trim()}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm shadow-red-600/30 transition disabled:opacity-50"
          >
            {sparking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Flame className="w-3.5 h-3.5" />
            )}
            <span>Spark</span>
          </button>
        </form>

        {/* Generated Decrees */}
        {generatedDecrees.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-red-900/40 pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">
              Fresh Anointed Decrees (Tap to Blast):
            </span>
            {generatedDecrees.map((decree, i) => (
              <div
                key={i}
                className="bg-slate-900/90 border border-red-800/50 rounded-lg p-2.5 flex items-center justify-between gap-2"
              >
                <p className="text-xs text-slate-200 leading-snug flex-1">
                  {decree}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onPushToOutbox(decree)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Load into outbox"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onInstantBroadcast(decree)}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md shadow-sm transition"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>Blast</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anointed Categorized Cards */}
      <div className="space-y-3">
        {propheticCategories.map((cat, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-750 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              {cat.icon}
              <span>{cat.title}</span>
            </div>
            <div className="space-y-1.5">
              {cat.decrees.map((d, dIdx) => (
                <div
                  key={dIdx}
                  className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 rounded-lg p-2 text-xs text-slate-200 flex items-center justify-between gap-2 group transition"
                >
                  <span className="line-clamp-2 leading-relaxed flex-1">
                    {d}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onPushToOutbox(d)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
                      title="Edit in Outbox"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onInstantBroadcast(d)}
                      className="bg-slate-700 hover:bg-red-600 text-white text-[11px] font-medium py-1 px-2 rounded transition"
                      title="Blast to live chats"
                    >
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

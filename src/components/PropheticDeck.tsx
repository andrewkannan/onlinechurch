"use client";

import { useState } from "react";

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
  const [activeCategory, setActiveCategory] = useState<number>(0);

  const propheticCategories = [
    {
      title: "Healing & Wholeness",
      code: "HEALING",
      decrees: [
        "By His stripes you ARE healed. Place your hand where you need healing and receive God's restorative touch right now.",
        "We break the power of sickness and infirmity in Jesus' mighty name. Life and strength be restored to your body.",
      ],
    },
    {
      title: "Breakthrough & Provision",
      code: "PROVISION",
      decrees: [
        "We decree and declare supernatural open doors, debt cancellation, and divine favor over your household in Jesus' name.",
        "What the enemy meant for evil, God is turning around for your good right now. Type AMEN in the chat if you receive this.",
      ],
    },
    {
      title: "Peace & Deliverance",
      code: "PEACE",
      decrees: [
        "The peace of God which surpasses all understanding guards your heart and mind right now. Fear and anxiety must leave in Jesus' name.",
        "God has not given you a spirit of fear, but of power, love, and a sound mind. Receive His deep peace today.",
      ],
    },
    {
      title: "Salvation & Surrender",
      code: "ALTAR CALL",
      decrees: [
        "God's presence is in your room right now. If you want to surrender your life to Jesus today, type 'JESUS' in the chat.",
        "You are not here by accident. Jesus loves you with an everlasting love — today is your day of salvation.",
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
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
            MOD-01 · Ministry Declarations
          </span>
        </div>
        <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
          Prophetic Flow &amp; Altar Call Declarations
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Release faith declarations into YouTube and Instagram chat in sync
          with the pulpit.
        </p>
      </div>

      {/* Live Theme Generator */}
      <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">
            Custom Theme Declaration Generator
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            INSTANT DRAFT
          </span>
        </div>

        <form onSubmit={handleSparkDecrees} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter current ministry theme (e.g. Peace in grief, Youth calling)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={sparking || !keyword.trim()}
            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition disabled:opacity-40 shrink-0"
          >
            {sparking ? "Drafting..." : "Generate"}
          </button>
        </form>

        {generatedDecrees.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {generatedDecrees.map((decree, i) => (
              <div
                key={i}
                className="bg-[#121215] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <p className="text-xs text-zinc-200 leading-relaxed flex-1">
                  {decree}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPushToOutbox(decree)}
                    className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onInstantBroadcast(decree)}
                    className="px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
                  >
                    Dispatch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Segmented Pills */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#09090b] p-1.5 rounded-2xl border border-white/[0.08]">
        {propheticCategories.map((cat, idx) => (
          <button
            key={cat.code}
            type="button"
            onClick={() => setActiveCategory(idx)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeCategory === idx
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Active Category Declarations */}
      <div className="space-y-2.5">
        {propheticCategories[activeCategory].decrees.map((d, dIdx) => (
          <div
            key={dIdx}
            className="bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 space-y-3 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                {propheticCategories[activeCategory].code} #{dIdx + 1}
              </span>
              <span className="text-[11px] text-zinc-500">
                YouTube &amp; Instagram
              </span>
            </div>

            <p className="text-xs text-zinc-200 leading-relaxed">{d}</p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => onPushToOutbox(d)}
                className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[11px] font-medium border border-white/[0.08] transition"
              >
                Load in Outbox
              </button>
              <button
                type="button"
                onClick={() => onInstantBroadcast(d)}
                className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
              >
                Dispatch Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

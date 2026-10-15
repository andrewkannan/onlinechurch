"use client";

import { useState } from "react";

interface Preset {
  id: string;
  label: string;
  category: string;
  content: string;
}

interface QuickPresetBarProps {
  presets: Preset[];
  onSelectPreset: (content: string) => void;
  onInstantBroadcast: (content: string) => void;
}

export default function QuickPresetBar({
  presets,
  onSelectPreset,
  onInstantBroadcast,
}: QuickPresetBarProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const categories = [
    { id: "ALL", label: "All Presets" },
    { id: "GREETING", label: "Welcome" },
    { id: "GIVING", label: "Giving" },
    { id: "CONNECT", label: "Connect" },
    { id: "PRAYER", label: "Prayer" },
    { id: "SALVATION", label: "Salvation" },
  ];

  // Clean any leading emojis from seeded database preset text for sleek broadcast display
  const cleanText = (str: string) =>
    str
      .replace(
        /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u,
        ""
      )
      .trim();

  const filteredPresets =
    filterCategory === "ALL"
      ? presets
      : presets.filter((p) => p.category === filterCategory);

  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Standard Broadcast Macros
          </span>
          <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
            One-Tap Ministry Presets
          </h3>
        </div>

        {/* Apple Segmented Category Pills */}
        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08] overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCategory(c.id)}
              className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap transition ${
                filterCategory === c.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPresets.map((preset) => {
          const cleanedLabel = cleanText(preset.label);
          return (
            <div
              key={preset.id}
              className="bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 flex flex-col justify-between gap-3 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white tracking-tight">
                    {cleanedLabel}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04]">
                    {preset.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {preset.content}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onSelectPreset(preset.content)}
                  className="flex-1 py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[11px] font-medium border border-white/[0.08] transition"
                >
                  Load Outbox
                </button>
                <button
                  type="button"
                  onClick={() => onInstantBroadcast(preset.content)}
                  className="py-1.5 px-3.5 rounded-full bg-white text-black hover:bg-zinc-200 text-[11px] font-semibold transition"
                >
                  Dispatch
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

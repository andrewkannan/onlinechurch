"use client";

import { useState } from "react";
import { Sparkles, Send, Copy, Plus } from "lucide-react";

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
    { id: "GREETING", label: "👋 Welcome" },
    { id: "GIVING", label: "💳 Giving" },
    { id: "CONNECT", label: "📝 Connect" },
    { id: "PRAYER", label: "🙏 Prayer" },
    { id: "SALVATION", label: "✝️ Salvation" },
  ];

  const filteredPresets =
    filterCategory === "ALL"
      ? presets
      : presets.filter((p) => p.category === filterCategory);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            1-Click Ministry Presets
          </h3>
          <span className="text-[11px] text-slate-400">
            (Tap to load in outbox or blast immediately)
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                filterCategory === c.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="group bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3 flex flex-col justify-between transition shadow-sm"
          >
            <div>
              <div className="font-semibold text-xs text-white mb-1">
                {preset.label}
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {preset.content}
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-700/40">
              <button
                onClick={() => onSelectPreset(preset.content)}
                className="flex-1 flex items-center justify-center gap-1 bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs py-1.5 px-2 rounded-lg font-medium transition"
              >
                <Copy className="w-3 h-3" />
                <span>Load in Outbox</span>
              </button>
              <button
                onClick={() => onInstantBroadcast(preset.content)}
                className="flex items-center justify-center gap-1 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs py-1.5 px-2.5 rounded-lg font-medium transition shadow-sm shadow-indigo-600/30"
                title="Broadcast immediately to selected platforms"
              >
                <Send className="w-3 h-3" />
                <span>Blast</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

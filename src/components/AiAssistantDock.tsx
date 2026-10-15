"use client";

import { useState } from "react";

interface AiAssistantDockProps {
  onPushToOutbox: (text: string) => void;
  onInstantBroadcast: (text: string) => void;
  prayers?: Array<{ id: string; requesterName: string; requestText: string }>;
}

export default function AiAssistantDock({
  onPushToOutbox,
  onInstantBroadcast,
}: AiAssistantDockProps) {
  const [activeTab, setActiveTab] = useState<
    "SCRIPTURE" | "PRAYER" | "QUESTIONS"
  >("SCRIPTURE");

  // Scripture state
  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState("NIV");
  const [scriptureResult, setScriptureResult] = useState<string | null>(null);
  const [loadingScripture, setLoadingScripture] = useState(false);

  // Prayer triage state
  const [prayerName, setPrayerName] = useState("");
  const [prayerNeed, setPrayerNeed] = useState("");
  const [prayerReplyResult, setPrayerReplyResult] = useState<string | null>(
    null
  );
  const [loadingPrayer, setLoadingPrayer] = useState(false);

  // Questions state
  const [sermonTopic, setSermonTopic] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const handleLookupScripture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;
    setLoadingScripture(true);
    setScriptureResult(null);

    try {
      const res = await fetch("/api/ai/scripture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, translation }),
      });
      const data = await res.json();
      if (data.text) {
        setScriptureResult(data.text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScripture(false);
    }
  };

  const handleDraftPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerNeed.trim()) return;
    setLoadingPrayer(true);
    setPrayerReplyResult(null);

    try {
      const res = await fetch("/api/ai/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: prayerName || "Friend",
          requestText: prayerNeed,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setPrayerReplyResult(data.reply);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrayer(false);
    }
  };

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sermonTopic.trim()) return;
    setLoadingQuestions(true);

    try {
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: sermonTopic }),
      });
      const data = await res.json();
      if (data.questions) {
        setGeneratedQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
      {/* Header & Apple Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
              MOD-01 · Scripture &amp; Pastoral Desk
            </span>
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
            Live Scripture Formatter &amp; Discussion Prompts
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-full border border-white/[0.08] shrink-0">
          {(
            [
              { id: "SCRIPTURE", label: "Scripture" },
              { id: "PRAYER", label: "Pastoral Reply" },
              { id: "QUESTIONS", label: "Discussion" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                activeTab === t.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SCRIPTURE FORMATTER */}
      {activeTab === "SCRIPTURE" && (
        <div className="space-y-4">
          <form onSubmit={handleLookupScripture} className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Scripture Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. John 3:16 or Romans 8:28"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Translation
                </label>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  aria-label="Bible Translation"
                  className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="NIV">NIV</option>
                  <option value="ESV">ESV</option>
                  <option value="NLT">NLT</option>
                  <option value="KJV">KJV</option>
                  <option value="CSB">CSB</option>
                  <option value="NKJV">NKJV</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {["Matthew 14:29-31", "Isaiah 43:2", "Psalm 23:1-4", "Philippians 4:6-7"].map(
                (sampleRef) => (
                  <button
                    key={sampleRef}
                    type="button"
                    onClick={() => setReference(sampleRef)}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] text-[10px] font-medium transition"
                  >
                    {sampleRef}
                  </button>
                )
              )}
            </div>

            <button
              type="submit"
              disabled={loadingScripture || !reference.trim()}
              className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold transition"
            >
              {loadingScripture
                ? "Formatting Scripture..."
                : "Format Scripture for Live Chat"}
            </button>
          </form>

          {scriptureResult && (
            <div className="p-4 bg-[#09090b] border border-white/[0.1] rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-sky-400 uppercase tracking-wider">
                  Formatted Passage
                </span>
                <span className="font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05]">
                  {translation}
                </span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {scriptureResult}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onPushToOutbox(scriptureResult)}
                  className="flex-1 py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
                >
                  Edit in Outbox
                </button>
                <button
                  type="button"
                  onClick={() => onInstantBroadcast(scriptureResult)}
                  className="py-1.5 px-4 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  Dispatch Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASTORAL REPLY DRAFTER */}
      {activeTab === "PRAYER" && (
        <div className="space-y-4">
          <form onSubmit={handleDraftPrayer} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Viewer Name or Handle
              </label>
              <input
                type="text"
                placeholder="e.g. @johndoe"
                value={prayerName}
                onChange={(e) => setPrayerName(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Prayer Request Context
              </label>
              <textarea
                rows={2}
                placeholder="Paste the viewer's prayer request..."
                value={prayerNeed}
                onChange={(e) => setPrayerNeed(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPrayer || !prayerNeed.trim()}
              className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold transition"
            >
              {loadingPrayer
                ? "Drafting Pastoral Response..."
                : "Draft Pastoral Response"}
            </button>
          </form>

          {prayerReplyResult && (
            <div className="p-4 bg-[#09090b] border border-white/[0.1] rounded-2xl space-y-3">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Drafted Pastoral Response
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {prayerReplyResult}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onPushToOutbox(prayerReplyResult)}
                  className="flex-1 py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
                >
                  Edit in Outbox
                </button>
                <button
                  type="button"
                  onClick={() => onInstantBroadcast(prayerReplyResult)}
                  className="py-1.5 px-4 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  Dispatch Reply
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERMON DISCUSSION QUESTIONS */}
      {activeTab === "QUESTIONS" && (
        <div className="space-y-4">
          <form onSubmit={handleGenerateQuestions} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Active Sermon Topic or Title
              </label>
              <input
                type="text"
                placeholder="e.g. Walking in Faith Through the Storm"
                value={sermonTopic}
                onChange={(e) => setSermonTopic(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={loadingQuestions || !sermonTopic.trim()}
              className="w-full py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold transition"
            >
              {loadingQuestions
                ? "Generating Discussion Prompts..."
                : "Generate Audience Discussion Prompts"}
            </button>
          </form>

          {generatedQuestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Select Prompt to Load or Dispatch
              </div>
              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#09090b] border border-white/[0.08] rounded-2xl text-xs text-zinc-200 leading-relaxed flex items-center justify-between gap-3"
                >
                  <span className="flex-1">{q}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPushToOutbox(q)}
                      className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onInstantBroadcast(q)}
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
      )}
    </div>
  );
}

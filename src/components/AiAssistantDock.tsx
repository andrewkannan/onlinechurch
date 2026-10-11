"use client";

import { useState } from "react";
import { BookOpen, Heart, MessageSquare, Send, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface AiAssistantDockProps {
  onPushToOutbox: (text: string) => void;
  onInstantBroadcast: (text: string) => void;
  prayers?: Array<{ id: string; requesterName: string; requestText: string }>;
}

export default function AiAssistantDock({
  onPushToOutbox,
  onInstantBroadcast,
  prayers = [],
}: AiAssistantDockProps) {
  const [activeTab, setActiveTab] = useState<"SCRIPTURE" | "PRAYER" | "QUESTIONS">("SCRIPTURE");

  // Scripture state
  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState("NIV");
  const [scriptureResult, setScriptureResult] = useState<string | null>(null);
  const [loadingScripture, setLoadingScripture] = useState(false);

  // Prayer triage state
  const [prayerName, setPrayerName] = useState("");
  const [prayerNeed, setPrayerNeed] = useState("");
  const [prayerReplyResult, setPrayerReplyResult] = useState<string | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(false);

  // Questions state
  const [sermonTopic, setSermonTopic] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Quick Scripture Lookup handler
  const handleLookupScripture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference) return;
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

  // Prayer Drafter handler
  const handleDraftPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerNeed) return;
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

  // Questions generator handler
  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sermonTopic) return;
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Live AI Ministry Assistant
            </h3>
            <span className="text-[10px] text-slate-400">Powered by Gemini 3.8 Flash</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("SCRIPTURE")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition ${
              activeTab === "SCRIPTURE"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Scripture</span>
          </button>
          <button
            onClick={() => setActiveTab("PRAYER")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition ${
              activeTab === "PRAYER"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Prayer</span>
          </button>
          <button
            onClick={() => setActiveTab("QUESTIONS")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition ${
              activeTab === "QUESTIONS"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Questions</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCRIPTURE FORMATTER */}
      {activeTab === "SCRIPTURE" && (
        <div className="flex-1 flex flex-col justify-between">
          <form onSubmit={handleLookupScripture} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Verse Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. John 3:16 or Rom 8:28"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Translation
                </label>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
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

            <button
              type="submit"
              disabled={loadingScripture || !reference}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 text-xs font-semibold transition"
            >
              {loadingScripture ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Looking up verse with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Format Verse for Live Chat</span>
                </>
              )}
            </button>
          </form>

          {/* Scripture Result Card */}
          {scriptureResult && (
            <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl">
              <div className="text-[11px] font-semibold text-indigo-300 mb-1 flex items-center justify-between">
                <span>Formatted Ready to Send:</span>
                <span className="text-[10px] bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-200">
                  {translation}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-serif italic mb-3">
                {scriptureResult}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPushToOutbox(scriptureResult)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 py-1.5 px-3 rounded-lg font-medium transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Push to Outbox</span>
                </button>
                <button
                  onClick={() => onInstantBroadcast(scriptureResult)}
                  className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white py-1.5 px-3 rounded-lg font-medium transition shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Blast Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRAYER REPLY DRAFTER */}
      {activeTab === "PRAYER" && (
        <div className="flex-1 flex flex-col justify-between">
          <form onSubmit={handleDraftPrayer} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Requester Name / Handle
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe or @johnd"
                value={prayerName}
                onChange={(e) => setPrayerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Prayer Request Posted by Viewer
              </label>
              <textarea
                rows={2}
                placeholder="Paste the prayer request from YouTube or Instagram..."
                value={prayerNeed}
                onChange={(e) => setPrayerNeed(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPrayer || !prayerNeed}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl py-2 text-xs font-semibold transition"
            >
              {loadingPrayer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting Christ-Centered Reply...</span>
                </>
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Draft Empathetic Chat Reply</span>
                </>
              )}
            </button>
          </form>

          {/* Prayer Reply Result */}
          {prayerReplyResult && (
            <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
              <div className="text-[11px] font-semibold text-emerald-300 mb-1">
                Drafted Live Pastoral Response:
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mb-3">
                {prayerReplyResult}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPushToOutbox(prayerReplyResult)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 py-1.5 px-3 rounded-lg font-medium transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Push to Outbox</span>
                </button>
                <button
                  onClick={() => onInstantBroadcast(prayerReplyResult)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white py-1.5 px-3 rounded-lg font-medium transition shadow-md shadow-emerald-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Blast Reply</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERMON DISCUSSION QUESTIONS */}
      {activeTab === "QUESTIONS" && (
        <div className="flex-1 flex flex-col justify-between">
          <form onSubmit={handleGenerateQuestions} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Today's Sermon Topic / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Walking in Faith Through the Storm"
                value={sermonTopic}
                onChange={(e) => setSermonTopic(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loadingQuestions || !sermonTopic}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl py-2 text-xs font-semibold transition"
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sparking Chat Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate Chat Discussion Questions</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Questions List */}
          {generatedQuestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-semibold text-amber-300">
                Tap to drop into outbox:
              </div>
              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => onPushToOutbox(q)}
                  className="p-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 rounded-xl cursor-pointer transition text-xs text-slate-200 leading-snug flex items-center justify-between group"
                >
                  <span>{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

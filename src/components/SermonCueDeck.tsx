"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Send,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Quote,
  Flame,
  Loader2,
  Trash2,
  Edit3,
  ArrowRight,
} from "lucide-react";

export interface SermonCueItem {
  id: string;
  cueType: "MAIN_POINT" | "SCRIPTURE" | "QUOTE" | "PROPHETIC" | "CALL_TO_ACTION";
  label: string;
  content: string;
  sortOrder: number;
  isReleased: boolean;
  releasedAt?: string | null;
}

interface SermonCueDeckProps {
  cues: SermonCueItem[];
  onReleaseCue: (cue: SermonCueItem) => void;
  onPushToOutbox: (content: string) => void;
  onCuesUpdated: () => void;
  sessionId?: string;
}

export default function SermonCueDeck({
  cues,
  onReleaseCue,
  onPushToOutbox,
  onCuesUpdated,
  sessionId,
}: SermonCueDeckProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [translation, setTranslation] = useState("NIV");
  const [parsing, setParsing] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  // Sample notes helper so moderator can test instantly
  const loadSampleNotes = () => {
    setNotesInput(`SERMON: "WALKING THROUGH THE STORM IN FAITH"
SCRIPTURE: Matthew 14:28-31 NIV, Isaiah 43:2

1. FOCUS ON JESUS, NOT THE WAVES
- When Peter looked at the storm, he began to sink. But when his eyes were on Jesus, he walked on water!
- "Your faith is not measured by the absence of storms, but by the presence of your Savior."

2. HE HEARS YOUR CRY IMMEDIATELY
- The moment Peter cried out, Jesus immediately reached out His hand and caught him.
- Prophetic Declaration: God is reaching out into your crisis right now. You will not drown!

3. NEXT STEPS & ALTAR CALL
- Who needs peace today? Drop your prayer request.
- Decision: If you want to accept Jesus as Lord, type 'JESUS' in the chat!`);
  };

  const handleParseNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim()) return;
    setParsing(true);

    try {
      const res = await fetch("/api/sermon-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText: notesInput,
          translation,
          sessionId,
        }),
      });

      const data = await res.json();
      if (data.cues) {
        onCuesUpdated();
        setShowUploadModal(false);
        setNotesInput("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const handleClearCues = async () => {
    if (!confirm("Are you sure you want to clear all sermon cues for this service?")) return;
    try {
      await fetch(`/api/sermon-notes?sessionId=${sessionId || ""}`, {
        method: "DELETE",
      });
      onCuesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = async (cue: SermonCueItem) => {
    setReleasingId(cue.id);
    try {
      await onReleaseCue(cue);
      // Mark as released in DB
      await fetch(`/api/sermon-notes/${cue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReleased: true }),
      });
      onCuesUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setReleasingId(null);
    }
  };

  const releasedCount = cues.filter((c) => c.isReleased).length;

  const getCueIcon = (type: string) => {
    switch (type) {
      case "SCRIPTURE":
        return <BookOpen className="w-3.5 h-3.5 text-blue-400" />;
      case "QUOTE":
        return <Quote className="w-3.5 h-3.5 text-amber-400" />;
      case "PROPHETIC":
        return <Flame className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Pastor's Sermon Cue Deck
            </h2>
            <span className="bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
              1-Click Teleprompter
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-loaded from Pastor's notes. Tap "RELEASE" as Pastor speaks to blast YouTube & Instagram instantly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cues.length > 0 && (
            <button
              onClick={handleClearCues}
              className="text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Clear Cues"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm shadow-indigo-600/30 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{cues.length === 0 ? "Load Pastor's Notes" : "+ Add / Replace Notes"}</span>
          </button>
        </div>
      </div>

      {/* Progress & Quick Stats Bar */}
      {cues.length > 0 && (
        <div className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span>Preaching Progress:</span>
            <span className="font-bold text-white">
              {releasedCount} of {cues.length} Cues Released
            </span>
          </div>
          <div className="w-32 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(releasedCount / cues.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {cues.length === 0 && (
        <div className="py-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <FileText className="w-8 h-8 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">
            No Sermon Cues Loaded Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Paste Pastor's sermon outline or PDF text. Gemini will extract all scriptures, points, and quotes into 1-click cue cards.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-md transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Pastor's Sermon Notes</span>
          </button>
        </div>
      )}

      {/* Sequential Cue Cards List */}
      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {cues.map((cue, idx) => {
          const isNext =
            !cue.isReleased &&
            (idx === 0 || cues[idx - 1]?.isReleased);

          return (
            <div
              key={cue.id}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                cue.isReleased
                  ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                  : isNext
                  ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                  : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
              }`}
            >
              {/* Card Header & Type Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    {getCueIcon(cue.cueType)}
                    <span>{cue.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isNext && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full animate-pulse">
                      Up Next
                    </span>
                  )}
                  {cue.isReleased && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Released</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Message Content Preview */}
              <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                {cue.content}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onPushToOutbox(cue.content)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700/60 transition"
                  title="Load into outbox to edit before sending"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Push to Outbox</span>
                </button>

                <button
                  type="button"
                  disabled={releasingId === cue.id}
                  onClick={() => handleRelease(cue)}
                  className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3.5 rounded-lg shadow-sm transition active:scale-95 ${
                    cue.isReleased
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : isNext
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30"
                      : "bg-indigo-600/80 hover:bg-indigo-600 text-white"
                  }`}
                >
                  {releasingId === cue.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Blasting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{cue.isReleased ? "Re-Blast" : "RELEASE TO ALL"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload / Paste Notes Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Load Pastor's Sermon Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={loadSampleNotes}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg font-medium"
              >
                + Insert Sample Outline
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste the sermon notes text or PDF content below. Gemini 3.8 Flash will automatically extract scriptures, headings, and quotes into structured, 1-click cue cards.
            </p>

            <form onSubmit={handleParseNotes} className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-300 font-medium whitespace-nowrap">
                  Default Translation:
                </label>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="NIV">NIV</option>
                  <option value="ESV">ESV</option>
                  <option value="NLT">NLT</option>
                  <option value="KJV">KJV</option>
                  <option value="CSB">CSB</option>
                  <option value="NKJV">NKJV</option>
                </select>
              </div>

              <div>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste sermon title, scripture references, points, and quotes here..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={parsing || !notesInput.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini Parsing Cues...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Build Cue Deck</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

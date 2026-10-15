"use client";

import { useState } from "react";

export interface SermonCueItem {
  id: string;
  cueType:
    | "MAIN_POINT"
    | "SCRIPTURE"
    | "QUOTE"
    | "PROPHETIC"
    | "CALL_TO_ACTION";
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

const CUE_STYLE: Record<
  string,
  { badge: string; leftBorder: string; code: string }
> = {
  SCRIPTURE: {
    badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    leftBorder: "border-l-4 border-l-sky-400",
    code: "SCRIPTURE",
  },
  QUOTE: {
    badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    leftBorder: "border-l-4 border-l-amber-400",
    code: "KEY QUOTE",
  },
  PROPHETIC: {
    badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    leftBorder: "border-l-4 border-l-rose-400",
    code: "PROPHETIC",
  },
  CALL_TO_ACTION: {
    badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    leftBorder: "border-l-4 border-l-emerald-400",
    code: "ALTAR / CTA",
  },
  MAIN_POINT: {
    badge: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    leftBorder: "border-l-4 border-l-violet-400",
    code: "SERMON POINT",
  },
};

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
  const [localReleasedIds, setLocalReleasedIds] = useState<
    Record<string, boolean>
  >({});

  const loadSampleNotes = () => {
    setNotesInput(`SERMON: "WALKING THROUGH THE STORM IN FAITH"
SCRIPTURE: Matthew 14:28-31 NIV, Isaiah 43:2

1. FOCUS ON JESUS, NOT THE WAVES
- When Peter looked at the storm, he began to sink. But when his eyes were on Jesus, he walked on water.
- "Your faith is not measured by the absence of storms, but by the presence of your Savior."

2. HE HEARS YOUR CRY IMMEDIATELY
- The moment Peter cried out, Jesus immediately reached out His hand and caught him.
- Prophetic Declaration: God is reaching out into your crisis right now. You will not drown.

3. NEXT STEPS & ALTAR CALL
- Who needs peace today? Drop your prayer request in the chat.
- Decision: If you want to accept Jesus as Lord, type 'JESUS' in the chat.`);
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
        setLocalReleasedIds({});
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
    try {
      setLocalReleasedIds({});
      await fetch(`/api/sermon-notes?sessionId=${sessionId || ""}`, {
        method: "DELETE",
      });
      onCuesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Instant optimistic cue release for zero-latency broadcast operation
  const handleRelease = async (cue: SermonCueItem) => {
    setReleasingId(cue.id);
    setLocalReleasedIds((prev) => ({ ...prev, [cue.id]: true }));

    try {
      onReleaseCue(cue);
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

  const enrichedCues = cues.map((c) => ({
    ...c,
    isReleased: c.isReleased || Boolean(localReleasedIds[c.id]),
  }));

  const pendingCues = enrichedCues.filter((c) => !c.isReleased);
  const releasedCues = enrichedCues.filter((c) => c.isReleased);
  const nextCue = pendingCues[0] || null;
  const releasedCount = releasedCues.length;
  const pct =
    enrichedCues.length > 0
      ? Math.round((releasedCount / enrichedCues.length) * 100)
      : 0;

  return (
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
      {/* Header & Primary Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
              MOD-01 · Teleprompter Cue Deck
            </span>
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
            Pastor&apos;s Sermon Cues &amp; Scripture Synchronization
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pending cues stay separated at the top for instant 1-tap release to
            YouTube and Instagram.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {enrichedCues.length > 0 && (
            <button
              type="button"
              onClick={handleClearCues}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-300 border border-white/[0.08] text-xs font-medium transition"
            >
              Reset Deck
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
          >
            {enrichedCues.length === 0 ? "Load Sermon Notes" : "+ Load Notes"}
          </button>
        </div>
      </div>

      {/* Rapid Master "Up Next" Command Bar (Like Pre-Flight Command Bar) */}
      {enrichedCues.length > 0 && (
        <div className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 font-semibold text-lg tabular-nums shrink-0">
              {pct}%
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 tabular-nums">
                <span>
                  {releasedCount} of {enrichedCues.length} Cues Released
                </span>
                <span>·</span>
                <span className="text-zinc-300 font-medium">
                  {pendingCues.length} Pending
                </span>
              </div>
              <div className="text-xs font-semibold text-white truncate mt-0.5">
                {nextCue
                  ? `Up Next: ${nextCue.label}`
                  : "All Sermon Cues Released"}
              </div>
            </div>
          </div>

          {nextCue && (
            <button
              type="button"
              disabled={releasingId === nextCue.id}
              onClick={() => handleRelease(nextCue)}
              className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition"
            >
              {releasingId === nextCue.id
                ? "Releasing..."
                : "Release Next Cue Now"}
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {enrichedCues.length === 0 && (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-white/[0.1] bg-[#09090b] space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Standby · No Cues Loaded
          </div>
          <h3 className="text-sm font-semibold text-white">
            Load Pastor&apos;s Sermon Outline for 1-Tap Broadcast Cues
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Paste the sermon manuscript or outline. The system extracts
            scriptures, main points, and altar call prompts into sequential
            broadcast cards.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
            >
              Load Sermon Outline
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: PENDING CUES (READY FOR RELEASE) */}
      {pendingCues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            <span>Pending Cues ({pendingCues.length} Remaining)</span>
            <span>Tap Release as Pastor Speaks</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {pendingCues.map((cue, idx) => {
              const isNext = idx === 0;
              const style = CUE_STYLE[cue.cueType] || CUE_STYLE.MAIN_POINT;

              return (
                <div
                  key={cue.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                    style.leftBorder
                  } ${
                    isNext
                      ? "bg-[#17171c] border-white/25"
                      : "bg-[#09090b] border-white/[0.08] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] tabular-nums">
                        CUE #{cue.sortOrder || idx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
                      >
                        {style.code}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {cue.label}
                      </span>
                    </div>

                    {isNext && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-semibold uppercase tracking-wider shrink-0">
                        Up Next
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed bg-[#121215] p-3 rounded-xl border border-white/[0.06]">
                    {cue.content}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onPushToOutbox(cue.content)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition"
                    >
                      Edit in Outbox
                    </button>

                    <button
                      type="button"
                      disabled={releasingId === cue.id}
                      onClick={() => handleRelease(cue)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                        isNext
                          ? "bg-white text-black hover:bg-zinc-200"
                          : "bg-white/[0.1] hover:bg-white text-white hover:text-black"
                      }`}
                    >
                      {releasingId === cue.id
                        ? "Releasing..."
                        : "Release to Live Chat"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: COMPLETED / RELEASED CUES */}
      {releasedCues.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
            <span>Released &amp; Broadcasted ({releasedCues.length})</span>
            <span className="text-zinc-500 font-normal normal-case">
              Click Re-Send to post again
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {releasedCues.map((cue) => (
              <div
                key={cue.id}
                className="p-3 rounded-2xl bg-[#0e1512] border border-emerald-500/25 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-emerald-400 text-black flex items-center justify-center text-[11px] font-bold shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {cue.label}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {cue.content}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRelease(cue)}
                  className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] font-medium border border-white/[0.08] shrink-0 transition"
                >
                  Re-Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload / Paste Notes Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                  Manuscript Ingestion
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Load Pastor&apos;s Sermon Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={loadSampleNotes}
                className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.1] text-[11px] font-medium transition"
              >
                + Insert Sample Outline
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste the sermon outline below. Scriptures, main points, and
              prophetic declarations will be structured into sequential 1-tap
              cues.
            </p>

            <form onSubmit={handleParseNotes} className="space-y-4">
              <div className="flex items-center justify-between bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 py-2">
                <label className="text-xs text-zinc-300 font-medium">
                  Default Bible Translation
                </label>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  aria-label="Bible Translation"
                  className="bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="NIV">NIV</option>
                  <option value="ESV">ESV</option>
                  <option value="NLT">NLT</option>
                  <option value="KJV">KJV</option>
                  <option value="CSB">CSB</option>
                  <option value="NKJV">NKJV</option>
                </select>
              </div>

              <textarea
                rows={8}
                required
                placeholder="Paste sermon title, scripture references, main points, and quotes..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.1] rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 font-mono leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={parsing || !notesInput.trim()}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {parsing ? "Extracting Cues..." : "Build Cue Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

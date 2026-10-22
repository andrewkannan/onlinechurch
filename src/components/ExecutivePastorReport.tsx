"use client";

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "online_church_pastor_meeting_notes_v1";

interface MeetingNotesState {
  meetingDate: string;
  attendees: string;
  analyticsRemarks: string;
  completedRemarks: string;
  plan1SystemRemarks: string;
  plan2BudgetRemarks: string;
  approvedBudgetOption: string;
  plan3TrainingRemarks: string;
  generalPastorRemarks: string;
}

const DEFAULT_NOTES: MeetingNotesState = {
  meetingDate: new Date().toISOString().slice(0, 10),
  attendees: "Senior Pastor, Online Service Director, Media & Leadership Team",
  analyticsRemarks: "",
  completedRemarks: "",
  plan1SystemRemarks: "",
  plan2BudgetRemarks: "",
  approvedBudgetOption: "Pending Discussion",
  plan3TrainingRemarks: "",
  generalPastorRemarks: "",
};

export default function ExecutivePastorReport() {
  const [notes, setNotes] = useState<MeetingNotesState>(DEFAULT_NOTES);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setNotes((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const updateNote = (field: keyof MeetingNotesState, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1800);
  };

  const handleClearNotes = () => {
    setNotes(DEFAULT_NOTES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handlePrintWithNotes = () => {
    window.print();
  };

  return (
    <section className="w-full">
      {/* Print-only stylesheet so printing from browser produces a clean Apple-style document with all typed notes */}
      <style jsx global>{`
        @media print {
          nav,
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #1d1d1f !important;
          }
          .apple-report-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Control Bar (Hidden when printing) */}
      <div className="no-print mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-white/[0.1] rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              Senior Pastor &amp; Leadership Meeting Guideline (Apple Executive View)
            </div>
            <div className="text-[11px] text-zinc-400">
              Type your live meeting notes &amp; pastor remarks in any section below — auto-saves in your browser.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedIndicator && (
            <span className="text-[11px] font-medium text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              ✓ Notes Saved
            </span>
          )}

          <a
            href="/Senior_Pastor_Executive_Report.pdf"
            download="Senior_Pastor_Executive_Report.pdf"
            className="px-3.5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>⬇ Download Clean PDF</span>
          </a>

          <button
            type="button"
            onClick={handlePrintWithNotes}
            className="px-3.5 py-2 rounded-full bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>🖨 Print / Save PDF with My Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.1] text-xs font-medium transition"
          >
            {isExpanded ? "Minimize Report" : "Expand Report"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="apple-report-container bg-white text-[#1d1d1f] rounded-3xl p-6 sm:p-10 shadow-2xl border border-zinc-200 space-y-8">
          {/* Apple Minimalist Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#d2d2d7]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0066cc] mb-1">
                Online Service Ministry · Executive Briefing
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1d1d1f]">
                Progress Report &amp; Growth Plan
              </h2>
              <p className="text-sm text-[#6e6e73] mt-1 font-medium">
                Meeting Guideline for Senior Pastor &amp; Leadership Team
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 text-xs text-[#6e6e73] bg-[#f5f5f7] p-3.5 rounded-2xl border border-[#e5e5ea]">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#86868b]">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={notes.meetingDate}
                  onChange={(e) => updateNote("meetingDate", e.target.value)}
                  className="mt-0.5 bg-white border border-[#d2d2d7] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#86868b]">
                  Attendees
                </label>
                <input
                  type="text"
                  value={notes.attendees}
                  onChange={(e) => updateNote("attendees", e.target.value)}
                  placeholder="Senior Pastor, Leaders..."
                  className="mt-0.5 w-full sm:w-64 bg-white border border-[#d2d2d7] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                />
              </div>
            </div>
          </div>

          {/* ==================== 1. LIVESTREAM VIEWER ANALYTICS ==================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h3 className="text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#1d1d1f]">
                1. Livestream Viewer Analytics
              </h3>
              <span className="text-xs font-medium text-[#6e6e73]">
                Existing YouTube baseline vs. adding Instagram Live (past 3 weeks)
              </span>
            </div>

            <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea] space-y-5">
              {/* 3 Big Apple Number Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73]">
                    Before (YouTube Only)
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1d1d1f] my-1.5">
                    10 – 20
                  </div>
                  <div className="text-xs text-[#6e6e73]">
                    Existing weekly viewers on YouTube alone
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#0066cc]">
                    Added via Instagram Live
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0066cc] my-1.5">
                    +5 – 10
                  </div>
                  <div className="text-xs text-[#6e6e73]">
                    Extra weekly viewers (past 3 weeks) · More non-believers joining
                  </div>
                </div>

                <div className="bg-[#1d1d1f] text-white rounded-2xl p-5 border border-[#1d1d1f]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#30d158]">
                    Target Goal (Double Viewers)
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white my-1.5">
                    40+ / wk
                  </div>
                  <div className="text-xs text-[#a1a1a6]">
                    Combined YouTube + IG weekly viewers (2x growth with stable increase)
                  </div>
                </div>
              </div>

              {/* Clean Visual Comparison Bars */}
              <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f]">
                  <span>Weekly Viewer Growth Comparison</span>
                  <span className="text-[#15732b]">Aiming to Double Viewership (40+ Weekly)</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                    <div className="sm:col-span-3 font-semibold text-[#1d1d1f]">
                      Previous (YouTube Only)
                    </div>
                    <div className="sm:col-span-7 h-4 bg-[#f0f0f5] rounded-full overflow-hidden flex">
                      <div className="bg-[#8e8e93] h-full" style={{ width: "38%" }} />
                    </div>
                    <div className="sm:col-span-2 sm:text-right font-bold text-[#1d1d1f]">
                      10 – 20 / wk
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                    <div className="sm:col-span-3 font-semibold text-[#1d1d1f]">
                      Now (YouTube + IG Live)
                    </div>
                    <div className="sm:col-span-7 h-4 bg-[#f0f0f5] rounded-full overflow-hidden flex">
                      <div className="bg-[#0066cc] h-full" style={{ width: "38%" }} />
                      <div className="bg-[#e1306c] h-full" style={{ width: "24%" }} />
                    </div>
                    <div className="sm:col-span-2 sm:text-right font-bold text-[#1d1d1f]">
                      15 – 30 / wk
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                    <div className="sm:col-span-3 font-semibold text-[#1d1d1f]">
                      Target Goal (Next 8 Wks)
                    </div>
                    <div className="sm:col-span-7 h-4 bg-[#f0f0f5] rounded-full overflow-hidden flex">
                      <div
                        className="h-full"
                        style={{
                          width: "100%",
                          background: "linear-gradient(90deg, #0066cc 0%, #30d158 100%)",
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2 sm:text-right font-bold text-[#15732b]">
                      40+ / wk (2x)
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f0f0f5] flex flex-wrap gap-5 text-xs text-[#424245]">
                  <span>
                    • <strong>YouTube:</strong> 10–20 weekly viewers
                  </span>
                  <span>
                    • <strong>Instagram Live (Past 3 Wks):</strong> Added +5–10 weekly viewers (more non-believers, sharper video quality than YouTube)
                  </span>
                  <span>
                    • <strong>Goal:</strong> At least 40 weekly viewers in total (stable weekly increase)
                  </span>
                </div>
              </div>

              {/* Editable Note Box for Section 1 */}
              <div className="bg-white rounded-xl p-3.5 border border-dashed border-[#c7c7cc]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0066cc] mb-1">
                  ✎ Notes &amp; Remarks — Viewer Analytics
                </label>
                <textarea
                  rows={2}
                  value={notes.analyticsRemarks}
                  onChange={(e) => updateNote("analyticsRemarks", e.target.value)}
                  placeholder="Click to add meeting notes or Pastor's feedback on viewer growth..."
                  className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* ==================== 2. WHAT HAS BEEN DONE ==================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h3 className="text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#1d1d1f]">
                2. What Has Been Done (Since Last Meeting)
              </h3>
              <span className="text-xs font-medium text-[#15732b]">
                ✓ All 4 action items completed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item 1 */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    1. Quality Checker on Every Service
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e3f9e8] text-[#15732b] text-[11px] font-bold">
                    ✓ Active Every Sunday
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#424245]">
                  <li>• Added a dedicated Quality Checker for every Sunday service.</li>
                  <li>• Checks audio and video quality live throughout the service.</li>
                  <li>
                    • Reports immediately to the Online Service Director to fix any issue right away.
                  </li>
                </ul>
              </div>

              {/* Item 2 */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    2. Live Streaming on IG (Past 3 Weeks)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e3f9e8] text-[#15732b] text-[11px] font-bold">
                    ✓ +5–10 Viewers / Wk
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#424245]">
                  <li>• Increased weekly viewers by 5–10 extra viewers per week.</li>
                  <li>• More non-believers have joined our service via Instagram.</li>
                  <li>• Video quality on IG is clearer and better than YouTube.</li>
                </ul>
              </div>

              {/* Item 3 */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    3. Cables Replaced — No More Lagging
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e3f9e8] text-[#15732b] text-[11px] font-bold">
                    ✓ Fixed Within Week 1
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#424245]">
                  <li>• Replaced faulty video cables within the first week after last meeting.</li>
                  <li>• Completely solved the video lagging and freezing issue.</li>
                  <li>• Smooth, stable video across the past 3 Sunday services.</li>
                </ul>
              </div>

              {/* Item 4 */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    4. More Interactions from Media Team
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e3f9e8] text-[#15732b] text-[11px] font-bold">
                    ✓ Active on Live Chat
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#424245]">
                  <li>• Media team actively welcomes viewers and interacts in live chat.</li>
                  <li>• Posts key sermon points, scriptures, and prayer responses.</li>
                  <li>• Keeps online viewers engaged throughout the service.</li>
                </ul>
              </div>
            </div>

            {/* Editable Note Box for Section 2 */}
            <div className="bg-[#fafafa] rounded-xl p-3.5 border border-dashed border-[#c7c7cc]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0066cc] mb-1">
                ✎ Notes &amp; Remarks — Completed Updates
              </label>
              <textarea
                rows={2}
                value={notes.completedRemarks}
                onChange={(e) => updateNote("completedRemarks", e.target.value)}
                placeholder="Click to add remarks or discussion points on what has been done..."
                className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* ==================== 3. UPCOMING PLANS, TIMELINE & BUDGET ==================== */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h3 className="text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#1d1d1f]">
                3. Upcoming Plans, Action Timeline &amp; Rough Budget
              </h3>
              <span className="text-xs font-medium text-[#6e6e73]">
                3 focused priorities to reach 40+ weekly viewers
              </span>
            </div>

            {/* UPCOMING PLAN 1 */}
            <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#e5e5ea]">
                <span className="text-base font-bold text-[#1d1d1f]">
                  Plan 1 · Centralised System for Online Service Team
                </span>
                <span className="px-3 py-1 rounded-full bg-[#e8f2ff] text-[#0066cc] text-xs font-bold">
                  Timeline: Week 1 – 2 · Cost: RM 0 (Built In-House)
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-[#424245]">
                <li>
                  • <strong>Role-Based Checklist:</strong> One system where Director, Camera, Audio, Moderator, and Quality Checker log in for their Sunday tasks.
                </li>
                <li>
                  • <strong>Weekly Serving Roster:</strong> Clear monthly schedule so every volunteer knows their duty week.
                </li>
                <li>
                  • <strong>Sunday Morning Countdown &amp; Go-Live Gate:</strong> 6:00 AM check start → 8:25 AM Go-Live (5 mins early) → 8:30 AM Service. Only Director confirms Go-Live when all checks are ready.
                </li>
                <li>
                  • <strong>Meeting Report Log:</strong> Quality Checker reviews solved/unsolved issues; Moderator records weekly views, comments &amp; feedback.
                </li>
              </ul>

              <div className="bg-white rounded-xl p-3 border border-dashed border-[#c7c7cc]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0066cc] mb-1">
                  ✎ Notes &amp; Remarks — Plan 1 (Centralised System)
                </label>
                <textarea
                  rows={2}
                  value={notes.plan1SystemRemarks}
                  onChange={(e) => updateNote("plan1SystemRemarks", e.target.value)}
                  placeholder="Add notes on team adoption or system rollout..."
                  className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none resize-y"
                />
              </div>
            </div>

            {/* UPCOMING PLAN 2 */}
            <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#e5e5ea]">
                <span className="text-base font-bold text-[#1d1d1f]">
                  Plan 2 · Upgrade Equipment &amp; Rough Budget
                </span>
                <span className="px-3 py-1 rounded-full bg-[#e8f2ff] text-[#0066cc] text-xs font-bold">
                  Timeline: Week 2 – 5 (Purchase &amp; Setup)
                </span>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl border border-[#e5e5ea]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f0f0f5] text-[#6e6e73] text-[10px] font-bold uppercase tracking-wider border-b border-[#e5e5ea]">
                      <th className="py-3 px-4">Equipment Item</th>
                      <th className="py-3 px-4">Purpose (Why We Need It)</th>
                      <th className="py-3 px-4">Rough Budget (RM)</th>
                      <th className="py-3 px-4">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f5] text-[#1d1d1f]">
                    <tr>
                      <td className="py-3 px-4 font-bold">
                        1. Camera (Second View)
                        <div className="text-[11px] font-normal text-[#6e6e73]">
                          + Tripod &amp; HDMI/SDI Cable
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#424245]">
                        • Adds a 2nd angle for worship team, wide church view &amp; altar calls while Camera 1 stays on Pastor.
                        <br />• Keeps viewers engaged much longer.
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1d1d1f]">
                        RM 4,500 – RM 7,500
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0066cc]">
                        Week 3 – 5
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold">
                        2. Live Crowd Mic
                        <div className="text-[11px] font-normal text-[#6e6e73]">
                          + Mic Stand &amp; XLR Cable
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#424245]">
                        • Captures congregation singing, clapping &amp; worship atmosphere.
                        <br />• Helps online viewers feel present in church instead of hearing dry audio.
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1d1d1f]">
                        RM 800 – RM 1,800
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0066cc]">
                        Week 2 – 3
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold">
                        3. ATEM Switcher
                        <div className="text-[11px] font-normal text-[#6e6e73]">
                          Blackmagic ATEM Mini Pro / Extreme
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#424245]">
                        • Smooth 1-button live switching between Camera 1, Camera 2, and scripture/lyric slides without lag.
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1d1d1f]">
                        RM 1,800 – RM 3,200
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0066cc]">
                        Week 2 – 4
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#1d1d1f] text-white rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span>
                  <strong>Total Estimated Budget Range:</strong> (Can be bought together or phased over 2 months)
                </span>
                <span className="text-base font-extrabold text-[#30d158]">
                  RM 7,100 – RM 12,500
                </span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-dashed border-[#c7c7cc] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc]">
                    ✎ Notes &amp; Budget Decision — Plan 2 (Equipment Upgrades)
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-[#6e6e73] font-medium">Decision Status:</span>
                    {["Pending Discussion", "Approved Full Package", "Approved Phased (Stage 1 First)"].map(
                      (opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateNote("approvedBudgetOption", opt)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                            notes.approvedBudgetOption === opt
                              ? "bg-[#0066cc] text-white"
                              : "bg-[#f0f0f5] text-[#424245] hover:bg-[#e5e5ea]"
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={notes.plan2BudgetRemarks}
                  onChange={(e) => updateNote("plan2BudgetRemarks", e.target.value)}
                  placeholder="Add Senior Pastor's remarks on camera, crowd mic, ATEM switcher or budget timing..."
                  className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none resize-y"
                />
              </div>
            </div>

            {/* UPCOMING PLAN 3 */}
            <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#e5e5ea]">
                <span className="text-base font-bold text-[#1d1d1f]">
                  Plan 3 · Training for Videographers, Cameramen &amp; Media Team
                </span>
                <span className="px-3 py-1 rounded-full bg-[#e8f2ff] text-[#0066cc] text-xs font-bold">
                  Timeline: Week 4 – 8 (Hands-On Practice)
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-[#424245]">
                <li>
                  • <strong>Videographers &amp; Cameramen (Week 4 – 6):</strong> Hands-on training for framing, smooth movement, and coordinating Camera 1 (Pastor) &amp; Camera 2 (Second View).
                </li>
                <li>
                  • <strong>Switcher &amp; Sound Crew (Week 5 – 7):</strong> Train team members on using the ATEM switcher and balancing the Live Crowd Mic.
                </li>
                <li>
                  • <strong>Shadow Sundays &amp; Rotation (Week 6 – 8):</strong> New volunteers shadow for 2 Sundays before joining the weekly roster so we have enough trained people every week.
                </li>
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-white rounded-xl p-3 border border-[#e5e5ea]">
                  <div className="text-[10px] font-bold uppercase text-[#0066cc]">
                    Week 1 – 2
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                    System &amp; Budget
                  </div>
                  <div className="text-[11px] text-[#6e6e73] mt-0.5">
                    Launch team hub &amp; confirm equipment budget.
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#e5e5ea]">
                  <div className="text-[10px] font-bold uppercase text-[#0066cc]">
                    Week 2 – 3
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                    Crowd Mic &amp; ATEM
                  </div>
                  <div className="text-[11px] text-[#6e6e73] mt-0.5">
                    Set up Crowd Mic &amp; ATEM switcher.
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#e5e5ea]">
                  <div className="text-[10px] font-bold uppercase text-[#0066cc]">
                    Week 4 – 5
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                    2nd Camera View
                  </div>
                  <div className="text-[11px] text-[#6e6e73] mt-0.5">
                    Install Camera 2 &amp; test 2-angle live cuts.
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#e5e5ea]">
                  <div className="text-[10px] font-bold uppercase text-[#0066cc]">
                    Week 5 – 8
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                    Team Training
                  </div>
                  <div className="text-[11px] text-[#6e6e73] mt-0.5">
                    Train videographers, cameramen &amp; media crew.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-dashed border-[#c7c7cc]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0066cc] mb-1">
                  ✎ Notes &amp; Remarks — Plan 3 (Training &amp; Volunteers)
                </label>
                <textarea
                  rows={2}
                  value={notes.plan3TrainingRemarks}
                  onChange={(e) => updateNote("plan3TrainingRemarks", e.target.value)}
                  placeholder="Add names of new trainees, training dates, or Pastor's suggestions..."
                  className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* ==================== 4. FINAL MEETING NOTES & ACTION ITEMS ==================== */}
          <div className="bg-[#f5f5f7] rounded-2xl p-5 border border-[#e5e5ea] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f]">
                ✎ General Meeting Notes, Pastor Remarks &amp; Next Steps
              </label>
              <button
                type="button"
                onClick={handleClearNotes}
                className="no-print text-[11px] text-[#6e6e73] hover:text-red-600 transition"
              >
                Clear All Notes
              </button>
            </div>
            <textarea
              rows={4}
              value={notes.generalPastorRemarks}
              onChange={(e) => updateNote("generalPastorRemarks", e.target.value)}
              placeholder="Write overall meeting summary, Senior Pastor's advice, approved budget amount, and follow-up dates here..."
              className="w-full rounded-xl bg-white border border-[#d2d2d7] p-3 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0066cc] resize-y"
            />
          </div>
        </div>
      )}
    </section>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";
import { parseSermonNotesToCues } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  const store = readFallbackStore();
  try {
    await ensureDbReady();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const cues = await db.sermonCue.findMany({
      where: sessionId ? { sessionId } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ cues });
  } catch {
    return NextResponse.json({ cues: store.sermonCues || [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { notesText, translation = "NIV", sessionId } = await req.json();

    if (!notesText || typeof notesText !== "string" || !notesText.trim()) {
      return NextResponse.json(
        { error: "Sermon notes text or PDF content is required" },
        { status: 400 }
      );
    }

    // Call Gemini 3.8 Flash to extract structured cue cards
    const parsedCues = await parseSermonNotesToCues(notesText, translation);

    const createdCues = [];
    try {
      await ensureDbReady();
      for (let i = 0; i < parsedCues.length; i++) {
        const cue = parsedCues[i];
        const saved = await db.sermonCue.create({
          data: {
            sessionId: sessionId || null,
            cueType: cue.cueType,
            label: cue.label,
            content: cue.content,
            sortOrder: i + 1,
            isReleased: false,
          },
        });
        createdCues.push(saved);
      }
    } catch {
      for (let i = 0; i < parsedCues.length; i++) {
        const cue = parsedCues[i];
        createdCues.push({
          id: `cue_${Date.now()}_${i}`,
          sessionId: sessionId || null,
          cueType: cue.cueType,
          label: cue.label,
          content: cue.content,
          sortOrder: i + 1,
          isReleased: false,
          releasedAt: null,
          createdAt: new Date().toISOString(),
        });
      }
      const store = readFallbackStore();
      writeFallbackStore("sermonCues", [...(store.sermonCues || []), ...createdCues]);
    }

    return NextResponse.json({
      success: true,
      cues: createdCues,
      count: createdCues.length,
    });
  } catch (error: any) {
    console.error("Sermon notes parse & save failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process sermon notes" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    writeFallbackStore("sermonCues", []);
    await ensureDbReady();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      await db.sermonCue.deleteMany({
        where: { sessionId },
      });
    } else {
      await db.sermonCue.deleteMany();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}

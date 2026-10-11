import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseSermonNotesToCues } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const cues = await db.sermonCue.findMany({
      where: sessionId ? { sessionId } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ cues });
  } catch (err: any) {
    return NextResponse.json({ cues: [], error: err.message });
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

    // Save into database linked to the session
    const createdCues = [];
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

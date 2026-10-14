import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendYouTubeChatMessage } from "@/lib/youtube";
import { sendInstagramLiveComment } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, target = "BOTH", sessionId } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    const trimmed = content.trim();
    let ytResult = null;
    let igResult = null;

    let appCfg = null;
    try {
      appCfg = await db.appConfig.findUnique({ where: { id: "default" } });
    } catch {
      // ignore if db not ready
    }

    // Send to YouTube if requested
    if (target === "BOTH" || target === "YOUTUBE") {
      ytResult = await sendYouTubeChatMessage(
        trimmed,
        appCfg?.youtubeLiveChatId || undefined,
        appCfg?.youtubeApiKey || undefined
      );
    }

    // Send to Instagram if requested
    if (target === "BOTH" || target === "INSTAGRAM") {
      igResult = await sendInstagramLiveComment(
        trimmed,
        appCfg?.instagramLiveVideoId || undefined,
        appCfg?.instagramAccessToken || undefined
      );
    }

    // Determine overall status
    const isSuccess =
      (ytResult?.success ?? true) && (igResult?.success ?? true);
    const overallStatus = isSuccess
      ? ytResult?.status === "SIMULATED" || igResult?.status === "SIMULATED"
        ? "SIMULATED"
        : "SENT"
      : "FAILED";

    // Save to database
    let savedMessage = null;
    try {
      savedMessage = await db.broadcastMessage.create({
        data: {
          content: trimmed,
          target,
          status: overallStatus,
          sessionId: sessionId || null,
          ytStatus: ytResult ? ytResult.status : "SKIPPED",
          igStatus: igResult ? igResult.status : "SKIPPED",
        },
      });
    } catch (dbErr) {
      console.warn("Could not save to DB (table may not be migrated yet):", dbErr);
    }

    return NextResponse.json({
      success: isSuccess,
      message: savedMessage || {
        id: `msg_${Date.now()}`,
        content: trimmed,
        target,
        status: overallStatus,
        sentAt: new Date().toISOString(),
      },
      results: {
        youtube: ytResult,
        instagram: igResult,
      },
    });
  } catch (error: any) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to broadcast message" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const messages = await db.broadcastMessage.findMany({
      take: 30,
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ messages: [] });
  }
}

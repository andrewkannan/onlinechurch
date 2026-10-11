import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const prayers = await db.prayerRequest.findMany({
      where: sessionId ? { sessionId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ prayers });
  } catch (err) {
    return NextResponse.json({ prayers: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requesterName, requestText, platform = "BOTH", sessionId } = await req.json();

    if (!requesterName || !requestText) {
      return NextResponse.json(
        { error: "Requester name and text are required" },
        { status: 400 }
      );
    }

    const prayer = await db.prayerRequest.create({
      data: {
        requesterName,
        requestText,
        platform,
        sessionId: sessionId || null,
        status: "OPEN",
      },
    });

    return NextResponse.json({ prayer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, aiDraftedResponse } = await req.json();
    const updated = await db.prayerRequest.update({
      where: { id },
      data: {
        status: status || undefined,
        aiDraftedResponse: aiDraftedResponse || undefined,
      },
    });
    return NextResponse.json({ prayer: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

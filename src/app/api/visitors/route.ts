import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const visitors = await db.visitorLog.findMany({
      where: sessionId ? { sessionId } : undefined,
      orderBy: { connectedAt: "desc" },
    });
    return NextResponse.json({ visitors });
  } catch (err) {
    return NextResponse.json({ visitors: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, location, platform = "YOUTUBE", notes, sessionId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const visitor = await db.visitorLog.create({
      data: {
        name,
        location: location || null,
        platform,
        notes: notes || null,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ visitor });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

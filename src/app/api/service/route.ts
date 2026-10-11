import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Find latest active service, or create one if none exists
    let service = await db.serviceSession.findFirst({
      where: { isActive: true },
      orderBy: { startedAt: "desc" },
      include: {
        _count: {
          select: {
            messages: true,
            prayerRequests: true,
            visitors: true,
          },
        },
      },
    });

    if (!service) {
      service = await db.serviceSession.create({
        data: {
          title: "Sunday Worship & Word Service",
          isActive: true,
        },
        include: {
          _count: {
            select: {
              messages: true,
              prayerRequests: true,
              visitors: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ service });
  } catch (err: any) {
    return NextResponse.json({
      service: {
        id: "default_session",
        title: "Sunday Worship & Word Service",
        isActive: true,
        peakViewersYT: 0,
        peakViewersIG: 0,
        _count: { messages: 0, prayerRequests: 0, visitors: 0 },
      },
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, title, peakViewersYT, peakViewersIG, isActive } = await req.json();

    const updated = await db.serviceSession.update({
      where: { id },
      data: {
        title: title || undefined,
        peakViewersYT: peakViewersYT !== undefined ? Number(peakViewersYT) : undefined,
        peakViewersIG: peakViewersIG !== undefined ? Number(peakViewersIG) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        endedAt: isActive === false ? new Date() : undefined,
      },
    });

    return NextResponse.json({ service: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

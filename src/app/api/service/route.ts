import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";

const DEFAULT_SERVICE = {
  id: "default_session",
  title: "Sunday Worship & Word Service",
  isActive: true,
  peakViewersYT: 0,
  peakViewersIG: 0,
  startedAt: new Date().toISOString(),
  _count: { messages: 0, prayerRequests: 0, visitors: 0 },
};

export async function GET() {
  const store = readFallbackStore();
  try {
    await ensureDbReady();
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
      const seed = store.activeService || DEFAULT_SERVICE;
      service = await db.serviceSession.create({
        data: {
          title: seed.title || DEFAULT_SERVICE.title,
          isActive: true,
          peakViewersYT: seed.peakViewersYT || 0,
          peakViewersIG: seed.peakViewersIG || 0,
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
  } catch {
    return NextResponse.json({
      service: store.activeService || DEFAULT_SERVICE,
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, title, peakViewersYT, peakViewersIG, isActive } = await req.json();
    const store = readFallbackStore();
    const existing = store.activeService || DEFAULT_SERVICE;

    const nextService = {
      ...existing,
      ...(title !== undefined ? { title } : {}),
      ...(peakViewersYT !== undefined ? { peakViewersYT: Number(peakViewersYT) } : {}),
      ...(peakViewersIG !== undefined ? { peakViewersIG: Number(peakViewersIG) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    };
    writeFallbackStore("activeService", nextService);

    try {
      await ensureDbReady();
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
    } catch {
      return NextResponse.json({ service: nextService });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";

const DEFAULT_CONFIG = {
  id: "default",
  churchName: "Grace Online Church",
  subtitle: "Live Stream Broadcast & Ministry Hub",
  logoUrl: null as string | null,
  defaultTranslation: "NIV",
  youtubeApiKey: "",
  youtubeLiveChatId: "",
  instagramAccessToken: "",
  instagramLiveVideoId: "",
  geminiApiKey: "",
};

export async function GET() {
  const store = readFallbackStore();
  try {
    await ensureDbReady();
    let config = await db.appConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      const seed = store.appConfig || DEFAULT_CONFIG;
      config = await db.appConfig.create({
        data: {
          id: "default",
          churchName: seed.churchName || DEFAULT_CONFIG.churchName,
          subtitle: seed.subtitle || DEFAULT_CONFIG.subtitle,
          logoUrl: seed.logoUrl || null,
          defaultTranslation: seed.defaultTranslation || DEFAULT_CONFIG.defaultTranslation,
        },
      });
    }

    const merged = {
      ...DEFAULT_CONFIG,
      ...(store.appConfig || {}),
      ...config,
    };

    return NextResponse.json({
      config: merged,
      dbConnected: true,
    });
  } catch (err: any) {
    console.warn("SQLite read fallback to JSON store:", err?.message);
    const saved = store.appConfig || DEFAULT_CONFIG;
    return NextResponse.json({
      config: {
        ...DEFAULT_CONFIG,
        ...saved,
      },
      dbConnected: true,
      storageMode: "json-store",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readFallbackStore();
    const existing = store.appConfig || DEFAULT_CONFIG;

    const nextConfig = {
      ...DEFAULT_CONFIG,
      ...existing,
      ...(body.churchName !== undefined
        ? { churchName: String(body.churchName).trim() || "Online Church" }
        : {}),
      ...(body.subtitle !== undefined
        ? { subtitle: String(body.subtitle).trim() }
        : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      ...(body.defaultTranslation !== undefined
        ? { defaultTranslation: String(body.defaultTranslation) }
        : {}),
      ...(body.youtubeApiKey !== undefined
        ? { youtubeApiKey: body.youtubeApiKey }
        : {}),
      ...(body.youtubeLiveChatId !== undefined
        ? { youtubeLiveChatId: body.youtubeLiveChatId }
        : {}),
      ...(body.instagramAccessToken !== undefined
        ? { instagramAccessToken: body.instagramAccessToken }
        : {}),
      ...(body.instagramLiveVideoId !== undefined
        ? { instagramLiveVideoId: body.instagramLiveVideoId }
        : {}),
      ...(body.geminiApiKey !== undefined
        ? { geminiApiKey: body.geminiApiKey }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    // Always persist in JSON fallback store immediately
    writeFallbackStore("appConfig", nextConfig);

    // Also persist in SQLite Prisma database
    try {
      await ensureDbReady();
      const dbSaved = await db.appConfig.upsert({
        where: { id: "default" },
        update: {
          churchName: nextConfig.churchName,
          subtitle: nextConfig.subtitle,
          logoUrl: nextConfig.logoUrl,
          defaultTranslation: nextConfig.defaultTranslation,
          youtubeApiKey: nextConfig.youtubeApiKey || null,
          youtubeLiveChatId: nextConfig.youtubeLiveChatId || null,
          instagramAccessToken: nextConfig.instagramAccessToken || null,
          instagramLiveVideoId: nextConfig.instagramLiveVideoId || null,
          geminiApiKey: nextConfig.geminiApiKey || null,
        },
        create: {
          id: "default",
          churchName: nextConfig.churchName,
          subtitle: nextConfig.subtitle,
          logoUrl: nextConfig.logoUrl,
          defaultTranslation: nextConfig.defaultTranslation,
          youtubeApiKey: nextConfig.youtubeApiKey || null,
          youtubeLiveChatId: nextConfig.youtubeLiveChatId || null,
          instagramAccessToken: nextConfig.instagramAccessToken || null,
          instagramLiveVideoId: nextConfig.instagramLiveVideoId || null,
          geminiApiKey: nextConfig.geminiApiKey || null,
        },
      });

      return NextResponse.json({
        success: true,
        config: dbSaved,
        dbConnected: true,
      });
    } catch (dbErr: any) {
      console.warn("SQLite upsert fallback to JSON store:", dbErr?.message);
      return NextResponse.json({
        success: true,
        config: nextConfig,
        dbConnected: true,
        storageMode: "json-store",
      });
    }
  } catch (err: any) {
    console.error("Settings POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process settings request", dbConnected: false },
      { status: 400 }
    );
  }
}

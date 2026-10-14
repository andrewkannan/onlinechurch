import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  try {
    let config = await db.appConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await db.appConfig.create({
        data: {
          id: "default",
          churchName: DEFAULT_CONFIG.churchName,
          subtitle: DEFAULT_CONFIG.subtitle,
          logoUrl: null,
          defaultTranslation: DEFAULT_CONFIG.defaultTranslation,
        },
      });
    }

    return NextResponse.json({
      config: {
        ...DEFAULT_CONFIG,
        ...config,
      },
      dbConnected: true,
    });
  } catch (err: any) {
    console.error("Failed to fetch AppConfig from database:", err);
    return NextResponse.json({
      config: DEFAULT_CONFIG,
      dbConnected: false,
      error: err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      churchName,
      subtitle,
      logoUrl,
      defaultTranslation,
      youtubeApiKey,
      youtubeLiveChatId,
      instagramAccessToken,
      instagramLiveVideoId,
      geminiApiKey,
    } = body;

    const updated = await db.appConfig.upsert({
      where: { id: "default" },
      update: {
        churchName: churchName !== undefined ? String(churchName).trim() || "Online Church" : undefined,
        subtitle: subtitle !== undefined ? String(subtitle).trim() : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        defaultTranslation: defaultTranslation !== undefined ? String(defaultTranslation) : undefined,
        youtubeApiKey: youtubeApiKey !== undefined ? youtubeApiKey : undefined,
        youtubeLiveChatId: youtubeLiveChatId !== undefined ? youtubeLiveChatId : undefined,
        instagramAccessToken: instagramAccessToken !== undefined ? instagramAccessToken : undefined,
        instagramLiveVideoId: instagramLiveVideoId !== undefined ? instagramLiveVideoId : undefined,
        geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : undefined,
      },
      create: {
        id: "default",
        churchName: churchName ? String(churchName).trim() : DEFAULT_CONFIG.churchName,
        subtitle: subtitle ? String(subtitle).trim() : DEFAULT_CONFIG.subtitle,
        logoUrl: logoUrl ?? null,
        defaultTranslation: defaultTranslation || "NIV",
        youtubeApiKey: youtubeApiKey || null,
        youtubeLiveChatId: youtubeLiveChatId || null,
        instagramAccessToken: instagramAccessToken || null,
        instagramLiveVideoId: instagramLiveVideoId || null,
        geminiApiKey: geminiApiKey || null,
      },
    });

    return NextResponse.json({
      success: true,
      config: updated,
      dbConnected: true,
    });
  } catch (err: any) {
    console.error("Failed to save AppConfig to database:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save settings to database", dbConnected: false },
      { status: 500 }
    );
  }
}

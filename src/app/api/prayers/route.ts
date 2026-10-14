import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";
import { sendYouTubeChatMessage } from "@/lib/youtube";
import { sendInstagramLiveComment } from "@/lib/instagram";

export interface EnrichedPrayerRequest {
  id: string;
  sessionId?: string | null;
  requesterName: string;
  requesterHandle?: string;
  requestText: string;
  platform: "YOUTUBE" | "INSTAGRAM" | "BOTH";
  status: "OPEN" | "PRAYED" | "FOLLOW_UP";
  category?: "HEALING" | "FAMILY" | "BREAKTHROUGH" | "SALVATION" | "GENERAL";
  urgency?: "HIGH" | "NORMAL";
  autoDetected?: boolean;
  aiDraftedResponse?: string | null;
  replySentText?: string | null;
  repliedPlatform?: "YOUTUBE" | "INSTAGRAM" | "BOTH" | null;
  repliedAt?: string | null;
  createdAt: string;
}

const DEFAULT_PRAYERS: EnrichedPrayerRequest[] = [
  {
    id: "pray-seed-1",
    requesterName: "Sister Mei Ling",
    requesterHandle: "@meiling_sg",
    requestText:
      "Please pray for my mother who is going for heart procedure tomorrow morning at SGH. Praying for peace and complete healing 🙏",
    platform: "YOUTUBE",
    status: "OPEN",
    category: "HEALING",
    urgency: "HIGH",
    autoDetected: true,
    aiDraftedResponse:
      "@meiling_sg We are standing in faith with you for your mother's heart procedure tomorrow at SGH! May the peace of Jesus guard your family and His healing hand guide the doctors (Psalm 103:2-3). 🙏❤️",
    replySentText: null,
    repliedPlatform: null,
    repliedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "pray-seed-2",
    requesterName: "joshua.raj99",
    requesterHandle: "@joshua.raj99",
    requestText:
      "Need prayer for breakthrough in my job interview this Tuesday and wisdom for my family.",
    platform: "INSTAGRAM",
    status: "OPEN",
    category: "BREAKTHROUGH",
    urgency: "NORMAL",
    autoDetected: true,
    aiDraftedResponse:
      "@joshua.raj99 Praying right now for divine favor, clarity, and open doors in your Tuesday interview! God goes before you (Deut 31:8). 🔥🙏",
    replySentText: null,
    repliedPlatform: null,
    repliedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
];

export function classifyPrayerIntent(text: string): {
  isPrayerRequest: boolean;
  category: "HEALING" | "FAMILY" | "BREAKTHROUGH" | "SALVATION" | "GENERAL";
  urgency: "HIGH" | "NORMAL";
  confidence: number;
} {
  const lower = text.toLowerCase();

  const prayerTriggers = [
    "pray for",
    "please pray",
    "need prayer",
    "prayer request",
    "keep me in prayer",
    "keep my",
    "stand with me",
    "intercede",
    "pray that",
    "praying for my",
    "need healing",
    "in hospital",
    "going for surgery",
    "diagnosed with",
    "cancer",
    "deliverance",
    "anxiety",
    "depressed",
    "receive jesus",
    "give my life to christ",
  ];

  const hasExplicitTrigger = prayerTriggers.some((kw) => lower.includes(kw));
  const hasPrayWordAndNeed =
    (lower.includes("pray") || lower.includes("🙏")) &&
    (lower.includes("my ") ||
      lower.includes("me") ||
      lower.includes("family") ||
      lower.includes("healing") ||
      lower.includes("help") ||
      lower.includes("job") ||
      lower.includes("pain") ||
      lower.includes("mom") ||
      lower.includes("dad") ||
      lower.includes("child") ||
      lower.includes("marriage"));

  const isPrayerRequest = hasExplicitTrigger || hasPrayWordAndNeed;

  let category: "HEALING" | "FAMILY" | "BREAKTHROUGH" | "SALVATION" | "GENERAL" =
    "GENERAL";
  if (
    /heal|surgery|hospital|cancer|sick|pain|doctor|recovery|health|icu/.test(
      lower
    )
  ) {
    category = "HEALING";
  } else if (
    /jesus|salvation|save me|forgive|give my life|born again|repent/.test(lower)
  ) {
    category = "SALVATION";
  } else if (
    /family|marriage|husband|wife|son|daughter|children|mother|father|parents/.test(
      lower
    )
  ) {
    category = "FAMILY";
  } else if (
    /job|interview|finance|business|debt|exam|breakthrough|provision|door/.test(
      lower
    )
  ) {
    category = "BREAKTHROUGH";
  }

  const urgency: "HIGH" | "NORMAL" =
    /surgery|hospital|icu|emergency|cancer|crisis|suicid|urgent|pain/.test(
      lower
    )
      ? "HIGH"
      : "NORMAL";

  return {
    isPrayerRequest,
    category,
    urgency,
    confidence: hasExplicitTrigger ? 96 : hasPrayWordAndNeed ? 84 : 15,
  };
}

export function buildSmartDefaultReply(
  name: string,
  handle: string,
  platform: "YOUTUBE" | "INSTAGRAM" | "BOTH",
  category: string
): string {
  const mention = handle.startsWith("@")
    ? handle
    : `@${name.replace(/\s+/g, "")}`;

  if (category === "HEALING") {
    return platform === "INSTAGRAM"
      ? `${mention} We are praying for complete healing and peace over you right now in Jesus' name! (Psalm 103:3) 🙏❤️ DM us 'PRAY' so our pastors can follow up!`
      : `${mention} Our prayer team is agreeing with you right now for supernatural healing, strength, and peace (Jeremiah 30:17)! We are standing with you! 🙏❤️`;
  }
  if (category === "SALVATION") {
    return platform === "INSTAGRAM"
      ? `${mention} Heaven is rejoicing with you today! Welcome to God's family! ❤️🔥 Please DM us the word 'JESUS' right now so we can send you a free Bible & pray with you!`
      : `${mention} Hallelujah! Heaven is celebrating your decision to follow Jesus today (2 Cor 5:17)! Our team is praying over you right now! 🎉🙏`;
  }
  if (category === "FAMILY") {
    return `${mention} Lifting up your family before the Lord right now! May God's peace, unity, and covering surround your home (Joshua 24:15). 🙏✨`;
  }
  if (category === "BREAKTHROUGH") {
    return `${mention} Standing in faith with you for God's favor, wisdom, and open doors this week! He goes before you (Deuteronomy 31:8). 🔥🙏`;
  }
  return `${mention} We have received your prayer request and our ministry team is praying over you right now in Jesus' name! God hears and cares for you (1 Peter 5:7). 🙏❤️`;
}

export function getStoredPrayers(): EnrichedPrayerRequest[] {
  const store = readFallbackStore();
  if (!store.prayers || !Array.isArray(store.prayers)) {
    store.prayers = DEFAULT_PRAYERS;
    writeFallbackStore("prayers", store.prayers);
  }
  return store.prayers;
}

export async function GET() {
  const stored = getStoredPrayers();
  try {
    await ensureDbReady();
    const dbPrayers = await db.prayerRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    const map = new Map<string, EnrichedPrayerRequest>();
    for (const p of stored) {
      map.set(p.id, p);
    }
    for (const dp of dbPrayers) {
      if (!map.has(dp.id)) {
        const intent = classifyPrayerIntent(dp.requestText);
        const handle = dp.requesterName.startsWith("@")
          ? dp.requesterName
          : `@${dp.requesterName.replace(/\s+/g, "_")}`;
        const plat =
          dp.platform === "INSTAGRAM"
            ? "INSTAGRAM"
            : dp.platform === "YOUTUBE"
            ? "YOUTUBE"
            : "YOUTUBE";
        map.set(dp.id, {
          id: dp.id,
          sessionId: dp.sessionId,
          requesterName: dp.requesterName,
          requesterHandle: handle,
          requestText: dp.requestText,
          platform: plat,
          status: (dp.status as any) || "OPEN",
          category: intent.category,
          urgency: intent.urgency,
          autoDetected: true,
          aiDraftedResponse:
            dp.aiDraftedResponse ||
            buildSmartDefaultReply(
              dp.requesterName,
              handle,
              plat,
              intent.category
            ),
          createdAt: dp.createdAt.toISOString(),
        });
      }
    }

    const combined = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ prayers: combined });
  } catch {
    return NextResponse.json({ prayers: stored });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stored = getStoredPrayers();

    // Action: Reply directly to the specific platform (IG -> IG, YT -> YT)
    if (body.action === "REPLY_TO_PRAYER" && body.prayerId && body.replyText) {
      const prayer = stored.find((p) => p.id === body.prayerId);
      const targetPlatform: "YOUTUBE" | "INSTAGRAM" =
        body.platform === "INSTAGRAM" || prayer?.platform === "INSTAGRAM"
          ? "INSTAGRAM"
          : "YOUTUBE";

      const replyContent = String(body.replyText).trim();
      const store = readFallbackStore();
      const appCfg = store.appConfig || null;

      let deliveryResult: any = null;
      if (targetPlatform === "YOUTUBE") {
        deliveryResult = await sendYouTubeChatMessage(
          replyContent,
          appCfg?.youtubeLiveChatId || undefined,
          appCfg?.youtubeApiKey || undefined
        );
      } else {
        deliveryResult = await sendInstagramLiveComment(
          replyContent,
          appCfg?.instagramLiveVideoId || undefined,
          appCfg?.instagramAccessToken || undefined
        );
      }

      const nowIso = new Date().toISOString();
      const nextPrayers = stored.map((p) =>
        p.id === body.prayerId
          ? {
              ...p,
              status: "PRAYED" as const,
              replySentText: replyContent,
              repliedPlatform: targetPlatform,
              repliedAt: nowIso,
            }
          : p
      );
      writeFallbackStore("prayers", nextPrayers);

      try {
        await ensureDbReady();
        await db.prayerRequest.updateMany({
          where: { id: body.prayerId },
          data: {
            status: "PRAYED",
            aiDraftedResponse: replyContent,
          },
        });
        await db.broadcastMessage.create({
          data: {
            content: replyContent,
            target: targetPlatform,
            status:
              deliveryResult?.status === "SENT" ? "SENT" : "SIMULATED",
            ytStatus:
              targetPlatform === "YOUTUBE"
                ? deliveryResult?.status || "SIMULATED"
                : "SKIPPED",
            igStatus:
              targetPlatform === "INSTAGRAM"
                ? deliveryResult?.status || "SIMULATED"
                : "SKIPPED",
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        routedTo: targetPlatform,
        deliveryStatus: deliveryResult?.status || "SIMULATED",
        prayers: nextPrayers,
      });
    }

    // Standard Create / Auto-Pull Prayer Request
    const {
      requesterName,
      requesterHandle,
      requestText,
      platform = "YOUTUBE",
      sessionId,
      autoDetected = false,
    } = body;

    if (!requesterName || !requestText) {
      return NextResponse.json(
        { error: "Requester name and text are required" },
        { status: 400 }
      );
    }

    // Deduplicate if exact same text & requester already exists
    const duplicate = stored.find(
      (p) =>
        p.requesterName.toLowerCase() === String(requesterName).toLowerCase() &&
        p.requestText.trim().toLowerCase() ===
          String(requestText).trim().toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json({ prayer: duplicate, duplicate: true });
    }

    const normalizedPlatform: "YOUTUBE" | "INSTAGRAM" | "BOTH" =
      platform === "INSTAGRAM"
        ? "INSTAGRAM"
        : platform === "YOUTUBE"
        ? "YOUTUBE"
        : "YOUTUBE";

    const handle =
      requesterHandle ||
      (String(requesterName).startsWith("@")
        ? String(requesterName)
        : `@${String(requesterName).replace(/\s+/g, "_")}`);

    const classification = classifyPrayerIntent(String(requestText));
    const smartReply = buildSmartDefaultReply(
      String(requesterName),
      handle,
      normalizedPlatform,
      classification.category
    );

    const newPrayer: EnrichedPrayerRequest = {
      id: `pray-${Date.now()}`,
      sessionId: sessionId || null,
      requesterName: String(requesterName).trim(),
      requesterHandle: handle,
      requestText: String(requestText).trim(),
      platform: normalizedPlatform,
      status: "OPEN",
      category: classification.category,
      urgency: classification.urgency,
      autoDetected: Boolean(autoDetected),
      aiDraftedResponse: smartReply,
      replySentText: null,
      repliedPlatform: null,
      repliedAt: null,
      createdAt: new Date().toISOString(),
    };

    const nextPrayers = [newPrayer, ...stored];
    writeFallbackStore("prayers", nextPrayers);

    try {
      await ensureDbReady();
      await db.prayerRequest.create({
        data: {
          id: newPrayer.id,
          requesterName: newPrayer.requesterName,
          requestText: newPrayer.requestText,
          platform: newPrayer.platform,
          sessionId: newPrayer.sessionId,
          status: "OPEN",
          aiDraftedResponse: newPrayer.aiDraftedResponse,
        },
      });
    } catch {}

    return NextResponse.json({ prayer: newPrayer, prayers: nextPrayers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, aiDraftedResponse } = await req.json();
    const stored = getStoredPrayers();
    const nextPrayers = stored.map((p) =>
      p.id === id
        ? {
            ...p,
            ...(status ? { status } : {}),
            ...(aiDraftedResponse !== undefined ? { aiDraftedResponse } : {}),
          }
        : p
    );
    writeFallbackStore("prayers", nextPrayers);

    try {
      await ensureDbReady();
      await db.prayerRequest.update({
        where: { id },
        data: {
          status: status || undefined,
          aiDraftedResponse: aiDraftedResponse || undefined,
        },
      });
    } catch {}

    const updated = nextPrayers.find((p) => p.id === id);
    return NextResponse.json({ prayer: updated, prayers: nextPrayers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

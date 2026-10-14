import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbReady, readFallbackStore, writeFallbackStore } from "@/lib/db";
import {
  classifyPrayerIntent,
  buildSmartDefaultReply,
  getStoredPrayers,
  EnrichedPrayerRequest,
} from "@/app/api/prayers/route";

export interface IncomingChatMessage {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  authorName: string;
  authorHandle: string;
  text: string;
  timestamp: string;
  isPrayerRequest: boolean;
  prayerCategory?: "HEALING" | "FAMILY" | "BREAKTHROUGH" | "SALVATION" | "GENERAL";
  urgency?: "HIGH" | "NORMAL";
  autoPulledToQueue: boolean;
  prayerId?: string;
  replied?: boolean;
  replyText?: string;
  repliedAt?: string;
}

const DEFAULT_INCOMING_CHAT: IncomingChatMessage[] = [
  {
    id: "chat-seed-1",
    platform: "YOUTUBE",
    authorName: "Hannah Lim",
    authorHandle: "@hannah_lim_sg",
    text: "Good morning church family! Watching live from Singapore 🔥🙌",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    isPrayerRequest: false,
    autoPulledToQueue: false,
  },
  {
    id: "chat-seed-2",
    platform: "YOUTUBE",
    authorName: "Sister Mei Ling",
    authorHandle: "@meiling_sg",
    text: "Please pray for my mother who is going for heart procedure tomorrow morning at SGH. Praying for peace and complete healing 🙏",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    isPrayerRequest: true,
    prayerCategory: "HEALING",
    urgency: "HIGH",
    autoPulledToQueue: true,
    prayerId: "pray-seed-1",
  },
  {
    id: "chat-seed-3",
    platform: "INSTAGRAM",
    authorName: "David Tan",
    authorHandle: "@davidtan_official",
    text: "Amen Pastor!! That word on faith is speaking right to my heart!",
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    isPrayerRequest: false,
    autoPulledToQueue: false,
  },
  {
    id: "chat-seed-4",
    platform: "INSTAGRAM",
    authorName: "joshua.raj99",
    authorHandle: "@joshua.raj99",
    text: "Need prayer for breakthrough in my job interview this Tuesday and wisdom for my family.",
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    isPrayerRequest: true,
    prayerCategory: "BREAKTHROUGH",
    urgency: "NORMAL",
    autoPulledToQueue: true,
    prayerId: "pray-seed-2",
  },
  {
    id: "chat-seed-5",
    platform: "INSTAGRAM",
    authorName: "Priscilla Fernandez",
    authorHandle: "@priscilla_f",
    text: "Please pray for healing over my migraine and for my son's exams this week 🙏",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    isPrayerRequest: true,
    prayerCategory: "HEALING",
    urgency: "NORMAL",
    autoPulledToQueue: true,
    prayerId: "pray-seed-3",
  },
];

function getStoredChat(): IncomingChatMessage[] {
  const store = readFallbackStore();
  if (!store.incomingChat || !Array.isArray(store.incomingChat)) {
    store.incomingChat = DEFAULT_INCOMING_CHAT;
    writeFallbackStore("incomingChat", store.incomingChat);
  }

  // Ensure any auto-detected prayers in incomingChat are synced into prayers queue
  const prayers = getStoredPrayers();
  let prayersChanged = false;

  for (const msg of store.incomingChat as IncomingChatMessage[]) {
    if (msg.isPrayerRequest) {
      const exists = prayers.find(
        (p) =>
          p.id === msg.prayerId ||
          (p.requesterHandle === msg.authorHandle &&
            p.requestText.trim().toLowerCase() === msg.text.trim().toLowerCase())
      );

      if (!exists) {
        const newPrayerId = msg.prayerId || `pray-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        msg.prayerId = newPrayerId;
        msg.autoPulledToQueue = true;

        const newPrayer: EnrichedPrayerRequest = {
          id: newPrayerId,
          requesterName: msg.authorName,
          requesterHandle: msg.authorHandle,
          requestText: msg.text,
          platform: msg.platform,
          status: msg.replied ? "PRAYED" : "OPEN",
          category: msg.prayerCategory || "GENERAL",
          urgency: msg.urgency || "NORMAL",
          autoDetected: true,
          aiDraftedResponse: buildSmartDefaultReply(
            msg.authorName,
            msg.authorHandle,
            msg.platform,
            msg.prayerCategory || "GENERAL"
          ),
          replySentText: msg.replyText || null,
          repliedPlatform: msg.replied ? msg.platform : null,
          repliedAt: msg.repliedAt || null,
          createdAt: msg.timestamp,
        };
        prayers.unshift(newPrayer);
        prayersChanged = true;
      }
    }
  }

  if (prayersChanged) {
    writeFallbackStore("prayers", prayers);
  }

  return store.incomingChat;
}

export async function GET() {
  const messages = getStoredChat();
  const prayers = getStoredPrayers();

  // Keep reply status synced between prayers queue and chat feed
  const syncedMessages = messages.map((m) => {
    if (!m.prayerId) return m;
    const linkedPrayer = prayers.find((p) => p.id === m.prayerId);
    if (linkedPrayer && linkedPrayer.status === "PRAYED" && linkedPrayer.replySentText) {
      return {
        ...m,
        replied: true,
        replyText: linkedPrayer.replySentText,
        repliedAt: linkedPrayer.repliedAt || undefined,
      };
    }
    return m;
  });

  return NextResponse.json({
    messages: syncedMessages,
    prayers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = getStoredChat();
    const prayers = getStoredPrayers();

    // 1. Incoming Viewer Message (Live or Simulated) -> Auto-Detect & Auto-Pull Prayer Request
    if (body.action === "INCOMING_MESSAGE") {
      const platform: "YOUTUBE" | "INSTAGRAM" =
        body.platform === "INSTAGRAM" ? "INSTAGRAM" : "YOUTUBE";
      const authorName = String(body.authorName || "Online Viewer").trim();
      const authorHandle = String(
        body.authorHandle ||
          (authorName.startsWith("@")
            ? authorName
            : `@${authorName.toLowerCase().replace(/\s+/g, "_")}`)
      ).trim();
      const text = String(body.text || "").trim();

      if (!text) {
        return NextResponse.json(
          { error: "Message text required" },
          { status: 400 }
        );
      }

      const intent = classifyPrayerIntent(text);
      const isPrayer = Boolean(body.forcePrayer) || intent.isPrayerRequest;
      const nowIso = new Date().toISOString();
      const prayerId = isPrayer ? `pray-auto-${Date.now()}` : undefined;

      const newChatMsg: IncomingChatMessage = {
        id: `chat-${Date.now()}`,
        platform,
        authorName,
        authorHandle,
        text,
        timestamp: nowIso,
        isPrayerRequest: isPrayer,
        prayerCategory: isPrayer ? intent.category : undefined,
        urgency: isPrayer ? intent.urgency : undefined,
        autoPulledToQueue: isPrayer,
        prayerId,
      };

      const nextMessages = [newChatMsg, ...messages];
      writeFallbackStore("incomingChat", nextMessages);

      let autoCreatedPrayer: EnrichedPrayerRequest | null = null;
      if (isPrayer && prayerId) {
        autoCreatedPrayer = {
          id: prayerId,
          requesterName: authorName,
          requesterHandle: authorHandle,
          requestText: text,
          platform,
          status: "OPEN",
          category: intent.category,
          urgency: intent.urgency,
          autoDetected: true,
          aiDraftedResponse: buildSmartDefaultReply(
            authorName,
            authorHandle,
            platform,
            intent.category
          ),
          replySentText: null,
          repliedPlatform: null,
          repliedAt: null,
          createdAt: nowIso,
        };

        const nextPrayers = [autoCreatedPrayer, ...prayers];
        writeFallbackStore("prayers", nextPrayers);

        try {
          await ensureDbReady();
          await db.prayerRequest.create({
            data: {
              id: autoCreatedPrayer.id,
              requesterName: autoCreatedPrayer.requesterName,
              requestText: autoCreatedPrayer.requestText,
              platform: autoCreatedPrayer.platform,
              status: "OPEN",
              aiDraftedResponse: autoCreatedPrayer.aiDraftedResponse,
            },
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        autoPulled: isPrayer,
        message: newChatMsg,
        prayer: autoCreatedPrayer,
        messages: nextMessages,
        prayers: getStoredPrayers(),
      });
    }

    // 2. Manually Pull any existing chat message into Prayer Queue
    if (body.action === "PULL_TO_PRAYER" && body.messageId) {
      const targetMsg = messages.find((m) => m.id === body.messageId);
      if (!targetMsg) {
        return NextResponse.json(
          { error: "Chat message not found" },
          { status: 404 }
        );
      }

      const intent = classifyPrayerIntent(targetMsg.text);
      const prayerId = `pray-manual-${Date.now()}`;
      const newPrayer: EnrichedPrayerRequest = {
        id: prayerId,
        requesterName: targetMsg.authorName,
        requesterHandle: targetMsg.authorHandle,
        requestText: targetMsg.text,
        platform: targetMsg.platform,
        status: "OPEN",
        category: intent.category,
        urgency: intent.urgency,
        autoDetected: false,
        aiDraftedResponse: buildSmartDefaultReply(
          targetMsg.authorName,
          targetMsg.authorHandle,
          targetMsg.platform,
          intent.category
        ),
        replySentText: null,
        repliedPlatform: null,
        repliedAt: null,
        createdAt: new Date().toISOString(),
      };

      const nextPrayers = [newPrayer, ...prayers];
      writeFallbackStore("prayers", nextPrayers);

      const nextMessages = messages.map((m) =>
        m.id === body.messageId
          ? {
              ...m,
              isPrayerRequest: true,
              autoPulledToQueue: true,
              prayerId,
              prayerCategory: intent.category,
            }
          : m
      );
      writeFallbackStore("incomingChat", nextMessages);

      return NextResponse.json({
        success: true,
        prayer: newPrayer,
        messages: nextMessages,
        prayers: nextPrayers,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Live chat processing failed" },
      { status: 500 }
    );
  }
}

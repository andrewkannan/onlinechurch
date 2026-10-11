import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

/**
 * Instant Scripture Formatter
 * Formats a Bible reference into a clean, ready-to-broadcast chat message with verse text and emojis.
 */
export async function lookupAndFormatScripture(
  reference: string,
  translation: string = "NIV",
  churchName?: string
): Promise<{ text: string; reference: string; success: boolean }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      success: false,
      reference,
      text: `📖 "${reference}" (${translation}) - Let's open our Bibles together!`,
    };
  }

  try {
    const prompt = `You are a live church stream assistant. A moderator needs to post a scripture to live chat viewers (YouTube and Instagram).
Reference: "${reference}"
Translation: "${translation}"

Please provide the exact scripture verse text followed by the reference.
Keep it concise, accurate to the requested translation (${translation}), engaging with 1-2 appropriate emojis, and formatted on 1 or 2 lines so it looks great in YouTube and Instagram live chat.
Do NOT include commentary, notes, or quotes around the whole block. Just the verse and reference.`;

    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
    });

    const output = interaction.output_text?.trim();
    return {
      success: true,
      reference,
      text: output || `📖 ${reference} (${translation})`,
    };
  } catch (error) {
    console.error("Gemini scripture lookup failed:", error);
    return {
      success: false,
      reference,
      text: `📖 ${reference} (${translation}) - Following along in God's Word today!`,
    };
  }
}

/**
 * Pastoral Prayer Reply Drafter
 * When a viewer submits a prayer request in the live chat, drafts a warm, empathetic, biblically grounded short response.
 */
export async function draftPrayerResponse(
  requesterName: string,
  requestText: string
): Promise<{ reply: string; success: boolean }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      success: false,
      reply: `🙏 @${requesterName}, our church family is standing with you in prayer right now! God hears you.`,
    };
  }

  try {
    const prompt = `You are an online church chat pastor/moderator during Sunday live service.
A viewer named "${requesterName}" posted this prayer request in the live chat:
"${requestText}"

Draft a warm, uplifting, Christ-centered, compassionate response to post back to them in the live chat.
Guidelines:
- Address them by name (@${requesterName}).
- Keep it under 200 characters so it fits easily in YouTube and Instagram comments.
- Speak with empathy, hope, and faith in Jesus.
- Include 1 or 2 gentle emojis (e.g. 🙏 ❤️ ✨).
- Return ONLY the reply text, no extra explanation.`;

    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
    });

    const reply = interaction.output_text?.trim();
    return {
      success: true,
      reply:
        reply ||
        `🙏 @${requesterName}, we are lifting you up in prayer right now! The Lord is close to you.`,
    };
  } catch (error) {
    console.error("Gemini prayer drafter failed:", error);
    return {
      success: false,
      reply: `🙏 @${requesterName}, our team is praying for you right now! May God's peace fill your heart today.`,
    };
  }
}

/**
 * Sermon Interactive Discussion Questions Generator
 * Generates engaging questions for the chat audience based on the sermon theme.
 */
export async function generateSermonQuestions(
  topicOrTitle: string
): Promise<string[]> {
  const client = getGeminiClient();
  const defaultQuestions = [
    `💬 Family question: What is one word that describes what God is speaking to you today?`,
    `💬 Where are you tuning in from today? Let us know in the chat!`,
    `💬 What is one practical step you can take this week based on today's message?`,
  ];

  if (!client) return defaultQuestions;

  try {
    const prompt = `You are an online church ministry strategist.
Today's sermon topic / scripture is: "${topicOrTitle}".
Generate 3 short, engaging questions that the online chat moderator can drop into YouTube and Instagram live chat to spark discussion and interaction among viewers.
Rules:
- Each question must start with 💬 or 💭.
- Keep them engaging, easy to answer in 1 sentence, and relevant to everyday life.
- Return ONLY the 3 questions, separated by newlines, with no bullet numbering.`;

    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
    });

    const lines =
      interaction.output_text
        ?.split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 5) || [];

    return lines.length >= 3 ? lines.slice(0, 3) : defaultQuestions;
  } catch (error) {
    console.error("Gemini questions generation failed:", error);
    return defaultQuestions;
  }
}

/**
 * Automated Post-Service Executive Summary Generator
 * Generates an executive summary and pastoral action items for pastors based on service logs.
 */
export async function generateServiceSummaryReport(serviceData: {
  serviceTitle: string;
  attendanceYT: number;
  attendanceIG: number;
  prayerRequests: Array<{ name: string; text: string }>;
  visitors: Array<{ name: string; location?: string | null }>;
  messagesBroadcasted: number;
}): Promise<{ summary: string; actionItems: string }> {
  const client = getGeminiClient();
  const totalViewers = serviceData.attendanceYT + serviceData.attendanceIG;

  if (!client) {
    return {
      summary: `The service "${serviceData.serviceTitle}" had strong online engagement with approximately ${totalViewers} peak viewers across YouTube (${serviceData.attendanceYT}) and Instagram (${serviceData.attendanceIG}). A total of ${serviceData.prayerRequests.length} prayer requests and ${serviceData.visitors.length} first-time visitors were recorded.`,
      actionItems: `- Follow up with ${serviceData.visitors.length} online first-time visitors.\n- Pastoral prayer team to follow up on ${serviceData.prayerRequests.length} prayer requests submitted during the stream.`,
    };
  }

  try {
    const prompt = `You are an executive church ministry analyst.
Write a post-service briefing for the Senior Pastor and ministry leadership based on today's online service data:

Service: ${serviceData.serviceTitle}
Peak YouTube Viewers: ${serviceData.attendanceYT}
Peak Instagram Viewers: ${serviceData.attendanceIG}
Total Combined Peak: ${totalViewers}
Messages Broadcasted: ${serviceData.messagesBroadcasted}

First-Time Visitors Recorded (${serviceData.visitors.length}):
${serviceData.visitors.map((v) => `- ${v.name} (${v.location || "Online"})`).join("\n") || "None recorded"}

Prayer Requests Submitted (${serviceData.prayerRequests.length}):
${serviceData.prayerRequests.map((p) => `- ${p.name}: "${p.text}"`).join("\n") || "None submitted"}

Format your response into two distinct sections:
### Executive Summary
(2-3 paragraphs highlighting online reach, chat community engagement, and key themes)

### Pastoral Action Items & Follow-Ups
(3-5 concrete bullet points for church staff, visitor follow-up, and prayer ministry)`;

    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
    });

    const raw = interaction.output_text || "";
    const parts = raw.split("### Pastoral Action Items & Follow-Ups");
    const summary = parts[0]?.replace("### Executive Summary", "").trim() || raw;
    const actionItems = parts[1]?.trim() || "Follow up with recorded visitors and prayer needs.";

    return { summary, actionItems };
  } catch (error) {
    console.error("Gemini report generation failed:", error);
    return {
      summary: `Service "${serviceData.serviceTitle}" completed with ${totalViewers} peak viewers.`,
      actionItems: `Review logged prayer requests and new visitors.`,
    };
  }
}

/**
 * YouTube Live Chat Service Bridge
 * Sends broadcast messages to YouTube Live Chat using Google YouTube Data API v3
 */

export interface YouTubeSendResult {
  success: boolean;
  status: "SENT" | "SIMULATED" | "FAILED";
  messageId?: string;
  error?: string;
}

export async function sendYouTubeChatMessage(
  message: string,
  customLiveChatId?: string,
  customApiKey?: string
): Promise<YouTubeSendResult> {
  const apiKey = customApiKey || process.env.YOUTUBE_API_KEY;
  const liveChatId = customLiveChatId || process.env.YOUTUBE_LIVE_CHAT_ID;

  // If live credentials are not set, run in Simulation / Dev Mode
  if (!apiKey || !liveChatId) {
    console.log(`[YouTube Simulation] Broadcasted to live chat: "${message}"`);
    return {
      success: true,
      status: "SIMULATED",
      messageId: `yt_sim_${Date.now()}`,
    };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet&key=${apiKey}`;
    const payload = {
      snippet: {
        liveChatId: liveChatId,
        type: "textMessageEvent",
        textMessageDetails: {
          messageText: message,
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API error:", data);
      return {
        success: false,
        status: "FAILED",
        error: data.error?.message || "YouTube API error",
      };
    }

    return {
      success: true,
      status: "SENT",
      messageId: data.id,
    };
  } catch (err: any) {
    console.error("YouTube network error:", err);
    return {
      success: false,
      status: "FAILED",
      error: err.message || "Failed to reach YouTube API",
    };
  }
}

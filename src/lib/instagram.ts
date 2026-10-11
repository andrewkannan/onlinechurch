/**
 * Instagram Live Chat Service Bridge
 * Sends broadcast messages to Instagram Live Video comments using Meta Graph API
 */

export interface InstagramSendResult {
  success: boolean;
  status: "SENT" | "SIMULATED" | "FAILED";
  commentId?: string;
  error?: string;
}

export async function sendInstagramLiveComment(
  message: string,
  customLiveVideoId?: string,
  customAccessToken?: string
): Promise<InstagramSendResult> {
  const accessToken = customAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const liveVideoId = customLiveVideoId || process.env.INSTAGRAM_LIVE_VIDEO_ID;

  // If live credentials are not set, run in Simulation / Dev Mode
  if (!accessToken || !liveVideoId) {
    console.log(`[Instagram Simulation] Broadcasted comment: "${message}"`);
    return {
      success: true,
      status: "SIMULATED",
      commentId: `ig_sim_${Date.now()}`,
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${liveVideoId}/comments`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        access_token: accessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Instagram API error:", data);
      return {
        success: false,
        status: "FAILED",
        error: data.error?.message || "Instagram API error",
      };
    }

    return {
      success: true,
      status: "SENT",
      commentId: data.id,
    };
  } catch (err: any) {
    console.error("Instagram network error:", err);
    return {
      success: false,
      status: "FAILED",
      error: err.message || "Failed to reach Instagram Graph API",
    };
  }
}

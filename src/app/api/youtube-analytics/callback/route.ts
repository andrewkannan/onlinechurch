import { NextRequest, NextResponse } from "next/server";
import { readFallbackStore, writeFallbackStore } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const origin = req.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/reports?oauth=error&reason=${encodeURIComponent(
        error || "missing_code"
      )}`
    );
  }

  try {
    const store = readFallbackStore();
    const appConfig = store.appConfig || {};
    const clientId =
      appConfig.googleClientId || process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret =
      appConfig.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
    const redirectUri = `${origin}/api/youtube-analytics/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${origin}/reports?oauth=error&reason=missing_client_credentials`
      );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        `${origin}/reports?oauth=error&reason=${encodeURIComponent(
          tokenData.error_description || tokenData.error || "token_exchange_failed"
        )}`
      );
    }

    const nextConfig = {
      ...appConfig,
      youtubeOAuthAccessToken: tokenData.access_token,
      ...(tokenData.refresh_token
        ? { youtubeOAuthRefreshToken: tokenData.refresh_token }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    writeFallbackStore("appConfig", nextConfig);
    writeFallbackStore("youtubeStudioCsvPayload", null);

    return NextResponse.redirect(`${origin}/reports?oauth=connected`);
  } catch (err: any) {
    return NextResponse.redirect(
      `${origin}/reports?oauth=error&reason=${encodeURIComponent(
        err?.message || "unexpected_error"
      )}`
    );
  }
}

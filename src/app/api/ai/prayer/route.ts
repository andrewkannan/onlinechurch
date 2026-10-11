import { NextRequest, NextResponse } from "next/server";
import { draftPrayerResponse } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { requesterName = "Friend", requestText } = await req.json();

    if (!requestText) {
      return NextResponse.json(
        { error: "Prayer request text is required" },
        { status: 400 }
      );
    }

    const result = await draftPrayerResponse(requesterName, requestText);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to draft prayer response" },
      { status: 500 }
    );
  }
}

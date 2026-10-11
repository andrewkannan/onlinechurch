import { NextRequest, NextResponse } from "next/server";
import { generatePropheticDecrees } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { theme = "Supernatural breakthrough and faith" } = await req.json();
    const decrees = await generatePropheticDecrees(theme);
    return NextResponse.json({ decrees });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate prophetic decrees" },
      { status: 500 }
    );
  }
}

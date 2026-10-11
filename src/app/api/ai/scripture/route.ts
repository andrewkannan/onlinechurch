import { NextRequest, NextResponse } from "next/server";
import { lookupAndFormatScripture } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { reference, translation = "NIV" } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { error: "Scripture reference is required (e.g. John 3:16)" },
        { status: 400 }
      );
    }

    const result = await lookupAndFormatScripture(reference, translation);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to lookup scripture" },
      { status: 500 }
    );
  }
}

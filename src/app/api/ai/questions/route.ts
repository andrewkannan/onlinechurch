import { NextRequest, NextResponse } from "next/server";
import { generateSermonQuestions } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { topic = "Faith and Community" } = await req.json();
    const questions = await generateSermonQuestions(topic);
    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate questions" },
      { status: 500 }
    );
  }
}

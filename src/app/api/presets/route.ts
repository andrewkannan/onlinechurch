import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_PRESETS = [
  {
    label: "👋 Welcome Greeting",
    category: "GREETING",
    content: "👋 Welcome to church online! We're so glad you're joining us today. Let us know in the chat where you are watching from!",
    sortOrder: 1,
    isDefault: true,
  },
  {
    label: "💳 Tithes & Offering",
    category: "GIVING",
    content: "💳 Faithful in generosity: You can give your tithes and offerings online securely at our church giving link. Thank you for making ministry possible!",
    sortOrder: 2,
    isDefault: true,
  },
  {
    label: "📝 Digital Connect Card",
    category: "CONNECT",
    content: "📝 First time tuning in? We'd love to get to know you! Fill out our 30-second digital connect card so our team can send you a welcome gift.",
    sortOrder: 3,
    isDefault: true,
  },
  {
    label: "🙏 Prayer Request Call",
    category: "PRAYER",
    content: "🙏 How can we pray for you today? Drop your prayer request in the chat right now, and our online pastoral team will stand with you in faith.",
    sortOrder: 4,
    isDefault: true,
  },
  {
    label: "✝️ Decision for Christ",
    category: "SALVATION",
    content: "✝️ Did you pray with Pastor today to surrender your life to Jesus? Type 'JESUS' in the chat! It is the best decision of your life.",
    sortOrder: 5,
    isDefault: true,
  },
  {
    label: "👥 Online Life Groups",
    category: "CONNECT",
    content: "👥 Don't do life alone! Join an online life group this week to grow, make friends, and study God's Word together.",
    sortOrder: 6,
    isDefault: true,
  },
];

export async function GET() {
  try {
    let presets = await db.presetTemplate.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // If database is empty, seed defaults
    if (presets.length === 0) {
      await db.presetTemplate.createMany({
        data: DEFAULT_PRESETS,
      });
      presets = await db.presetTemplate.findMany({
        orderBy: { sortOrder: "asc" },
      });
    }

    return NextResponse.json({ presets });
  } catch (err) {
    // Return fallback defaults if DB not yet migrated
    return NextResponse.json({ presets: DEFAULT_PRESETS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { label, content, category = "GENERAL" } = await req.json();
    if (!label || !content) {
      return NextResponse.json(
        { error: "Label and content are required" },
        { status: 400 }
      );
    }
    const preset = await db.presetTemplate.create({
      data: { label, content, category },
    });
    return NextResponse.json({ preset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

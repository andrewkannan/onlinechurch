import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isReleased, content } = await req.json();

    const updated = await db.sermonCue.update({
      where: { id },
      data: {
        isReleased: isReleased !== undefined ? Boolean(isReleased) : undefined,
        releasedAt: isReleased ? new Date() : null,
        content: content || undefined,
      },
    });

    return NextResponse.json({ cue: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.sermonCue.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

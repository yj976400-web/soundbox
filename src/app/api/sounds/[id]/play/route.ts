import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const result = await db.prepare("UPDATE sounds SET playCount = playCount + 1 WHERE id = ?").run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }
  const row = (await db.prepare("SELECT playCount FROM sounds WHERE id = ?").get(id)) as {
    playCount: number;
  };
  return NextResponse.json({ playCount: row.playCount });
}

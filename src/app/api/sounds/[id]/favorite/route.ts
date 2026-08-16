import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", requireLogin: true }, { status: 401 });
  }

  const limit = checkRateLimit(`favorite:user:${user.id}`, RATE_LIMITS.favorite);
  if (!limit.allowed) return rateLimitResponse(limit);

  const sound = await db.prepare("SELECT id FROM sounds WHERE id = ?").get(id);
  if (!sound) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }

  const existing = await db
    .prepare("SELECT id FROM favorites WHERE userId = ? AND soundId = ?")
    .get(user.id, id);

  let favorited: boolean;
  if (existing) {
    await db.prepare("DELETE FROM favorites WHERE userId = ? AND soundId = ?").run(user.id, id);
    favorited = false;
  } else {
    await db.prepare(
      "INSERT INTO favorites (id, userId, soundId) VALUES (?, ?, ?)"
    ).run(crypto.randomUUID(), user.id, id);
    favorited = true;
  }

  const count = (await db
    .prepare("SELECT COUNT(*) as cnt FROM favorites WHERE soundId = ?")
    .get(id)) as { cnt: number };

  return NextResponse.json({ favorited, favoriteCount: count.cnt });
}

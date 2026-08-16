import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import type { SoundWithUploader } from "@/lib/types";

export async function GET(req: NextRequest) {
  await dbReady;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = 12;
  const offset = (page - 1) * pageSize;

  const count = (await db
    .prepare("SELECT COUNT(*) as cnt FROM favorites WHERE userId = ?")
    .get(user.id)) as { cnt: number };

  const items = (await db
    .prepare(
      `SELECT s.*, u.username AS uploaderUsername, u.profileImage AS uploaderProfileImage,
        (SELECT COUNT(*) FROM favorites f WHERE f.soundId = s.id) AS favoriteCount,
        1 AS isFavorited
       FROM favorites fav
       JOIN sounds s ON s.id = fav.soundId
       JOIN users u ON u.id = s.userId
       WHERE fav.userId = ?
       ORDER BY fav.createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(user.id, pageSize, offset)) as SoundWithUploader[];

  return NextResponse.json({
    items,
    total: count.cnt,
    page,
    totalPages: Math.max(1, Math.ceil(count.cnt / pageSize)),
  });
}

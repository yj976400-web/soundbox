import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  await dbReady;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const rows = await db
    .prepare(
      `SELECT s.*, u.username AS uploaderUsername,
        (SELECT COUNT(*) FROM reports r WHERE r.soundId = s.id AND r.status='pending') AS pendingReports
       FROM sounds s JOIN users u ON u.id = s.userId
       WHERE s.title LIKE @q OR u.username LIKE @q
       ORDER BY s.createdAt DESC LIMIT 200`
    )
    .all({ q: `%${q}%` });

  return NextResponse.json({ items: rows });
}

export async function DELETE(req: NextRequest) {
  await dbReady;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
  }

  const limit = checkRateLimit(`admin-mutation:user:${user.id}`, RATE_LIMITS.adminMutation);
  if (!limit.allowed) return rateLimitResponse(limit);

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const result = await db.prepare("DELETE FROM sounds WHERE id = ?").run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }

  console.info(
    `[admin-audit] ${new Date().toISOString()} admin=${user.username}(${user.id}) action=delete_sound target=${id}`
  );

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  await dbReady;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
  }
  const rows = await db
    .prepare(
      `SELECT r.*, s.title AS soundTitle, ru.username AS reporterUsername
       FROM reports r
       LEFT JOIN sounds s ON s.id = r.soundId
       LEFT JOIN users ru ON ru.id = r.reporterId
       ORDER BY r.createdAt DESC LIMIT 300`
    )
    .all();
  return NextResponse.json({ items: rows });
}

export async function PATCH(req: NextRequest) {
  await dbReady;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 });
  }

  const limit = checkRateLimit(`admin-mutation:user:${user.id}`, RATE_LIMITS.adminMutation);
  if (!limit.allowed) return rateLimitResponse(limit);

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["pending", "resolved"].includes(status)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  await db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
  return NextResponse.json({ ok: true });
}

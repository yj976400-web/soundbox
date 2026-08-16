import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const VALID_REASONS = ["부적절한 콘텐츠", "저작권 침해 의심", "스팸", "기타"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const user = await getCurrentUser();

  // 로그인 사용자는 계정 기준, 비로그인은 IP 기준으로 제한한다.
  const limitKey = user ? `report:user:${user.id}` : `report:ip:${getClientIdentifier(req)}`;
  const limit = checkRateLimit(limitKey, RATE_LIMITS.report);
  if (!limit.allowed) return rateLimitResponse(limit);

  const sound = await db.prepare("SELECT id FROM sounds WHERE id = ?").get(id);
  if (!sound) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "";
  const detail = typeof body.detail === "string" ? body.detail.slice(0, 500) : "";

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "올바른 신고 사유를 선택해주세요." }, { status: 400 });
  }

  await db.prepare(
    "INSERT INTO reports (id, soundId, reporterId, reason, detail) VALUES (?, ?, ?, ?, ?)"
  ).run(crypto.randomUUID(), id, user?.id ?? null, reason, detail);

  return NextResponse.json({ ok: true });
}

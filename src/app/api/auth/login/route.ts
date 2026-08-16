import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import type { UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  await dbReady;

  const ip = getClientIdentifier(req);
  // IP 기준 제한: 한 곳에서 여러 계정을 무차별 시도하는 것을 막는다.
  const ipLimit = checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.login);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  // 이메일 기준 제한: 여러 IP를 돌려가며 같은 계정을 공격하는 것을 막는다.
  if (email) {
    const emailLimit = checkRateLimit(`login:email:${email}`, RATE_LIMITS.login);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit);
  }

  const user = (await db.prepare("SELECT * FROM users WHERE email = ?").get(email)) as
    | UserRow
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  const { passwordHash: _ph, ...safeUser } = user;
  void _ph;

  return NextResponse.json({ user: safeUser });
}

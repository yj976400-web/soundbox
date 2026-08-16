import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";
import { hashPassword, setSessionCookie, EMAIL_RE, USERNAME_RE } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import type { UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  await dbReady;

  const ip = getClientIdentifier(req);
  const limit = checkRateLimit(`signup:ip:${ip}`, RATE_LIMITS.signup);
  if (!limit.allowed) return rateLimitResponse(limit);

  let body: { email?: string; username?: string; password?: string; passwordConfirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const username = (body.username || "").trim();
  const password = body.password || "";
  const passwordConfirm = body.passwordConfirm || "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "사용자명은 3~20자의 영문, 숫자, _, - 만 사용할 수 있습니다." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  const existing = await db
    .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .get(email, username);
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 이메일 또는 사용자명입니다." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO users (id, username, email, passwordHash, role) VALUES (?, ?, ?, ?, 'user')`
  ).run(id, username, email, passwordHash);

  await setSessionCookie(id);

  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(id)) as UserRow;
  const { passwordHash: _ph, ...safeUser } = user;
  void _ph;

  return NextResponse.json({ user: safeUser }, { status: 201 });
}

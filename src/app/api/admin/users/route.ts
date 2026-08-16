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
      `SELECT id, username, email, role, createdAt,
        (SELECT COUNT(*) FROM sounds s WHERE s.userId = users.id) AS soundCount
       FROM users ORDER BY createdAt DESC LIMIT 300`
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

  const { id, role } = await req.json().catch(() => ({}));
  if (!id || !["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 관리자가 실수로(또는 악성 스크립트에 의해) 자기 자신의 관리자 권한을
  // 스스로 내려서 계정이 잠기는 것을 방지한다.
  if (id === user.id && role !== "admin") {
    return NextResponse.json(
      { error: "자기 자신의 관리자 권한은 스스로 해제할 수 없습니다. 다른 관리자에게 요청하세요." },
      { status: 400 }
    );
  }

  const result = await db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });
  }

  // 감사 로그: 누가 언제 누구의 권한을 어떻게 바꿨는지 서버 로그에 남긴다.
  // (민감정보인 비밀번호/토큰류는 절대 포함하지 않는다.)
  console.info(
    `[admin-audit] ${new Date().toISOString()} admin=${user.username}(${user.id}) action=role_change target=${id} newRole=${role}`
  );

  return NextResponse.json({ ok: true });
}

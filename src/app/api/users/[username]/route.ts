import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/lib/db";
import type { UserRow } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  await dbReady;
  const { username } = await params;
  const user = (await db.prepare("SELECT * FROM users WHERE username = ?").get(username)) as
    | UserRow
    | undefined;
  if (!user) {
    return NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });
  }

  const stats = (await db
    .prepare(
      "SELECT COUNT(*) as soundCount, COALESCE(SUM(downloadCount),0) as totalDownloads FROM sounds WHERE userId = ?"
    )
    .get(user.id)) as { soundCount: number; totalDownloads: number };

  const { passwordHash: _ph, email: _email, ...safeUser } = user;
  void _ph;
  void _email;

  return NextResponse.json({ user: safeUser, stats });
}

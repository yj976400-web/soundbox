import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, dbReady, CATEGORIES } from "@/lib/db";
import { getSoundById, getRelatedSounds } from "@/lib/queries";
import { deleteAudioFile } from "@/lib/upload";
import type { SoundRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const sound = await getSoundById(id, currentUser?.id ?? null);
  if (!sound) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }
  const related = await getRelatedSounds(sound);
  return NextResponse.json({ sound, related });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const existing = (await db.prepare("SELECT * FROM sounds WHERE id = ?").get(id)) as SoundRow | undefined;
  if (!existing) return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  if (existing.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "이 효과음을 수정할 권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : existing.title;
  const description =
    typeof body.description === "string" ? body.description.trim() : existing.description;
  const category =
    typeof body.category === "string" && CATEGORIES.includes(body.category)
      ? body.category
      : existing.category;
  const tags = Array.isArray(body.tags)
    ? JSON.stringify(body.tags.slice(0, 10).map((t: unknown) => String(t).trim()).filter(Boolean))
    : existing.tags;

  if (!title || title.length > 100) {
    return NextResponse.json({ error: "제목을 1~100자로 입력해주세요." }, { status: 400 });
  }

  await db.prepare(
    `UPDATE sounds SET title=@title, description=@description, category=@category, tags=@tags, updatedAt=datetime('now') WHERE id=@id`
  ).run({ id, title, description, category, tags });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const existing = (await db.prepare("SELECT * FROM sounds WHERE id = ?").get(id)) as SoundRow | undefined;
  if (!existing) return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  if (existing.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "이 효과음을 삭제할 권한이 없습니다." }, { status: 403 });
  }

  await db.prepare("DELETE FROM sounds WHERE id = ?").run(id);

  await deleteAudioFile(existing.fileUrl).catch(() => {});

  return NextResponse.json({ ok: true });
}

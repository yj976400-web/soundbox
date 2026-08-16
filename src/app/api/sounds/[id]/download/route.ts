import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db, dbReady } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/upload";
import type { SoundRow } from "@/lib/types";

// 짧은 시간 내 같은 사용자가 같은 효과음을 여러 번 클릭해도 다운로드 수가
// 비정상적으로 여러 번 증가하지 않도록 간단한 in-memory 중복 방지를 둔다.
const recentDownloads = new Map<string, number>();
const DEDUPE_WINDOW_MS = 8000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbReady;
  const { id } = await params;
  const sound = (await db.prepare("SELECT * FROM sounds WHERE id = ?").get(id)) as
    | SoundRow
    | undefined;
  if (!sound) {
    return NextResponse.json({ error: "존재하지 않는 효과음입니다." }, { status: 404 });
  }

  const isRemote = /^https?:\/\//.test(sound.fileUrl);
  let data: Uint8Array;

  if (isRemote) {
    // Vercel Blob 등 외부 저장소에 있는 파일을 그대로 프록시해서 내려준다.
    const upstream = await fetch(sound.fileUrl);
    if (!upstream.ok) {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    }
    data = new Uint8Array(await upstream.arrayBuffer());
  } else {
    const filePath = path.join(UPLOAD_DIR, path.basename(sound.fileUrl));
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    }
    data = new Uint8Array(fs.readFileSync(filePath));
  }

  const user = await getCurrentUser();
  const identity = user?.id || req.headers.get("x-forwarded-for") || "anonymous";
  const key = `${identity}:${id}`;
  const now = Date.now();
  const last = recentDownloads.get(key);
  if (!last || now - last > DEDUPE_WINDOW_MS) {
    await db.prepare("UPDATE sounds SET downloadCount = downloadCount + 1 WHERE id = ?").run(id);
    recentDownloads.set(key, now);
  }

  const safeFileName = sound.fileName.replace(/[/\\]/g, "_");
  return new NextResponse(Buffer.from(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
    },
  });
}

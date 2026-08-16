import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { db, dbReady, CATEGORIES } from "@/lib/db";
import { MAX_FILE_SIZE, isAllowedAudioFile, saveAudioFile } from "@/lib/upload";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  await dbReady;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 로그인한 사용자 기준으로 제한한다 (익명 업로드는 애초에 차단되므로 IP보다 신뢰도 높음).
  const limit = checkRateLimit(`upload:user:${user.id}`, RATE_LIMITS.upload);
  if (!limit.allowed) return rateLimitResponse(limit);

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const category = String(form.get("category") || "기타").trim();
  const tagsRaw = String(form.get("tags") || "");
  const duration = Number(form.get("duration") || 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "효과음 파일을 선택해주세요." }, { status: 400 });
  }
  if (!title || title.length > 100) {
    return NextResponse.json({ error: "제목을 1~100자로 입력해주세요." }, { status: 400 });
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: "설명이 너무 깁니다." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "올바르지 않은 카테고리입니다." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 15MB를 초과할 수 없습니다." },
      { status: 400 }
    );
  }
  if (!isAllowedAudioFile(file.name, file.type)) {
    return NextResponse.json(
      { error: "MP3, WAV, OGG, M4A 형식만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const ext = path.extname(file.name).toLowerCase();
  const id = crypto.randomUUID();
  const storedFileName = `${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // 매직 바이트를 간단히 확인해 확장자를 위조한 비-오디오 파일 업로드를 걸러낸다.
  if (!looksLikeAudio(buffer, ext)) {
    return NextResponse.json({ error: "올바른 오디오 파일이 아닙니다." }, { status: 400 });
  }

  const fileUrl = await saveAudioFile(storedFileName, buffer).catch((err) => {
    // 스택 트레이스나 서버 내부 경로를 사용자에게 그대로 노출하지 않고,
    // 서버 로그에만 상세 원인을 남긴다.
    console.error("[upload] 파일 저장 실패:", err);
    return null;
  });

  if (!fileUrl) {
    return NextResponse.json(
      { error: "파일 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  const inserted = await db
    .prepare(
      `INSERT INTO sounds (id, title, description, fileUrl, fileName, fileSize, duration, category, tags, userId)
       VALUES (@id, @title, @description, @fileUrl, @fileName, @fileSize, @duration, @category, @tags, @userId)`
    )
    .run({
      id,
      title,
      description,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      duration: Number.isFinite(duration) ? duration : 0,
      category,
      tags: JSON.stringify(tags),
      userId: user.id,
    })
    .catch((err) => {
      console.error("[upload] DB 저장 실패:", err);
      return null;
    });

  if (!inserted) {
    return NextResponse.json(
      { error: "효과음 정보를 저장하는 데 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id }, { status: 201 });
}

function looksLikeAudio(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  const header = buffer.subarray(0, 12);
  const hex = header.toString("hex");
  const ascii = header.toString("latin1");
  if (ext === ".mp3") {
    return hex.startsWith("494433") || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
  }
  if (ext === ".wav") {
    return ascii.startsWith("RIFF");
  }
  if (ext === ".ogg") {
    return ascii.startsWith("OggS");
  }
  if (ext === ".m4a") {
    return ascii.includes("ftyp") || ascii.includes("M4A");
  }
  return true;
}

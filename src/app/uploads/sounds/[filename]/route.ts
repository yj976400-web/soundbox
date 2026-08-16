import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { UPLOAD_DIR } from "@/lib/upload";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  // 경로 탐색(path traversal) 방지: 파일명만 허용
  const safeName = path.basename(filename);
  if (safeName !== filename) {
    return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
  }
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}

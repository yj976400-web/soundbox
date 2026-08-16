import path from "path";
import fs from "fs";
import { put, del } from "@vercel/blob";

// 파일 저장 방식은 이 모듈에만 모듈화되어 있다.
//
// - BLOB_READ_WRITE_TOKEN 환경변수가 있으면(Vercel Blob 연결 시 자동 주입) Vercel Blob에 저장한다.
//   Blob은 절대 URL(https://...)을 반환하며, 이 URL을 그대로 DB의 fileUrl 컬럼에 저장한다.
// - 없으면(로컬 개발) 기존처럼 uploads/sounds 폴더에 저장하고 "/uploads/sounds/파일명" 형태의
//   상대 경로를 저장한다. 이 경로는 src/app/uploads/sounds/[filename]/route.ts가 서빙한다.
//
// 배포 시 S3/R2/Supabase Storage 등 다른 저장소로 바꾸려면 이 파일의 saveAudioFile /
// deleteAudioFile 두 함수만 교체하면 된다.

export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "sounds");

// 로컬 폴더 생성은 "로컬 저장 모드를 실제로 쓸 때, 실제로 필요한 시점에만" 시도한다.
// 이전에는 모듈이 로드되는 즉시 mkdir을 실행했는데, Vercel 같은 서버리스 환경은
// 배포된 코드의 파일시스템이 읽기 전용이라(쓰기 가능한 곳은 /tmp뿐) 이 mkdir 자체가
// 예외를 던지고, 그 예외가 모듈 평가 단계에서 발생해 이 파일을 import하는 모든 API
// 라우트가 통째로 500 에러를 내는 원인이 되었다. 지연 생성 + try/catch로 방어한다.
function ensureUploadDir() {
  if (USE_BLOB) return; // Blob을 쓸 때는 로컬 폴더가 필요 없다.
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (err) {
    // 로컬 저장 모드인데 폴더조차 만들 수 없는 환경(예: 읽기 전용 배포 환경에 Blob
    // 토큰 설정을 깜빡한 경우)이라면, 나중에 saveAudioFile 호출 시점에 명확한
        // 에러 메시지로 알려주는 편이 "이유 모를 500"보다 훨씬 낫다.
    console.error(
      "[upload] 로컬 업로드 폴더를 생성할 수 없습니다. Vercel 등 서버리스 환경이라면 " +
        "BLOB_READ_WRITE_TOKEN 환경변수가 설정되어 있는지 확인하세요.",
      err
    );
  }
}

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/x-m4a",
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
]);

export const ALLOWED_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);

export function isAllowedAudioFile(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  // MIME 타입은 브라우저마다 다르게 보고할 수 있어 확장자와 함께 관대하게 확인한다.
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType) && !mimeType.startsWith("audio/")) {
    return false;
  }
  return true;
}

export function safeFileId(): string {
  return crypto.randomUUID();
}

/**
 * 오디오 파일을 저장하고, DB에 저장할 fileUrl을 반환한다.
 * - Blob 사용 시: https://...public.blob.vercel-storage.com/... 형태의 절대 URL
 * - 로컬 사용 시: /uploads/sounds/{storedFileName} 형태의 상대 경로
 */
export async function saveAudioFile(storedFileName: string, buffer: Buffer): Promise<string> {
  if (USE_BLOB) {
    const blob = await put(`sounds/${storedFileName}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }
  ensureUploadDir();
  if (!fs.existsSync(UPLOAD_DIR)) {
    // 여기까지 왔다는 건 Blob 토큰도 없고 로컬 폴더도 못 만드는 상태 —
    // 즉 파일을 저장할 방법이 아예 없는 배포 설정 오류다. 조용히 실패시키지 않고
    // 관리자가 바로 원인을 알 수 있는 에러를 던진다.
    throw new Error(
      "파일 저장소가 설정되지 않았습니다. 배포 환경이라면 Vercel Blob(BLOB_READ_WRITE_TOKEN)을 연결해주세요."
    );
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, storedFileName), buffer);
  return `/uploads/sounds/${storedFileName}`;
}

/** 효과음 삭제 시 저장된 실제 파일도 함께 삭제한다. */
export async function deleteAudioFile(fileUrl: string): Promise<void> {
  if (USE_BLOB && /^https?:\/\//.test(fileUrl)) {
    await del(fileUrl).catch(() => {});
    return;
  }
  const filePath = path.join(UPLOAD_DIR, path.basename(fileUrl));
  fs.promises.unlink(filePath).catch(() => {});
}

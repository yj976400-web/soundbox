/**
 * 사용법: node scripts/make-admin.js <username>
 * 이미 회원가입한 사용자를 관리자로 승격합니다.
 *
 * 로컬 SQLite 파일(data/soundbox.db)과 Turso(원격 DB) 둘 다 지원합니다.
 * .env.local에 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 설정되어 있으면
 * 그 값을 자동으로 읽어 원격 DB를 사용합니다.
 */
const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");

// .env.local을 간단히 파싱해서 환경변수로 로드 (dotenv 의존성 없이)
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const username = process.argv[2];
if (!username) {
  console.error("사용법: node scripts/make-admin.js <username>");
  process.exit(1);
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

const db = TURSO_URL
  ? createClient({ url: TURSO_URL, authToken: TURSO_AUTH_TOKEN })
  : createClient({ url: `file:${path.join(__dirname, "..", "data", "soundbox.db")}` });

(async () => {
  const result = await db.execute({
    sql: "UPDATE users SET role = 'admin' WHERE username = ?",
    args: [username],
  });

  if (Number(result.rowsAffected) === 0) {
    console.error(`사용자 '${username}'을(를) 찾을 수 없습니다. 먼저 회원가입을 진행해주세요.`);
    process.exit(1);
  }

  console.log(`'${username}' 계정이 관리자로 승격되었습니다.`);
  process.exit(0);
})();

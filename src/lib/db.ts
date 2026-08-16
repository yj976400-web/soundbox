import { createClient, type Client, type InArgs } from "@libsql/client";
import path from "path";
import fs from "fs";

// DB 연결. 배포 시 이 파일만 교체하면 다른 저장소로 쉽게 전환할 수 있도록
// 모든 쿼리는 이 모듈을 통해서만 이루어지게 구성한다.
//
// Turso(libSQL)를 사용한다. libSQL은 SQLite와 100% 호환되는 SQL 문법을 쓰면서도
// 원격 서버에 데이터를 영구 저장할 수 있어(Vercel처럼 배포마다 파일시스템이
// 초기화되는 서버리스 환경에 적합), 로컬 개발 중에는 TURSO_DATABASE_URL이
// 없으면 자동으로 로컬 파일(data/soundbox.db)을 사용하도록 폴백한다.
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

declare global {
  // eslint-disable-next-line no-var
  var __soundboxDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __soundboxDbReady: Promise<void> | undefined;
}

function createDbClient(): Client {
  if (TURSO_URL) {
    return createClient({ url: TURSO_URL, authToken: TURSO_AUTH_TOKEN });
  }
  // 로컬 개발용 폴백: 프로젝트 루트의 data/soundbox.db 파일을 사용한다.
  // libSQL 파일 클라이언트는 better-sqlite3와 달리 상위 폴더를 자동 생성하지 않으므로 미리 만들어둔다.
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, "soundbox.db")}` });
}

const rawDb: Client = global.__soundboxDb ?? createDbClient();
if (process.env.NODE_ENV !== "production") {
  global.__soundboxDb = rawDb;
}

type Row = Record<string, unknown>;

// libSQL이 반환하는 row는 Proxy 기반의 특수 객체(Row 클래스 인스턴스)라
// "Only plain objects... can be passed to Client Components" 에러의 원인이 된다.
// 서버 컴포넌트에서 클라이언트 컴포넌트로 props를 넘길 수 있도록 순수 plain object로 변환한다.
function toPlainRow(row: unknown): Row {
  return { ...(row as Row) };
}

function sanitizeValue(v: unknown): unknown {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === undefined) return null;
  return v;
}

function sanitizeParams(params: unknown): InArgs {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params.map(sanitizeValue) as InArgs;
  if (typeof params === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
      out[k] = sanitizeValue(v);
    }
    return out as InArgs;
  }
  return [sanitizeValue(params)] as InArgs;
}

// SQL 문자열에 실제로 등장하는 named param 이름(@x, :x, $x)만 추출한다.
// libSQL은 쿼리에 없는 이름이 객체에 섞여 있으면 에러를 던지므로,
// 쿼리마다 실제 사용된 키만 골라서 넘겨준다.
function extractNamedParams(sql: string): Set<string> | null {
  const matches = sql.match(/[@:$][a-zA-Z_][a-zA-Z0-9_]*/g);
  if (!matches) return null;
  return new Set(matches.map((m) => m.slice(1)));
}

function filterParamsForSql(sql: string, params: unknown): unknown {
  if (params === null || typeof params !== "object" || Array.isArray(params)) return params;
  const names = extractNamedParams(sql);
  if (!names) return params;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (names.has(k)) out[k] = v;
  }
  return out;
}

type StatementLike = {
  get: (...args: unknown[]) => Promise<Row | undefined>;
  all: (...args: unknown[]) => Promise<Row[]>;
  run: (...args: unknown[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>;
};

export const db = {
  async exec(sql: string) {
    // 여러 statement가 세미콜론으로 이어진 DDL 실행용 (테이블 생성 등)
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await rawDb.execute(stmt);
    }
  },
  prepare(sql: string): StatementLike {
    const bind = (args: unknown[]): unknown => {
      const params = args.length === 1 ? sanitizeParams(args[0]) : args.map(sanitizeValue);
      return filterParamsForSql(sql, params);
    };
    return {
      get: async (...args: unknown[]) => {
        const params = bind(args) as InArgs;
        const result = await rawDb.execute({ sql, args: params });
        return result.rows[0] ? toPlainRow(result.rows[0]) : undefined;
      },
      all: async (...args: unknown[]) => {
        const params = bind(args) as InArgs;
        const result = await rawDb.execute({ sql, args: params });
        return result.rows.map(toPlainRow);
      },
      run: async (...args: unknown[]) => {
        const params = bind(args) as InArgs;
        const result = await rawDb.execute({ sql, args: params });
        return {
          changes: Number(result.rowsAffected),
          lastInsertRowid: result.lastInsertRowid ?? 0,
        };
      },
    };
  },
};

async function initSchema() {
  await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  profileImage TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sounds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  fileUrl TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '기타',
  tags TEXT NOT NULL DEFAULT '[]',
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playCount INTEGER NOT NULL DEFAULT 0,
  downloadCount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  soundId TEXT NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, soundId)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  soundId TEXT NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
  reporterId TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  detail TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sounds_category ON sounds(category);
CREATE INDEX IF NOT EXISTS idx_sounds_userId ON sounds(userId);
CREATE INDEX IF NOT EXISTS idx_sounds_createdAt ON sounds(createdAt);
CREATE INDEX IF NOT EXISTS idx_sounds_playCount ON sounds(playCount);
CREATE INDEX IF NOT EXISTS idx_sounds_downloadCount ON sounds(downloadCount);
CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
CREATE INDEX IF NOT EXISTS idx_favorites_soundId ON favorites(soundId);
`);
}

// 스키마 초기화는 최초 1회만 수행하고, 이후 요청들은 이 Promise를 기다린다.
export const dbReady: Promise<void> = global.__soundboxDbReady ?? initSchema();
if (process.env.NODE_ENV !== "production") {
  global.__soundboxDbReady = dbReady;
}

export { CATEGORIES } from "./categories";

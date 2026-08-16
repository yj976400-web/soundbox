import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, dbReady } from "./db";
import type { UserRow } from "./types";

// 세션 서명에 쓰는 비밀 키. 프로덕션에서 AUTH_SECRET이 설정되지 않으면
// 즉시 서버 시작을 실패시킨다 — 하드코딩된 폴백 값을 쓰면 공격자가 같은 값으로
// 임의의 사용자(관리자 포함) 세션 토큰을 위조할 수 있기 때문에, "일단 동작은 하되
// 위험한" 상태를 절대 허용하지 않는다. 개발 환경에서만 편의상 폴백을 허용한다.
function resolveAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[보안] AUTH_SECRET 환경변수가 설정되지 않았거나 너무 짧습니다(32자 이상 필요). " +
        "프로덕션에서는 이 값이 없으면 세션이 위조될 수 있어 서버를 시작하지 않습니다. " +
        "openssl rand -base64 32 명령으로 생성한 값을 환경변수에 설정하세요."
    );
  }
  return "dev-only-insecure-secret-change-me-please-min-32-chars";
}

const SESSION_COOKIE = "soundbox_session";
const SECRET = new TextEncoder().encode(resolveAuthSecret());
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30일 로그인 상태 유지

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(SECRET);
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function getUserIdFromToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserRow | null> {
  await dbReady;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = await getUserIdFromToken(token);
  if (!userId) return null;
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) as
    | UserRow
    | undefined;
  return user ?? null;
}

export function sanitizeUser(user: UserRow) {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[a-zA-Z0-9_\-]{3,20}$/;

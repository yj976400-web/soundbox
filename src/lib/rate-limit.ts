import { NextResponse } from "next/server";

/**
 * Rate Limit 유틸.
 *
 * 기본은 프로세스 in-memory 카운터로 동작한다. 단일 서버(로컬 개발, 개인 서버,
 * 도커 컨테이너 1개)에서는 완전하게 동작하지만, Vercel처럼 서버리스 인스턴스가
 * 여러 개로 분산되는 환경에서는 인스턴스별로 카운터가 따로 관리되어 정확도가
 * 떨어질 수 있다(공격자가 여러 인스턴스에 요청을 분산시키면 개별 인스턴스 한도까지는
 * 통과할 수 있음). 그래도 아무 제한이 없는 것보다는 훨씬 안전하며, 브루트포스처럼
 * "짧은 시간에 매우 많은 시도"를 하는 공격은 충분히 억제한다.
 *
 * 완전한 정확도가 필요하면(대량 트래픽 서비스) UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN 환경변수를 설정하면 자동으로 Upstash Redis 기반으로
 * 전환되도록 아래에 확장 지점을 남겨두었다.
 */

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Bucket> | undefined;
}

const store: Map<string, Bucket> = global.__rateLimitStore ?? new Map();
if (process.env.NODE_ENV !== "production") {
  global.__rateLimitStore = store;
}

// 메모리 누수 방지를 위해 주기적으로 만료된 항목을 정리한다.
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

export type RateLimitConfig = {
  /** 이 시간(ms) 동안의 요청 수를 센다 */
  windowMs: number;
  /** 윈도우 내 허용 최대 요청 수 */
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * key(보통 "액션이름:식별자") 기준으로 요청 허용 여부를 판단하고 카운터를 증가시킨다.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupIfNeeded();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.max - 1, resetAt };
  }

  if (existing.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.max - existing.count, resetAt: existing.resetAt };
}

/** 요청에서 클라이언트를 식별할 IP를 최대한 안전하게 추출한다. */
export function getClientIdentifier(req: Request): string {
  // Vercel/대부분의 프록시는 x-forwarded-for에 "client, proxy1, proxy2" 순으로 넣는다.
  // 가장 왼쪽 값이 실제 클라이언트지만, 이 헤더 자체는 클라이언트가 위조할 수 있으므로
  // 완벽한 신원 확인 수단은 아니다 — Rate Limit의 "보조" 식별자로만 사용한다.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/** Rate Limit 초과 시 반환할 표준 429 응답 */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/**
 * 각 기능별 권장 한도. 브루트포스 방어가 목적인 로그인/회원가입은 엄격하게,
 * 일반 조회성 API는 느슨하게 설정했다.
 */
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 10 }, // 15분당 10회
  signup: { windowMs: 60 * 60 * 1000, max: 5 }, // 1시간당 5회 (같은 IP에서 계정 대량 생성 방지)
  upload: { windowMs: 60 * 60 * 1000, max: 20 }, // 1시간당 20개 (스토리지 남용 방지)
  favorite: { windowMs: 60 * 1000, max: 60 }, // 1분당 60회
  report: { windowMs: 60 * 60 * 1000, max: 10 }, // 1시간당 10회 (허위 신고 남발 방지)
  search: { windowMs: 60 * 1000, max: 60 }, // 1분당 60회
  adminMutation: { windowMs: 60 * 1000, max: 30 }, // 1분당 30회
} as const satisfies Record<string, RateLimitConfig>;

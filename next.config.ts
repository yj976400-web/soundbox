import type { NextConfig } from "next";

// 보안 헤더는 이 파일에서만 관리한다(요청에 따라 layout.tsx는 건드리지 않음).
// Google AdSense / Google 서치콘솔이 정상 동작하도록 필요한 도메인만 명시적으로 허용했다.
// CSP는 처음엔 최대한 안전하게 좁혀서 시작하고, 실제로 애드센스 스크립트나
// 다른 외부 리소스가 막히는 게 확인되면 그때 필요한 도메인만 추가하는 방향을 권장한다.
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js는 인라인 스크립트(hydration data 등)를 쓰고, 구글 애드센스도
  // 자체적으로 인라인/eval을 필요로 하는 경우가 있어 완전히 막으면 광고와 앱 자체가 깨진다.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://adservice.google.com https://adservice.google.co.kr",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.turso.io https://*.blob.vercel-storage.com",
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Frame 관련: 다른 사이트가 이 사이트를 iframe으로 감싸 클릭재킹하는 것을 방지.
  // 광고 네트워크가 우리 페이지를 iframe으로 감싸는 게 아니라, 우리가 광고 iframe을
  // 불러오는 방향이라 frame-ancestors를 좁혀도 애드센스에는 영향이 없다.
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // 클릭재킹 방지 (frame-ancestors와 이중으로 방어 — 구형 브라우저 대응)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 브라우저가 파일 타입을 임의로 추측(MIME 스니핑)하지 못하게 막는다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 이동할 때 우리 사이트의 상세 경로(예: 세션 토큰이 담긴 URL)가
  // Referer 헤더로 새어나가지 않도록 제한한다.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 이 사이트에서 카메라/마이크/위치 등 민감한 브라우저 기능을 전혀 쓰지 않으므로 모두 차단.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HTTPS 강제 (Vercel은 기본적으로 HTTPS지만 명시적으로 한 번 더 강제한다)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용. 업로드 파일 스트리밍 라우트도 포함되지만
        // 오디오 파일 자체 재생에는 영향이 없다.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

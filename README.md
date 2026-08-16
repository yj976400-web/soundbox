# SoundBox — 효과음 공유 플랫폼

누구나 효과음을 업로드하고, 검색·재생·다운로드·찜할 수 있는 실제 동작하는 웹 애플리케이션입니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 16 (App Router) + React + TypeScript + Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | [Turso](https://turso.tech)(libSQL, SQLite 호환) — 로컬 개발 시엔 파일 기반 SQLite로 자동 폴백 |
| 파일 저장 | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — 로컬 개발 시엔 디스크(`/uploads`)로 자동 폴백 |
| 인증 | bcrypt 비밀번호 해시 + JWT 세션 쿠키 (httpOnly, 30일 유지) |
| 오디오 재생 | HTML5 Audio API + 전역 재생 상태(Context) |

> **왜 이 조합인가요?**
> Vercel 같은 서버리스 배포 환경은 배포마다(그리고 요청마다) 파일시스템이 초기화됩니다. 로컬 SQLite 파일이나 로컬 디스크에 저장하면 **배포할 때마다 회원가입 데이터와 업로드한 효과음이 전부 사라집니다.** 그래서 DB는 Turso(원격 SQLite 호환 DB), 파일은 Vercel Blob에 저장하도록 구성했습니다.
>
> 두 서비스 모두 **환경변수가 설정되어 있지 않으면 자동으로 로컬 파일 기반으로 동작**합니다. 즉 로컬 개발 중에는 별도 계정 없이 `npm run dev`만으로 바로 실행되고, 배포할 때만 환경변수를 추가하면 됩니다.

## 폴더 구조 (핵심)

```
soundbox/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # 홈 (Hero, 인기/최신 효과음)
│   │   ├── layout.tsx
│   │   ├── globals.css                   # 디자인 토큰 (다크/라이트)
│   │   ├── (main)/
│   │   │   ├── explore/ search/          # 탐색, 검색
│   │   │   ├── sound/[id]/                # 효과음 상세 + 관련 효과음
│   │   │   ├── login/ signup/            # 인증
│   │   │   ├── upload/                   # 업로드 (드래그앤드롭, 진행률)
│   │   │   ├── favorites/ dashboard/     # 찜 목록, 내 효과음 관리
│   │   │   ├── profile/[username]/       # 사용자 프로필
│   │   │   └── admin/                    # 관리자 (효과음/사용자/신고)
│   │   ├── api/                          # 전체 REST API
│   │   └── uploads/sounds/[filename]/    # 로컬 개발용 업로드 파일 스트리밍 라우트
│   ├── components/                       # SoundCard, Navbar, MiniPlayer, Waveform 등
│   ├── context/                          # AuthContext, PlayerContext(전역 재생)
│   └── lib/
│       ├── db.ts                         # DB 연결(Turso/로컬 SQLite 자동 분기) — 배포 시 여기만 교체
│       ├── upload.ts                     # 파일 저장(Vercel Blob/로컬 자동 분기) — 배포 시 여기만 교체
│       ├── auth.ts, queries.ts, format.ts
├── data/soundbox.db                      # 로컬 개발용 SQLite 파일 (자동 생성, git에는 안 올라감)
├── uploads/sounds/                       # 로컬 개발용 업로드 파일 저장 위치
├── scripts/make-admin.js                 # 관리자 승격 스크립트 (로컬/Turso 겸용)
└── .env.example
```

## 로컬 개발 — 설치 및 실행

```bash
cd soundbox
npm install
cp .env.example .env.local
# .env.local의 AUTH_SECRET을 무작위 문자열로 교체하세요.
# 생성 예: openssl rand -base64 32
npm run dev
```

`http://localhost:3000` 접속. 로컬에서는 `TURSO_DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`을 설정하지 않으면 각각 `data/soundbox.db` 파일과 `uploads/sounds` 폴더를 자동으로 사용합니다.

### 로컬 DB 초기화

```bash
rm -rf data
```

### 관리자 계정 만들기

1. 사이트에서 일반 회원가입 진행
2. 아래 스크립트로 승격

```bash
node scripts/make-admin.js <가입한_사용자명>
```

---

## Vercel 배포하기 (전체 절차)

### 1단계 — GitHub에 코드 올리기

```bash
cd soundbox
git init
git add .
git commit -m "Initial commit"
```

GitHub에서 새 레포지토리를 만든 뒤:

```bash
git remote add origin https://github.com/<내계정>/<레포이름>.git
git branch -M main
git push -u origin main
```

### 2단계 — Turso(DB) 준비

1. https://turso.tech 가입 (무료 티어로 충분)
2. Turso CLI 또는 대시보드에서 새 데이터베이스 생성
3. **Database URL**과 **Auth Token** 발급 (대시보드 → 해당 DB → "Create Token")
   - URL 형식: `libsql://your-db-name-xxxx.turso.io`

### 3단계 — Vercel 프로젝트 생성 + Blob 스토리지 연결

1. https://vercel.com 가입 → "Add New Project" → 방금 올린 GitHub 레포 Import
2. 배포는 아직 하지 말고, 프로젝트 설정에서 **Storage → Blob → Create** 로 Blob 스토어를 하나 만듭니다.
   - Blob을 만들면 `BLOB_READ_WRITE_TOKEN` 환경변수가 **자동으로** 프로젝트에 추가됩니다.

### 4단계 — 환경변수 등록

Vercel 프로젝트 → **Settings → Environment Variables**에 아래를 추가합니다.

| 변수명 | 값 | 비고 |
|---|---|---|
| `AUTH_SECRET` | 무작위 긴 문자열 | `openssl rand -base64 32`로 생성 |
| `TURSO_DATABASE_URL` | 2단계에서 발급한 URL | |
| `TURSO_AUTH_TOKEN` | 2단계에서 발급한 토큰 | |
| `BLOB_READ_WRITE_TOKEN` | (자동 추가됨) | 3단계에서 Blob 생성 시 자동으로 채워집니다 |

### 5단계 — Deploy

환경변수 저장 후 **Deploy** 버튼을 누르면 빌드가 진행되고, 완료되면 `https://프로젝트명.vercel.app` 주소로 바로 접속할 수 있습니다. 이후 `git push`할 때마다 자동으로 재배포됩니다.

이 구조 덕분에 재배포해도 회원 데이터와 업로드한 효과음이 유지됩니다(Turso와 Blob이 Vercel 서버와 별개로 영구 저장되기 때문).

### (선택) 커스텀 도메인 연결

Vercel 프로젝트 → **Settings → Domains**에서 보유한 도메인을 연결할 수 있습니다. 애드센스는 자체 도메인을 쓰는 쪽이 유리합니다.

---

## 구글 애드센스 신청 절차

1. 위 배포가 완료되어 실제 URL로 사이트가 열려 있어야 합니다.
2. https://adsense.google.com 접속 → 사이트 등록 → 사이트 URL 입력
3. 발급되는 `<script>` 태그를 사이트에 삽입해야 합니다 — `src/app/layout.tsx`의 `<head>` 영역에 넣으면 전체 페이지에 적용됩니다. (원하시면 이 태그를 코드에 직접 삽입해드릴 수 있습니다. 발급받은 스니펫을 알려주세요.)
4. 심사 대기 (보통 수일~수주 소요)
5. 승인 후 광고 단위를 만들어 원하는 위치에 배치

> **심사 팁**: 사용자가 올린 콘텐츠만 있는 빈 사이트는 초기 심사에서 반려되는 경우가 많습니다. 서비스 소개, 이용약관, 개인정보처리방침 페이지를 갖추고, 어느 정도 콘텐츠(효과음 데이터)와 실제 방문 트래픽이 쌓인 뒤 신청하는 것이 유리합니다.

---

## 실제로 연결된 기능

- 회원가입 → Turso(또는 로컬 SQLite)에 사용자 저장, 비밀번호는 bcrypt 해시로만 저장
- 로그인 → JWT 세션 쿠키 발급, 30일 로그인 상태 유지
- 효과음 업로드 → 드래그앤드롭 → 서버에서 확장자/MIME/매직바이트 검증 → Vercel Blob(또는 로컬 디스크)에 실제 저장 + DB 저장 → 업로드 진행률 표시 → 상세 페이지로 이동
- 목록/상세/검색 → DB에서 실시간 조회 (카테고리 필터, 5종 정렬, 페이지네이션)
- 재생 → HTML5 Audio API로 실제 파일 재생, 페이지 이동해도 하단 미니 플레이어에서 계속 재생, 재생 시 서버의 재생수 증가
- 다운로드 → 실제 파일 다운로드(Blob 사용 시 서버가 프록시), 짧은 시간 내 중복 클릭 방지 처리
- 찜 → DB에 즉시 저장/삭제
- 신고 → 사유별로 DB에 저장, 관리자 페이지에서 확인/처리
- 프로필 → 사용자별 업로드 목록, 업로드 수, 총 다운로드 수 집계

## 보안

- 비밀번호는 bcrypt로 해시하여 저장 (평문 저장 없음)
- 업로드 파일은 확장자 + MIME 타입 + 파일 매직 바이트를 모두 검사
- 파일 크기 15MB 제한
- 모든 DB 쿼리는 파라미터 바인딩 사용 (SQL Injection 방지)
- React가 기본적으로 이스케이프 처리 (XSS 방지), 사용자 입력 길이 제한
- 본인 소유 효과음만 수정/삭제 가능 (서버에서 소유자 검사), 관리자는 예외적으로 전체 관리 가능
- `/admin`, `/api/admin/*`는 관리자 role 검사 후에만 접근 허용
- 업로드 파일 다운로드 라우트는 경로 탐색(path traversal) 방지 처리

## 알려진 제한사항

- 프로필 이미지 업로드, 비밀번호 재설정 이메일 발송은 미구현
- 파형은 실제 오디오 디코딩 대신 효과음 id를 시드로 한 시각적 파형입니다 (재생 진행률은 실제 재생 위치와 정확히 연동됨)
- 애드센스 스크립트는 코드에 아직 삽입되지 않은 상태입니다 — 발급받은 스니펫을 전달해주시면 반영해드립니다

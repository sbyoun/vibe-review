# 기술 스택 설계 초안

## 1. 결론

MVP는 다음 스택으로 간다.

- App: Next.js App Router + TypeScript
- UI: Tailwind CSS + shadcn/ui + lucide-react
- Database: 내부 Postgres
- Auth: Auth.js + GitHub/Google OAuth
- Storage: S3 호환 Object Storage
- ORM/Migrations: Drizzle ORM + Drizzle Kit
- Hosting: Vercel
- Background jobs: Vercel Cron + Next.js Route Handlers
- Email: Resend
- Analytics: PostHog
- Error tracking: Sentry
- Testing: Vitest + Playwright

핵심 이유는 단순하다. 이 제품은 프로젝트, 피드백, 크레딧, 상태 변경, 공개/비공개 권한이 모두 관계형 데이터에 가깝다. 그래서 DB는 우리가 직접 소유한 Postgres를 중심에 두고, 인증/스토리지/이메일은 얇은 표준 컴포넌트로 붙이는 편이 장기적으로 통제력이 좋다.

Supabase는 빠른 MVP 대안으로는 좋지만 기본안에서는 제외한다. 피드백 크레딧, 큐, 권한 정책, 프로젝트 이력 같은 핵심 도메인은 외부 BaaS 패턴보다 앱 내부 모델과 DB transaction으로 명확히 관리하는 쪽이 이 서비스에 더 맞다.

## 2. 제품 특성에서 나온 기술 요구사항

이 서비스는 일반 게시판보다 다음 요구사항이 강하다.

- 사용자별 비공개 워크스페이스와 공개 프로필이 공존해야 한다.
- 프로젝트 상태 변경 이력이 남아야 한다.
- 피드백 요청은 마감 시간, 최소 피드백 수, 크레딧 사용을 가진다.
- 피드백 크레딧은 돈은 아니지만 정합성이 중요하다.
- 공개 프로젝트는 SEO와 공유 미리보기가 중요하다.
- 데모 URL 상태 체크, 썸네일 생성, 모바일 캡처 같은 백그라운드 작업이 나중에 필요하다.
- 처음에는 빠르게 만들되, 피드백 보장 로직은 나중에 복잡해질 수 있다.

## 3. 권장 아키텍처

```text
Browser
  |
  v
Next.js App Router on Vercel
  |-- Server Components: 읽기 중심 화면
  |-- Server Actions: 폼 제출, 상태 변경, 피드백 작성
  |-- Route Handlers: webhook, cron, public API
  |
  v
Internal services
  |-- Postgres: 핵심 도메인 데이터
  |-- Auth.js: OAuth, session, account mapping
  |-- Object Storage: 프로젝트 이미지, 아바타, 캡처 이미지
  |-- Polling/SSE later: 이후 알림/대시보드 업데이트
  |
  v
External services
  |-- Resend: 이메일 알림
  |-- PostHog: 제품 분석
  |-- Sentry: 에러 추적
  |-- Playwright worker: 이후 썸네일/모바일 캡처
```

## 4. Frontend

### 선택

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- lucide-react
- React Hook Form + Zod

### 이유

Next.js App Router는 공개 상세 페이지, 프로필, SEO, 로그인 후 대시보드를 한 프로젝트 안에서 처리하기 좋다. 공개 페이지는 서버 컴포넌트 중심으로 빠르게 렌더링하고, 워크스페이스의 드래그/필터/모달 같은 상호작용은 클라이언트 컴포넌트로 분리한다.

shadcn/ui는 보드, 탭, 다이얼로그, 드롭다운, 폼, 테이블 같은 운영형 UI를 빠르게 구성하기 좋다. 이 제품은 화려한 랜딩보다 프로젝트 관리 화면의 밀도가 중요하므로, 커스텀 디자인 시스템을 처음부터 만들 필요가 없다.

### 주요 화면 구현 방식

- `/dashboard`: 로그인 후 개인 워크스페이스
- `/dashboard/projects/[id]`: 비공개 관리 상세
- `/p/[handle]`: 공개 프로필
- `/p/[handle]/[slug]`: 공개 프로젝트 상세
- `/feedback`: 피드백 큐
- `/settings`: 프로필/알림/연동 설정

## 5. Backend

### 선택

- Next.js Server Actions
- Next.js Route Handlers
- 내부 Postgres
- Drizzle ORM

### 이유

MVP에서는 별도 Express/Nest/FastAPI 서버를 두지 않는다. 제품 로직 대부분은 폼 제출과 상태 변경이므로 Server Actions가 충분하다. 외부 webhook, cron, 이미지 처리 요청처럼 URL endpoint가 필요한 경우만 Route Handlers를 사용한다.

Drizzle을 쓰는 이유는 스키마와 쿼리를 TypeScript 코드로 관리하면서도 Postgres의 구조를 그대로 살릴 수 있기 때문이다. 인덱스, constraint, transaction, SQL 함수는 migration으로 관리하고, 앱 쿼리는 Drizzle로 작성한다.

### 서버 로직 원칙

- 클라이언트에서 직접 중요한 mutation을 하지 않는다.
- 프로젝트 생성, 상태 변경, 피드백 작성, 크레딧 사용은 모두 서버 액션을 통한다.
- 크레딧 변화는 `credit_ledger`에 append-only로 기록한다.
- 피드백 요청 충족 여부는 cron job이 주기적으로 계산한다.

## 6. Database

### 선택

- 내부 Postgres
- Auth.js 계정/세션 테이블
- 앱 소유 도메인 테이블
- 서버 레벨 권한 체크

### 핵심 테이블

- `users`
- `accounts`
- `sessions`
- `profiles`
- `projects`
- `project_links`
- `project_assets`
- `project_status_events`
- `feedback_requests`
- `feedback`
- `feedback_reactions`
- `feedback_implementation_events`
- `credit_ledger`
- `notifications`
- `tool_tags`

### 설계 원칙

- `projects.visibility`는 `private`, `unlisted`, `public`으로 나눈다.
- 프로젝트 상태는 현재값을 `projects.status`에 두고, 변경 이력은 `project_status_events`에 남긴다.
- 크레딧 잔액은 계산 가능해야 한다. 성능상 캐시 컬럼을 둘 수 있지만 원장은 `credit_ledger`가 기준이다.
- 피드백 요청은 `feedback_requests.status`로 `open`, `fulfilled`, `expired`, `cancelled`를 가진다.
- 피드백 반영 여부는 단순 boolean이 아니라 `planned`, `implemented`, `rejected`, `later` 같은 상태를 둔다.
- 중요한 쓰기는 Postgres transaction 안에서 처리한다.
- `user_id`, `project_id`, `request_id` 기준 foreign key와 unique constraint를 적극적으로 둔다.

## 7. Auth & Permission

### 선택

- Auth.js
- OAuth: GitHub, Google 우선
- Email magic link는 선택

### 이유

타깃 사용자는 개발자/메이커 비중이 높다. GitHub OAuth는 프로젝트 소유자 신뢰와 나중의 repo 연동에도 유리하다. Google OAuth는 일반 사용자 피드백 제공자까지 넓히는 데 필요하다.

Auth.js를 쓰면 인증 테이블을 내부 Postgres에 둘 수 있고, 제품의 `profiles`, `projects`, `feedback` 모델과 자연스럽게 연결할 수 있다. 외부 인증 SaaS에 사용자/세션 모델을 의존하지 않아도 된다.

### 권한 모델

- 비공개 프로젝트는 owner만 읽고 쓸 수 있다.
- 공개 프로젝트는 누구나 읽을 수 있다.
- 피드백은 로그인 사용자가 작성한다.
- 피드백 수정/삭제는 작성자만 가능하다.
- 피드백 반영 상태는 프로젝트 owner만 변경한다.
- 크레딧 원장은 서버만 쓴다.
- OAuth provider account는 로그인에만 쓰고, 제품 권한은 내부 `users.id` 기준으로 판단한다.

## 8. Background Jobs

### MVP

- Vercel Cron
- `/api/cron/feedback-deadlines`
- `/api/cron/demo-health-checks`

### 하는 일

- 48시간 내 피드백 보장 조건 확인
- 미충족 요청 우선순위 상승
- 만료된 요청 상태 변경
- 데모 URL alive/dead 상태 체크
- 알림 이메일 발송

### 이후 분리

다음 작업은 Vercel Function만으로 무거울 수 있으므로 별도 워커로 분리한다.

- Playwright 기반 스크린샷 생성
- 모바일/데스크톱 렌더링 캡처
- 링크 여러 개 병렬 health check
- 보안 체크
- AI 요약/리뷰

후보:

- Trigger.dev
- Inngest
- Upstash QStash
- Fly.io/Render의 long-running worker

MVP에서는 큐 시스템을 먼저 붙이지 않는다. 피드백 보장 로직이 실제로 쓰이기 전까지는 cron + DB 상태 전이가 더 단순하다.

## 9. Storage

### 선택

- S3 호환 Object Storage

우선순위:

- Production: Cloudflare R2 또는 AWS S3
- Self-host/internal: MinIO
- Local dev: filesystem 또는 MinIO Docker

### 저장 대상

- 프로젝트 커버 이미지
- 프로젝트 스크린샷
- 사용자 아바타
- 이후 자동 캡처 이미지

### 정책

- 공개 프로젝트 이미지는 public object 또는 CDN URL을 쓴다.
- 비공개 프로젝트 이미지는 private object + signed URL을 쓴다.
- 업로드는 서버에서 파일 타입과 크기를 검증한다.
- 이미지 바이너리를 Postgres에 직접 넣지 않는다. DB에는 object key, mime type, size, width, height, visibility 같은 메타데이터만 저장한다.

## 10. Notifications

### MVP

- 인앱 알림 테이블
- Resend 이메일

### 알림 이벤트

- 새 피드백 도착
- 피드백 요청 마감 임박
- 피드백 요청 충족
- 내 피드백이 도움 됨으로 표시됨
- 내 피드백이 반영됨
- 프로젝트 상태 변경 리마인더

실시간 푸시는 MVP에서 제외한다. 처음에는 페이지 진입 시 읽기와 가벼운 polling으로 충분하다. 나중에 필요하면 SSE, WebSocket, Pusher, Ably 중 하나를 붙인다.

## 11. Analytics & Observability

### Analytics

- PostHog

추적 이벤트:

- `project_created`
- `feedback_request_created`
- `feedback_submitted`
- `feedback_marked_helpful`
- `feedback_marked_implemented`
- `project_status_changed`
- `project_archived`
- `profile_shared`

### Error tracking

- Sentry

우선순위:

- 서버 액션 에러
- 인증/권한 에러
- cron 실패
- 업로드 실패
- 외부 URL 체크 실패

## 12. Testing

### 선택

- Vitest: 순수 함수와 서버 로직 단위 테스트
- Playwright: 주요 사용자 흐름 E2E
- Drizzle migrations check: DB 변경 검증

### MVP에서 꼭 테스트할 흐름

- 프로젝트 생성
- 프로젝트 공개/비공개 전환
- 피드백 요청 생성
- 크레딧 차감
- 피드백 작성 후 크레딧 지급
- 프로젝트 owner가 피드백 반영 상태 변경
- 비공개 프로젝트 접근 차단

크레딧과 권한은 제품 신뢰의 핵심이므로 단위 테스트를 초기에 둔다.

## 13. Repository Structure

```text
vibe-code-workspace/
  app/
    (marketing)/
    (auth)/
    dashboard/
    feedback/
    p/
    api/
  components/
    ui/
    dashboard/
    feedback/
    projects/
  db/
    schema/
    migrations/
    queries/
  lib/
    auth/
    db/
    storage/
    validations/
    email/
    analytics/
  server/
    actions/
    services/
    jobs/
  tests/
    unit/
    e2e/
  docs/
```

## 14. Environment Variables

```text
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
RESEND_API_KEY=
POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
CRON_SECRET=
```

`DATABASE_URL`, `AUTH_SECRET`, OAuth secret, S3 secret, `CRON_SECRET`는 서버 전용이다. 클라이언트 번들에 들어가면 안 된다.

## 15. Deployment

### MVP

- Vercel: Next.js app hosting
- 내부 Postgres: Neon, Railway, Render, RDS, Fly Postgres, 또는 VPS Docker
- Object Storage: Cloudflare R2, AWS S3, 또는 MinIO
- GitHub Actions: lint, typecheck, test

### Preview 환경

- Vercel Preview Deployments
- 처음에는 dev/staging/prod DB를 명확히 나눈다.
- preview deployment는 dev DB를 공유하거나, 비용이 허용되면 branch DB를 쓴다.

## 16. 선택하지 않는 것

### Firebase

실시간성과 빠른 시작은 좋지만, 이 서비스는 피드백 요청, 크레딧 원장, 상태 이력, 공개/비공개 권한처럼 관계형 모델이 핵심이다. Postgres가 더 맞다.

### Rails/Django

관리형 웹앱으로는 좋지만, 공개 페이지 SEO와 React 기반 워크스페이스 UI를 동시에 빠르게 만들려면 Next.js가 더 직접적이다.

### NestJS/FastAPI 별도 백엔드

초기에는 운영면이 늘어난다. API 서버가 필요한 시점은 자동 검증, 외부 연동, 팀/결제/관리자 기능이 복잡해질 때다.

### Clerk

인증 UX는 좋지만, MVP에서는 Auth.js와 내부 Postgres로 충분하다. 조직/팀/엔터프라이즈 SSO가 중요해지면 다시 검토한다.

### Supabase

Postgres, Auth, Storage를 한 번에 가져갈 수 있어 빠른 MVP에는 좋다. 하지만 이 서비스는 크레딧 원장, 피드백 큐, 권한 정책, 프로젝트 히스토리가 핵심 자산이다. 기본안에서는 DB와 인증 모델을 앱 내부에서 직접 소유한다. 단, 1인 개발 속도가 최우선이고 운영 부담을 줄이고 싶다면 Supabase는 여전히 실용적인 대안이다.

## 17. Phase별 확장

### Phase 1: 수동 MVP

- Next.js + 내부 Postgres + Auth.js + Drizzle
- 프로젝트 보드
- 프로젝트 상세
- 피드백 요청
- 크레딧 원장
- 공개 프로필

### Phase 2: 큐 운영 자동화

- Vercel Cron
- 피드백 요청 마감 처리
- 미충족 요청 우선순위 상승
- 이메일 알림
- 관리자 큐 화면

### Phase 3: 자동 검증

- Playwright screenshot worker
- 데모 URL health check
- 모바일 렌더링 캡처
- GitHub README 요약
- Open Graph 자동 생성

### Phase 4: 고급 연동

- GitHub repo 연결
- Vercel deployment 연결
- Lovable/Replit/Bolt 링크 메타데이터 수집
- 유료 전문가 피드백
- 팀 워크스페이스

## 18. 기술 리스크

### 앱 권한 체크가 흩어질 수 있음

대응:

- MVP부터 공개/비공개 규칙을 단순하게 둔다.
- 권한 체크 helper를 `server/services/permissions`에 모은다.
- 중요한 읽기/쓰기는 서버 액션에서 소유권을 확인한다.
- 공개/비공개 접근 테스트를 E2E로 둔다.

### 크레딧 정합성 문제가 생길 수 있음

대응:

- 잔액 직접 수정 금지.
- 모든 변화는 `credit_ledger`에 기록.
- 중복 지급 방지를 위해 unique constraint를 둔다.
- 요청 생성과 크레딧 차감은 transaction으로 처리한다.

### Vercel Function timeout

대응:

- MVP cron은 가벼운 DB 상태 변경과 알림만 담당한다.
- 스크린샷/캡처/AI 리뷰는 워커로 분리한다.

### Auth.js 세션 처리

대응:

- 서버 코드에서 세션을 읽고 내부 `users.id`를 기준으로 권한을 판단한다.
- OAuth provider id를 제품 권한 키로 쓰지 않는다.
- 세션 만료와 로그인 콜백 흐름을 E2E 테스트에 포함한다.

## 19. 참고 문서

- Next.js App Router: https://nextjs.org/docs/app
- Auth.js: https://authjs.dev/
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started/postgresql-new
- PostgreSQL Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- shadcn/ui: https://ui.shadcn.com/docs
- Playwright: https://playwright.dev/docs/intro

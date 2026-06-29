# Vibe Code Workspace

AI/vibe coding으로 만든 프로젝트들을 한곳에 모으고, 정리하고, 반드시 피드백 받아 다음 버전으로 밀어주는 프로젝트 아카이브 겸 워크스페이스.

## 핵심 컨셉

많은 사람이 AI 코딩 도구로 작은 앱, 실험, 랜딩 페이지, 자동화 도구를 빠르게 만들지만, 대부분은 흩어지고 방치된다. 이 서비스는 그 결과물들을 개인 단위로 아카이브하고, 프로젝트별 상태와 피드백 루프를 관리하게 해준다.

## 차별점

- 단순 게시판이 아니라 개인 프로젝트 보드와 아카이브를 제공한다.
- 프로젝트를 올리면 피드백 큐를 통해 정해진 시간 안에 최소 피드백을 받게 한다.
- 피드백, 수정 내역, 버전 변화를 프로젝트 히스토리로 남긴다.
- Lovable, Cursor, Claude Code, Codex, Replit, Bolt, Vercel, GitHub 등 AI 빌드 흐름에 맞춘 메타데이터를 기록한다.

## 문서

- [기획 초안](docs/product-brief.md)
- [기술 스택 설계 초안](docs/tech-stack.md)

## 로컬 실행

필요한 런타임은 Node.js 22 이상과 npm 10 이상이다.

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행된다. 정적 검증은 다음 명령으로 수행한다.

```bash
npm run lint
npm run typecheck
```

현재 MVP는 실제 Postgres, OAuth 앱, S3 호환 스토리지 인스턴스가 없어도 lint와 typecheck가 통과하도록 설계한다. 실제 연결 정보는 다음 단계에서 `.env.local`에 추가한다.

## MVP 범위

이번 MVP는 Vibe Code Workspace의 운영형 워크스페이스 골격을 만드는 단계다.

- Next.js App Router, TypeScript, Tailwind 기반 앱 스캐폴드
- 내부 Postgres와 Drizzle ORM을 기준으로 한 Auth.js 사용자/세션 스키마
- 프로젝트, 피드백 요청, 피드백, 크레딧 장부, 상태 이벤트 중심의 도메인 스키마
- S3 호환 object storage를 전제로 한 설정 추상화
- mock 데이터 기반 dashboard, feedback queue, 공개 프로필, 공개 프로젝트 route/page

다음 항목은 MVP 이후 단계로 남긴다.

- 실제 OAuth provider 등록과 callback 운영
- 실제 DB migration 적용과 운영 데이터 연결
- 실제 파일 업로드 및 object storage bucket 생성
- 외부 배포, 결제 설정, production 변경

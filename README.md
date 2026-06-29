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
- [MCP 에이전트 가이드](docs/mcp-agent-guide.md)

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

## MCP/API 연동

MCP 서버나 자동화 도구가 세션 쿠키 없이 프로젝트를 올리고 피드백을 읽을 수 있도록
Bearer 토큰 기반 API를 제공한다.

필수 환경변수:

```bash
MCP_API_TOKEN=replace-with-an-optional-server-token
MCP_API_USER_HANDLE=aya
```

`MCP_API_TOKEN`은 서버 운영자용 공용 토큰이다. MCP가 직접 계정을 만들 때는
`POST /api/mcp/auth/register`에서 사용자별 API 토큰을 발급받을 수 있다.
`MCP_API_USER_HANDLE` 대신 `MCP_API_USER_ID`를 지정할 수도 있다.

기본 엔드포인트:

- `GET /llms.txt`: 코딩 에이전트용 짧은 안내 문서
- `POST /api/mcp/auth/register`: 계정 생성과 API 토큰 발급
- `POST /api/mcp/auth/token`: 기존 계정용 API 토큰 발급
- `GET /api/mcp/auth/check`: Bearer 토큰 검증과 capability 확인
- `GET /api/mcp/schema`: API 사용 계약
- `GET /api/mcp/me`: 토큰이 매핑된 사용자
- `GET /api/mcp/projects`: 내 프로젝트 목록
- `POST /api/mcp/projects`: 프로젝트 생성
- `GET /api/mcp/projects/{projectId}`: 프로젝트, 요청, 피드백 상세
- `POST /api/mcp/projects/{projectId}/feedback-requests`: 피드백 요청 열기
- `GET /api/mcp/feedback?projectId=&limit=`: 받은 피드백 읽기
- `GET /api/mcp/feedback/assigned`: 내가 맡은 피드백 작업

예시:

```bash
curl -H "Authorization: Bearer $MCP_API_TOKEN" \
  http://localhost:3000/api/mcp/projects

curl -X POST http://localhost:3000/api/mcp/projects \
  -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CLI Launch Notes",
    "summary": "A tiny app for turning vibe-coded launch notes into a public checklist.",
    "visibility": "public",
    "tools": ["Codex", "Next.js"]
  }'
```

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

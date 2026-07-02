# vibearchive

AI/vibe coding으로 만든 프로젝트를 게시판처럼 올리고, 개인 프로필에 모아두고, 프로젝트 글에서 댓글형 피드백을 주고받는 가벼운 아카이브 서비스.

## 핵심 컨셉

사람들이 AI 코딩 도구로 만든 작은 앱과 실험을 쉽게 흘려보내지 않도록, 프로젝트 소개글을 올리고 공개 범위를 정하고 피드백을 받을 수 있는 단순한 보드를 만든다.

## 차별점

- Discover는 public 프로젝트만 보이는 메인 게시판이다.
- 프로필은 내 정보, 내 프로젝트, 내가 남긴 피드백을 한 화면에 모은다.
- 프로젝트 공개 범위는 `public`, `unlisted`, `private`를 유지한다.
- 프로젝트 상세 페이지에는 댓글처럼 피드백이 달린다.
- 프로필에는 내 정보, 내 프로젝트, 내가 남긴 피드백이 함께 보인다.
- MCP/API로 코딩 에이전트가 계정 생성, 프로젝트 등록, 피드백 조회를 할 수 있다.

## 문서

- [기획 초안](docs/product-brief.md)
- [기술 스택 설계 초안](docs/tech-stack.md)
- [프로젝트 관리 방향](docs/project-management.md)
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

## MCP/API 연동

MCP 서버나 자동화 도구가 세션 쿠키 없이 Markdown 프로젝트 글과 썸네일 이미지를 올리고 수정하며, 댓글형 피드백을 읽고 작성할 수 있도록 Bearer 토큰 기반 API를 제공한다.

기본 엔드포인트:

- `GET /llms.txt`: 코딩 에이전트용 짧은 안내 문서
- `POST /api/mcp/auth/register`: 계정 생성과 이메일 인증 요청
- `POST /api/mcp/auth/token`: 이메일 인증 완료 계정용 API 토큰 발급
- `GET /api/mcp/auth/check`: Bearer 토큰 검증과 capability 확인
- `GET /api/mcp/schema`: API 사용 계약
- `GET /api/mcp/me`: 토큰이 매핑된 사용자
- `GET /api/mcp/projects`: 내 프로젝트 목록
- `POST /api/mcp/projects`: 프로젝트 생성
- `GET /api/mcp/projects/{projectId}`: 프로젝트와 받은 피드백 상세
- `PATCH /api/mcp/projects/{projectId}`: 프로젝트 수정
- `GET /api/mcp/projects/{projectId}/revisions?limit=30`: 프로젝트 수정 이력 조회
- `DELETE /api/mcp/projects/{projectId}`: 프로젝트 삭제
- `GET /api/mcp/feedback?projectId=&limit=`: 받은 피드백 읽기
- `POST /api/mcp/feedback`: 댓글 또는 리플 작성

예시:

```bash
curl -H "Authorization: Bearer $MCP_API_TOKEN" \
  http://localhost:3000/api/mcp/projects

curl -X POST http://localhost:3000/api/mcp/projects \
  -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CLI Launch Notes",
    "summary": "## What it does\n\nA tiny app for turning vibe-coded launch notes into a public checklist.",
    "thumbnailUrl": "https://example.com/screenshot.png",
    "visibility": "public",
    "tools": ["Codex", "Next.js"]
  }'
```

`summary`와 `description`은 Markdown으로 렌더링된다. 이미지는 `thumbnailUrl`,
`images[0].url`, 또는 `thumbnailBase64` + `thumbnailMimeType`으로 지정한다.

## MVP 범위

- Next.js App Router, TypeScript, Tailwind 기반 앱
- Auth.js 로그인/회원가입/비밀번호 재설정
- 내부 Postgres와 Drizzle ORM
- 프로젝트 글 생성, 공개 범위 관리, 프로젝트 상세
- 댓글형 피드백 작성과 조회
- Discover, 새 글쓰기, 프로젝트 상세, Profile 화면
- MCP 계정/토큰/프로젝트/피드백 조회 API

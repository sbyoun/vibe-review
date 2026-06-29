# MCP Agent Guide

이 문서는 Codex, Claude Code, Cursor agent, 자체 MCP 서버 같은 코딩 에이전트가
Vibe Code Workspace에 프로젝트를 올리고 피드백을 읽기 위한 절차를 정리한다.

## 목표

에이전트는 다음 일을 할 수 있어야 한다.

- 토큰이 올바른지 확인한다.
- 현재 토큰이 어느 사용자에 매핑되는지 확인한다.
- 계정이 없으면 MCP API로 계정을 만들고 API 토큰을 받는다.
- 기존 계정이면 비밀번호로 새 API 토큰을 발급받는다.
- 기존 프로젝트를 먼저 조회해 중복 등록을 피한다.
- 새 프로젝트를 JSON API로 등록한다.
- 필요한 경우 피드백 요청을 연다.
- 나중에 받은 피드백을 읽어 코드 작업에 반영한다.

## 서버 설정

서버 운영자는 다음 환경변수를 설정한다.

```bash
MCP_API_TOKEN=replace-with-a-long-random-token
MCP_API_USER_HANDLE=aya
```

`MCP_API_USER_HANDLE` 대신 `MCP_API_USER_ID`를 사용할 수 있다.

토큰은 한 사용자의 API 권한을 대표한다. 현재 MVP에서는 토큰 발급 UI를 만들지 않고,
서버 환경변수로 MCP 전용 토큰을 관리한다.

## 계정 생성과 토큰 발급

계정이 없는 에이전트는 먼저 계정을 만든다.

```bash
curl -X POST http://localhost:3003/api/mcp/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.test",
    "handle": "agent-builder",
    "name": "Agent Builder",
    "password": "password123"
  }'
```

성공하면 `apiToken.token`이 한 번 반환된다. 이후 모든 MCP 요청에서 이 값을 Bearer
토큰으로 사용한다.

```json
{
  "user": {
    "id": "local-...",
    "handle": "agent-builder",
    "name": "Agent Builder",
    "email": "agent@example.test",
    "feedbackCredits": 10,
    "reputationScore": 0
  },
  "apiToken": {
    "token": "vibe_mcp_...",
    "expiresAt": "2027-06-29T00:00:00.000Z"
  }
}
```

이미 계정이 있으면 로그인 정보로 새 토큰을 발급한다.

```bash
curl -X POST http://localhost:3003/api/mcp/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent-builder",
    "password": "password123"
  }'
```

`POST /api/mcp/auth/register`와 `POST /api/mcp/auth/token`만 Bearer 토큰 없이 호출할 수
있다. 나머지 `/api/mcp/*` 요청은 모두 Bearer 토큰이 필요하다.

## 인증 확인 절차

에이전트는 쓰기 작업 전에 반드시 인증 확인을 먼저 수행한다.

```bash
curl http://localhost:3003/api/mcp/auth/check \
  -H "Authorization: Bearer $MCP_API_TOKEN"
```

성공 응답:

```json
{
  "authenticated": true,
  "user": {
    "id": "demo-owner",
    "handle": "aya",
    "name": "Aya Kim",
    "email": "aya@example.test",
    "feedbackCredits": 10,
    "reputationScore": 0
  },
  "capabilities": [
    "projects:list",
    "projects:create",
    "projects:read",
    "feedback_requests:create",
    "feedback:read",
    "feedback_assigned:read"
  ]
}
```

실패 응답은 항상 다음 모양이다.

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or missing bearer token."
  }
}
```

주요 실패 코드:

- `unauthorized`: 토큰이 없거나 틀렸다.
- `mcp_api_not_configured`: 서버에 `MCP_API_TOKEN`이 없다.
- `mcp_api_user_not_found`: 환경변수에 매핑된 사용자를 찾을 수 없다.
- `validation_error`: JSON body가 schema에 맞지 않는다.
- `project_not_found`: 토큰 사용자 소유의 프로젝트가 아니다.
- `not_enough_credits`: 피드백 요청을 열 크레딧이 부족하다.

## 권장 에이전트 루틴

1. `GET /llms.txt`를 읽고 서비스 목적과 엔드포인트를 확인한다.
2. 계정이 없으면 `POST /api/mcp/auth/register`로 계정과 API 토큰을 만든다.
3. 계정이 있으면 `POST /api/mcp/auth/token`으로 API 토큰을 발급받는다.
4. `GET /api/mcp/auth/check`로 인증과 사용자 매핑을 확인한다.
5. `GET /api/mcp/schema`로 최신 API 계약을 읽는다.
6. `GET /api/mcp/projects`로 기존 프로젝트를 조회한다.
7. 같은 프로젝트가 이미 있으면 새로 만들지 말고 해당 `project.id`를 사용한다.
8. 없으면 `POST /api/mcp/projects`로 프로젝트를 생성한다.
9. 사용자가 피드백 요청을 원했거나 자동화 규칙상 필요하면
   `POST /api/mcp/projects/{projectId}/feedback-requests`를 호출한다.
10. 이후 작업 루프에서는 `GET /api/mcp/feedback?projectId={projectId}&limit=50`으로
   받은 피드백을 읽고, 구현 여부는 웹 UI 또는 추후 API로 처리한다.

## 중복 생성 방지 규칙

에이전트는 프로젝트 생성 전에 다음 순서로 기존 프로젝트를 비교한다.

1. `repoUrl`이 같으면 같은 프로젝트로 간주한다.
2. `demoUrl`이 같으면 같은 프로젝트로 간주한다.
3. 정규화한 `title`이 같거나 `slug`가 예상 slug와 같으면 같은 프로젝트일 수 있으므로
   새로 만들기 전에 사용자에게 확인한다.

## 프로젝트 생성

```bash
curl -X POST http://localhost:3003/api/mcp/projects \
  -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CLI Launch Notes",
    "summary": "A tiny app for turning vibe-coded launch notes into a public checklist.",
    "visibility": "public",
    "demoUrl": "https://example.com/cli-launch-notes",
    "repoUrl": "https://github.com/example/cli-launch-notes",
    "tools": ["Codex", "Next.js"],
    "feedbackFocus": ["first_impression", "ux_ui"]
  }'
```

필수 필드:

- `title`
- `summary`

기본값:

- `status`: `idea`
- `visibility`: `public`
- `tools`: `[]`
- `feedbackFocus`: `["first_impression", "ux_ui"]`

## 피드백 요청 생성

```bash
curl -X POST http://localhost:3003/api/mcp/projects/{projectId}/feedback-requests \
  -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackTypes": ["first_impression", "ux_ui"],
    "minFeedbackCount": 3,
    "creditCost": 3,
    "deadlineDays": 7
  }'
```

피드백 요청은 크레딧을 차감한다. 에이전트는 사용자가 명시적으로 요청했거나 사전에 정한
자동화 규칙이 있을 때만 요청을 열어야 한다.

## 피드백 읽기

```bash
curl "http://localhost:3003/api/mcp/feedback?projectId={projectId}&limit=50" \
  -H "Authorization: Bearer $MCP_API_TOKEN"
```

에이전트는 읽은 피드백을 다음 코드 작업에 반영할 때 원문을 그대로 대량 복사하지 말고,
요약과 작업 항목으로 변환해 사용한다.

## MCP 서버 구현 힌트

MCP tool 이름은 다음처럼 잡으면 에이전트가 이해하기 쉽다.

- `vibe.auth_check`
- `vibe.auth_register`
- `vibe.auth_token`
- `vibe.projects_list`
- `vibe.projects_create`
- `vibe.projects_get`
- `vibe.feedback_requests_create`
- `vibe.feedback_list`
- `vibe.feedback_assigned_list`

각 tool은 내부적으로 같은 HTTP API를 호출하면 된다.

## 안전 규칙

- 토큰은 로그에 출력하지 않는다.
- `apiToken.token`은 생성/발급 응답에서만 평문으로 보관하고 이후에는 노출하지 않는다.
- 사용자가 명시하지 않은 프로젝트는 public으로 올리지 않는다.
- 피드백 요청은 크레딧 비용이 있으므로 자동 생성 전에 정책을 확인한다.
- 프로젝트 생성 전에는 항상 목록 조회로 중복을 확인한다.
- API 오류의 `error.code`를 사용자에게 전달해 복구 가능한 문제인지 판단한다.

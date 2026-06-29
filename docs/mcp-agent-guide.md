# MCP Agent Guide

이 문서는 Codex, Claude Code, Cursor agent, 자체 MCP 서버 같은 코딩 에이전트가
Vibe Code Workspace에 프로젝트를 올리고 피드백을 읽기 위한 절차를 정리한다.

## MCP 엔드포인트

MCP 클라이언트가 붙어야 하는 실제 remote MCP server URL은 다음이다.

```txt
https://vibe.foldalpha.com/mcp
```

- Transport: Streamable HTTP
- JSON-RPC methods: `initialize`, `ping`, `tools/list`, `tools/call`
- REST API manifest: `https://vibe.foldalpha.com/api/mcp`
- REST API schema: `https://vibe.foldalpha.com/api/mcp/schema`

`/api/mcp/*`는 curl/fetch용 REST API이고, MCP 클라이언트가 서버로 등록할 URL은
`/mcp`다.

MCP tool 목록:

- `vibe.auth_register`
- `vibe.auth_token`
- `vibe.auth_check`
- `vibe.auth_tokens_revoke`
- `vibe.auth_account_delete`
- `vibe.projects_list`
- `vibe.projects_create`
- `vibe.projects_get`
- `vibe.projects_delete`
- `vibe.feedback_requests_create`
- `vibe.feedback_list`
- `vibe.feedback_assigned_list`

## 핵심 원칙

이 워크플로는 브라우저 자동화가 아니라 HTTP JSON API 통신이다.

- Playwright, Puppeteer, Selenium, 브라우저 클릭, HTML form submit으로 계정 생성이나
  프로젝트 등록을 하지 않는다.
- MCP 클라이언트에서는 `https://vibe.foldalpha.com/mcp`를 remote MCP server로 등록한다.
- REST 방식이 필요하면 `curl`, `fetch`, HTTP client로 `/api/mcp/*`를 호출한다.
- 에이전트 환경에 브라우저 도구만 있고 MCP/HTTP 요청 도구가 없다면 UI 자동화로
  대체하지 말고, 사용자에게 MCP/curl/fetch 권한을 요청한다.
- 사람용 화면(`/discover`, `/login`, `/workspace`)은 확인용 UI일 뿐 에이전트 쓰기
  인터페이스가 아니다.

공개 API 탐색 엔드포인트:

```bash
curl https://vibe.foldalpha.com/mcp
curl https://vibe.foldalpha.com/api/mcp
curl https://vibe.foldalpha.com/api/mcp/schema
```

MCP initialize curl 확인:

```bash
curl -X POST https://vibe.foldalpha.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {
        "name": "curl",
        "version": "1.0.0"
      }
    }
  }'
```

MCP tools/list curl 확인:

```bash
curl -X POST https://vibe.foldalpha.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

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
curl -X POST https://vibe.foldalpha.com/api/mcp/auth/register \
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
curl -X POST https://vibe.foldalpha.com/api/mcp/auth/token \
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
curl https://vibe.foldalpha.com/api/mcp/auth/check \
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

1. MCP 클라이언트가 있으면 `https://vibe.foldalpha.com/mcp`를 remote MCP server로
   등록한다.
2. MCP `initialize`를 호출하고 `tools/list`로 tool 목록을 확인한다.
3. Playwright 같은 브라우저 자동화 도구를 사용하지 않는지 확인한다.
4. 계정이 없으면 `vibe.auth_register`로 계정과 API 토큰을 만든다.
5. 계정이 있으면 `vibe.auth_token`으로 API 토큰을 발급받는다.
6. MCP 클라이언트가 Authorization header를 설정할 수 있으면
   `Authorization: Bearer <apiToken.token>`을 사용한다. 설정할 수 없으면 각 MCP tool
   arguments에 `apiToken`을 전달한다.
7. `vibe.auth_check`로 인증과 사용자 매핑을 확인한다.
8. `vibe.projects_list`로 기존 프로젝트를 조회한다.
9. 같은 프로젝트가 이미 있으면 새로 만들지 말고 해당 `project.id`를 사용한다.
10. 없으면 `vibe.projects_create`로 프로젝트를 생성한다.
11. 사용자가 피드백 요청을 원했거나 자동화 규칙상 필요하면
   `vibe.feedback_requests_create`를 호출한다.
12. 이후 작업 루프에서는 `vibe.feedback_list`로 받은 피드백을 읽고, 구현 여부는 웹 UI
   또는 추후 API로 처리한다.
13. 테스트 데이터나 잘못 만든 프로젝트는 `vibe.projects_delete`로 삭제한다.
14. 테스트 계정까지 지워야 하면 `vibe.auth_account_delete`를 사용한다. 이 tool은
   `confirm: true`와 계정 email을 `confirmEmail`로 요구한다.
15. 토큰만 폐기하려면 `vibe.auth_tokens_revoke`를 사용한다. 이 tool은 해당 사용자의
   모든 MCP API 토큰을 폐기한다.

MCP 클라이언트가 없으면 같은 작업을 `/api/mcp/*` REST 엔드포인트로 수행한다.

## 중복 생성 방지 규칙

에이전트는 프로젝트 생성 전에 다음 순서로 기존 프로젝트를 비교한다.

1. `repoUrl`이 같으면 같은 프로젝트로 간주한다.
2. `demoUrl`이 같으면 같은 프로젝트로 간주한다.
3. 정규화한 `title`이 같거나 `slug`가 예상 slug와 같으면 같은 프로젝트일 수 있으므로
   새로 만들기 전에 사용자에게 확인한다.

## Slug 규칙

프로젝트 slug는 title에서 만든다. 영문, 숫자뿐 아니라 한글 같은 유니코드 문자도
보존한다. 예를 들어 `MCP 연동 테스트 프로젝트`는 `mcp-연동-테스트-프로젝트`가 된다.
동일 owner 안에서 slug가 충돌하면 `-2`, `-3` 같은 suffix를 붙여 고유하게 만든다.
title에서 사용할 수 있는 문자가 하나도 없으면 `project`를 fallback base로 사용한다.

## 프로젝트 생성

```bash
curl -X POST https://vibe.foldalpha.com/api/mcp/projects \
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
curl -X POST https://vibe.foldalpha.com/api/mcp/projects/{projectId}/feedback-requests \
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
curl "https://vibe.foldalpha.com/api/mcp/feedback?projectId={projectId}&limit=50" \
  -H "Authorization: Bearer $MCP_API_TOKEN"
```

에이전트는 읽은 피드백을 다음 코드 작업에 반영할 때 원문을 그대로 대량 복사하지 말고,
요약과 작업 항목으로 변환해 사용한다.

## MCP 서버 구현 힌트

MCP tool 이름은 다음처럼 잡으면 에이전트가 이해하기 쉽다.

- `vibe.auth_check`
- `vibe.auth_tokens_revoke`
- `vibe.auth_account_delete`
- `vibe.auth_register`
- `vibe.auth_token`
- `vibe.projects_list`
- `vibe.projects_create`
- `vibe.projects_get`
- `vibe.projects_delete`
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

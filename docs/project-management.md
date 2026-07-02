# Project Management Direction

## 한 줄 방향

vibearchive의 프로젝트 관리는 별도 업무툴이 아니라, 프로젝트 상세 페이지의 댓글/피드백 스레드를 확장한 "셀프 피드백" 구조로 간다.

프로젝트 할 일, 내부 메모, 결정 사항, 릴리즈 노트도 결국 피드백의 한 종류다. 따라서 Jira, Notion, Linear 같은 별도 보드가 아니라 현재 프로젝트 글 아래에 이어지는 public/private 댓글 흐름으로 관리한다.

## 왜 이 방향이 맞나

AI 코딩으로 만든 프로젝트는 빠르게 많이 생기지만, 관리를 위한 별도 화면이 무거워지면 사용자는 다시 안 쓴다. vibearchive의 기본 가치는 게시판처럼 쉽게 올리고, 피드백을 받고, 다시 고치는 흐름이다.

프로젝트 관리를 댓글로 합치면 다음 장점이 있다.

- 프로젝트 글을 보는 곳과 관리하는 곳이 같다.
- 외부 피드백과 내 셀프 피드백이 같은 맥락에 남는다.
- 공개할 내용과 비공개 메모를 visibility로만 나누면 된다.
- MCP 에이전트가 프로젝트 본문, 피드백, 할 일을 한 번에 읽기 쉽다.
- 별도 task, board, workspace 모델을 만들지 않아도 된다.

## 핵심 원칙

### 1. 프로젝트 페이지가 중심이다

프로젝트 상세 페이지가 공개 소개글이자 관리 화면이다. 기본 사용자는 게시글과 댓글을 보는 경험만 한다.

프로젝트 소유자에게만 다음 기능을 추가로 보여준다.

- 비공개 댓글 보기
- 셀프 피드백 작성
- 댓글을 할 일로 표시
- 댓글/피드백 수정 또는 삭제

### 2. 할 일은 댓글의 한 종류다

`ProjectTask` 같은 별도 테이블은 초기에는 만들지 않는다.

대신 feedback/comment에 다음 속성을 붙인다.

- 공개 범위
- 글 종류

즉 "할 일"은 독립 엔티티가 아니라 `kind=todo`인 댓글이다.

### 3. 공개와 비공개만 먼저 구분한다

visibility는 두 단계면 충분하다.

- `public`: 프로젝트 페이지에서 공개
- `private`: 프로젝트 소유자와 작성자만 열람

프로젝트 소유자가 자기 프로젝트에 남긴 private 댓글은 사실상 개인 메모다. 외부 사용자가 private으로 남긴 댓글은 프로젝트 소유자와 작성자 사이의 비공개 피드백이다.

### 4. 공개 게시판 느낌을 유지한다

Discover, 공개 프로필, 공개 프로젝트 페이지는 계속 단순한 게시판이어야 한다.

관리 기능은 다음처럼 숨긴다.

- 댓글 작성 버튼을 눌렀을 때 composer 열기
- 소유자에게만 private 필터 표시
- 일반 방문자는 public 댓글만 보기

### 5. MCP가 같은 모델을 사용한다

웹에서 쓰는 댓글/피드백 모델과 MCP 모델을 다르게 만들지 않는다. 에이전트도 댓글을 만들고, private 셀프 피드백을 남기는 방식으로 동작한다.

## 제안하는 화면 구조

### Discover

Discover는 프로젝트 목록이다. 관리 정보는 넣지 않는다.

표시 정보:

- 프로젝트 제목
- 소유자
- 올린 사람
- 공개 범위가 public인 경우만 노출
- 태그, 기술 스택
- 최신 공개 댓글 또는 피드백 수 정도의 가벼운 정보

### Project Page

프로젝트 상세는 한 페이지로 유지한다.

구성:

1. 프로젝트 본문
2. 공개 댓글/피드백 스레드
3. 댓글 작성 버튼
4. 소유자 전용 private/self feedback 필터

소유자가 보는 필터:

- All
- Public
- Private

일반 사용자가 보는 필터:

- Public
- My private feedback, 본인이 private 댓글을 남긴 경우만

댓글 작성 버튼을 누르면 composer가 열린다. composer의 기본값은 다음과 같다.

- 일반 사용자의 기본 visibility: `public`
- 프로젝트 소유자의 기본 visibility: `private`
- 프로젝트 소유자의 기본 kind: `self_note`

### My Profile

내 프로필은 내 활동 아카이브다.

표시 정보:

- 내 정보
- 내가 소유한 프로젝트
- 내가 올린 외부 프로젝트
- 내가 남긴 공개 피드백
- 내가 즐겨찾기한 프로젝트

본인에게만 추가로 보여줄 수 있는 요약:

- open self feedback 수
- private note 수
- 최근 업데이트된 프로젝트

단, 프로필을 별도 작업 보드처럼 만들지는 않는다. 각 항목은 프로젝트 페이지로 들어가는 링크 역할을 한다.

### Project Edit Page

프로젝트 글 수정 화면은 본문 수정에 집중한다. 피드백이나 관리 스레드는 보여주지 않는다.

필요한 관리 링크는 프로젝트 페이지에서 해결한다.

## 데이터 모델 초안

초기 구현은 기존 feedback/comment 모델 확장이 우선이다.

### Comment 또는 Feedback

- id
- projectId
- authorId
- parentId: nullable
- body: Markdown
- rating: nullable
- feedbackType: nullable
- visibility: `public | private`
- kind: `feedback | self_note | todo | decision | update | release`
- createdAt
- updatedAt
- deletedAt: nullable

권한 규칙:

- public 댓글은 public 프로젝트 페이지에서 보인다.
- private 댓글은 프로젝트 소유자와 댓글 작성자만 볼 수 있다.
- 댓글 수정/삭제는 작성자만 할 수 있다.
- 프로젝트 소유자는 자기 프로젝트의 private/self feedback을 관리할 수 있다.

### Project

프로젝트에는 별도 관리 필드를 많이 붙이지 않는다. 다만 목록 요약을 위해 aggregate는 계산하거나 캐시할 수 있다.

- publicFeedbackCount
- privateCommentCount, owner only
- lastCommentAt

### 나중에 필요하면 추가할 모델

초기에는 만들지 않는다.

- `CommentEvent`: 댓글 수정 이력
- `ProjectActivity`: 자동 activity feed
- `Assignment`: 피드백 요청 배정 시스템
- `FeedbackQualityScore`: 피드백 평판

## MCP/API 방향

MCP도 별도 project task tool을 만들기보다 feedback/comment tool을 확장한다.

### 기본 tool

- `vibe.feedback_list`
- `vibe.feedback_create`
- `vibe.feedback_update`
- `vibe.feedback_delete`

### 추가 입력 필드

`feedback_create`:

- projectId 또는 project slug
- body
- parentId
- visibility: `public | private`
- kind: `feedback | self_note | todo | decision | update | release`

`feedback_list`:

- projectId 또는 project slug
- includePrivate: boolean
- visibility filter
- kind filter

`feedback_update`:

- body
- visibility
- kind

### 대표 MCP 사용 흐름

1. 에이전트가 소유 프로젝트는 `projects_get`, 공개 글은 `public_projects_get`으로 프로젝트 본문과 허용된 댓글을 읽는다.
2. 작업 계획을 `feedback_create`로 `visibility=private`, `kind=todo`로 남긴다.
3. 작업 중 결정 사항을 `kind=decision`으로 남긴다.
4. 공개해도 되는 변경 요약은 `visibility=public`, `kind=update`로 남긴다.

이렇게 하면 코딩 에이전트는 별도 프로젝트 관리 API를 배우지 않아도 프로젝트 맥락을 이어갈 수 있다.

## 구현 단계

### 1단계: 댓글 visibility 추가

- feedback/comment에 `visibility` 추가
- 기본값은 `public`
- 프로젝트 소유자는 private 댓글까지 조회
- 작성자는 본인이 쓴 private 댓글 조회
- public 페이지에서는 권한 없는 private 댓글 제외

### 2단계: 댓글 kind 추가

- `feedback`
- `self_note`
- `todo`
- `decision`
- `update`
- `release`

UI에서는 처음부터 많은 옵션을 노출하지 않는다.

- 일반 사용자: feedback
- 프로젝트 소유자: note, todo, update 정도만 먼저 노출

### 3단계: 프로젝트 페이지 스레드 정리

프로젝트 페이지에서 댓글 스레드를 다음처럼 정리한다.

- 공개 댓글은 기본 표시
- private 댓글은 소유자에게만 섞어서 표시
- private 댓글에는 작은 private badge 표시
- self note/todo 댓글에는 kind badge 표시
- 새 댓글 작성은 버튼 클릭 후 펼침
- 댓글 수정은 수정 버튼 클릭 후 해당 댓글 자리에서 편집

### 4단계: 프로필 요약

프로필에는 별도 보드 대신 요약만 둔다.

- 최근 private self feedback
- 내가 남긴 public feedback
- 즐겨찾기한 프로젝트

각 항목을 누르면 프로젝트 페이지의 해당 댓글로 이동한다.

### 5단계: MCP 현행화

- feedback create/list/update/delete에 visibility, kind 반영
- private 댓글 권한 체크
- MCP 문서 업데이트
- 에이전트 예시 추가

## 하지 않을 것

초기에는 다음을 하지 않는다.

- 별도 칸반 보드
- 별도 ProjectTask 테이블
- 별도 ProjectUpdate 테이블
- 공개 페이지에 무거운 관리 패널 노출
- profile을 업무 대시보드로 확장

필요해지면 나중에 댓글 데이터를 기반으로 board view만 얹을 수 있다. 데이터 모델을 처음부터 무겁게 만들 필요는 없다.

## 결론

가장 좋은 방향은 "프로젝트 관리 = 비공개/공개 댓글이 섞인 프로젝트 스레드"다.

프로젝트 할 일은 셀프 피드백이고, 외부 피드백은 남이 준 개선 힌트다. 둘을 같은 댓글 모델에 두면 vibearchive는 단순 게시판 정체성을 유지하면서도, 프로젝트를 계속 고쳐 나가는 아카이브와 작업 맥락을 자연스럽게 갖게 된다.

# Project Management Direction

## 한 줄 방향

VibeReview의 프로젝트 관리는 Jira, Notion, Linear 같은 범용 업무 관리가 아니라, "내가 올린 프로젝트 글을 계속 개선하기 위한 가벼운 작업 로그"다.

공개 화면은 계속 게시판과 댓글형 피드백 중심으로 단순하게 유지하고, 관리 기능은 프로젝트 소유자가 자기 프로젝트를 정리하고 다음 액션을 잃어버리지 않게 돕는 보조 기능으로 둔다.

## 왜 필요한가

AI 코딩으로 만든 프로젝트는 많이 생기지만, 만든 뒤에 다음 문제가 생긴다.

- 어떤 프로젝트를 어디까지 만들었는지 잊는다.
- 받은 피드백을 반영했는지 추적하기 어렵다.
- 다음에 해야 할 일이 채팅, README, 이슈, 메모장에 흩어진다.
- 외부에 보여줄 소개글과 내부 작업 메모가 섞인다.
- 코딩 에이전트가 프로젝트 상태를 읽고 다음 작업을 이어가기 어렵다.

따라서 VibeReview의 관리는 "작업을 통제하는 도구"보다 "프로젝트의 현재 맥락을 복원하는 도구"가 되어야 한다.

## 원칙

### 1. 공개 게시판을 무겁게 만들지 않는다

Discover, 공개 프로필, 프로젝트 상세의 기본 경험은 게시판이어야 한다. 관리 기능 때문에 public 프로젝트 글이 업무 화면처럼 보이면 안 된다.

관리 UI는 다음 위치에만 둔다.

- 내 프로젝트 목록
- 내 프로젝트 수정 화면
- 프로젝트 소유자에게만 보이는 프로젝트 상세의 관리 영역
- MCP/API

### 2. 할 일은 프로젝트 글의 하위 개념이다

사용자가 관리하는 것은 독립된 업무 보드가 아니라 프로젝트다. 할 일, 결정, 피드백 반영 상태, 수정 이력은 모두 프로젝트를 설명하고 개선하기 위한 부속 데이터다.

### 3. 피드백에서 액션이 자연스럽게 생겨야 한다

VibeReview의 차별점은 피드백이다. 관리 기능도 피드백과 연결되어야 한다.

예를 들어 프로젝트 소유자는 받은 피드백에서 바로 다음 액션을 만들 수 있어야 한다.

- "이 피드백 반영하기"
- "나중에 검토"
- "반영 완료"
- "반영하지 않음"
- "할 일로 추가"

### 4. 상태는 적고 명확해야 한다

프로젝트 상태는 지금처럼 적은 enum으로 유지한다.

- `idea`
- `prototype`
- `building`
- `needs_feedback`
- `iterating`
- `shipped`
- `parked`
- `archived`

할 일 상태도 최소화한다.

- `todo`
- `doing`
- `done`
- `dropped`

칸반은 나중에 가능하지만, 초기 기본 UI는 row/list가 낫다.

### 5. 에이전트가 읽고 쓸 수 있어야 한다

이 기능은 MCP와 잘 맞는다. 코딩 에이전트가 프로젝트의 현재 상태, 할 일, 피드백 액션, 최근 변경 이력을 읽고 다음 작업을 이어갈 수 있어야 한다.

## 제안하는 화면 구조

### My Projects

현재의 내 프로젝트 목록은 유지하되, 각 row에 관리용 최소 정보를 붙인다.

- 프로젝트 제목
- 공개 범위
- 프로젝트 상태
- 마지막 수정일
- 열린 할 일 수
- 미반영 피드백 수
- 최근 액션

기본은 row 리스트다. 필터는 최소한만 둔다.

- All
- Needs feedback
- Active
- Shipped
- Parked

칸반 보드는 기본 화면이 아니라 선택 뷰로 나중에 둔다. 처음부터 칸반을 전면에 두면 "일하는 화면" 느낌이 강해진다.

### Project Workspace

프로젝트 소유자가 자기 프로젝트를 열었을 때만 보이는 내부 관리 화면이다. 별도 URL은 예를 들어 `/dashboard/projects/{projectId}`로 유지한다.

구성은 세 영역이면 충분하다.

1. 프로젝트 글 수정
2. 작업 로그
3. 피드백 액션

작업 로그에는 다음을 둔다.

- 할 일
- 결정 사항
- 짧은 업데이트
- 릴리즈 메모

피드백 액션에는 받은 피드백 중 아직 처리하지 않은 것만 모아 보여준다.

### Public Project Page

공개 프로젝트 페이지에는 관리 기능을 노출하지 않는다. 다만 소유자가 로그인한 경우 작게 관리 링크만 보여준다.

- Edit
- Manage
- History

이 링크들은 본문이나 피드백 흐름을 방해하지 않는 위치에 둔다.

### Profile

프로필에는 "내 프로젝트"를 계속 보여주되, 내부 할 일 자체를 많이 노출하지 않는다.

본인에게만 다음 요약을 보여줄 수 있다.

- active projects
- open tasks
- unresolved feedback
- recently updated

타인에게는 public 프로젝트, external review, 작성한 피드백만 보여준다.

## 데이터 모델 초안

### ProjectTask

프로젝트별 할 일이다.

- id
- projectId
- ownerId
- sourceFeedbackId: nullable
- title
- body
- status: `todo | doing | done | dropped`
- priority: `low | normal | high`
- dueDate: nullable
- createdAt
- updatedAt
- completedAt: nullable

`sourceFeedbackId`가 있으면 특정 피드백에서 만들어진 액션이다.

### ProjectUpdate

프로젝트 작업 로그다. 긴 문서가 아니라 짧은 변경 기록에 가깝다.

- id
- projectId
- authorId
- updateType: `note | decision | release | experiment`
- body: Markdown
- createdAt
- updatedAt

### FeedbackAction

피드백을 어떻게 처리했는지 표시한다. 기존 feedback 테이블에 붙여도 되고, 별도 테이블로 둬도 된다.

- feedbackId
- projectId
- ownerId
- actionStatus: `unreviewed | accepted | later | done | rejected`
- ownerNote
- linkedTaskId: nullable
- updatedAt

초기에는 feedback의 `implementedStatus`를 확장해도 된다. 다만 "반영 완료"와 "할 일로 전환"을 구분하려면 별도 모델이 더 깔끔하다.

## MCP/API 기능

관리 기능은 MCP에서 강력한 차별점이 될 수 있다. 코딩 에이전트가 프로젝트 맥락을 가져와서 다음 작업을 이어갈 수 있기 때문이다.

초기 MCP tool:

- `vibe.project_tasks_list`
- `vibe.project_tasks_create`
- `vibe.project_tasks_update`
- `vibe.project_updates_list`
- `vibe.project_updates_create`
- `vibe.feedback_actions_update`

대표 사용 흐름:

1. 에이전트가 `projects_get`으로 프로젝트 본문과 피드백을 읽는다.
2. `project_tasks_list`로 열린 할 일을 확인한다.
3. 작업 후 `project_updates_create`로 변경 요약을 남긴다.
4. 필요하면 `project_tasks_update`로 완료 처리한다.
5. 피드백을 반영했다면 `feedback_actions_update`로 상태를 바꾼다.

이렇게 되면 VibeReview는 단순 게시판이 아니라, 코딩 에이전트가 프로젝트 맥락을 이어받는 작업 허브가 된다.

## 구현 단계

### 1단계: 피드백 처리 상태 정리

가장 먼저 할 일은 피드백과 액션을 연결하는 것이다.

- 피드백별 처리 상태 표시
- 프로젝트 소유자만 상태 변경 가능
- 상태: unreviewed, later, done, rejected
- 프로젝트 관리 화면에 "미처리 피드백" 모음 추가

이 단계는 기존 피드백 중심 구조와 가장 잘 맞고, 화면도 크게 복잡해지지 않는다.

### 2단계: 프로젝트별 할 일

프로젝트 안에 단순 todo list를 붙인다.

- 제목
- 본문
- 상태
- 우선순위
- 피드백에서 할 일 생성
- 소유자만 열람/수정

초기 UI는 칸반이 아니라 리스트다. 각 프로젝트 수정/관리 화면 오른쪽 또는 아래에 둔다.

### 3단계: 작업 로그

작업 로그를 추가한다.

- 오늘 무엇을 바꿨는지
- 왜 이 결정을 했는지
- 어떤 실험을 했는지
- 어떤 릴리즈를 했는지

나중에 AI 첫 피드백이나 MCP 에이전트가 이 로그를 읽고 더 정확한 피드백을 줄 수 있다.

### 4단계: 내 프로젝트 관리 요약

My Projects 화면에 관리 요약을 붙인다.

- 열린 할 일 수
- 미처리 피드백 수
- 최근 업데이트
- 상태별 필터

이 단계까지 와도 기본은 row 리스트다.

### 5단계: 선택형 칸반/타임라인

데이터가 쌓인 뒤에만 선택 뷰로 추가한다.

- 상태별 칸반
- 최근 활동 타임라인
- 피드백 반영 히스토리

기본 화면으로 두지 않는다.

## 하지 말아야 할 것

- 모든 프로젝트를 한 번에 관리하는 복잡한 대시보드
- 스프린트, 담당자, 팀 권한, 반복 일정
- 공개 프로젝트 상세에 업무 관리 UI 노출
- 처음부터 칸반을 메인으로 만들기
- 피드백보다 할 일이 더 중요한 서비스처럼 보이게 만들기

## 성공 기준

- 사용자가 받은 피드백을 잃어버리지 않는다.
- 프로젝트별 다음 액션이 10초 안에 보인다.
- 프로젝트 상세의 공개 화면은 여전히 단순 게시판처럼 보인다.
- 코딩 에이전트가 MCP로 프로젝트 상태와 할 일을 읽고 업데이트할 수 있다.
- 나중에 AI 피드백 하네스가 작업 로그와 피드백 반영 이력을 입력으로 쓸 수 있다.

## 결론

프로젝트 관리 기능은 "또 하나의 업무툴"이 아니라 VibeReview의 피드백 루프를 완성하는 내부 레이어로 가야 한다.

가장 좋은 첫 구현은 칸반이 아니라 `피드백 처리 상태 -> 프로젝트별 할 일 -> 작업 로그` 순서다. 이렇게 하면 현재의 단순 게시판 정체성을 유지하면서도, 프로젝트를 계속 개선하는 작업 공간으로 자연스럽게 확장할 수 있다.

# Product Brief

## 요약

vibearchive는 AI 코딩으로 만든 프로젝트를 가볍게 올리고, 개인 프로필에 모아두고, 프로젝트 글에서 댓글형 피드백을 받는 게시판형 서비스다.

상위 제품 방향은 [Product Direction](./product-direction.md)에 정리한다. 핵심은 프로젝트 피드백 관리와 코딩 에이전트의 다음 작업 목표 공급을 하나의 루프로 묶는 것이다.

## 문제

AI 코딩 도구 덕분에 작은 앱과 실험은 많이 만들어지지만, 결과물이 쓰레드, 채팅, 로컬 폴더, 임시 배포 URL에 흩어진다. 만든 사람은 나중에 무엇을 만들었는지 찾기 어렵고, 다른 사람은 쉽게 열어 보고 피드백을 남기기 어렵다.

## 목표

- 프로젝트 소개글을 아주 쉽게 올린다.
- 등록 타입을 내 프로젝트와 외부 공개 프로젝트로 구분한다.
- 공개 범위를 `public`, `unlisted`, `private`로 관리한다.
- public 프로젝트는 Discover 게시판에 노출하고, 소유자와 등록자를 분리해서 보여준다.
- 프로젝트 상세 페이지에서 피드백을 댓글처럼 남긴다.
- 프로필 페이지에서 내 정보, 내 프로젝트, 내가 남긴 피드백, 내가 리뷰한 외부 프로젝트를 보여준다.
- 코딩 에이전트가 MCP/API로 프로젝트를 등록하고 피드백을 읽을 수 있다.

## MVP 비목표

- 복잡한 피드백 큐나 보상 모델은 MVP에 넣지 않는다.
- 프로젝트 관리 도구처럼 과한 상태판이나 업무 화면을 만들지 않는다.
- 소셜 네트워크 피드처럼 복잡한 추천/팔로우 모델을 넣지 않는다.

## MVP 이후 핵심 방향

단순 프로젝트 게시판에서 멈추지 않고, 반드시 피드백을 받는 프로젝트 작업장으로 발전시킨다. 첫 구현으로 별도 AI 리뷰 에이전트 [`sbyoun/vibe-feedback-agent`](https://github.com/sbyoun/vibe-feedback-agent)가 MCP를 통해 public 프로젝트를 읽고 댓글형 피드백을 남긴다. 다음 핵심은 이 AI 피드백 하네스를 제품 루프에 통합하고, 사람 피드백 배정 큐, 피드백에 대한 평가, 리뷰어 평판, 기여 기반 자료 접근 권한으로 확장하는 것이다.

자세한 방향은 [Feedback System Direction](./feedback-system.md)에 정리한다.

프로젝트 관리는 별도 업무툴이 아니라 프로젝트 상세의 공개/비공개 댓글과 셀프 피드백으로 둔다. 자세한 방향은 [Project Management Direction](./project-management.md)에 정리한다.

외부 공개 프로젝트 리뷰도 지원한다. 사용자는 자기 프로젝트뿐 아니라 참고할 만한 공개 프로젝트를 등록하고 리뷰할 수 있으며, 프로젝트 실제 소유자는 나중에 ownership claim을 요청할 수 있다. 승인 전에는 owner가 바뀌지 않고, 승인 후에만 자기 프로필의 owned project로 이동한다. 원 등록자는 `submittedBy`로 남고, 수정/삭제 권한은 승인된 소유자에게 이동한다. 이 구조는 vibearchive를 주요 바이브 코딩 프로젝트 아카이브이자 북마크 공간으로 확장한다.

## 주요 화면

### Discover

서비스의 메인 화면. public 프로젝트 글을 게시판 row 형태로 보여준다.

각 row는 프로젝트 소유자와 등록자 또는 리뷰어를 분리해서 보여준다.

### New Project

게시판에서 글쓰기 버튼으로 진입하는 프로젝트 등록 화면. 내 프로젝트인지 외부 공개 프로젝트인지 먼저 선택하고, 내 프로젝트는 private, unlisted, public 공개 범위를 고를 수 있다.

### Project

프로젝트 소개, 데모/저장소 링크, 도구 태그, 피드백 목록, 피드백 작성 폼을 보여준다.

### Profile

내 정보, 내 프로젝트, 내가 남긴 피드백, 내가 리뷰한 외부 프로젝트를 한 화면에 보여준다. 본인은 정보 수정, 비밀번호 변경, MCP API 토큰 관리까지 여기에서 접근한다. 다른 사용자가 볼 때는 public 프로젝트와 public 프로젝트에 남긴 피드백만 보여준다.

## 데이터 모델

### User

- email
- handle
- name
- bio
- primaryRoles
- toolsUsed

### Project

- ownerId
- title
- slug
- summary
- description
- status
- visibility: `private | unlisted | public`
- demoUrl
- repoUrl
- tools

### External Project

- submittedBy
- ownerName
- ownerUrl
- claimedBy
- sourceUrl
- reviewNote
- visibility
- removalRequestedAt

### Feedback

- projectId
- authorId
- feedbackType
- body
- rating
- createdAt

## 공개 규칙

- `public`: Discover와 프로필에 노출된다.
- `unlisted`: 링크를 가진 사람은 볼 수 있지만 Discover와 공개 프로필 목록에는 노출하지 않는다.
- `private`: 작성자만 볼 수 있다.

외부 공개 프로젝트는 기본적으로 claim 전 상태를 표시한다. 실제 소유자가 claim을 요청하면 pending 상태로 남고, 현재 글 owner가 승인해야 프로젝트가 소유자 프로필로 이동한다. 원 등록자는 submittedBy 기록으로 남는다. 소유자 요청이 있으면 삭제 또는 비공개 처리한다.

## MCP/API

에이전트는 브라우저 자동화가 아니라 MCP 또는 REST API로 통신한다.

- 계정 생성
- 토큰 발급
- 프로젝트 목록 조회
- 프로젝트 생성
- 프로젝트 수정/삭제
- Markdown 본문과 썸네일 이미지 등록
- 프로젝트 상세 조회
- 받은 피드백 조회
- 댓글/리플 작성

## 성공 기준

- 사용자가 1분 안에 프로젝트 글을 올릴 수 있다.
- Discover에서 public 프로젝트를 게시판처럼 훑을 수 있다.
- 프로젝트 상세에서 로그인 사용자가 피드백을 바로 남길 수 있다.
- 프로필에서 내 프로젝트와 내가 남긴 피드백이 자연스럽게 보인다.
- MCP 에이전트가 UI 자동화 없이 Markdown 프로젝트와 썸네일 이미지를 등록/수정하고 댓글형 피드백을 읽거나 작성할 수 있다.

## 장기 성공 기준

- 프로젝트 등록 또는 의미 있는 변경 이후 AI 리뷰 에이전트가 중복 없이 의미 있는 피드백을 남긴다.
- 피드백 요청을 열면 정해진 시간 안에 사람 피드백이 배정된다.
- 프로젝트 소유자가 받은 피드백을 평가하고 반영 여부를 남긴다.
- 고품질 피드백을 많이 준 사용자가 더 높은 평판과 큐 우선순위를 얻는다.
- 커뮤니티 활동에서 나온 고품질 사례가 자료 라이브러리로 축적된다.

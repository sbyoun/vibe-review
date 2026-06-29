import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Compass,
  MessageSquareText,
  Settings,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    title: "1. 프로젝트를 먼저 등록",
    body: "완성된 서비스만 올리는 곳이 아닙니다. 아이디어, 프로토타입, 작업 중인 앱도 제목, 요약, 상태, 데모 링크만 있으면 워크스페이스에 남깁니다.",
  },
  {
    title: "2. 공개 범위와 피드백 목표 선택",
    body: "혼자 정리할 프로젝트는 private으로 두고, 피드백을 받고 싶은 프로젝트는 public으로 바꾼 뒤 어떤 피드백이 필요한지 고릅니다.",
  },
  {
    title: "3. 크레딧을 걸고 요청 열기",
    body: "필요한 최소 피드백 개수, 마감일, 크레딧 비용을 정해 요청을 엽니다. 요청은 Discover 보드에 올라가고 다른 사용자가 맡을 수 있습니다.",
  },
  {
    title: "4. 받은 피드백을 처리",
    body: "피드백을 unreviewed, planned, implemented, later 같은 상태로 정리합니다. 이 기록이 프로젝트의 다음 작업 목록이 됩니다.",
  },
  {
    title: "5. 프로필 아카이브로 공유",
    body: "공개 프로젝트는 내 프로필에 모입니다. 여러 바이브 코딩 결과물을 흩어진 링크가 아니라 하나의 작업 이력으로 보여줍니다.",
  },
];

const screenGuide = [
  {
    title: "Dashboard",
    icon: ClipboardList,
    body: "내 프로젝트를 만들고 상태를 바꾸며 피드백 요청을 여는 작업 공간입니다.",
  },
  {
    title: "Discover",
    icon: Compass,
    body: "다른 사람이 피드백을 요청한 공개 프로젝트를 찾아 맡는 게시판입니다.",
  },
  {
    title: "Feedback",
    icon: MessageSquareText,
    body: "내가 맡은 피드백, 내가 연 요청, 받은 피드백 처리 상태를 모아 보는 곳입니다.",
  },
  {
    title: "Profile",
    icon: UserRound,
    body: "내 공개 프로젝트와 평판, 크레딧 상태를 외부에 보여주는 아카이브입니다.",
  },
  {
    title: "Settings",
    icon: Settings,
    body: "핸들, 소개, 사용하는 도구, 비밀번호 같은 계정 정보를 관리합니다.",
  },
];

const goodProjectChecklist = [
  "한 줄 요약이 실제 사용 장면을 말한다",
  "데모 URL 또는 저장소 URL이 있다",
  "현재 상태가 idea, building, needs feedback 등으로 맞춰져 있다",
  "원하는 피드백 유형이 구체적이다",
  "받은 피드백의 처리 상태를 계속 업데이트한다",
];

export default function GuidePage() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Guide
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              바이브 코딩 프로젝트를 정리하고 피드백 받는 순서
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              이 서비스는 만든 것을 올려두는 게시판이 아니라, 여러 프로젝트를 한 곳에
              아카이브하고 피드백 요청과 후속 처리를 관리하는 워크스페이스입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" asChild>
              <Link href="/dashboard#new-project">
                <Archive className="size-4" aria-hidden="true" />
                프로젝트 등록
              </Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/discover">
                <Compass className="size-4" aria-hidden="true" />
                피드백 보드 보기
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-5">
          {workflowSteps.map((step) => (
            <article key={step.title} className="rounded-md border border-border bg-card p-4">
              <h2 className="text-sm font-semibold leading-5 text-foreground">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">피드백을 받기 위한 최소 준비</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {goodProjectChecklist.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="leading-6 text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">
                  Dashboard로 이동
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Archive className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">각 화면의 역할</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {screenGuide.map((screen) => {
                const Icon = screen.icon;

                return (
                  <article
                    key={screen.title}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">{screen.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{screen.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

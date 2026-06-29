import Link from "next/link";
import { Clock3, Compass, LogIn, MessageSquareText, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feedbackTypeLabel, formatShortDate, statusLabel, statusTone } from "@/lib/domain";
import { claimFeedbackRequest } from "@/server/actions";
import { getDiscoverData } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const data = await getDiscoverData();

  return (
    <main className="min-h-screen px-5 py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                피드백 게시판
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                공개된 바이브 코딩 프로젝트를 게시판처럼 모아 봅니다.
              </p>
            </div>
            <Button type="button" size="sm" asChild>
              <Link href="/dashboard#new-project">
                <Plus className="size-4" aria-hidden="true" />
                올리기
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            공개 프로젝트 {data.stats.publicProjects}개 · 열린 요청 {data.stats.openRequests}개 · 필요한
            피드백 {data.stats.neededFeedback}개
          </p>
        </header>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          {data.projects.length > 0 ? (
            <div className="divide-y divide-border">
              {data.projects.map(({ project, owner, request, isOwnProject }) => (
                <article
                  key={project.id}
                  className="grid gap-3 px-4 py-4 hover:bg-muted/35 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/p/${owner.handle}/${project.slug}`}
                        className="truncate text-base font-semibold text-foreground hover:text-primary"
                      >
                        {project.title}
                      </Link>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs ${
                          statusTone[project.status]
                        }`}
                      >
                        {statusLabel[project.status]}
                      </span>
                      {request ? <Badge variant="outline">feedback open</Badge> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {project.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                      <Link href={`/p/${owner.handle}`} className="hover:text-primary">
                        @{owner.handle}
                      </Link>
                      <span>{project.feedbackCount} feedback</span>
                      <span>{project.requestCount} requests</span>
                      {request ? (
                        <>
                          <span>
                            {request.receivedCount}/{request.minFeedbackCount} needed
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {formatShortDate(request.deadlineAt)}
                          </span>
                          {request.feedbackTypes.slice(0, 2).map((type) => (
                            <Badge key={type} variant="outline">
                              {feedbackTypeLabel[type]}
                            </Badge>
                          ))}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={`/p/${owner.handle}/${project.slug}`}>
                        <MessageSquareText className="size-4" aria-hidden="true" />
                        열기
                      </Link>
                    </Button>
                    {!request ? null : request.viewerClaim ? (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/p/${owner.handle}/${project.slug}`}>
                          <MessageSquareText className="size-4" aria-hidden="true" />
                          피드백 작성
                        </Link>
                      </Button>
                    ) : request.isOwnRequest || isOwnProject ? (
                      <Button type="button" size="sm" variant="outline" disabled>
                        내 글
                      </Button>
                    ) : !data.viewer ? (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href="/login">
                          <LogIn className="size-4" aria-hidden="true" />
                          로그인
                        </Link>
                      </Button>
                    ) : (
                      <form action={claimFeedbackRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <Button type="submit" size="sm">
                          <MessageSquareText className="size-4" aria-hidden="true" />
                          맡기
                        </Button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold">아직 공개 프로젝트가 없습니다</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                프로젝트를 public으로 올리면 피드백 요청이 없어도 여기에 게시됩니다.
              </p>
              <Button type="button" size="sm" className="mt-4" asChild>
                <Link href="/dashboard#new-project">
                  <Plus className="size-4" aria-hidden="true" />
                  첫 프로젝트 올리기
                </Link>
              </Button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

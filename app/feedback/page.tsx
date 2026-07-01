import Link from "next/link";
import { ArrowUpRight, Inbox, MessageSquareText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feedbackTypeLabel, formatShortDate } from "@/lib/domain";
import { getFeedbackQueueData } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const data = await getFeedbackQueueData();

  return (
    <main className="min-h-screen px-5 py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">피드백</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            내 프로젝트에 달린 피드백과 내가 남긴 피드백을 봅니다.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            받은 피드백 {data.feedback.length}개 · 작성한 피드백 {data.authoredFeedback.length}개
          </p>
        </header>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold">내 프로젝트에 달린 피드백</h2>
            </div>
            <Badge variant="outline">{data.feedback.length}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {data.feedback.map((entry) => {
              const project = data.projects.find((item) => item.id === entry.projectId);

              return (
                <article
                  key={entry.id}
                  className="rounded-md border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{entry.authorName ?? "User"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {project?.title ?? "Project"} · {formatShortDate(entry.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{feedbackTypeLabel[entry.feedbackType]}</Badge>
                      <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {entry.body}
                  </p>
                  {project ? (
                    <Button type="button" size="sm" variant="outline" className="mt-4" asChild>
                      <Link href={`/p/${data.owner.handle}/${project.slug}`}>
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                        글 열기
                      </Link>
                    </Button>
                  ) : null}
                </article>
              );
            })}
            {data.feedback.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                아직 받은 피드백이 없습니다.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold">내가 남긴 피드백</h2>
            </div>
            <Badge variant="outline">{data.authoredFeedback.length}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {data.authoredFeedback.map((entry) => (
              <article
                key={entry.id}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/p/${entry.ownerHandle}/${entry.projectSlug}`}
                      className="text-sm font-semibold hover:text-primary"
                    >
                      {entry.projectTitle}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{entry.ownerHandle} · {formatShortDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{feedbackTypeLabel[entry.feedbackType]}</Badge>
                    <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {entry.body}
                </p>
              </article>
            ))}
            {data.authoredFeedback.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                아직 남긴 피드백이 없습니다.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

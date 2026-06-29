import Link from "next/link";
import { CheckCircle2, Clock3, Compass, MessageSquareText, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackClaimStatusLabel,
  feedbackImplementationStatuses,
  feedbackTypeLabel,
  formatShortDate,
} from "@/lib/domain";
import { cancelFeedbackClaim, updateFeedbackImplementation } from "@/server/actions";
import { getFeedbackQueueData } from "@/server/data";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const implementationLabel: Record<string, string> = {
  unreviewed: "Unreviewed",
  planned: "Planned",
  implemented: "Implemented",
  rejected: "Rejected",
  later: "Later",
};

export default async function FeedbackPage() {
  const data = await getFeedbackQueueData();

  return (
    <main className="min-h-screen px-5 py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">피드백</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            내가 맡은 피드백과 받은 피드백을 필요할 때만 확인합니다.
          </p>
        </header>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold">내가 맡은 피드백</h2>
          </div>
          {data.assignedClaims.length > 0 ? (
            <div className="divide-y divide-border">
              {data.assignedClaims.map((claim) => (
                <article
                  key={claim.id}
                  className="grid gap-3 px-4 py-4 hover:bg-muted/35 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{claim.project.title}</h3>
                      <Badge variant="secondary">{feedbackClaimStatusLabel[claim.status]}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {claim.project.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                      <span>
                        {claim.request.receivedCount}/{claim.request.minFeedbackCount} feedback
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {formatShortDate(claim.dueAt)}
                      </span>
                      {claim.request.feedbackTypes.slice(0, 2).map((type) => (
                        <Badge key={type} variant="outline">
                          {feedbackTypeLabel[type]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button type="button" size="sm" asChild>
                      <Link href={`/p/${claim.owner.handle}/${claim.project.slug}`}>
                        <MessageSquareText className="size-4" aria-hidden="true" />
                        열기
                      </Link>
                    </Button>
                    <form action={cancelFeedbackClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <Button type="submit" size="sm" variant="outline">
                        취소
                      </Button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm leading-6 text-muted-foreground">
                맡은 피드백이 없습니다. 게시판에서 관심 있는 요청을 맡으면 여기에 표시됩니다.
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-4" asChild>
                <Link href="/discover">
                  <Compass className="size-4" aria-hidden="true" />
                  게시판 보기
                </Link>
              </Button>
            </div>
          )}
        </section>

        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold">내가 연 요청</summary>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border">
            {data.requests.map((request) => {
              const progress = Math.min(
                100,
                Math.round((request.receivedCount / request.minFeedbackCount) * 100),
              );

              return (
                <article key={request.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{request.projectTitle}</h3>
                        <Badge variant={request.status === "open" ? "default" : "outline"}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {request.feedbackTypes.map((type) => feedbackTypeLabel[type]).join(", ")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.receivedCount}/{request.minFeedbackCount} ·{" "}
                      {formatShortDate(request.deadlineAt)}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </article>
              );
            })}
            {data.requests.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">아직 연 요청이 없습니다.</p>
            ) : null}
          </div>
        </details>

        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold">받은 피드백 처리</summary>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border">
            {data.feedback.map((entry) => {
              const project = data.projects.find((item) => item.id === entry.projectId);

              return (
                <article key={entry.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{entry.authorName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {project?.title ?? "Project"} · {formatShortDate(entry.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.body}</p>
                  <form
                    action={updateFeedbackImplementation}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <input type="hidden" name="feedbackId" value={entry.id} />
                    <select
                      name="implementedStatus"
                      defaultValue={entry.implementedStatus}
                      className={inputClass}
                      aria-label="Implementation status"
                    >
                      {feedbackImplementationStatuses.map((status) => (
                        <option key={status} value={status}>
                          {implementationLabel[status]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      <Save className="size-4" aria-hidden="true" />
                      저장
                    </Button>
                  </form>
                </article>
              );
            })}
            {data.feedback.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">아직 받은 피드백이 없습니다.</p>
            ) : null}
          </div>
        </details>

        <div>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              내 프로젝트로
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

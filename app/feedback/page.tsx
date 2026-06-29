import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  MessageSquareText,
  Plus,
  Save,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackImplementationStatuses,
  feedbackClaimStatusLabel,
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
  const queueStats = [
    {
      label: "Open",
      value: data.requests.filter((request) => request.status === "open").length,
    },
    {
      label: "Fulfilled",
      value: data.requests.filter((request) => request.status === "fulfilled").length,
    },
    {
      label: "Assigned",
      value: data.assignedClaims.length,
    },
    {
      label: "Received",
      value: data.feedback.length,
    },
  ];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              Feedback queue
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Requests, received reviews, credit costs, and implementation state for active
              projects.
            </p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {queueStats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Assigned to me</h2>
          </div>

          <div className="mt-4 grid gap-3">
            {data.assignedClaims.map((claim) => (
              <article
                key={claim.id}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{claim.project.title}</h3>
                      <Badge variant="secondary">{feedbackClaimStatusLabel[claim.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {claim.project.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {claim.request.feedbackTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {feedbackTypeLabel[type]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" asChild>
                      <Link href={`/p/${claim.owner.handle}/${claim.project.slug}`}>
                        <MessageSquareText className="size-4" aria-hidden="true" />
                        Open
                      </Link>
                    </Button>
                    <form action={cancelFeedbackClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Cancel
                      </Button>
                    </form>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Request progress
                    </div>
                    <p className="mt-2 font-semibold">
                      {claim.request.receivedCount}/{claim.request.minFeedbackCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" />
                      Claim due
                    </div>
                    <p className="mt-2 font-semibold">{formatShortDate(claim.dueAt)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CircleDollarSign className="size-4" aria-hidden="true" />
                      Reward
                    </div>
                    <p className="mt-2 font-semibold">1 credit</p>
                  </div>
                </div>
              </article>
            ))}
            {data.assignedClaims.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  맡은 피드백 작업이 없습니다. Discover에서 다른 사람의 요청을 맡으면 이
                  영역에 마감일과 제출 링크가 표시됩니다.
                </p>
                <Button type="button" size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/discover">
                    <Compass className="size-4" aria-hidden="true" />
                    Discover
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Requests</h2>
            </div>

            <div className="mt-4 grid gap-3">
              {data.requests.map((request) => {
                const progress = Math.min(
                  100,
                  Math.round((request.receivedCount / request.minFeedbackCount) * 100),
                );

                return (
                  <article
                    key={request.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{request.projectTitle}</h3>
                          <Badge variant={request.status === "open" ? "default" : "outline"}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {request.feedbackTypes.map((type) => feedbackTypeLabel[type]).join(", ")}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={`/p/${data.owner.handle}/${request.projectSlug}`}>
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                          Project
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CircleDollarSign className="size-4" aria-hidden="true" />
                          Credit cost
                        </div>
                        <p className="mt-2 font-semibold">{request.creditCost}</p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Feedback
                        </div>
                        <p className="mt-2 font-semibold">
                          {request.receivedCount}/{request.minFeedbackCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock3 className="size-4" aria-hidden="true" />
                          Deadline
                        </div>
                        <p className="mt-2 font-semibold">{formatShortDate(request.deadlineAt)}</p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </article>
                );
              })}
              {data.requests.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    아직 내가 연 피드백 요청이 없습니다. 먼저 프로젝트를 등록한 뒤
                    Dashboard에서 필요한 피드백 유형과 최소 개수를 정해 요청을 여세요.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button type="button" size="sm" asChild>
                      <Link href="/dashboard#new-project">
                        <Plus className="size-4" aria-hidden="true" />
                        프로젝트 등록
                      </Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href="/guide">
                        <BookOpenCheck className="size-4" aria-hidden="true" />
                        Guide
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Received feedback</h2>
            </div>

            <div className="mt-4 grid gap-3">
              {data.feedback.map((entry) => {
                const project = data.projects.find((item) => item.id === entry.projectId);

                return (
                  <article
                    key={entry.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{entry.authorName}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {project?.title ?? "Project"} · {formatShortDate(entry.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={entry.helpfulStatus === "helpful" ? "default" : "outline"}>
                        {entry.helpfulStatus}
                      </Badge>
                      <Badge
                        variant={entry.implementedStatus === "implemented" ? "secondary" : "outline"}
                      >
                        {implementationLabel[entry.implementedStatus]}
                      </Badge>
                      <Badge variant="outline">{feedbackTypeLabel[entry.feedbackType]}</Badge>
                    </div>
                    <form action={updateFeedbackImplementation} className="mt-4 flex gap-2">
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
                        Update
                      </Button>
                    </form>
                  </article>
                );
              })}
              {data.feedback.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm leading-6 text-muted-foreground">
                  아직 받은 피드백이 없습니다. 열린 요청에 피드백이 들어오면 여기서
                  구현 여부와 후속 처리 상태를 관리합니다.
                </p>
              ) : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

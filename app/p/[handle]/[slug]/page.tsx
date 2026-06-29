import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  GitBranch,
  MessageSquareText,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackTypeLabel,
  feedbackTypes,
  formatShortDate,
  statusLabel,
  statusTone,
} from "@/lib/domain";
import { claimFeedbackRequest, createFeedback } from "@/server/actions";
import { getPublicProjectData } from "@/server/data";

export const dynamic = "force-dynamic";

type PublicProjectPageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

export async function generateMetadata({
  params,
}: PublicProjectPageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await getPublicProjectData(handle, slug);

  return {
    title: data ? `${data.project.title} · Vibe Code Workspace` : "Public project",
  };
}

export default async function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { handle, slug } = await params;
  const data = await getPublicProjectData(handle, slug);

  if (!data) {
    notFound();
  }

  const { profile, project, request, viewerClaim, feedback } = data;
  const shippedLabel = project.buildShippedAt
    ? formatShortDate(project.buildShippedAt)
    : "Not shipped";
  const startedLabel = formatShortDate(project.buildStartedAt ?? project.createdAt);
  const creditSpend = request?.creditCost ?? 0;
  const needsClaimBeforeFeedback = request?.status === "open" && !viewerClaim;

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={`/p/${handle}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Profile
            </Link>
          </Button>
        </div>

        <header className="grid gap-6 border-b border-border pb-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 text-xs ${statusTone[project.status]}`}
              >
                {statusLabel[project.status]}
              </span>
              <Badge variant="outline">{project.visibility}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.description ?? project.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {project.demoUrl ? (
                <Button type="button" asChild>
                  <a href={project.demoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Demo
                  </a>
                </Button>
              ) : null}
              {project.repoUrl ? (
                <Button type="button" variant="outline" asChild>
                  <a href={project.repoUrl} target="_blank" rel="noreferrer">
                    <GitBranch className="size-4" aria-hidden="true" />
                    Repo
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-1">
            <div>
              <p className="text-sm text-muted-foreground">Feedback</p>
              <p className="mt-1 text-2xl font-semibold">{project.feedbackCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Implemented</p>
              <p className="mt-1 text-2xl font-semibold">{project.implementedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shipped</p>
              <p className="mt-1 text-2xl font-semibold">{shippedLabel}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="grid gap-6">
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Build details</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">{startedLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatShortDate(project.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Request spend</span>
                  <span className="font-medium">{creditSpend}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Stack</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Feedback focus</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.feedbackFocus.map((focus) => (
                  <Badge key={focus} variant="secondary">
                    {feedbackTypeLabel[focus]}
                  </Badge>
                ))}
              </div>
            </div>
          </aside>

          <div className="grid gap-6">
            {request ? (
              <section className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">Active request</h2>
                  </div>
                  <Badge variant={request.status === "open" ? "default" : "outline"}>
                    {request.status}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {request.feedbackTypes.map((type) => feedbackTypeLabel[type]).join(", ")}
                </p>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Progress
                    </p>
                    <p className="mt-2 font-semibold">
                      {request.receivedCount}/{request.minFeedbackCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <CircleDollarSign className="size-4" aria-hidden="true" />
                      Cost
                    </p>
                    <p className="mt-2 font-semibold">{request.creditCost} credits</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" />
                      Deadline
                    </p>
                    <p className="mt-2 font-semibold">{formatShortDate(request.deadlineAt)}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Leave feedback</h2>
              </div>
              {needsClaimBeforeFeedback ? (
                <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    This request is reserved through the feedback queue. Claim it first, then it
                    appears in your assigned work.
                  </p>
                  <form action={claimFeedbackRequest} className="mt-4">
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit">
                      <MessageSquareText className="size-4" aria-hidden="true" />
                      Claim feedback task
                    </Button>
                  </form>
                </div>
              ) : (
                <form action={createFeedback} className="mt-4 grid gap-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  {request ? <input type="hidden" name="requestId" value={request.id} /> : null}
                  {viewerClaim ? (
                    <input type="hidden" name="claimId" value={viewerClaim.id} />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Name</span>
                      <input
                        className={inputClass}
                        name="authorName"
                        required
                        defaultValue="Guest Reviewer"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={labelClass}>Rating</span>
                      <select className={inputClass} name="rating" defaultValue="4">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Type</span>
                    <select
                      className={inputClass}
                      name="feedbackType"
                      defaultValue="first_impression"
                    >
                      {feedbackTypes.map((type) => (
                        <option key={type} value={type}>
                          {feedbackTypeLabel[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Feedback</span>
                    <textarea className={inputClass} name="body" required rows={5} />
                  </label>
                  <Button type="submit">
                    <Send className="size-4" aria-hidden="true" />
                    Submit feedback
                  </Button>
                </form>
              )}
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Feedback</h2>
                </div>
                <Badge variant="outline">{feedback.length}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {feedback.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{entry.authorName}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.authorBio ?? profile.name}
                        </p>
                      </div>
                      <Badge variant="outline">{feedbackTypeLabel[entry.feedbackType]}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={entry.helpfulStatus === "helpful" ? "default" : "outline"}>
                        {entry.helpfulStatus}
                      </Badge>
                      <Badge
                        variant={entry.implementedStatus === "implemented" ? "secondary" : "outline"}
                      >
                        {entry.implementedStatus}
                      </Badge>
                      <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                      <Badge variant="outline">{formatShortDate(entry.createdAt)}</Badge>
                    </div>
                  </article>
                ))}
                {feedback.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No feedback yet.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

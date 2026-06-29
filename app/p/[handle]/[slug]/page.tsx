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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatShortDate,
  getProjectFeedbackEntries,
  getProjectFeedbackRequest,
  getPublicProject,
  statusLabel,
  statusTone,
} from "@/lib/mock-workspace";

type PublicProjectPageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicProjectPageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const project = getPublicProject(handle, slug);

  return {
    title: project ? `${project.title} · Vibe Code Workspace` : "Public project",
  };
}

export default async function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { handle, slug } = await params;
  const project = getPublicProject(handle, slug);

  if (!project) {
    notFound();
  }

  const request = getProjectFeedbackRequest(project.slug);
  const feedback = getProjectFeedbackEntries(project.slug);
  const shippedLabel = project.shippedAt ? formatShortDate(project.shippedAt) : "Not shipped";

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
              {project.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" asChild>
                <a href={project.demoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Demo
                </a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={project.repoUrl} target="_blank" rel="noreferrer">
                  <GitBranch className="size-4" aria-hidden="true" />
                  Repo
                </a>
              </Button>
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
                  <span className="font-medium">{formatShortDate(project.startedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatShortDate(project.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Credits spent</span>
                  <span className="font-medium">{project.creditSpend}</span>
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
                    {focus}
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
                <h3 className="mt-4 text-base font-semibold">{request.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.focus}</p>
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
                        <h3 className="text-sm font-semibold">{entry.author}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.role}</p>
                      </div>
                      <Badge variant="outline">{entry.type}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={entry.helpfulStatus === "helpful" ? "default" : "outline"}>
                        {entry.helpfulStatus}
                      </Badge>
                      <Badge
                        variant={
                          entry.implementedStatus === "implemented" ? "secondary" : "outline"
                        }
                      >
                        {entry.implementedStatus}
                      </Badge>
                      <Badge variant="outline">{entry.rating}/5</Badge>
                      <Badge variant="outline">{formatShortDate(entry.createdAt)}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

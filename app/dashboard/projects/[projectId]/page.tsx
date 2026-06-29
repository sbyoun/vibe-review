import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ClipboardList,
  ExternalLink,
  GitBranch,
  MessageSquareText,
  Save,
  Send,
  Settings,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackImplementationStatuses,
  feedbackTypeLabel,
  feedbackTypes,
  formatShortDate,
  projectStatuses,
  projectVisibilities,
  statusLabel,
  statusTone,
} from "@/lib/domain";
import {
  createFeedbackRequest,
  updateFeedbackImplementation,
  updateProjectDetails,
  updateProjectStatus,
} from "@/server/actions";
import { getWorkspaceProjectData } from "@/server/data";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

const implementationLabel: Record<string, string> = {
  unreviewed: "Unreviewed",
  planned: "Planned",
  implemented: "Implemented",
  rejected: "Rejected",
  later: "Later",
};

type ProjectManagePageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({
  params,
}: ProjectManagePageProps): Promise<Metadata> {
  const { projectId } = await params;
  const data = await getWorkspaceProjectData(projectId);

  return {
    title: data ? `${data.project.title} · Manage project` : "Manage project",
  };
}

export default async function ProjectManagePage({ params }: ProjectManagePageProps) {
  const { projectId } = await params;
  const data = await getWorkspaceProjectData(projectId);

  if (!data) {
    notFound();
  }

  const { owner, project, requests, feedback, statusEvents } = data;
  const openRequests = requests.filter((request) => request.status === "open");
  const latestRequest = requests[0] ?? null;
  const shippedLabel = project.buildShippedAt
    ? formatShortDate(project.buildShippedAt)
    : "Not shipped";
  const stats = [
    { label: "Feedback", value: project.feedbackCount.toString(), icon: MessageSquareText },
    { label: "Requests", value: requests.length.toString(), icon: ClipboardList },
    { label: "Implemented", value: project.implementedCount.toString(), icon: CheckCircle2 },
    { label: "Credits", value: owner.feedbackCredits.toString(), icon: CircleDollarSign },
  ];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        </div>

        <header className="grid gap-6 border-b border-border pb-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 text-xs ${statusTone[project.status]}`}
              >
                {statusLabel[project.status]}
              </span>
              <Badge variant="outline">{project.visibility}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {project.visibility === "public" ? (
                <Button type="button" variant="outline" asChild>
                  <Link href={`/p/${owner.handle}/${project.slug}`}>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                    Public page
                  </Link>
                </Button>
              ) : null}
              {project.demoUrl ? (
                <Button type="button" variant="outline" asChild>
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

          <section className="grid gap-3 sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                  </div>
                  <stat.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
              </div>
            ))}
          </section>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <div className="grid gap-6">
            <section className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Settings className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Project details</h2>
              </div>

              <form action={updateProjectDetails} className="mt-5 grid gap-4">
                <input type="hidden" name="projectId" value={project.id} />
                <label className="grid gap-1.5">
                  <span className={labelClass}>Title</span>
                  <input
                    className={inputClass}
                    name="title"
                    defaultValue={project.title}
                    required
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Summary</span>
                  <textarea
                    className={inputClass}
                    name="summary"
                    defaultValue={project.summary}
                    required
                    rows={3}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Description</span>
                  <textarea
                    className={inputClass}
                    name="description"
                    defaultValue={project.description ?? ""}
                    rows={5}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Visibility</span>
                    <select
                      className={inputClass}
                      name="visibility"
                      defaultValue={project.visibility}
                    >
                      {projectVisibilities.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {visibility}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Tools</span>
                    <input
                      className={inputClass}
                      name="tools"
                      defaultValue={project.tools.join(", ")}
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Demo URL</span>
                    <input
                      className={inputClass}
                      name="demoUrl"
                      type="url"
                      defaultValue={project.demoUrl ?? ""}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Repo URL</span>
                    <input
                      className={inputClass}
                      name="repoUrl"
                      type="url"
                      defaultValue={project.repoUrl ?? ""}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="size-4" aria-hidden="true" />
                    Save details
                  </Button>
                </div>
              </form>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Received feedback</h2>
                </div>
                <Badge variant="outline">{feedback.length}</Badge>
              </div>

              <div className="mt-5 grid gap-3">
                {feedback.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {entry.authorName ?? "Reviewer"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {feedbackTypeLabel[entry.feedbackType]} ·{" "}
                          {formatShortDate(entry.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.rating ?? "-"} / 5</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.body}</p>
                    <form
                      action={updateFeedbackImplementation}
                      className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
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
                        Update
                      </Button>
                    </form>
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

          <aside className="grid gap-6 content-start">
            <section className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Status</h2>
              </div>
              <form action={updateProjectStatus} className="mt-4 flex gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <select name="status" defaultValue={project.status} className={inputClass}>
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel[status]}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline">
                  <Save className="size-4" aria-hidden="true" />
                  Save
                </Button>
              </form>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatShortDate(project.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Shipped</span>
                  <span className="font-medium">{shippedLabel}</span>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Open feedback request</h2>
              </div>
              <form action={createFeedbackRequest} className="mt-4 grid gap-3">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Minimum</span>
                    <input
                      className={inputClass}
                      name="minFeedbackCount"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={3}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Credits</span>
                    <input
                      className={inputClass}
                      name="creditCost"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={3}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Days</span>
                    <input
                      className={inputClass}
                      name="deadlineDays"
                      type="number"
                      min={1}
                      max={30}
                      defaultValue={2}
                    />
                  </label>
                </div>
                <div className="grid gap-2">
                  <p className={labelClass}>Feedback types</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {feedbackTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="feedbackTypes"
                          value={type}
                          defaultChecked={type === "first_impression" || type === "ux_ui"}
                        />
                        {feedbackTypeLabel[type]}
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit">
                  <Send className="size-4" aria-hidden="true" />
                  Spend credits and open
                </Button>
              </form>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Requests</h2>
                </div>
                <Badge variant={openRequests.length > 0 ? "default" : "outline"}>
                  {openRequests.length} open
                </Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {latestRequest ? (
                  <div className="rounded-md border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{latestRequest.status}</p>
                      <Badge variant="outline">{latestRequest.creditCost} credits</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {latestRequest.receivedCount}/{latestRequest.minFeedbackCount} received by{" "}
                      {formatShortDate(latestRequest.deadlineAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestRequest.feedbackTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {feedbackTypeLabel[type]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No requests yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Activity</h2>
              <div className="mt-4 grid gap-3">
                {statusEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs ${
                          statusTone[event.toStatus]
                        }`}
                      >
                        {statusLabel[event.toStatus]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {event.note ?? "Status changed"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

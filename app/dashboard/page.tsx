import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Columns3,
  Compass,
  MessageSquareText,
  Plus,
  Save,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackTypeLabel,
  feedbackTypes,
  formatShortDate,
  projectStatuses,
  projectVisibilities,
  statusLabel,
  statusTone,
} from "@/lib/domain";
import { createFeedbackRequest, createProject, updateProjectStatus } from "@/server/actions";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

const creditReasonLabel: Record<string, string> = {
  earned_feedback: "Feedback earned",
  spent_feedback_request: "Feedback request",
  request_refund: "Request refund",
  admin_adjustment: "Admin adjustment",
};

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  const openRequests = data.requests.filter((request) => request.status === "open");
  const dashboardStats = [
    { label: "Active projects", value: data.projects.length.toString(), icon: Columns3 },
    { label: "Open requests", value: openRequests.length.toString(), icon: ClipboardList },
    { label: "Credits", value: data.owner.feedbackCredits.toString(), icon: CircleDollarSign },
    { label: "Reputation", value: data.owner.reputationScore.toString(), icon: Activity },
  ];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {data.owner.name} is managing real projects, feedback requests, credit spend, and
              public archive pages from this workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/discover">
                <Compass className="size-4" aria-hidden="true" />
                Discover
              </Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/feedback">
                <MessageSquareText className="size-4" aria-hidden="true" />
                Feedback queue
              </Link>
            </Button>
            <Button type="button" asChild>
              <a href="#new-project">
                <Plus className="size-4" aria-hidden="true" />
                New project
              </a>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                </div>
                <stat.icon className="size-5 text-primary" aria-hidden="true" />
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Columns3 className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Project board</h2>
              </div>
              <Badge variant="outline">{data.projects.length} projects</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {projectStatuses.map((status) => {
                const projects = data.projects.filter((project) => project.status === status);

                return (
                  <div
                    key={status}
                    className="min-h-56 rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{statusLabel[status]}</h3>
                      <span className="text-xs text-muted-foreground">{projects.length}</span>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {projects.map((project) => (
                        <article
                          key={project.id}
                          className="rounded-md border border-border bg-card p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/p/${data.owner.handle}/${project.slug}`}
                              className="text-sm font-semibold leading-5 hover:text-primary"
                            >
                              {project.title}
                            </Link>
                            <ArrowUpRight
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                            {project.summary}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {project.tools.slice(0, 3).map((tool) => (
                              <Badge key={tool} variant="outline">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                          <form action={updateProjectStatus} className="mt-3 flex gap-2">
                            <input type="hidden" name="projectId" value={project.id} />
                            <select
                              name="status"
                              defaultValue={project.status}
                              className={inputClass}
                              aria-label={`${project.title} status`}
                            >
                              {projectStatuses.map((option) => (
                                <option key={option} value={option}>
                                  {statusLabel[option]}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" variant="outline">
                              <Save className="size-4" aria-hidden="true" />
                              Save
                            </Button>
                          </form>
                        </article>
                      ))}
                      {projects.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                          No projects
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="grid gap-6">
            <section id="new-project" className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Create project</h2>
              </div>
              <form action={createProject} className="mt-4 grid gap-3">
                <label className="grid gap-1.5">
                  <span className={labelClass}>Title</span>
                  <input className={inputClass} name="title" required maxLength={160} />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Summary</span>
                  <textarea className={inputClass} name="summary" required rows={3} />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Description</span>
                  <textarea className={inputClass} name="description" rows={4} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Status</span>
                    <select className={inputClass} name="status" defaultValue="idea">
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Visibility</span>
                    <select className={inputClass} name="visibility" defaultValue="public">
                      {projectVisibilities.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {visibility}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Demo URL</span>
                  <input className={inputClass} name="demoUrl" type="url" />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Repo URL</span>
                  <input className={inputClass} name="repoUrl" type="url" />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Tools</span>
                  <input
                    className={inputClass}
                    name="tools"
                    placeholder="Next.js, Codex, Drizzle"
                  />
                </label>
                <Button type="submit">
                  <Plus className="size-4" aria-hidden="true" />
                  Create project
                </Button>
              </form>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Open feedback request</h2>
              </div>
              <form action={createFeedbackRequest} className="mt-4 grid gap-3">
                <label className="grid gap-1.5">
                  <span className={labelClass}>Project</span>
                  <select className={inputClass} name="projectId" required>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
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
                <Button type="submit" disabled={data.projects.length === 0}>
                  <Send className="size-4" aria-hidden="true" />
                  Spend credits and open
                </Button>
              </form>
            </section>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_0.8fr_1fr]">
          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Feedback due</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {openRequests.map((request) => (
                <div key={request.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{request.projectTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.feedbackTypes.map((type) => feedbackTypeLabel[type]).join(", ")}
                      </p>
                    </div>
                    <Badge variant="secondary">{request.creditCost} credits</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {request.receivedCount}/{request.minFeedbackCount} received
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {formatShortDate(request.deadlineAt)}
                    </span>
                  </div>
                </div>
              ))}
              {openRequests.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No active request.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Credits</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {data.creditLedger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {creditReasonLabel[entry.reason] ?? entry.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatShortDate(entry.createdAt)}
                    </p>
                  </div>
                  <span className={entry.amount > 0 ? "text-emerald-700" : "text-rose-700"}>
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </div>
              ))}
              {data.creditLedger.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No credit history yet.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Status events</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {data.statusEvents.map((event) => {
                const project = data.projects.find((item) => item.id === event.projectId);

                return (
                  <div key={event.id} className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{project?.title ?? "Project"}</p>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs ${
                          statusTone[event.toStatus]
                        }`}
                      >
                        {statusLabel[event.toStatus]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {event.note ?? "Status changed"} · {formatShortDate(event.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Columns3,
  MessageSquareText,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  creditLedger,
  feedbackRequests,
  formatShortDate,
  projectStatusEvents,
  statusLabel,
  statusTone,
  workspaceOwner,
  workspaceProjects,
  type ProjectStatus,
} from "@/lib/mock-workspace";

const boardColumns: Array<{ status: ProjectStatus; label: string }> = [
  { status: "idea", label: "Ideas" },
  { status: "building", label: "Building" },
  { status: "needs_feedback", label: "Needs feedback" },
  { status: "iterating", label: "Iterating" },
  { status: "shipped", label: "Shipped" },
];

const dashboardStats = [
  { label: "Active projects", value: workspaceProjects.length.toString(), icon: Columns3 },
  {
    label: "Open requests",
    value: feedbackRequests.filter((request) => request.status === "open").length.toString(),
    icon: ClipboardList,
  },
  { label: "Credits", value: workspaceOwner.feedbackCredits.toString(), icon: CircleDollarSign },
  { label: "Reputation", value: workspaceOwner.reputationScore.toString(), icon: Activity },
];

export default function DashboardPage() {
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
              {workspaceOwner.name} tracks projects, feedback requests, credits, and public
              profile readiness here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/feedback">
                <MessageSquareText className="size-4" aria-hidden="true" />
                Feedback queue
              </Link>
            </Button>
            <Button type="button">
              <Plus className="size-4" aria-hidden="true" />
              New project
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

        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Columns3 className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Project board</h2>
              </div>
              <Badge variant="outline">{workspaceProjects.length} projects</Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              {boardColumns.map((column) => {
                const projects = workspaceProjects.filter(
                  (project) => project.status === column.status,
                );

                return (
                  <div
                    key={column.status}
                    className="min-h-56 rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{column.label}</h3>
                      <span className="text-xs text-muted-foreground">{projects.length}</span>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/p/${workspaceOwner.handle}/${project.slug}`}
                          className="block rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold leading-5">{project.title}</h4>
                            <ArrowUpRight
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                            {project.summary}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {project.tools.slice(0, 2).map((tool) => (
                              <Badge key={tool} variant="outline">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="grid gap-6">
            <section className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Feedback due</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {feedbackRequests
                  .filter((request) => request.status === "open")
                  .map((request) => (
                    <div
                      key={request.id}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{request.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {request.projectTitle}
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
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Credits</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {creditLedger.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{entry.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatShortDate(entry.date)}
                      </p>
                    </div>
                    <span className={entry.amount > 0 ? "text-emerald-700" : "text-rose-700"}>
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Status events</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {projectStatusEvents.map((event) => {
              const project = workspaceProjects.find((item) => item.slug === event.projectSlug);

              return (
                <div key={event.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{event.label}</p>
                    {project ? (
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs ${statusTone[project.status]}`}
                      >
                        {statusLabel[project.status]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {project?.title ?? "Project"} · {formatShortDate(event.date)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

import Link from "next/link";
import { MoreHorizontal, Plus, Timer, CheckCircle2, Eye } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { formatShortDate, statusLabel, type ProjectStatus } from "@/lib/domain";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

const columns: Array<{
  title: string;
  statuses: ProjectStatus[];
  muted?: boolean;
}> = [
  { title: "Ideation", statuses: ["idea", "parked"] },
  { title: "In Progress", statuses: ["prototype", "building", "iterating"] },
  { title: "Vibe Check", statuses: ["needs_feedback"] },
  { title: "Shipped", statuses: ["shipped", "archived"], muted: true },
];

export default async function DashboardPage() {
  const data = await getWorkspaceData();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1400px] flex-col overflow-hidden px-3 py-8 md:px-6">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 text-xl font-semibold leading-7 text-foreground">My Projects</h1>
            <p className="text-sm leading-5 text-muted-foreground">Manage your pipeline.</p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="size-4" aria-hidden="true" />
              New Project
            </Link>
          </Button>
        </header>

        <section className="flex flex-grow items-start gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnProjects = data.projects.filter((project) =>
              column.statuses.includes(project.status),
            );

            return (
              <section
                key={column.title}
                className={`flex h-full min-w-[300px] w-[300px] flex-col rounded-sm border border-border bg-card p-2 ${
                  column.muted ? "opacity-70 hover:opacity-100" : ""
                }`}
              >
                <h2 className="mb-4 flex items-center justify-between border-b border-border pb-2 text-base font-semibold leading-[22px]">
                  {column.title}
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-medium leading-[14px] text-muted-foreground">
                    {columnProjects.length}
                  </span>
                </h2>

                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                  {columnProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="group rounded-sm border border-border bg-background p-2 hover:bg-muted"
                    >
                      {project.coverImageUrl ? (
                        <div className="relative mb-2 h-24 overflow-hidden rounded-sm border border-border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={project.coverImageUrl}
                            alt=""
                            className={`h-full w-full object-cover ${column.muted ? "grayscale" : ""}`}
                          />
                        </div>
                      ) : null}
                      <div className="mb-1 flex items-center gap-2">
                        {column.title === "Vibe Check" ? (
                          <Eye className="size-3.5 text-secondary" aria-hidden="true" />
                        ) : column.muted ? (
                          <CheckCircle2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <span className="size-2 rounded-full bg-secondary" aria-hidden="true" />
                        )}
                        <h3
                          className={`text-xs font-semibold leading-4 text-foreground group-hover:text-primary ${
                            column.muted ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {project.title}
                        </h3>
                      </div>
                      <p className="mb-2 line-clamp-2 text-[11px] leading-[14px] text-muted-foreground">
                        {project.summary}
                      </p>
                      <div className="flex items-center justify-between text-[11px] leading-[14px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="size-3" aria-hidden="true" />
                          {formatShortDate(project.updatedAt)}
                        </span>
                        <MoreHorizontal className="size-3.5" aria-hidden="true" />
                      </div>
                      <div className="mt-2 text-[11px] leading-[14px] text-muted-foreground">
                        {statusLabel[project.status]} · {project.feedbackCount} comments
                      </div>
                    </Link>
                  ))}

                  {columnProjects.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-border p-3 text-[11px] leading-[14px] text-muted-foreground">
                      No projects.
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

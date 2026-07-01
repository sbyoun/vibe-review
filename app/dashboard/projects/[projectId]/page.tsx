import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  Camera,
  ExternalLink,
  GitBranch,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/project-form";
import {
  formatShortDate,
  statusLabel,
  statusTone,
} from "@/lib/domain";
import {
  captureProjectCover,
  deleteProject,
  restoreProjectRevision,
  updateProjectDetails,
} from "@/server/actions";
import { getWorkspaceProjectData } from "@/server/data";

import { DeleteProjectForm } from "./delete-project-form";
import { RevisionHistoryPanel } from "./revision-history-panel";

export const dynamic = "force-dynamic";

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

  const { owner, project, revisions } = data;
  const hasLinks = Boolean(project.demoUrl || project.repoUrl);
  const projectHref = `/p/${owner.handle}/${project.slug}` as Route;
  const revisionItems = revisions.map((revision) => ({
    ...revision,
    createdAt: revision.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1100px] px-3 py-8 md:px-6 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div className="min-w-0">
              <header className="mb-8 border-b border-border pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 text-[11px] ${statusTone[project.status]}`}
                  >
                    {statusLabel[project.status]}
                  </span>
                  <Badge variant="outline">{project.visibility}</Badge>
                </div>
                <h1 className="mt-3 text-xl font-semibold leading-7 text-foreground">
                  Edit Project
                </h1>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {project.title} · updated {formatShortDate(project.updatedAt)}
                </p>
              </header>

              <section className="grid gap-6">
                <ProjectForm
                  action={updateProjectDetails}
                  mode="edit"
                  project={project}
                  cancelHref={projectHref}
                />

                <aside className="grid gap-4 sm:grid-cols-2">
                  {project.demoUrl ? (
                    <section className="border border-border bg-card p-4">
                      <h2 className="text-base font-semibold">Demo Screenshot</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Capture the saved live demo URL as the project image.
                      </p>
                      <form action={captureProjectCover} className="mt-4">
                        <input type="hidden" name="projectId" value={project.id} />
                        <Button type="submit" variant="outline">
                          <Camera className="size-4" aria-hidden="true" />
                          Capture
                        </Button>
                      </form>
                    </section>
                  ) : null}

                  {hasLinks ? (
                    <section className="border border-border bg-card p-4">
                      <h2 className="text-base font-semibold">Links</h2>
                      <div className="mt-4 grid gap-2">
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
                    </section>
                  ) : null}
                </aside>

                <section className="border border-destructive/30 bg-card p-4">
                  <h2 className="text-base font-semibold text-destructive">Delete Project</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Remove this project post and all feedback attached to it. This cannot be undone.
                  </p>
                  <DeleteProjectForm
                    action={deleteProject}
                    projectId={project.id}
                    projectTitle={project.title}
                  />
                </section>
              </section>
            </div>

            <RevisionHistoryPanel
              action={restoreProjectRevision}
              revisions={revisionItems}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

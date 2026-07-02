import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, FileText, MessageSquareText, Plus } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { feedbackKindLabel, formatShortDate, statusLabel } from "@/lib/domain";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

type WorkspaceData = Awaited<ReturnType<typeof getWorkspaceData>>;
type WorkspaceProject = WorkspaceData["projects"][number] | WorkspaceData["externalReviews"][number];
type ReceivedFeedback = WorkspaceData["feedback"][number];
type AuthoredFeedback = WorkspaceData["authoredFeedback"][number];

type FeedItem =
  | {
      type: "project";
      id: string;
      createdAt: Date;
      href: string;
      project: WorkspaceProject;
    }
  | {
      type: "feedback";
      id: string;
      createdAt: Date;
      href: string;
      projectTitle: string;
      authorLabel: string;
      relationLabel: string;
      body: string;
      kind: ReceivedFeedback["kind"] | AuthoredFeedback["kind"];
      visibility: ReceivedFeedback["visibility"] | AuthoredFeedback["visibility"];
    };

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  const feed = buildFeed(data);
  const projectCount = data.projects.length + data.externalReviews.length;
  const feedbackCount = feed.filter((item) => item.type === "feedback").length;

  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[960px] px-3 py-8 md:px-6">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-1 text-xl font-semibold leading-7 text-foreground">My Feed</h1>
            <p className="text-sm leading-5 text-muted-foreground">
              내가 올린 프로젝트 글, 내 글에 달린 댓글, 내가 남긴 댓글을 최신순으로 봅니다.
            </p>
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              {projectCount} posts · {feedbackCount} comments
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="size-4" aria-hidden="true" />
              New Project
            </Link>
          </Button>
        </header>

        <section className="border-t border-border">
          {feed.map((item) =>
            item.type === "project" ? (
              <ProjectFeedItem key={item.id} item={item} />
            ) : (
              <FeedbackFeedItem key={item.id} item={item} />
            ),
          )}

          {feed.length === 0 ? (
            <div className="border-b border-border py-8 text-sm leading-6 text-muted-foreground">
              아직 보여줄 활동이 없습니다. 프로젝트 글을 올리거나 피드백을 남기면 여기에 최신순으로 표시됩니다.
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function ProjectFeedItem({ item }: { item: Extract<FeedItem, { type: "project" }> }) {
  const project = item.project;
  const label = project.projectType === "external" ? "외부 프로젝트 글" : "내 프로젝트 글";

  return (
    <article className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border py-4">
      <div className="pt-1">
        <FileText className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
          <span>{label}</span>
          <span>·</span>
          <span>{formatShortDate(item.createdAt)}</span>
          <span>·</span>
          <span>{project.visibility}</span>
          <span>·</span>
          <span>{statusLabel[project.status]}</span>
        </div>
        <Link
          href={item.href as Route}
          className="mt-1 inline-flex max-w-full items-center gap-1 text-base font-semibold leading-[22px] text-foreground hover:text-primary hover:underline"
        >
          <span className="truncate">{project.title}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {project.summary}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] leading-[14px] text-muted-foreground">
          <span>{project.feedbackCount} comments</span>
          {project.categoryTags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-sm border border-border bg-muted px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function FeedbackFeedItem({ item }: { item: Extract<FeedItem, { type: "feedback" }> }) {
  return (
    <article className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border py-4">
      <div className="pt-1">
        <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
          <span>{item.relationLabel}</span>
          <span>·</span>
          <span>{item.authorLabel}</span>
          <span>·</span>
          <span>{formatShortDate(item.createdAt)}</span>
          <span>·</span>
          <span>{feedbackKindLabel[item.kind]}</span>
          {item.visibility === "private" ? (
            <>
              <span>·</span>
              <span>Private</span>
            </>
          ) : null}
        </div>
        <Link
          href={item.href as Route}
          className="mt-1 inline-flex max-w-full items-center gap-1 text-sm font-semibold leading-5 text-foreground hover:text-primary hover:underline"
        >
          <span className="truncate">{item.projectTitle}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
        <div className="mt-2 max-h-48 overflow-auto whitespace-pre-line border-l-2 border-border pl-3 text-sm leading-6 text-foreground">
          {item.body}
        </div>
      </div>
    </article>
  );
}

function buildFeed(data: WorkspaceData): FeedItem[] {
  const allProjects = [...data.projects, ...data.externalReviews];
  const projectById = new Map(allProjects.map((project) => [project.id, project]));
  const seenFeedbackIds = new Set<string>();

  const projectItems: FeedItem[] = allProjects.map((project) => ({
    type: "project",
    id: `project-${project.id}`,
    createdAt: project.createdAt,
    href: `/p/${data.owner.handle}/${project.slug}`,
    project,
  }));

  const receivedItems: FeedItem[] = data.feedback.map((entry) => {
    seenFeedbackIds.add(entry.id);
    const project = projectById.get(entry.projectId);
    const isMine = entry.authorId === data.owner.id;

    return {
      type: "feedback",
      id: `feedback-${entry.id}`,
      createdAt: entry.createdAt,
      href: project ? `/p/${data.owner.handle}/${project.slug}#feedback-${entry.id}` : "/dashboard",
      projectTitle: project?.title ?? "Unknown project",
      authorLabel: isMine ? "me" : entry.authorHandle ?? entry.authorName ?? "user",
      relationLabel: isMine ? "내 댓글" : "내 글에 달린 댓글",
      body: entry.body,
      kind: entry.kind,
      visibility: entry.visibility,
    };
  });

  const authoredItems: FeedItem[] = data.authoredFeedback
    .filter((entry) => !seenFeedbackIds.has(entry.id))
    .map((entry) => ({
      type: "feedback",
      id: `feedback-${entry.id}`,
      createdAt: entry.createdAt,
      href: entry.ownerHandle
        ? `/p/${entry.ownerHandle}/${entry.projectSlug}#feedback-${entry.id}`
        : "/dashboard",
      projectTitle: entry.projectTitle,
      authorLabel: "me",
      relationLabel: "내 댓글",
      body: entry.body,
      kind: entry.kind,
      visibility: entry.visibility,
    }));

  return [...projectItems, ...receivedItems, ...authoredItems].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

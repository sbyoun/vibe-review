import Link from "next/link";
import type { Route } from "next";
import {
  ArrowUpRight,
  FileText,
  Inbox,
  MessageSquareReply,
  MessageSquareText,
  Plus,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { feedbackKindLabel, formatShortDate, statusLabel } from "@/lib/domain";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{ project?: string }>;
};

type WorkspaceData = Awaited<ReturnType<typeof getWorkspaceData>>;
type WorkspaceProject = WorkspaceData["projects"][number] | WorkspaceData["externalReviews"][number];
type ReceivedFeedback = WorkspaceData["feedback"][number];
type AuthoredFeedback = WorkspaceData["authoredFeedback"][number];

type ProjectOption = {
  project: WorkspaceProject;
  href: string;
  needsReplyCount: number;
  activityCount: number;
};

type NeedsReplyItem = {
  id: string;
  projectId: string;
  createdAt: Date;
  href: string;
  projectTitle: string;
  authorLabel: string;
  body: string;
};

type FeedItem =
  | {
      type: "project";
      id: string;
      projectId: string;
      createdAt: Date;
      href: string;
      project: WorkspaceProject;
    }
  | {
      type: "feedback";
      id: string;
      projectId: string;
      createdAt: Date;
      href: string;
      projectTitle: string;
      authorLabel: string;
      relationLabel: string;
      body: string;
      kind: ReceivedFeedback["kind"] | AuthoredFeedback["kind"];
      visibility: ReceivedFeedback["visibility"] | AuthoredFeedback["visibility"];
    };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const data = await getWorkspaceData();
  const params = await searchParams;
  const allProjects = [...data.projects, ...data.externalReviews];
  const selectedProject = allProjects.find((project) => project.id === params?.project) ?? null;
  const selectedProjectId = selectedProject?.id ?? null;
  const feed = buildFeed(data, selectedProjectId);
  const needsReply = buildNeedsReply(data, selectedProjectId);
  const allNeedsReply = buildNeedsReply(data, null);
  const projectOptions = buildProjectOptions(data, allNeedsReply);
  const feedbackCount = feed.filter((item) => item.type === "feedback").length;
  const title = selectedProject ? selectedProject.title : "All projects";

  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1180px] px-3 py-8 md:px-6">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-1 text-xl font-semibold leading-7 text-foreground">My Inbox</h1>
            <p className="text-sm leading-5 text-muted-foreground">
              내 프로젝트에 들어온 피드백과 내가 남긴 활동을 프로젝트별로 봅니다.
            </p>
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              {allProjects.length} posts · {allNeedsReply.length} needs reply · {feedbackCount} visible activities
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="size-4" aria-hidden="true" />
              New Project
            </Link>
          </Button>
        </header>

        <ProjectFilterBar
          projectOptions={projectOptions}
          selectedProjectId={selectedProjectId}
          totalNeedsReply={allNeedsReply.length}
          totalActivity={buildFeed(data, null).length}
        />

        <div className="grid gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
          <ProjectSidebar
            projectOptions={projectOptions}
            selectedProjectId={selectedProjectId}
            totalNeedsReply={allNeedsReply.length}
            totalActivity={buildFeed(data, null).length}
          />

          <div className="min-w-0">
            <section className="mb-8">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold leading-[22px] text-foreground">
                    Needs reply
                  </h2>
                  <p className="text-xs leading-4 text-muted-foreground">
                    {title} · 외부 작성자의 root 피드백 중 아직 내가 답하지 않은 항목
                  </p>
                </div>
                {selectedProject ? (
                  <Link
                    href="/dashboard"
                    className="text-xs font-medium leading-4 text-primary hover:underline"
                  >
                    Clear project
                  </Link>
                ) : null}
              </div>

              {needsReply.length > 0 ? (
                <div className="border-t border-border">
                  {needsReply.map((item) => (
                    <NeedsReplyFeedItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                  지금 답변이 필요한 피드백은 없습니다.
                </div>
              )}
            </section>

            <section>
              <div className="mb-3">
                <h2 className="text-base font-semibold leading-[22px] text-foreground">
                  Recent activity
                </h2>
                <p className="text-xs leading-4 text-muted-foreground">
                  {title} · 프로젝트 글, 받은 댓글, 내가 남긴 댓글을 최신순으로 표시합니다.
                </p>
              </div>

              <div className="border-t border-border">
                {feed.map((item) =>
                  item.type === "project" ? (
                    <ProjectFeedItem key={item.id} item={item} />
                  ) : (
                    <FeedbackFeedItem key={item.id} item={item} />
                  ),
                )}

                {feed.length === 0 ? (
                  <div className="border-b border-border py-8 text-sm leading-6 text-muted-foreground">
                    아직 보여줄 활동이 없습니다. 프로젝트 글을 올리거나 피드백을 남기면 여기에 표시됩니다.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ProjectFilterBar({
  projectOptions,
  selectedProjectId,
  totalNeedsReply,
  totalActivity,
}: {
  projectOptions: ProjectOption[];
  selectedProjectId: string | null;
  totalNeedsReply: number;
  totalActivity: number;
}) {
  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-4 md:hidden">
      <ProjectFilterChip
        href="/dashboard"
        active={!selectedProjectId}
        label="All"
        meta={`${totalNeedsReply} needs · ${totalActivity} acts`}
      />
      {projectOptions.map((option) => (
        <ProjectFilterChip
          key={option.project.id}
          href={option.href}
          active={selectedProjectId === option.project.id}
          label={option.project.title}
          meta={`${option.needsReplyCount} needs`}
        />
      ))}
    </nav>
  );
}

function ProjectFilterChip({
  href,
  active,
  label,
  meta,
}: {
  href: string;
  active: boolean;
  label: string;
  meta: string;
}) {
  return (
    <Link
      href={href as Route}
      className={`min-w-36 shrink-0 rounded-sm border px-3 py-2 text-left ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      <span className="block truncate text-xs font-semibold leading-4">{label}</span>
      <span className={`mt-1 block text-[11px] leading-[14px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {meta}
      </span>
    </Link>
  );
}

function ProjectSidebar({
  projectOptions,
  selectedProjectId,
  totalNeedsReply,
  totalActivity,
}: {
  projectOptions: ProjectOption[];
  selectedProjectId: string | null;
  totalNeedsReply: number;
  totalActivity: number;
}) {
  return (
    <aside className="hidden md:block">
      <div className="sticky top-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase leading-4 text-muted-foreground">
          <Inbox className="size-4" aria-hidden="true" />
          Projects
        </div>
        <nav className="flex flex-col border-t border-border">
          <ProjectNavItem
            href="/dashboard"
            active={!selectedProjectId}
            title="All projects"
            typeLabel="Inbox"
            needsReplyCount={totalNeedsReply}
            activityCount={totalActivity}
          />
          {projectOptions.map((option) => (
            <ProjectNavItem
              key={option.project.id}
              href={option.href}
              active={selectedProjectId === option.project.id}
              title={option.project.title}
              typeLabel={option.project.projectType === "external" ? "External review" : statusLabel[option.project.status]}
              needsReplyCount={option.needsReplyCount}
              activityCount={option.activityCount}
              lastActivityAt={option.project.lastActivityAt}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function ProjectNavItem({
  href,
  active,
  title,
  typeLabel,
  needsReplyCount,
  activityCount,
  lastActivityAt,
}: {
  href: string;
  active: boolean;
  title: string;
  typeLabel: string;
  needsReplyCount: number;
  activityCount: number;
  lastActivityAt?: Date;
}) {
  return (
    <Link
      href={href as Route}
      className={`border-b border-border px-2 py-3 text-sm hover:bg-muted ${
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="line-clamp-2 font-semibold leading-5">{title}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] leading-[14px]">
        <span>{typeLabel}</span>
        {lastActivityAt ? (
          <>
            <span>·</span>
            <span>{formatShortDate(lastActivityAt)}</span>
          </>
        ) : null}
      </span>
      <span className="mt-2 flex flex-wrap gap-2 text-[11px] leading-[14px]">
        <span className={needsReplyCount > 0 ? "font-bold text-primary" : ""}>
          {needsReplyCount} needs reply
        </span>
        <span>{activityCount} acts</span>
      </span>
    </Link>
  );
}

function NeedsReplyFeedItem({ item }: { item: NeedsReplyItem }) {
  return (
    <article className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-border bg-card py-4">
      <div className="pt-1">
        <MessageSquareReply className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
          <span>답변 필요</span>
          <span>·</span>
          <span>{item.authorLabel}</span>
          <span>·</span>
          <span>{formatShortDate(item.createdAt)}</span>
        </div>
        <Link
          href={item.href as Route}
          className="mt-1 inline-flex max-w-full items-center gap-1 text-sm font-semibold leading-5 text-foreground hover:text-primary hover:underline"
        >
          <span className="truncate">{item.projectTitle}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
        <div className="mt-2 max-h-40 overflow-auto whitespace-pre-line border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">
          {item.body}
        </div>
      </div>
    </article>
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

function buildProjectOptions(data: WorkspaceData, allNeedsReply: NeedsReplyItem[]): ProjectOption[] {
  const allProjects = [...data.projects, ...data.externalReviews];
  const feed = buildFeed(data, null);

  return allProjects.map((project) => ({
    project,
    href: `/dashboard?project=${encodeURIComponent(project.id)}`,
    needsReplyCount: allNeedsReply.filter((item) => item.projectId === project.id).length,
    activityCount: feed.filter((item) => item.projectId === project.id).length,
  }));
}

function buildNeedsReply(data: WorkspaceData, selectedProjectId: string | null): NeedsReplyItem[] {
  const allProjects = [...data.projects, ...data.externalReviews];
  const projectById = new Map(allProjects.map((project) => [project.id, project]));
  const repliesByParent = groupReplies(data.feedback);

  return data.feedback
    .filter((entry) => {
      const project = projectById.get(entry.projectId);

      if (!project) {
        return false;
      }

      if (selectedProjectId && entry.projectId !== selectedProjectId) {
        return false;
      }

      if (entry.parentFeedbackId || entry.authorId === data.owner.id || entry.kind !== "feedback") {
        return false;
      }

      return !hasOwnerReplyAfter(entry.id, entry.createdAt, repliesByParent, data.owner.id);
    })
    .map((entry) => {
      const project = projectById.get(entry.projectId);

      return {
        id: entry.id,
        projectId: entry.projectId,
        createdAt: entry.createdAt,
        href: project ? `/p/${data.owner.handle}/${project.slug}#feedback-${entry.id}` : "/dashboard",
        projectTitle: project?.title ?? "Unknown project",
        authorLabel: entry.authorHandle ?? entry.authorName ?? "user",
        body: entry.body,
      };
    })
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

function buildFeed(data: WorkspaceData, selectedProjectId: string | null): FeedItem[] {
  const allProjects = [...data.projects, ...data.externalReviews];
  const visibleProjects = selectedProjectId
    ? allProjects.filter((project) => project.id === selectedProjectId)
    : allProjects;
  const projectById = new Map(allProjects.map((project) => [project.id, project]));
  const seenFeedbackIds = new Set<string>();

  const projectItems: FeedItem[] = visibleProjects.map((project) => ({
    type: "project",
    id: `project-${project.id}`,
    projectId: project.id,
    createdAt: project.createdAt,
    href: `/p/${data.owner.handle}/${project.slug}`,
    project,
  }));

  const receivedItems: FeedItem[] = data.feedback
    .filter((entry) => !selectedProjectId || entry.projectId === selectedProjectId)
    .map((entry) => {
      seenFeedbackIds.add(entry.id);
      const project = projectById.get(entry.projectId);
      const isMine = entry.authorId === data.owner.id;

      return {
        type: "feedback",
        id: `feedback-${entry.id}`,
        projectId: entry.projectId,
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
    .filter((entry) => !selectedProjectId || entry.projectId === selectedProjectId)
    .map((entry) => ({
      type: "feedback",
      id: `feedback-${entry.id}`,
      projectId: entry.projectId,
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

function groupReplies(feedback: ReceivedFeedback[]) {
  const map = new Map<string, ReceivedFeedback[]>();

  for (const entry of feedback) {
    if (!entry.parentFeedbackId) {
      continue;
    }

    const replies = map.get(entry.parentFeedbackId) ?? [];
    replies.push(entry);
    map.set(entry.parentFeedbackId, replies);
  }

  return map;
}

function hasOwnerReplyAfter(
  parentId: string,
  parentCreatedAt: Date,
  repliesByParent: Map<string, ReceivedFeedback[]>,
  ownerId: string,
) {
  const replies = repliesByParent.get(parentId) ?? [];

  for (const reply of replies) {
    if (reply.authorId === ownerId && reply.createdAt.getTime() >= parentCreatedAt.getTime()) {
      return true;
    }

    if (hasOwnerReplyAfter(reply.id, parentCreatedAt, repliesByParent, ownerId)) {
      return true;
    }
  }

  return false;
}

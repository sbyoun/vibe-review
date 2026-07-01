import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronUp,
  MessageSquareText,
  Pencil,
  Star,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { feedbackKindLabel, feedbackTypeLabel, formatShortDate } from "@/lib/domain";
import { getOptionalCurrentUser } from "@/server/current-user";
import { getFeedbackQueueData, getPublicProfileData } from "@/server/data";

export const dynamic = "force-dynamic";

type PublicProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProfileData(handle);

  return {
    title: data ? `${data.profile.name} · VibeReview` : "Profile",
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { handle } = await params;
  const data = await getPublicProfileData(handle);

  if (!data) {
    notFound();
  }

  const viewer = await getOptionalCurrentUser();
  const isOwner = viewer?.id === data.profile.id;
  const ownerData = isOwner ? await getFeedbackQueueData() : null;
  const projects = ownerData?.projects ?? data.projects;
  const externalReviews = ownerData?.externalReviews ?? data.externalReviews;
  const authoredFeedback = ownerData?.authoredFeedback ?? data.authoredFeedback;
  const favoriteProjects = data.favoriteProjects;
  const karma =
    data.profile.reputationScore + projects.length * 18 + authoredFeedback.length * 7;

  return (
    <>
      <SiteNav showSubmit={false} />
      <main className="mx-auto min-h-screen w-full max-w-[1100px] px-3 py-6 md:px-6">
        <section className="mb-6 rounded-sm border border-border bg-muted/60 p-4">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 border-b border-border pb-4 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold leading-7 text-foreground">
                  {data.profile.handle}
                </h1>
                {isOwner ? <Badge variant="outline">you</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Created {formatShortDate(data.profile.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5" aria-hidden="true" />
                  {karma} karma
                </span>
                {data.profile.name ? (
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {data.profile.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="text-sm leading-6 text-muted-foreground">
            {data.profile.bio ? (
              <p className="whitespace-pre-line">{data.profile.bio}</p>
            ) : (
              <p>Frontend developer, mostly building tools for other developers.</p>
            )}
          </div>
        </section>

        <nav className="mb-4 flex gap-4 border-b border-border">
          <span className="border-b-2 border-primary pb-2 text-base font-semibold leading-[22px] text-primary">
            Projects
          </span>
          <a
            href="#comments"
            className="border-b-2 border-transparent pb-2 text-base font-semibold leading-[22px] text-muted-foreground hover:text-primary"
          >
            Comments
          </a>
          <a
            href="#favorites"
            className="border-b-2 border-transparent pb-2 text-base font-semibold leading-[22px] text-muted-foreground hover:text-primary"
          >
            Favorites
          </a>
        </nav>

        <section className="space-y-4">
          {projects.map((project) => {
            const points = 100 + project.feedbackCount * 14 + project.implementedCount * 20;

            return (
              <article key={project.id} className="flex gap-2 group">
                <div className="pt-1 text-muted-foreground">
                  <ChevronUp className="size-4 group-hover:text-secondary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="mb-1 text-base font-semibold leading-[22px] text-foreground group-hover:text-primary">
                    <Link href={`/p/${data.profile.handle}/${project.slug}`}>
                      {project.title}
                    </Link>
                    <span className="ml-2 text-xs font-normal leading-4 text-muted-foreground">
                      ({projectHost(project.demoUrl ?? project.repoUrl) ?? data.profile.handle})
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
                    {project.categoryTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.categoryTags.length > 0 ? <span>•</span> : null}
                    <span>{points} points</span>
                    <span>•</span>
                    <span>
                      by{" "}
                      <Link href={`/p/${data.profile.handle}`} className="hover:underline">
                        {data.profile.handle}
                      </Link>
                    </span>
                    <span>•</span>
                    <span>{formatShortDate(project.lastActivityAt)}</span>
                    <span>•</span>
                    <Link
                      href={`/p/${data.profile.handle}/${project.slug}#comments`}
                      className="hover:underline"
                    >
                      {project.feedbackCount} comments
                    </Link>
                    {isOwner ? (
                      <>
                        <span>•</span>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                          edit
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {projects.length === 0 ? (
            <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
              No projects yet.
            </div>
          ) : null}
        </section>

        <section className="mt-10 border-t border-border pt-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold leading-[22px]">External Reviews</h2>
            <Badge variant="outline">{externalReviews.length}</Badge>
          </div>

          <div className="space-y-4">
            {externalReviews.map((project) => (
              <article key={project.id} className="flex gap-2 group">
                <div className="pt-1 text-muted-foreground">
                  <ChevronUp className="size-4 group-hover:text-secondary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="mb-1 text-base font-semibold leading-[22px] text-foreground group-hover:text-primary">
                    <Link href={`/p/${data.profile.handle}/${project.slug}`}>
                      {project.title}
                    </Link>
                    <span className="ml-2 text-xs font-normal leading-4 text-muted-foreground">
                      ({projectHost(project.sourceUrl ?? project.demoUrl ?? project.repoUrl) ?? "external"})
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
                    {project.categoryTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.categoryTags.length > 0 ? <span>•</span> : null}
                    <span>
                      owner{" "}
                      {project.externalOwnerUrl ? (
                        <a href={project.externalOwnerUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {project.externalOwnerName ?? projectHost(project.externalOwnerUrl) ?? "external"}
                        </a>
                      ) : (
                        <span>{project.externalOwnerName ?? "unclaimed external project"}</span>
                      )}
                    </span>
                    <span>•</span>
                    <span>reviewed by {data.profile.handle}</span>
                    <span>•</span>
                    <Link
                      href={`/p/${data.profile.handle}/${project.slug}#comments`}
                      className="hover:underline"
                    >
                      {project.feedbackCount} comments
                    </Link>
                    {isOwner ? (
                      <>
                        <span>•</span>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                          edit
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {externalReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No external reviews yet.</p>
            ) : null}
          </div>
        </section>

        <section id="comments" className="mt-10 border-t border-border pt-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold leading-[22px]">Comments</h2>
            <Badge variant="outline">{authoredFeedback.length}</Badge>
          </div>

          <div className="space-y-4">
            {authoredFeedback.map((entry) => (
              <article key={entry.id} className="flex gap-2">
                <div className="pt-1 text-muted-foreground">
                  <ChevronUp className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
                    <Link
                      href={`/p/${entry.ownerHandle}/${entry.projectSlug}#feedback-${entry.id}`}
                      className="font-bold text-foreground hover:underline"
                    >
                      {entry.projectTitle}
                    </Link>
                    <span>{formatShortDate(entry.createdAt)}</span>
                    {entry.kind === "feedback" ? (
                      <>
                        <span className="rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
                          [{feedbackTypeLabel[entry.feedbackType]}]
                        </span>
                        <span>{entry.rating ?? "-"} / 5</span>
                      </>
                    ) : (
                      <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {feedbackKindLabel[entry.kind]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line pl-6 text-sm leading-6 text-muted-foreground">
                    {entry.body}
                  </p>
                </div>
              </article>
            ))}
            {authoredFeedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : null}
          </div>
        </section>

        <section id="favorites" className="mt-10 border-t border-border pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Star className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="text-base font-semibold leading-[22px]">Favorites</h2>
            <Badge variant="outline">{favoriteProjects.length}</Badge>
          </div>

          <div className="space-y-4">
            {favoriteProjects.map((project) => (
              <article key={project.id} className="flex gap-2 group">
                <div className="pt-1 text-muted-foreground">
                  <Star className="size-4 fill-secondary text-secondary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="mb-1 text-base font-semibold leading-[22px] text-foreground group-hover:text-primary">
                    <Link href={`/p/${project.ownerHandle}/${project.slug}`}>
                      {project.title}
                    </Link>
                    <span className="ml-2 text-xs font-normal leading-4 text-muted-foreground">
                      ({projectHost(project.demoUrl ?? project.repoUrl) ?? project.ownerHandle})
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
                    <span>
                      by{" "}
                      <Link href={`/p/${project.ownerHandle}`} className="hover:underline">
                        {project.ownerHandle}
                      </Link>
                    </span>
                    <span>•</span>
                    <span>favorited {formatShortDate(project.favoritedAt)}</span>
                  </div>
                </div>
              </article>
            ))}
            {favoriteProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorites yet.</p>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function projectHost(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Settings,
  Star,
  X,
} from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import {
  formatShortDate,
  statusLabel,
} from "@/lib/domain";
import { getPublicProjectData } from "@/server/data";
import {
  approveExternalProjectOwnershipClaim,
  rejectExternalProjectOwnershipClaim,
  requestExternalProjectOwnershipClaim,
  toggleProjectFavorite,
  withdrawExternalProjectOwnershipClaim,
} from "@/server/actions";

import { FeedbackComposer } from "./feedback-composer";
import { FeedbackThread } from "./feedback-thread";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

type PublicProjectPageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicProjectPageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await getPublicProjectData(handle, slug);

  return {
    title: data ? `${data.project.title} · vibearchive` : "Project",
  };
}

export default async function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { handle, slug } = await params;
  const data = await getPublicProjectData(handle, slug);

  if (!data) {
    notFound();
  }

  const {
    profile,
    project,
    viewer,
    feedback,
    viewerHasFavorited,
    viewerOwnershipClaim,
    ownershipClaimRequests,
  } = data;
  const isOwner = viewer?.id === profile.id;
  const projectPath = `/p/${profile.handle}/${project.slug}`;
  const projectUrl = project.sourceUrl ?? project.repoUrl ?? project.demoUrl;
  const isExternal = project.projectType === "external";
  const canStartClaim = isExternal && !project.claimedById && viewer?.id !== project.ownerId;
  const publicFeedback = feedback.filter((entry) => entry.visibility === "public" && entry.kind === "feedback");
  const externalOwnerLabel =
    project.externalOwnerName ??
    projectHost(project.externalOwnerUrl ?? project.sourceUrl) ??
    "unclaimed external project";

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-8 px-3 py-8 md:flex-row md:px-6">
        <div className="flex flex-1 flex-col gap-8">
          <section className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <div className="mt-1 flex flex-col items-center">
                <ChevronUp className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold leading-7 text-foreground">
                      {project.title}
                    </h1>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs leading-4 text-muted-foreground">
                      <span>{project.feedbackCount} comments</span>
                      <span>|</span>
                      <span>{project.favoriteCount} favorites</span>
                      <span>|</span>
                      <span>
                        {isExternal ? "owner " : "by "}
                        {isExternal && project.externalOwnerUrl ? (
                          <a href={project.externalOwnerUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {externalOwnerLabel}
                          </a>
                        ) : isExternal ? (
                          <span>{externalOwnerLabel}</span>
                        ) : (
                          <Link href={`/p/${profile.handle}`} className="hover:underline">
                            {profile.handle}
                          </Link>
                        )}
                      </span>
                      {isExternal ? (
                        <>
                          <span>|</span>
                          <span>
                            reviewed by{" "}
                            <Link href={`/p/${profile.handle}`} className="hover:underline">
                              {profile.handle}
                            </Link>
                          </span>
                        </>
                      ) : null}
                      <span>|</span>
                      <span>{formatShortDate(project.createdAt)}</span>
                      {projectUrl ? (
                        <>
                          <span>|</span>
                          <a href={projectUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {projectHost(projectUrl)}
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewer ? (
                      <form action={toggleProjectFavorite}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <Button type="submit" variant="outline" size="sm">
                          <Star
                            className={`size-4 ${viewerHasFavorited ? "fill-secondary text-secondary" : ""}`}
                            aria-hidden="true"
                          />
                          {viewerHasFavorited ? "Favorited" : "Favorite"}
                        </Button>
                      </form>
                    ) : (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href="/login">
                          <Star className="size-4" aria-hidden="true" />
                          Favorite
                        </Link>
                      </Button>
                    )}
                    {isOwner ? (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <Settings className="size-4" aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                    ) : null}
                    {canStartClaim ? (
                      viewerOwnershipClaim ? (
                        <form action={withdrawExternalProjectOwnershipClaim}>
                          <input type="hidden" name="claimId" value={viewerOwnershipClaim.id} />
                          <input type="hidden" name="returnTo" value={projectPath} />
                          <Button type="submit" size="sm" variant="outline">
                            <X className="size-4" aria-hidden="true" />
                            Withdraw claim
                          </Button>
                        </form>
                      ) : viewer ? (
                        <form action={requestExternalProjectOwnershipClaim}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="returnTo" value={projectPath} />
                          <Button type="submit" size="sm">
                            <BadgeCheck className="size-4" aria-hidden="true" />
                            Request claim
                          </Button>
                        </form>
                      ) : (
                        <Button type="button" size="sm" asChild>
                          <Link href={`/login?next=${encodeURIComponent(projectPath)}`}>
                            <BadgeCheck className="size-4" aria-hidden="true" />
                            Request claim
                          </Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {project.coverImageUrl ? (
              <div className="mt-4 pl-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.coverImageUrl}
                  alt=""
                  className="aspect-video w-full max-w-3xl border border-border bg-muted object-cover"
                />
              </div>
            ) : null}

            <div className="vc-markdown mt-4 max-w-3xl pl-8">
              <MarkdownContent>{project.description ?? project.summary}</MarkdownContent>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 pl-8">
              {project.repoUrl ? (
                <Button type="button" size="sm" asChild>
                  <a href={project.repoUrl} target="_blank" rel="noreferrer">
                    <GitBranch className="size-4" aria-hidden="true" />
                    View Repository
                  </a>
                </Button>
              ) : null}
              {project.demoUrl ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={project.demoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Live Demo
                  </a>
                </Button>
              ) : null}
            </div>
          </section>

          <section className="pl-8">
            <FeedbackComposer
              projectId={project.id}
              viewerName={viewer ? viewer.name ?? `@${viewer.handle}` : null}
              isOwner={isOwner}
              loginRequired={!viewer}
              returnTo={`${projectPath}#feedback-composer`}
            />
          </section>

          <section id="comments" className="flex flex-col gap-6 pl-8">
            <FeedbackThread feedback={feedback} viewerId={viewer?.id ?? null} isOwner={isOwner} />
          </section>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-6 md:w-64">
          <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-base font-semibold leading-[22px]">
              Project Info
            </h3>
            <dl className="flex flex-col gap-3 text-xs leading-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{statusLabel[project.status]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{isExternal ? "External review" : "Owned project"}</dd>
              </div>
              {isExternal ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Claimed</dt>
                  <dd>{project.claimedById ? "yes" : "no"}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Visibility</dt>
                <dd className="font-mono rounded-sm border border-border bg-muted px-1">
                  {project.visibility}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatShortDate(project.updatedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Feedback</dt>
                <dd>{feedback.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Favorites</dt>
                <dd>{project.favoriteCount}</dd>
              </div>
            </dl>
            {canStartClaim ? (
              <div className="border-t border-border pt-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  Own this project? Request ownership transfer. The current reviewer must approve before this post moves to your profile.
                </p>
                {viewerOwnershipClaim ? (
                  <form action={withdrawExternalProjectOwnershipClaim} className="mt-3">
                    <input type="hidden" name="claimId" value={viewerOwnershipClaim.id} />
                    <input type="hidden" name="returnTo" value={projectPath} />
                    <Button type="submit" size="sm" variant="outline" className="w-full">
                      <X className="size-4" aria-hidden="true" />
                      Withdraw claim
                    </Button>
                  </form>
                ) : viewer ? (
                  <form action={requestExternalProjectOwnershipClaim} className="mt-3">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="returnTo" value={projectPath} />
                    <Button type="submit" size="sm" className="w-full">
                      <BadgeCheck className="size-4" aria-hidden="true" />
                      Request claim
                    </Button>
                  </form>
                ) : (
                  <Button type="button" size="sm" className="mt-3 w-full" asChild>
                    <Link href={`/login?next=${encodeURIComponent(projectPath)}`}>
                      <BadgeCheck className="size-4" aria-hidden="true" />
                      Log in to request
                    </Link>
                  </Button>
                )}
              </div>
            ) : null}
            {ownershipClaimRequests.length > 0 ? (
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-semibold leading-4 text-foreground">
                  Ownership Requests
                </h4>
                <div className="mt-3 flex flex-col gap-3">
                  {ownershipClaimRequests.map((claim) => (
                    <div key={claim.id} className="border border-border bg-muted p-3">
                      <p className="text-xs leading-5 text-muted-foreground">
                        @{claim.claimantHandle ?? claim.claimantName ?? "user"} requested ownership on{" "}
                        {formatShortDate(claim.createdAt)}.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <form action={approveExternalProjectOwnershipClaim}>
                          <input type="hidden" name="claimId" value={claim.id} />
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectExternalProjectOwnershipClaim}>
                          <input type="hidden" name="claimId" value={claim.id} />
                          <input type="hidden" name="returnTo" value={projectPath} />
                          <Button type="submit" size="sm" variant="outline">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-base font-semibold leading-[22px]">
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {(project.categoryTags.length > 0 ? project.categoryTags : ["uncategorized"]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-border bg-muted px-2 py-1 text-[11px] font-medium leading-[14px] text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-base font-semibold leading-[22px]">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {(project.tools.length > 0 ? project.tools : [statusLabel[project.status]]).map((tool) => (
                <span
                  key={tool}
                  className="rounded-sm border border-border bg-muted px-2 py-1 text-[11px] font-medium leading-[14px] text-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-base font-semibold leading-[22px]">
              Vibed By
            </h3>
            <ul className="flex flex-col gap-2 text-xs leading-4">
              {publicFeedback.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#feedback-${entry.id}`}
                    className="-mx-1 flex justify-between rounded-sm p-1 hover:bg-muted"
                  >
                    <span className="text-foreground">{entry.authorName ?? "User"}</span>
                    <span className="text-muted-foreground">{entry.rating ?? 0}.0</span>
                  </a>
                </li>
              ))}
              {publicFeedback.length === 0 ? (
                <li className="text-muted-foreground">No vibes yet.</li>
              ) : null}
            </ul>
            {publicFeedback.length > 4 ? (
              <a href="#comments" className="text-[11px] font-medium leading-[14px] text-primary hover:underline">
                View all {publicFeedback.length} vibes...
              </a>
            ) : null}
          </div>
        </aside>
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

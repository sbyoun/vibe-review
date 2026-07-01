import Link from "next/link";
import type { Route } from "next";
import { ChevronUp, Compass, MessageSquareText } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { formatShortDate, statusLabel } from "@/lib/domain";
import { getDiscoverData } from "@/server/data";

export const dynamic = "force-dynamic";

const discoverSortKeys = ["updated", "title", "owner", "status", "feedback"] as const;
type DiscoverSortKey = (typeof discoverSortKeys)[number];
type SortOrder = "asc" | "desc";

const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

type DiscoverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const sort = coerceSortKey(readSearchParam(params, "sort"));
  const order = coerceSortOrder(readSearchParam(params, "order"), sort);
  const data = await getDiscoverData();
  const projects = [...data.projects].sort((left, right) =>
    compareDiscoverRows(left, right, sort, order),
  );

  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1100px] px-3 py-6 md:px-6">
          <header className="mb-4 border-b border-border pb-1">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold leading-7 text-foreground">Show Vibe Project</h1>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  Community projects, experiments, and tools.
                </p>
              </div>
              <div className="hidden gap-2 text-[11px] font-medium leading-[14px] text-muted-foreground md:flex">
                <span>Sorted by:</span>
                <SortMode label="Hot" active />
                <SortMode label="Recent" href="/discover?sort=updated&order=desc" />
                <SortMode label="Top" href="/discover?sort=feedback&order=desc" />
              </div>
            </div>
          </header>

          {projects.length > 0 ? (
            <div>
              <div className="hidden grid-cols-[48px_minmax(0,1fr)_100px_100px] gap-4 border-b border-border px-2 py-2 text-[11px] font-medium leading-[14px] text-muted-foreground md:grid">
                <span className="text-center">Rank</span>
                <SortHeader
                  label="Project"
                  sortKey="title"
                  currentSort={sort}
                  order={order}
                  align="start"
                />
                <SortHeader label="Discuss" sortKey="feedback" currentSort={sort} order={order} />
                <span className="text-right">Favorites</span>
              </div>

              <div className="flex flex-col">
                {projects.map(({ project, owner }, index) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 border-b border-border px-1 py-2 md:grid-cols-[48px_minmax(0,1fr)_100px_100px] md:gap-4 md:px-2"
                  >
                    <div className="flex flex-col items-center pt-1">
                      <span className="mb-1 text-xs leading-4 text-muted-foreground">
                        {index + 1}.
                      </span>
                      <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>

                    <Link
                      href={`/p/${owner.handle}/${project.slug}`}
                      className={
                        project.coverImageUrl
                          ? "grid min-w-0 gap-3 px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[96px_minmax(0,1fr)] md:px-0"
                          : "min-w-0 px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:px-0"
                      }
                    >
                      {project.coverImageUrl ? (
                        <div className="relative hidden aspect-[4/3] overflow-hidden border border-border bg-muted sm:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={project.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="mb-0.5 flex min-w-0 flex-wrap items-baseline gap-1">
                          <span className="truncate text-base font-semibold leading-[22px] text-foreground hover:text-primary">
                            {project.title}
                          </span>
                          <span className="whitespace-nowrap rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-[14px] text-muted-foreground">
                            {project.projectType === "external" ? "external review" : "project"}
                          </span>
                          <span className="whitespace-nowrap rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-[14px] text-muted-foreground">
                            {projectHost(project.sourceUrl ?? project.demoUrl ?? project.repoUrl) ?? `@${owner.handle}`}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-4 text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-1">
                            {project.categoryTags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tag} className="contents">
                                {tagIndex > 0 ? <span className="text-border">•</span> : null}
                                <span className="font-medium text-foreground">{tag}</span>
                              </span>
                            ))}
                            {project.categoryTags.length > 0 && project.tools.length > 0 ? (
                              <span className="text-border">•</span>
                            ) : null}
                            {project.tools.slice(0, 3).map((tool, toolIndex) => (
                              <span key={tool} className="contents">
                                {toolIndex > 0 ? <span className="text-border">•</span> : null}
                                <span className="font-medium text-primary">{tool}</span>
                              </span>
                            ))}
                            {project.tools.length === 0 ? (
                              <span className="font-medium text-primary">
                                {statusLabel[project.status]}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {project.projectType === "external" ? (
                              <>
                                <span>
                                  owner{" "}
                                  <span className="text-foreground">
                                    {project.externalOwnerName ??
                                      projectHost(project.externalOwnerUrl ?? project.sourceUrl) ??
                                      "unclaimed"}
                                  </span>
                                </span>
                                <span className="text-border">•</span>
                                <span>
                                  reviewed by{" "}
                                  <span className="text-foreground hover:underline">
                                    {owner.handle ?? owner.name ?? "user"}
                                  </span>
                                </span>
                              </>
                            ) : (
                              <span>
                                by{" "}
                                <span className="text-foreground hover:underline">
                                  {owner.handle ?? owner.name ?? "user"}
                                </span>
                              </span>
                            )}
                            <span className="text-border">•</span>
                            <span>{formatShortDate(project.lastActivityAt)}</span>
                          </div>
                          <span className="md:hidden">
                            {project.feedbackCount} comments · {project.favoriteCount} favorites
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="hidden flex-col items-end justify-center md:flex">
                      <Link
                        href={`/p/${owner.handle}/${project.slug}#comments`}
                        className="text-base font-semibold leading-[22px] text-foreground hover:text-primary hover:underline"
                      >
                        {project.feedbackCount}
                      </Link>
                      <span className="text-[11px] leading-[14px] text-muted-foreground">
                        comments
                      </span>
                    </div>
                    <div className="hidden flex-col items-end justify-center md:flex">
                      <span className="text-base font-semibold leading-[22px] text-foreground">
                        {project.favoriteCount}
                      </span>
                      <span className="text-[11px] leading-[14px] text-muted-foreground">
                        favorites
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="vc-panel p-6">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold">아직 공개 프로젝트가 없습니다</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                프로젝트를 public으로 올리면 게시판에 바로 표시됩니다.
              </p>
              <Button type="button" size="sm" className="mt-4" asChild>
                <Link href="/projects/new">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                  첫 글 올리기
                </Link>
              </Button>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SortMode({ label, href, active = false }: { label: string; href?: Route; active?: boolean }) {
  if (active || !href) {
    return <span className="font-bold text-primary">{label}</span>;
  }

  return (
    <Link href={href} className="hover:text-primary">
      {label}
    </Link>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSort,
  order,
  align = "end",
}: {
  label: string;
  sortKey: DiscoverSortKey;
  currentSort: DiscoverSortKey;
  order: SortOrder;
  align?: "start" | "end";
}) {
  const isActive = currentSort === sortKey;
  const nextOrder = isActive && order === "asc" ? "desc" : "asc";
  const indicator = isActive ? (order === "asc" ? "↑" : "↓") : "";

  return (
    <Link
      href={`/discover?sort=${sortKey}&order=${nextOrder}`}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        align === "start" ? "justify-start" : "justify-end"
      }`}
    >
      {label}
      {indicator ? <span aria-hidden="true">{indicator}</span> : null}
    </Link>
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

function compareDiscoverRows(
  left: Awaited<ReturnType<typeof getDiscoverData>>["projects"][number],
  right: Awaited<ReturnType<typeof getDiscoverData>>["projects"][number],
  sort: DiscoverSortKey,
  order: SortOrder,
) {
  const direction = order === "asc" ? 1 : -1;
  let value = 0;

  if (sort === "title") {
    value = collator.compare(left.project.title, right.project.title);
  } else if (sort === "owner") {
    value = collator.compare(projectOwnerLabel(left), projectOwnerLabel(right));
  } else if (sort === "status") {
    value = collator.compare(statusLabel[left.project.status], statusLabel[right.project.status]);
  } else if (sort === "feedback") {
    value = left.project.feedbackCount - right.project.feedbackCount;
  } else {
    value = left.project.updatedAt.getTime() - right.project.updatedAt.getTime();
  }

  if (value === 0) {
    value = left.project.createdAt.getTime() - right.project.createdAt.getTime();
  }

  return value * direction;
}

function projectOwnerLabel(row: Awaited<ReturnType<typeof getDiscoverData>>["projects"][number]) {
  if (row.project.projectType === "external") {
    return (
      row.project.externalOwnerName ??
      projectHost(row.project.externalOwnerUrl ?? row.project.sourceUrl) ??
      ""
    );
  }

  return row.owner.handle ?? row.owner.name ?? "";
}

function readSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function coerceSortKey(value: string | undefined): DiscoverSortKey {
  return discoverSortKeys.includes(value as DiscoverSortKey)
    ? (value as DiscoverSortKey)
    : "updated";
}

function coerceSortOrder(value: string | undefined, sort: DiscoverSortKey): SortOrder {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return sort === "updated" || sort === "feedback" ? "desc" : "asc";
}

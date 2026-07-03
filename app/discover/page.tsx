import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Bot, ChevronUp, Compass, MessageSquareText } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { formatShortDate, statusLabel } from "@/lib/domain";
import { getDiscoverData } from "@/server/data";

export const dynamic = "force-dynamic";

const discoverSortKeys = ["recent", "hot", "title"] as const;
type DiscoverSortKey = (typeof discoverSortKeys)[number];
type SortOrder = "asc" | "desc";

const discoverPageSize = 10;
const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

type DiscoverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const sort = coerceSortKey(readSearchParam(params, "sort"));
  const order = coerceSortOrder(readSearchParam(params, "order"), sort);
  const requestedPage = coercePage(readSearchParam(params, "page"));
  const data = await getDiscoverData();
  const projects = [...data.projects].sort((left, right) =>
    compareDiscoverRows(left, right, sort, order),
  );
  const totalPages = Math.max(1, Math.ceil(projects.length / discoverPageSize));
  const page = Math.min(requestedPage, totalPages);
  const pageStart = (page - 1) * discoverPageSize;
  const visibleProjects = projects.slice(pageStart, pageStart + discoverPageSize);
  const paginationPages = getPaginationPages(page, totalPages);

  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1100px] px-3 py-6 md:px-6">
          <header className="mb-4 border-b border-border pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold leading-5 text-foreground">
                  <Bot className="size-4 text-primary" aria-hidden="true" />
                  <span>코딩 에이전트로 vibearchive를 바로 사용하세요</span>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                  MCP로 공개 프로젝트를 찾고, 글을 등록하고, 피드백을 읽고 남길 수 있습니다.
                  코딩 에이전트에게 한 번만 던질 단일 프롬프트를 준비해두었습니다.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2" asChild>
                  <Link href={"/mcp-agent-guide" as Route}>
                    단일 에이전트 프롬프트
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="hidden gap-2 text-[11px] font-medium leading-[14px] text-muted-foreground md:flex">
                <span>Sorted by:</span>
                <SortMode
                  label="Recent"
                  href={discoverHref({ sort: "recent", order: "desc", page: 1 })}
                  active={sort === "recent"}
                />
                <SortMode
                  label="Hot"
                  href={discoverHref({ sort: "hot", order: "desc", page: 1 })}
                  active={sort === "hot"}
                />
              </div>
            </div>
          </header>

          {projects.length > 0 ? (
            <div>
              <div className="flex items-center justify-between border-b border-border px-2 py-2 text-[11px] font-medium leading-[14px] text-muted-foreground">
                <span>
                  {pageStart + 1}-{Math.min(pageStart + discoverPageSize, projects.length)} of{" "}
                  {projects.length} projects
                </span>
                <span>
                  Page {page} / {totalPages}
                </span>
              </div>

              <div className="hidden grid-cols-[48px_minmax(0,1fr)_100px] gap-4 border-b border-border px-2 py-2 text-[11px] font-medium leading-[14px] text-muted-foreground md:grid">
                <span className="text-center">Rank</span>
                <SortHeader
                  label="Project"
                  sortKey="title"
                  currentSort={sort}
                  order={order}
                  align="start"
                />
                <SortHeader label="Discuss" sortKey="hot" currentSort={sort} order={order} />
              </div>

              <div className="flex flex-col">
                {visibleProjects.map(({ project, owner }, index) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 border-b border-border px-1 py-2 md:grid-cols-[48px_minmax(0,1fr)_100px] md:gap-4 md:px-2"
                  >
                    <div className="flex flex-col items-center pt-1">
                      <span className="mb-1 text-xs leading-4 text-muted-foreground">
                        {pageStart + index + 1}.
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
                            <span>{formatShortDate(project.createdAt)}</span>
                          </div>
                          <span className="md:hidden">
                            {project.feedbackCount} comments
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
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <nav
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs leading-4"
                  aria-label="Discover pagination"
                >
                  {page > 1 ? (
                    <Link
                      href={discoverHref({ sort, order, page: page - 1 })}
                      className="border border-border px-3 py-2 font-medium text-foreground hover:bg-muted"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="border border-border px-3 py-2 font-medium text-muted-foreground">
                      Previous
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1">
                    {paginationPages.map((pageNumber, index) => (
                      <span key={pageNumber} className="contents">
                        {index > 0 && pageNumber - paginationPages[index - 1] > 1 ? (
                          <span className="px-2 text-muted-foreground">...</span>
                        ) : null}
                        {pageNumber === page ? (
                          <span className="border border-primary bg-primary px-3 py-2 font-semibold text-primary-foreground">
                            {pageNumber}
                          </span>
                        ) : (
                          <Link
                            href={discoverHref({ sort, order, page: pageNumber })}
                            className="border border-border px-3 py-2 font-medium text-foreground hover:bg-muted"
                          >
                            {pageNumber}
                          </Link>
                        )}
                      </span>
                    ))}
                  </div>

                  {page < totalPages ? (
                    <Link
                      href={discoverHref({ sort, order, page: page + 1 })}
                      className="border border-border px-3 py-2 font-medium text-foreground hover:bg-muted"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="border border-border px-3 py-2 font-medium text-muted-foreground">
                      Next
                    </span>
                  )}
                </nav>
              ) : null}
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
      href={discoverHref({ sort: sortKey, order: nextOrder, page: 1 })}
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
  } else if (sort === "hot") {
    value = left.project.feedbackCount - right.project.feedbackCount;
  } else {
    value = left.project.createdAt.getTime() - right.project.createdAt.getTime();
  }

  if (value === 0) {
    value = left.project.createdAt.getTime() - right.project.createdAt.getTime();
  }

  return value * direction;
}

function readSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function coerceSortKey(value: string | undefined): DiscoverSortKey {
  if (value === "updated") {
    return "recent";
  }

  if (value === "feedback") {
    return "hot";
  }

  return discoverSortKeys.includes(value as DiscoverSortKey)
    ? (value as DiscoverSortKey)
    : "recent";
}

function coerceSortOrder(value: string | undefined, sort: DiscoverSortKey): SortOrder {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return sort === "recent" || sort === "hot" ? "desc" : "asc";
}

function coercePage(value: string | undefined) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function discoverHref({
  sort,
  order,
  page,
}: {
  sort: DiscoverSortKey;
  order: SortOrder;
  page: number;
}) {
  const params = new URLSearchParams({
    sort,
    order,
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  return `/discover?${params.toString()}` as Route;
}

function getPaginationPages(page: number, totalPages: number) {
  const pages = new Set([1, totalPages]);

  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate >= 1 && candidate <= totalPages) {
      pages.add(candidate);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

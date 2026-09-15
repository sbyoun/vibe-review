import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, users } from "@/db/schema";

export const revalidate = 3600;

// 고정 페이지의 마지막 수정일. **페이지 내용을 고칠 때 함께 올린다.**
// 예전에는 요청 시각(new Date())을 썼다. 그러면 서버가 다시 뜰 때마다 모든 URL이 "변경"으로
// 잡혀 IndexNow에 매번 나가고(9/8·9/15 각각 7건), 크롤러도 lastmod를 신뢰하지 않게 된다.
// 초기값은 해당 페이지들의 마지막 커밋일이다 (2026-09-15 확인).
const STATIC_LAST_MODIFIED = "2026-07-03";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/privacy`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/mcp-agent-guide`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.4 },
  ];
  const discoverRoute = (lastModified: Date | string): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}/discover`,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  });

  try {
    const publicProjects = await db
      .select({
        slug: projects.slug,
        updatedAt: projects.updatedAt,
        lastActivityAt: projects.lastActivityAt,
        ownerHandle: users.handle,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.visibility, "public"));

    const activityOf = (project: { lastActivityAt: Date | null; updatedAt: Date | null }) =>
      project.lastActivityAt ?? project.updatedAt ?? null;

    const projectRoutes = publicProjects
      .filter((project) => project.ownerHandle)
      .map((project) => ({
        url: `${baseUrl}/p/${encodeURIComponent(project.ownerHandle!)}/${encodeURIComponent(project.slug)}`,
        lastModified: activityOf(project) ?? STATIC_LAST_MODIFIED,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    // 프로필은 그 사람의 공개 프로젝트 중 마지막 활동, 목록(/discover)은 전체 중 마지막 활동으로 잡는다.
    const latestByHandle = new Map<string, Date>();
    let latest: Date | null = null;
    for (const project of publicProjects) {
      const at = activityOf(project);
      if (!at) continue;
      if (!latest || at > latest) latest = at;
      const handle = project.ownerHandle;
      if (!handle) continue;
      const current = latestByHandle.get(handle);
      if (!current || at > current) latestByHandle.set(handle, at);
    }

    const profileRoutes = [...latestByHandle].map(([handle, lastModified]) => ({
      url: `${baseUrl}/p/${encodeURIComponent(handle)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [discoverRoute(latest ?? STATIC_LAST_MODIFIED), ...staticRoutes, ...profileRoutes, ...projectRoutes];
  } catch (error) {
    console.warn("[sitemap] Failed to load public project routes:", error);
    return [discoverRoute(STATIC_LAST_MODIFIED), ...staticRoutes];
  }
}

function getSiteUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vibe.foldalpha.com")
  ).replace(/\/$/, "");
}

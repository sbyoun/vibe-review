import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, users } from "@/db/schema";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/discover`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/mcp-agent-guide`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
  ];

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

    const projectRoutes = publicProjects
      .filter((project) => project.ownerHandle)
      .map((project) => ({
        url: `${baseUrl}/p/${encodeURIComponent(project.ownerHandle!)}/${encodeURIComponent(project.slug)}`,
        lastModified: project.lastActivityAt ?? project.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));

    const profileHandles = Array.from(
      new Set(publicProjects.map((project) => project.ownerHandle).filter(Boolean)),
    );
    const profileRoutes = profileHandles.map((handle) => ({
      url: `${baseUrl}/p/${encodeURIComponent(handle!)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...profileRoutes, ...projectRoutes];
  } catch (error) {
    console.warn("[sitemap] Failed to load public project routes:", error);
    return staticRoutes;
  }
}

function getSiteUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vibe.foldalpha.com")
  ).replace(/\/$/, "");
}

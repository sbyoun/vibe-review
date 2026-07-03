import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  feedback,
  projectFavorites,
  projectOwnershipClaims,
  projectRevisions,
  projectStatusEvents,
  projects,
  users,
} from "@/db/schema";
import {
  feedbackKinds,
  feedbackTypes,
  feedbackVisibilities,
  projectTypes,
  projectStatuses,
  projectVisibilities,
  slugifyProjectTitle,
  type FeedbackKind,
  type FeedbackType,
  type FeedbackVisibility,
  type ProjectType,
  type ProjectVisibility,
} from "@/lib/domain";
import { ApiError, type McpUser } from "@/server/mcp-api";
import {
  approveExternalProjectOwnershipClaimForUser,
  rejectExternalProjectOwnershipClaimForUser,
  requestExternalProjectOwnershipForUser,
  withdrawExternalProjectOwnershipClaimForUser,
} from "@/server/project-claims";
import { projectRevisionValues } from "@/server/project-revisions";

const maxThumbnailBytes = 5 * 1024 * 1024;
const maxThumbnailBase64Chars = Math.ceil((maxThumbnailBytes * 4) / 3) + 128;
const uploadRootDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
const thumbnailUploadDir = path.join(uploadRootDir, "project-covers");
const thumbnailPublicPath = "/uploads/project-covers";
const thumbnailMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const publicProjectListSortKeys = ["updated", "title", "owner", "status", "feedback", "favorites"] as const;
const publicProjectListOrderKeys = ["asc", "desc"] as const;
const publicProjectListCollator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
const thumbnailExtensions = new Map<(typeof thumbnailMimeTypes)[number], string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((value) => (value && value.length > 0 ? value : undefined));

const nullableTextPatch = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value && value.length > 0 ? value : null;
  });

const nullableUrlPatch = z
  .string()
  .trim()
  .url()
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value && value.length > 0 ? value : null;
  });

const optionalBase64 = z
  .string()
  .trim()
  .max(maxThumbnailBase64Chars)
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalListFilter = z
  .string()
  .trim()
  .max(160)
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const mcpImageInputSchema = z.object({
  url: z.string().trim().url(),
  alt: z.string().trim().max(160).optional().nullable(),
});

export const createMcpProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  description: optionalText,
  projectType: z.enum(projectTypes).default("owned"),
  externalOwnerName: z.string().trim().min(1).max(160).optional().nullable(),
  externalOwnerUrl: optionalUrl,
  sourceUrl: optionalUrl,
  status: z.enum(projectStatuses).default("idea"),
  visibility: z.enum(projectVisibilities).default("public"),
  demoUrl: optionalUrl,
  repoUrl: optionalUrl,
  thumbnailUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  thumbnailBase64: optionalBase64,
  thumbnailMimeType: z.enum(thumbnailMimeTypes).optional(),
  images: z.array(mcpImageInputSchema).max(8).default([]),
  tools: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  categoryTags: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  feedbackFocus: z.array(z.enum(feedbackTypes)).max(8).default(["first_impression", "ux_ui"]),
});

export const updateMcpProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().min(1).max(500).optional(),
    description: nullableTextPatch,
    projectType: z.enum(projectTypes).optional(),
    externalOwnerName: nullableTextPatch,
    externalOwnerUrl: nullableUrlPatch,
    sourceUrl: nullableUrlPatch,
    status: z.enum(projectStatuses).optional(),
    visibility: z.enum(projectVisibilities).optional(),
    demoUrl: nullableUrlPatch,
    repoUrl: nullableUrlPatch,
    thumbnailUrl: nullableUrlPatch,
    coverImageUrl: nullableUrlPatch,
    thumbnailBase64: optionalBase64,
    thumbnailMimeType: z.enum(thumbnailMimeTypes).optional(),
    images: z.array(mcpImageInputSchema).max(8).optional(),
    tools: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    categoryTags: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    feedbackFocus: z.array(z.enum(feedbackTypes)).max(8).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one project field is required.",
  });

export const createMcpFeedbackSchema = z.object({
  projectId: z.string().trim().uuid(),
  parentFeedbackId: z
    .string()
    .trim()
    .uuid()
    .optional()
    .nullable()
    .transform((value) => value ?? undefined),
  body: z.string().trim().min(1).max(2000),
  feedbackType: z.enum(feedbackTypes).default("first_impression"),
  rating: z.number().int().min(1).max(5).default(4),
  visibility: z.enum(feedbackVisibilities).optional(),
  kind: z.enum(feedbackKinds).optional(),
});

export const updateMcpFeedbackSchema = z
  .object({
    feedbackId: z.string().trim().uuid(),
    body: z.string().trim().min(1).max(2000).optional(),
    feedbackType: z.enum(feedbackTypes).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    visibility: z.enum(feedbackVisibilities).optional(),
    kind: z.enum(feedbackKinds).optional(),
  })
  .refine((value) => Object.entries(value).some(([key, field]) => key !== "feedbackId" && field !== undefined), {
    message: "At least one feedback field is required.",
  });

export const deleteMcpFeedbackSchema = z.object({
  feedbackId: z.string().trim().uuid(),
});

export const listMcpProjectRevisionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
});

export const getPublicMcpProjectSchema = z
  .object({
    projectId: z.string().trim().uuid().optional(),
    handle: z.string().trim().min(1).max(80).optional(),
    slug: z.string().trim().min(1).max(240).optional(),
  })
  .refine((value) => value.projectId || (value.handle && value.slug), {
    message: "Pass projectId, or pass handle and slug together.",
  });

export const listPublicMcpProjectsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(10000).default(0),
  sort: z.enum(publicProjectListSortKeys).default("updated"),
  order: z.enum(publicProjectListOrderKeys).optional(),
  query: optionalListFilter,
  tag: optionalListFilter,
  tool: optionalListFilter,
});

export const mcpOwnershipClaimIdSchema = z.object({
  claimId: z.string().trim().uuid(),
});

export async function listMcpProjects(owner: McpUser) {
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, owner.id))
    .orderBy(desc(projects.lastActivityAt), asc(projects.title));

  const projectIds = projectRows.map((project) => project.id);
  const feedbackRows =
    projectIds.length > 0
      ? await db
          .select({
            id: feedback.id,
            projectId: feedback.projectId,
            implementedStatus: feedback.implementedStatus,
          })
          .from(feedback)
          .where(inArray(feedback.projectId, projectIds))
      : [];

  return projectRows.map((project) =>
    serializeProject(
      project,
      feedbackRows.filter((entry) => entry.projectId === project.id),
      owner.handle,
    ),
  );
}

export async function getMcpProject(owner: McpUser, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  const feedbackRows = await db
    .select({
      id: feedback.id,
      projectId: feedback.projectId,
      requestId: feedback.requestId,
      parentFeedbackId: feedback.parentFeedbackId,
      authorId: feedback.authorId,
      feedbackType: feedback.feedbackType,
      body: feedback.body,
      rating: feedback.rating,
      helpfulStatus: feedback.helpfulStatus,
      implementedStatus: feedback.implementedStatus,
      visibility: feedback.visibility,
      kind: feedback.kind,
      createdAt: feedback.createdAt,
      authorName: users.name,
      authorHandle: users.handle,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .where(eq(feedback.projectId, project.id))
    .orderBy(desc(feedback.createdAt));

  return {
    project: serializeProject(project, feedbackRows, owner.handle),
    feedback: feedbackRows.map(serializeFeedback),
  };
}

export async function getPublicMcpProject(input: z.output<typeof getPublicMcpProjectSchema>) {
  const conditions = [eq(projects.visibility, "public")];

  if (input.projectId) {
    conditions.push(eq(projects.id, input.projectId));
  } else if (input.handle && input.slug) {
    conditions.push(inArray(users.handle, routeParamCandidates(input.handle, { lowercase: true })));
    conditions.push(inArray(projects.slug, routeParamCandidates(input.slug, { lowercase: true })));
  }

  const [row] = await db
    .select({
      project: projects,
      owner: users,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(...conditions))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "public_project_not_found", "Public project was not found.");
  }

  const feedbackRows = await db
    .select({
      id: feedback.id,
      projectId: feedback.projectId,
      requestId: feedback.requestId,
      parentFeedbackId: feedback.parentFeedbackId,
      authorId: feedback.authorId,
      feedbackType: feedback.feedbackType,
      body: feedback.body,
      rating: feedback.rating,
      helpfulStatus: feedback.helpfulStatus,
      implementedStatus: feedback.implementedStatus,
      visibility: feedback.visibility,
      kind: feedback.kind,
      createdAt: feedback.createdAt,
      authorName: users.name,
      authorHandle: users.handle,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .where(and(eq(feedback.projectId, row.project.id), eq(feedback.visibility, "public")))
    .orderBy(asc(feedback.createdAt));

  const ownerHandle = row.owner.handle ?? row.owner.id;

  return {
    project: serializeProject(row.project, feedbackRows, ownerHandle),
    owner: {
      id: row.owner.id,
      handle: row.owner.handle,
      name: row.owner.name,
    },
    feedback: feedbackRows.map(serializeFeedback),
  };
}

export async function listPublicMcpProjects(input: z.output<typeof listPublicMcpProjectsSchema>) {
  const sort = input.sort;
  const order = input.order ?? defaultPublicProjectListOrder(sort);
  const projectRows = await db
    .select({
      project: projects,
      owner: users,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.visibility, "public"))
    .orderBy(desc(projects.lastActivityAt), desc(projects.createdAt));

  const projectIds = projectRows.map((row) => row.project.id);
  const feedbackRows =
    projectIds.length > 0
      ? await db
          .select({
            id: feedback.id,
            projectId: feedback.projectId,
            implementedStatus: feedback.implementedStatus,
          })
          .from(feedback)
          .where(and(inArray(feedback.projectId, projectIds), eq(feedback.visibility, "public")))
      : [];
  const favoriteRows =
    projectIds.length > 0
      ? await db
          .select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(inArray(projectFavorites.projectId, projectIds))
      : [];

  const feedbackByProject = groupByProjectId(feedbackRows);
  const favoriteCountByProject = countByProjectId(favoriteRows);
  const filters = {
    query: input.query ?? null,
    tag: input.tag ?? null,
    tool: input.tool ?? null,
  };
  const items = projectRows
    .map((row) => {
      const ownerHandle = row.owner.handle ?? row.owner.id;
      const projectFeedbackRows = feedbackByProject.get(row.project.id) ?? [];

      return {
        project: {
          ...serializeProject(row.project, projectFeedbackRows, ownerHandle),
          favoriteCount: favoriteCountByProject.get(row.project.id) ?? 0,
        },
        owner: {
          id: row.owner.id,
          handle: row.owner.handle,
          name: row.owner.name,
        },
      };
    })
    .filter((item) => matchesPublicProjectListFilters(item, filters))
    .sort((left, right) => comparePublicProjectListItems(left, right, sort, order));

  const total = items.length;
  const projectsPage = items.slice(input.offset, input.offset + input.limit);
  const nextOffset = input.offset + input.limit < total ? input.offset + input.limit : null;

  return {
    projects: projectsPage,
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total,
      hasMore: nextOffset !== null,
      nextOffset,
    },
    sort: {
      key: sort,
      order,
    },
    filters,
  };
}

export async function listMcpProjectRevisions(
  owner: McpUser,
  projectId: string,
  input: z.output<typeof listMcpProjectRevisionsSchema> = { limit: 30 },
) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  const revisionRows = await db
    .select({
      id: projectRevisions.id,
      projectId: projectRevisions.projectId,
      actorId: projectRevisions.actorId,
      source: projectRevisions.source,
      title: projectRevisions.title,
      summary: projectRevisions.summary,
      description: projectRevisions.description,
      status: projectRevisions.status,
      visibility: projectRevisions.visibility,
      demoUrl: projectRevisions.demoUrl,
      repoUrl: projectRevisions.repoUrl,
      coverImageUrl: projectRevisions.coverImageUrl,
      projectType: projectRevisions.projectType,
      externalOwnerName: projectRevisions.externalOwnerName,
      externalOwnerUrl: projectRevisions.externalOwnerUrl,
      sourceUrl: projectRevisions.sourceUrl,
      tools: projectRevisions.tools,
      categoryTags: projectRevisions.categoryTags,
      feedbackFocus: projectRevisions.feedbackFocus,
      createdAt: projectRevisions.createdAt,
      actorName: users.name,
      actorHandle: users.handle,
    })
    .from(projectRevisions)
    .leftJoin(users, eq(projectRevisions.actorId, users.id))
    .where(eq(projectRevisions.projectId, project.id))
    .orderBy(desc(projectRevisions.createdAt))
    .limit(input.limit);

  return revisionRows.map((revision) => ({
    id: revision.id,
    projectId: revision.projectId,
    source: revision.source,
    title: revision.title,
    summary: revision.summary,
    description: revision.description,
    status: revision.status,
    visibility: revision.visibility,
    demoUrl: revision.demoUrl,
    repoUrl: revision.repoUrl,
    thumbnailUrl: revision.coverImageUrl,
    coverImageUrl: revision.coverImageUrl,
    projectType: revision.projectType,
    externalOwnerName: revision.externalOwnerName,
    externalOwnerUrl: revision.externalOwnerUrl,
    sourceUrl: revision.sourceUrl,
    tools: revision.tools,
    categoryTags: revision.categoryTags,
    feedbackFocus: revision.feedbackFocus,
    createdAt: revision.createdAt.toISOString(),
    actor: revision.actorId
      ? {
          id: revision.actorId,
          name: revision.actorName,
          handle: revision.actorHandle,
        }
      : null,
  }));
}

export async function createMcpProject(
  owner: McpUser,
  input: z.infer<typeof createMcpProjectSchema>,
) {
  const slug = await createUniqueProjectSlug(input.title, owner.id);
  const inputThumbnailUrl = resolveCreateThumbnailUrl(input);
  const visibility = normalizeMcpVisibility(input.projectType, input.visibility);
  const sourceUrl = normalizeMcpSourceUrl(
    input.projectType,
    input.sourceUrl,
    input.demoUrl,
    input.repoUrl,
  );

  let [project] = await db
    .insert(projects)
    .values({
      ownerId: owner.id,
      submittedById: owner.id,
      projectType: input.projectType,
      externalOwnerName: input.projectType === "external" ? input.externalOwnerName ?? null : null,
      externalOwnerUrl: input.projectType === "external" ? input.externalOwnerUrl ?? null : null,
      sourceUrl,
      title: input.title,
      slug,
      summary: input.summary,
      description: input.description,
      status: input.status,
      visibility,
      demoUrl: input.demoUrl,
      repoUrl: input.repoUrl,
      coverImageUrl: inputThumbnailUrl,
      tools: input.tools,
      categoryTags: input.categoryTags,
      feedbackFocus: input.feedbackFocus,
      lastActivityAt: new Date(),
    })
    .returning();

  await db.insert(projectStatusEvents).values({
    projectId: project.id,
    actorId: owner.id,
    toStatus: input.status,
    note: "Project created via MCP API",
  });

  const uploadedThumbnail = await saveMcpThumbnailFromInput(project.id, input);

  if (uploadedThumbnail) {
    [project] = await db
      .update(projects)
      .set({
        coverImageUrl: uploadedThumbnail.publicUrl,
        coverImageObjectKey: uploadedThumbnail.objectKey,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id))
      .returning();
  }

  revalidateWorkspace(owner.handle, project.slug, project.id);

  return serializeProject(project, [], owner.handle);
}

export async function updateMcpProject(
  owner: McpUser,
  projectId: string,
  input: z.output<typeof updateMcpProjectSchema>,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  const now = new Date();
  const inputThumbnailUrl = resolvePatchThumbnailUrl(input);
  const uploadedThumbnail = await saveMcpThumbnailFromInput(project.id, input);
  const nextProjectType = input.projectType ?? project.projectType;
  const nextSourceUrl = normalizeMcpSourceUrl(
    nextProjectType,
    input.sourceUrl === undefined ? project.sourceUrl ?? undefined : input.sourceUrl ?? undefined,
    input.demoUrl === undefined ? project.demoUrl ?? undefined : input.demoUrl ?? undefined,
    input.repoUrl === undefined ? project.repoUrl ?? undefined : input.repoUrl ?? undefined,
  );
  const thumbnailPatch =
    uploadedThumbnail
      ? {
          coverImageUrl: uploadedThumbnail.publicUrl,
          coverImageObjectKey: uploadedThumbnail.objectKey,
        }
      : inputThumbnailUrl !== undefined
        ? {
            coverImageUrl: inputThumbnailUrl,
            coverImageObjectKey: null,
          }
        : {};
  const patch = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    projectType: nextProjectType,
    externalOwnerName: nextProjectType === "external"
      ? input.externalOwnerName !== undefined
        ? input.externalOwnerName
        : project.externalOwnerName
      : null,
    externalOwnerUrl: nextProjectType === "external"
      ? input.externalOwnerUrl !== undefined
        ? input.externalOwnerUrl
        : project.externalOwnerUrl
      : null,
    sourceUrl: nextSourceUrl,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.visibility !== undefined
      ? { visibility: normalizeMcpVisibility(input.projectType ?? project.projectType, input.visibility) }
      : {}),
    ...(input.demoUrl !== undefined ? { demoUrl: input.demoUrl } : {}),
    ...(input.repoUrl !== undefined ? { repoUrl: input.repoUrl } : {}),
    ...thumbnailPatch,
    ...(input.tools !== undefined ? { tools: input.tools } : {}),
    ...(input.categoryTags !== undefined ? { categoryTags: input.categoryTags } : {}),
    ...(input.feedbackFocus !== undefined ? { feedbackFocus: input.feedbackFocus } : {}),
    updatedAt: now,
    lastActivityAt: now,
  };

  const [updatedProject] = await db.transaction(async (tx) => {
    await tx.insert(projectRevisions).values(projectRevisionValues(project, owner.id, "mcp_update"));

    const [row] = await tx
      .update(projects)
      .set(patch)
      .where(eq(projects.id, project.id))
      .returning();

    if (input.status !== undefined && input.status !== project.status) {
      await tx.insert(projectStatusEvents).values({
        projectId: project.id,
        actorId: owner.id,
        fromStatus: project.status,
        toStatus: input.status,
        note: "Project status changed via MCP API",
      });
    }

    return [row];
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);

  const feedbackRows = await db
    .select({
      projectId: feedback.projectId,
      implementedStatus: feedback.implementedStatus,
    })
    .from(feedback)
    .where(eq(feedback.projectId, updatedProject.id));

  return serializeProject(updatedProject, feedbackRows, owner.handle);
}

export async function deleteMcpProject(owner: McpUser, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  await db.delete(projects).where(eq(projects.id, project.id));
  revalidateWorkspace(owner.handle, project.slug, project.id);

  return {
    deleted: true,
    project: serializeProject(project, [], owner.handle),
  };
}

export async function claimMcpProject(owner: McpUser, projectId: string) {
  const result = await requestExternalProjectOwnershipForUser(owner, projectId);

  return {
    requested: result.requested,
    status: result.claim.status,
    claim: {
      id: result.claim.id,
      projectId: result.claim.projectId,
      claimantId: result.claim.claimantId,
      status: result.claim.status,
      createdAt: result.claim.createdAt,
    },
    projectId: result.project.id,
    owner: {
      id: result.owner.id,
      handle: result.owner.handle,
      name: result.owner.name,
    },
    publicUrl: result.publicPath,
  };
}

export async function listMcpOwnershipClaims(user: McpUser) {
  const incoming = await db
    .select({
      id: projectOwnershipClaims.id,
      status: projectOwnershipClaims.status,
      createdAt: projectOwnershipClaims.createdAt,
      updatedAt: projectOwnershipClaims.updatedAt,
      resolvedAt: projectOwnershipClaims.resolvedAt,
      projectId: projects.id,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      claimantId: users.id,
      claimantName: users.name,
      claimantHandle: users.handle,
    })
    .from(projectOwnershipClaims)
    .innerJoin(projects, eq(projectOwnershipClaims.projectId, projects.id))
    .innerJoin(users, eq(projectOwnershipClaims.claimantId, users.id))
    .where(and(eq(projects.ownerId, user.id), eq(projectOwnershipClaims.status, "pending")))
    .orderBy(asc(projectOwnershipClaims.createdAt));

  const outgoing = await db
    .select({
      id: projectOwnershipClaims.id,
      status: projectOwnershipClaims.status,
      createdAt: projectOwnershipClaims.createdAt,
      updatedAt: projectOwnershipClaims.updatedAt,
      resolvedAt: projectOwnershipClaims.resolvedAt,
      projectId: projects.id,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      ownerId: users.id,
      ownerName: users.name,
      ownerHandle: users.handle,
    })
    .from(projectOwnershipClaims)
    .innerJoin(projects, eq(projectOwnershipClaims.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projectOwnershipClaims.claimantId, user.id))
    .orderBy(desc(projectOwnershipClaims.createdAt))
    .limit(50);

  return {
    incoming: incoming.map((claim) => ({
      id: claim.id,
      status: claim.status,
      project: {
        id: claim.projectId,
        title: claim.projectTitle,
        slug: claim.projectSlug,
        publicUrl: projectPublicPath(user.handle, claim.projectSlug),
      },
      claimant: {
        id: claim.claimantId,
        handle: claim.claimantHandle,
        name: claim.claimantName,
      },
      availableActions: ["approve", "reject"],
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      resolvedAt: claim.resolvedAt,
    })),
    outgoing: outgoing.map((claim) => ({
      id: claim.id,
      status: claim.status,
      project: {
        id: claim.projectId,
        title: claim.projectTitle,
        slug: claim.projectSlug,
        publicUrl: projectPublicPath(claim.ownerHandle ?? claim.ownerId, claim.projectSlug),
      },
      owner: {
        id: claim.ownerId,
        handle: claim.ownerHandle,
        name: claim.ownerName,
      },
      availableActions: claim.status === "pending" ? ["withdraw"] : [],
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      resolvedAt: claim.resolvedAt,
    })),
  };
}

export async function approveMcpOwnershipClaim(user: McpUser, claimId: string) {
  const result = await approveExternalProjectOwnershipClaimForUser(user, claimId, "mcp_claim");

  return {
    approved: true,
    claimId: result.claimId,
    project: serializeProject(result.project, [], result.claimant.handle),
    claimant: {
      id: result.claimant.id,
      handle: result.claimant.handle,
      name: result.claimant.name,
    },
    previousOwner: {
      id: result.previousOwner.id,
      handle: result.previousOwner.handle,
      name: result.previousOwner.name,
    },
    publicUrl: result.publicPath,
    previousPublicUrl: result.previousPublicPath,
  };
}

export async function rejectMcpOwnershipClaim(user: McpUser, claimId: string) {
  const result = await rejectExternalProjectOwnershipClaimForUser(user, claimId);

  return {
    rejected: true,
    claim: {
      id: result.claim.id,
      projectId: result.claim.projectId,
      claimantId: result.claim.claimantId,
      status: result.claim.status,
      resolvedAt: result.claim.resolvedAt,
      updatedAt: result.claim.updatedAt,
    },
    projectId: result.project.id,
    publicUrl: result.publicPath,
  };
}

export async function withdrawMcpOwnershipClaim(user: McpUser, claimId: string) {
  const result = await withdrawExternalProjectOwnershipClaimForUser(user, claimId);

  return {
    withdrawn: true,
    claim: {
      id: result.claim.id,
      projectId: result.claim.projectId,
      claimantId: result.claim.claimantId,
      status: result.claim.status,
      resolvedAt: result.claim.resolvedAt,
      updatedAt: result.claim.updatedAt,
    },
    projectId: result.project.id,
    owner: {
      id: result.owner.id,
      handle: result.owner.handle,
      name: result.owner.name,
    },
    publicUrl: result.publicPath,
  };
}

export async function createMcpFeedback(
  author: McpUser,
  input: z.output<typeof createMcpFeedbackSchema>,
) {
  const [row] = await db
    .select({
      project: projects,
      ownerHandle: users.handle,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, input.projectId))
    .limit(1);

  if (!row || (row.project.visibility === "private" && row.project.ownerId !== author.id)) {
    throw new ApiError(404, "project_not_found", "Project was not found or is private.");
  }

  const isProjectOwner = row.project.ownerId === author.id;
  const requestedVisibility = input.visibility ?? (isProjectOwner ? "private" : "public");
  const requestedKind = input.kind ?? (isProjectOwner ? "self_note" : "feedback");
  let parentVisibility: FeedbackVisibility | null = null;

  if (input.parentFeedbackId) {
    const [parent] = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        authorId: feedback.authorId,
        visibility: feedback.visibility,
      })
      .from(feedback)
      .where(eq(feedback.id, input.parentFeedbackId))
      .limit(1);

    if (!parent || parent.projectId !== row.project.id) {
      throw new ApiError(404, "parent_feedback_not_found", "Parent feedback was not found for this project.");
    }

    if (parent.visibility === "private" && !isProjectOwner && parent.authorId !== author.id) {
      throw new ApiError(404, "parent_feedback_not_found", "Parent feedback was not found for this project.");
    }

    parentVisibility = parent.visibility;
  }

  const visibility = parentVisibility === "private" ? "private" : requestedVisibility;
  const kind = isProjectOwner ? requestedKind : "feedback";
  const storedRating = kind === "feedback" ? input.rating : null;

  const [entry] = await db.transaction(async (tx) => {
    const now = new Date();
    const [createdFeedback] = await tx
      .insert(feedback)
      .values({
        projectId: row.project.id,
        requestId: null,
        parentFeedbackId: input.parentFeedbackId ?? null,
        authorId: author.id,
        feedbackType: input.feedbackType,
        body: input.body,
        rating: storedRating,
        helpfulStatus: "unreviewed",
        implementedStatus: "unreviewed",
        visibility,
        kind,
      })
      .returning();

    await tx
      .update(projects)
      .set({ updatedAt: now, lastActivityAt: now })
      .where(eq(projects.id, row.project.id));

    return [createdFeedback];
  });

  revalidateWorkspace(row.ownerHandle, row.project.slug, row.project.id);
  revalidatePath(`/p/${author.handle}`);

  return serializeFeedback({
    ...entry,
    authorName: author.name,
    authorHandle: author.handle,
    projectTitle: row.project.title,
    projectSlug: row.project.slug,
  });
}

export async function listMcpFeedback(owner: McpUser, url: URL) {
  const limit = clampNumber(url.searchParams.get("limit"), 1, 100, 50);
  const projectId = url.searchParams.get("projectId")?.trim();
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, owner.id));
  const projectIds = projectRows.map((project) => project.id);

  if (projectIds.length === 0) {
    return [];
  }

  if (projectId && !projectIds.includes(projectId)) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  const rows = await db
    .select({
      id: feedback.id,
      projectId: feedback.projectId,
      requestId: feedback.requestId,
      parentFeedbackId: feedback.parentFeedbackId,
      authorId: feedback.authorId,
      feedbackType: feedback.feedbackType,
      body: feedback.body,
      rating: feedback.rating,
      helpfulStatus: feedback.helpfulStatus,
      implementedStatus: feedback.implementedStatus,
      visibility: feedback.visibility,
      kind: feedback.kind,
      createdAt: feedback.createdAt,
      authorName: users.name,
      authorHandle: users.handle,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .innerJoin(projects, eq(feedback.projectId, projects.id))
    .where(createMcpFeedbackListWhere(url, projectId, projectIds))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);

  return rows.map(serializeFeedback);
}

function createMcpFeedbackListWhere(url: URL, projectId: string | undefined, projectIds: string[]) {
  const visibility = url.searchParams.get("visibility")?.trim();
  const kind = url.searchParams.get("kind")?.trim();
  const includePrivate = url.searchParams.get("includePrivate") !== "false";
  const conditions = [projectId ? eq(feedback.projectId, projectId) : inArray(feedback.projectId, projectIds)];

  if (feedbackVisibilities.includes(visibility as FeedbackVisibility)) {
    conditions.push(eq(feedback.visibility, visibility as FeedbackVisibility));
  } else if (!includePrivate) {
    conditions.push(eq(feedback.visibility, "public"));
  }

  if (feedbackKinds.includes(kind as FeedbackKind)) {
    conditions.push(eq(feedback.kind, kind as FeedbackKind));
  }

  return and(...conditions);
}

export async function updateMcpFeedback(
  actor: McpUser,
  input: z.output<typeof updateMcpFeedbackSchema>,
) {
  const [row] = await db
    .select({
      feedback: feedback,
      project: projects,
      ownerHandle: users.handle,
    })
    .from(feedback)
    .innerJoin(projects, eq(feedback.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(feedback.id, input.feedbackId))
    .limit(1);

  if (!row || (row.feedback.visibility === "private" && row.feedback.authorId !== actor.id && row.project.ownerId !== actor.id)) {
    throw new ApiError(404, "feedback_not_found", "Feedback was not found for this API user.");
  }

  const isAuthor = row.feedback.authorId === actor.id;
  const isProjectOwner = row.project.ownerId === actor.id;

  if (!isAuthor && !isProjectOwner) {
    throw new ApiError(404, "feedback_not_found", "Feedback was not found for this API user.");
  }

  const authorOnlyFields = [input.body, input.feedbackType, input.rating, input.visibility, input.kind];

  if (!isAuthor && authorOnlyFields.some((field) => field !== undefined)) {
    throw new ApiError(403, "feedback_update_forbidden", "Only the feedback author can edit comment content.");
  }

  const patch: Partial<{
    body: string;
    feedbackType: FeedbackType;
    rating: number | null;
    visibility: FeedbackVisibility;
    kind: FeedbackKind;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (isAuthor) {
    if (input.body !== undefined) {
      patch.body = input.body;
    }

    if (input.feedbackType !== undefined) {
      patch.feedbackType = input.feedbackType;
    }

    if (input.rating !== undefined) {
      patch.rating = input.rating;
    }

    if (input.visibility !== undefined) {
      patch.visibility = input.visibility;
    }

    if (input.kind !== undefined) {
      patch.kind = isProjectOwner ? input.kind : "feedback";
      if (patch.kind !== "feedback") {
        patch.rating = null;
      }
    }
  }

  const finalKind = patch.kind ?? row.feedback.kind;

  if (finalKind !== "feedback") {
    patch.rating = null;
  }

  const [updated] = await db.transaction(async (tx) => {
    const [updatedFeedback] = await tx
      .update(feedback)
      .set(patch)
      .where(eq(feedback.id, row.feedback.id))
      .returning();

    await tx
      .update(projects)
      .set({ updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(projects.id, row.project.id));

    return [updatedFeedback];
  });

  revalidateWorkspace(row.ownerHandle, row.project.slug, row.project.id);
  revalidatePath(`/p/${actor.handle}`);

  return serializeFeedback({
    ...updated,
    authorName: actor.id === updated.authorId ? actor.name : null,
    authorHandle: actor.id === updated.authorId ? actor.handle : null,
    projectTitle: row.project.title,
    projectSlug: row.project.slug,
  });
}

export async function deleteMcpFeedback(
  actor: McpUser,
  input: z.output<typeof deleteMcpFeedbackSchema>,
) {
  const [row] = await db
    .select({
      feedback: feedback,
      project: projects,
      ownerHandle: users.handle,
    })
    .from(feedback)
    .innerJoin(projects, eq(feedback.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(eq(feedback.id, input.feedbackId), eq(feedback.authorId, actor.id)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "feedback_not_found", "Feedback was not found for this API user.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(feedback).where(eq(feedback.id, row.feedback.id));
    await tx
      .update(projects)
      .set({ updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(projects.id, row.project.id));
  });

  revalidateWorkspace(row.ownerHandle, row.project.slug, row.project.id);
  revalidatePath(`/p/${actor.handle}`);

  return {
    deleted: true,
    feedbackId: row.feedback.id,
    projectId: row.project.id,
  };
}


function serializeProject<
  TProject extends {
    id: string;
    title: string;
    slug: string;
    summary: string;
    description?: string | null;
    status: string;
    visibility: string;
    demoUrl?: string | null;
    repoUrl?: string | null;
    coverImageUrl?: string | null;
    projectType: string;
    externalOwnerName?: string | null;
    externalOwnerUrl?: string | null;
    claimedById?: string | null;
    sourceUrl?: string | null;
    tools: string[];
    categoryTags: string[];
    feedbackFocus: FeedbackType[];
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
  },
  TFeedback extends { projectId: string; implementedStatus?: string | null },
>(project: TProject, feedbackRows: TFeedback[], ownerHandle: string) {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    description: project.description ?? null,
    projectType: project.projectType,
    externalOwnerName: project.externalOwnerName ?? null,
    externalOwnerUrl: project.externalOwnerUrl ?? null,
    claimedById: project.claimedById ?? null,
    sourceUrl: project.sourceUrl ?? null,
    status: project.status,
    visibility: project.visibility,
    demoUrl: project.demoUrl ?? null,
    repoUrl: project.repoUrl ?? null,
    thumbnailUrl: project.coverImageUrl ?? null,
    coverImageUrl: project.coverImageUrl ?? null,
    images: project.coverImageUrl
      ? [
          {
            url: project.coverImageUrl,
            kind: "thumbnail",
          },
        ]
      : [],
    tools: project.tools,
    categoryTags: project.categoryTags,
    feedbackFocus: project.feedbackFocus,
    feedbackCount: feedbackRows.length,
    implementedCount: feedbackRows.filter((entry) => entry.implementedStatus === "implemented")
      .length,
    publicUrl: `/p/${ownerHandle}/${project.slug}`,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastActivityAt: project.lastActivityAt,
  };
}

function serializeFeedback<
  TFeedback extends {
    id: string;
    projectId: string;
    requestId?: string | null;
    parentFeedbackId?: string | null;
    authorId: string;
    authorName?: string | null;
    authorHandle?: string | null;
    feedbackType: FeedbackType;
    body: string;
    rating?: number | null;
    helpfulStatus: string;
    implementedStatus: string;
    visibility: FeedbackVisibility;
    kind: FeedbackKind;
    createdAt: Date;
    projectTitle?: string;
    projectSlug?: string;
  },
>(entry: TFeedback) {
  return {
    id: entry.id,
    projectId: entry.projectId,
    projectTitle: entry.projectTitle,
    projectSlug: entry.projectSlug,
    requestId: entry.requestId ?? null,
    parentFeedbackId: entry.parentFeedbackId ?? null,
    author: {
      id: entry.authorId,
      name: entry.authorName ?? null,
      handle: entry.authorHandle ?? null,
    },
    feedbackType: entry.kind === "feedback" ? entry.feedbackType : null,
    body: entry.body,
    rating: entry.kind === "feedback" ? entry.rating ?? null : null,
    helpfulStatus: entry.helpfulStatus,
    implementedStatus: entry.implementedStatus,
    visibility: entry.visibility,
    kind: entry.kind,
    createdAt: entry.createdAt,
  };
}

type PublicProjectListItem = {
  project: ReturnType<typeof serializeProject> & { favoriteCount: number };
  owner: {
    id: string;
    handle: string | null;
    name: string | null;
  };
};

function groupByProjectId<TEntry extends { projectId: string }>(entries: TEntry[]) {
  const grouped = new Map<string, TEntry[]>();

  for (const entry of entries) {
    const projectEntries = grouped.get(entry.projectId) ?? [];
    projectEntries.push(entry);
    grouped.set(entry.projectId, projectEntries);
  }

  return grouped;
}

function countByProjectId<TEntry extends { projectId: string }>(entries: TEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.projectId, (counts.get(entry.projectId) ?? 0) + 1);
  }

  return counts;
}

function matchesPublicProjectListFilters(
  item: PublicProjectListItem,
  filters: { query: string | null; tag: string | null; tool: string | null },
) {
  if (filters.tag) {
    const tag = filters.tag.toLowerCase();

    if (!item.project.categoryTags.some((entry) => entry.toLowerCase() === tag)) {
      return false;
    }
  }

  if (filters.tool) {
    const tool = filters.tool.toLowerCase();

    if (!item.project.tools.some((entry) => entry.toLowerCase() === tool)) {
      return false;
    }
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystack = [
      item.project.title,
      item.project.summary,
      item.project.description,
      item.project.externalOwnerName,
      item.project.externalOwnerUrl,
      item.project.sourceUrl,
      item.project.demoUrl,
      item.project.repoUrl,
      item.owner.handle,
      item.owner.name,
      ...item.project.categoryTags,
      ...item.project.tools,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(query)) {
      return false;
    }
  }

  return true;
}

function comparePublicProjectListItems(
  left: PublicProjectListItem,
  right: PublicProjectListItem,
  sort: (typeof publicProjectListSortKeys)[number],
  order: (typeof publicProjectListOrderKeys)[number],
) {
  const direction = order === "asc" ? 1 : -1;
  let value = 0;

  if (sort === "title") {
    value = publicProjectListCollator.compare(left.project.title, right.project.title);
  } else if (sort === "owner") {
    value = publicProjectListCollator.compare(projectOwnerLabel(left), projectOwnerLabel(right));
  } else if (sort === "status") {
    value = publicProjectListCollator.compare(left.project.status, right.project.status);
  } else if (sort === "feedback") {
    value = left.project.feedbackCount - right.project.feedbackCount;
  } else if (sort === "favorites") {
    value = left.project.favoriteCount - right.project.favoriteCount;
  } else {
    value = left.project.lastActivityAt.getTime() - right.project.lastActivityAt.getTime();
  }

  if (value === 0) {
    value = left.project.createdAt.getTime() - right.project.createdAt.getTime();
  }

  return value * direction;
}

function projectOwnerLabel(item: PublicProjectListItem) {
  if (item.project.projectType === "external") {
    return item.project.externalOwnerName ?? item.project.externalOwnerUrl ?? item.project.sourceUrl ?? "";
  }

  return item.owner.handle ?? item.owner.name ?? "";
}

function defaultPublicProjectListOrder(sort: (typeof publicProjectListSortKeys)[number]) {
  return sort === "updated" || sort === "feedback" || sort === "favorites" ? "desc" : "asc";
}

function resolveCreateThumbnailUrl(input: z.output<typeof createMcpProjectSchema>) {
  return (
    input.thumbnailUrl ??
    input.coverImageUrl ??
    input.images.find((image) => image.url.trim().length > 0)?.url ??
    undefined
  );
}

function normalizeMcpVisibility(
  projectType: ProjectType,
  visibility: ProjectVisibility,
): ProjectVisibility {
  return projectType === "external" && visibility === "private" ? "unlisted" : visibility;
}

function normalizeMcpSourceUrl(
  projectType: ProjectType,
  sourceUrl: string | undefined,
  demoUrl: string | undefined,
  repoUrl: string | undefined,
) {
  if (projectType !== "external") {
    return sourceUrl ?? null;
  }

  const url = sourceUrl ?? demoUrl ?? repoUrl;

  if (!url) {
    throw new ApiError(422, "source_url_required", "sourceUrl is required for external projects.");
  }

  return url;
}

function resolvePatchThumbnailUrl(input: z.output<typeof updateMcpProjectSchema>) {
  if (input.thumbnailUrl !== undefined) {
    return input.thumbnailUrl;
  }

  if (input.coverImageUrl !== undefined) {
    return input.coverImageUrl;
  }

  if (input.images !== undefined) {
    return input.images.find((image) => image.url.trim().length > 0)?.url ?? null;
  }

  return undefined;
}

async function saveMcpThumbnailFromInput(
  projectId: string,
  input: {
    thumbnailBase64?: string;
    thumbnailMimeType?: (typeof thumbnailMimeTypes)[number];
  },
) {
  if (!input.thumbnailBase64) {
    return null;
  }

  const parsed = parseThumbnailBase64(input.thumbnailBase64, input.thumbnailMimeType);
  const extension = thumbnailExtensions.get(parsed.mimeType);

  if (!extension) {
    throw new ApiError(
      422,
      "invalid_thumbnail_mime_type",
      "thumbnailMimeType must be image/jpeg, image/png, image/webp, or image/gif.",
    );
  }

  if (parsed.bytes.length === 0) {
    throw new ApiError(422, "invalid_thumbnail_base64", "thumbnailBase64 decoded to an empty file.");
  }

  if (parsed.bytes.length > maxThumbnailBytes) {
    throw new ApiError(422, "thumbnail_too_large", "thumbnailBase64 must decode to 5MB or less.");
  }

  await mkdir(thumbnailUploadDir, { recursive: true });

  const objectKey = `${projectId}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(thumbnailUploadDir, objectKey);

  await writeFile(absolutePath, parsed.bytes);

  return {
    objectKey,
    publicUrl: `${thumbnailPublicPath}/${objectKey}`,
  };
}

function parseThumbnailBase64(
  rawValue: string,
  explicitMimeType?: (typeof thumbnailMimeTypes)[number],
) {
  const dataUriMatch = rawValue.match(/^data:([^;]+);base64,([\s\S]*)$/);
  const mimeType = explicitMimeType ?? parseThumbnailMimeType(dataUriMatch?.[1]);
  const base64 = (dataUriMatch?.[2] ?? rawValue).replace(/\s/g, "");

  if (!mimeType) {
    throw new ApiError(
      422,
      "thumbnail_mime_type_required",
      "thumbnailMimeType is required unless thumbnailBase64 is a data URI.",
    );
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new ApiError(422, "invalid_thumbnail_base64", "thumbnailBase64 must be valid base64.");
  }

  return {
    mimeType,
    bytes: Buffer.from(base64, "base64"),
  };
}

function parseThumbnailMimeType(value: string | undefined) {
  return thumbnailMimeTypes.find((mimeType) => mimeType === value);
}

function routeParamCandidates(value: string, options: { lowercase?: boolean } = {}) {
  const decodedValues = [value];
  let current = value;

  for (let index = 0; index < 2; index += 1) {
    if (!/%[0-9a-f]{2}/i.test(current)) {
      break;
    }

    try {
      current = decodeURIComponent(current);
      decodedValues.push(current);
    } catch {
      break;
    }
  }

  const candidates = decodedValues.flatMap((item) => {
    const normalized = [item, item.normalize("NFC"), item.normalize("NFKC")];
    return options.lowercase
      ? normalized.flatMap((entry) => [entry, entry.toLowerCase()])
      : normalized;
  });

  return Array.from(new Set(candidates.filter(Boolean)));
}

async function createUniqueProjectSlug(title: string, ownerId: string) {
  const base = slugifyProjectTitle(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), eq(projects.slug, candidate)))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function revalidateWorkspace(ownerHandle?: string | null, projectSlug?: string, projectId?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/feedback");

  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
  }

  if (ownerHandle) {
    revalidatePath(profilePath(ownerHandle));

    if (projectSlug) {
      revalidatePath(projectPublicPath(ownerHandle, projectSlug));
    }
  }
}

function profilePath(ownerHandle: string) {
  return `/p/${encodeURIComponent(ownerHandle)}`;
}

function projectPublicPath(ownerHandle: string, projectSlug: string) {
  return `${profilePath(ownerHandle)}/${encodeURIComponent(projectSlug)}`;
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

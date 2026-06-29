import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  creditLedger,
  feedback,
  feedbackClaims,
  feedbackRequests,
  projectStatusEvents,
  projects,
  users,
} from "@/db/schema";
import {
  feedbackTypes,
  projectStatuses,
  projectVisibilities,
  slugifyProjectTitle,
  type FeedbackType,
} from "@/lib/domain";
import { ApiError, type McpUser } from "@/server/mcp-api";

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

export const createMcpProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  description: optionalText,
  status: z.enum(projectStatuses).default("idea"),
  visibility: z.enum(projectVisibilities).default("public"),
  demoUrl: optionalUrl,
  repoUrl: optionalUrl,
  tools: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  feedbackFocus: z.array(z.enum(feedbackTypes)).max(8).default(["first_impression", "ux_ui"]),
});

export const createMcpFeedbackRequestSchema = z.object({
  feedbackTypes: z.array(z.enum(feedbackTypes)).min(1).max(8).default(["first_impression"]),
  minFeedbackCount: z.number().int().min(1).max(20).default(1),
  creditCost: z.number().int().min(1).max(20).optional(),
  deadlineDays: z.number().int().min(1).max(30).default(7),
});

export async function listMcpProjects(owner: McpUser) {
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, owner.id))
    .orderBy(desc(projects.lastActivityAt), asc(projects.title));

  const projectIds = projectRows.map((project) => project.id);
  const [requestRows, feedbackRows] =
    projectIds.length > 0
      ? await Promise.all([
          db.select().from(feedbackRequests).where(inArray(feedbackRequests.projectId, projectIds)),
          db
            .select({
              id: feedback.id,
              projectId: feedback.projectId,
              implementedStatus: feedback.implementedStatus,
            })
            .from(feedback)
            .where(inArray(feedback.projectId, projectIds)),
        ])
      : [[], []];

  return projectRows.map((project) =>
    serializeProject(
      project,
      requestRows.filter((request) => request.projectId === project.id),
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

  const [requestRows, feedbackRows] = await Promise.all([
    db
      .select()
      .from(feedbackRequests)
      .where(eq(feedbackRequests.projectId, project.id))
      .orderBy(desc(feedbackRequests.createdAt)),
    db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        requestId: feedback.requestId,
        authorId: feedback.authorId,
        feedbackType: feedback.feedbackType,
        body: feedback.body,
        rating: feedback.rating,
        helpfulStatus: feedback.helpfulStatus,
        implementedStatus: feedback.implementedStatus,
        createdAt: feedback.createdAt,
        authorName: users.name,
        authorHandle: users.handle,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.authorId, users.id))
      .where(eq(feedback.projectId, project.id))
      .orderBy(desc(feedback.createdAt)),
  ]);

  return {
    project: serializeProject(project, requestRows, feedbackRows, owner.handle),
    requests: requestRows.map((request) => serializeFeedbackRequest(request, feedbackRows)),
    feedback: feedbackRows.map(serializeFeedback),
  };
}

export async function createMcpProject(
  owner: McpUser,
  input: z.infer<typeof createMcpProjectSchema>,
) {
  const slug = await createUniqueProjectSlug(input.title, owner.id);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: owner.id,
      title: input.title,
      slug,
      summary: input.summary,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      demoUrl: input.demoUrl,
      repoUrl: input.repoUrl,
      tools: input.tools,
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

  revalidateWorkspace(owner.handle, project.slug, project.id);

  return serializeProject(project, [], [], owner.handle);
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
    project: serializeProject(project, [], [], owner.handle),
  };
}

export async function createMcpFeedbackRequest(
  owner: McpUser,
  projectId: string,
  input: z.infer<typeof createMcpFeedbackRequestSchema>,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found for this API user.");
  }

  const creditCost = input.creditCost ?? input.minFeedbackCount;
  const result = await db.transaction(async (tx) => {
    const [ownerRow] = await tx.select().from(users).where(eq(users.id, owner.id)).limit(1);

    if (!ownerRow) {
      throw new ApiError(404, "owner_not_found", "API user was not found.");
    }

    if (ownerRow.feedbackCredits < creditCost) {
      throw new ApiError(409, "not_enough_credits", "Not enough feedback credits.");
    }

    const [request] = await tx
      .insert(feedbackRequests)
      .values({
        projectId: project.id,
        requestedById: owner.id,
        feedbackTypes: input.feedbackTypes,
        creditCost,
        minFeedbackCount: input.minFeedbackCount,
        deadlineAt: new Date(Date.now() + input.deadlineDays * 24 * 60 * 60 * 1000),
        status: "open",
      })
      .returning();

    const nextBalance = ownerRow.feedbackCredits - creditCost;

    await tx
      .update(users)
      .set({ feedbackCredits: nextBalance, updatedAt: new Date() })
      .where(eq(users.id, owner.id));

    await tx.insert(creditLedger).values({
      userId: owner.id,
      actorId: owner.id,
      amount: -creditCost,
      reason: "spent_feedback_request",
      relatedRequestId: request.id,
      idempotencyKey: `request:${request.id}:spend`,
      balanceAfter: nextBalance,
    });

    await tx
      .update(projects)
      .set({ status: "needs_feedback", updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(projects.id, project.id));

    await tx.insert(projectStatusEvents).values({
      projectId: project.id,
      actorId: owner.id,
      fromStatus: project.status,
      toStatus: "needs_feedback",
      note: "Feedback request opened via MCP API",
    });

    return request;
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);

  return serializeFeedbackRequest(result, []);
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
      authorId: feedback.authorId,
      feedbackType: feedback.feedbackType,
      body: feedback.body,
      rating: feedback.rating,
      helpfulStatus: feedback.helpfulStatus,
      implementedStatus: feedback.implementedStatus,
      createdAt: feedback.createdAt,
      authorName: users.name,
      authorHandle: users.handle,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .innerJoin(projects, eq(feedback.projectId, projects.id))
    .where(projectId ? eq(feedback.projectId, projectId) : inArray(feedback.projectId, projectIds))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);

  return rows.map(serializeFeedback);
}

export async function listMcpAssignedFeedback(owner: McpUser) {
  const rows = await db
    .select({
      claim: feedbackClaims,
      request: feedbackRequests,
      project: projects,
      owner: users,
    })
    .from(feedbackClaims)
    .innerJoin(feedbackRequests, eq(feedbackClaims.requestId, feedbackRequests.id))
    .innerJoin(projects, eq(feedbackClaims.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(eq(feedbackClaims.reviewerId, owner.id), eq(feedbackClaims.status, "claimed")))
    .orderBy(asc(feedbackClaims.dueAt), desc(feedbackClaims.createdAt));

  return rows.map((row) => ({
    id: row.claim.id,
    status: row.claim.status,
    dueAt: row.claim.dueAt,
    createdAt: row.claim.createdAt,
    request: serializeFeedbackRequest(row.request, []),
    project: {
      id: row.project.id,
      title: row.project.title,
      slug: row.project.slug,
      summary: row.project.summary,
      ownerHandle: row.owner.handle,
      publicUrl: row.owner.handle ? `/p/${row.owner.handle}/${row.project.slug}` : null,
    },
  }));
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
    tools: string[];
    feedbackFocus: FeedbackType[];
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
  },
  TRequest extends { projectId: string },
  TFeedback extends { projectId: string; implementedStatus?: string | null },
>(project: TProject, requestRows: TRequest[], feedbackRows: TFeedback[], ownerHandle: string) {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    description: project.description ?? null,
    status: project.status,
    visibility: project.visibility,
    demoUrl: project.demoUrl ?? null,
    repoUrl: project.repoUrl ?? null,
    tools: project.tools,
    feedbackFocus: project.feedbackFocus,
    feedbackCount: feedbackRows.length,
    implementedCount: feedbackRows.filter((entry) => entry.implementedStatus === "implemented")
      .length,
    requestCount: requestRows.length,
    publicUrl: `/p/${ownerHandle}/${project.slug}`,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastActivityAt: project.lastActivityAt,
  };
}

function serializeFeedbackRequest<
  TRequest extends {
    id: string;
    projectId: string;
    feedbackTypes: FeedbackType[];
    creditCost: number;
    minFeedbackCount: number;
    deadlineAt: Date;
    status: string;
    fulfilledAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  TFeedback extends { requestId?: string | null },
>(request: TRequest, feedbackRows: TFeedback[]) {
  const receivedCount = feedbackRows.filter((entry) => entry.requestId === request.id).length;

  return {
    id: request.id,
    projectId: request.projectId,
    feedbackTypes: request.feedbackTypes,
    creditCost: request.creditCost,
    minFeedbackCount: request.minFeedbackCount,
    receivedCount,
    missingCount: Math.max(0, request.minFeedbackCount - receivedCount),
    status: request.status,
    deadlineAt: request.deadlineAt,
    fulfilledAt: request.fulfilledAt ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function serializeFeedback<
  TFeedback extends {
    id: string;
    projectId: string;
    requestId?: string | null;
    authorId: string;
    authorName?: string | null;
    authorHandle?: string | null;
    feedbackType: FeedbackType;
    body: string;
    rating?: number | null;
    helpfulStatus: string;
    implementedStatus: string;
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
    author: {
      id: entry.authorId,
      name: entry.authorName ?? null,
      handle: entry.authorHandle ?? null,
    },
    feedbackType: entry.feedbackType,
    body: entry.body,
    rating: entry.rating ?? null,
    helpfulStatus: entry.helpfulStatus,
    implementedStatus: entry.implementedStatus,
    createdAt: entry.createdAt,
  };
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
    revalidatePath(`/p/${ownerHandle}`);

    if (projectSlug) {
      revalidatePath(`/p/${ownerHandle}/${projectSlug}`);
    }
  }
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

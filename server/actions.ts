"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  creditLedger,
  feedbackClaims,
  feedback,
  feedbackImplementationEvents,
  feedbackRequests,
  projectStatusEvents,
  projects,
  users,
} from "@/db/schema";
import {
  coerceFeedbackType,
  coerceFeedbackTypes,
  coerceImplementationStatus,
  coerceInt,
  coerceProjectStatus,
  coerceProjectVisibility,
  parseCommaList,
  slugify,
} from "@/lib/domain";
import {
  DEMO_OWNER_HANDLE,
  DEMO_OWNER_ID,
  DEMO_REVIEWER_ID,
  ensureDemoData,
} from "@/server/data";

export async function createProject(formData: FormData) {
  await ensureDemoData();

  const title = readRequiredString(formData, "title").slice(0, 160);
  const summary = readRequiredString(formData, "summary").slice(0, 500);
  const description = readOptionalString(formData, "description");
  const status = coerceProjectStatus(formData.get("status"));
  const visibility = coerceProjectVisibility(formData.get("visibility"));
  const demoUrl = readOptionalString(formData, "demoUrl");
  const repoUrl = readOptionalString(formData, "repoUrl");
  const tools = parseCommaList(formData.get("tools"));
  const slug = await createUniqueProjectSlug(title);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: DEMO_OWNER_ID,
      title,
      slug,
      summary,
      description,
      status,
      visibility,
      demoUrl,
      repoUrl,
      tools,
      feedbackFocus: ["first_impression", "ux_ui"],
      lastActivityAt: new Date(),
    })
    .returning();

  await db.insert(projectStatusEvents).values({
    projectId: project.id,
    actorId: DEMO_OWNER_ID,
    toStatus: status,
    note: "Project created",
  });

  revalidateWorkspace(project.slug);
}

export async function updateProjectStatus(formData: FormData) {
  await ensureDemoData();

  const projectId = readRequiredString(formData, "projectId");
  const toStatus = coerceProjectStatus(formData.get("status"));

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, DEMO_OWNER_ID)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ status: toStatus, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(projects.id, project.id));

    await tx.insert(projectStatusEvents).values({
      projectId: project.id,
      actorId: DEMO_OWNER_ID,
      fromStatus: project.status,
      toStatus,
      note: "Status changed from dashboard",
    });
  });

  revalidateWorkspace(project.slug);
}

export async function updateProjectDetails(formData: FormData) {
  await ensureDemoData();

  const projectId = readRequiredString(formData, "projectId");
  const title = readRequiredString(formData, "title").slice(0, 160);
  const summary = readRequiredString(formData, "summary").slice(0, 500);
  const description = readOptionalString(formData, "description");
  const visibility = coerceProjectVisibility(formData.get("visibility"));
  const demoUrl = readOptionalString(formData, "demoUrl");
  const repoUrl = readOptionalString(formData, "repoUrl");
  const tools = parseCommaList(formData.get("tools"));

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, DEMO_OWNER_ID)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db
    .update(projects)
    .set({
      title,
      summary,
      description,
      visibility,
      demoUrl,
      repoUrl,
      tools,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(projects.id, project.id));

  revalidateWorkspace(project.slug);
}

export async function createFeedbackRequest(formData: FormData) {
  await ensureDemoData();

  const projectId = readRequiredString(formData, "projectId");
  const feedbackTypes = coerceFeedbackTypes(formData.getAll("feedbackTypes"));
  const minFeedbackCount = coerceInt(formData.get("minFeedbackCount"), 3, 1, 20);
  const creditCost = coerceInt(formData.get("creditCost"), minFeedbackCount, 1, 20);
  const deadlineDays = coerceInt(formData.get("deadlineDays"), 2, 1, 30);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, DEMO_OWNER_ID)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db.transaction(async (tx) => {
    const [owner] = await tx.select().from(users).where(eq(users.id, DEMO_OWNER_ID)).limit(1);

    if (!owner) {
      throw new Error("Owner not found");
    }

    if (owner.feedbackCredits < creditCost) {
      throw new Error("Not enough feedback credits");
    }

    const [request] = await tx
      .insert(feedbackRequests)
      .values({
        projectId: project.id,
        requestedById: DEMO_OWNER_ID,
        feedbackTypes,
        creditCost,
        minFeedbackCount,
        deadlineAt: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000),
        status: "open",
      })
      .returning();

    const nextBalance = owner.feedbackCredits - creditCost;

    await tx
      .update(users)
      .set({ feedbackCredits: nextBalance, updatedAt: new Date() })
      .where(eq(users.id, DEMO_OWNER_ID));

    await tx.insert(creditLedger).values({
      userId: DEMO_OWNER_ID,
      actorId: DEMO_OWNER_ID,
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
      actorId: DEMO_OWNER_ID,
      fromStatus: project.status,
      toStatus: "needs_feedback",
      note: "Feedback request opened",
    });
  });

  revalidateWorkspace(project.slug);
}

export async function claimFeedbackRequest(formData: FormData) {
  await ensureDemoData();

  const requestId = readRequiredString(formData, "requestId");

  const [claim] = await db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(feedbackRequests)
      .where(and(eq(feedbackRequests.id, requestId), eq(feedbackRequests.status, "open")))
      .limit(1);

    if (!request) {
      throw new Error("Open feedback request not found");
    }

    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, request.projectId), eq(projects.visibility, "public")))
      .limit(1);

    if (!project) {
      throw new Error("Public project not found");
    }

    const now = new Date();

    if (request.deadlineAt.getTime() <= now.getTime()) {
      await tx
        .update(feedbackRequests)
        .set({ status: "expired", updatedAt: now })
        .where(eq(feedbackRequests.id, request.id));
      throw new Error("Feedback request has expired");
    }

    const [existingClaim] = await tx
      .select()
      .from(feedbackClaims)
      .where(
        and(
          eq(feedbackClaims.requestId, request.id),
          eq(feedbackClaims.reviewerId, DEMO_REVIEWER_ID),
          eq(feedbackClaims.status, "claimed"),
        ),
      )
      .limit(1);

    if (existingClaim) {
      return [existingClaim];
    }

    const dueAt = new Date(Math.min(request.deadlineAt.getTime(), now.getTime() + 24 * 60 * 60 * 1000));

    return tx
      .insert(feedbackClaims)
      .values({
        requestId: request.id,
        projectId: project.id,
        reviewerId: DEMO_REVIEWER_ID,
        dueAt,
        status: "claimed",
      })
      .returning();
  });

  revalidatePath("/discover");
  revalidatePath("/feedback");
  revalidatePath("/dashboard");

  if (claim) {
    redirect("/feedback");
  }
}

export async function cancelFeedbackClaim(formData: FormData) {
  await ensureDemoData();

  const claimId = readRequiredString(formData, "claimId");

  await db
    .update(feedbackClaims)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(feedbackClaims.id, claimId),
        eq(feedbackClaims.reviewerId, DEMO_REVIEWER_ID),
        eq(feedbackClaims.status, "claimed"),
      ),
    );

  revalidatePath("/discover");
  revalidatePath("/feedback");
}

export async function createFeedback(formData: FormData) {
  await ensureDemoData();

  const projectId = readRequiredString(formData, "projectId");
  const requestId = readOptionalString(formData, "requestId");
  const claimId = readOptionalString(formData, "claimId");
  const authorName = readRequiredString(formData, "authorName").slice(0, 120);
  const body = readRequiredString(formData, "body").slice(0, 2000);
  const feedbackType = coerceFeedbackType(formData.get("feedbackType"));
  const rating = coerceInt(formData.get("rating"), 4, 1, 5);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (!project || project.visibility === "private") {
    throw new Error("Project not found");
  }

  await db.transaction(async (tx) => {
    const now = new Date();
    const [claim] = claimId
      ? await tx
          .select()
          .from(feedbackClaims)
          .where(
            and(
              eq(feedbackClaims.id, claimId),
              eq(feedbackClaims.reviewerId, DEMO_REVIEWER_ID),
              eq(feedbackClaims.projectId, project.id),
              eq(feedbackClaims.status, "claimed"),
            ),
          )
          .limit(1)
      : [];

    if (claim && claim.dueAt.getTime() <= now.getTime()) {
      await tx
        .update(feedbackClaims)
        .set({ status: "expired", updatedAt: now })
        .where(eq(feedbackClaims.id, claim.id));
      throw new Error("Feedback claim has expired");
    }

    const reviewerId = claim ? DEMO_REVIEWER_ID : `guest-${crypto.randomUUID()}`;
    const [request] = requestId
      ? await tx
          .select()
          .from(feedbackRequests)
          .where(
            and(
              eq(feedbackRequests.id, requestId),
              eq(feedbackRequests.projectId, project.id),
              eq(feedbackRequests.status, "open"),
            ),
          )
          .limit(1)
      : [];
    const effectiveRequestId = claim?.requestId ?? request?.id;

    if (!claim) {
      await tx.insert(users).values({
        id: reviewerId,
        name: authorName,
        bio: "Public feedback reviewer.",
        primaryRoles: ["Reviewer"],
        toolsUsed: ["Browser"],
        reputationScore: 1,
        feedbackCredits: 1,
      });
    }

    const [entry] = await tx
      .insert(feedback)
      .values({
        projectId: project.id,
        requestId: effectiveRequestId,
        authorId: reviewerId,
        feedbackType,
        body,
        rating,
        helpfulStatus: "unreviewed",
        implementedStatus: "unreviewed",
      })
      .returning();

    if (claim) {
      await tx
        .update(feedbackClaims)
        .set({ status: "submitted", submittedFeedbackId: entry.id, updatedAt: now })
        .where(eq(feedbackClaims.id, claim.id));
    }

    await tx.insert(creditLedger).values({
      userId: reviewerId,
      actorId: reviewerId,
      amount: 1,
      reason: "earned_feedback",
      relatedRequestId: effectiveRequestId,
      relatedFeedbackId: entry.id,
      idempotencyKey: `feedback:${entry.id}:earn`,
      balanceAfter: 1,
    });

    if (claim || request) {
      const requestToCountId = effectiveRequestId;
      const minFeedbackCount = request?.minFeedbackCount;

      if (!requestToCountId) {
        return;
      }

      const [requestToCount] = minFeedbackCount
        ? [{ minFeedbackCount }]
        : await tx
            .select({ minFeedbackCount: feedbackRequests.minFeedbackCount })
            .from(feedbackRequests)
            .where(eq(feedbackRequests.id, requestToCountId))
            .limit(1);

      const [{ value: receivedCount }] = await tx
        .select({ value: count() })
        .from(feedback)
        .where(eq(feedback.requestId, requestToCountId));

      if (requestToCount && receivedCount >= requestToCount.minFeedbackCount) {
        await tx
          .update(feedbackRequests)
          .set({ status: "fulfilled", fulfilledAt: new Date(), updatedAt: new Date() })
          .where(eq(feedbackRequests.id, requestToCountId));
      }
    }
  });

  revalidateWorkspace(project.slug);
}

export async function updateFeedbackImplementation(formData: FormData) {
  await ensureDemoData();

  const feedbackId = readRequiredString(formData, "feedbackId");
  const status = coerceImplementationStatus(formData.get("implementedStatus"));

  const [entry] = await db.select().from(feedback).where(eq(feedback.id, feedbackId)).limit(1);

  if (!entry) {
    throw new Error("Feedback not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(feedback)
      .set({ implementedStatus: status, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId));

    await tx.insert(feedbackImplementationEvents).values({
      feedbackId,
      actorId: DEMO_OWNER_ID,
      status,
      note: "Implementation status updated",
    });
  });

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, entry.projectId))
    .limit(1);

  revalidateWorkspace(project?.slug);
}

async function createUniqueProjectSlug(title: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.ownerId, DEMO_OWNER_ID), eq(projects.slug, candidate)))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function revalidateWorkspace(projectSlug?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/feedback");
  revalidatePath(`/p/${DEMO_OWNER_HANDLE}`);

  if (projectSlug) {
    revalidatePath(`/p/${DEMO_OWNER_HANDLE}/${projectSlug}`);
  }
}

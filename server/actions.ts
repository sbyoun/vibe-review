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
  slugifyProjectTitle,
} from "@/lib/domain";
import { ensureDemoData } from "@/server/data";
import { requireCurrentUser } from "@/server/current-user";

export async function updateCurrentUserProfile(formData: FormData) {
  await ensureDemoData();
  const currentUser = await requireCurrentUser();

  const name = readRequiredString(formData, "name").slice(0, 120);
  const handle = createProfileHandle(readRequiredString(formData, "handle"));
  const bio = readOptionalString(formData, "bio")?.slice(0, 600);
  const primaryRoles = parseCommaList(formData.get("primaryRoles"));
  const toolsUsed = parseCommaList(formData.get("toolsUsed"));

  const [handleOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  if (handleOwner && handleOwner.id !== currentUser.id) {
    throw new Error("Handle is already taken");
  }

  const projectRows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.ownerId, currentUser.id));

  await db
    .update(users)
    .set({
      name,
      handle,
      bio,
      primaryRoles,
      toolsUsed,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/feedback");
  revalidatePath("/discover");
  revalidatePath(`/p/${currentUser.handle}`);
  revalidatePath(`/p/${handle}`);

  for (const project of projectRows) {
    revalidatePath(`/p/${currentUser.handle}/${project.slug}`);
    revalidatePath(`/p/${handle}/${project.slug}`);
  }

  redirect("/settings?profile=updated");
}

export async function createProject(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const title = readRequiredString(formData, "title").slice(0, 160);
  const summary = readRequiredString(formData, "summary").slice(0, 500);
  const description = readOptionalString(formData, "description");
  const status = coerceProjectStatus(formData.get("status"));
  const visibility = coerceProjectVisibility(formData.get("visibility"));
  const demoUrl = readOptionalString(formData, "demoUrl");
  const repoUrl = readOptionalString(formData, "repoUrl");
  const tools = parseCommaList(formData.get("tools"));
  const slug = await createUniqueProjectSlug(title, owner.id);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: owner.id,
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
    actorId: owner.id,
    toStatus: status,
    note: "Project created",
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProjectStatus(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const toStatus = coerceProjectStatus(formData.get("status"));

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
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
      actorId: owner.id,
      fromStatus: project.status,
      toStatus,
      note: "Status changed from dashboard",
    });
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
}

export async function updateProjectDetails(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

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
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
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

  revalidateWorkspace(owner.handle, project.slug, project.id);
}

export async function createFeedbackRequest(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const feedbackTypes = coerceFeedbackTypes(formData.getAll("feedbackTypes"));
  const minFeedbackCount = coerceInt(formData.get("minFeedbackCount"), 3, 1, 20);
  const creditCost = coerceInt(formData.get("creditCost"), minFeedbackCount, 1, 20);
  const deadlineDays = coerceInt(formData.get("deadlineDays"), 2, 1, 30);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db.transaction(async (tx) => {
    const [ownerRow] = await tx.select().from(users).where(eq(users.id, owner.id)).limit(1);

    if (!ownerRow) {
      throw new Error("Owner not found");
    }

    if (ownerRow.feedbackCredits < creditCost) {
      throw new Error("Not enough feedback credits");
    }

    const [request] = await tx
      .insert(feedbackRequests)
      .values({
        projectId: project.id,
        requestedById: owner.id,
        feedbackTypes,
        creditCost,
        minFeedbackCount,
        deadlineAt: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000),
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
      note: "Feedback request opened",
    });
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
}

export async function claimFeedbackRequest(formData: FormData) {
  await ensureDemoData();
  const reviewer = await requireCurrentUser();

  const requestId = readRequiredString(formData, "requestId");

  const result = await db.transaction(async (tx) => {
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

    if (project.ownerId === reviewer.id) {
      throw new Error("You cannot claim feedback for your own project");
    }

    const [owner] = await tx
      .select({ handle: users.handle })
      .from(users)
      .where(eq(users.id, project.ownerId))
      .limit(1);

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
          eq(feedbackClaims.reviewerId, reviewer.id),
          eq(feedbackClaims.status, "claimed"),
        ),
      )
      .limit(1);

    if (existingClaim) {
      return { claim: existingClaim, ownerHandle: owner?.handle ?? null, projectSlug: project.slug };
    }

    const dueAt = new Date(
      Math.min(request.deadlineAt.getTime(), now.getTime() + 24 * 60 * 60 * 1000),
    );

    const [claim] = await tx
      .insert(feedbackClaims)
      .values({
        requestId: request.id,
        projectId: project.id,
        reviewerId: reviewer.id,
        dueAt,
        status: "claimed",
      })
      .returning();

    return {
      claim,
      ownerHandle: owner?.handle ?? null,
      projectSlug: project.slug,
    };
  });

  revalidateWorkspace(result.ownerHandle, result.projectSlug);

  if (result.claim) {
    redirect("/feedback");
  }
}

export async function cancelFeedbackClaim(formData: FormData) {
  await ensureDemoData();
  const reviewer = await requireCurrentUser();

  const claimId = readRequiredString(formData, "claimId");
  const [claim] = await db
    .select()
    .from(feedbackClaims)
    .where(
      and(
        eq(feedbackClaims.id, claimId),
        eq(feedbackClaims.reviewerId, reviewer.id),
        eq(feedbackClaims.status, "claimed"),
      ),
    )
    .limit(1);

  if (claim) {
    await db
      .update(feedbackClaims)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(feedbackClaims.id, claim.id));

    const [project] = await db
      .select({
        slug: projects.slug,
        ownerHandle: users.handle,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, claim.projectId))
      .limit(1);

    revalidateWorkspace(project?.ownerHandle, project?.slug);
    return;
  }

  revalidatePath("/discover");
  revalidatePath("/feedback");
}

export async function createFeedback(formData: FormData) {
  await ensureDemoData();
  const reviewer = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const requestId = readOptionalString(formData, "requestId");
  const claimId = readOptionalString(formData, "claimId");
  const authorName = readOptionalString(formData, "authorName")?.slice(0, 120);
  const body = readRequiredString(formData, "body").slice(0, 2000);
  const feedbackType = coerceFeedbackType(formData.get("feedbackType"));
  const rating = coerceInt(formData.get("rating"), 4, 1, 5);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (!project || project.visibility === "private") {
    throw new Error("Project not found");
  }

  if (project.ownerId === reviewer.id) {
    throw new Error("You cannot leave feedback on your own project");
  }

  const [owner] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, project.ownerId))
    .limit(1);

  await db.transaction(async (tx) => {
    const now = new Date();
    const [claim] = claimId
      ? await tx
          .select()
          .from(feedbackClaims)
          .where(
            and(
              eq(feedbackClaims.id, claimId),
              eq(feedbackClaims.reviewerId, reviewer.id),
              eq(feedbackClaims.projectId, project.id),
              eq(feedbackClaims.status, "claimed"),
            ),
          )
          .limit(1)
      : [];

    if (claimId && !claim) {
      throw new Error("Feedback claim not found");
    }

    if (claim && claim.dueAt.getTime() <= now.getTime()) {
      await tx
        .update(feedbackClaims)
        .set({ status: "expired", updatedAt: now })
        .where(eq(feedbackClaims.id, claim.id));
      throw new Error("Feedback claim has expired");
    }

    const [request] = requestId
      ? await tx
          .select()
          .from(feedbackRequests)
          .where(and(eq(feedbackRequests.id, requestId), eq(feedbackRequests.projectId, project.id)))
          .limit(1)
      : [];

    if (requestId && !request) {
      throw new Error("Feedback request not found");
    }

    if (claim && request && claim.requestId !== request.id) {
      throw new Error("Feedback claim does not match this request");
    }

    const [activeRequest] = !claim
      ? await tx
          .select({ id: feedbackRequests.id })
          .from(feedbackRequests)
          .where(
            and(eq(feedbackRequests.projectId, project.id), eq(feedbackRequests.status, "open")),
          )
          .limit(1)
      : [];

    if (!claim && activeRequest) {
      throw new Error("Claim this feedback request before submitting feedback");
    }

    const effectiveRequestId = claim?.requestId ?? request?.id;

    const [reviewerRow] = await tx
      .select({
        name: users.name,
        feedbackCredits: users.feedbackCredits,
        reputationScore: users.reputationScore,
      })
      .from(users)
      .where(eq(users.id, reviewer.id))
      .limit(1);

    if (!reviewerRow) {
      throw new Error("Reviewer not found");
    }

    const [entry] = await tx
      .insert(feedback)
      .values({
        projectId: project.id,
        requestId: effectiveRequestId,
        authorId: reviewer.id,
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

    const nextBalance = reviewerRow.feedbackCredits + 1;

    await tx
      .update(users)
      .set({
        name: reviewerRow.name ?? authorName ?? reviewer.handle,
        feedbackCredits: nextBalance,
        reputationScore: reviewerRow.reputationScore + 1,
        updatedAt: now,
      })
      .where(eq(users.id, reviewer.id));

    await tx.insert(creditLedger).values({
      userId: reviewer.id,
      actorId: reviewer.id,
      amount: 1,
      reason: "earned_feedback",
      relatedRequestId: effectiveRequestId,
      relatedFeedbackId: entry.id,
      idempotencyKey: `feedback:${entry.id}:earn`,
      balanceAfter: nextBalance,
    });

    if (effectiveRequestId) {
      const [requestToCount] = await tx
        .select({ minFeedbackCount: feedbackRequests.minFeedbackCount })
        .from(feedbackRequests)
        .where(eq(feedbackRequests.id, effectiveRequestId))
        .limit(1);

      const [{ value: receivedCount }] = await tx
        .select({ value: count() })
        .from(feedback)
        .where(eq(feedback.requestId, effectiveRequestId));

      if (requestToCount && receivedCount >= requestToCount.minFeedbackCount) {
        await tx
          .update(feedbackRequests)
          .set({ status: "fulfilled", fulfilledAt: new Date(), updatedAt: new Date() })
          .where(eq(feedbackRequests.id, effectiveRequestId));
      }
    }
  });

  revalidateWorkspace(owner?.handle, project.slug, project.id);
}

export async function updateFeedbackImplementation(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const feedbackId = readRequiredString(formData, "feedbackId");
  const status = coerceImplementationStatus(formData.get("implementedStatus"));

  const [entry] = await db.select().from(feedback).where(eq(feedback.id, feedbackId)).limit(1);

  if (!entry) {
    throw new Error("Feedback not found");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, entry.projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new Error("Feedback not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(feedback)
      .set({ implementedStatus: status, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId));

    await tx.insert(feedbackImplementationEvents).values({
      feedbackId,
      actorId: owner.id,
      status,
      note: "Implementation status updated",
    });
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
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

function createProfileHandle(input: string) {
  const handle = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (handle.length < 2) {
    throw new Error("Handle must be at least 2 characters");
  }

  return handle;
}

function revalidateWorkspace(
  ownerHandle?: string | null,
  projectSlug?: string,
  projectId?: string,
) {
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

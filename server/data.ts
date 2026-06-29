import { and, asc, desc, eq, inArray, like, lt } from "drizzle-orm";

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
import { hashPassword } from "@/lib/auth/password";
import { getOptionalCurrentUser, requireCurrentUser } from "@/server/current-user";

export const DEMO_OWNER_ID = "demo-owner";
export const DEMO_OWNER_HANDLE = "aya";
export const DEMO_REVIEWER_ID = "demo-reviewer";
export const DEMO_PASSWORD = "password123";

const legacySeedProjectIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

export async function ensureDemoData() {
  await db
    .insert(users)
    .values({
      id: DEMO_OWNER_ID,
      name: "Aya Kim",
      email: "aya@example.test",
      handle: DEMO_OWNER_HANDLE,
      bio: "Building small AI-coded tools and pushing the useful ones through feedback loops.",
      primaryRoles: ["Builder", "Product reviewer"],
      toolsUsed: ["Codex", "Claude Code", "Cursor", "Vercel"],
      feedbackCredits: 12,
      reputationScore: 42,
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: DEMO_REVIEWER_ID,
      name: "Guest Reviewer",
      email: "reviewer@example.test",
      handle: "guest-reviewer",
      bio: "Default demo reviewer for public feedback submissions.",
      primaryRoles: ["Reviewer"],
      toolsUsed: ["Browser"],
      feedbackCredits: 0,
      reputationScore: 0,
    })
    .onConflictDoNothing();

  await Promise.all([
    ensureLocalPassword(DEMO_OWNER_ID, DEMO_PASSWORD),
    ensureLocalPassword(DEMO_REVIEWER_ID, DEMO_PASSWORD),
  ]);

  await cleanupLegacyDemoData();
  await expireStaleFeedbackWork();
}

async function ensureLocalPassword(userId: string, password: string) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.passwordHash) {
    return;
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

async function cleanupLegacyDemoData() {
  await db.delete(creditLedger).where(like(creditLedger.idempotencyKey, "seed-%"));
  await db.delete(projects).where(inArray(projects.id, legacySeedProjectIds));

  await db
    .update(users)
    .set({
      bio: "Use this account to try the workspace flow with your own projects.",
      feedbackCredits: 10,
      reputationScore: 0,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, DEMO_OWNER_ID), eq(users.reputationScore, 42)));
}

async function expireStaleFeedbackWork() {
  const now = new Date();

  await db
    .update(feedbackClaims)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(feedbackClaims.status, "claimed"), lt(feedbackClaims.dueAt, now)));

  await db
    .update(feedbackRequests)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(feedbackRequests.status, "open"), lt(feedbackRequests.deadlineAt, now)));
}

export async function getWorkspaceData() {
  await ensureDemoData();

  const owner = await requireCurrentUser();
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, owner.id))
    .orderBy(desc(projects.lastActivityAt), asc(projects.title));

  const projectIds = projectRows.map((project) => project.id);
  const requestRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(feedbackRequests)
          .where(inArray(feedbackRequests.projectId, projectIds))
          .orderBy(desc(feedbackRequests.createdAt))
      : [];

  const feedbackRows =
    projectIds.length > 0
      ? await db
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
          })
          .from(feedback)
          .innerJoin(users, eq(feedback.authorId, users.id))
          .where(inArray(feedback.projectId, projectIds))
          .orderBy(desc(feedback.createdAt))
      : [];

  const ledgerRows = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, owner.id))
    .orderBy(desc(creditLedger.createdAt))
    .limit(8);

  const statusRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(projectStatusEvents)
          .where(inArray(projectStatusEvents.projectId, projectIds))
          .orderBy(desc(projectStatusEvents.createdAt))
          .limit(12)
      : [];

  return {
    owner,
    projects: projectRows.map((project) => decorateProject(project, requestRows, feedbackRows)),
    requests: requestRows.map((request) => decorateRequest(request, projectRows, feedbackRows)),
    feedback: feedbackRows,
    creditLedger: ledgerRows,
    statusEvents: statusRows,
  };
}

export async function getWorkspaceProjectData(projectId: string) {
  await ensureDemoData();

  const owner = await requireCurrentUser();
  const [projectRow] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!projectRow) {
    return null;
  }

  const requestRows = await db
    .select()
    .from(feedbackRequests)
    .where(eq(feedbackRequests.projectId, projectRow.id))
    .orderBy(desc(feedbackRequests.createdAt));

  const feedbackRows = await db
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
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .where(eq(feedback.projectId, projectRow.id))
    .orderBy(desc(feedback.createdAt));

  const statusRows = await db
    .select()
    .from(projectStatusEvents)
    .where(eq(projectStatusEvents.projectId, projectRow.id))
    .orderBy(desc(projectStatusEvents.createdAt))
    .limit(20);

  return {
    owner,
    project: decorateProject(projectRow, requestRows, feedbackRows),
    requests: requestRows.map((request) => decorateRequest(request, [projectRow], feedbackRows)),
    feedback: feedbackRows,
    statusEvents: statusRows,
  };
}

export async function getFeedbackQueueData() {
  const workspace = await getWorkspaceData();
  const assignedClaims = await getAssignedFeedbackClaims(workspace.owner.id);

  return {
    ...workspace,
    assignedClaims,
    requests: workspace.requests.sort((a, b) => {
      if (a.status === b.status) {
        return a.deadlineAt.getTime() - b.deadlineAt.getTime();
      }

      return a.status === "open" ? -1 : 1;
    }),
  };
}

async function getAssignedFeedbackClaims(reviewerId: string) {
  await ensureDemoData();

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
    .where(and(eq(feedbackClaims.reviewerId, reviewerId), eq(feedbackClaims.status, "claimed")))
    .orderBy(asc(feedbackClaims.dueAt), desc(feedbackClaims.createdAt));

  const requestIds = rows.map((row) => row.request.id);
  const requestFeedbackRows =
    requestIds.length > 0
      ? await db.select().from(feedback).where(inArray(feedback.requestId, requestIds))
      : [];

  return rows.map((row) => ({
    ...row.claim,
    request: decorateRequest(row.request, [row.project], requestFeedbackRows),
    project: decorateProject(row.project, [row.request], requestFeedbackRows),
    owner: row.owner,
  }));
}

export async function getDiscoverData() {
  await ensureDemoData();

  const viewer = await getOptionalCurrentUser();
  const rows = await db
    .select({
      request: feedbackRequests,
      project: projects,
      owner: users,
    })
    .from(feedbackRequests)
    .innerJoin(projects, eq(feedbackRequests.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(eq(feedbackRequests.status, "open"), eq(projects.visibility, "public")))
    .orderBy(asc(feedbackRequests.deadlineAt), desc(feedbackRequests.createdAt));

  const requestIds = rows.map((row) => row.request.id);
  const feedbackRows =
    requestIds.length > 0
      ? await db.select().from(feedback).where(inArray(feedback.requestId, requestIds))
      : [];
  const claimRows =
    requestIds.length > 0
      ? await db
          .select()
          .from(feedbackClaims)
          .where(inArray(feedbackClaims.requestId, requestIds))
      : [];

  const cards = rows.map((row) => {
    const receivedCount = feedbackRows.filter(
      (entry) => entry.requestId === row.request.id,
    ).length;
    const activeClaims = claimRows.filter(
      (claim) => claim.requestId === row.request.id && claim.status === "claimed",
    );
    const viewerClaim =
      viewer ? activeClaims.find((claim) => claim.reviewerId === viewer.id) ?? null : null;

    return {
      ...row.request,
      project: decorateProject(row.project, [row.request], feedbackRows),
      owner: row.owner,
      viewerClaim,
      isOwnRequest: viewer?.id === row.project.ownerId,
      activeClaimCount: activeClaims.length,
      receivedCount,
      missingCount: Math.max(0, row.request.minFeedbackCount - receivedCount),
      progressPercent: Math.min(
        100,
        Math.round((receivedCount / row.request.minFeedbackCount) * 100),
      ),
    };
  });

  return {
    viewer,
    requests: cards,
    stats: {
      openRequests: cards.length,
      neededFeedback: cards.reduce((total, card) => total + card.missingCount, 0),
      publicProjects: new Set(cards.map((card) => card.projectId)).size,
    },
  };
}

export async function getPublicProfileData(handle: string) {
  await ensureDemoData();

  const [profile] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);

  if (!profile) {
    return null;
  }

  const projectRows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, profile.id), eq(projects.visibility, "public")))
    .orderBy(desc(projects.lastActivityAt));

  const projectIds = projectRows.map((project) => project.id);
  const requestRows =
    projectIds.length > 0
      ? await db.select().from(feedbackRequests).where(inArray(feedbackRequests.projectId, projectIds))
      : [];
  const feedbackRows =
    projectIds.length > 0
      ? await db.select().from(feedback).where(inArray(feedback.projectId, projectIds))
      : [];

  return {
    profile,
    projects: projectRows.map((project) => decorateProject(project, requestRows, feedbackRows)),
    requests: requestRows.map((request) => decorateRequest(request, projectRows, feedbackRows)),
  };
}

export async function getPublicProjectData(handle: string, slug: string) {
  const profileData = await getPublicProfileData(handle);
  const viewer = await getOptionalCurrentUser();

  if (!profileData) {
    return null;
  }

  const project = profileData.projects.find((item) => item.slug === slug);

  if (!project) {
    return null;
  }

  const requestRows = await db
    .select()
    .from(feedbackRequests)
    .where(eq(feedbackRequests.projectId, project.id))
    .orderBy(desc(feedbackRequests.createdAt));

  const feedbackRows = await db
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
      authorBio: users.bio,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .where(eq(feedback.projectId, project.id))
    .orderBy(desc(feedback.createdAt));

  const decoratedRequests = requestRows.map((request) =>
    decorateRequest(request, [project], feedbackRows),
  );
  const activeRequest =
    decoratedRequests.find((request) => request.status === "open") ??
    decoratedRequests[0] ??
    null;
  const [viewerClaim] = activeRequest
    && viewer
    ? await db
        .select()
        .from(feedbackClaims)
        .where(
          and(
            eq(feedbackClaims.requestId, activeRequest.id),
            eq(feedbackClaims.reviewerId, viewer.id),
            eq(feedbackClaims.status, "claimed"),
          ),
        )
        .limit(1)
    : [];

  return {
    profile: profileData.profile,
    viewer,
    project: decorateProject(project, requestRows, feedbackRows),
    request: activeRequest,
    viewerClaim: viewerClaim ?? null,
    feedback: feedbackRows,
  };
}

function decorateProject<
  TProject extends { id: string; status: string; visibility: string },
  TRequest extends { projectId: string },
  TFeedback extends { projectId: string; implementedStatus?: string | null },
>(project: TProject, requestRows: TRequest[], feedbackRows: TFeedback[]) {
  const projectFeedback = feedbackRows.filter((entry) => entry.projectId === project.id);

  return {
    ...project,
    feedbackCount: projectFeedback.length,
    implementedCount: projectFeedback.filter((entry) => entry.implementedStatus === "implemented")
      .length,
    requestCount: requestRows.filter((request) => request.projectId === project.id).length,
  };
}

function decorateRequest<
  TRequest extends {
    id: string;
    projectId: string;
    minFeedbackCount: number;
    status: string;
  },
  TProject extends { id: string; title: string; slug: string },
  TFeedback extends { requestId?: string | null },
>(request: TRequest, projectRows: TProject[], feedbackRows: TFeedback[]) {
  const project = projectRows.find((item) => item.id === request.projectId);
  const receivedCount = feedbackRows.filter((entry) => entry.requestId === request.id).length;

  return {
    ...request,
    projectTitle: project?.title ?? "Unknown project",
    projectSlug: project?.slug ?? "",
    receivedCount,
    isFulfilled: receivedCount >= request.minFeedbackCount || request.status === "fulfilled",
  };
}

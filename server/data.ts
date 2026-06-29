import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  creditLedger,
  feedback,
  feedbackRequests,
  projectStatusEvents,
  projects,
  users,
} from "@/db/schema";
import type { FeedbackType } from "@/lib/domain";

export const DEMO_OWNER_ID = "demo-owner";
export const DEMO_OWNER_HANDLE = "aya";
export const DEMO_REVIEWER_ID = "demo-reviewer";

const seedProjects = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Launch Archive",
    slug: "launch-archive",
    summary: "A public archive for small AI-built product launches and feedback rounds.",
    description:
      "Launch Archive tracks tiny products, demo links, feedback requests, and iteration state in one public workspace.",
    status: "needs_feedback" as const,
    visibility: "public" as const,
    demoUrl: "https://example.com/launch-archive",
    repoUrl: "https://github.com/example/launch-archive",
    tools: ["Next.js", "Claude Code", "Vercel"],
    feedbackFocus: ["first_impression", "ux_ui", "mobile_usability"] as FeedbackType[],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Billing Notes",
    slug: "billing-notes",
    summary: "A renewal-risk notebook for SaaS invoices and contract context.",
    description:
      "Billing Notes turns invoices, renewal dates, and owner comments into a simple review queue.",
    status: "iterating" as const,
    visibility: "public" as const,
    demoUrl: "https://example.com/billing-notes",
    repoUrl: "https://github.com/example/billing-notes",
    tools: ["Cursor", "Postgres", "Resend"],
    feedbackFocus: ["business", "first_impression"] as FeedbackType[],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Research Desk",
    slug: "research-desk",
    summary: "A private dashboard for collecting research links and review notes.",
    description:
      "Research Desk is still private while the upload and citation review states are being tightened.",
    status: "building" as const,
    visibility: "unlisted" as const,
    demoUrl: "https://example.com/research-desk",
    repoUrl: "https://github.com/example/research-desk",
    tools: ["Codex", "Drizzle", "R2"],
    feedbackFocus: ["ux_ui", "code_structure"] as FeedbackType[],
  },
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

  const [{ value: projectCount }] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.ownerId, DEMO_OWNER_ID));

  if (projectCount === 0) {
    await db.insert(projects).values(
      seedProjects.map((project) => ({
        ...project,
        ownerId: DEMO_OWNER_ID,
        lastActivityAt: new Date(),
      })),
    );

    await db.insert(projectStatusEvents).values(
      seedProjects.map((project) => ({
        projectId: project.id,
        actorId: DEMO_OWNER_ID,
        toStatus: project.status,
        note: "Seeded demo project",
      })),
    );

    const [request] = await db
      .insert(feedbackRequests)
      .values({
        projectId: seedProjects[0].id,
        requestedById: DEMO_OWNER_ID,
        feedbackTypes: ["first_impression", "ux_ui"],
        creditCost: 3,
        minFeedbackCount: 3,
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        status: "open",
      })
      .returning();

    await db.insert(creditLedger).values({
      userId: DEMO_OWNER_ID,
      actorId: DEMO_OWNER_ID,
      amount: -3,
      reason: "spent_feedback_request",
      relatedRequestId: request.id,
      idempotencyKey: `seed-request-${request.id}`,
      balanceAfter: 9,
    });

    await db.insert(feedback).values({
      projectId: seedProjects[0].id,
      requestId: request.id,
      authorId: DEMO_REVIEWER_ID,
      feedbackType: "mobile_usability",
      body: "The archive card hierarchy is clear, but the mobile action area needs more spacing.",
      rating: 4,
      helpfulStatus: "helpful",
      implementedStatus: "planned",
    });

    await db.insert(creditLedger).values({
      userId: DEMO_REVIEWER_ID,
      actorId: DEMO_REVIEWER_ID,
      amount: 1,
      reason: "earned_feedback",
      relatedRequestId: request.id,
      idempotencyKey: `seed-feedback-${request.id}`,
      balanceAfter: 1,
    });
  }
}

export async function getDemoOwner() {
  await ensureDemoData();

  const [owner] = await db.select().from(users).where(eq(users.id, DEMO_OWNER_ID)).limit(1);

  if (!owner) {
    throw new Error("Demo owner was not created");
  }

  return owner;
}

export async function getWorkspaceData() {
  const owner = await getDemoOwner();
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

export async function getFeedbackQueueData() {
  const workspace = await getWorkspaceData();

  return {
    ...workspace,
    requests: workspace.requests.sort((a, b) => {
      if (a.status === b.status) {
        return a.deadlineAt.getTime() - b.deadlineAt.getTime();
      }

      return a.status === "open" ? -1 : 1;
    }),
  };
}

export async function getDiscoverData() {
  await ensureDemoData();

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

  const cards = rows.map((row) => {
    const receivedCount = feedbackRows.filter(
      (entry) => entry.requestId === row.request.id,
    ).length;

    return {
      ...row.request,
      project: decorateProject(row.project, [row.request], feedbackRows),
      owner: row.owner,
      receivedCount,
      missingCount: Math.max(0, row.request.minFeedbackCount - receivedCount),
      progressPercent: Math.min(
        100,
        Math.round((receivedCount / row.request.minFeedbackCount) * 100),
      ),
    };
  });

  return {
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

  return {
    profile: profileData.profile,
    project: decorateProject(project, requestRows, feedbackRows),
    request:
      decoratedRequests.find((request) => request.status === "open") ??
      decoratedRequests[0] ??
      null,
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

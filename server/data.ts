import { and, asc, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  creditLedger,
  feedback,
  feedbackClaims,
  feedbackRequests,
  projectFavorites,
  projectRevisions,
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

export async function ensureDemoData() {
  await ensureAppSchema();

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

async function ensureAppSchema() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type') THEN
        CREATE TYPE "project_type" AS ENUM ('owned', 'external');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_visibility') THEN
        CREATE TYPE "feedback_visibility" AS ENUM ('public', 'private');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_kind') THEN
        CREATE TYPE "feedback_kind" AS ENUM ('feedback', 'self_note', 'todo', 'decision', 'update', 'release');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_action_status') THEN
        CREATE TYPE "feedback_action_status" AS ENUM ('none', 'open', 'doing', 'done', 'dropped');
      END IF;
    END $$
  `);

  await db.execute(sql`
    ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "submitted_by_id" text REFERENCES "users"("id") ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS "project_type" "project_type" DEFAULT 'owned' NOT NULL,
      ADD COLUMN IF NOT EXISTS "external_owner_name" varchar(160),
      ADD COLUMN IF NOT EXISTS "external_owner_url" text,
      ADD COLUMN IF NOT EXISTS "claimed_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "source_url" text,
      ADD COLUMN IF NOT EXISTS "category_tags" text[] DEFAULT '{}'::text[] NOT NULL
  `);

  await db.execute(sql`
    UPDATE "projects"
    SET "submitted_by_id" = "owner_id"
    WHERE "submitted_by_id" IS NULL
  `);

  await db.execute(sql`
    ALTER TABLE "projects"
      ALTER COLUMN "submitted_by_id" SET NOT NULL
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "projects_submitted_by_idx"
      ON "projects" ("submitted_by_id")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "projects_project_type_idx"
      ON "projects" ("project_type")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "projects_claimed_by_idx"
      ON "projects" ("claimed_by_id")
  `);

  await db.execute(sql`
    ALTER TABLE "project_revisions"
      ADD COLUMN IF NOT EXISTS "project_type" "project_type" DEFAULT 'owned' NOT NULL,
      ADD COLUMN IF NOT EXISTS "external_owner_name" varchar(160),
      ADD COLUMN IF NOT EXISTS "external_owner_url" text,
      ADD COLUMN IF NOT EXISTS "source_url" text,
      ADD COLUMN IF NOT EXISTS "category_tags" text[] DEFAULT '{}'::text[] NOT NULL
  `);

  await db.execute(sql`
    ALTER TABLE "feedback"
      ADD COLUMN IF NOT EXISTS "parent_feedback_id" uuid REFERENCES "feedback"("id") ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS "visibility" "feedback_visibility" DEFAULT 'public' NOT NULL,
      ADD COLUMN IF NOT EXISTS "kind" "feedback_kind" DEFAULT 'feedback' NOT NULL,
      ADD COLUMN IF NOT EXISTS "action_status" "feedback_action_status" DEFAULT 'none' NOT NULL
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "feedback_parent_feedback_id_idx"
      ON "feedback" ("parent_feedback_id")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "feedback_visibility_idx"
      ON "feedback" ("visibility")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "feedback_kind_idx"
      ON "feedback" ("kind")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "feedback_action_status_idx"
      ON "feedback" ("action_status")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "project_favorites" (
      "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL,
      PRIMARY KEY ("project_id", "user_id")
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "project_favorites_user_id_idx"
      ON "project_favorites" ("user_id")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "project_favorites_project_id_idx"
      ON "project_favorites" ("project_id")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "project_revisions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "source" varchar(40) DEFAULT 'web_update' NOT NULL,
      "title" varchar(160) NOT NULL,
      "summary" text NOT NULL,
      "description" text,
      "status" project_status NOT NULL,
      "visibility" project_visibility NOT NULL,
      "demo_url" text,
      "repo_url" text,
      "cover_image_object_key" text,
      "cover_image_url" text,
      "project_type" project_type DEFAULT 'owned' NOT NULL,
      "external_owner_name" varchar(160),
      "external_owner_url" text,
      "source_url" text,
      "tools" text[] DEFAULT '{}'::text[] NOT NULL,
      "category_tags" text[] DEFAULT '{}'::text[] NOT NULL,
      "feedback_focus" feedback_type[] DEFAULT '{}'::feedback_type[] NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "project_revisions_project_id_created_at_idx"
      ON "project_revisions" ("project_id", "created_at")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "project_revisions_actor_id_idx"
      ON "project_revisions" ("actor_id")
  `);
}

async function ensureLocalPassword(userId: string, password: string) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return;
  }

  if (user.passwordHash && user.emailVerified) {
    return;
  }

  await db
    .update(users)
    .set({
      passwordHash: user.passwordHash ?? (await hashPassword(password)),
      emailVerified: user.emailVerified ?? new Date(),
      updatedAt: new Date(),
    })
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
    .where(and(eq(projects.ownerId, owner.id), eq(projects.projectType, "owned")))
    .orderBy(desc(projects.lastActivityAt), asc(projects.title));
  const externalReviewRows = await getExternalReviewRows(owner.id);

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

  const visibleRequestRows = requestRows.filter((request) => request.status !== "cancelled");
  const favoriteRows =
    projectIds.length > 0
      ? await db
          .select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(inArray(projectFavorites.projectId, projectIds))
      : [];

  return {
    owner,
    projects: projectRows.map((project) =>
      decorateProject(project, visibleRequestRows, feedbackRows, favoriteRows),
    ),
    externalReviews: externalReviewRows,
    requests: requestRows.map((request) =>
      decorateRequest(request, projectRows, feedbackRows),
    ).filter((request) => request.status !== "cancelled"),
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
      createdAt: projectRevisions.createdAt,
      actorName: users.name,
      actorHandle: users.handle,
    })
    .from(projectRevisions)
    .leftJoin(users, eq(projectRevisions.actorId, users.id))
    .where(eq(projectRevisions.projectId, projectRow.id))
    .orderBy(desc(projectRevisions.createdAt))
    .limit(30);

  const visibleRequestRows = requestRows.filter((request) => request.status !== "cancelled");
  const favoriteRows = await db
    .select({ projectId: projectFavorites.projectId })
    .from(projectFavorites)
    .where(eq(projectFavorites.projectId, projectRow.id));

  return {
    owner,
    project: decorateProject(projectRow, visibleRequestRows, feedbackRows, favoriteRows),
    requests: requestRows.map((request) =>
      decorateRequest(request, [projectRow], feedbackRows),
    ).filter((request) => request.status !== "cancelled"),
    feedback: feedbackRows,
    statusEvents: statusRows,
    revisions: revisionRows,
  };
}

export async function getFeedbackQueueData() {
  const workspace = await getWorkspaceData();
  const authoredFeedback = await getAuthoredFeedbackRows(workspace.owner.id);

  return {
    ...workspace,
    assignedClaims: [],
    authoredFeedback,
    requests: workspace.requests.sort((a, b) => {
      if (a.status === b.status) {
        return a.deadlineAt.getTime() - b.deadlineAt.getTime();
      }

      return a.status === "open" ? -1 : 1;
    }),
  };
}

async function getAuthoredFeedbackRows(authorId: string, publicOnly = false) {
  return db
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
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectVisibility: projects.visibility,
      ownerHandle: users.handle,
      ownerName: users.name,
    })
    .from(feedback)
    .innerJoin(projects, eq(feedback.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(
      publicOnly
        ? and(
            eq(feedback.authorId, authorId),
            eq(projects.visibility, "public"),
            eq(feedback.visibility, "public"),
          )
        : eq(feedback.authorId, authorId),
    )
    .orderBy(desc(feedback.createdAt))
    .limit(30);
}

export async function getDiscoverData() {
  await ensureDemoData();

  const viewer = await getOptionalCurrentUser();
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
  const requestRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(feedbackRequests)
          .where(inArray(feedbackRequests.projectId, projectIds))
          .orderBy(asc(feedbackRequests.deadlineAt), desc(feedbackRequests.createdAt))
      : [];
  const requestIds = requestRows.map((request) => request.id);
  const feedbackRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(feedback)
          .where(and(inArray(feedback.projectId, projectIds), eq(feedback.visibility, "public")))
      : [];
  const claimRows =
    requestIds.length > 0
      ? await db
          .select()
          .from(feedbackClaims)
          .where(inArray(feedbackClaims.requestId, requestIds))
      : [];
  const favoriteRows =
    projectIds.length > 0
      ? await db
          .select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(inArray(projectFavorites.projectId, projectIds))
      : [];

  const decorateDiscoverRequest = (request: (typeof requestRows)[number], projectOwnerId: string) => {
    const receivedCount = feedbackRows.filter(
      (entry) => entry.requestId === request.id,
    ).length;
    const activeClaims = claimRows.filter(
      (claim) => claim.requestId === request.id && claim.status === "claimed",
    );
    const viewerClaim =
      viewer ? activeClaims.find((claim) => claim.reviewerId === viewer.id) ?? null : null;

    return {
      ...request,
      viewerClaim,
      isOwnRequest: viewer?.id === projectOwnerId,
      activeClaimCount: activeClaims.length,
      receivedCount,
      missingCount: Math.max(0, request.minFeedbackCount - receivedCount),
      progressPercent: Math.min(
        100,
        Math.round((receivedCount / request.minFeedbackCount) * 100),
      ),
    };
  };

  const cards = projectRows.map((row) => {
    const projectRequests = requestRows.filter(
      (request) => request.projectId === row.project.id && request.status !== "cancelled",
    );
    const openRequest = projectRequests.find((request) => request.status === "open") ?? null;

    return {
      project: decorateProject(row.project, projectRequests, feedbackRows, favoriteRows),
      owner: row.owner,
      request: openRequest ? decorateDiscoverRequest(openRequest, row.project.ownerId) : null,
      isOwnProject: viewer?.id === row.project.ownerId,
    };
  });
  const openRequestCards = cards.flatMap((card) => (card.request ? [card.request] : []));

  return {
    viewer,
    projects: cards,
    requests: openRequestCards,
    stats: {
      openRequests: openRequestCards.length,
      neededFeedback: openRequestCards.reduce((total, request) => total + request.missingCount, 0),
      publicProjects: cards.length,
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
    .where(
      and(
        eq(projects.ownerId, profile.id),
        eq(projects.projectType, "owned"),
        eq(projects.visibility, "public"),
      ),
    )
    .orderBy(desc(projects.lastActivityAt));
  const externalReviewRows = await getExternalReviewRows(profile.id, true);

  const projectIds = projectRows.map((project) => project.id);
  const requestRows =
    projectIds.length > 0
      ? await db.select().from(feedbackRequests).where(inArray(feedbackRequests.projectId, projectIds))
      : [];
  const visibleRequestRows = requestRows.filter((request) => request.status !== "cancelled");
  const feedbackRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(feedback)
          .where(and(inArray(feedback.projectId, projectIds), eq(feedback.visibility, "public")))
      : [];
  const authoredFeedbackRows = await getAuthoredFeedbackRows(profile.id, true);
  const favoriteProjectRows = await getFavoriteProjectRows(profile.id);
  const favoriteRows =
    projectIds.length > 0
      ? await db
          .select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(inArray(projectFavorites.projectId, projectIds))
      : [];

  return {
    profile,
    projects: projectRows.map((project) =>
      decorateProject(project, visibleRequestRows, feedbackRows, favoriteRows),
    ),
    externalReviews: externalReviewRows,
    requests: visibleRequestRows.map((request) =>
      decorateRequest(request, projectRows, feedbackRows),
    ),
    authoredFeedback: authoredFeedbackRows,
    favoriteProjects: favoriteProjectRows,
  };
}

async function getExternalReviewRows(userId: string, publicOnly = false) {
  const projectRows = await db
    .select()
    .from(projects)
    .where(
      publicOnly
        ? and(
            eq(projects.submittedById, userId),
            eq(projects.projectType, "external"),
            eq(projects.visibility, "public"),
          )
        : and(eq(projects.submittedById, userId), eq(projects.projectType, "external")),
    )
    .orderBy(desc(projects.lastActivityAt), asc(projects.title));

  const projectIds = projectRows.map((project) => project.id);
  const feedbackRows =
    projectIds.length > 0
      ? await db
          .select()
          .from(feedback)
          .where(
            publicOnly
              ? and(inArray(feedback.projectId, projectIds), eq(feedback.visibility, "public"))
              : inArray(feedback.projectId, projectIds),
          )
      : [];
  const favoriteRows =
    projectIds.length > 0
      ? await db
          .select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(inArray(projectFavorites.projectId, projectIds))
      : [];

  return projectRows.map((project) => decorateProject(project, [], feedbackRows, favoriteRows));
}

async function getFavoriteProjectRows(userId: string) {
  return db
    .select({
      id: projects.id,
      title: projects.title,
      slug: projects.slug,
      summary: projects.summary,
      status: projects.status,
      visibility: projects.visibility,
      demoUrl: projects.demoUrl,
      repoUrl: projects.repoUrl,
      tools: projects.tools,
      lastActivityAt: projects.lastActivityAt,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      ownerHandle: users.handle,
      ownerName: users.name,
      favoritedAt: projectFavorites.createdAt,
    })
    .from(projectFavorites)
    .innerJoin(projects, eq(projectFavorites.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(eq(projectFavorites.userId, userId), eq(projects.visibility, "public")))
    .orderBy(desc(projectFavorites.createdAt))
    .limit(30);
}

export async function getPublicProjectData(handle: string, slug: string) {
  await ensureDemoData();
  const viewer = await getOptionalCurrentUser();
  const handleCandidates = routeParamCandidates(handle, { lowercase: true });
  const slugCandidates = routeParamCandidates(slug, { lowercase: true });

  const [row] = await db
    .select({
      profile: users,
      project: projects,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(inArray(users.handle, handleCandidates), inArray(projects.slug, slugCandidates)))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.project.visibility === "private" && viewer?.id !== row.profile.id) {
    return null;
  }

  const requestRows = await db
    .select()
    .from(feedbackRequests)
    .where(eq(feedbackRequests.projectId, row.project.id))
    .orderBy(desc(feedbackRequests.createdAt));

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
      authorBio: users.bio,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.authorId, users.id))
    .where(
      row.project.ownerId === viewer?.id
        ? eq(feedback.projectId, row.project.id)
        : and(
            eq(feedback.projectId, row.project.id),
            viewer
              ? or(eq(feedback.visibility, "public"), eq(feedback.authorId, viewer.id))
              : eq(feedback.visibility, "public"),
          ),
    )
    .orderBy(asc(feedback.createdAt));

  const favoriteRows = await db
    .select({
      projectId: projectFavorites.projectId,
      userId: projectFavorites.userId,
    })
    .from(projectFavorites)
    .where(eq(projectFavorites.projectId, row.project.id));

  const project = decorateProject(row.project, requestRows, feedbackRows, favoriteRows);
  const visibleRequestRows = requestRows.filter((request) => request.status !== "cancelled");
  const decoratedRequests = visibleRequestRows.map((request) =>
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
    profile: row.profile,
    viewer,
    project,
    request: activeRequest,
    viewerClaim: viewerClaim ?? null,
    viewerHasFavorited: viewer
      ? favoriteRows.some((favorite) => favorite.userId === viewer.id)
      : false,
    feedback: feedbackRows,
  };
}

function decorateProject<
  TProject extends { id: string; status: string; visibility: string },
  TRequest extends { projectId: string; status?: string },
  TFeedback extends { projectId: string; implementedStatus?: string | null },
  TFavorite extends { projectId: string },
>(
  project: TProject,
  requestRows: TRequest[],
  feedbackRows: TFeedback[],
  favoriteRows: TFavorite[] = [],
) {
  const projectFeedback = feedbackRows.filter((entry) => entry.projectId === project.id);
  const projectRequests = requestRows.filter(
    (request) => request.projectId === project.id && request.status !== "cancelled",
  );

  return {
    ...project,
    feedbackCount: projectFeedback.length,
    implementedCount: projectFeedback.filter((entry) => entry.implementedStatus === "implemented")
      .length,
    requestCount: projectRequests.length,
    favoriteCount: favoriteRows.filter((entry) => entry.projectId === project.id).length,
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

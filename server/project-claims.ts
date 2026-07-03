import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  feedback,
  projectOwnershipClaims,
  projectRevisions,
  projects,
  users,
} from "@/db/schema";
import { slugifyProjectTitle } from "@/lib/domain";
import { ApiError } from "@/server/mcp-api";
import {
  projectRevisionValues,
  type ProjectRevisionSource,
} from "@/server/project-revisions";

type ProjectClaimActor = {
  id: string;
  handle: string;
};

export async function requestExternalProjectOwnershipForUser(
  actor: ProjectClaimActor,
  projectId: string,
) {
  const [row] = await db
    .select({
      project: projects,
      owner: users,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  if (row.project.projectType !== "external") {
    throw new ApiError(409, "project_not_claimable", "Only external public project reviews can be claimed.");
  }

  if (row.project.ownerId === actor.id) {
    throw new ApiError(409, "already_project_owner", "You already manage this project post.");
  }

  if (row.project.claimedById) {
    throw new ApiError(409, "project_already_claimed", "This external project has already been claimed.");
  }

  if (row.project.visibility === "private") {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const [existing] = await db
    .select()
    .from(projectOwnershipClaims)
    .where(
      and(
        eq(projectOwnershipClaims.projectId, row.project.id),
        eq(projectOwnershipClaims.claimantId, actor.id),
        eq(projectOwnershipClaims.status, "pending"),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      requested: false,
      claim: existing,
      project: row.project,
      owner: row.owner,
      publicPath: projectPublicPath(row.owner.handle ?? row.owner.id, row.project.slug),
    };
  }

  const [claim] = await db
    .insert(projectOwnershipClaims)
    .values({
      projectId: row.project.id,
      claimantId: actor.id,
      status: "pending",
    })
    .returning();

  revalidateWorkspace(row.owner.handle, row.project.slug, row.project.id);
  revalidatePath(profilePath(actor.handle));

  return {
    requested: true,
    claim,
    project: row.project,
    owner: row.owner,
    publicPath: projectPublicPath(row.owner.handle ?? row.owner.id, row.project.slug),
  };
}

export async function approveExternalProjectOwnershipClaimForUser(
  actor: ProjectClaimActor,
  claimId: string,
  source: Extract<ProjectRevisionSource, "web_claim" | "mcp_claim">,
) {
  const row = await getClaimProjectRow(claimId);

  if (row.project.ownerId !== actor.id) {
    throw new ApiError(403, "claim_approval_forbidden", "Only the current project post owner can approve this claim.");
  }

  if (row.claim.status !== "pending") {
    throw new ApiError(409, "claim_not_pending", "This ownership claim is no longer pending.");
  }

  if (row.project.projectType !== "external" || row.project.claimedById) {
    throw new ApiError(409, "project_not_claimable", "This project can no longer be claimed.");
  }

  const claimant = await getUser(row.claim.claimantId);
  const nextSlug = await createUniqueClaimedProjectSlug(
    row.project.slug,
    claimant.id,
    row.project.id,
  );
  const now = new Date();

  const [updatedProject] = await db.transaction(async (tx) => {
    await tx.insert(projectRevisions).values(projectRevisionValues(row.project, actor.id, source));

    const [updated] = await tx
      .update(projects)
      .set({
        ownerId: claimant.id,
        projectType: "owned",
        claimedById: claimant.id,
        externalOwnerName: null,
        externalOwnerUrl: null,
        slug: nextSlug,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(projects.id, row.project.id))
      .returning();

    await tx
      .update(projectOwnershipClaims)
      .set({
        status: "approved",
        resolvedById: actor.id,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(projectOwnershipClaims.id, row.claim.id));

    await tx
      .insert(feedback)
      .values({
        projectId: row.project.id,
        authorId: actor.id,
        feedbackType: "first_impression",
        body: `Ownership claim approved for @${claimant.handle}.`,
        rating: null,
        helpfulStatus: "unreviewed",
        implementedStatus: "unreviewed",
        visibility: "public",
        kind: "update",
      });

    return [updated];
  });

  const previousOwnerHandle = row.owner.handle ?? row.owner.id;

  revalidateWorkspace(previousOwnerHandle, row.project.slug, row.project.id);
  revalidateWorkspace(claimant.handle, updatedProject.slug, updatedProject.id);

  return {
    approved: true,
    claimId: row.claim.id,
    project: updatedProject,
    claimant,
    previousOwner: row.owner,
    previousPublicPath: projectPublicPath(previousOwnerHandle, row.project.slug),
    publicPath: projectPublicPath(claimant.handle, updatedProject.slug),
  };
}

export async function rejectExternalProjectOwnershipClaimForUser(
  actor: ProjectClaimActor,
  claimId: string,
) {
  const row = await getClaimProjectRow(claimId);

  if (row.project.ownerId !== actor.id) {
    throw new ApiError(403, "claim_rejection_forbidden", "Only the current project post owner can reject this claim.");
  }

  if (row.claim.status !== "pending") {
    throw new ApiError(409, "claim_not_pending", "This ownership claim is no longer pending.");
  }

  const now = new Date();
  const [claim] = await db
    .update(projectOwnershipClaims)
    .set({
      status: "rejected",
      resolvedById: actor.id,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(projectOwnershipClaims.id, row.claim.id))
    .returning();

  revalidateWorkspace(row.owner.handle, row.project.slug, row.project.id);

  return {
    rejected: true,
    claim,
    project: row.project,
    publicPath: projectPublicPath(row.owner.handle ?? row.owner.id, row.project.slug),
  };
}

async function getClaimProjectRow(claimId: string) {
  const [row] = await db
    .select({
      claim: projectOwnershipClaims,
      project: projects,
      owner: users,
    })
    .from(projectOwnershipClaims)
    .innerJoin(projects, eq(projectOwnershipClaims.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projectOwnershipClaims.id, claimId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "ownership_claim_not_found", "Ownership claim was not found.");
  }

  return row;
}

async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.handle) {
    throw new ApiError(404, "claimant_not_found", "Claimant account was not found.");
  }

  return user as typeof user & { handle: string };
}

async function createUniqueClaimedProjectSlug(
  currentSlug: string,
  ownerId: string,
  currentProjectId: string,
) {
  const base = slugifyProjectTitle(currentSlug);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.ownerId, ownerId),
          eq(projects.slug, candidate),
          ne(projects.id, currentProjectId),
        ),
      )
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
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

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  feedback,
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

export async function claimExternalProjectOwnershipForUser(
  actor: ProjectClaimActor,
  projectId: string,
  source: Extract<ProjectRevisionSource, "web_claim" | "mcp_claim">,
) {
  const [row] = await db
    .select({
      project: projects,
      previousOwner: users,
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

  if (row.project.claimedById && row.project.claimedById !== actor.id) {
    throw new ApiError(409, "project_already_claimed", "This external project has already been claimed.");
  }

  if (row.project.visibility === "private" && row.project.ownerId !== actor.id) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const nextSlug = await createUniqueClaimedProjectSlug(
    row.project.slug,
    actor.id,
    row.project.id,
  );
  const now = new Date();

  const [updatedProject] = await db.transaction(async (tx) => {
    await tx.insert(projectRevisions).values(projectRevisionValues(row.project, actor.id, source));

    const [updated] = await tx
      .update(projects)
      .set({
        ownerId: actor.id,
        projectType: "owned",
        claimedById: actor.id,
        externalOwnerName: null,
        externalOwnerUrl: null,
        slug: nextSlug,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(projects.id, row.project.id))
      .returning();

    await tx
      .insert(feedback)
      .values({
        projectId: row.project.id,
        authorId: actor.id,
        feedbackType: "first_impression",
        body: `Ownership claimed by @${actor.handle}.`,
        rating: null,
        helpfulStatus: "unreviewed",
        implementedStatus: "unreviewed",
        visibility: "public",
        kind: "update",
      });

    return [updated];
  });

  const previousOwnerHandle = row.previousOwner.handle ?? row.previousOwner.id;

  revalidateWorkspace(previousOwnerHandle, row.project.slug, row.project.id);
  revalidateWorkspace(actor.handle, updatedProject.slug, updatedProject.id);

  return {
    project: updatedProject,
    previousOwner: {
      id: row.previousOwner.id,
      handle: row.previousOwner.handle,
      name: row.previousOwner.name,
    },
    previousPublicPath: projectPublicPath(previousOwnerHandle, row.project.slug),
    publicPath: projectPublicPath(actor.handle, updatedProject.slug),
  };
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

"use server";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { Route } from "next";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  feedback,
  feedbackImplementationEvents,
  projectFavorites,
  projectRevisions,
  projectStatusEvents,
  projects,
  users,
} from "@/db/schema";
import {
  coerceFeedbackType,
  coerceFeedbackKind,
  coerceFeedbackVisibility,
  coerceImplementationStatus,
  coerceInt,
  coerceProjectStatus,
  coerceProjectType,
  coerceProjectVisibility,
  parseCommaList,
  slugifyProjectTitle,
} from "@/lib/domain";
import { ensureDemoData } from "@/server/data";
import { requireCurrentUser } from "@/server/current-user";
import { projectRevisionValues } from "@/server/project-revisions";

const execFileAsync = promisify(execFile);
const maxCoverImageBytes = 5 * 1024 * 1024;
const coverImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const uploadRootDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
const coverUploadDir = path.join(uploadRootDir, "project-covers");
const coverCaptureScratchDir =
  process.env.CAPTURE_TMP_DIR ?? path.join(process.cwd(), "public", "uploads", ".capture-tmp");
const coverPublicPath = "/uploads/project-covers";

export async function updateCurrentUserProfile(formData: FormData) {
  await ensureDemoData();
  const currentUser = await requireCurrentUser();

  const name = readRequiredString(formData, "name").slice(0, 120);
  const handle = createProfileHandle(readRequiredString(formData, "handle"));
  const email = createProfileEmail(readOptionalString(formData, "email"));
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

  if (email) {
    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (emailOwner && emailOwner.id !== currentUser.id) {
      throw new Error("Email is already in use");
    }
  }

  const projectRows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.ownerId, currentUser.id));
  const emailChanged = email !== (currentUser.email?.toLowerCase() ?? null);

  await db
    .update(users)
    .set({
      name,
      handle,
      email,
      emailVerified: emailChanged ? null : currentUser.emailVerified,
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
  revalidatePath(profilePath(currentUser.handle));
  revalidatePath(profilePath(handle));

  for (const project of projectRows) {
    revalidatePath(projectPublicPath(currentUser.handle, project.slug));
    revalidatePath(projectPublicPath(handle, project.slug));
  }

  redirect(`${profilePath(handle)}?profile=updated` as Route);
}

export async function createProject(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const title = readRequiredString(formData, "title").slice(0, 160);
  const summary = readRequiredString(formData, "summary").slice(0, 500);
  const description = readOptionalString(formData, "description");
  const projectType = coerceProjectType(formData.get("projectType"));
  const status = coerceProjectStatus(formData.get("status"));
  const visibility = normalizeProjectVisibility(projectType, coerceProjectVisibility(formData.get("visibility")));
  const demoUrl = readOptionalString(formData, "demoUrl");
  const repoUrl = readOptionalString(formData, "repoUrl");
  const sourceUrl = readOptionalString(formData, "sourceUrl");
  const externalOwnerName = readOptionalString(formData, "externalOwnerName")?.slice(0, 160);
  const externalOwnerUrl = readOptionalString(formData, "externalOwnerUrl");
  const tools = parseCommaList(formData.get("tools"));
  const categoryTags = parseCommaList(formData.get("categoryTags"));
  const slug = await createUniqueProjectSlug(title, owner.id);
  const normalizedSourceUrl = normalizeSourceUrl(projectType, sourceUrl, demoUrl, repoUrl);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: owner.id,
      submittedById: owner.id,
      projectType,
      externalOwnerName: projectType === "external" ? externalOwnerName ?? null : null,
      externalOwnerUrl: projectType === "external" ? externalOwnerUrl ?? null : null,
      sourceUrl: normalizedSourceUrl,
      title,
      slug,
      summary,
      description,
      status,
      visibility,
      demoUrl,
      repoUrl,
      tools,
      categoryTags,
      feedbackFocus: ["first_impression", "ux_ui"],
      lastActivityAt: new Date(),
    })
    .returning();

  let cover = await saveUploadedProjectCover(formData.get("coverImage"), project.id);

  if (!cover && demoUrl) {
    try {
      cover = await captureProjectCoverFromUrl(project.id, demoUrl);
    } catch (error) {
      console.warn("[project-cover] Demo screenshot capture failed during create:", error);
      cover = null;
    }
  }

  if (cover) {
    await db
      .update(projects)
      .set({
        coverImageUrl: cover.publicUrl,
        coverImageObjectKey: cover.objectKey,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
  }

  await db.insert(projectStatusEvents).values({
    projectId: project.id,
    actorId: owner.id,
    toStatus: status,
    note: "Project created",
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
  redirect(projectPublicPath(owner.handle, project.slug));
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
    await tx.insert(projectRevisions).values(projectRevisionValues(project, owner.id, "web_status"));

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
  redirect(projectPublicPath(owner.handle, project.slug));
}

export async function updateProjectDetails(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const title = readRequiredString(formData, "title").slice(0, 160);
  const summary = readRequiredString(formData, "summary").slice(0, 500);
  const description = readNullableString(formData, "description");
  const projectType = coerceProjectType(formData.get("projectType"));
  const status = coerceProjectStatus(formData.get("status"));
  const visibility = normalizeProjectVisibility(projectType, coerceProjectVisibility(formData.get("visibility")));
  const demoUrl = readNullableString(formData, "demoUrl");
  const repoUrl = readNullableString(formData, "repoUrl");
  const sourceUrl = readNullableString(formData, "sourceUrl");
  const externalOwnerName = readNullableString(formData, "externalOwnerName")?.slice(0, 160) ?? null;
  const externalOwnerUrl = readNullableString(formData, "externalOwnerUrl");
  const tools = parseCommaList(formData.get("tools"));
  const categoryTags = parseCommaList(formData.get("categoryTags"));
  const normalizedSourceUrl = normalizeSourceUrl(projectType, sourceUrl ?? undefined, demoUrl ?? undefined, repoUrl ?? undefined);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  let cover = await saveUploadedProjectCover(formData.get("coverImage"), projectId);

  if (!cover && demoUrl && !project.coverImageUrl) {
    try {
      cover = await captureProjectCoverFromUrl(project.id, demoUrl);
    } catch (error) {
      console.warn("[project-cover] Demo screenshot capture failed during update:", error);
      cover = null;
    }
  }

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx.insert(projectRevisions).values(projectRevisionValues(project, owner.id, "web_update"));

    await tx
      .update(projects)
      .set({
        title,
        summary,
        description,
        projectType,
        externalOwnerName: projectType === "external" ? externalOwnerName : null,
        externalOwnerUrl: projectType === "external" ? externalOwnerUrl : null,
        sourceUrl: normalizedSourceUrl,
        status,
        visibility,
        demoUrl,
        repoUrl,
        tools,
        categoryTags,
        coverImageUrl: cover?.publicUrl ?? project.coverImageUrl,
        coverImageObjectKey: cover?.objectKey ?? project.coverImageObjectKey,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(projects.id, project.id));

    if (status !== project.status) {
      await tx.insert(projectStatusEvents).values({
        projectId: project.id,
        actorId: owner.id,
        fromStatus: project.status,
        toStatus: status,
        note: "Status changed from project edit form",
      });
    }
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
  redirect(projectPublicPath(owner.handle, project.slug));
}

export async function restoreProjectRevision(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const revisionId = readRequiredString(formData, "revisionId");

  const [row] = await db
    .select({
      project: projects,
      revision: projectRevisions,
    })
    .from(projectRevisions)
    .innerJoin(projects, eq(projectRevisions.projectId, projects.id))
    .where(and(eq(projectRevisions.id, revisionId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!row) {
    throw new Error("Revision not found");
  }

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .insert(projectRevisions)
      .values(projectRevisionValues(row.project, owner.id, "web_restore"));

    await tx
      .update(projects)
      .set({
        title: row.revision.title,
        summary: row.revision.summary,
        description: row.revision.description,
        status: row.revision.status,
        visibility: row.revision.visibility,
        demoUrl: row.revision.demoUrl,
        repoUrl: row.revision.repoUrl,
        coverImageObjectKey: row.revision.coverImageObjectKey,
        coverImageUrl: row.revision.coverImageUrl,
        projectType: row.revision.projectType,
        externalOwnerName: row.revision.externalOwnerName,
        externalOwnerUrl: row.revision.externalOwnerUrl,
        sourceUrl: row.revision.sourceUrl,
        tools: row.revision.tools,
        categoryTags: row.revision.categoryTags,
        feedbackFocus: row.revision.feedbackFocus,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(projects.id, row.project.id));

    if (row.revision.status !== row.project.status) {
      await tx.insert(projectStatusEvents).values({
        projectId: row.project.id,
        actorId: owner.id,
        fromStatus: row.project.status,
        toStatus: row.revision.status,
        note: "Project restored from revision history",
      });
    }
  });

  revalidateWorkspace(owner.handle, row.project.slug, row.project.id);
  redirect(`/dashboard/projects/${row.project.id}?revision=restored` as Route);
}

export async function deleteProject(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db.delete(projects).where(eq(projects.id, project.id));

  revalidateWorkspace(owner.handle, project.slug, project.id);
  redirect(`${profilePath(owner.handle)}?project=deleted` as Route);
}

export async function captureProjectCover(formData: FormData) {
  await ensureDemoData();
  const owner = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, owner.id)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  if (!project.demoUrl) {
    throw new Error("Demo URL is required before capturing a cover image");
  }

  let cover: Awaited<ReturnType<typeof captureProjectCoverFromUrl>>;

  try {
    cover = await captureProjectCoverFromUrl(project.id, project.demoUrl);
  } catch (error) {
    console.error("[project-cover] Demo screenshot capture failed:", error);
    redirect(`/dashboard/projects/${project.id}?cover=failed` as Route);
  }

  await db.transaction(async (tx) => {
    await tx.insert(projectRevisions).values(projectRevisionValues(project, owner.id, "web_update"));

    await tx
      .update(projects)
      .set({
        coverImageUrl: cover.publicUrl,
        coverImageObjectKey: cover.objectKey,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(projects.id, project.id));
  });

  revalidateWorkspace(owner.handle, project.slug, project.id);
  redirect(`/dashboard/projects/${project.id}?cover=captured` as Route);
}

export async function createFeedback(formData: FormData) {
  await ensureDemoData();
  const reviewer = await requireCurrentUser();

  const projectId = readRequiredString(formData, "projectId");
  const parentFeedbackId = readOptionalString(formData, "parentFeedbackId");
  const authorName = readOptionalString(formData, "authorName")?.slice(0, 120);
  const body = readRequiredString(formData, "body").slice(0, 2000);
  const feedbackType = coerceFeedbackType(formData.get("feedbackType"));
  const rating = coerceInt(formData.get("rating"), 4, 1, 5);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.visibility === "private" && project.ownerId !== reviewer.id) {
    throw new Error("Project not found");
  }

  const isProjectOwner = project.ownerId === reviewer.id;
  const requestedVisibility = coerceFeedbackVisibility(
    formData.get("visibility"),
    isProjectOwner ? "private" : "public",
  );
  const requestedKind = coerceFeedbackKind(
    formData.get("kind"),
    isProjectOwner ? "self_note" : "feedback",
  );
  let parentVisibility: "public" | "private" | null = null;

  if (parentFeedbackId) {
    const [parent] = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        authorId: feedback.authorId,
        visibility: feedback.visibility,
      })
      .from(feedback)
      .where(eq(feedback.id, parentFeedbackId))
      .limit(1);

    if (!parent || parent.projectId !== project.id) {
      throw new Error("Parent feedback not found");
    }

    parentVisibility = parent.visibility;

    if (parent.visibility === "private" && !isProjectOwner && parent.authorId !== reviewer.id) {
      throw new Error("Parent feedback not found");
    }
  }

  const visibility = parentVisibility === "private" ? "private" : requestedVisibility;
  const kind = isProjectOwner ? requestedKind : "feedback";
  const storedRating = kind === "feedback" ? rating : null;

  const [owner] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, project.ownerId))
    .limit(1);

  await db.transaction(async (tx) => {
    const now = new Date();
    const [reviewerRow] = await tx
      .select({
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, reviewer.id))
      .limit(1);

    if (!reviewerRow) {
      throw new Error("Reviewer not found");
    }

    await tx
      .insert(feedback)
      .values({
        projectId: project.id,
        requestId: null,
        parentFeedbackId: parentFeedbackId ?? null,
        authorId: reviewer.id,
        feedbackType,
        body,
        rating: storedRating,
        helpfulStatus: "unreviewed",
        implementedStatus: "unreviewed",
        visibility,
        kind,
      });

    await tx
      .update(users)
      .set({
        name: reviewerRow.name ?? authorName ?? reviewer.handle,
        updatedAt: now,
      })
      .where(eq(users.id, reviewer.id));

    await tx
      .update(projects)
      .set({
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(projects.id, project.id));
  });

  revalidateWorkspace(owner?.handle, project.slug, project.id);
  revalidatePath(`/p/${reviewer.handle}`);
}

export async function updateFeedbackDetails(formData: FormData) {
  await ensureDemoData();
  const author = await requireCurrentUser();

  const feedbackId = readRequiredString(formData, "feedbackId");
  const body = readRequiredString(formData, "body").slice(0, 2000);
  const feedbackType = coerceFeedbackType(formData.get("feedbackType"));
  const rating = coerceInt(formData.get("rating"), 4, 1, 5);

  const [entry] = await db
    .select()
    .from(feedback)
    .where(and(eq(feedback.id, feedbackId), eq(feedback.authorId, author.id)))
    .limit(1);

  if (!entry) {
    throw new Error("Feedback not found");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, entry.projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  const isProjectOwner = project.ownerId === author.id;
  const visibility = coerceFeedbackVisibility(formData.get("visibility"), entry.visibility);
  const kind = isProjectOwner
    ? coerceFeedbackKind(formData.get("kind"), entry.kind)
    : "feedback";
  const storedRating = kind === "feedback" ? rating : null;

  const [owner] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, project.ownerId))
    .limit(1);

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(feedback)
      .set({
        body,
        feedbackType,
        rating: storedRating,
        visibility,
        kind,
        updatedAt: now,
      })
      .where(eq(feedback.id, entry.id));

    await tx
      .update(projects)
      .set({
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(projects.id, project.id));
  });

  revalidateWorkspace(owner?.handle, project.slug, project.id);
  revalidatePath(`/p/${author.handle}`);
}

export async function deleteFeedback(formData: FormData) {
  await ensureDemoData();
  const author = await requireCurrentUser();

  const feedbackId = readRequiredString(formData, "feedbackId");

  const [entry] = await db
    .select({
      id: feedback.id,
      projectId: feedback.projectId,
      authorId: feedback.authorId,
    })
    .from(feedback)
    .where(and(eq(feedback.id, feedbackId), eq(feedback.authorId, author.id)))
    .limit(1);

  if (!entry) {
    throw new Error("Feedback not found");
  }

  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      ownerId: projects.ownerId,
      ownerHandle: users.handle,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, entry.projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx.delete(feedback).where(eq(feedback.id, entry.id));
    await tx
      .update(projects)
      .set({
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(projects.id, project.id));
  });

  revalidateWorkspace(project.ownerHandle, project.slug, project.id);
  revalidatePath(`/p/${author.handle}`);
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

export async function toggleProjectFavorite(formData: FormData) {
  await ensureDemoData();
  const user = await requireCurrentUser();
  const projectId = readRequiredString(formData, "projectId");

  const [row] = await db
    .select({
      project: projects,
      ownerHandle: users.handle,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row || (row.project.visibility === "private" && row.project.ownerId !== user.id)) {
    throw new Error("Project not found");
  }

  const [existing] = await db
    .select({ projectId: projectFavorites.projectId })
    .from(projectFavorites)
    .where(and(eq(projectFavorites.projectId, projectId), eq(projectFavorites.userId, user.id)))
    .limit(1);

  if (existing) {
    await db
      .delete(projectFavorites)
      .where(and(eq(projectFavorites.projectId, projectId), eq(projectFavorites.userId, user.id)));
  } else {
    await db
      .insert(projectFavorites)
      .values({ projectId, userId: user.id })
      .onConflictDoNothing();
  }

  revalidateWorkspace(row.ownerHandle, row.project.slug, row.project.id);
  revalidatePath(`/p/${user.handle}`);
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

function normalizeProjectVisibility(
  projectType: ReturnType<typeof coerceProjectType>,
  visibility: ReturnType<typeof coerceProjectVisibility>,
) {
  if (projectType === "external" && visibility === "private") {
    return "unlisted";
  }

  return visibility;
}

function normalizeSourceUrl(
  projectType: ReturnType<typeof coerceProjectType>,
  sourceUrl: string | undefined,
  demoUrl: string | undefined,
  repoUrl: string | undefined,
) {
  if (projectType === "owned") {
    return sourceUrl ?? null;
  }

  const url = sourceUrl ?? demoUrl ?? repoUrl;

  if (!url) {
    throw new Error("sourceUrl is required for external public projects");
  }

  return url;
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

function readNullableString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

async function saveUploadedProjectCover(value: FormDataEntryValue | null, projectId: string) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = coverImageTypes.get(value.type);

  if (!extension) {
    throw new Error("Cover image must be a JPEG, PNG, WebP, or GIF file");
  }

  if (value.size > maxCoverImageBytes) {
    throw new Error("Cover image must be 5MB or smaller");
  }

  await mkdir(coverUploadDir, { recursive: true });

  const objectKey = `${projectId}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(coverUploadDir, objectKey);
  const bytes = Buffer.from(await value.arrayBuffer());

  await writeFile(absolutePath, bytes);

  return {
    objectKey,
    publicUrl: `${coverPublicPath}/${objectKey}`,
  };
}

async function captureProjectCoverFromUrl(projectId: string, rawUrl: string) {
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Demo URL must be http or https");
  }

  await mkdir(coverUploadDir, { recursive: true });
  await mkdir(coverCaptureScratchDir, { recursive: true });

  const objectKey = `${projectId}-${randomUUID()}.png`;
  const absolutePath = path.join(coverUploadDir, objectKey);
  const screenshotPath = path.join(coverCaptureScratchDir, objectKey);
  const chromium = await findChromiumBinary();

  await execFileAsync(
    chromium,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--ignore-certificate-errors",
      "--window-size=1280,900",
      "--virtual-time-budget=5000",
      `--screenshot=${screenshotPath}`,
      url.toString(),
    ],
    { timeout: 45000, maxBuffer: 1024 * 1024 },
  );

  const capturedFile = await stat(screenshotPath).catch(() => null);

  if (!capturedFile || capturedFile.size === 0) {
    throw new Error(`Chromium completed but did not write a screenshot for ${url.toString()}`);
  }

  if (path.resolve(screenshotPath) !== path.resolve(absolutePath)) {
    await copyFile(screenshotPath, absolutePath);
    await unlink(screenshotPath).catch(() => undefined);
  }

  const finalFile = await stat(absolutePath).catch(() => null);

  if (!finalFile || finalFile.size === 0) {
    throw new Error(`Screenshot was captured but could not be saved for ${url.toString()}`);
  }

  return {
    objectKey,
    publicUrl: `${coverPublicPath}/${objectKey}`,
  };
}

async function findChromiumBinary() {
  for (const binary of ["chromium-browser", "chromium", "google-chrome", "google-chrome-stable"]) {
    try {
      const { stdout } = await execFileAsync("which", [binary], { timeout: 2000 });
      return stdout.trim() || binary;
    } catch {
      // Try the next common binary name.
    }
  }

  throw new Error("Chromium is not available on this server");
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

function createProfileEmail(input: string | undefined) {
  if (!input) {
    return null;
  }

  const email = input.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Valid email is required");
  }

  return email;
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
  return `/p/${encodeURIComponent(ownerHandle)}` as Route;
}

function projectPublicPath(ownerHandle: string, projectSlug: string) {
  return `${profilePath(ownerHandle)}/${encodeURIComponent(projectSlug)}` as Route;
}

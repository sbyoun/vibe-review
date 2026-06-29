import { randomUUID } from "node:crypto";

import { eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { projects, users, verificationTokens } from "@/db/schema";
import { assertValidPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/domain";
import {
  ApiError,
  createMcpApiToken,
  mcpTokenPrefix,
  serializeMcpUser,
  type McpUser,
} from "@/server/mcp-api";

export const registerMcpAccountSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  handle: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .transform((value) => slugify(value).slice(0, 48))
    .refine((value) => value.length >= 2, "Handle must be at least 2 characters."),
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  password: z.string().min(8).max(128),
});

export const createMcpTokenSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
});

export const revokeMcpTokensSchema = z.object({
  confirm: z.literal(true),
});

export const deleteMcpAccountSchema = z.object({
  confirmEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  confirm: z.literal(true),
});

export async function registerMcpAccount(input: z.output<typeof registerMcpAccountSchema>) {
  try {
    assertValidPassword(input.password);
  } catch (error) {
    throw new ApiError(
      422,
      "invalid_password",
      error instanceof Error ? error.message : "Password is invalid.",
    );
  }

  const [existing] = await db
    .select({ id: users.id, email: users.email, handle: users.handle })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.handle, input.handle)))
    .limit(1);

  if (existing?.email === input.email) {
    throw new ApiError(409, "email_taken", "Email is already in use.");
  }

  if (existing?.handle === input.handle) {
    throw new ApiError(409, "handle_taken", "Handle is already taken.");
  }

  const [user] = await db
    .insert(users)
    .values({
      id: `local-${randomUUID()}`,
      name: input.name ?? input.handle,
      email: input.email,
      handle: input.handle,
      passwordHash: await hashPassword(input.password),
      bio: "Building and reviewing vibe-coded projects.",
      primaryRoles: ["Builder"],
      toolsUsed: ["Codex"],
      feedbackCredits: 10,
      reputationScore: 0,
    })
    .returning();

  if (!user.handle) {
    throw new ApiError(500, "registration_failed", "Account was created without a handle.");
  }

  const apiToken = await createMcpApiToken(user.id);

  return {
    user: serializeMcpUser(user as McpUser),
    apiToken,
  };
}

export async function createMcpToken(input: z.output<typeof createMcpTokenSchema>) {
  const normalizedLogin = input.login.trim().toLowerCase();
  const handle = slugify(normalizedLogin).slice(0, 48);

  const [user] = await db
    .select()
    .from(users)
    .where(
      normalizedLogin.includes("@")
        ? eq(users.email, normalizedLogin)
        : eq(users.handle, handle),
    )
    .limit(1);

  if (!user || !user.handle) {
    throw new ApiError(401, "invalid_credentials", "Invalid login or password.");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "invalid_credentials", "Invalid login or password.");
  }

  const apiToken = await createMcpApiToken(user.id);

  return {
    user: serializeMcpUser(user as McpUser),
    apiToken,
  };
}

export async function revokeMcpTokens(
  owner: McpUser,
  input: z.output<typeof revokeMcpTokensSchema>,
) {
  const revokedTokens = await db
    .delete(verificationTokens)
    .where(like(verificationTokens.identifier, `${mcpTokenPrefix}:${owner.id}:%`))
    .returning({ identifier: verificationTokens.identifier });

  return {
    confirmed: input.confirm,
    revokedCount: revokedTokens.length,
  };
}

export async function deleteMcpAccount(
  owner: McpUser,
  input: z.output<typeof deleteMcpAccountSchema>,
) {
  if (owner.email?.toLowerCase() !== input.confirmEmail) {
    throw new ApiError(422, "email_confirmation_mismatch", "confirmEmail must match the account email.");
  }

  const ownedProjects = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(eq(projects.ownerId, owner.id));

  await db.transaction(async (tx) => {
    await tx
      .delete(verificationTokens)
      .where(like(verificationTokens.identifier, `${mcpTokenPrefix}:${owner.id}:%`));
    await tx.delete(users).where(eq(users.id, owner.id));
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/feedback");
  revalidatePath(`/p/${owner.handle}`);

  for (const project of ownedProjects) {
    revalidatePath(`/dashboard/projects/${project.id}`);
    revalidatePath(`/p/${owner.handle}/${project.slug}`);
  }

  return {
    deleted: true,
    user: serializeMcpUser(owner),
    deletedProjectCount: ownedProjects.length,
  };
}

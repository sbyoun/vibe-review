"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertValidPassword, hashPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/domain";
import { eq } from "drizzle-orm";

export async function loginWithPassword(formData: FormData) {
  const handle = createAuthHandle(readRequiredString(formData, "handle"));
  const password = readRequiredString(formData, "password");

  await signIn("credentials", {
    handle,
    password,
    redirectTo: "/dashboard",
  });
}

export async function registerWithPassword(formData: FormData) {
  const handle = createAuthHandle(readRequiredString(formData, "handle"));
  const name = readOptionalString(formData, "name")?.slice(0, 120) ?? handle;
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  assertValidPassword(password);

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  if (existingUser) {
    throw new Error("Handle is already taken");
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: `local-${crypto.randomUUID()}`,
    name,
    handle,
    passwordHash,
    bio: "Building and reviewing vibe-coded projects.",
    primaryRoles: ["Builder"],
    toolsUsed: ["Codex"],
    feedbackCredits: 10,
    reputationScore: 0,
  });

  await signIn("credentials", {
    handle,
    password,
    redirectTo: "/dashboard",
  });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
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

function createAuthHandle(input: string) {
  const handle = slugify(input).slice(0, 48);

  if (handle.length < 2) {
    throw new Error("Handle must be at least 2 characters");
  }

  return handle;
}

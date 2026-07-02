"use server";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { Route } from "next";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { assertValidPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/domain";
import { safeRedirectPath } from "@/lib/redirects";
import { and, eq, lt } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/current-user";
import { absoluteUrl, sendPasswordResetMail } from "@/server/email";
import { issueEmailVerification } from "@/server/email-verification";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  resetUrl?: string;
  verificationUrl?: string;
  fields?: {
    email?: string;
    handle?: string;
    name?: string;
  };
};

const resetTokenPrefix = "password-reset";
const resetTokenTtlMs = 1000 * 60 * 30;

export async function loginWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const loginResult = createAuthLogin(readRequiredString(formData, "handle"));

  if (!loginResult.ok) {
    return {
      status: "error",
      message: loginResult.message,
    };
  }

  const password = readRequiredString(formData, "password");
  const next = safeRedirectPath(readOptionalString(formData, "next"));

  if (!password) {
    return {
      status: "error",
      message: "Password is required.",
      fields: { handle: loginResult.login },
    };
  }

  const signInResult = await signInWithLocalPassword(loginResult.login, password);

  if (signInResult === "invalid") {
    return {
      status: "error",
      message: "Invalid handle/email or password.",
      fields: { handle: loginResult.login },
    };
  }

  const handle = await findHandleForLogin(loginResult.login);

  redirect((next ?? (handle ? `/p/${handle}` : "/discover")) as Route);
}

export async function registerWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const handleResult = createAuthHandle(readRequiredString(formData, "handle"));
  const emailInput = readOptionalString(formData, "email");
  const emailResult = emailInput
    ? createAuthEmail(emailInput)
    : { ok: true as const, email: undefined };
  const name = readOptionalString(formData, "name")?.slice(0, 120);
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");

  if (!emailResult.ok) {
    return {
      status: "error",
      message: emailResult.message,
      fields: { name },
    };
  }

  if (!handleResult.ok) {
    return {
      status: "error",
      message: handleResult.message,
      fields: { email: emailResult.email, name },
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
      fields: { email: emailResult.email, handle: handleResult.handle, name },
    };
  }

  try {
    assertValidPassword(password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Password is invalid.",
      fields: { email: emailResult.email, handle: handleResult.handle, name },
    };
  }

  const [existingHandle] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handleResult.handle))
    .limit(1);

  if (existingHandle) {
    return {
      status: "error",
      message: "Handle is already taken.",
      fields: { email: emailResult.email, handle: handleResult.handle, name },
    };
  }

  const [existingEmail] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, emailResult.email ?? ""))
    .limit(1);

  if (emailResult.email && existingEmail) {
    return {
      status: "error",
      message: "Email is already in use.",
      fields: { email: emailResult.email, handle: handleResult.handle, name },
    };
  }

  const passwordHash = await hashPassword(password);
  let createdUser: { id: string; email: string | null } | undefined;

  try {
    [createdUser] = await db
      .insert(users)
      .values({
        id: `local-${crypto.randomUUID()}`,
        name: name ?? handleResult.handle,
        email: emailResult.email ?? null,
        handle: handleResult.handle,
        passwordHash,
        bio: "Building and reviewing vibe-coded projects.",
        primaryRoles: ["Builder"],
        toolsUsed: ["Codex"],
        feedbackCredits: 10,
        reputationScore: 0,
      })
      .returning({ id: users.id, email: users.email });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "Handle or email is already in use.",
        fields: { email: emailResult.email, handle: handleResult.handle, name },
      };
    }

    throw error;
  }

  if (!createdUser) {
    throw new Error("Account creation failed.");
  }

  return {
    status: "success",
    message: createdUser.email
      ? "Account created. You can log in now. Verify your email later in Settings to enable password recovery."
      : "Account created. You can log in now. Add and verify an email later in Settings to enable password recovery.",
    fields: { email: emailResult.email, handle: handleResult.handle, name },
  };
}

export async function requestPasswordReset(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const emailResult = createAuthEmail(readRequiredString(formData, "email"));

  if (!emailResult.ok) {
    return {
      status: "error",
      message: emailResult.message,
    };
  }

  await deleteExpiredResetTokens();

  const [user] = await db
    .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, emailResult.email))
    .limit(1);

  if (!user || !user.emailVerified) {
    return {
      status: "success",
      message: "If a verified account exists for that email, a reset link has been sent.",
      fields: { email: emailResult.email },
    };
  }

  const resetId = randomBytes(16).toString("base64url");
  const token = randomBytes(32).toString("base64url");

  await db.insert(verificationTokens).values({
    identifier: resetId,
    token: packResetToken(user.id, token),
    expires: new Date(Date.now() + resetTokenTtlMs),
  });

  const resetPath = createResetUrl(resetId, token);
  const delivery = user.email
    ? await sendPasswordResetMail(user.email, absoluteUrl(resetPath))
    : { delivered: false };

  return {
    status: "success",
    message: "If a verified account exists for that email, a reset link has been sent.",
    resetUrl: delivery.delivered || process.env.NODE_ENV === "production" ? undefined : resetPath,
    fields: { email: emailResult.email },
  };
}

export async function resetPasswordWithToken(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const resetId = readRequiredString(formData, "resetId");
  const token = readRequiredString(formData, "token");
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");

  if (!resetId || !token) {
    return { status: "error", message: "Reset link is invalid." };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." };
  }

  try {
    assertValidPassword(password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Password is invalid.",
    };
  }

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, resetId))
    .limit(1);

  const parsedToken = row ? unpackResetToken(row.token) : null;

  if (!row || !parsedToken || row.expires.getTime() <= Date.now()) {
    return { status: "error", message: "Reset link is invalid or expired." };
  }

  if (!safeEqual(hashResetToken(token), parsedToken.tokenHash)) {
    return { status: "error", message: "Reset link is invalid or expired." };
  }

  const [resetUser] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, parsedToken.userId))
    .limit(1);

  if (!resetUser?.emailVerified) {
    return { status: "error", message: "Reset link is invalid or expired." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, parsedToken.userId));

    await tx
      .delete(verificationTokens)
      .where(
        and(eq(verificationTokens.identifier, resetId), eq(verificationTokens.token, row.token)),
      );
  });

  return {
    status: "success",
    message: "Password changed. Log in with the new password.",
  };
}

export async function changeCurrentUserPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const currentUser = await requireCurrentUser();
  const currentPassword = readRequiredString(formData, "currentPassword");
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");

  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." };
  }

  try {
    assertValidPassword(password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Password is invalid.",
    };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, currentUser.id))
    .limit(1);

  const currentPasswordMatches = await verifyPassword(currentPassword, user?.passwordHash);

  if (!currentPasswordMatches) {
    return { status: "error", message: "Current password is incorrect." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, currentUser.id));

  return {
    status: "success",
    message: "Password changed.",
  };
}

export async function sendCurrentUserEmailVerification(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const emailInput = readOptionalString(formData, "email") ?? currentUser.email;

  if (!emailInput) {
    redirect("/settings?emailVerification=no_email#account");
  }

  const emailResult = createAuthEmail(emailInput);

  if (!emailResult.ok) {
    redirect("/settings?emailVerification=invalid_email#account");
  }

  const normalizedCurrentEmail = currentUser.email?.toLowerCase() ?? null;
  const emailChanged = emailResult.email !== normalizedCurrentEmail;

  if (!emailChanged && currentUser.emailVerified) {
    redirect("/settings?emailVerification=already_verified#account");
  }

  if (emailChanged) {
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailResult.email))
      .limit(1);

    if (existingEmail && existingEmail.id !== currentUser.id) {
      redirect("/settings?emailVerification=email_taken#account");
    }

    await db
      .update(users)
      .set({
        email: emailResult.email,
        emailVerified: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));
  }

  const delivery = await issueEmailVerification({
    userId: currentUser.id,
    email: emailResult.email,
  });
  const status = delivery.delivered
    ? "sent"
    : process.env.NODE_ENV === "production"
      ? "delivery_failed"
      : "dev_link";
  const params = new URLSearchParams({ emailVerification: status });

  if (delivery.verificationUrl) {
    params.set("verificationUrl", delivery.verificationUrl);
  }

  redirect(`/settings?${params.toString()}#account`);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
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

function createAuthHandle(
  input: string,
): { ok: true; handle: string } | { ok: false; message: string } {
  const handle = slugify(input).slice(0, 48);

  if (handle.length < 2) {
    return { ok: false, message: "Handle must be at least 2 characters." };
  }

  return { ok: true, handle };
}

function createAuthLogin(
  input: string,
): { ok: true; login: string } | { ok: false; message: string } {
  const login = input.trim();

  if (login.includes("@")) {
    const emailResult = createAuthEmail(login);

    if (!emailResult.ok) {
      return { ok: false, message: "Valid email or handle is required." };
    }

    return { ok: true, login: emailResult.email };
  }

  const handleResult = createAuthHandle(login);

  if (!handleResult.ok) {
    return { ok: false, message: "Valid email or handle is required." };
  }

  return { ok: true, login: handleResult.handle };
}

function createAuthEmail(input: string):
  | { ok: true; email: string }
  | { ok: false; message: string } {
  const email = input.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Valid email is required." };
  }

  return { ok: true, email };
}

function isCredentialsErrorUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const url = new URL(value, "http://localhost");

  return url.searchParams.get("error") === "CredentialsSignin";
}

async function signInWithLocalPassword(login: string, password: string) {
  try {
    const signInUrl = await signIn("credentials", {
      handle: login,
      password,
      redirect: false,
      redirectTo: "/discover",
    });

    return isCredentialsErrorUrl(signInUrl) ? "invalid" : "success";
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return "invalid";
    }

    throw error;
  }
}

async function findHandleForLogin(login: string) {
  const [user] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(login.includes("@") ? eq(users.email, login) : eq(users.handle, login))
    .limit(1);

  return user?.handle ?? null;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function packResetToken(userId: string, token: string) {
  return `${resetTokenPrefix}:${userId}:${hashResetToken(token)}`;
}

function unpackResetToken(value: string) {
  const [prefix, userId, tokenHash] = value.split(":");

  if (prefix !== resetTokenPrefix || !userId || !tokenHash) {
    return null;
  }

  return { userId, tokenHash };
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createResetUrl(resetId: string, token: string) {
  const params = new URLSearchParams({ id: resetId, token });

  return `/reset-password?${params.toString()}`;
}

async function deleteExpiredResetTokens() {
  await db.delete(verificationTokens).where(lt(verificationTokens.expires, new Date()));
}

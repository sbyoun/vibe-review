"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertValidPassword, hashPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/domain";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export type AuthFormState = {
  status: "idle" | "error";
  message: string | null;
  fields?: {
    handle?: string;
    name?: string;
  };
};

export async function loginWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const handleResult = createAuthHandle(readRequiredString(formData, "handle"));

  if (!handleResult.ok) {
    return {
      status: "error",
      message: handleResult.message,
    };
  }

  const password = readRequiredString(formData, "password");

  if (!password) {
    return {
      status: "error",
      message: "Password is required.",
      fields: { handle: handleResult.handle },
    };
  }

  const signInResult = await signInWithLocalPassword(handleResult.handle, password);

  if (signInResult === "invalid") {
    return {
      status: "error",
      message: "Invalid handle or password.",
      fields: { handle: handleResult.handle },
    };
  }

  redirect("/dashboard");
}

export async function registerWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const handleResult = createAuthHandle(readRequiredString(formData, "handle"));
  const name = readOptionalString(formData, "name")?.slice(0, 120);
  const password = readRequiredString(formData, "password");
  const confirmPassword = readRequiredString(formData, "confirmPassword");

  if (!handleResult.ok) {
    return {
      status: "error",
      message: handleResult.message,
      fields: { name },
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
      fields: { handle: handleResult.handle, name },
    };
  }

  try {
    assertValidPassword(password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Password is invalid.",
      fields: { handle: handleResult.handle, name },
    };
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handleResult.handle))
    .limit(1);

  if (existingUser) {
    return {
      status: "error",
      message: "Handle is already taken.",
      fields: { handle: handleResult.handle, name },
    };
  }

  const passwordHash = await hashPassword(password);

  try {
    await db.insert(users).values({
      id: `local-${crypto.randomUUID()}`,
      name: name ?? handleResult.handle,
      handle: handleResult.handle,
      passwordHash,
      bio: "Building and reviewing vibe-coded projects.",
      primaryRoles: ["Builder"],
      toolsUsed: ["Codex"],
      feedbackCredits: 10,
      reputationScore: 0,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "Handle is already taken.",
        fields: { handle: handleResult.handle, name },
      };
    }

    throw error;
  }

  const signInResult = await signInWithLocalPassword(handleResult.handle, password);

  if (signInResult === "invalid") {
    return {
      status: "error",
      message: "Account was created, but sign-in failed. Try logging in.",
      fields: { handle: handleResult.handle, name },
    };
  }

  redirect("/dashboard");
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

function isCredentialsErrorUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const url = new URL(value, "http://localhost");

  return url.searchParams.get("error") === "CredentialsSignin";
}

async function signInWithLocalPassword(handle: string, password: string) {
  try {
    const signInUrl = await signIn("credentials", {
      handle,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    return isCredentialsErrorUrl(signInUrl) ? "invalid" : "success";
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return "invalid";
    }

    throw error;
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

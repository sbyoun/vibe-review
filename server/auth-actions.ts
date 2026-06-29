"use server";

import { signIn, signOut } from "@/auth";

export async function loginWithHandle(formData: FormData) {
  const handle = readRequiredString(formData, "handle");
  const name = readOptionalString(formData, "name");

  await signIn("credentials", {
    handle,
    name,
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

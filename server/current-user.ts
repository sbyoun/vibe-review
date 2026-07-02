import { redirect } from "next/navigation";
import type { Route } from "next";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export type CurrentUser = User & { handle: string };

export async function getOptionalCurrentUser(): Promise<User | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return user ?? null;
}

export async function requireCurrentUser(loginPath: Route = "/login") {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  if (!user.handle) {
    redirect(loginPath);
  }

  return user as CurrentUser;
}

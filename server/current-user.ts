import { redirect } from "next/navigation";
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

export async function requireCurrentUser() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.handle) {
    redirect("/login");
  }

  return user as CurrentUser;
}

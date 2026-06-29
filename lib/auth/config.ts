import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { users } from "@/db/schema";
import { slugify } from "@/lib/domain";
import { eq } from "drizzle-orm";

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? "local-dev-vibe-code-workspace-secret",
  providers: [
    Credentials({
      credentials: {
        handle: {},
        name: {},
      },
      async authorize(credentials) {
        const handleValue = typeof credentials.handle === "string" ? credentials.handle : "";
        const nameValue = typeof credentials.name === "string" ? credentials.name.trim() : "";
        const handle = slugify(handleValue).slice(0, 48);

        if (!handle) {
          return null;
        }

        const [existingUser] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);

        if (existingUser) {
          return {
            id: existingUser.id,
            name: existingUser.name ?? existingUser.handle ?? handle,
            email: existingUser.email,
            image: existingUser.image,
            handle: existingUser.handle,
          };
        }

        const [createdUser] = await db
          .insert(users)
          .values({
            id: `local-${handle}`,
            name: nameValue || handle,
            email: `${handle}@local.vibecode.test`,
            handle,
            bio: "Building and reviewing vibe-coded projects.",
            primaryRoles: ["Builder"],
            toolsUsed: ["Codex"],
            feedbackCredits: 10,
            reputationScore: 0,
          })
          .returning();

        return {
          id: createdUser.id,
          name: createdUser.name ?? createdUser.handle ?? handle,
          email: createdUser.email,
          image: createdUser.image,
          handle: createdUser.handle,
        };
      },
    }),
    GitHub,
    Google,
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const profile = await ensureProfile(user);

        token.sub = profile.id;
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.image;
        token.handle = profile.handle;
      } else if (token.sub) {
        const [profile] = await db.select().from(users).where(eq(users.id, token.sub)).limit(1);

        if (profile) {
          token.handle = profile.handle;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.handle = typeof token.handle === "string" ? token.handle : null;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

async function ensureProfile(user: {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  handle?: string | null;
}) {
  if (user.id) {
    const [existingUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (existingUser?.handle) {
      return existingUser;
    }

    if (existingUser) {
      const handle = await createUniqueHandle(
        existingUser.name ?? existingUser.email?.split("@")[0] ?? user.id,
      );

      const [updatedUser] = await db
        .update(users)
        .set({
          handle,
          feedbackCredits: existingUser.feedbackCredits || 10,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      return updatedUser;
    }
  }

  const handle = user.handle ?? (await createUniqueHandle(user.name ?? user.email ?? "builder"));
  const [createdUser] = await db
    .insert(users)
    .values({
      id: user.id ?? `auth-${crypto.randomUUID()}`,
      name: user.name ?? handle,
      email: user.email,
      image: user.image,
      handle,
      bio: "Building and reviewing vibe-coded projects.",
      primaryRoles: ["Builder"],
      toolsUsed: ["Codex"],
      feedbackCredits: 10,
      reputationScore: 0,
    })
    .returning();

  return createdUser;
}

async function createUniqueHandle(input: string) {
  const base = slugify(input).slice(0, 40) || "builder";
  let handle = base;
  let suffix = 2;

  while (true) {
    const [existingUser] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);

    if (!existingUser) {
      return handle;
    }

    handle = `${base}-${suffix}`.slice(0, 48);
    suffix += 1;
  }
}

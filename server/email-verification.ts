import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { and, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { absoluteUrl, sendEmailVerificationMail } from "@/server/email";

const tokenPrefix = "email-verify";
const tokenTtlMs = 1000 * 60 * 60 * 24;

export type EmailVerificationDelivery = {
  delivered: boolean;
  configured: boolean;
  verificationUrl?: string;
};

export async function issueEmailVerification(input: {
  userId: string;
  email: string | null;
}): Promise<EmailVerificationDelivery> {
  if (!input.email) {
    return { configured: false, delivered: false };
  }

  await deleteExpiredEmailVerificationTokens();

  const verificationId = randomBytes(16).toString("base64url");
  const token = randomBytes(32).toString("base64url");
  const verificationPath = createEmailVerificationUrl(verificationId, token);
  const verificationUrl = absoluteUrl(verificationPath);

  await db.insert(verificationTokens).values({
    identifier: verificationId,
    token: packEmailVerificationToken(input.userId, input.email, token),
    expires: new Date(Date.now() + tokenTtlMs),
  });

  const delivery = await sendEmailVerificationMail(input.email, verificationUrl);

  return {
    ...delivery,
    verificationUrl: delivery.delivered || process.env.NODE_ENV === "production"
      ? undefined
      : verificationPath,
  };
}

export async function verifyEmailToken(verificationId: string, token: string) {
  if (!verificationId || !token) {
    return {
      ok: false,
      message: "Verification link is invalid.",
    };
  }

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, verificationId))
    .limit(1);

  const parsedToken = row ? unpackEmailVerificationToken(row.token) : null;

  if (!row || !parsedToken || row.expires.getTime() <= Date.now()) {
    return {
      ok: false,
      message: "Verification link is invalid or expired.",
    };
  }

  if (!safeEqual(hashToken(token), parsedToken.tokenHash)) {
    return {
      ok: false,
      message: "Verification link is invalid or expired.",
    };
  }

  if (parsedToken.emailHash) {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, parsedToken.userId))
      .limit(1);

    if (!user?.email || !safeEqual(hashToken(user.email.toLowerCase()), parsedToken.emailHash)) {
      return {
        ok: false,
        message: "Verification link is invalid or expired.",
      };
    }
  }

  const verifiedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerified: verifiedAt, updatedAt: verifiedAt })
      .where(eq(users.id, parsedToken.userId));

    await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, verificationId),
          eq(verificationTokens.token, row.token),
        ),
      );
  });

  return {
    ok: true,
    message: "Email verified. Password recovery is now enabled.",
  };
}

function createEmailVerificationUrl(verificationId: string, token: string) {
  const params = new URLSearchParams({ id: verificationId, token });

  return `/verify-email?${params.toString()}`;
}

function packEmailVerificationToken(userId: string, email: string, token: string) {
  return `${tokenPrefix}:${userId}:${hashToken(email.toLowerCase())}:${hashToken(token)}`;
}

function unpackEmailVerificationToken(value: string) {
  const parts = value.split(":");
  const [prefix, userId] = parts;

  if (prefix !== tokenPrefix || !userId) {
    return null;
  }

  if (parts.length === 3) {
    const [, , tokenHash] = parts;

    if (!tokenHash) {
      return null;
    }

    return { userId, tokenHash, emailHash: null };
  }

  const [, , emailHash, tokenHash] = parts;

  if (!emailHash || !tokenHash) {
    return null;
  }

  return { userId, tokenHash, emailHash };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function deleteExpiredEmailVerificationTokens() {
  await db.delete(verificationTokens).where(lt(verificationTokens.expires, new Date()));
}

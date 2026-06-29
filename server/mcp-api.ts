import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { users, verificationTokens, type User } from "@/db/schema";
import { DEMO_OWNER_HANDLE, ensureDemoData } from "@/server/data";

export type McpUser = User & { handle: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const mcpTokenPrefix = "mcp-api";
const mcpApiTokenTtlDays = Number.parseInt(process.env.MCP_API_TOKEN_TTL_DAYS ?? "365", 10);

export async function requireMcpUser(request: Request): Promise<McpUser> {
  await ensureDemoData();

  const token = readBearerToken(request);

  if (!token) {
    throw new ApiError(401, "unauthorized", "Invalid or missing bearer token.");
  }

  const envUser = await findEnvTokenUser(token);

  if (envUser) {
    return envUser;
  }

  const issuedUser = await findIssuedTokenUser(token);

  if (issuedUser) {
    return issuedUser;
  }

  throw new ApiError(401, "unauthorized", "Invalid or missing bearer token.");
}

export async function createMcpApiToken(userId: string) {
  const token = `vibe_mcp_${randomUUID().replaceAll("-", "")}_${randomUUID().replaceAll("-", "")}`;
  const tokenId = randomUUID();
  const expires = new Date(Date.now() + getMcpApiTokenTtlMs());

  await db.insert(verificationTokens).values({
    identifier: packMcpApiTokenIdentifier(userId, tokenId),
    token: packMcpApiTokenHash(token),
    expires,
  });

  return {
    token,
    expiresAt: expires,
  };
}

export function serializeMcpUser(user: McpUser) {
  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    email: user.email,
    feedbackCredits: user.feedbackCredits,
    reputationScore: user.reputationScore,
  };
}

async function findEnvTokenUser(token: string) {
  const configuredToken = process.env.MCP_API_TOKEN;

  if (!configuredToken || !safeTokenEquals(token, configuredToken)) {
    return null;
  }

  const configuredUserId = process.env.MCP_API_USER_ID;
  const configuredHandle = process.env.MCP_API_USER_HANDLE ?? DEMO_OWNER_HANDLE;
  const [user] = configuredUserId
    ? await db.select().from(users).where(eq(users.id, configuredUserId)).limit(1)
    : await db.select().from(users).where(eq(users.handle, configuredHandle)).limit(1);

  if (!user || !user.handle) {
    throw new ApiError(503, "mcp_api_user_not_found", "Configured MCP API user was not found.");
  }

  return user as McpUser;
}

async function findIssuedTokenUser(token: string) {
  const [storedToken] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, packMcpApiTokenHash(token)))
    .limit(1);

  const parsed = storedToken ? unpackMcpApiTokenIdentifier(storedToken.identifier) : null;

  if (!storedToken || !parsed || storedToken.expires.getTime() <= Date.now()) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, parsed.userId)).limit(1);

  return user?.handle ? (user as McpUser) : null;
}

export async function readJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ApiError(422, "validation_error", "Request body failed validation.", result.error.flatten());
  }

  return result.data;
}

export function apiJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message,
      },
    },
    { status: 500 },
  );
}

function readBearerToken(request: Request) {
  const value = request.headers.get("authorization");

  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function safeTokenEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function packMcpApiTokenIdentifier(userId: string, tokenId: string) {
  return `${mcpTokenPrefix}:${userId}:${tokenId}`;
}

function unpackMcpApiTokenIdentifier(identifier: string) {
  const [prefix, userId, tokenId] = identifier.split(":");

  if (prefix !== mcpTokenPrefix || !userId || !tokenId) {
    return null;
  }

  return { userId, tokenId };
}

function packMcpApiTokenHash(token: string) {
  return `${mcpTokenPrefix}:${createHash("sha256").update(token).digest("base64url")}`;
}

function getMcpApiTokenTtlMs() {
  const safeDays = Number.isFinite(mcpApiTokenTtlDays)
    ? Math.max(1, Math.min(3650, mcpApiTokenTtlDays))
    : 365;

  return safeDays * 24 * 60 * 60 * 1000;
}

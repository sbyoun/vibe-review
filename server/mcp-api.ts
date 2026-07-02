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
export const mcpApiTokenNeverExpiresAt = new Date("9999-12-31T23:59:59.000Z");

export async function requireMcpUser(request: Request): Promise<McpUser> {
  const token = readBearerToken(request);
  const user = await getMcpUserForToken(token);

  if (user) {
    return user;
  }

  throw new ApiError(401, "unauthorized", "Invalid or missing bearer token.");
}

export async function getMcpUserForToken(token?: string | null): Promise<McpUser | null> {
  await ensureDemoData();

  if (!token) {
    return null;
  }

  return (await findEnvTokenUser(token)) ?? (await findIssuedTokenUser(token));
}

export async function createMcpApiToken(
  userId: string,
  options: { expiresAt?: Date } = {},
) {
  const token = `vibe_mcp_${randomUUID().replaceAll("-", "")}_${randomUUID().replaceAll("-", "")}`;
  const tokenId = randomUUID();
  const expires = options.expiresAt ?? mcpApiTokenNeverExpiresAt;

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
    emailVerified: Boolean(user.emailVerified),
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

export function getRequestOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");

  if (host) {
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
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

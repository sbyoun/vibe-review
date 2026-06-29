import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { users, type User } from "@/db/schema";
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

export async function requireMcpUser(request: Request): Promise<McpUser> {
  await ensureDemoData();

  const configuredToken = process.env.MCP_API_TOKEN;

  if (!configuredToken) {
    throw new ApiError(
      503,
      "mcp_api_not_configured",
      "MCP API is not configured. Set MCP_API_TOKEN and MCP_API_USER_HANDLE or MCP_API_USER_ID.",
    );
  }

  const token = readBearerToken(request);

  if (!token || !safeTokenEquals(token, configuredToken)) {
    throw new ApiError(401, "unauthorized", "Invalid or missing bearer token.");
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

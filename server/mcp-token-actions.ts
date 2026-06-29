"use server";

import { and, desc, eq, gt, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import { createMcpApiToken, mcpTokenPrefix } from "@/server/mcp-api";
import { requireCurrentUser } from "@/server/current-user";

export type McpTokenSummary = {
  id: string;
  label: string;
  expiresAt: string;
};

export type McpTokenActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  token?: string;
  expiresAt?: string;
  revokedTokenId?: string;
  revokedCount?: number;
};

export async function listCurrentUserMcpTokens(): Promise<McpTokenSummary[]> {
  const user = await requireCurrentUser();
  const rows = await db
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(
      and(
        like(verificationTokens.identifier, `${mcpTokenPrefix}:${user.id}:%`),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .orderBy(desc(verificationTokens.expires));

  return rows.map((row) => {
    const id = row.identifier.replace(`${mcpTokenPrefix}:${user.id}:`, "");

    return {
      id,
      label: id.slice(0, 8),
      expiresAt: row.expires.toISOString(),
    };
  });
}

export async function createCurrentUserMcpToken(
  _previousState: McpTokenActionState,
  formData: FormData,
): Promise<McpTokenActionState> {
  if (formData.get("intent") !== "create") {
    return {
      status: "error",
      message: "Invalid token request.",
    };
  }

  const user = await requireCurrentUser();
  const token = await createMcpApiToken(user.id);

  revalidatePath("/settings");

  return {
    status: "success",
    message: "MCP token issued.",
    token: token.token,
    expiresAt: token.expiresAt.toISOString(),
  };
}

export async function revokeCurrentUserMcpToken(
  _previousState: McpTokenActionState,
  formData: FormData,
): Promise<McpTokenActionState> {
  const tokenId = readRequiredString(formData.get("tokenId"));

  if (!tokenId) {
    return {
      status: "error",
      message: "Token id is required.",
    };
  }

  const user = await requireCurrentUser();
  const rows = await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, `${mcpTokenPrefix}:${user.id}:${tokenId}`))
    .returning({ identifier: verificationTokens.identifier });

  revalidatePath("/settings");

  return {
    status: "success",
    message: rows.length > 0 ? "MCP token revoked." : "MCP token was already revoked.",
    revokedTokenId: tokenId,
    revokedCount: rows.length,
  };
}

export async function revokeCurrentUserMcpTokens(
  _previousState: McpTokenActionState,
  formData: FormData,
): Promise<McpTokenActionState> {
  const confirm = formData.get("confirm") === "true";

  if (!confirm) {
    return {
      status: "error",
      message: "Confirmation is required.",
    };
  }

  const user = await requireCurrentUser();
  const rows = await db
    .delete(verificationTokens)
    .where(like(verificationTokens.identifier, `${mcpTokenPrefix}:${user.id}:%`))
    .returning({ identifier: verificationTokens.identifier });

  revalidatePath("/settings");

  return {
    status: "success",
    message: `Revoked ${rows.length} MCP token${rows.length === 1 ? "" : "s"}.`,
    revokedCount: rows.length,
  };
}

function readRequiredString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

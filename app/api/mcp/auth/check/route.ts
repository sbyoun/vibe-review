import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);

    return apiJson({
      authenticated: true,
      user: {
        id: user.id,
        handle: user.handle,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
      },
      capabilities: [
        "projects:list",
        "projects:create",
        "projects:read",
        "projects:update",
        "projects:history",
        "projects:delete",
        "projects:claim",
        "ownership_claims:list",
        "ownership_claims:approve",
        "ownership_claims:reject",
        "ownership_claims:withdraw",
        "feedback:read",
        "feedback:create",
        "feedback:update",
        "feedback:delete",
        "auth_tokens:revoke",
        "auth_account:delete",
      ],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

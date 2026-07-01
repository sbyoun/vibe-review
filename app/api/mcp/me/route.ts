import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);

    return apiJson({
      user: {
        id: user.id,
        handle: user.handle,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

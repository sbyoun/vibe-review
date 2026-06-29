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
        feedbackCredits: user.feedbackCredits,
        reputationScore: user.reputationScore,
      },
      capabilities: [
        "projects:list",
        "projects:create",
        "projects:read",
        "feedback_requests:create",
        "feedback:read",
        "feedback_assigned:read",
      ],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";
import { listMcpFeedback } from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const feedback = await listMcpFeedback(user, new URL(request.url));

    return apiJson({ feedback });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

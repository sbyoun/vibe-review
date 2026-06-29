import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";
import { listMcpAssignedFeedback } from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const assigned = await listMcpAssignedFeedback(user);

    return apiJson({ assigned });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

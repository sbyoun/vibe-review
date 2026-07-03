import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";
import { claimMcpProject } from "@/server/mcp-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const result = await claimMcpProject(user, projectId);

    return apiJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

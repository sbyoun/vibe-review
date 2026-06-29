import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";
import { getMcpProject } from "@/server/mcp-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const data = await getMcpProject(user, projectId);

    return apiJson(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

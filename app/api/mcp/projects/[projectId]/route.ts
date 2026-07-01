import { apiErrorResponse, apiJson, readJson, requireMcpUser } from "@/server/mcp-api";
import {
  deleteMcpProject,
  getMcpProject,
  updateMcpProject,
  updateMcpProjectSchema,
} from "@/server/mcp-service";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const input = await readJson(request, updateMcpProjectSchema);
    const project = await updateMcpProject(user, projectId, input);

    return apiJson({ project });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const result = await deleteMcpProject(user, projectId);

    return apiJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

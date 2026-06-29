import { apiErrorResponse, apiJson, readJson, requireMcpUser } from "@/server/mcp-api";
import {
  createMcpProject,
  createMcpProjectSchema,
  listMcpProjects,
} from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const projects = await listMcpProjects(user);

    return apiJson({ projects });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const input = await readJson(request, createMcpProjectSchema);
    const project = await createMcpProject(user, input);

    return apiJson({ project }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

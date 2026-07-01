import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";
import {
  listMcpProjectRevisions,
  listMcpProjectRevisionsSchema,
} from "@/server/mcp-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const url = new URL(request.url);
    const input = listMcpProjectRevisionsSchema.parse({
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    });
    const revisions = await listMcpProjectRevisions(user, projectId, input);

    return apiJson({ revisions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

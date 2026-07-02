import { ApiError, apiErrorResponse, apiJson } from "@/server/mcp-api";
import { getPublicMcpProject, getPublicMcpProjectSchema } from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = getPublicMcpProjectSchema.safeParse({
      projectId: url.searchParams.get("projectId") ?? undefined,
      handle: url.searchParams.get("handle") ?? undefined,
      slug: url.searchParams.get("slug") ?? undefined,
    });

    if (!parsed.success) {
      throw new ApiError(422, "validation_error", "Query parameters failed validation.", parsed.error.flatten());
    }

    const input = parsed.data;
    const data = await getPublicMcpProject(input);

    return apiJson(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

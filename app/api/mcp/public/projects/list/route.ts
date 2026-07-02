import { ApiError, apiErrorResponse, apiJson } from "@/server/mcp-api";
import { listPublicMcpProjects, listPublicMcpProjectsSchema } from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = listPublicMcpProjectsSchema.safeParse({
      limit: readNumberParam(url, "limit"),
      offset: readNumberParam(url, "offset"),
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      tag: url.searchParams.get("tag") ?? undefined,
      tool: url.searchParams.get("tool") ?? undefined,
    });

    if (!parsed.success) {
      throw new ApiError(422, "validation_error", "Query parameters failed validation.", parsed.error.flatten());
    }

    return apiJson(await listPublicMcpProjects(parsed.data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function readNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);

  return value === null ? undefined : Number(value);
}

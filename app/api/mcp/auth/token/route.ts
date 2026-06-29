import { apiErrorResponse, apiJson, readJson } from "@/server/mcp-api";
import { createMcpToken, createMcpTokenSchema } from "@/server/mcp-auth-service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, createMcpTokenSchema);
    const result = await createMcpToken(input);

    return apiJson(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

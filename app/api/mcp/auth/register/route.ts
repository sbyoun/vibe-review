import { apiErrorResponse, apiJson, readJson } from "@/server/mcp-api";
import { registerMcpAccount, registerMcpAccountSchema } from "@/server/mcp-auth-service";

export async function POST(request: Request) {
  try {
    if (process.env.MCP_API_REGISTRATION_DISABLED === "true") {
      return apiJson(
        {
          error: {
            code: "registration_disabled",
            message: "MCP account registration is disabled on this server.",
          },
        },
        { status: 403 },
      );
    }

    const input = await readJson(request, registerMcpAccountSchema);
    const result = await registerMcpAccount(input);

    return apiJson(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

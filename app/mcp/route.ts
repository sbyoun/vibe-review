import { apiJson, getRequestOrigin } from "@/server/mcp-api";
import { handleMcpJsonRpc } from "@/server/mcp-protocol";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store",
  "MCP-Protocol-Version": "2025-11-25",
};

export async function GET(request: Request) {
  const baseUrl = getRequestOrigin(request);

  return apiJson(
    {
      name: "vibearchive MCP Server",
      endpoint: `${baseUrl}/mcp`,
      transport: "streamable_http",
      protocol: "model_context_protocol",
      instructions:
        "Configure your MCP client with this URL and use POST JSON-RPC. Browser automation is not supported.",
      supportedMethods: ["initialize", "ping", "tools/list", "tools/call"],
      exampleInitialize: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "example-client",
            version: "1.0.0",
          },
        },
      },
    },
    {
      status: 200,
      headers: responseHeaders,
    },
  );
}

export async function POST(request: Request) {
  const originError = validateOrigin(request);

  if (originError) {
    return originError;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return apiJson(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      },
      { headers: responseHeaders },
    );
  }

  const result = await handleMcpJsonRpc(request, payload);

  if (result === null || (Array.isArray(result) && result.length === 0)) {
    return new Response(null, {
      status: 202,
      headers: responseHeaders,
    });
  }

  return apiJson(result, { headers: responseHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...responseHeaders,
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function validateOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (origin === getRequestOrigin(request)) {
    return null;
  }

  return apiJson(
    {
      error: {
        code: "forbidden_origin",
        message: "MCP requests from browser origins other than this site are not accepted.",
      },
    },
    {
      status: 403,
      headers: responseHeaders,
    },
  );
}

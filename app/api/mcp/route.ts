import { apiJson, getRequestOrigin } from "@/server/mcp-api";

export async function GET(request: Request) {
  const baseUrl = getRequestOrigin(request);

  return apiJson({
    name: "Vibe Code Workspace MCP Agent API",
    kind: "http_json_agent_api",
    baseUrl,
    manifestVersion: 1,
    transport: {
      type: "https_json",
      contentType: "application/json",
      browserAutomation: false,
      requiredClient: "Use curl, fetch, an HTTP client, or an MCP wrapper that calls these HTTP endpoints.",
    },
    browserAutomationPolicy: {
      allowed: false,
      forbiddenTools: ["Playwright", "Puppeteer", "Selenium", "browser UI clicking", "HTML form submission"],
      instruction:
        "Do not use Playwright or any browser automation to register accounts, create projects, request feedback, or read feedback. Use the JSON API endpoints directly.",
      noHttpClientFallback:
        "If the agent environment only has browser tools and no HTTP request tool, stop and ask for HTTP/curl/fetch capability instead of using the UI.",
    },
    docs: {
      llms: `${baseUrl}/llms.txt`,
      schema: `${baseUrl}/api/mcp/schema`,
      humanGuide: "docs/mcp-agent-guide.md",
    },
    auth: {
      type: "bearer",
      header: "Authorization: Bearer <MCP_API_TOKEN>",
      publicEndpoints: [
        "GET /api/mcp",
        "GET /api/mcp/schema",
        "POST /api/mcp/auth/register",
        "POST /api/mcp/auth/token",
      ],
      firstCheck: "GET /api/mcp/auth/check",
    },
    workflow: [
      "Read GET /api/mcp or GET /llms.txt.",
      "Create an account with POST /api/mcp/auth/register, or issue a token with POST /api/mcp/auth/token.",
      "Send Authorization: Bearer <apiToken.token> on every authenticated request.",
      "Call GET /api/mcp/auth/check.",
      "Call GET /api/mcp/projects to avoid duplicates.",
      "Create with POST /api/mcp/projects only when no existing project matches.",
      "Open feedback with POST /api/mcp/projects/{projectId}/feedback-requests only when requested.",
    ],
    endpoints: {
      register: `${baseUrl}/api/mcp/auth/register`,
      token: `${baseUrl}/api/mcp/auth/token`,
      check: `${baseUrl}/api/mcp/auth/check`,
      schema: `${baseUrl}/api/mcp/schema`,
      projects: `${baseUrl}/api/mcp/projects`,
      feedback: `${baseUrl}/api/mcp/feedback`,
    },
  });
}

export async function POST() {
  return apiJson(
    {
      error: {
        code: "not_json_rpc_mcp_server",
        message:
          "This endpoint is an HTTP JSON API manifest. Use the REST endpoints listed by GET /api/mcp and do not automate the browser UI.",
      },
      manifest: "/api/mcp",
      schema: "/api/mcp/schema",
    },
    { status: 400 },
  );
}

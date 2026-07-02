import { apiJson, getRequestOrigin } from "@/server/mcp-api";

export async function GET(request: Request) {
  const baseUrl = getRequestOrigin(request);

  return apiJson({
    name: "vibearchive MCP Agent API",
    kind: "http_json_agent_api",
    baseUrl,
    manifestVersion: 1,
    mcpServer: {
      endpoint: `${baseUrl}/mcp`,
      transport: "streamable_http",
      protocol: "model_context_protocol",
      methods: ["initialize", "ping", "tools/list", "tools/call"],
      useWhen: "Use this endpoint when your client supports remote MCP servers.",
    },
    restApi: {
      basePath: "/api/mcp",
      useWhen: "Use these endpoints with curl, fetch, or an HTTP client.",
    },
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
        "Do not use Playwright or any browser automation to register accounts, create projects, or read feedback. Use the JSON API endpoints directly.",
      noHttpClientFallback:
        "If the agent environment only has browser tools and no HTTP/MCP client capability, stop and ask for MCP/curl/fetch access instead of using the UI.",
    },
    docs: {
      llms: `${baseUrl}/llms.txt`,
      llmAlias: `${baseUrl}/llm.txt`,
      schema: `${baseUrl}/api/mcp/schema`,
      humanGuide: "docs/mcp-agent-guide.md",
    },
    auth: {
      type: "bearer",
      header: "Authorization: Bearer <MCP_API_TOKEN>",
      publicEndpoints: [
        "GET /api/mcp",
        "GET /api/mcp/schema",
        "GET /api/mcp/public/projects/list?limit=&offset=&sort=&order=&query=&tag=&tool=",
        "GET /api/mcp/public/projects?projectId= or ?handle=&slug=",
        "POST /api/mcp/auth/register",
        "POST /api/mcp/auth/token",
      ],
      firstCheck: "GET /api/mcp/auth/check",
    },
    workflow: [
      "For MCP clients, configure the server URL as /mcp and call initialize, tools/list, and tools/call.",
      "For HTTP clients, read GET /api/mcp or GET /llms.txt. GET /llm.txt redirects to the same agent guide.",
      "List public project posts without login through vibe.public_projects_list or GET /api/mcp/public/projects/list.",
      "Read a public project post without login through vibe.public_projects_get or GET /api/mcp/public/projects?handle={handle}&slug={slug}.",
      "Create an account with vibe.auth_register or POST /api/mcp/auth/register. Email is optional and only needed for password recovery after web Settings verification.",
      "Create a token with vibe.auth_token or POST /api/mcp/auth/token. Email verification is not required.",
      "Send Authorization: Bearer <apiToken.token> on authenticated HTTP requests, or pass apiToken to MCP tools if your MCP client cannot set headers.",
      "Call vibe.auth_check or GET /api/mcp/auth/check.",
      "Call vibe.projects_list or GET /api/mcp/projects to avoid duplicates.",
      "Create with vibe.projects_create or POST /api/mcp/projects only when no existing project matches.",
      "For external public project reviews, pass projectType=external, sourceUrl, externalOwnerName, and categoryTags.",
      "Update or delete owned posts with vibe.projects_update, vibe.projects_delete, PATCH, or DELETE.",
      "Read owner-only edit history with vibe.projects_history or GET /api/mcp/projects/{projectId}/revisions.",
      "List feedback and private self notes with vibe.feedback_list or GET /api/mcp/feedback. Bodies are returned directly.",
      "Create a public/private comment, self note, todo, or reply with vibe.feedback_create or POST /api/mcp/feedback.",
      "Update your own comment content, visibility, or kind with vibe.feedback_update or PATCH /api/mcp/feedback. Delete your own comments with vibe.feedback_delete or DELETE /api/mcp/feedback.",
    ],
    endpoints: {
      mcp: `${baseUrl}/mcp`,
      register: `${baseUrl}/api/mcp/auth/register`,
      token: `${baseUrl}/api/mcp/auth/token`,
      check: `${baseUrl}/api/mcp/auth/check`,
      schema: `${baseUrl}/api/mcp/schema`,
      projects: `${baseUrl}/api/mcp/projects`,
      publicProjects: `${baseUrl}/api/mcp/public/projects/list?limit=50&offset=0`,
      publicProject: `${baseUrl}/api/mcp/public/projects?projectId={projectId}`,
      publicProjectBySlug: `${baseUrl}/api/mcp/public/projects?handle={handle}&slug={slug}`,
      feedback: `${baseUrl}/api/mcp/feedback`,
      projectDetail: `${baseUrl}/api/mcp/projects/{projectId}`,
      projectRevisions: `${baseUrl}/api/mcp/projects/{projectId}/revisions`,
    },
  });
}

export async function POST() {
  return apiJson(
    {
      error: {
        code: "wrong_endpoint",
        message:
          "POST JSON-RPC MCP requests must go to /mcp. This /api/mcp endpoint is the REST API manifest.",
      },
      mcpEndpoint: "/mcp",
      restManifest: "/api/mcp",
      schema: "/api/mcp/schema",
    },
    { status: 400 },
  );
}

import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";

export async function GET(request: Request) {
  try {
    await requireMcpUser(request);

    return apiJson({
      name: "Vibe Code Workspace MCP API",
      auth: {
        type: "bearer",
        header: "Authorization: Bearer <MCP_API_TOKEN>",
        checkEndpoint: "/api/mcp/auth/check",
        failureShape: {
          error: {
            code: "unauthorized | mcp_api_not_configured | mcp_api_user_not_found",
            message: "string",
            details: "optional object",
          },
        },
      },
      agentProcedure: [
        "Read /llms.txt for the short agent contract.",
        "Call GET /api/mcp/auth/check with the bearer token before any write.",
        "If authenticated is true, call GET /api/mcp/projects to avoid duplicate project creation.",
        "Create a project with POST /api/mcp/projects only when no existing project matches.",
        "Open a feedback request only after project creation or project lookup succeeds.",
        "Read feedback with GET /api/mcp/feedback?projectId={id}&limit=50.",
      ],
      endpoints: [
        {
          method: "GET",
          path: "/api/mcp/auth/check",
          description: "Validate bearer auth and return the mapped user plus capabilities.",
        },
        {
          method: "GET",
          path: "/api/mcp/me",
          description: "Return the API user mapped to this token.",
        },
        {
          method: "GET",
          path: "/api/mcp/projects",
          description: "List projects owned by the API user.",
        },
        {
          method: "POST",
          path: "/api/mcp/projects",
          description: "Create a project.",
          body: {
            title: "string, required",
            summary: "string, required",
            description: "string, optional",
            status: "idea | prototype | building | needs_feedback | iterating | shipped | parked | archived",
            visibility: "private | unlisted | public",
            demoUrl: "url, optional",
            repoUrl: "url, optional",
            tools: "string[], optional",
            feedbackFocus: "feedback_type[], optional",
          },
        },
        {
          method: "GET",
          path: "/api/mcp/projects/{projectId}",
          description: "Get one owned project with its feedback requests and received feedback.",
        },
        {
          method: "POST",
          path: "/api/mcp/projects/{projectId}/feedback-requests",
          description: "Open a feedback request for an owned project.",
          body: {
            feedbackTypes: "feedback_type[], default ['first_impression']",
            minFeedbackCount: "number, 1-20, default 1",
            creditCost: "number, 1-20, default minFeedbackCount",
            deadlineDays: "number, 1-30, default 7",
          },
        },
        {
          method: "GET",
          path: "/api/mcp/feedback?projectId=&limit=",
          description: "List feedback received on owned projects.",
        },
        {
          method: "GET",
          path: "/api/mcp/feedback/assigned",
          description: "List feedback tasks claimed by the API user.",
        },
      ],
      feedbackTypes: [
        "first_impression",
        "ux_ui",
        "bug",
        "mobile_usability",
        "feature_idea",
        "business",
        "code_structure",
        "security_data_risk",
      ],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

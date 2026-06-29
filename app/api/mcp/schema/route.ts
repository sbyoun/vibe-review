import { apiErrorResponse, apiJson, requireMcpUser } from "@/server/mcp-api";

export async function GET(request: Request) {
  try {
    await requireMcpUser(request);

    return apiJson({
      name: "Vibe Code Workspace MCP API",
      auth: {
        type: "bearer",
        header: "Authorization: Bearer <MCP_API_TOKEN>",
      },
      endpoints: [
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

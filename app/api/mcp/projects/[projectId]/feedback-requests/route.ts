import { apiErrorResponse, apiJson, readJson, requireMcpUser } from "@/server/mcp-api";
import {
  createMcpFeedbackRequest,
  createMcpFeedbackRequestSchema,
} from "@/server/mcp-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireMcpUser(request);
    const { projectId } = await params;
    const input = await readJson(request, createMcpFeedbackRequestSchema);
    const feedbackRequest = await createMcpFeedbackRequest(user, projectId, input);

    return apiJson({ request: feedbackRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

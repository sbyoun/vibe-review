import { apiErrorResponse, apiJson, readJson, requireMcpUser } from "@/server/mcp-api";
import {
  createMcpFeedback,
  createMcpFeedbackSchema,
  deleteMcpFeedback,
  deleteMcpFeedbackSchema,
  listMcpFeedback,
  updateMcpFeedback,
  updateMcpFeedbackSchema,
} from "@/server/mcp-service";

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const feedback = await listMcpFeedback(user, new URL(request.url));

    return apiJson({ feedback });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const input = await readJson(request, createMcpFeedbackSchema);
    const feedback = await createMcpFeedback(user, input);

    return apiJson({ feedback }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const input = await readJson(request, updateMcpFeedbackSchema);
    const feedback = await updateMcpFeedback(user, input);

    return apiJson({ feedback });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const input = await readJson(request, deleteMcpFeedbackSchema);
    const result = await deleteMcpFeedback(user, input);

    return apiJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

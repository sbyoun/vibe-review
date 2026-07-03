import { z } from "zod";

import { apiErrorResponse, apiJson, readJson, requireMcpUser } from "@/server/mcp-api";
import {
  approveMcpOwnershipClaim,
  listMcpOwnershipClaims,
  mcpOwnershipClaimIdSchema,
  rejectMcpOwnershipClaim,
  withdrawMcpOwnershipClaim,
} from "@/server/mcp-service";

const ownershipClaimActionSchema = mcpOwnershipClaimIdSchema.extend({
  action: z.enum(["approve", "reject", "withdraw"]),
});

export async function GET(request: Request) {
  try {
    const user = await requireMcpUser(request);

    return apiJson(await listMcpOwnershipClaims(user));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireMcpUser(request);
    const input = await readJson(request, ownershipClaimActionSchema);

    if (input.action === "approve") {
      return apiJson(await approveMcpOwnershipClaim(user, input.claimId));
    }

    if (input.action === "reject") {
      return apiJson(await rejectMcpOwnershipClaim(user, input.claimId));
    }

    return apiJson(await withdrawMcpOwnershipClaim(user, input.claimId));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

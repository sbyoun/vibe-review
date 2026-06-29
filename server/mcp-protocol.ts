import { z } from "zod";

import { ApiError, getMcpUserForToken, requireMcpUser, serializeMcpUser } from "@/server/mcp-api";
import {
  createMcpToken,
  createMcpTokenSchema,
  deleteMcpAccount,
  deleteMcpAccountSchema,
  registerMcpAccount,
  registerMcpAccountSchema,
  revokeMcpTokens,
  revokeMcpTokensSchema,
} from "@/server/mcp-auth-service";
import {
  createMcpFeedbackRequest,
  createMcpFeedbackRequestSchema,
  createMcpProject,
  createMcpProjectSchema,
  deleteMcpProject,
  getMcpProject,
  listMcpAssignedFeedback,
  listMcpFeedback,
  listMcpProjects,
} from "@/server/mcp-service";

const protocolVersion = "2025-11-25";
const supportedProtocolVersions = [protocolVersion, "2025-06-18", "2025-03-26", "2024-11-05"];

type JsonObject = Record<string, unknown>;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    };

const apiTokenSchema = z.object({
  apiToken: z.string().trim().min(1).optional(),
});

const projectIdSchema = apiTokenSchema.extend({
  projectId: z.string().trim().min(1),
});

const feedbackListSchema = apiTokenSchema.extend({
  projectId: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const tools = [
  {
    name: "vibe.auth_register",
    title: "Register Vibe Workspace Account",
    description: "Create a Vibe Code Workspace account and return a one-time-visible MCP API token.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        handle: { type: "string", minLength: 2, maxLength: 48 },
        name: { type: "string", maxLength: 120 },
        password: { type: "string", minLength: 8, maxLength: 128 },
      },
      required: ["email", "handle", "password"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.auth_token",
    title: "Issue Vibe Workspace API Token",
    description: "Issue a new MCP API token for an existing account using handle/email and password.",
    inputSchema: {
      type: "object",
      properties: {
        login: { type: "string" },
        password: { type: "string" },
      },
      required: ["login", "password"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.auth_check",
    title: "Check Vibe Workspace Auth",
    description:
      "Validate the current bearer token. If the MCP client cannot set headers, pass apiToken as an argument.",
    inputSchema: authInputSchema(),
  },
  {
    name: "vibe.auth_tokens_revoke",
    title: "Revoke Vibe MCP API Tokens",
    description:
      "Revoke all MCP API tokens for the authenticated user. Requires confirm: true. The current token will stop working.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        confirm: { type: "boolean", const: true },
      },
      required: ["confirm"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.auth_account_delete",
    title: "Delete Vibe Workspace Account",
    description:
      "Delete the authenticated account, its projects, and its MCP API tokens. Requires confirm: true and confirmEmail.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        confirmEmail: { type: "string", format: "email" },
        confirm: { type: "boolean", const: true },
      },
      required: ["confirmEmail", "confirm"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.projects_list",
    title: "List Vibe Projects",
    description:
      "List projects owned by the authenticated user. Always call this before creating a project to avoid duplicates.",
    inputSchema: authInputSchema(),
  },
  {
    name: "vibe.projects_create",
    title: "Create Vibe Project",
    description: "Create a project owned by the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        title: { type: "string", minLength: 1, maxLength: 160 },
        summary: { type: "string", minLength: 1, maxLength: 500 },
        description: { type: "string" },
        status: {
          type: "string",
          enum: [
            "idea",
            "prototype",
            "building",
            "needs_feedback",
            "iterating",
            "shipped",
            "parked",
            "archived",
          ],
        },
        visibility: { type: "string", enum: ["private", "unlisted", "public"] },
        demoUrl: { type: "string", format: "uri" },
        repoUrl: { type: "string", format: "uri" },
        tools: { type: "array", items: { type: "string" }, maxItems: 12 },
        feedbackFocus: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "first_impression",
              "ux_ui",
              "bug",
              "mobile_usability",
              "feature_idea",
              "business",
              "code_structure",
              "security_data_risk",
            ],
          },
          maxItems: 8,
        },
      },
      required: ["title", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.projects_get",
    title: "Get Vibe Project",
    description: "Read one owned project with feedback requests and received feedback.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.projects_delete",
    title: "Delete Vibe Project",
    description: "Delete one project owned by the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_requests_create",
    title: "Create Vibe Feedback Request",
    description: "Open a feedback request for an owned project. This spends feedback credits.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
        feedbackTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "first_impression",
              "ux_ui",
              "bug",
              "mobile_usability",
              "feature_idea",
              "business",
              "code_structure",
              "security_data_risk",
            ],
          },
          minItems: 1,
          maxItems: 8,
        },
        minFeedbackCount: { type: "integer", minimum: 1, maximum: 20 },
        creditCost: { type: "integer", minimum: 1, maximum: 20 },
        deadlineDays: { type: "integer", minimum: 1, maximum: 30 },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_list",
    title: "List Vibe Feedback",
    description: "List feedback received on projects owned by the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_assigned_list",
    title: "List Assigned Vibe Feedback Tasks",
    description: "List feedback tasks currently claimed by the authenticated user.",
    inputSchema: authInputSchema(),
  },
];

export async function handleMcpJsonRpc(request: Request, payload: unknown) {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return jsonRpcError(null, -32600, "Invalid Request", "Batch requests must not be empty.");
    }

    const responses = await Promise.all(payload.map((item) => handleOneJsonRpc(request, item)));
    return responses.filter((response): response is JsonRpcResponse => response !== null);
  }

  return handleOneJsonRpc(request, payload);
}

async function handleOneJsonRpc(
  request: Request,
  payload: unknown,
): Promise<JsonRpcResponse | null> {
  if (!isJsonObject(payload) || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return jsonRpcError(readJsonRpcId(payload), -32600, "Invalid Request");
  }

  const rpcRequest = payload as JsonRpcRequest;
  const isNotification = !("id" in rpcRequest);

  try {
    switch (rpcRequest.method) {
      case "initialize":
        return isNotification ? null : jsonRpcResult(rpcRequest.id ?? null, initializeResult(rpcRequest.params));
      case "ping":
        return isNotification ? null : jsonRpcResult(rpcRequest.id ?? null, {});
      case "tools/list":
        return isNotification ? null : jsonRpcResult(rpcRequest.id ?? null, { tools });
      case "tools/call":
        return isNotification
          ? null
          : jsonRpcResult(rpcRequest.id ?? null, await callTool(request, rpcRequest.params));
      case "notifications/initialized":
      case "notifications/cancelled":
      case "notifications/progress":
        return null;
      default:
        return isNotification
          ? null
          : jsonRpcError(rpcRequest.id ?? null, -32601, "Method not found", rpcRequest.method);
    }
  } catch (error) {
    return isNotification
      ? null
      : jsonRpcError(
          rpcRequest.id ?? null,
          -32603,
          "Internal error",
          error instanceof Error ? error.message : "Unexpected MCP server error.",
        );
  }
}

async function callTool(request: Request, params: unknown) {
  const parsed = z
    .object({
      name: z.string().min(1),
      arguments: z.record(z.unknown()).optional().default({}),
    })
    .safeParse(params);

  if (!parsed.success) {
    return toolError({
      code: "invalid_tool_call",
      message: "tools/call params must include name and optional arguments.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const args = parsed.data.arguments;

    switch (parsed.data.name) {
      case "vibe.auth_register":
        return toolSuccess(await authRegister(args));
      case "vibe.auth_token":
        return toolSuccess(await authToken(args));
      case "vibe.auth_check":
        return toolSuccess(await authCheck(request, args));
      case "vibe.auth_tokens_revoke":
        return toolSuccess(await authTokensRevoke(request, args));
      case "vibe.auth_account_delete":
        return toolSuccess(await authAccountDelete(request, args));
      case "vibe.projects_list":
        return toolSuccess({ projects: await listMcpProjects(await requireToolUser(request, args)) });
      case "vibe.projects_create":
        return toolSuccess(await projectsCreate(request, args));
      case "vibe.projects_get":
        return toolSuccess(await projectsGet(request, args));
      case "vibe.projects_delete":
        return toolSuccess(await projectsDelete(request, args));
      case "vibe.feedback_requests_create":
        return toolSuccess(await feedbackRequestCreate(request, args));
      case "vibe.feedback_list":
        return toolSuccess({ feedback: await feedbackList(request, args) });
      case "vibe.feedback_assigned_list":
        return toolSuccess({
          tasks: await listMcpAssignedFeedback(await requireToolUser(request, args)),
        });
      default:
        return toolError({
          code: "unknown_tool",
          message: `Unknown tool: ${parsed.data.name}`,
        });
    }
  } catch (error) {
    return toolError(errorToToolError(error));
  }
}

async function authRegister(args: JsonObject) {
  if (process.env.MCP_API_REGISTRATION_DISABLED === "true") {
    throw new ApiError(403, "registration_disabled", "MCP account registration is disabled on this server.");
  }

  const input = parseToolInput(registerMcpAccountSchema, args);
  return registerMcpAccount(input);
}

async function authToken(args: JsonObject) {
  const input = parseToolInput(createMcpTokenSchema, args);
  return createMcpToken(input);
}

async function authCheck(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);

  return {
    authenticated: true,
    user: serializeMcpUser(user),
    capabilities: [
      "projects:list",
      "projects:create",
      "projects:delete",
      "projects:read",
      "auth_tokens:revoke",
      "auth_account:delete",
      "feedback_requests:create",
      "feedback:read",
      "feedback_assigned:read",
    ],
  };
}

async function authTokensRevoke(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(revokeMcpTokensSchema, stripApiToken(args));

  return revokeMcpTokens(user, input);
}

async function authAccountDelete(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(deleteMcpAccountSchema, stripApiToken(args));

  return deleteMcpAccount(user, input);
}

async function projectsCreate(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(createMcpProjectSchema, stripApiToken(args));
  const project = await createMcpProject(user, input);

  return { project };
}

async function projectsGet(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(projectIdSchema, args);

  return getMcpProject(user, input.projectId);
}

async function projectsDelete(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(projectIdSchema, args);

  return deleteMcpProject(user, input.projectId);
}

async function feedbackRequestCreate(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const { projectId, ...feedbackArgs } = parseToolInput(
    projectIdSchema.merge(createMcpFeedbackRequestSchema.partial()),
    args,
  );
  const requestRow = await createMcpFeedbackRequest(
    user,
    projectId,
    parseToolInput(createMcpFeedbackRequestSchema, feedbackArgs),
  );

  return { request: requestRow };
}

async function feedbackList(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(feedbackListSchema, args);
  const url = new URL("https://mcp.local/feedback");

  if (input.projectId) {
    url.searchParams.set("projectId", input.projectId);
  }

  if (input.limit) {
    url.searchParams.set("limit", String(input.limit));
  }

  return listMcpFeedback(user, url);
}

async function requireToolUser(request: Request, args: JsonObject) {
  const input = parseToolInput(apiTokenSchema, args);

  if (input.apiToken) {
    const user = await getMcpUserForToken(input.apiToken);

    if (user) {
      return user;
    }

    throw new ApiError(401, "unauthorized", "Invalid apiToken argument.");
  }

  return requireMcpUser(request);
}

function initializeResult(params: unknown) {
  const requestedVersion =
    isJsonObject(params) && typeof params.protocolVersion === "string"
      ? params.protocolVersion
      : protocolVersion;

  return {
    protocolVersion: supportedProtocolVersions.includes(requestedVersion)
      ? requestedVersion
      : protocolVersion,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: "vibe-code-workspace",
      title: "Vibe Code Workspace",
      version: "0.1.0",
    },
    instructions:
      "Use tools/list and tools/call on this MCP endpoint. Do not use browser automation. Register or issue a token first, then pass Authorization: Bearer <token> or apiToken in tool arguments.",
  };
}

function jsonRpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

function toolSuccess(structuredContent: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
    isError: false,
  };
}

function toolError(error: { code: string; message: string; details?: unknown }) {
  return {
    content: [{ type: "text", text: JSON.stringify({ error }, null, 2) }],
    structuredContent: { error },
    isError: true,
  };
}

function errorToToolError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    code: "internal_error",
    message: error instanceof Error ? error.message : "Unexpected MCP tool error.",
  };
}

function parseToolInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  args: JsonObject,
): z.output<TSchema> {
  const result = schema.safeParse(args);

  if (!result.success) {
    throw new ApiError(422, "validation_error", "Tool arguments failed validation.", result.error.flatten());
  }

  return result.data;
}

function authInputSchema() {
  return {
    type: "object",
    properties: authInputProperties(),
    additionalProperties: false,
  };
}

function authInputProperties() {
  return {
    apiToken: {
      type: "string",
      description:
        "Optional. Prefer Authorization: Bearer <token>. Use this only when the MCP client cannot set request headers.",
    },
  };
}

function stripApiToken(args: JsonObject) {
  const rest = { ...args };
  delete rest.apiToken;
  return rest;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonRpcId(value: unknown) {
  if (!isJsonObject(value)) {
    return null;
  }

  return typeof value.id === "string" || typeof value.id === "number" || value.id === null
    ? value.id
    : null;
}

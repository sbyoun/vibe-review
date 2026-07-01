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
  createMcpFeedback,
  createMcpFeedbackSchema,
  createMcpProject,
  createMcpProjectSchema,
  deleteMcpFeedback,
  deleteMcpFeedbackSchema,
  deleteMcpProject,
  getMcpProject,
  listMcpProjectRevisions,
  listMcpProjectRevisionsSchema,
  listMcpFeedback,
  listMcpProjects,
  updateMcpFeedback,
  updateMcpFeedbackSchema,
  updateMcpProject,
  updateMcpProjectSchema,
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
  includePrivate: z.boolean().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  kind: z.enum(["feedback", "self_note", "todo", "decision", "update", "release"]).optional(),
});

const projectUpdateSchema = apiTokenSchema.extend({
  projectId: z.string().trim().min(1),
  patch: updateMcpProjectSchema,
});

const projectHistorySchema = apiTokenSchema.extend({
  projectId: z.string().trim().min(1),
  limit: z.number().int().min(1).max(100).optional(),
});

const feedbackCreateSchema = createMcpFeedbackSchema.extend({
  apiToken: z.string().trim().min(1).optional(),
});

const feedbackUpdateSchema = apiTokenSchema.and(updateMcpFeedbackSchema);

const feedbackDeleteSchema = deleteMcpFeedbackSchema.extend({
  apiToken: z.string().trim().min(1).optional(),
});

const tools = [
  {
    name: "vibe.auth_register",
    title: "Register Vibe Workspace Account",
    description:
      "Create a VibeReview account and send an email verification link. Call vibe.auth_token after verification.",
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
    description:
      "Issue a new MCP API token for an email-verified account using handle/email and password.",
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
      "List owned projects and external project reviews managed by the authenticated user. Always call this before creating a project to avoid duplicates.",
    inputSchema: authInputSchema(),
  },
  {
    name: "vibe.projects_create",
    title: "Create Vibe Project",
    description:
      "Create an owned project or external public project review. summary and description support Markdown; thumbnailUrl, images, or thumbnailBase64 can provide screenshots.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        title: { type: "string", minLength: 1, maxLength: 160 },
        summary: { type: "string", minLength: 1, maxLength: 500, description: "Markdown supported." },
        description: { type: "string", description: "Markdown supported." },
        projectType: { type: "string", enum: ["owned", "external"], default: "owned" },
        externalOwnerName: { type: "string", maxLength: 160 },
        externalOwnerUrl: { type: "string", format: "uri" },
        sourceUrl: {
          type: "string",
          format: "uri",
          description: "Original project URL. Required for external projects unless demoUrl or repoUrl is present.",
        },
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
        thumbnailUrl: {
          type: "string",
          format: "uri",
          description: "Optional screenshot or thumbnail image URL. Stored as the project cover image.",
        },
        coverImageUrl: {
          type: "string",
          format: "uri",
          description: "Alias for thumbnailUrl.",
        },
        thumbnailBase64: {
          type: "string",
          description:
            "Optional base64 image bytes or data URI. Use with thumbnailMimeType unless using a data URI. Max decoded size 5MB.",
        },
        thumbnailMimeType: {
          type: "string",
          enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        },
        images: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              url: { type: "string", format: "uri" },
              alt: { type: "string", maxLength: 160 },
            },
            required: ["url"],
            additionalProperties: false,
          },
          description: "Optional image list. The first URL is used as the project thumbnail.",
        },
        tools: { type: "array", items: { type: "string" }, maxItems: 12 },
        categoryTags: { type: "array", items: { type: "string" }, maxItems: 12 },
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
    description: "Read one owned project with its received feedback comments.",
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
    name: "vibe.projects_update",
    title: "Update Vibe Project",
    description:
      "Update one project post owned by the authenticated user. The slug stays stable. Markdown descriptions and thumbnails are supported.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
        patch: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1, maxLength: 160 },
            summary: { type: "string", minLength: 1, maxLength: 500, description: "Markdown supported." },
            description: { type: ["string", "null"], description: "Markdown supported." },
            projectType: { type: "string", enum: ["owned", "external"] },
            externalOwnerName: { type: ["string", "null"], maxLength: 160 },
            externalOwnerUrl: { type: ["string", "null"], format: "uri" },
            sourceUrl: { type: ["string", "null"], format: "uri" },
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
            demoUrl: { type: ["string", "null"], format: "uri" },
            repoUrl: { type: ["string", "null"], format: "uri" },
            thumbnailUrl: {
              type: ["string", "null"],
              format: "uri",
              description: "Set, replace, or clear the project thumbnail URL.",
            },
            coverImageUrl: {
              type: ["string", "null"],
              format: "uri",
              description: "Alias for thumbnailUrl.",
            },
            thumbnailBase64: {
              type: "string",
              description:
                "Optional base64 image bytes or data URI. Use with thumbnailMimeType unless using a data URI. Max decoded size 5MB.",
            },
            thumbnailMimeType: {
              type: "string",
              enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            },
            images: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri" },
                  alt: { type: "string", maxLength: 160 },
                },
                required: ["url"],
                additionalProperties: false,
              },
              description: "The first URL replaces the project thumbnail. Empty array clears it.",
            },
            tools: { type: "array", items: { type: "string" }, maxItems: 12 },
            categoryTags: { type: "array", items: { type: "string" }, maxItems: 12 },
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
          additionalProperties: false,
        },
      },
      required: ["projectId", "patch"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.projects_history",
    title: "List Vibe Project Revision History",
    description:
      "List owner-only saved versions for one project. Returns prior title, summary, Markdown description, links, image, category tags, tools, status, and visibility.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 30 },
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
    name: "vibe.feedback_list",
    title: "List Vibe Feedback",
    description:
      "List feedback comments, private notes, and action items on owned projects. Bodies are returned directly.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        includePrivate: { type: "boolean", default: true },
        visibility: { type: "string", enum: ["public", "private"] },
        kind: {
          type: "string",
          enum: ["feedback", "self_note", "todo", "decision", "update", "release"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_create",
    title: "Create Vibe Feedback",
    description:
      "Post a feedback comment on a visible project. Pass parentFeedbackId to create a reply in the same thread.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        projectId: { type: "string", format: "uuid" },
        parentFeedbackId: { type: "string", format: "uuid" },
        body: { type: "string", minLength: 1, maxLength: 2000 },
        feedbackType: {
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
        rating: { type: "integer", minimum: 1, maximum: 5 },
        visibility: { type: "string", enum: ["public", "private"] },
        kind: {
          type: "string",
          enum: ["feedback", "self_note", "todo", "decision", "update", "release"],
          description: "Project owners can create self_note, todo, decision, update, or release comments.",
        },
      },
      required: ["projectId", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_update",
    title: "Update Vibe Feedback",
    description: "Update your own comment content, visibility, or kind.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        feedbackId: { type: "string", format: "uuid" },
        body: { type: "string", minLength: 1, maxLength: 2000 },
        feedbackType: {
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
        rating: { type: "integer", minimum: 1, maximum: 5 },
        visibility: { type: "string", enum: ["public", "private"] },
        kind: {
          type: "string",
          enum: ["feedback", "self_note", "todo", "decision", "update", "release"],
        },
      },
      required: ["feedbackId"],
      additionalProperties: false,
    },
  },
  {
    name: "vibe.feedback_delete",
    title: "Delete Vibe Feedback",
    description: "Delete one feedback comment authored by the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        ...authInputProperties(),
        feedbackId: { type: "string", format: "uuid" },
      },
      required: ["feedbackId"],
      additionalProperties: false,
    },
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
      case "vibe.projects_update":
        return toolSuccess(await projectsUpdate(request, args));
      case "vibe.projects_history":
        return toolSuccess(await projectsHistory(request, args));
      case "vibe.projects_delete":
        return toolSuccess(await projectsDelete(request, args));
      case "vibe.feedback_list":
        return toolSuccess({ feedback: await feedbackList(request, args) });
      case "vibe.feedback_create":
        return toolSuccess({ feedback: await feedbackCreate(request, args) });
      case "vibe.feedback_update":
        return toolSuccess({ feedback: await feedbackUpdate(request, args) });
      case "vibe.feedback_delete":
        return toolSuccess(await feedbackDelete(request, args));
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
      "projects:history",
      "projects:read",
      "projects:update",
      "auth_tokens:revoke",
      "auth_account:delete",
      "feedback:read",
      "feedback:create",
      "feedback:update",
      "feedback:delete",
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

async function projectsUpdate(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(projectUpdateSchema, args);

  return {
    project: await updateMcpProject(user, input.projectId, input.patch),
  };
}

async function projectsHistory(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(projectHistorySchema, args);
  const revisionInput = listMcpProjectRevisionsSchema.parse({
    limit: input.limit,
  });

  return {
    revisions: await listMcpProjectRevisions(user, input.projectId, revisionInput),
  };
}

async function projectsDelete(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(projectIdSchema, args);

  return deleteMcpProject(user, input.projectId);
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

  if (input.includePrivate !== undefined) {
    url.searchParams.set("includePrivate", String(input.includePrivate));
  }

  if (input.visibility) {
    url.searchParams.set("visibility", input.visibility);
  }

  if (input.kind) {
    url.searchParams.set("kind", input.kind);
  }

  return listMcpFeedback(user, url);
}

async function feedbackCreate(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(feedbackCreateSchema, args);
  const feedbackInput = {
    projectId: input.projectId,
    parentFeedbackId: input.parentFeedbackId,
    body: input.body,
    feedbackType: input.feedbackType,
    rating: input.rating,
    visibility: input.visibility,
    kind: input.kind,
  };

  return createMcpFeedback(user, feedbackInput);
}

async function feedbackUpdate(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(feedbackUpdateSchema, args);
  const feedbackInput = {
    feedbackId: input.feedbackId,
    body: input.body,
    feedbackType: input.feedbackType,
    rating: input.rating,
    visibility: input.visibility,
    kind: input.kind,
  };

  return updateMcpFeedback(user, feedbackInput);
}

async function feedbackDelete(request: Request, args: JsonObject) {
  const user = await requireToolUser(request, args);
  const input = parseToolInput(feedbackDeleteSchema, args);

  return deleteMcpFeedback(user, { feedbackId: input.feedbackId });
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
      title: "VibeReview",
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

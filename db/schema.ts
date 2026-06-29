import { relations, sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const projectStatus = pgEnum("project_status", [
  "idea",
  "prototype",
  "building",
  "needs_feedback",
  "iterating",
  "shipped",
  "parked",
  "archived",
]);

export const projectVisibility = pgEnum("project_visibility", ["private", "unlisted", "public"]);
export const projectLinkKind = pgEnum("project_link_kind", [
  "demo",
  "repository",
  "deployment",
  "writeup",
  "other",
]);
export const storageProvider = pgEnum("storage_provider", ["s3_compatible"]);
export const feedbackRequestStatus = pgEnum("feedback_request_status", [
  "draft",
  "open",
  "fulfilled",
  "expired",
  "cancelled",
]);
export const feedbackClaimStatus = pgEnum("feedback_claim_status", [
  "claimed",
  "submitted",
  "cancelled",
  "expired",
]);
export const feedbackType = pgEnum("feedback_type", [
  "first_impression",
  "ux_ui",
  "bug",
  "mobile_usability",
  "feature_idea",
  "business",
  "code_structure",
  "security_data_risk",
]);
export const feedbackHelpfulStatus = pgEnum("feedback_helpful_status", [
  "unreviewed",
  "helpful",
  "not_helpful",
]);
export const feedbackImplementationStatus = pgEnum("feedback_implementation_status", [
  "unreviewed",
  "planned",
  "implemented",
  "rejected",
  "later",
]);
export const creditLedgerReason = pgEnum("credit_ledger_reason", [
  "earned_feedback",
  "spent_feedback_request",
  "request_refund",
  "admin_adjustment",
]);
export const notificationKind = pgEnum("notification_kind", [
  "feedback_received",
  "request_due",
  "request_fulfilled",
  "feedback_marked_helpful",
  "feedback_implemented",
  "project_status_changed",
]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    handle: varchar("handle", { length: 48 }).unique(),
    passwordHash: text("password_hash"),
    bio: text("bio"),
    primaryRoles: text("primary_roles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    toolsUsed: text("tools_used")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    feedbackCredits: integer("feedback_credits").notNull().default(0),
    reputationScore: integer("reputation_score").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("users_handle_idx").on(table.handle),
    index("users_reputation_score_idx").on(table.reputationScore),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    summary: text("summary").notNull(),
    description: text("description"),
    status: projectStatus("status").notNull().default("idea"),
    visibility: projectVisibility("visibility").notNull().default("private"),
    demoUrl: text("demo_url"),
    repoUrl: text("repo_url"),
    coverImageObjectKey: text("cover_image_object_key"),
    coverImageUrl: text("cover_image_url"),
    tools: text("tools")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    feedbackFocus: feedbackType("feedback_focus")
      .array()
      .notNull()
      .default(sql`'{}'::feedback_type[]`),
    buildStartedAt: timestamp("build_started_at", { mode: "date" }),
    buildShippedAt: timestamp("build_shipped_at", { mode: "date" }),
    lastActivityAt: timestamp("last_activity_at", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_owner_slug_idx").on(table.ownerId, table.slug),
    index("projects_owner_status_idx").on(table.ownerId, table.status),
    index("projects_visibility_idx").on(table.visibility),
    index("projects_last_activity_idx").on(table.lastActivityAt),
  ],
);

export const projectLinks = pgTable(
  "project_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: projectLinkKind("kind").notNull(),
    label: varchar("label", { length: 80 }),
    url: text("url").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("project_links_project_id_idx").on(table.projectId)],
);

export const projectAssets = pgTable(
  "project_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    provider: storageProvider("provider").notNull().default("s3_compatible"),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url"),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    visibility: projectVisibility("visibility").notNull().default("private"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_assets_object_key_idx").on(table.bucket, table.objectKey),
    index("project_assets_project_id_idx").on(table.projectId),
  ],
);

export const projectStatusEvents = pgTable(
  "project_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    fromStatus: projectStatus("from_status"),
    toStatus: projectStatus("to_status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("project_status_events_project_id_idx").on(table.projectId),
    index("project_status_events_actor_id_idx").on(table.actorId),
  ],
);

export const feedbackRequests = pgTable(
  "feedback_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestedById: text("requested_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedbackTypes: feedbackType("feedback_types")
      .array()
      .notNull()
      .default(sql`'{}'::feedback_type[]`),
    creditCost: integer("credit_cost").notNull().default(3),
    minFeedbackCount: integer("min_feedback_count").notNull().default(3),
    deadlineAt: timestamp("deadline_at", { mode: "date" }).notNull(),
    status: feedbackRequestStatus("status").notNull().default("open"),
    fulfilledAt: timestamp("fulfilled_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_requests_project_id_idx").on(table.projectId),
    index("feedback_requests_status_deadline_idx").on(table.status, table.deadlineAt),
    index("feedback_requests_requested_by_idx").on(table.requestedById),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => feedbackRequests.id, { onDelete: "set null" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedbackType: feedbackType("feedback_type").notNull(),
    body: text("body").notNull(),
    rating: integer("rating"),
    helpfulStatus: feedbackHelpfulStatus("helpful_status").notNull().default("unreviewed"),
    implementedStatus: feedbackImplementationStatus("implemented_status")
      .notNull()
      .default("unreviewed"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_project_id_idx").on(table.projectId),
    index("feedback_request_id_idx").on(table.requestId),
    index("feedback_author_id_idx").on(table.authorId),
  ],
);

export const feedbackClaims = pgTable(
  "feedback_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => feedbackRequests.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: feedbackClaimStatus("status").notNull().default("claimed"),
    dueAt: timestamp("due_at", { mode: "date" }).notNull(),
    submittedFeedbackId: uuid("submitted_feedback_id").references(() => feedback.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_claims_request_status_idx").on(table.requestId, table.status),
    index("feedback_claims_reviewer_status_idx").on(table.reviewerId, table.status),
    index("feedback_claims_due_at_idx").on(table.dueAt),
  ],
);

export const feedbackReactions = pgTable(
  "feedback_reactions",
  {
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    helpful: boolean("helpful").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.feedbackId, table.userId] }),
    index("feedback_reactions_user_id_idx").on(table.userId),
  ],
);

export const feedbackImplementationEvents = pgTable(
  "feedback_implementation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    status: feedbackImplementationStatus("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_implementation_events_feedback_id_idx").on(table.feedbackId),
    index("feedback_implementation_events_actor_id_idx").on(table.actorId),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    reason: creditLedgerReason("reason").notNull(),
    relatedRequestId: uuid("related_request_id").references(() => feedbackRequests.id, {
      onDelete: "set null",
    }),
    relatedFeedbackId: uuid("related_feedback_id").references(() => feedback.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotency_key").unique(),
    balanceAfter: integer("balance_after"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("credit_ledger_user_id_idx").on(table.userId),
    index("credit_ledger_related_request_id_idx").on(table.relatedRequestId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_unread_idx").on(table.userId, table.readAt),
  ],
);

export const toolTags = pgTable(
  "tool_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("tool_tags_slug_idx").on(table.slug)],
);

export const projectToolTags = pgTable(
  "project_tool_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    toolTagId: uuid("tool_tag_id")
      .notNull()
      .references(() => toolTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.toolTagId] }),
    index("project_tool_tags_tool_tag_id_idx").on(table.toolTagId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projects: many(projects),
  authoredFeedback: many(feedback),
  feedbackClaims: many(feedbackClaims),
  creditLedgerEntries: many(creditLedger),
  notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  links: many(projectLinks),
  assets: many(projectAssets),
  statusEvents: many(projectStatusEvents),
  feedbackRequests: many(feedbackRequests),
  feedback: many(feedback),
  feedbackClaims: many(feedbackClaims),
  projectToolTags: many(projectToolTags),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({ one, many }) => ({
  project: one(projects, {
    fields: [feedbackRequests.projectId],
    references: [projects.id],
  }),
  requestedBy: one(users, {
    fields: [feedbackRequests.requestedById],
    references: [users.id],
  }),
  feedback: many(feedback),
  claims: many(feedbackClaims),
}));

export const feedbackRelations = relations(feedback, ({ one, many }) => ({
  project: one(projects, {
    fields: [feedback.projectId],
    references: [projects.id],
  }),
  request: one(feedbackRequests, {
    fields: [feedback.requestId],
    references: [feedbackRequests.id],
  }),
  author: one(users, {
    fields: [feedback.authorId],
    references: [users.id],
  }),
  reactions: many(feedbackReactions),
  implementationEvents: many(feedbackImplementationEvents),
}));

export const feedbackClaimsRelations = relations(feedbackClaims, ({ one }) => ({
  request: one(feedbackRequests, {
    fields: [feedbackClaims.requestId],
    references: [feedbackRequests.id],
  }),
  project: one(projects, {
    fields: [feedbackClaims.projectId],
    references: [projects.id],
  }),
  reviewer: one(users, {
    fields: [feedbackClaims.reviewerId],
    references: [users.id],
  }),
  submittedFeedback: one(feedback, {
    fields: [feedbackClaims.submittedFeedbackId],
    references: [feedback.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
export type FeedbackRequest = InferSelectModel<typeof feedbackRequests>;
export type NewFeedbackRequest = InferInsertModel<typeof feedbackRequests>;
export type Feedback = InferSelectModel<typeof feedback>;
export type NewFeedback = InferInsertModel<typeof feedback>;
export type FeedbackClaim = InferSelectModel<typeof feedbackClaims>;
export type NewFeedbackClaim = InferInsertModel<typeof feedbackClaims>;
export type CreditLedgerEntry = InferSelectModel<typeof creditLedger>;
export type NewCreditLedgerEntry = InferInsertModel<typeof creditLedger>;

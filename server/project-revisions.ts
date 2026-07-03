import {
  projectRevisions,
  projects,
} from "@/db/schema";

type ProjectRow = typeof projects.$inferSelect;
type ProjectRevisionInsert = typeof projectRevisions.$inferInsert;

export type ProjectRevisionSource =
  | "web_update"
  | "web_status"
  | "web_restore"
  | "web_claim"
  | "mcp_update"
  | "mcp_claim";

export function projectRevisionValues(
  project: ProjectRow,
  actorId: string | null,
  source: ProjectRevisionSource,
): ProjectRevisionInsert {
  return {
    projectId: project.id,
    actorId,
    source,
    title: project.title,
    summary: project.summary,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    demoUrl: project.demoUrl,
    repoUrl: project.repoUrl,
    coverImageObjectKey: project.coverImageObjectKey,
    coverImageUrl: project.coverImageUrl,
    projectType: project.projectType,
    externalOwnerName: project.externalOwnerName,
    externalOwnerUrl: project.externalOwnerUrl,
    sourceUrl: project.sourceUrl,
    tools: project.tools,
    categoryTags: project.categoryTags,
    feedbackFocus: project.feedbackFocus,
  };
}

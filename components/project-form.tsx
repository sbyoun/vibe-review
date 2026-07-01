import { Button } from "@/components/ui/button";
import {
  projectStatuses,
  projectTypes,
  projectVisibilities,
  statusLabel,
  type ProjectStatus,
  type ProjectType,
  type ProjectVisibility,
} from "@/lib/domain";

const inputClass =
  "vc-input";

const labelClass = "vc-label";

type EditableProject = {
  id?: string;
  title?: string;
  summary?: string;
  description?: string | null;
  projectType?: ProjectType;
  externalOwnerName?: string | null;
  externalOwnerUrl?: string | null;
  sourceUrl?: string | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  demoUrl?: string | null;
  repoUrl?: string | null;
  tools?: string[];
  categoryTags?: string[];
  coverImageUrl?: string | null;
};

type ProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  project?: EditableProject;
  cancelHref?: string;
};

export function ProjectForm({ action, mode, project, cancelHref = "/discover" }: ProjectFormProps) {
  const isEdit = mode === "edit";

  return (
    <form action={action} className="flex flex-col gap-4">
      {isEdit && project?.id ? (
        <input type="hidden" name="projectId" value={project.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className={labelClass}>Submission Type</span>
          <select
            className={inputClass}
            name="projectType"
            defaultValue={project?.projectType ?? "owned"}
          >
            {projectTypes.map((projectType) => (
              <option key={projectType} value={projectType}>
                {projectType === "owned" ? "My project" : "External public project"}
              </option>
            ))}
          </select>
          <span className="text-xs leading-5 text-muted-foreground">
            External projects are reviewed or bookmarked, not shown as your own archive item.
          </span>
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Original Source URL</span>
          <input
            className={inputClass}
            name="sourceUrl"
            type="url"
            placeholder="https://original-project.example.com"
            defaultValue={project?.sourceUrl ?? ""}
          />
          <span className="text-xs leading-5 text-muted-foreground">
            Required for external public projects.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className={labelClass}>External Owner Name</span>
          <input
            className={inputClass}
            name="externalOwnerName"
            maxLength={160}
            placeholder="Creator, team, or product owner"
            defaultValue={project?.externalOwnerName ?? ""}
          />
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>External Owner URL</span>
          <input
            className={inputClass}
            name="externalOwnerUrl"
            type="url"
            placeholder="https://owner.example.com"
            defaultValue={project?.externalOwnerUrl ?? ""}
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className={labelClass}>Title</span>
        <input
          className={inputClass}
          name="title"
          required
          maxLength={160}
          placeholder="e.g., An open-source lightweight web server"
          defaultValue={project?.title ?? ""}
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Summary</span>
        <textarea
          className={inputClass}
          name="summary"
          required
          rows={3}
          maxLength={500}
          placeholder="Short intro shown in the board list."
          defaultValue={project?.summary ?? ""}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className={labelClass}>Live Demo URL</span>
          <input
            className={inputClass}
            name="demoUrl"
            type="url"
            placeholder="https://demo.example.com"
            defaultValue={project?.demoUrl ?? ""}
          />
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Git Repository URL</span>
          <input
            className={inputClass}
            name="repoUrl"
            type="url"
            placeholder="https://github.com/..."
            defaultValue={project?.repoUrl ?? ""}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className={labelClass}>Category Tags</span>
          <input
            className={inputClass}
            name="categoryTags"
            placeholder="e.g., SaaS, devtool, productivity"
            defaultValue={project?.categoryTags?.join(", ") ?? ""}
          />
          <span className="text-xs leading-5 text-muted-foreground">
            Freeform tags for discovery and search.
          </span>
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Development Stage</span>
          <select className={inputClass} name="status" defaultValue={project?.status ?? "idea"}>
            {projectStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1">
        <span className={labelClass}>Description Markdown</span>
        <textarea
          className={inputClass}
          name="description"
          rows={12}
          placeholder="Describe the project. Markdown is supported: headings, lists, links, code blocks..."
          defaultValue={project?.description ?? ""}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className={labelClass}>Visibility</span>
          <select
            className={inputClass}
            name="visibility"
            defaultValue={project?.visibility ?? "public"}
          >
            {projectVisibilities.map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibility}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className={labelClass}>Tech Stack</span>
          <input
            className={inputClass}
            name="tools"
            placeholder="e.g., React, Rust, SQLite"
            defaultValue={project?.tools?.join(", ") ?? ""}
          />
        </label>
      </div>

      <div className="grid gap-3">
        <div className="flex justify-between gap-3">
          <span className={labelClass}>Project Image</span>
          <span className="text-[11px] leading-[14px] text-muted-foreground">Optional</span>
        </div>
        {project?.coverImageUrl ? (
          <div className="relative aspect-video overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <input
          className={inputClass}
          name="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
        />
        <span className="text-xs leading-5 text-muted-foreground">
          If no image is uploaded, a demo URL screenshot will be attempted.
        </span>
      </div>

      <div className="mt-4 flex justify-end gap-4 border-t border-border pt-4">
        <Button type="button" variant="ghost" asChild>
          <a href={cancelHref}>Cancel</a>
        </Button>
        <Button type="submit">
          {isEdit ? "Save" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

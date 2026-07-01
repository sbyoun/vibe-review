"use client";

import { RotateCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type Revision = {
  id: string;
  source: string;
  title: string;
  summary: string;
  status: string;
  visibility: string;
  createdAt: string;
  actorName: string | null;
  actorHandle: string | null;
};

type RevisionHistoryPanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  revisions: Revision[];
};

const sourceLabel: Record<string, string> = {
  web_update: "Edit",
  web_status: "Status",
  web_restore: "Restore",
  mcp_update: "MCP",
};

export function RevisionHistoryPanel({
  action,
  revisions,
}: RevisionHistoryPanelProps) {
  return (
    <aside className="border border-border bg-card p-4 lg:sticky lg:top-8">
      <h2 className="text-base font-semibold leading-[22px] text-foreground">History</h2>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        Owner-only saved versions before each edit.
      </p>

      {revisions.length === 0 ? (
        <p className="mt-5 text-sm leading-5 text-muted-foreground">
          No previous versions yet.
        </p>
      ) : (
        <ol className="mt-5 flex flex-col gap-4">
          {revisions.map((revision) => (
            <li key={revision.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-4 text-muted-foreground">
                    {formatRevisionTime(revision.createdAt)}
                  </p>
                  <h3 className="mt-1 truncate text-sm font-semibold leading-5 text-foreground">
                    {revision.title}
                  </h3>
                </div>
                <span className="shrink-0 border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-[14px] text-muted-foreground">
                  {sourceLabel[revision.source] ?? revision.source}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {revision.summary}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] leading-[14px] text-muted-foreground">
                <span>{revision.status}</span>
                <span>|</span>
                <span>{revision.visibility}</span>
                {revision.actorHandle ? (
                  <>
                    <span>|</span>
                    <span>@{revision.actorHandle}</span>
                  </>
                ) : revision.actorName ? (
                  <>
                    <span>|</span>
                    <span>{revision.actorName}</span>
                  </>
                ) : null}
              </div>
              <form
                action={action}
                className="mt-3"
                onSubmit={(event) => {
                  if (!window.confirm("Restore this version? The current version will be saved in history first.")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="revisionId" value={revision.id} />
                <RestoreButton />
              </form>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function RestoreButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <RotateCcw className="size-4" aria-hidden="true" />
      {pending ? "Restoring..." : "Restore"}
    </Button>
  );
}

function formatRevisionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

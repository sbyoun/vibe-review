"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Save, Trash2 } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  feedbackKindLabel,
  feedbackKinds,
  feedbackTypeLabel,
  feedbackTypes,
  feedbackVisibilityLabel,
  feedbackVisibilities,
  formatShortDate,
  type FeedbackKind,
  type FeedbackType,
  type FeedbackVisibility,
} from "@/lib/domain";
import {
  createFeedback,
  deleteFeedback,
  toggleFeedbackUpvote,
  updateFeedbackDetails,
} from "@/server/actions";

const inputClass = "vc-input";
const compactInputClass = "vc-input-compact";

type FeedbackEntry = {
  id: string;
  projectId: string;
  parentFeedbackId: string | null;
  authorId: string;
  authorName: string | null;
  feedbackType: FeedbackType;
  body: string;
  rating: number | null;
  visibility: FeedbackVisibility;
  kind: FeedbackKind;
  createdAt: Date | string;
  upvoteCount: number;
  viewerHasUpvoted: boolean;
};

type FeedbackThreadProps = {
  feedback: FeedbackEntry[];
  viewerId: string | null;
  isOwner: boolean;
  projectPath: string;
};

type FeedbackFilter = "all" | "public" | "private";

const ownerKindOptions: FeedbackKind[] = [...feedbackKinds];

export function FeedbackThread({ feedback, viewerId, isOwner, projectPath }: FeedbackThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const router = useRouter();
  const repliesByParent = groupReplies(feedback);
  const rootEntries = feedback.filter((entry) => !entry.parentFeedbackId);
  const filterOptions = getFilterOptions(feedback, isOwner);
  const filteredRootEntries = rootEntries.filter((entry) => {
    if (matchesFilter(entry, filter)) {
      return true;
    }

    return (repliesByParent.get(entry.id) ?? []).some((reply) => matchesFilter(reply, filter));
  });

  async function saveFeedback(formData: FormData) {
    await updateFeedbackDetails(formData);
    setEditingId(null);
    router.refresh();
  }

  async function replyToFeedback(formData: FormData) {
    await createFeedback(formData);
    setReplyingId(null);
    router.refresh();
  }

  async function removeFeedback(formData: FormData) {
    await deleteFeedback(formData);
    setEditingId(null);
    setReplyingId(null);
    router.refresh();
  }

  async function upvoteFeedback(formData: FormData) {
    await toggleFeedbackUpvote(formData);
    router.refresh();
  }

  if (feedback.length === 0) {
    return <p className="py-5 text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rounded-sm border px-2 py-1 text-xs font-medium leading-4 ${
              filter === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredRootEntries.length > 0 ? (
        <div className="flex flex-col gap-6">
          {filteredRootEntries.map((entry) => (
            <FeedbackItem
              key={entry.id}
              entry={entry}
              repliesByParent={repliesByParent}
              viewerId={viewerId}
              isOwner={isOwner}
              filter={filter}
              projectPath={projectPath}
              editingId={editingId}
              replyingId={replyingId}
              onEdit={setEditingId}
              onReply={setReplyingId}
              onSave={saveFeedback}
              onReplySubmit={replyToFeedback}
              onDeleteSubmit={removeFeedback}
              onUpvote={upvoteFeedback}
            />
          ))}
        </div>
      ) : (
        <p className="py-5 text-sm text-muted-foreground">No comments match this filter.</p>
      )}
    </div>
  );
}

function FeedbackItem({
  entry,
  repliesByParent,
  viewerId,
  isOwner,
  filter,
  projectPath,
  editingId,
  replyingId,
  onEdit,
  onReply,
  onSave,
  onReplySubmit,
  onDeleteSubmit,
  onUpvote,
}: {
  entry: FeedbackEntry;
  repliesByParent: Map<string, FeedbackEntry[]>;
  viewerId: string | null;
  isOwner: boolean;
  filter: FeedbackFilter;
  projectPath: string;
  editingId: string | null;
  replyingId: string | null;
  onEdit: (id: string | null) => void;
  onReply: (id: string | null) => void;
  onSave: (formData: FormData) => Promise<void>;
  onReplySubmit: (formData: FormData) => Promise<void>;
  onDeleteSubmit: (formData: FormData) => Promise<void>;
  onUpvote: (formData: FormData) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const canEditFeedback = viewerId === entry.authorId;
  const isEditing = editingId === entry.id;
  const isReplying = replyingId === entry.id;
  const replies = (repliesByParent.get(entry.id) ?? []).filter((reply) => matchesFilter(reply, filter));

  return (
    <article
      id={`feedback-${entry.id}`}
      className="-mx-2 scroll-mt-24 rounded-sm px-2 py-2 hover:bg-muted"
    >
      {isEditing ? (
        <form action={onSave} className="grid gap-3">
          <input type="hidden" name="feedbackId" value={entry.id} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FeedbackAuthor entry={entry} />
            <div className="flex flex-wrap items-center gap-2">
              <select className={compactInputClass} name="visibility" defaultValue={entry.visibility} aria-label="Visibility">
                {feedbackVisibilities.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {feedbackVisibilityLabel[visibility]}
                  </option>
                ))}
              </select>
              {isOwner ? (
                <>
                  <select className={compactInputClass} name="kind" defaultValue={entry.kind} aria-label="Comment kind">
                    {ownerKindOptions.map((kind) => (
                      <option key={kind} value={kind}>
                        {feedbackKindLabel[kind]}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              {entry.kind === "feedback" ? (
                <>
                  <select
                    className={compactInputClass}
                    name="feedbackType"
                    defaultValue={entry.feedbackType}
                    aria-label="Feedback type"
                  >
                    {feedbackTypes.map((type) => (
                      <option key={type} value={type}>
                        {feedbackTypeLabel[type]}
                      </option>
                    ))}
                  </select>
                  <select
                    className={compactInputClass}
                    name="rating"
                    defaultValue={entry.rating ?? 4}
                    aria-label="Rating"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <input type="hidden" name="feedbackType" value={entry.feedbackType} />
                  <input type="hidden" name="rating" value={entry.rating ?? 4} />
                </>
              )}
            </div>
          </div>
          <textarea
            className={inputClass}
            name="body"
            required
            rows={5}
            defaultValue={entry.body}
            aria-label="Feedback"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              <Save className="size-4" aria-hidden="true" />
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
            {viewerId ? (
              <form action={onUpvote} className="flex">
                <input type="hidden" name="feedbackId" value={entry.id} />
                <button
                  type="submit"
                  className={
                    entry.viewerHasUpvoted
                      ? "text-secondary"
                      : "text-muted-foreground hover:text-secondary"
                  }
                  aria-pressed={entry.viewerHasUpvoted}
                  aria-label={entry.viewerHasUpvoted ? "Remove upvote" : "Upvote"}
                >
                  <ChevronUp className="size-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <a
                href={`/login?next=${encodeURIComponent(`${projectPath}#feedback-${entry.id}`)}`}
                className="text-muted-foreground hover:text-secondary"
                aria-label="Log in to upvote"
              >
                <ChevronUp className="size-4" aria-hidden="true" />
              </a>
            )}
            {entry.upvoteCount > 0 ? (
              <span className="font-medium text-foreground">{entry.upvoteCount}</span>
            ) : null}
            <a className="font-bold text-foreground hover:underline" href={`#feedback-${entry.id}`}>
              {entry.authorName ?? "User"}
            </a>
            <span>{formatShortDate(entry.createdAt)}</span>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand comment" : "Collapse comment"}
            >
              [{collapsed ? "+" : "-"}]
            </button>
            <FeedbackBadges entry={entry} />
          </div>

          <div className={collapsed ? "hidden" : "mt-1 pl-6"}>
            <div className="vc-markdown">
              <MarkdownContent>{entry.body}</MarkdownContent>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-medium leading-[14px] text-muted-foreground">
              {viewerId ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => onReply(isReplying ? null : entry.id)}
                >
                  reply
                </button>
              ) : null}
              <a href={`#feedback-${entry.id}`} className="hover:underline">
                link
              </a>
              {canEditFeedback ? (
                <button type="button" className="hover:underline" onClick={() => onEdit(entry.id)}>
                  edit
                </button>
              ) : null}
              {canEditFeedback ? (
                <form
                  action={onDeleteSubmit}
                  onSubmit={(event) => {
                    if (!window.confirm("Delete this comment?")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="feedbackId" value={entry.id} />
                  <button type="submit" className="inline-flex items-center gap-1 hover:underline">
                    <Trash2 className="size-3" aria-hidden="true" />
                    delete
                  </button>
                </form>
              ) : null}
            </div>

            {isReplying ? (
              <form action={onReplySubmit} className="mt-3 grid gap-2 border border-border bg-card p-3">
                <input type="hidden" name="projectId" value={entry.projectId} />
                <input type="hidden" name="parentFeedbackId" value={entry.id} />
                <input type="hidden" name="feedbackType" value="first_impression" />
                <input type="hidden" name="rating" value="4" />
                <input type="hidden" name="visibility" value={entry.visibility} />
                <input type="hidden" name="kind" value={isOwner && entry.visibility === "private" ? "self_note" : "feedback"} />
                <textarea
                  className={inputClass}
                  name="body"
                  required
                  rows={3}
                  placeholder="Write a reply..."
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onReply(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Reply
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          {!collapsed && replies.length > 0 ? (
            <div className="mt-3 border-l border-border pl-4">
              <div className="flex flex-col gap-3">
                {replies.map((reply) => (
                  <FeedbackItem
                    key={reply.id}
                    entry={reply}
                    repliesByParent={repliesByParent}
                    viewerId={viewerId}
                    isOwner={isOwner}
                    filter={filter}
                    projectPath={projectPath}
                    editingId={editingId}
                    replyingId={replyingId}
                    onEdit={onEdit}
                    onReply={onReply}
                    onSave={onSave}
                    onReplySubmit={onReplySubmit}
                    onDeleteSubmit={onDeleteSubmit}
                    onUpvote={onUpvote}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}

function FeedbackBadges({ entry }: { entry: FeedbackEntry }) {
  return (
    <>
      {entry.kind === "feedback" ? (
        <>
          <span className="ml-1 rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
            [{feedbackTypeLabel[entry.feedbackType]}]
          </span>
          <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {entry.rating ?? "-"} / 5
          </span>
        </>
      ) : null}
      {entry.visibility === "private" ? (
        <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
          private
        </span>
      ) : null}
      {entry.kind !== "feedback" ? (
        <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
          {feedbackKindLabel[entry.kind]}
        </span>
      ) : null}
    </>
  );
}

function getFilterOptions(feedback: FeedbackEntry[], isOwner: boolean) {
  const hasPrivate = feedback.some((entry) => entry.visibility === "private");
  const options: { value: FeedbackFilter; label: string }[] = [
    { value: "all", label: `All ${feedback.length}` },
    {
      value: "public",
      label: `Public ${feedback.filter((entry) => entry.visibility === "public").length}`,
    },
  ];

  if (isOwner || hasPrivate) {
    options.push({
      value: "private",
      label: `Private ${feedback.filter((entry) => entry.visibility === "private").length}`,
    });
  }

  return options;
}

function matchesFilter(entry: FeedbackEntry, filter: FeedbackFilter) {
  switch (filter) {
    case "public":
      return entry.visibility === "public";
    case "private":
      return entry.visibility === "private";
    case "all":
    default:
      return true;
  }
}

function groupReplies(feedback: FeedbackEntry[]) {
  const map = new Map<string, FeedbackEntry[]>();

  for (const entry of feedback) {
    if (!entry.parentFeedbackId) {
      continue;
    }

    const replies = map.get(entry.parentFeedbackId) ?? [];
    replies.push(entry);
    map.set(entry.parentFeedbackId, replies);
  }

  return map;
}

function FeedbackAuthor({ entry }: { entry: FeedbackEntry }) {
  return (
    <div>
      <h3 className="text-sm font-semibold leading-5">{entry.authorName ?? "User"}</h3>
      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        {formatShortDate(entry.createdAt)}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Save } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  feedbackTypeLabel,
  feedbackTypes,
  formatShortDate,
  type FeedbackType,
} from "@/lib/domain";
import { createFeedback, updateFeedbackDetails } from "@/server/actions";

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
  createdAt: Date | string;
};

type FeedbackThreadProps = {
  feedback: FeedbackEntry[];
  viewerId: string | null;
};

export function FeedbackThread({ feedback, viewerId }: FeedbackThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const router = useRouter();
  const repliesByParent = groupReplies(feedback);
  const rootEntries = feedback.filter((entry) => !entry.parentFeedbackId);

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

  if (feedback.length === 0) {
    return <p className="py-5 text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {rootEntries.map((entry) => (
        <FeedbackItem
          key={entry.id}
          entry={entry}
          repliesByParent={repliesByParent}
          viewerId={viewerId}
          editingId={editingId}
          replyingId={replyingId}
          onEdit={setEditingId}
          onReply={setReplyingId}
          onSave={saveFeedback}
          onReplySubmit={replyToFeedback}
        />
      ))}
    </div>
  );
}

function FeedbackItem({
  entry,
  repliesByParent,
  viewerId,
  editingId,
  replyingId,
  onEdit,
  onReply,
  onSave,
  onReplySubmit,
}: {
  entry: FeedbackEntry;
  repliesByParent: Map<string, FeedbackEntry[]>;
  viewerId: string | null;
  editingId: string | null;
  replyingId: string | null;
  onEdit: (id: string | null) => void;
  onReply: (id: string | null) => void;
  onSave: (formData: FormData) => Promise<void>;
  onReplySubmit: (formData: FormData) => Promise<void>;
}) {
  const canEditFeedback = viewerId === entry.authorId;
  const isEditing = editingId === entry.id;
  const isReplying = replyingId === entry.id;
  const replies = repliesByParent.get(entry.id) ?? [];

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
            <button
              type="button"
              className="text-muted-foreground hover:text-secondary"
              aria-label="Upvote"
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </button>
            <a className="font-bold text-foreground hover:underline" href={`#feedback-${entry.id}`}>
              {entry.authorName ?? "User"}
            </a>
            <span>({(entry.rating ?? 0) * 120})</span>
            <span>{formatShortDate(entry.createdAt)}</span>
            <span>[-]</span>
            <span className="ml-1 rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
              [{feedbackTypeLabel[entry.feedbackType]}]
            </span>
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {entry.rating ?? "-"} / 5
            </span>
          </div>

          <div className="mt-1 pl-6">
            <div className="vc-markdown">
              <MarkdownContent>{entry.body}</MarkdownContent>
            </div>
            <div className="mt-2 flex gap-3 text-[11px] font-medium leading-[14px] text-muted-foreground">
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
              <a href="#comments" className="hover:underline">
                flag
              </a>
            </div>

            {isReplying ? (
              <form action={onReplySubmit} className="mt-3 grid gap-2 border border-border bg-card p-3">
                <input type="hidden" name="projectId" value={entry.projectId} />
                <input type="hidden" name="parentFeedbackId" value={entry.id} />
                <input type="hidden" name="feedbackType" value="first_impression" />
                <input type="hidden" name="rating" value="4" />
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

          {replies.length > 0 ? (
            <div className="mt-3 border-l border-border pl-4">
              <div className="flex flex-col gap-3">
                {replies.map((reply) => (
                  <FeedbackItem
                    key={reply.id}
                    entry={reply}
                    repliesByParent={repliesByParent}
                    viewerId={viewerId}
                    editingId={editingId}
                    replyingId={replyingId}
                    onEdit={onEdit}
                    onReply={onReply}
                    onSave={onSave}
                    onReplySubmit={onReplySubmit}
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

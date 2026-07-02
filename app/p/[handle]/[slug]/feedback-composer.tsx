"use client";

import {
  feedbackKindLabel,
  feedbackTypeLabel,
  feedbackTypes,
  feedbackVisibilityLabel,
  feedbackVisibilities,
  type FeedbackKind,
} from "@/lib/domain";
import { createFeedback } from "@/server/actions";

const inputClass = "vc-input";
const compactInputClass = "vc-input-compact";

type FeedbackComposerProps = {
  projectId: string;
  viewerName: string | null;
  isOwner: boolean;
  loginRequired?: boolean;
  returnTo?: string;
};

const ownerKinds: FeedbackKind[] = ["self_note", "todo", "decision", "update", "release", "feedback"];

export function FeedbackComposer({
  projectId,
  viewerName,
  isOwner,
  loginRequired = false,
  returnTo,
}: FeedbackComposerProps) {
  return (
    <form id="feedback-composer" action={createFeedback} className="border border-border bg-card p-4">
      <input type="hidden" name="projectId" value={projectId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <textarea
        className={inputClass}
        name="body"
        required
        rows={5}
        placeholder="Add your perspective..."
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-medium leading-[14px] text-muted-foreground">
          Markdown supported · {loginRequired ? "log in to post" : `posting as ${viewerName}`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select className={compactInputClass} name="visibility" defaultValue={isOwner ? "private" : "public"} aria-label="Visibility">
            {feedbackVisibilities.map((visibility) => (
              <option key={visibility} value={visibility}>
                {feedbackVisibilityLabel[visibility]}
              </option>
            ))}
          </select>
          {isOwner ? (
            <>
              <select className={compactInputClass} name="kind" defaultValue="self_note" aria-label="Comment kind">
                {ownerKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {feedbackKindLabel[kind]}
                  </option>
                ))}
              </select>
              <input type="hidden" name="feedbackType" value="first_impression" />
              <input type="hidden" name="rating" value="4" />
            </>
          ) : (
            <>
              <input type="hidden" name="kind" value="feedback" />
              <select
                className={compactInputClass}
                name="feedbackType"
                defaultValue="first_impression"
                aria-label="Feedback type"
              >
                {feedbackTypes.map((type) => (
                  <option key={type} value={type}>
                    {feedbackTypeLabel[type]}
                  </option>
                ))}
              </select>
              <select className={compactInputClass} name="rating" defaultValue="4" aria-label="Rating">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="submit"
            className="bg-primary px-4 py-1.5 text-xs font-medium leading-4 text-primary-foreground hover:bg-primary/90"
          >
            {loginRequired ? "Log in to post" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";

import { feedbackTypeLabel, feedbackTypes } from "@/lib/domain";
import { createFeedback } from "@/server/actions";

const inputClass =
  "vc-input";
const compactInputClass =
  "vc-input-compact";

type FeedbackComposerProps = {
  projectId: string;
  viewerName: string;
};

export function FeedbackComposer({ projectId, viewerName }: FeedbackComposerProps) {
  return (
    <form action={createFeedback} className="border border-border bg-card p-4">
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        className={inputClass}
        name="body"
        required
        rows={5}
        placeholder="Add your perspective..."
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-medium leading-[14px] text-muted-foreground">
          Markdown supported · posting as {viewerName}
        </span>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="submit"
            className="bg-primary px-4 py-1.5 text-xs font-medium leading-4 text-primary-foreground hover:bg-primary/90"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </form>
  );
}

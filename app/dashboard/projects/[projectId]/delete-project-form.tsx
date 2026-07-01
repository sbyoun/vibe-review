"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type DeleteProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  projectId: string;
  projectTitle: string;
};

export function DeleteProjectForm({
  action,
  projectId,
  projectTitle,
}: DeleteProjectFormProps) {
  return (
    <form
      action={action}
      className="mt-4"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete "${projectTitle}"? This removes the project post and all feedback.`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={pending}
    >
      <Trash2 className="size-4" aria-hidden="true" />
      {pending ? "Deleting..." : "Delete Project"}
    </Button>
  );
}

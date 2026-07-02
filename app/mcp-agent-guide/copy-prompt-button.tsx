"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyPromptButtonProps = {
  prompt: string;
};

export function CopyPromptButton({ prompt }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function copyPrompt() {
    setPending(true);

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={copyPrompt}
      disabled={pending}
      aria-label={copied ? "Prompt copied" : "Copy prompt"}
      title={copied ? "Copied" : "Copy prompt"}
      className="size-8 shrink-0"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Check, Clipboard, KeyRound, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  createCurrentUserMcpToken,
  revokeCurrentUserMcpToken,
  type McpTokenActionState,
  type McpTokenSummary,
} from "@/server/mcp-token-actions";

const emptyState: McpTokenActionState = {
  status: "idle",
  message: null,
};

type McpTokenPanelProps = {
  tokens: McpTokenSummary[];
  endpoint: string;
  embedded?: boolean;
};

export function McpTokenPanel({ tokens, endpoint, embedded = false }: McpTokenPanelProps) {
  const [createState, createAction] = useActionState(createCurrentUserMcpToken, emptyState);
  const [revokeState, revokeAction] = useActionState(revokeCurrentUserMcpToken, emptyState);
  const [copied, setCopied] = useState(false);
  const [hiddenTokenIds, setHiddenTokenIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (createState.token) {
      setCopied(false);
      router.refresh();
    }
  }, [createState.token, router]);

  useEffect(() => {
    const tokenId = revokeState.revokedTokenId;

    if (tokenId) {
      setHiddenTokenIds((current) =>
        current.includes(tokenId)
          ? current
          : [...current, tokenId],
      );
      router.refresh();
    }
  }, [revokeState.revokedTokenId, router]);

  const visibleTokens = tokens.filter((token) => !hiddenTokenIds.includes(token.id));

  async function copyToken() {
    if (!createState.token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createState.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={embedded ? "" : "vc-panel p-5"}>
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">MCP tokens</h2>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Endpoint</span>
          <input
            className="vc-input bg-muted text-xs text-muted-foreground"
            value={endpoint}
            readOnly
          />
        </label>
      </div>

      <FormMessage state={createState} />

      {createState.token ? (
        <div className="mt-4 grid gap-3 border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-900">New token</p>
            <Button type="button" variant="outline" size="sm" onClick={copyToken}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Clipboard className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <textarea
            className="min-h-24 w-full resize-none border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-emerald-950 outline-none"
            value={createState.token}
            readOnly
          />
          <p className="text-xs text-emerald-800">
            Expires {formatDate(createState.expiresAt)}
          </p>
        </div>
      ) : null}

      <form action={createAction} className="mt-4">
        <input type="hidden" name="intent" value="create" />
        <TokenSubmitButton intent="create" />
      </form>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Active tokens</h3>
          <span className="text-xs text-muted-foreground">{visibleTokens.length}</span>
        </div>

        {visibleTokens.length > 0 ? (
          <div className="mt-3 divide-y divide-border border border-border">
            {visibleTokens.map((token) => (
              <div key={token.id} className="vc-row-hover flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">
                    {token.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {formatDate(token.expiresAt)}
                  </p>
                </div>
                <form action={revokeAction}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <TokenSubmitButton intent="revoke" />
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No active MCP tokens.</p>
        )}

        <FormMessage state={revokeState} />
      </div>
    </div>
  );
}

function FormMessage({ state }: { state: McpTokenActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const className =
    state.status === "success"
      ? "mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
      : "mt-4 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive";

  return (
    <p role="alert" aria-live="polite" className={className}>
      {state.message}
    </p>
  );
}

function TokenSubmitButton({ intent }: { intent: "create" | "revoke" }) {
  const { pending } = useFormStatus();
  const button =
    intent === "create"
      ? {
          icon: KeyRound,
          label: "Issue token",
          pendingLabel: "Issuing",
          variant: "default" as const,
        }
      : {
          icon: Trash2,
          label: "Revoke",
          pendingLabel: "Revoking",
          variant: "outline" as const,
        };
  const Icon = button.icon;

  return (
    <Button type="submit" variant={button.variant} size="sm" disabled={pending}>
      <Icon className="size-4" aria-hidden="true" />
      {pending ? button.pendingLabel : button.label}
    </Button>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

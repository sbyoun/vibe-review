import Link from "next/link";
import { headers } from "next/headers";
import { KeyRound, Save } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { updateCurrentUserProfile } from "@/server/actions";
import { getWorkspaceData } from "@/server/data";
import { listCurrentUserMcpTokens } from "@/server/mcp-token-actions";

import { McpTokenPanel } from "./mcp-token-panel";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-sm border border-border bg-card px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors focus:border-primary focus:ring-0 disabled:text-muted-foreground";
const labelClass = "text-xs leading-4 text-muted-foreground";

export default async function SettingsPage() {
  const data = await getWorkspaceData();
  const mcpTokens = await listCurrentUserMcpTokens();
  const mcpEndpoint = `${await getPublicOrigin()}/mcp`;

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-8 px-3 py-8 md:flex-row md:px-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-8 flex flex-col gap-2">
            <h2 className="mb-2 text-[11px] font-medium uppercase leading-[14px] text-muted-foreground">
              Settings
            </h2>
            <a className="-ml-2 rounded-sm bg-muted p-2 text-sm font-bold text-primary" href="#account">
              Account
            </a>
            <a className="-ml-2 rounded-sm p-2 text-sm text-muted-foreground hover:bg-muted" href="#profile">
              Profile
            </a>
            <a className="-ml-2 rounded-sm p-2 text-sm text-muted-foreground hover:bg-muted" href="#mcp-api">
              MCP/API
            </a>
            <a className="-ml-2 rounded-sm p-2 text-sm text-muted-foreground hover:bg-muted" href="#danger">
              Danger
            </a>
          </nav>
        </aside>

        <div className="flex max-w-3xl flex-grow flex-col gap-12">
          <div>
            <h1 className="mb-2 text-xl font-semibold leading-7 text-foreground">Settings</h1>
            <p className="text-sm leading-5 text-muted-foreground">
              Manage your account preferences, profile details, and MCP/API tokens.
            </p>
          </div>

          <form action={updateCurrentUserProfile} className="flex flex-col gap-10">
            <section id="account" className="flex flex-col gap-6">
              <div className="border-b border-border pb-2">
                <h2 className="text-base font-semibold leading-[22px]">Account Information</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className={labelClass}>Username</span>
                  <input
                    className={inputClass}
                    name="handle"
                    defaultValue={data.owner.handle ?? ""}
                    required
                    autoComplete="username"
                  />
                  <span className="mt-1 text-[11px] leading-[14px] text-muted-foreground">
                    This becomes your public profile URL.
                  </span>
                </label>
                <label className="grid gap-1">
                  <span className={labelClass}>Email Address</span>
                  <input
                    className={inputClass}
                    type="email"
                    defaultValue={data.owner.email ?? ""}
                    disabled
                  />
                </label>
              </div>
              <div className="border border-border bg-muted p-6">
                <h3 className="mb-4 text-base font-semibold leading-[22px]">Change Password</h3>
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings/password">
                    <KeyRound className="size-4" aria-hidden="true" />
                    Update Password
                  </Link>
                </Button>
              </div>
            </section>

            <section id="profile" className="flex flex-col gap-6">
              <div className="border-b border-border pb-2">
                <h2 className="text-base font-semibold leading-[22px]">Profile Customization</h2>
              </div>
              <div className="grid gap-6">
                <label className="grid gap-1">
                  <span className={labelClass}>Name</span>
                  <input
                    className={inputClass}
                    name="name"
                    defaultValue={data.owner.name ?? data.owner.handle ?? ""}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="grid gap-1">
                  <span className={labelClass}>Bio</span>
                  <textarea
                    className={inputClass}
                    name="bio"
                    defaultValue={data.owner.bio ?? ""}
                    rows={4}
                  />
                  <span className="mt-1 text-right text-[11px] leading-[14px] text-muted-foreground">
                    {(data.owner.bio ?? "").length} / 600
                  </span>
                </label>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className={labelClass}>Roles</span>
                    <input
                      className={inputClass}
                      name="primaryRoles"
                      defaultValue={data.owner.primaryRoles.join(", ")}
                      placeholder="Builder, Product reviewer"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className={labelClass}>Tools</span>
                    <input
                      className={inputClass}
                      name="toolsUsed"
                      defaultValue={data.owner.toolsUsed.join(", ")}
                      placeholder="Codex, Cursor, Vercel"
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="size-4" aria-hidden="true" />
                  Save Profile
                </Button>
              </div>
            </section>
          </form>

          <section id="mcp-api" className="flex flex-col gap-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold leading-[22px]">MCP/API Tokens</h2>
            </div>
            <div className="border border-border bg-muted p-4">
              <h3 className="text-base font-semibold leading-[22px]">Agent Access Tokens</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Generate tokens for coding agents that use the VibeReview MCP server and JSON API.
              </p>
            </div>
            <McpTokenPanel tokens={mcpTokens} endpoint={mcpEndpoint} />
          </section>

          <section id="danger" className="border border-destructive/30 bg-card p-6">
            <h3 className="mb-2 text-base font-semibold leading-[22px] text-destructive">
              Danger Zone
            </h3>
            <p className="mb-4 text-sm leading-5 text-muted-foreground">
              Account deletion is not enabled in this build.
            </p>
            <button
              type="button"
              disabled
              className="border border-destructive px-4 py-2 text-base font-semibold leading-[22px] text-destructive opacity-60"
            >
              Delete Account
            </button>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function getPublicOrigin() {
  const configuredOrigin =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return "https://vibe.foldalpha.com";
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`.replace(/\/$/, "");
}

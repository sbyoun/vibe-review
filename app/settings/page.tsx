import Link from "next/link";
import type { Route } from "next";
import { headers } from "next/headers";
import {
  Check,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  MailCheck,
  Save,
  X,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { sendCurrentUserEmailVerification } from "@/server/auth-actions";
import {
  approveExternalProjectOwnershipClaim,
  rejectExternalProjectOwnershipClaim,
  updateCurrentUserProfile,
} from "@/server/actions";
import { getOwnershipClaimSettingsData, getWorkspaceData } from "@/server/data";
import { listCurrentUserMcpTokens } from "@/server/mcp-token-actions";
import { formatShortDate } from "@/lib/domain";

import { McpTokenPanel } from "./mcp-token-panel";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-sm border border-border bg-card px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors focus:border-primary focus:ring-0 disabled:text-muted-foreground";
const labelClass = "text-xs leading-4 text-muted-foreground";

type SettingsPageProps = {
  searchParams?: Promise<{
    claim?: string;
    emailVerification?: string;
    verificationUrl?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const data = await getWorkspaceData();
  const ownershipClaims = await getOwnershipClaimSettingsData(data.owner.id);
  const mcpTokens = await listCurrentUserMcpTokens();
  const mcpEndpoint = `${await getPublicOrigin()}/mcp`;
  const params = await searchParams;
  const emailVerificationNotice = getEmailVerificationNotice(params?.emailVerification);
  const claimNotice = getClaimNotice(params?.claim);

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
            <a className="-ml-2 rounded-sm p-2 text-sm text-muted-foreground hover:bg-muted" href="#ownership-claims">
              Ownership
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
                    name="email"
                    type="email"
                    defaultValue={data.owner.email ?? ""}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <span className="mt-1 text-[11px] leading-[14px] text-muted-foreground">
                    {data.owner.emailVerified
                      ? "Verified. Email password recovery is enabled."
                      : "Unverified. Email password recovery is disabled until verified."}
                  </span>
                </label>
              </div>
              {emailVerificationNotice ? (
                <div className="border border-border bg-muted p-3 text-sm leading-5 text-foreground">
                  {emailVerificationNotice}
                  {params?.verificationUrl ? (
                    <>
                      {" "}
                      <a href={params.verificationUrl} className="font-medium text-primary hover:underline">
                        Open verification link
                      </a>
                    </>
                  ) : null}
                </div>
              ) : null}
              <div className="border border-border bg-muted p-6">
                <h3 className="text-base font-semibold leading-[22px]">Account Recovery</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Unverified accounts can still log in and use MCP. Password reset by email only works after verification.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/settings/password">
                      <KeyRound className="size-4" aria-hidden="true" />
                      Update Password
                    </Link>
                  </Button>
                  <Button type="submit" variant="outline" formAction={sendCurrentUserEmailVerification}>
                    <MailCheck className="size-4" aria-hidden="true" />
                    {data.owner.emailVerified ? "Verify Another Email" : "Verify Email"}
                  </Button>
                </div>
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

          <section id="ownership-claims" className="flex flex-col gap-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold leading-[22px]">Ownership Claims</h2>
            </div>
            <div className="border border-border bg-muted p-4">
              <div className="flex items-start gap-3">
                <GitPullRequest className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold leading-[22px]">External Project Transfers</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Claims stay pending until the current post owner approves them. Requested claims are tracked here.
                  </p>
                </div>
              </div>
              {claimNotice ? (
                <div className="mt-4 border border-border bg-card p-3 text-sm leading-5 text-foreground">
                  {claimNotice}
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold leading-5 text-foreground">Requests To Review</h3>
                  <p className="text-xs leading-4 text-muted-foreground">
                    Claims on external project posts you currently manage.
                  </p>
                </div>
                {ownershipClaims.incoming.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {ownershipClaims.incoming.map((claim) => (
                      <article key={claim.id} className="border border-border bg-card p-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={projectHref(data.owner.handle ?? data.owner.id, claim.projectSlug)}
                            className="text-sm font-semibold leading-5 text-foreground hover:text-primary hover:underline"
                          >
                            {claim.projectTitle}
                          </Link>
                          <p className="text-xs leading-5 text-muted-foreground">
                            @{claim.claimantHandle ?? claim.claimantName ?? "user"} requested ownership on{" "}
                            {formatShortDate(claim.createdAt)}.
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <form action={approveExternalProjectOwnershipClaim}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <input type="hidden" name="returnTo" value="/settings#ownership-claims" />
                            <Button type="submit" size="sm">
                              <Check className="size-4" aria-hidden="true" />
                              Approve
                            </Button>
                          </form>
                          <form action={rejectExternalProjectOwnershipClaim}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <input type="hidden" name="returnTo" value="/settings#ownership-claims" />
                            <Button type="submit" size="sm" variant="outline">
                              <X className="size-4" aria-hidden="true" />
                              Reject
                            </Button>
                          </form>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border bg-card p-4 text-sm leading-5 text-muted-foreground">
                    No pending ownership requests.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold leading-5 text-foreground">Your Requests</h3>
                  <p className="text-xs leading-4 text-muted-foreground">
                    Claims you asked another project post owner to approve.
                  </p>
                </div>
                {ownershipClaims.outgoing.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {ownershipClaims.outgoing.map((claim) => (
                      <article key={claim.id} className="border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={projectHref(claim.ownerHandle ?? claim.ownerId, claim.projectSlug)}
                              className="text-sm font-semibold leading-5 text-foreground hover:text-primary hover:underline"
                            >
                              {claim.projectTitle}
                            </Link>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              Requested {formatShortDate(claim.createdAt)} from @
                              {claim.ownerHandle ?? claim.ownerName ?? "owner"}.
                            </p>
                          </div>
                          <span className={claimStatusClass(claim.status)}>
                            {claimStatusLabel(claim.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs leading-4 text-muted-foreground">
                          <span>
                            {claim.resolvedAt
                              ? `Resolved ${formatShortDate(claim.resolvedAt)}`
                              : "Waiting for owner review"}
                          </span>
                          <Link
                            href={projectHref(claim.ownerHandle ?? claim.ownerId, claim.projectSlug)}
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            Open
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border bg-card p-4 text-sm leading-5 text-muted-foreground">
                    You have not requested ownership of any external projects.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="mcp-api" className="flex flex-col gap-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold leading-[22px]">MCP/API Tokens</h2>
            </div>
            <div className="border border-border bg-muted p-4">
              <h3 className="text-base font-semibold leading-[22px]">Agent Access Tokens</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Generate tokens for coding agents that use the vibearchive MCP server and JSON API.
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

function projectHref(ownerHandle: string, projectSlug: string) {
  return `/p/${encodeURIComponent(ownerHandle)}/${encodeURIComponent(projectSlug)}` as Route;
}

function claimStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
  }
}

function claimStatusClass(status: string) {
  const base =
    "shrink-0 rounded-sm border px-2 py-1 text-[11px] font-medium leading-[14px]";

  switch (status) {
    case "approved":
      return `${base} border-primary/30 bg-primary/10 text-primary`;
    case "rejected":
      return `${base} border-destructive/30 bg-destructive/10 text-destructive`;
    default:
      return `${base} border-border bg-muted text-muted-foreground`;
  }
}

function getClaimNotice(status: string | undefined) {
  switch (status) {
    case "approved":
      return "Ownership claim approved. The project post has been transferred.";
    case "rejected":
      return "Ownership claim rejected.";
    default:
      return null;
  }
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

function getEmailVerificationNotice(status: string | undefined) {
  switch (status) {
    case "sent":
      return "Verification email sent. Open the link in your mailbox to enable email password recovery.";
    case "dev_link":
      return "Verification email could not be delivered in this environment. Development verification link is available.";
    case "delivery_failed":
      return "Verification email could not be sent right now. Try again later.";
    case "already_verified":
      return "This email is already verified.";
    case "email_taken":
      return "That email is already used by another account.";
    case "invalid_email":
      return "Enter a valid email address before requesting verification.";
    case "no_email":
      return "Add an email address before requesting verification.";
    default:
      return null;
  }
}

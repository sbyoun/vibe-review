import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  Columns3,
  KeyRound,
  Save,
  Settings,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/domain";
import { updateCurrentUserProfile } from "@/server/actions";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

type SettingsPageProps = {
  searchParams?: Promise<{ profile?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const data = await getWorkspaceData();
  const saved = params?.profile === "updated";
  const publicProjectCount = data.projects.filter(
    (project) => project.visibility === "public",
  ).length;
  const stats = [
    { label: "Projects", value: data.projects.length.toString(), icon: Columns3 },
    { label: "Public", value: publicProjectCount.toString(), icon: UserRound },
    { label: "Credits", value: data.owner.feedbackCredits.toString(), icon: CircleDollarSign },
  ];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              Settings
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage the public profile and workspace identity used across projects and feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {saved ? <Badge variant="secondary">Profile saved</Badge> : null}
            <Button type="button" variant="outline" asChild>
              <Link href={`/p/${data.owner.handle}`}>
                <ArrowUpRight className="size-4" aria-hidden="true" />
                View profile
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <form
            action={updateCurrentUserProfile}
            className="rounded-md border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2">
              <Settings className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className={labelClass}>Name</span>
                <input
                  className={inputClass}
                  name="name"
                  defaultValue={data.owner.name ?? data.owner.handle ?? ""}
                  required
                  autoComplete="name"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClass}>Handle</span>
                <input
                  className={inputClass}
                  name="handle"
                  defaultValue={data.owner.handle ?? ""}
                  required
                  autoComplete="username"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClass}>Bio</span>
                <textarea
                  className={inputClass}
                  name="bio"
                  defaultValue={data.owner.bio ?? ""}
                  rows={5}
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClass}>Roles</span>
                <input
                  className={inputClass}
                  name="primaryRoles"
                  defaultValue={data.owner.primaryRoles.join(", ")}
                  placeholder="Builder, Product reviewer"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClass}>Tools</span>
                <input
                  className={inputClass}
                  name="toolsUsed"
                  defaultValue={data.owner.toolsUsed.join(", ")}
                  placeholder="Codex, Cursor, Vercel"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit">
                <Save className="size-4" aria-hidden="true" />
                Save profile
              </Button>
            </div>
          </form>

          <aside className="grid gap-4">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Workspace</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                    </div>
                    <stat.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Account</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Handle</dt>
                  <dd className="font-medium">@{data.owner.handle}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className="font-medium">{formatShortDate(data.owner.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Reputation</dt>
                  <dd className="font-medium">{data.owner.reputationScore}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">
                    <Columns3 className="size-4" aria-hidden="true" />
                    Open dashboard
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings/password">
                    <KeyRound className="size-4" aria-hidden="true" />
                    Change password
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/p/${data.owner.handle}`}>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                    Public archive
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

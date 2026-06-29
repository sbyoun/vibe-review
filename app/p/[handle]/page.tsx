import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  FolderKanban,
  MessageSquareText,
  Settings as SettingsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feedbackTypeLabel, formatShortDate, statusLabel, statusTone } from "@/lib/domain";
import { getOptionalCurrentUser } from "@/server/current-user";
import { getPublicProfileData } from "@/server/data";

export const dynamic = "force-dynamic";

type PublicProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProfileData(handle);

  return {
    title: data ? `${data.profile.name} · Vibe Code Workspace` : "Public profile",
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params;
  const data = await getPublicProfileData(handle);

  if (!data) {
    notFound();
  }

  const { profile, projects, requests } = data;
  const viewer = await getOptionalCurrentUser();
  const isOwner = viewer?.id === profile.id;
  const openRequests = requests.filter((request) => request.status === "open");
  const responseRate =
    requests.length > 0
      ? `${Math.round(
          (requests.filter((request) => request.status === "fulfilled").length / requests.length) *
            100,
        )}%`
      : "0%";

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="grid gap-6 border-b border-border pb-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                @{profile.handle}
              </p>
              <Badge variant="outline">
                <BadgeCheck className="mr-1 size-3.5" aria-hidden="true" />
                {profile.reputationScore} reputation
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {profile.name}
            </h1>
            <p className="mt-2 text-base font-medium text-muted-foreground">
              {profile.primaryRoles.join(" / ") || "Builder"}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {profile.bio}
            </p>
            {isOwner ? (
              <div className="mt-5">
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings">
                    <SettingsIcon className="size-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-1">
            <div>
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="mt-1 text-2xl font-semibold">{profile.feedbackCredits}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fulfilled</p>
              <p className="mt-1 text-2xl font-semibold">{responseRate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="mt-1 text-2xl font-semibold">{formatShortDate(profile.createdAt)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
          <aside className="grid gap-6">
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Roles</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.primaryRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Tools</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.toolsUsed.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Open requests</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {openRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/p/${profile.handle}/${request.projectSlug}`}
                    className="block rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50"
                  >
                    <p className="text-sm font-medium">{request.projectTitle}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {request.feedbackTypes.map((type) => feedbackTypeLabel[type]).join(", ")}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {request.receivedCount}/{request.minFeedbackCount} received
                      </span>
                      <span>{formatShortDate(request.deadlineAt)}</span>
                    </div>
                  </Link>
                ))}
                {openRequests.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No active request.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Public projects</h2>
              </div>
              <Badge variant="outline">{projects.length}</Badge>
            </div>

            <div className="mt-4 grid gap-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-md border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs ${
                            statusTone[project.status]
                          }`}
                        >
                          {statusLabel[project.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {project.summary}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href={`/p/${profile.handle}/${project.slug}`}>
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                        Open
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tools.map((tool) => (
                      <Badge key={tool} variant="outline">
                        {tool}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="text-muted-foreground">Feedback</p>
                      <p className="mt-1 font-semibold">{project.feedbackCount}</p>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="text-muted-foreground">Implemented</p>
                      <p className="mt-1 font-semibold">{project.implementedCount}</p>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="size-4" aria-hidden="true" />
                        Updated
                      </p>
                      <p className="mt-1 font-semibold">{formatShortDate(project.updatedAt)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

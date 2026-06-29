import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  MessageSquareText,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feedbackTypeLabel, formatShortDate, statusLabel, statusTone } from "@/lib/domain";
import { getDiscoverData } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const data = await getDiscoverData();
  const stats = [
    { label: "Open requests", value: data.stats.openRequests.toString() },
    { label: "Needed feedback", value: data.stats.neededFeedback.toString() },
    { label: "Public projects", value: data.stats.publicProjects.toString() },
  ];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Discover
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              Feedback board
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Open requests from public vibe-coded projects, ordered by deadline and missing
              feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowUpRight className="size-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <Button type="button" asChild>
              <Link href="/feedback">
                <MessageSquareText className="size-4" aria-hidden="true" />
                Feedback queue
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {data.requests.map((request) => (
            <article
              key={request.id}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs ${
                        statusTone[request.project.status]
                      }`}
                    >
                      {statusLabel[request.project.status]}
                    </span>
                    <Badge variant="outline">{request.missingCount} missing</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{request.project.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {request.project.summary}
                  </p>
                </div>
                <Button type="button" size="sm" asChild>
                  <Link href={`/p/${request.owner.handle}/${request.project.slug}`}>
                    <MessageSquareText className="size-4" aria-hidden="true" />
                    Give feedback
                  </Link>
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {request.feedbackTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    {feedbackTypeLabel[type]}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Progress
                  </p>
                  <p className="mt-2 font-semibold">
                    {request.receivedCount}/{request.minFeedbackCount}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <CircleDollarSign className="size-4" aria-hidden="true" />
                    Cost
                  </p>
                  <p className="mt-2 font-semibold">{request.creditCost}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="size-4" aria-hidden="true" />
                    Deadline
                  </p>
                  <p className="mt-2 font-semibold">{formatShortDate(request.deadlineAt)}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <UserRound className="size-4" aria-hidden="true" />
                    Owner
                  </p>
                  <p className="mt-2 font-semibold">@{request.owner.handle}</p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${request.progressPercent}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {request.project.tools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </article>
          ))}
          {data.requests.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">No open requests</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a public project and open a feedback request from the dashboard.
              </p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

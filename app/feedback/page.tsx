import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ListFilter,
  MessageSquareText,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackEntries,
  feedbackRequests,
  formatShortDate,
  workspaceOwner,
} from "@/lib/mock-workspace";

const queueStats = [
  {
    label: "Open",
    value: feedbackRequests.filter((request) => request.status === "open").length,
  },
  {
    label: "Draft",
    value: feedbackRequests.filter((request) => request.status === "draft").length,
  },
  {
    label: "Received",
    value: feedbackRequests.reduce((total, request) => total + request.receivedCount, 0),
  },
];

export default function FeedbackPage() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
              Feedback queue
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Requests, received reviews, credit costs, and implementation state for active
              projects.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline">
              <ListFilter className="size-4" aria-hidden="true" />
              Filter
            </Button>
            <Button type="button" asChild>
              <Link href="/dashboard">
                <ArrowUpRight className="size-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {queueStats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Requests</h2>
            </div>

            <div className="mt-4 grid gap-3">
              {feedbackRequests.map((request) => {
                const progress = Math.min(
                  100,
                  Math.round((request.receivedCount / request.minFeedbackCount) * 100),
                );

                return (
                  <article
                    key={request.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{request.title}</h3>
                          <Badge variant={request.status === "open" ? "default" : "outline"}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{request.focus}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={`/p/${workspaceOwner.handle}/${request.projectSlug}`}>
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                          Project
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CircleDollarSign className="size-4" aria-hidden="true" />
                          Credit cost
                        </div>
                        <p className="mt-2 font-semibold">{request.creditCost}</p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Feedback
                        </div>
                        <p className="mt-2 font-semibold">
                          {request.receivedCount}/{request.minFeedbackCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock3 className="size-4" aria-hidden="true" />
                          Deadline
                        </div>
                        <p className="mt-2 font-semibold">{formatShortDate(request.deadlineAt)}</p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.types.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Received feedback</h2>
            </div>

            <div className="mt-4 grid gap-3">
              {feedbackEntries.map((entry) => (
                <article key={entry.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{entry.author}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                    <Badge variant="outline">{entry.rating}/5</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={entry.helpfulStatus === "helpful" ? "default" : "outline"}>
                      {entry.helpfulStatus}
                    </Badge>
                    <Badge
                      variant={entry.implementedStatus === "implemented" ? "secondary" : "outline"}
                    >
                      {entry.implementedStatus}
                    </Badge>
                    <Badge variant="outline">{formatShortDate(entry.createdAt)}</Badge>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

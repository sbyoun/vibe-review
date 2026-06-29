import Link from "next/link";
import { Clock3, Compass, MessageSquareText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feedbackTypeLabel, formatShortDate, statusLabel, statusTone } from "@/lib/domain";
import { claimFeedbackRequest } from "@/server/actions";
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
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          {data.requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-normal text-muted-foreground">
                  <tr>
                    <th className="w-[30%] px-4 py-3 font-medium">Project</th>
                    <th className="w-[12%] px-4 py-3 font-medium">Owner</th>
                    <th className="w-[20%] px-4 py-3 font-medium">Request</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Progress</th>
                    <th className="w-[10%] px-4 py-3 font-medium">Deadline</th>
                    <th className="w-[10%] px-4 py-3 font-medium">Stack</th>
                    <th className="w-[4%] px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.requests.map((request) => (
                    <tr key={request.id} className="bg-card align-top hover:bg-muted/35">
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/p/${request.owner.handle}/${request.project.slug}`}
                              className="font-semibold text-foreground hover:text-primary"
                            >
                              {request.project.title}
                            </Link>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-xs ${
                                statusTone[request.project.status]
                              }`}
                            >
                              {statusLabel[request.project.status]}
                            </span>
                          </div>
                          <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
                            {request.project.summary}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/p/${request.owner.handle}`}
                          className="font-medium hover:text-primary"
                        >
                          @{request.owner.handle}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {request.owner.reputationScore} rep
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {request.feedbackTypes.slice(0, 3).map((type) => (
                            <Badge key={type} variant="secondary">
                              {feedbackTypeLabel[type]}
                            </Badge>
                          ))}
                          {request.feedbackTypes.length > 3 ? (
                            <Badge variant="outline">+{request.feedbackTypes.length - 3}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {request.creditCost} credits · {request.activeClaimCount} claimed
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${request.progressPercent}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap font-medium">
                            {request.receivedCount}/{request.minFeedbackCount}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {request.missingCount} missing
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                          {formatShortDate(request.deadlineAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[10rem] truncate text-xs text-muted-foreground">
                          {request.project.tools.join(", ") || "None"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {request.viewerClaim ? (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={`/p/${request.owner.handle}/${request.project.slug}`}>
                              <MessageSquareText className="size-4" aria-hidden="true" />
                              Open task
                            </Link>
                          </Button>
                        ) : (
                          <form action={claimFeedbackRequest}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <Button type="submit" size="sm">
                              <MessageSquareText className="size-4" aria-hidden="true" />
                              Claim
                            </Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {data.requests.length === 0 ? (
            <div className="p-6">
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

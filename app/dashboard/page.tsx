import Link from "next/link";
import { ArrowUpRight, Clock3, MessageSquareText, Plus, Send, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  feedbackTypeLabel,
  feedbackTypes,
  formatShortDate,
  projectStatuses,
  projectVisibilities,
  statusLabel,
  statusTone,
} from "@/lib/domain";
import { createFeedbackRequest, createProject } from "@/server/actions";
import { getWorkspaceData } from "@/server/data";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

const creditReasonLabel: Record<string, string> = {
  earned_feedback: "Feedback earned",
  spent_feedback_request: "Feedback request",
  request_refund: "Request refund",
  admin_adjustment: "Admin adjustment",
};

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  const openRequests = data.requests.filter((request) => request.status === "open");

  return (
    <main className="min-h-screen px-5 py-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                내 프로젝트
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                만든 것들을 게시판처럼 모아두고, 필요할 때만 피드백 요청을 엽니다.
              </p>
            </div>
            <Button type="button" size="sm" asChild>
              <a href="#new-project">
                <Plus className="size-4" aria-hidden="true" />
                올리기
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            프로젝트 {data.projects.length}개 · 열린 요청 {openRequests.length}개 · 크레딧{" "}
            {data.owner.feedbackCredits}
          </p>
        </header>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          {data.projects.length > 0 ? (
            <div className="divide-y divide-border">
              {data.projects.map((project) => {
                const request = data.requests.find((item) => item.projectId === project.id);

                return (
                  <article
                    key={project.id}
                    className="grid gap-3 px-4 py-4 hover:bg-muted/35 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/p/${data.owner.handle}/${project.slug}`}
                          className="truncate text-base font-semibold text-foreground hover:text-primary"
                        >
                          {project.title}
                        </Link>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs ${
                            statusTone[project.status]
                          }`}
                        >
                          {statusLabel[project.status]}
                        </span>
                        <Badge variant="outline">{project.visibility}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {project.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        <span>{project.feedbackCount} feedback</span>
                        <span>{project.requestCount} requests</span>
                        {request ? (
                          <span className="flex items-center gap-1">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {request.receivedCount}/{request.minFeedbackCount} by{" "}
                            {formatShortDate(request.deadlineAt)}
                          </span>
                        ) : null}
                        {project.tools.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="outline">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/p/${data.owner.handle}/${project.slug}`}>
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                          보기
                        </Link>
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <Settings className="size-4" aria-hidden="true" />
                          관리
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-base font-semibold">아직 올린 프로젝트가 없습니다</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                완성된 서비스가 아니어도 괜찮습니다. 아이디어나 작업 중인 앱부터 하나씩
                올려두면 내 아카이브가 됩니다.
              </p>
              <Button type="button" size="sm" className="mt-4" asChild>
                <a href="#new-project">
                  <Plus className="size-4" aria-hidden="true" />
                  첫 프로젝트 올리기
                </a>
              </Button>
            </div>
          )}
        </section>

        <details
          id="new-project"
          open={data.projects.length === 0}
          className="rounded-md border border-border bg-card p-4"
        >
          <summary className="cursor-pointer text-base font-semibold">프로젝트 올리기</summary>
          <form action={createProject} className="mt-4 grid gap-3">
            <label className="grid gap-1.5">
              <span className={labelClass}>Title</span>
              <input className={inputClass} name="title" required maxLength={160} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>Summary</span>
              <textarea className={inputClass} name="summary" required rows={3} />
            </label>

            <details className="rounded-md border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-medium">추가 정보</summary>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1.5">
                  <span className={labelClass}>Description</span>
                  <textarea className={inputClass} name="description" rows={4} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Status</span>
                    <select className={inputClass} name="status" defaultValue="idea">
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Visibility</span>
                    <select className={inputClass} name="visibility" defaultValue="public">
                      {projectVisibilities.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {visibility}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Demo URL</span>
                  <input className={inputClass} name="demoUrl" type="url" />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Repo URL</span>
                  <input className={inputClass} name="repoUrl" type="url" />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Tools</span>
                  <input className={inputClass} name="tools" placeholder="Next.js, Codex" />
                </label>
              </div>
            </details>

            <Button type="submit">
              <Plus className="size-4" aria-hidden="true" />
              올리기
            </Button>
          </form>
        </details>

        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold">피드백 요청 열기</summary>
          {data.projects.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              프로젝트를 먼저 올리면 피드백 요청을 열 수 있습니다.
            </p>
          ) : (
            <form action={createFeedbackRequest} className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className={labelClass}>Project</span>
                <select className={inputClass} name="projectId" required>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className={labelClass}>Minimum</span>
                  <input
                    className={inputClass}
                    name="minFeedbackCount"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={3}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Credits</span>
                  <input
                    className={inputClass}
                    name="creditCost"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={3}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={labelClass}>Days</span>
                  <input
                    className={inputClass}
                    name="deadlineDays"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={2}
                  />
                </label>
              </div>
              <div className="grid gap-2">
                <p className={labelClass}>Feedback types</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {feedbackTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="feedbackTypes"
                        value={type}
                        defaultChecked={type === "first_impression" || type === "ux_ui"}
                      />
                      {feedbackTypeLabel[type]}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit">
                <Send className="size-4" aria-hidden="true" />
                요청 열기
              </Button>
            </form>
          )}
        </details>

        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-semibold">피드백과 기록</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section>
              <h2 className="text-sm font-semibold">열린 요청</h2>
              <div className="mt-3 grid gap-2">
                {openRequests.map((request) => (
                  <div key={request.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-medium">{request.projectTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.receivedCount}/{request.minFeedbackCount} ·{" "}
                      {formatShortDate(request.deadlineAt)}
                    </p>
                  </div>
                ))}
                {openRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">열린 요청이 없습니다.</p>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold">받은 피드백</h2>
              <div className="mt-3 grid gap-2">
                {data.feedback.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="line-clamp-2 text-muted-foreground">{entry.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.authorName} · {formatShortDate(entry.createdAt)}
                    </p>
                  </div>
                ))}
                {data.feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">아직 받은 피드백이 없습니다.</p>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold">크레딧</h2>
              <div className="mt-3 grid gap-2">
                {data.creditLedger.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {creditReasonLabel[entry.reason] ?? entry.reason}
                    </span>
                    <span>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</span>
                  </div>
                ))}
                {data.creditLedger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">크레딧 기록이 없습니다.</p>
                ) : null}
              </div>
            </section>
          </div>
          <Button type="button" size="sm" variant="outline" className="mt-4" asChild>
            <Link href="/feedback">
              <MessageSquareText className="size-4" aria-hidden="true" />
              자세히 보기
            </Link>
          </Button>
        </details>
      </section>
    </main>
  );
}

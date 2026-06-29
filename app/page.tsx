import { Archive, ClipboardList, Columns3, MessageSquareText } from "lucide-react";

const workspaceStats = [
  { label: "Active projects", value: "12" },
  { label: "Feedback due", value: "7" },
  { label: "Credits", value: "18" },
];

const lanes = ["Ideas", "Building", "Needs Feedback", "Iterating", "Shipped"];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Workspace preview
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Vibe Code Workspace
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Project boards, feedback requests, credit tracking, and iteration history for
              AI-built products.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {workspaceStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-md border border-border bg-card px-4 py-3 text-card-foreground"
              >
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns3 className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Project board</h2>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Mock data
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {lanes.map((lane) => (
                <div key={lane} className="min-h-40 rounded-md border border-border bg-background p-3">
                  <h3 className="text-sm font-medium">{lane}</h3>
                  <div className="mt-3 rounded-md border border-border bg-card p-3 text-sm">
                    <div className="font-medium">Launch archive</div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">
                      Demo status, feedback count, tools, and next action will live here.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Feedback queue</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Queue cards will track deadline, minimum feedback count, credit cost, and
                request status.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Feedback history</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Reviews, implementation state, and helpful reactions will connect back to each
                project.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Archive className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Public archive</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Public profiles and project pages will expose shipped, parked, and archived work.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ProjectForm } from "@/components/project-form";
import { createProject } from "@/server/actions";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireCurrentUser();

  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1100px] px-3 py-8 md:px-6 md:py-16">
          <div className="mx-auto max-w-2xl">
            <header className="mb-8 border-b border-border pb-4">
              <h1 className="text-xl font-semibold leading-7 text-foreground">Submit Project</h1>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Share your work, tools, or deep-dives with the community.
              </p>
            </header>

            <section className="mb-8 border border-border bg-muted/70 p-4">
              <p className="mb-2 text-xs font-bold leading-4 text-foreground">
                Submission Guidelines
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-5 text-muted-foreground">
                <li>Use the original source URL when possible.</li>
                <li>Ensure the title is descriptive and objective. Avoid sensationalism.</li>
                <li>If omitting a URL, provide a comprehensive text description.</li>
              </ul>
            </section>

            <ProjectForm action={createProject} mode="create" cancelHref="/discover" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

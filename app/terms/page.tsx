import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Terms of Service · vibearchive",
  description: "Terms of service for vibearchive.",
};

const lastUpdated = "July 3, 2026";

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-screen w-full max-w-[860px] px-3 py-10 md:px-6">
        <article className="flex flex-col gap-8">
          <header className="border-b border-border pb-6">
            <p className="text-xs font-medium uppercase leading-4 text-muted-foreground">
              Last updated {lastUpdated}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-10 text-foreground">
              Terms of Service
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              These terms govern your use of vibearchive, including the website, project archive,
              feedback features, and MCP/API access.
            </p>
          </header>

          <TermsSection title="Using vibearchive">
            <p>
              vibearchive lets users post AI-built projects, bookmark or review public external
              projects, manage project notes, and exchange feedback. You are responsible for your
              account activity and for keeping your password and API tokens secure.
            </p>
            <p>
              You may not use the service to spam, harass others, upload malware, attempt unauthorized
              access, scrape private data, impersonate another person, or submit unlawful, abusive, or
              misleading content.
            </p>
          </TermsSection>

          <TermsSection title="Your Content">
            <p>
              You retain ownership of content you submit. By posting content, you grant vibearchive a
              non-exclusive license to host, display, reproduce, and distribute it as needed to operate
              the service.
            </p>
            <p>
              Public project posts and public comments are visible to everyone. Do not post secrets,
              credentials, private source code, confidential data, or information you do not have the
              right to share.
            </p>
          </TermsSection>

          <TermsSection title="External Project Reviews And Ownership Claims">
            <p>
              Users may create posts about publicly available external projects for review,
              bookmarking, or archival purposes. External project posts should clearly identify the
              original source or owner when known.
            </p>
            <p>
              If an external project is yours, you may request ownership transfer. Ownership requests
              remain pending until the current post manager approves them. You can contact us for
              removal, correction, or ownership issues.
            </p>
          </TermsSection>

          <TermsSection title="MCP/API Access">
            <p>
              MCP/API access is provided for coding agents and automation. You are responsible for
              actions performed with your token. We may rate limit, suspend, or revoke access that
              disrupts the service or violates these terms.
            </p>
          </TermsSection>

          <TermsSection title="Service Changes">
            <p>
              The service is provided as available. Features may change, break, or be discontinued.
              We may remove content or accounts that violate these terms, create legal risk, or harm
              the service.
            </p>
          </TermsSection>

          <TermsSection title="Contact">
            <p>
              For terms, abuse, ownership, or removal questions, contact{" "}
              <a className="font-medium text-primary hover:underline" href="mailto:contact@foldalpha.com">
                contact@foldalpha.com
              </a>
              , or visit the{" "}
              <Link className="font-medium text-primary hover:underline" href={"/contact" as Route}>
                contact page
              </Link>.
            </p>
          </TermsSection>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function TermsSection({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="grid gap-3 border-b border-border pb-6 last:border-b-0">
      <h2 className="text-lg font-semibold leading-7 text-foreground">{title}</h2>
      <div className="grid gap-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

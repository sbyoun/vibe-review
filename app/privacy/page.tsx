import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Privacy Policy · vibearchive",
  description: "Privacy policy for vibearchive.",
};

const lastUpdated = "July 3, 2026";

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              vibearchive is a public project archive and feedback board for AI-built projects.
              This policy explains what we collect, how we use it, and how to contact us.
            </p>
          </header>

          <PolicySection title="Information We Collect">
            <p>
              When you create an account, we may collect your handle, display name, optional email
              address, password hash, profile text, MCP/API token metadata, and authentication session
              information. We do not store your plain text password or full API token after issuance.
            </p>
            <p>
              When you use the service, we collect the project posts, public or private comments,
              self notes, favorites, ownership claim requests, uploaded images, demo URLs, repository
              URLs, and other content you submit.
            </p>
            <p>
              Our servers may also process standard technical data such as IP address, user agent,
              request URL, timestamps, referrer, and error logs for security, debugging, abuse
              prevention, and service operation.
            </p>
          </PolicySection>

          <PolicySection title="How We Use Information">
            <p>
              We use collected information to provide account access, publish project pages, display
              feedback threads, operate MCP/API access, prevent abuse, troubleshoot issues, and improve
              the product.
            </p>
            <p>
              Public project posts, public profile details, public feedback, public ownership labels,
              and public project metadata may be visible to anyone and may be indexed by search engines.
            </p>
          </PolicySection>

          <PolicySection title="Cookies, Sessions, And Advertising">
            <p>
              We use cookies or similar browser storage for login sessions and basic service
              functionality. If advertising is enabled, third-party advertising partners may use
              cookies or similar technologies to show, measure, and improve ads.
            </p>
            <p>
              You can control cookies through your browser settings. Blocking cookies may affect login
              and account features.
            </p>
          </PolicySection>

          <PolicySection title="Sharing And Service Providers">
            <p>
              We do not sell account data. We may share limited information with infrastructure,
              hosting, email, analytics, storage, security, and advertising providers when needed to
              operate the service. We may also disclose information when required by law or to protect
              users, the service, or the public.
            </p>
          </PolicySection>

          <PolicySection title="Your Choices">
            <p>
              You can update your profile and email from settings. You can delete your own project
              posts and comments where the product provides that control. For account, privacy,
              ownership, or removal requests, contact us with the relevant account handle and public
              URL.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              For privacy questions, removal requests, or data requests, contact{" "}
              <a className="font-medium text-primary hover:underline" href="mailto:contact@foldalpha.com">
                contact@foldalpha.com
              </a>
              . You can also use the{" "}
              <Link className="font-medium text-primary hover:underline" href={"/contact" as Route}>
                contact page
              </Link>.
            </p>
          </PolicySection>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function PolicySection({
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

import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, UserCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Contact · vibearchive",
  description: "Contact vibearchive for support, ownership, privacy, and removal requests.",
};

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-screen w-full max-w-[860px] px-3 py-10 md:px-6">
        <section className="border-b border-border pb-8">
          <p className="text-xs font-medium uppercase leading-4 text-muted-foreground">
            Support
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-10 text-foreground">
            Contact vibearchive
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Send support, privacy, ownership, or removal requests to the address below.
            Include the relevant project URL or account handle so we can find the right record.
          </p>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          <ContactCard
            icon={<Mail className="size-5" aria-hidden="true" />}
            title="General Support"
            body="Questions about accounts, projects, feedback, or MCP/API access."
          />
          <ContactCard
            icon={<UserCheck className="size-5" aria-hidden="true" />}
            title="Ownership"
            body="Claim, correction, or removal requests for external project posts."
          />
          <ContactCard
            icon={<ShieldCheck className="size-5" aria-hidden="true" />}
            title="Privacy"
            body="Profile, email, data, or privacy questions."
          />
        </section>

        <section className="border border-border bg-card p-6">
          <h2 className="text-lg font-semibold leading-7 text-foreground">Email</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Contact us at{" "}
            <a className="font-medium text-primary hover:underline" href="mailto:contact@foldalpha.com">
              contact@foldalpha.com
            </a>
            .
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            For ownership or removal requests, include the public project URL, your relationship to
            the project, and the account handle you want associated with the project.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link className="font-medium text-primary hover:underline" href={"/privacy" as Route}>
              Privacy Policy
            </Link>
            <Link className="font-medium text-primary hover:underline" href={"/terms" as Route}>
              Terms of Service
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function ContactCard({
  icon,
  title,
  body,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  body: string;
}>) {
  return (
    <article className="border border-border bg-card p-4">
      <div className="text-primary">{icon}</div>
      <h2 className="mt-3 text-base font-semibold leading-[22px] text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{body}</p>
    </article>
  );
}

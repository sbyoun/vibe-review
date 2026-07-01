import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChangePasswordForm } from "@/app/login/login-forms";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage() {
  const user = await requireCurrentUser();

  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1100px] px-3 py-8 md:px-6">
          <div className="mx-auto grid w-full max-w-md gap-6">
            <div>
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href={`/p/${user.handle}`}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Profile
                </Link>
              </Button>
            </div>

            <header className="border-b border-border pb-4">
              <h1 className="text-xl font-semibold leading-7 text-foreground">Password</h1>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Change your account password.
              </p>
            </header>

            <ChangePasswordForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

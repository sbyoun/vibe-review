import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChangePasswordForm } from "@/app/login/login-forms";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage() {
  await requireCurrentUser();

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Settings
            </Link>
          </Button>
        </div>

        <header className="border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Password
          </h1>
        </header>

        <div className="max-w-md">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}

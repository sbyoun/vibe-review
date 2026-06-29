import Link from "next/link";

import { ResetPasswordForm } from "@/app/login/login-forms";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: Promise<{ id?: string; token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const resetId = params?.id ?? "";
  const token = params?.token ?? "";
  const hasResetLink = Boolean(resetId && token);

  return (
    <main className="min-h-screen px-6 py-10 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Reset password
          </h1>
        </header>

        <div className="max-w-md">
          {hasResetLink ? (
            <ResetPasswordForm resetId={resetId} token={token} />
          ) : (
            <div className="grid gap-4 rounded-md border border-border bg-card p-6">
              <p role="alert" className="text-sm text-muted-foreground">
                Reset link is invalid.
              </p>
              <Button type="button" asChild>
                <Link href="/forgot-password">Request reset link</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

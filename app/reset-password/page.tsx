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
    <main className="min-h-screen">
      <section className="vc-container grid gap-6">
        <header className="vc-page-header">
          <p className="vc-kicker">
            Account
          </p>
          <h1 className="mt-3 vc-title">
            Reset password
          </h1>
        </header>

        <div className="mx-auto w-full max-w-md">
          {hasResetLink ? (
            <ResetPasswordForm resetId={resetId} token={token} />
          ) : (
            <div className="vc-panel grid gap-4 p-6">
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

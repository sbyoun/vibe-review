import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/app/login/login-forms";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/settings/password");
  }

  return (
    <main className="min-h-screen px-6 py-10 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Forgot password
          </h1>
        </header>

        <div className="max-w-md">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}

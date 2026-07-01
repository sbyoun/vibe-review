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
    <main className="flex min-h-screen justify-center px-3 pt-[102px]">
      <section className="w-full max-w-[400px]">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold leading-7 text-foreground">Forgot Password</h1>
          <p className="text-sm leading-5 text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </header>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}

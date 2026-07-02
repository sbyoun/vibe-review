import { redirect } from "next/navigation";
import type { Route } from "next";

import { LoginForm } from "@/app/login/login-forms";
import { safeRedirectPath } from "@/lib/redirects";
import { getOptionalCurrentUser } from "@/server/current-user";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string; verified?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeRedirectPath(params?.next);
  const user = await getOptionalCurrentUser();

  if (user) {
    redirect((next ?? (user.handle ? `/p/${user.handle}` : "/discover")) as Route);
  }

  const hasCredentialsError = params?.error === "CredentialsSignin";
  const notice = params?.verified === "1" ? "Email verified. Password recovery is now enabled." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6">
      <section className="w-full max-w-[400px]">
        <header className="mb-4 text-center">
          <h1 className="mb-1 text-xl font-bold leading-7 text-foreground">vibearchive</h1>
          <p className="text-sm leading-5 text-muted-foreground">Log in to your account</p>
        </header>
        <LoginForm credentialsError={hasCredentialsError} next={next} notice={notice} />
      </section>
    </main>
  );
}

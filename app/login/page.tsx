import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForms } from "@/app/login/login-forms";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const hasCredentialsError = params?.error === "CredentialsSignin";

  return (
    <main className="min-h-screen px-6 py-10 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Local workspace account
          </h1>
        </header>

        <LoginForms credentialsError={hasCredentialsError} />
      </section>
    </main>
  );
}

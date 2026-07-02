import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-forms";
import { getOptionalCurrentUser } from "@/server/current-user";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; verified?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getOptionalCurrentUser();

  if (user) {
    redirect(user.handle ? `/p/${user.handle}` : "/discover");
  }

  const params = await searchParams;
  const hasCredentialsError = params?.error === "CredentialsSignin";
  const notice = params?.verified === "1" ? "Email verified. Password recovery is now enabled." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6">
      <section className="w-full max-w-[400px]">
        <header className="mb-4 text-center">
          <h1 className="mb-1 text-xl font-bold leading-7 text-foreground">vibearchive</h1>
          <p className="text-sm leading-5 text-muted-foreground">Log in to your account</p>
        </header>
        <LoginForm credentialsError={hasCredentialsError} notice={notice} />
      </section>
    </main>
  );
}

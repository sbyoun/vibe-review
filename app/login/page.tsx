import { redirect } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { loginWithPassword, registerWithPassword } from "@/server/auth-actions";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            action={loginWithPassword}
            className="grid gap-4 rounded-md border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2">
              <LogIn className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Log in</h2>
            </div>

            {hasCredentialsError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                Invalid handle or password.
              </p>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Handle</span>
              <input
                className={inputClass}
                name="handle"
                placeholder="aya"
                required
                autoComplete="username"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Password</span>
              <input
                className={inputClass}
                name="password"
                type="password"
                placeholder="password123"
                required
                autoComplete="current-password"
              />
            </label>

            <Button type="submit">
              <LogIn className="size-4" aria-hidden="true" />
              Log in
            </Button>
          </form>

          <form
            action={registerWithPassword}
            className="grid gap-4 rounded-md border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Create account</h2>
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Handle</span>
              <input
                className={inputClass}
                name="handle"
                placeholder="your-handle"
                required
                autoComplete="username"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Name</span>
              <input
                className={inputClass}
                name="name"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Password</span>
              <input
                className={inputClass}
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Confirm password</span>
              <input
                className={inputClass}
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <Button type="submit" variant="outline">
              <UserPlus className="size-4" aria-hidden="true" />
              Create account
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

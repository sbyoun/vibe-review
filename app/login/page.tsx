import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { loginWithHandle } from "@/server/auth-actions";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 lg:px-10">
      <section className="mx-auto grid w-full max-w-md gap-6 rounded-md border border-border bg-card p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Local workspace login
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Pick a handle to create or reopen a local account for this MVP.
          </p>
        </div>

        <form action={loginWithHandle} className="grid gap-3">
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
            <span className="text-sm font-medium">Name</span>
            <input className={inputClass} name="name" placeholder="Aya Kim" autoComplete="name" />
          </label>
          <Button type="submit">
            <LogIn className="size-4" aria-hidden="true" />
            Continue
          </Button>
        </form>
      </section>
    </main>
  );
}

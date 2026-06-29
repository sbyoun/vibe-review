import { redirect } from "next/navigation";

import { SignupForm } from "@/app/login/login-forms";
import { getOptionalCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getOptionalCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Create account
          </h1>
        </header>

        <div className="max-w-md">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}

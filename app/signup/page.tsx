import { redirect } from "next/navigation";

import { SignupForm } from "@/app/login/login-forms";
import { getOptionalCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getOptionalCurrentUser();

  if (user) {
    redirect(user.handle ? `/p/${user.handle}` : "/discover");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6">
      <section className="w-full max-w-[400px]">
        <header className="mb-4 text-center">
          <h1 className="mb-1 text-xl font-bold leading-7 text-foreground">VibeReview</h1>
          <p className="text-sm leading-5 text-muted-foreground">Join the community</p>
        </header>
        <SignupForm />
      </section>
    </main>
  );
}

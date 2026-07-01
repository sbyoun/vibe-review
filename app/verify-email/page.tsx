import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/server/email-verification";

export const dynamic = "force-dynamic";

type VerifyEmailPageProps = {
  searchParams?: Promise<{ id?: string; token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const result = await verifyEmailToken(params?.id ?? "", params?.token ?? "");

  if (result.ok) {
    redirect("/login?verified=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-3 py-6">
      <section className="w-full max-w-[400px] border border-border bg-card p-6">
        <h1 className="text-xl font-semibold leading-7 text-foreground">Email verification</h1>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">{result.message}</p>
        <div className="mt-6 flex gap-2">
          <Button type="button" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

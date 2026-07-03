import Link from "next/link";
import type { Route } from "next";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-background py-8">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center gap-4 px-3 text-xs leading-4 text-muted-foreground md:flex-row md:px-6">
        <span className="text-base font-bold leading-[22px] text-foreground">vibearchive</span>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href={"/privacy" as Route} className="hover:text-primary hover:underline">
            Privacy
          </Link>
          <Link href={"/terms" as Route} className="hover:text-primary hover:underline">
            Terms
          </Link>
          <Link href={"/contact" as Route} className="hover:text-primary hover:underline">
            Contact
          </Link>
          <Link href="/mcp" className="hover:text-primary hover:underline">
            API
          </Link>
        </nav>
        <span>© 2026 vibearchive</span>
      </div>
    </footer>
  );
}

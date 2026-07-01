import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-background py-8">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center gap-4 px-3 text-xs leading-4 text-muted-foreground md:flex-row md:px-6">
        <span className="text-base font-bold leading-[22px] text-foreground">VibeReview</span>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/discover" className="hover:text-primary hover:underline">
            Guidelines
          </Link>
          <Link href="/discover" className="hover:text-primary hover:underline">
            FAQ
          </Link>
          <Link href="/discover" className="hover:text-primary hover:underline">
            Support
          </Link>
          <Link href="/mcp" className="hover:text-primary hover:underline">
            API
          </Link>
        </nav>
        <span>© 2024 VibeReview</span>
      </div>
    </footer>
  );
}

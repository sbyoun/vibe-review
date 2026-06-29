import Link from "next/link";
import type { Route } from "next";
import {
  Archive,
  Columns3,
  Compass,
  LogIn,
  LogOut,
  MessageSquareText,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/server/auth-actions";
import { getOptionalCurrentUser } from "@/server/current-user";

export async function SiteNav() {
  const user = await getOptionalCurrentUser();
  const profileHref = user?.handle ? (`/p/${user.handle}` as Route) : "/login";
  const navItems: Array<{ href: Route; label: string; icon: LucideIcon }> = [
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/dashboard", label: "Dashboard", icon: Columns3 },
    { href: "/feedback", label: "Feedback", icon: MessageSquareText },
    { href: profileHref, label: "Profile", icon: UserRound },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Archive className="size-4" aria-hidden="true" />
          </span>
          Vibe Code Workspace
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Button>
            </form>
          ) : (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="size-4" aria-hidden="true" />
                Log in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

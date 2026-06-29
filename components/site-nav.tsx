"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Columns3, Compass, MessageSquareText, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/dashboard", label: "Dashboard", icon: Columns3 },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
  { href: "/p/aya", label: "Profile", icon: UserRound },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Archive className="size-4" aria-hidden="true" />
          </span>
          Vibe Code Workspace
        </Link>

        <nav className="flex gap-1 overflow-x-auto" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/p/aya"
                ? pathname === item.href || pathname.startsWith("/p/aya/")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

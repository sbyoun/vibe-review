"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type SiteNavClientProps = {
  isAuthenticated: boolean;
  userHandle: string | null;
  myHref: Route;
  profileHref: Route;
  settingsHref: Route;
  logoutAction: (formData: FormData) => void | Promise<void>;
};

type NavItem = {
  label: string;
  href: Route;
  active: boolean;
};

export function SiteNavClient({
  isAuthenticated,
  userHandle,
  myHref,
  profileHref,
  settingsHref,
  logoutAction,
}: SiteNavClientProps) {
  const pathname = usePathname();
  const profilePath = userHandle ? `/p/${userHandle}` : null;
  const items: NavItem[] = [
    {
      label: "Discover",
      href: "/discover",
      active: pathname === "/" || pathname.startsWith("/discover"),
    },
  ];

  if (isAuthenticated) {
    items.push(
      {
        label: "My",
        href: myHref,
        active: pathname.startsWith("/dashboard") || pathname.startsWith("/projects"),
      },
      {
        label: "Profile",
        href: profileHref,
        active: profilePath ? pathname === profilePath : false,
      },
      {
        label: "Settings",
        href: settingsHref,
        active: pathname.startsWith("/settings"),
      },
    );
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1100px] items-center gap-4 px-3 py-2 md:px-6">
        <Link
          href="/discover"
          className="shrink-0 text-base font-bold leading-[22px] text-foreground hover:text-primary hover:underline"
        >
          vibearchive
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto text-sm leading-5 md:gap-4">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "shrink-0 font-bold text-primary hover:underline"
                  : "shrink-0 text-muted-foreground hover:text-primary hover:underline"
              }
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto shrink-0">
          {isAuthenticated ? (
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" aria-hidden="true" />
                Log out
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

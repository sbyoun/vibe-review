import type { Route } from "next";

import { logout } from "@/server/auth-actions";
import { getOptionalCurrentUser } from "@/server/current-user";

import { SiteNavClient } from "./site-nav-client";

export async function SiteNav(props: { showSubmit?: boolean } = {}) {
  void props;

  const user = await getOptionalCurrentUser();
  const profileHref = user?.handle ? (`/p/${user.handle}` as Route) : ("/login" as Route);
  const myHref = user ? ("/dashboard" as Route) : ("/login" as Route);
  const settingsHref = user ? ("/settings" as Route) : ("/login" as Route);

  return (
    <SiteNavClient
      isAuthenticated={Boolean(user)}
      userHandle={user?.handle ?? null}
      myHref={myHref}
      profileHref={profileHref}
      settingsHref={settingsHref}
      logoutAction={logout}
    />
  );
}

import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    handle?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    handle?: string | null;
  }
}

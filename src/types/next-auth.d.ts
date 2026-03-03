import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string;
    role: string;
  }
  interface Session {
    user: User & {
      id: string;
      tenantId: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    role: string;
    userId: string;
  }
}

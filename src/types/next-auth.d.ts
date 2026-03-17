import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
  }
  interface Session {
    user: User & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

"use client";

import { SessionProvider } from "next-auth/react";

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  return <SessionProvider>{children}</SessionProvider>;
}

"use client";

import { SessionProvider } from "next-auth/react";
import { AppConfigContext, useAppConfigLoader } from "@/hooks/use-app-config";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const config = useAppConfigLoader();

  const content = (
    <AppConfigContext value={config}>
      {children}
    </AppConfigContext>
  );

  if (!config.authEnabled) return content;
  return <SessionProvider>{content}</SessionProvider>;
}

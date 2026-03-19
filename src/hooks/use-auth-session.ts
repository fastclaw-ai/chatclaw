"use client";

import { useSession as useNextAuthSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useAppConfig } from "@/hooks/use-app-config";

type AuthSession = {
  session: { user?: { name?: string | null; email?: string | null } } | null;
  signOut: () => void;
};

export function useAuthSession(): AuthSession {
  const { authEnabled } = useAppConfig();

  if (authEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useNextAuthSession();
    return { session: data, signOut: nextAuthSignOut };
  }
  return { session: null, signOut: () => {} };
}

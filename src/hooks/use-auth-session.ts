"use client";

import { useSession as useNextAuthSession, signOut as nextAuthSignOut } from "next-auth/react";

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

type AuthSession = {
  session: { user?: { name?: string | null; email?: string | null } } | null;
  signOut: () => void;
};

/**
 * Wraps next-auth useSession. Returns null session when auth is disabled,
 * avoiding the SessionProvider requirement and /api/auth/session calls.
 *
 * authEnabled is a build-time constant (NEXT_PUBLIC_), so the conditional
 * hook call is safe — the branch never flips at runtime.
 */
export function useAuthSession(): AuthSession {
  if (authEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useNextAuthSession();
    return { session: data, signOut: nextAuthSignOut };
  }
  return { session: null, signOut: () => {} };
}

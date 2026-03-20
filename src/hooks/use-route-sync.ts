"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

function buildPath(
  companyId: string | null,
  targetType: string | null,
  targetId: string | null,
  conversationId: string | null,
): string {
  if (!companyId) return "/";
  let path = `/c/${companyId}`;
  if (targetType && targetId) {
    path += `/${targetType}/${targetId}`;
    if (conversationId) {
      path += `/${conversationId}`;
    }
  }
  return path;
}

export function useRouteSync() {
  const { state } = useStore();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.initialized) return;

    const path = buildPath(
      state.activeCompanyId,
      state.activeChatTarget?.type ?? null,
      state.activeChatTarget?.id ?? null,
      state.activeConversationId,
    );

    // Avoid pushing duplicate entries
    if (path === prevPathRef.current) return;
    prevPathRef.current = path;

    // Use replaceState to avoid polluting browser history on every state change
    // Use pushState only when target or conversation changes meaningfully
    const currentPath = window.location.pathname;
    if (currentPath !== path) {
      window.history.replaceState(null, "", path);
    }
  }, [
    state.initialized,
    state.activeCompanyId,
    state.activeChatTarget?.type,
    state.activeChatTarget?.id,
    state.activeConversationId,
  ]);
}

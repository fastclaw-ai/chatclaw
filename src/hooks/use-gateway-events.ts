"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import { addMessage } from "@/lib/db";
import type { Message } from "@/types";
import type { GatewayPushEvent } from "@/lib/gateway-ws";

// Parse sessionKey to extract agentId
// Formats:
//   agent:${agentId}:chatclaw:${conversationId}
//   agent:${agentId}:chatclaw:team:${teamId}:${conversationId}
//   agent:${agentId}:cron:${jobId}
function parseAgentId(sessionKey: string): string | null {
  const match = sessionKey.match(/^agent:([^:]+):/);
  return match ? match[1] : null;
}

// Track accumulated text per runId for streaming cron messages
const cronRuns = new Map<string, { agentId: string; text: string; sessionKey: string }>();

export function useGatewayEvents() {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const eventSourceRef = useRef<EventSource | null>(null);

  const companyId = state.activeCompanyId;

  useEffect(() => {
    if (!companyId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/events?companyId=${encodeURIComponent(companyId)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const pushEvent: GatewayPushEvent = JSON.parse(event.data);
        handlePushEvent(pushEvent);
      } catch {
        // Skip parse errors
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function handlePushEvent(event: GatewayPushEvent) {
    // Only handle "agent" events (which carry message content)
    if (event.event !== "agent") return;

    const payload = event.payload;
    const stream = payload.stream as string;
    const sessionKey = event.sessionKey || (payload.sessionKey as string) || "";
    const runId = payload.runId as string;
    const data = payload.data as Record<string, unknown> | undefined;

    if (!sessionKey || !runId) return;

    // Skip events from chatclaw-initiated sessions (already handled by RuntimeClient)
    if (sessionKey.includes(":chatclaw:")) return;

    const agentId = parseAgentId(sessionKey);
    if (!agentId) return;

    if (stream === "assistant" && data) {
      // Streaming text content
      const text = (data.text as string) || "";
      cronRuns.set(runId, { agentId, text, sessionKey });
    }

    if (stream === "lifecycle" && data) {
      const phase = data.phase as string;

      if (phase === "end") {
        // Cron run completed — save the accumulated message
        const run = cronRuns.get(runId);
        if (run && run.text) {
          savePushMessage(run.agentId, run.text);
          cronRuns.delete(runId);
        }
      }
    }
  }

  function savePushMessage(agentId: string, content: string) {
    const current = stateRef.current;

    // Find the most recent conversation for this agent
    const conversations = current.conversations.filter(
      c => c.targetId === agentId ||
        current.teams.some(t => t.id === c.targetId && t.agentIds.includes(agentId))
    );

    // Use the active conversation if it matches, otherwise find the latest
    let conversationId = "";
    let targetType: "agent" | "team" = "agent";
    let targetId = agentId;

    const activeConv = conversations.find(c => c.id === current.activeConversationId);
    if (activeConv) {
      conversationId = activeConv.id;
      targetType = activeConv.targetType as "agent" | "team";
      targetId = activeConv.targetId;
    } else if (conversations.length > 0) {
      const latest = conversations[0];
      conversationId = latest.id;
      targetType = latest.targetType as "agent" | "team";
      targetId = latest.targetId;
    }

    if (!conversationId) return; // No conversation to deliver to

    const msg: Message = {
      id: uuidv4(),
      conversationId,
      targetType,
      targetId,
      role: "assistant",
      agentId,
      content,
      createdAt: Date.now(),
    };

    // Save to DB
    addMessage(msg);

    // If user is viewing this conversation, add to UI
    if (current.activeConversationId === conversationId) {
      dispatch({ type: "ADD_MESSAGE", message: msg });
    } else {
      dispatch({ type: "MARK_UNREAD", conversationId });
    }
  }
}

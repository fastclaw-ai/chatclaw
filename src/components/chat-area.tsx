"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot,
  Send,
  Square,
  Users,
  MessageCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      <span className="streaming-dot-1 inline-block h-1.5 w-1.5 rounded-full bg-discord-muted" />
      <span className="streaming-dot-2 inline-block h-1.5 w-1.5 rounded-full bg-discord-muted" />
      <span className="streaming-dot-3 inline-block h-1.5 w-1.5 rounded-full bg-discord-muted" />
    </span>
  );
}

export function ChatArea() {
  const { state, actions } = useStore();
  const [input, setInput] = useState("");
  const [composing, setComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const target = state.activeChatTarget;
  const isConnected = state.connectionStatus === "connected";

  // Get chat target info
  const targetAgent = target?.type === "agent"
    ? state.agents.find((a) => a.id === target.id)
    : null;
  const targetTeam = target?.type === "team"
    ? state.teams.find((t) => t.id === target.id)
    : null;
  const teamAgents = targetTeam
    ? state.agents.filter((a) => targetTeam.agentIds.includes(a.id))
    : [];

  // Streaming entries for current chat target
  const streamingEntries = Object.entries(state.streamingStates).filter(
    ([, s]) => target && s.targetType === target.type && s.targetId === target.id && s.isStreaming
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, streamingEntries]);

  // Auto-focus
  useEffect(() => {
    textareaRef.current?.focus();
  }, [target]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !target) return;
    setInput("");
    actions.sendMessage(text);
  }, [input, target, actions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !composing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, composing]
  );

  // No target selected — empty state
  if (!target) {
    return (
      <div className="flex flex-1 h-full flex-col items-center justify-center bg-discord-light text-discord-muted">
        <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-xl font-semibold text-foreground mb-1">Welcome to ChatClaw</p>
        <p className="text-sm">Select an agent for DM or a team for group chat</p>
      </div>
    );
  }

  const chatTitle = target.type === "agent"
    ? (state.agentIdentities[target.id]?.name || targetAgent?.name || "Agent")
    : (targetTeam?.name || "Team");

  const chatSubtitle = target.type === "agent"
    ? targetAgent?.specialty
    : `${teamAgents.length} agent${teamAgents.length !== 1 ? "s" : ""}`;

  const placeholder = !isConnected
    ? "Gateway not connected..."
    : target.type === "agent"
    ? `Message ${chatTitle}`
    : `Message ${chatTitle} team`;

  return (
    <div className="flex flex-1 h-full flex-col bg-discord-light">
      {/* Chat header */}
      <div className="flex h-12 items-center gap-2 px-4 shadow-[0_1px_0_0_rgba(0,0,0,0.2)] shrink-0">
        {target.type === "agent" ? (
          <Bot className="h-5 w-5 text-discord-muted" />
        ) : (
          <Users className="h-5 w-5 text-discord-muted" />
        )}
        <span className="font-semibold text-[15px] text-foreground">{chatTitle}</span>
        {chatSubtitle && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <span className="text-sm text-discord-muted truncate">{chatSubtitle}</span>
          </>
        )}
        {target.type === "team" && teamAgents.length > 0 && (
          <div className="ml-auto flex -space-x-2">
            {teamAgents.slice(0, 5).map((agent) => {
              const identity = state.agentIdentities[agent.id];
              return (
                <div
                  key={agent.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-discord-light bg-discord-blurple text-white text-[10px] font-bold"
                  title={identity?.name || agent.name}
                >
                  {identity?.emoji || agent.name[0].toUpperCase()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {state.messages.length === 0 && streamingEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-discord-muted">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-discord-mid mb-4">
              {target.type === "agent" ? (
                <Bot className="h-8 w-8" />
              ) : (
                <Users className="h-8 w-8" />
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {target.type === "agent" ? `Chat with ${chatTitle}` : `${chatTitle} Team`}
            </p>
            <p className="text-sm">
              {target.type === "agent"
                ? targetAgent?.description || "Start a conversation"
                : targetTeam?.description || "Group chat with your agents"}
            </p>
          </div>
        )}

        {state.messages.map((msg) => {
          const agent = msg.agentId
            ? state.agents.find((a) => a.id === msg.agentId)
            : null;
          const identity = msg.agentId
            ? state.agentIdentities[msg.agentId]
            : null;
          const isUser = msg.role === "user";
          const time = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={msg.id}
              className="group flex gap-4 py-0.5 hover:bg-black/[0.03] -mx-4 px-4 rounded"
            >
              <div className="shrink-0 mt-0.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                    isUser
                      ? "bg-discord-green text-white"
                      : "bg-discord-blurple text-white"
                  )}
                >
                  {isUser
                    ? "U"
                    : identity?.emoji || agent?.name?.[0]?.toUpperCase() || "A"}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-semibold text-[15px]",
                      isUser ? "text-discord-green" : "text-discord-blurple"
                    )}
                  >
                    {isUser ? "You" : identity?.name || agent?.name || "Agent"}
                  </span>
                  <span className="text-[11px] text-discord-muted">{time}</span>
                </div>
                <div className="text-[15px] leading-relaxed text-foreground">
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming messages */}
        {streamingEntries.map(([agentId, streaming]) => {
          const agent = state.agents.find((a) => a.id === agentId);
          const identity = state.agentIdentities[agentId];

          return (
            <div key={agentId} className="flex gap-4 py-0.5 -mx-4 px-4">
              <div className="shrink-0 mt-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-discord-blurple text-white text-sm font-semibold">
                  {identity?.emoji || agent?.name?.[0]?.toUpperCase() || "A"}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-[15px] text-discord-blurple">
                    {identity?.name || agent?.name || "Agent"}
                  </span>
                  <StreamingDots />
                </div>
                <div className="text-[15px] leading-relaxed text-foreground">
                  {streaming.content ? (
                    <MarkdownRenderer content={streaming.content} />
                  ) : (
                    <span className="text-discord-muted italic">Thinking...</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-6 pt-0">
        <div className="flex items-end gap-2 rounded-lg bg-[#383a40] px-4 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            placeholder={placeholder}
            disabled={!isConnected}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-discord-muted outline-none disabled:opacity-50"
            style={{ maxHeight: 200, minHeight: 24 }}
          />
          {streamingEntries.length > 0 ? (
            <button
              onClick={() => {
                for (const [agentId] of streamingEntries) {
                  actions.abortStreaming(agentId);
                }
              }}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded bg-discord-red text-white hover:bg-discord-red/80 transition-colors"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded bg-discord-blurple text-white hover:bg-discord-blurple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

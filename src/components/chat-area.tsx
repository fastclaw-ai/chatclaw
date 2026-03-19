"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot,
  Send,
  Square,
  Users,
  MessageCircle,
  Copy,
  RotateCcw,
  Loader2,
  Wrench,
  ArrowDown,
  Paperclip,
  X,
  File as FileIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
import { getAgentAvatarUrl, getUserAvatarUrl } from "@/lib/avatar";
import { ConversationPanel } from "@/components/conversation-panel";
import { v4 as uuidv4 } from "uuid";
import type { StreamingPhase, MessageAttachment } from "@/types";

function StreamingIndicator({ phase }: { phase: StreamingPhase }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {(phase === "connecting" || phase === "thinking") && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Thinking...
        </>
      )}
      {phase === "tool-calling" && (
        <>
          <Wrench className="h-3 w-3 animate-pulse" />
          Using tools...
        </>
      )}
      {phase === "responding" && (
        <span className="inline-flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </span>
      )}
    </span>
  );
}

function ElapsedTimer({ active }: { active: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    setSeconds(0);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (seconds < 2) return null;
  const display = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return <span className="text-[10px] text-muted-foreground ml-1">{display}</span>;
}

export function ChatArea() {
  const { state, actions } = useStore();
  const [input, setInput] = useState("");
  const [composing, setComposing] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll only when user is near the bottom
  const isNearBottomRef = React.useRef(true);
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 10;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = isNearBottom;
    setShowScrollButton(hasOverflow && !isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const isImage = file.type.startsWith("image/");
        const att: MessageAttachment = {
          id: uuidv4(),
          type: isImage ? "image" : "file",
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url: dataUrl,
        };
        setAttachments(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const att: MessageAttachment = {
            id: uuidv4(),
            type: "image",
            name: `paste-${Date.now()}.png`,
            mimeType: file.type,
            size: file.size,
            url: dataUrl,
          };
          setAttachments(prev => [...prev, att]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || !target) return;
    setInput("");
    const atts = [...attachments];
    setAttachments([]);
    actions.sendMessage(text, atts.length > 0 ? atts : undefined);
  }, [input, attachments, target, actions]);

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
      <div className="flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
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
    <div className="flex h-full">
      {/* Main chat column */}
      <div className="flex flex-1 flex-col min-w-0 bg-background">
      {/* Chat header */}
      <div className="flex h-12 items-center gap-2 px-4 border-b shrink-0">
        {target.type === "agent" ? (
          <Bot className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Users className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="font-semibold text-[15px] text-foreground">{chatTitle}</span>
        {chatSubtitle && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground truncate">{chatSubtitle}</span>
          </>
        )}
        {target.type === "team" && teamAgents.length > 0 && (
          <div className="ml-auto flex -space-x-2">
            {teamAgents.slice(0, 5).map((agent) => {
              const identity = state.agentIdentities[agent.id];
              return (
                <img
                  key={agent.id}
                  src={getAgentAvatarUrl(agent.id)}
                  alt={agent.name}
                  className="h-6 w-6 rounded-full border-2 border-background bg-muted"
                  title={identity?.name || agent.name}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative">
        {state.messages.length === 0 && streamingEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
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
              className="group flex gap-4 py-0.5 hover:bg-muted/50 -mx-4 px-4 rounded relative"
            >
              <div className="shrink-0 mt-0.5">
                {isUser ? (
                  <img
                    src={getUserAvatarUrl()}
                    alt="You"
                    className="h-8 w-8 rounded-full bg-muted"
                  />
                ) : (
                  <img
                    src={getAgentAvatarUrl(msg.agentId || "unknown")}
                    alt={agent?.name || "Agent"}
                    className="h-8 w-8 rounded-full bg-muted"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-semibold text-[15px]",
                      isUser ? "text-green-600" : "text-primary"
                    )}
                  >
                    {isUser ? "You" : identity?.name || agent?.name || "Agent"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{time}</span>
                </div>
                <div className="text-[15px] leading-relaxed text-foreground">
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.attachments.filter(a => a.type === "image").map(att => (
                      <img
                        key={att.id}
                        src={att.url}
                        alt={att.name}
                        className="max-h-64 max-w-sm rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(att.url, "_blank")}
                      />
                    ))}
                    {msg.attachments.filter(a => a.type === "file").map(att => (
                      <div key={att.id} className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{att.name}</p>
                          <p className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover action bar */}
              <div className="absolute right-2 top-0 hidden group-hover:flex items-center gap-0.5 bg-background border rounded-md shadow-sm p-0.5">
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => {
                      const msgIndex = state.messages.findIndex(m => m.id === msg.id);
                      const lastUserMsg = [...state.messages].slice(0, msgIndex).reverse().find(m => m.role === "user");
                      if (lastUserMsg) {
                        actions.sendMessage(lastUserMsg.content);
                      }
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Retry"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
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
                <img
                  src={getAgentAvatarUrl(agentId)}
                  alt={agent?.name || "Agent"}
                  className="h-8 w-8 rounded-full bg-muted"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-primary">
                    {identity?.name || agent?.name || "Agent"}
                  </span>
                  <StreamingIndicator phase={streaming.phase} />
                  <ElapsedTimer active={streaming.isStreaming} />
                </div>
                <div className="text-[15px] leading-relaxed text-foreground">
                  {streaming.content ? (
                    <MarkdownRenderer content={streaming.content} />
                  ) : (
                    <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                      {(streaming.phase === "connecting" || streaming.phase === "thinking") && "Agent is thinking..."}
                      {streaming.phase === "tool-calling" && "Agent is using tools..."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-background border shadow-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <ArrowDown className="h-3 w-3" />
            New messages
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-0">
        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {attachments.map(att => (
              <div key={att.id} className="relative group shrink-0">
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-16 w-16 rounded-lg object-cover border bg-muted"
                  />
                ) : (
                  <div className="h-16 px-3 rounded-lg border bg-muted flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[100px]">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(att.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-lg bg-muted px-3 py-2">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded hover:bg-background/50 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.csv,.xml,.html,.js,.ts,.py,.go,.rs,.java,.cpp,.c,.sh"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={!isConnected}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
            style={{ maxHeight: 200, minHeight: 24 }}
          />

          {/* Send/Stop button */}
          {streamingEntries.length > 0 ? (
            <button
              onClick={() => {
                for (const [agentId] of streamingEntries) {
                  actions.abortStreaming(agentId);
                }
              }}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || !isConnected}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Right panel */}
      <ConversationPanel />
    </div>
  );
}

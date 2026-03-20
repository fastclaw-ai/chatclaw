"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot,
  Send,
  Square,
  Users,
  MessageCircle,
  Copy,
  Check,
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
import { getAgentAvatarUrl, isEmojiAvatar } from "@/lib/avatar";
import { loadUserProfile } from "@/components/dialogs/user-profile-dialog";
import { ConversationPanel } from "@/components/conversation-panel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { v4 as uuidv4 } from "uuid";
import type { StreamingPhase, MessageAttachment, ToolCallContent } from "@/types";

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

function ToolCallBlock({ toolCall }: { toolCall: ToolCallContent }) {
  const [expanded, setExpanded] = useState(false);

  // Try to parse arguments for display
  let parsedArgs: Record<string, unknown> | null = null;
  try {
    if (toolCall.arguments) {
      parsedArgs = JSON.parse(toolCall.arguments);
    }
  } catch {
    // not valid JSON
  }

  // Check if result contains an image URL
  const imageUrlMatch = toolCall.result?.match(/https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"']*)?/i);
  // Also check for markdown image syntax
  const mdImageMatch = toolCall.result?.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
  const imageUrl = mdImageMatch?.[2] || imageUrlMatch?.[0];

  return (
    <div className="my-2 rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        {toolCall.status === "calling" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500 shrink-0" />
        ) : toolCall.status === "completed" ? (
          <Wrench className="h-3.5 w-3.5 text-green-500 shrink-0" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-destructive shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground">
          {toolCall.name || "Tool call"}
        </span>
        <span className="text-xs text-muted-foreground">
          {toolCall.status === "calling" ? "Running..." : toolCall.status === "completed" ? "Done" : "Error"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2">
          {parsedArgs && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Arguments</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Result</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-40">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Show generated image inline regardless of expanded state */}
      {imageUrl && (
        <div className="px-3 pb-2">
          <img
            src={imageUrl}
            alt={toolCall.name || "Generated image"}
            className="max-h-80 max-w-full rounded-lg border cursor-pointer hover:opacity-90"
            onClick={() => window.open(imageUrl, "_blank")}
          />
        </div>
      )}
    </div>
  );
}

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function ChatArea() {
  const { state, actions } = useStore();
  const [input, setInput] = useState("");
  const [composing, setComposing] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showConvPanel, setShowConvPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const target = state.activeChatTarget;
  const isConnected = state.connectionStatus === "connected";
  const userProfile = loadUserProfile();

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
      && (!s.conversationId || s.conversationId === state.activeConversationId)
  );

  // Auto-scroll only when user is near the bottom
  const isNearBottomRef = React.useRef(true);
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages, streamingEntries]);

  // Scroll to bottom when entering a conversation or when messages load
  const prevConvRef = useRef(state.activeConversationId);
  useEffect(() => {
    if (state.activeConversationId !== prevConvRef.current) {
      prevConvRef.current = state.activeConversationId;
      isNearBottomRef.current = true;
    }
  }, [state.activeConversationId]);

  // After messages change and we just switched conversations, scroll to bottom
  useEffect(() => {
    if (isNearBottomRef.current && state.messages.length > 0) {
      // Use requestAnimationFrame to wait for DOM render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        });
      });
    }
  }, [state.activeConversationId, state.messages.length]);

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
    // Force scroll to bottom when sending
    isNearBottomRef.current = true;
    actions.sendMessage(text, atts.length > 0 ? atts : undefined);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
      <div className="relative flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="absolute top-3 left-3 md:hidden">
          <SidebarTrigger />
        </div>
        <img src="/logo.png" alt="ChatClaw" className="h-16 w-16 mb-4" />
        <p className="text-xl font-semibold text-foreground mb-1">Welcome to ChatClaw</p>
        <p className="text-sm">Select an agent for DM or a team for group chat</p>
      </div>
    );
  }

  const chatTitle = target.type === "agent"
    ? (state.agentIdentities[target.id]?.name || targetAgent?.name || "Agent")
    : (targetTeam?.name || "Team");

  const chatSubtitle = undefined;

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
        <SidebarTrigger className="h-7 w-7 md:hidden" />
        {target.type === "agent" ? (
          isEmojiAvatar(targetAgent?.avatar) ? (
            <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-base shrink-0">{targetAgent?.avatar}</span>
          ) : (
            <img
              src={targetAgent?.avatar || getAgentAvatarUrl(target.id)}
              alt={chatTitle}
              className="h-7 w-7 rounded-full bg-muted object-cover shrink-0"
            />
          )
        ) : isEmojiAvatar(targetTeam?.avatar) ? (
          <span className="h-7 w-7 rounded bg-muted flex items-center justify-center text-base shrink-0">{targetTeam?.avatar}</span>
        ) : targetTeam?.avatar && (targetTeam.avatar.startsWith("data:") || targetTeam.avatar.startsWith("http")) ? (
          <img src={targetTeam.avatar} alt={chatTitle} className="h-7 w-7 rounded bg-muted object-cover shrink-0" />
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
          <div className="ml-auto flex items-center -space-x-2">
            {teamAgents.slice(0, 3).map((agent) => {
              const identity = state.agentIdentities[agent.id];
              return isEmojiAvatar(agent.avatar) ? (
                <span
                  key={agent.id}
                  className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs"
                  title={identity?.name || agent.name}
                >{agent.avatar}</span>
              ) : (
                <img
                  key={agent.id}
                  src={agent.avatar || getAgentAvatarUrl(agent.id)}
                  alt={agent.name}
                  className="h-6 w-6 rounded-full border-2 border-background bg-muted object-cover"
                  title={identity?.name || agent.name}
                />
              );
            })}
            {teamAgents.length > 3 && (
              <span className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                +{teamAgents.length - 3}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setShowConvPanel(!showConvPanel)}
          className="md:hidden ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Conversations"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative">
        {state.messages.length === 0 && streamingEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            {target.type === "agent" ? (
              isEmojiAvatar(targetAgent?.avatar) ? (
                <span className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">{targetAgent?.avatar}</span>
              ) : (
                <img
                  src={targetAgent?.avatar || getAgentAvatarUrl(target.id)}
                  alt={chatTitle}
                  className="h-16 w-16 rounded-full bg-muted object-cover mb-4"
                />
              )
            ) : isEmojiAvatar(targetTeam?.avatar) ? (
              <span className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-3xl mb-4">{targetTeam?.avatar}</span>
            ) : targetTeam?.avatar && (targetTeam.avatar.startsWith("data:") || targetTeam.avatar.startsWith("http")) ? (
              <img src={targetTeam.avatar} alt={chatTitle} className="h-16 w-16 rounded-lg bg-muted object-cover mb-4" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Users className="h-8 w-8" />
              </div>
            )}
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
                  userProfile.avatar && (userProfile.avatar.startsWith("data:") || userProfile.avatar.startsWith("http")) ? (
                    <img src={userProfile.avatar} alt="You" className="h-8 w-8 rounded-full bg-muted object-cover" />
                  ) : userProfile.avatar ? (
                    <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">{userProfile.avatar}</span>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {(userProfile.name || "U")[0]?.toUpperCase()}
                    </div>
                  )
                ) : isEmojiAvatar(agent?.avatar) ? (
                  <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">{agent?.avatar}</span>
                ) : (
                  <img
                    src={agent?.avatar || getAgentAvatarUrl(msg.agentId || "unknown")}
                    alt={agent?.name || "Agent"}
                    className="h-8 w-8 rounded-full bg-muted object-cover"
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
                    {isUser ? (userProfile.name || "You") : identity?.name || agent?.name || "Agent"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{time}</span>
                </div>
                {/* Tool calls */}
                {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-1">
                    {msg.toolCalls.map((tc) => (
                      <ToolCallBlock key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
                <div className="text-[15px] leading-relaxed text-foreground">
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} agentId={msg.agentId} />
                  )}
                </div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.attachments.filter(a => a.type === "image").map(att => (
                      <img
                        key={att.id}
                        src={att.url}
                        alt={att.name}
                        className="max-h-64 max-w-[calc(100vw-120px)] md:max-w-sm rounded-lg border cursor-pointer hover:opacity-90"
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
                <CopyMessageButton content={msg.content} />
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
                {isEmojiAvatar(agent?.avatar) ? (
                  <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">{agent?.avatar}</span>
                ) : (
                  <img
                    src={agent?.avatar || getAgentAvatarUrl(agentId)}
                    alt={agent?.name || "Agent"}
                    className="h-8 w-8 rounded-full bg-muted object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-primary">
                    {identity?.name || agent?.name || "Agent"}
                  </span>
                  <StreamingIndicator phase={streaming.phase} />
                  <ElapsedTimer active={streaming.isStreaming} />
                </div>

                {/* Tool calls */}
                {streaming.toolCalls && streaming.toolCalls.length > 0 && (
                  <div className="mt-1">
                    {streaming.toolCalls.map((tc) => (
                      <ToolCallBlock key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}

                <div className="text-[15px] leading-relaxed text-foreground">
                  {streaming.content ? (
                    <MarkdownRenderer content={streaming.content} agentId={agentId} />
                  ) : streaming.toolCalls && streaming.toolCalls.length > 0 ? null : (
                    <div className="flex items-center gap-1 py-2">
                      <span className="flex gap-[3px] items-center">
                        <span className="h-[6px] w-[6px] rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-[6px] w-[6px] rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-[6px] w-[6px] rounded-full bg-muted-foreground/60 animate-bounce" />
                      </span>
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

      {/* Input area - WeChat style */}
      <div className="shrink-0 border-t bg-muted/40">
        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
            {attachments.map(att => (
              <div key={att.id} className="relative group shrink-0">
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-14 w-14 rounded-md object-cover border bg-muted"
                  />
                ) : (
                  <div className="h-14 px-2 rounded-md border bg-muted flex items-center gap-1.5">
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate max-w-[80px]">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(att.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="px-3 pt-2">
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
            rows={3}
            className="w-full resize-none bg-transparent px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
            style={{ maxHeight: 200, minHeight: 72 }}
          />
        </div>

        {/* Toolbar row - bottom */}
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-2 md:px-4 md:pb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
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

          <div className="flex-1" />

          {/* Send/Stop button */}
          {streamingEntries.length > 0 ? (
            <button
              onClick={() => {
                for (const [agentId] of streamingEntries) {
                  actions.abortStreaming(agentId);
                }
              }}
              className="flex h-7 items-center gap-1.5 rounded-md bg-destructive text-white hover:bg-destructive/80 px-3 text-xs font-medium transition-colors"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || !isConnected}
              className="flex h-7 items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed px-3 text-xs font-medium transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Right panel - desktop */}
      <div className="hidden md:flex">
        <ConversationPanel />
      </div>

      {/* Right panel - mobile overlay */}
      {showConvPanel && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConvPanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-background border-l shadow-xl">
            <ConversationPanel />
          </div>
        </div>
      )}
    </div>
  );
}

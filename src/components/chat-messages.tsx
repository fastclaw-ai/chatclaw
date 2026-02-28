"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex size-20 items-center justify-center rounded-2xl overflow-hidden">
        <Image src="/logo.png" alt="ChatClaw" width={80} height={80} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold tracking-tight">
          Start a conversation
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Type a message below to begin chatting with your AI agent.
        </p>
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function StreamingCursor() {
  return (
    <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-text-bottom rounded-sm" />
  );
}

export function ChatMessages() {
  const { state } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.streamingContent]);

  if (!state.activeConversationId) {
    return <EmptyState />;
  }

  const isStreamingHere =
    state.isStreaming &&
    state.streamingConversationId === state.activeConversationId;

  const hasMessages = state.messages.length > 0 || isStreamingHere;

  if (!hasMessages) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          {state.messages.map((msg) => (
            <div key={msg.id} className="flex gap-4">
              <Avatar
                className={cn(
                  "size-8 shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-secondary"
                    : "bg-primary/10 ring-1 ring-primary/20"
                )}
              >
                <AvatarFallback
                  className={cn(
                    msg.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="size-4" />
                  ) : state.agentIdentity?.emoji ? (
                    <span className="text-sm">
                      {state.agentIdentity.emoji}
                    </span>
                  ) : (
                    <Bot className="size-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {msg.role === "user"
                    ? "You"
                    : state.agentIdentity?.name ?? "Assistant"}
                </p>
                <div
                  className={cn(
                    "text-sm leading-relaxed",
                    msg.role === "user"
                      ? "rounded-xl bg-muted/50 px-4 py-3"
                      : "prose-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isStreamingHere && (
            <div className="flex gap-4">
              <Avatar className="size-8 shrink-0 mt-0.5 bg-primary/10 ring-1 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {state.agentIdentity?.emoji ? (
                    <span className="text-sm">
                      {state.agentIdentity.emoji}
                    </span>
                  ) : (
                    <Bot className="size-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {state.agentIdentity?.name ?? "Assistant"}
                </p>
                <div className="text-sm leading-relaxed">
                  {state.streamingContent ? (
                    <>
                      <MarkdownRenderer content={state.streamingContent} />
                      <StreamingCursor />
                    </>
                  ) : (
                    <StreamingDots />
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

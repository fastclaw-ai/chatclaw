"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Start a conversation</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Type a message to begin chatting with your agent.
        </p>
      </div>
    </div>
  );
}

function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse align-text-bottom" />
  );
}

export function ChatMessages() {
  const { state } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.streamingContent]);

  if (!state.activeConversationId) {
    return <EmptyState />;
  }

  const hasMessages = state.messages.length > 0 || state.isStreaming;

  if (!hasMessages) {
    return <EmptyState />;
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {state.agentIdentity?.emoji ? (
                  <span className="text-sm">{state.agentIdentity.emoji}</span>
                ) : (
                  <Bot className="h-4 w-4 text-primary" />
                )}
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {state.isStreaming && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              {state.agentIdentity?.emoji ? (
                <span className="text-sm">{state.agentIdentity.emoji}</span>
              ) : (
                <Bot className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-muted">
              {state.streamingContent ? (
                <>
                  <MarkdownRenderer content={state.streamingContent} />
                  <StreamingCursor />
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

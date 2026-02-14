"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Send, Square } from "lucide-react";

export function ChatInput() {
  const { state, actions } = useStore();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend =
    input.trim().length > 0 &&
    !state.isStreaming &&
    state.connectionStatus === "connected";

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || state.isStreaming) return;

    // Create conversation if none active
    let convId = state.activeConversationId;
    if (!convId) {
      convId = await actions.newConversation();
    }

    setInput("");
    await actions.sendMessage(text, convId);
  }, [input, state.isStreaming, state.activeConversationId, actions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state.connectionStatus !== "connected"
                ? "Connect to a gateway first..."
                : state.activeConversationId
                  ? "Type a message..."
                  : "Start a new conversation..."
            }
            disabled={state.connectionStatus !== "connected"}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 max-h-[200px]"
          />
          {state.isStreaming ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.abortStreaming()}
              className="h-8 w-8 shrink-0 text-red-400 hover:text-red-300"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              className="h-8 w-8 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

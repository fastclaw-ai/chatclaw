"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquarePlus,
  Search,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({ onSelectConversation }: { onSelectConversation?: () => void }) {
  const { state, actions } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? state.conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : state.conversations;

  const handleNew = async () => {
    await actions.newConversation();
    onSelectConversation?.();
  };

  const handleSelect = async (id: string) => {
    await actions.selectConversation(id);
    onSelectConversation?.();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await actions.deleteConversation(id);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold tracking-tight">ChatClaw</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNew}
          className="h-8 w-8"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-sidebar-accent border-0"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1 px-2 pt-2">
        <div className="space-y-0.5 pb-4">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {searchQuery ? "No matching chats" : "No conversations yet"}
            </p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  state.activeConversationId === conv.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                <span className="flex-1 truncate">{conv.title}</span>
                <span
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-400"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus, Trash2, PanelRightOpen, PanelRightClose, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ConversationPanel() {
  const { state, actions } = useStore();
  const [collapsed, setCollapsed] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const target = state.activeChatTarget;
  if (!target) return null;

  const conversations = state.conversations.filter(
    c => c.targetType === target.type && c.targetId === target.id
  );

  // Check if any agent is currently streaming for this target
  const isStreaming = Object.values(state.streamingStates).some(
    s => s.isStreaming && s.targetType === target.type && s.targetId === target.id
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center border-l bg-muted/30 py-3 px-1.5 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Show conversations"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <span className="text-[10px] text-muted-foreground writing-mode-vertical">
          {conversations.length} chats
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[280px] border-l bg-muted/30 shrink-0">
      {/* Header */}
      <div className="flex h-12 items-center gap-2 px-3 border-b shrink-0">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">Conversations</span>
        <button
          onClick={() => actions.createConversation(target.type, target.id)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Collapse panel"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            No conversations yet.<br />Send a message to start.
          </p>
        ) : (
          conversations.map(conv => {
            const isActive = state.activeConversationId === conv.id;
            const isEditing = editingId === conv.id;
            const time = new Date(conv.updatedAt).toLocaleDateString([], {
              month: "short", day: "numeric",
            });

            return (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-1.5 mx-1 px-2 py-1.5 rounded-md cursor-pointer text-sm",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
                onClick={() => !isEditing && actions.selectConversation(conv.id)}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="h-6 text-xs px-1"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          actions.renameConversation(conv.id, editTitle);
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); actions.renameConversation(conv.id, editTitle); setEditingId(null); }}
                      className="p-0.5 text-green-500"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingId(null); }}
                      className="p-0.5 text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="truncate flex-1">{conv.title}</span>
                    {state.unreadConversations[conv.id] && !isActive && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0 hidden group-hover:hidden">
                      {time}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title); }}
                        className="p-0.5 rounded hover:bg-muted"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isStreaming) actions.deleteConversation(conv.id); }}
                        className={cn(
                          "p-0.5 rounded hover:bg-muted",
                          isStreaming && isActive ? "text-muted-foreground/30 cursor-not-allowed" : "text-destructive"
                        )}
                        title={isStreaming && isActive ? "Cannot delete while streaming" : "Delete"}
                        disabled={isStreaming && isActive}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { SettingsDialog } from "@/components/settings-dialog";
import { useStore } from "@/lib/store";
import { Separator } from "@/components/ui/separator";

export function ChatLayout() {
  const { state } = useStore();

  const title =
    state.activeConversationId
      ? state.conversations.find((c) => c.id === state.activeConversationId)
          ?.title ?? "Chat"
      : state.agentIdentity?.name ?? "ChatClaw";

  return (
    <SidebarProvider className="!min-h-0 h-dvh">
      <AppSidebar />
      <SidebarInset className="min-h-0">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <h1 className="flex-1 truncate text-sm font-medium">{title}</h1>
          <div className="flex items-center gap-2">
            <ConnectionIndicator />
            <SettingsDialog />
          </div>
        </header>

        {/* Messages */}
        <ChatMessages />

        {/* Input */}
        <ChatInput />
      </SidebarInset>
    </SidebarProvider>
  );
}

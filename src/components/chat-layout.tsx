"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { SettingsDialog } from "@/components/settings-dialog";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu, Moon, Sun } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ChatLayout() {
  const { state, actions } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 lg:w-72 border-r border-border shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile sidebar sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onSelectConversation={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border px-4 h-12 shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <span className="text-sm font-semibold">
                {state.agentIdentity?.name ?? "ChatClaw"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <ConnectionIndicator />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => actions.toggleTheme()}
                className="h-8 w-8"
              >
                {state.settings?.theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              <SettingsDialog />
            </div>
          </header>

          {/* Messages */}
          <ChatMessages />

          {/* Input */}
          <ChatInput />
        </div>
      </div>
    </TooltipProvider>
  );
}

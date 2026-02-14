"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  Moon,
  Sun,
  Zap,
  MoreHorizontal,
  Search,
} from "lucide-react";

export function AppSidebar() {
  const { state, actions } = useStore();
  const { setOpenMobile, isMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? state.conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : state.conversations;

  const handleNew = async () => {
    await actions.newConversation();
    if (isMobile) setOpenMobile(false);
  };

  const handleSelect = async (id: string) => {
    await actions.selectConversation(id);
    if (isMobile) setOpenMobile(false);
  };

  const handleDelete = async (id: string) => {
    await actions.deleteConversation(id);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header: Brand + New Chat */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">ChatClaw</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  OpenClaw Client
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Search */}
      <div className="px-2 pt-1 group-data-[collapsible=icon]:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
          <SidebarInput
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Conversations */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupAction title="New Chat" onClick={handleNew}>
            <MessageSquarePlus className="size-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-sidebar-foreground/50">
                  {searchQuery ? "No matching chats" : "No conversations yet"}
                </p>
              ) : (
                filtered.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      isActive={state.activeConversationId === conv.id}
                      onClick={() => handleSelect(conv.id)}
                      tooltip={conv.title}
                    >
                      <MessageSquare className="size-4" />
                      <span>{conv.title}</span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontal className="size-4" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(conv.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Theme toggle */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => actions.toggleTheme()}
              tooltip="Toggle theme"
            >
              {state.settings?.theme === "light" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
              <span>
                {state.settings?.theme === "light" ? "Dark mode" : "Light mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

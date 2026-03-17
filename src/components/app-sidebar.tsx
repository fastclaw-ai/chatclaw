"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Users, Plus, Settings, RefreshCw, ChevronsUpDown, Check, Trash2,
  ChevronDown, Sun, Moon, LogOut, MessageCircle,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAgentAvatarUrl } from "@/lib/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuAction, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCompanyDialog } from "@/components/dialogs/create-company-dialog";
import { CreateAgentDialog } from "@/components/dialogs/create-agent-dialog";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import { AgentSettingsDialog } from "@/components/dialogs/agent-settings-dialog";
import { GatewaySettingsDialog } from "@/components/dialogs/gateway-settings-dialog";
import { TeamSettingsDialog } from "@/components/dialogs/team-settings-dialog";
import type { Agent, AgentTeam } from "@/types";

export function AppSidebar() {
  const { data: session } = useSession();
  const { state, actions } = useStore();
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingTeam, setEditingTeam] = useState<AgentTeam | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("chatclaw-theme") as "light" | "dark" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("chatclaw-theme", next);
  };

  const activeCompany = state.companies.find((c) => c.id === state.activeCompanyId);
  const companyAgents = state.agents.filter((a) => a.companyId === state.activeCompanyId);
  const companyTeams = state.teams.filter((t) => t.companyId === state.activeCompanyId);
  const isConnected = state.connectionStatus === "connected";

  return (
    <Sidebar>
      {/* Company Switcher Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                    {activeCompany?.logo || activeCompany?.name?.slice(0, 2).toUpperCase() || "CC"}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
                    <span className="font-semibold truncate">
                      {activeCompany?.name || "Select Company"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                {state.companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => actions.selectCompany(company.id)}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold mr-2">
                      {company.logo || company.name.slice(0, 2).toUpperCase()}
                    </div>
                    {company.name}
                    {company.id === state.activeCompanyId && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCreateCompany(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Agents Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Agents
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <SidebarGroupAction
              title="Sync agents"
              onClick={() => {
                setSyncing(true);
                actions.syncAgents().finally(() => setSyncing(false));
              }}
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            </SidebarGroupAction>
            <CollapsibleContent>
              <SidebarMenu>
                {companyAgents.map((agent) => {
                  const identity = state.agentIdentities[agent.id];
                  const isActive = state.activeChatTarget?.type === "agent" && state.activeChatTarget?.id === agent.id;
                  const agentConversations = isActive
                    ? state.conversations.filter(c => c.targetType === "agent" && c.targetId === agent.id)
                    : [];

                  return (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => actions.selectChatTarget({ type: "agent", id: agent.id })}
                      >
                        <img
                          src={getAgentAvatarUrl(agent.id)}
                          alt={agent.name}
                          className="h-5 w-5 rounded-full"
                        />
                        <span>{identity?.name || agent.name}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        onClick={() => setEditingAgent(agent)}
                        title="Agent settings"
                      >
                        <Settings className="h-4 w-4" />
                      </SidebarMenuAction>
                      {isActive && agentConversations.length > 0 && (
                        <SidebarMenuSub>
                          {agentConversations.map(conv => (
                            <SidebarMenuSubItem key={conv.id}>
                              <SidebarMenuSubButton
                                isActive={state.activeConversationId === conv.id}
                                onClick={() => actions.selectConversation(conv.id)}
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span className="truncate">{conv.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowCreateAgent(true)} className="text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    <span>Add Agent</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Teams Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Teams
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarMenu>
                {companyTeams.map((team) => {
                  const isActive = state.activeChatTarget?.type === "team" && state.activeChatTarget?.id === team.id;
                  const teamConversations = isActive
                    ? state.conversations.filter(c => c.targetType === "team" && c.targetId === team.id)
                    : [];
                  return (
                    <SidebarMenuItem key={team.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => actions.selectChatTarget({ type: "team", id: team.id })}
                      >
                        <Users className="h-4 w-4" />
                        <span>{team.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{team.agentIds.length}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        onClick={() => setEditingTeam(team)}
                        title="Team settings"
                      >
                        <Settings className="h-4 w-4" />
                      </SidebarMenuAction>
                      {isActive && teamConversations.length > 0 && (
                        <SidebarMenuSub>
                          {teamConversations.map(conv => (
                            <SidebarMenuSubItem key={conv.id}>
                              <SidebarMenuSubButton
                                isActive={state.activeConversationId === conv.id}
                                onClick={() => actions.selectConversation(conv.id)}
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span className="truncate">{conv.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowCreateTeam(true)} className="text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    <span>Add Team</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* Footer: Settings */}
      <SidebarFooter>
        <SidebarMenu>
          {session?.user && (
            <SidebarMenuItem>
              <SidebarMenuButton className="cursor-default">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="truncate">{session.user.name || session.user.email}</span>
              </SidebarMenuButton>
              <SidebarMenuAction onClick={() => signOut()} title="Sign out">
                <LogOut className="h-4 w-4" />
              </SidebarMenuAction>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
              <span className={cn(
                "ml-auto h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Dialogs */}
      <CreateCompanyDialog open={showCreateCompany} onOpenChange={setShowCreateCompany} />
      <CreateAgentDialog open={showCreateAgent} onOpenChange={setShowCreateAgent} />
      <CreateTeamDialog open={showCreateTeam} onOpenChange={setShowCreateTeam} />
      <GatewaySettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      {editingAgent && (
        <AgentSettingsDialog
          agent={editingAgent}
          open={!!editingAgent}
          onOpenChange={(open) => !open && setEditingAgent(null)}
        />
      )}
      {editingTeam && (
        <TeamSettingsDialog
          team={editingTeam}
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
        />
      )}
    </Sidebar>
  );
}

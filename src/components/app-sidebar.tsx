"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Users, Plus, Settings, RefreshCw, ChevronsUpDown, Check, Trash2,
  ChevronDown, Sun, Moon, LogOut,
} from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppConfig } from "@/hooks/use-app-config";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAgentAvatarUrl } from "@/lib/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuAction,
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

// multiCompany is now read from runtime config via useAppConfig()

function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

function CompanyLogo({ logo, name, size = "sm" }: { logo?: string; name?: string; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-8 w-8 text-sm" : "h-6 w-6 text-xs";
  const fallback = name?.slice(0, 2).toUpperCase() || "CC";

  return (
    <div className={`flex items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold overflow-hidden ${sizeClass}`}>
      {logo && isImageData(logo) ? (
        <img src={logo} alt="" className="h-full w-full object-cover" />
      ) : logo ? (
        <span>{logo}</span>
      ) : (
        fallback
      )}
    </div>
  );
}

export function AppSidebar() {
  const { session, signOut } = useAuthSession();
  const { multiCompany } = useAppConfig();
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

  // Auto-open create company dialog when no companies exist (after data loaded)
  useEffect(() => {
    if (state.initialized && state.companies.length === 0) {
      setShowCreateCompany(true);
    }
  }, [state.initialized, state.companies.length]);

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
            {multiCompany ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <CompanyLogo logo={activeCompany?.logo} name={activeCompany?.name} size="md" />
                    <span className="font-semibold truncate flex-1 min-w-0">
                      {activeCompany?.name || "Select Company"}
                    </span>
                    <ChevronsUpDown className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                  {state.companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => actions.selectCompany(company.id)}
                    >
                      <CompanyLogo logo={company.logo} name={company.name} />
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
            ) : (
              <SidebarMenuButton size="lg" className="cursor-default">
                <CompanyLogo logo={activeCompany?.logo} name={activeCompany?.name} size="md" />
                <span className="font-semibold truncate flex-1 min-w-0">
                  {activeCompany?.name || "ChatClaw"}
                </span>
              </SidebarMenuButton>
            )}
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
            {activeCompany?.runtimeType === "openclaw" && (
              <SidebarGroupAction
                title="Sync agents"
                onClick={() => {
                  setSyncing(true);
                  actions.syncAgents().finally(() => setSyncing(false));
                }}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              </SidebarGroupAction>
            )}
            <CollapsibleContent>
              <SidebarMenu>
                {companyAgents.map((agent) => {
                  const identity = state.agentIdentities[agent.id];
                  const isActive = state.activeChatTarget?.type === "agent" && state.activeChatTarget?.id === agent.id;

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
      <CreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={(open) => {
          // Prevent closing if no companies exist
          if (!open && state.companies.length === 0) return;
          setShowCreateCompany(open);
        }}
        required={state.companies.length === 0}
      />
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

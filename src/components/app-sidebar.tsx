"use client";

import React, { useState, useEffect } from "react";
import {
  Users, Plus, Settings, ChevronsUpDown, Check,
  ChevronDown,
} from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppConfig } from "@/hooks/use-app-config";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAgentAvatarUrl, isEmojiAvatar } from "@/lib/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuAction, useSidebar,
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
import { UserProfileDialog, loadUserProfile, loadThemeMode, applyTheme } from "@/components/dialogs/user-profile-dialog";
import type { UserProfile } from "@/components/dialogs/user-profile-dialog";
import type { Agent, AgentTeam } from "@/types";

// multiCompany is now read from runtime config via useAppConfig()

function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

function CompanyLogo({ logo, name, size = "sm" }: { logo?: string; name?: string; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-8 w-8 text-base" : "h-6 w-6 text-xs";
  const fallback = name?.slice(0, 2).toUpperCase() || "CC";

  return (
    <div className={`flex items-center justify-center rounded-lg font-semibold overflow-hidden ${sizeClass}`}>
      {logo && isImageData(logo) ? (
        <img src={logo} alt="" className="h-full w-full object-cover" />
      ) : logo ? (
        <span>{logo}</span>
      ) : (
        <div className={`flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold ${sizeClass}`}>
          {fallback}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { session } = useAuthSession();
  const { multiCompany } = useAppConfig();
  const { state, actions } = useStore();
  const { isMobile, setOpenMobile } = useSidebar();
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingTeam, setEditingTeam] = useState<AgentTeam | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "", avatar: "" });

  useEffect(() => {
    applyTheme(loadThemeMode());
    setUserProfile(loadUserProfile());
  }, []);

  // Auto-open create company dialog when no companies exist (after data loaded)
  useEffect(() => {
    if (state.initialized && state.companies.length === 0) {
      setShowCreateCompany(true);
    }
  }, [state.initialized, state.companies.length]);

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
                  {state.companies.map((company) => {
                    const isActive = company.id === state.activeCompanyId;
                    return (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => actions.selectCompany(company.id)}
                        className="flex items-center"
                      >
                        <CompanyLogo logo={company.logo} name={company.name} />
                        <span className="flex-1 truncate">{company.name}</span>
                        {isActive && <Check className="h-4 w-4 shrink-0" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.selectCompany(company.id);
                            setShowSettings(true);
                          }}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                          title="Settings"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                      </DropdownMenuItem>
                    );
                  })}
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
            <SidebarMenuAction
              showOnHover
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="!top-1/2 !-translate-y-1/2"
            >
              <div className="relative">
                <Settings className="h-4 w-4" />
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )} />
              </div>
            </SidebarMenuAction>
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
            <CollapsibleContent>
              <SidebarMenu>
                {companyAgents.map((agent) => {
                  const identity = state.agentIdentities[agent.id];
                  const isActive = state.activeChatTarget?.type === "agent" && state.activeChatTarget?.id === agent.id;

                  return (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => {
                          actions.selectChatTarget({ type: "agent", id: agent.id });
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        {isEmojiAvatar(agent.avatar) ? (
                          <span className="h-5 w-5 flex items-center justify-center text-sm">{agent.avatar}</span>
                        ) : (
                          <img
                            src={agent.avatar || getAgentAvatarUrl(agent.id)}
                            alt={agent.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        )}
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
                        onClick={() => {
                          actions.selectChatTarget({ type: "team", id: team.id });
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        {isEmojiAvatar(team.avatar) ? (
                          <span className="h-4 w-4 flex items-center justify-center text-sm">{team.avatar}</span>
                        ) : team.avatar && (team.avatar.startsWith("data:") || team.avatar.startsWith("http")) ? (
                          <img src={team.avatar} alt={team.name} className="h-5 w-5 rounded object-cover" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
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

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => setShowUserProfile(true)} className="cursor-pointer">
              {userProfile.avatar && isImageData(userProfile.avatar) ? (
                <img src={userProfile.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : userProfile.avatar ? (
                <span className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-base">{userProfile.avatar}</span>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {(userProfile.name || session?.user?.name || session?.user?.email || "U")[0]?.toUpperCase()}
                </div>
              )}
              <span className="font-semibold truncate flex-1 min-w-0">{userProfile.name || session?.user?.name || session?.user?.email || "User"}</span>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              onClick={() => setShowUserProfile(true)}
              title="User settings"
              className="!top-1/2 !-translate-y-1/2"
            >
              <Settings className="h-4 w-4" />
            </SidebarMenuAction>
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
      <UserProfileDialog
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
        onSave={(profile) => setUserProfile(profile)}
      />
    </Sidebar>
  );
}

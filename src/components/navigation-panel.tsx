"use client";

import React, { useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Users,
  Bot,
  Settings,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CreateAgentDialog } from "@/components/dialogs/create-agent-dialog";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import { AgentSettingsDialog } from "@/components/dialogs/agent-settings-dialog";
import type { Agent } from "@/types";

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full border-2 border-discord-mid",
        connected ? "bg-discord-green" : "bg-discord-muted"
      )}
    />
  );
}

export function NavigationPanel() {
  const { state, actions } = useStore();
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const activeCompany = state.companies.find((c) => c.id === state.activeCompanyId);
  const companyAgents = state.agents.filter((a) => a.companyId === state.activeCompanyId);
  const companyTeams = state.teams.filter((t) => t.companyId === state.activeCompanyId);
  const isConnected = state.connectionStatus === "connected";

  if (!activeCompany) {
    return (
      <div className="flex h-full w-60 flex-col bg-discord-mid items-center justify-center text-discord-muted text-sm">
        Select or create a company
      </div>
    );
  }

  return (
    <div className="flex h-full w-60 flex-col bg-discord-mid">
      {/* Company name header */}
      <div className="flex h-12 items-center px-4 shadow-[0_1px_0_0_rgba(0,0,0,0.2)] font-semibold text-[15px] text-sidebar-primary truncate">
        {activeCompany.name}
        <div className="ml-auto">
          <ConnectionDot connected={isConnected} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Teams section (group chats) */}
        <div>
          <button
            onClick={() => setTeamsOpen(!teamsOpen)}
            className="flex w-full items-center gap-0.5 px-1 text-[11px] font-bold uppercase tracking-wider text-discord-muted hover:text-sidebar-primary"
          >
            {teamsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Teams
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateTeam(true);
              }}
              className="ml-auto text-discord-muted hover:text-sidebar-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </button>

          {teamsOpen && (
            <div className="mt-1 space-y-0.5">
              {companyTeams.map((team) => {
                const isActive = state.activeChatTarget?.type === "team" && state.activeChatTarget?.id === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => actions.selectChatTarget({ type: "team", id: team.id })}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[15px] group",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-discord-muted hover:bg-accent/50 hover:text-sidebar-primary"
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="truncate">{team.name}</span>
                    <span className="ml-auto text-[11px] text-discord-muted">
                      {team.agentIds.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.deleteTeam(team.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-discord-muted hover:text-discord-red transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })}
              {companyTeams.length === 0 && (
                <p className="px-2 py-1 text-[12px] text-discord-muted italic">
                  No teams yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Agents section (DMs) */}
        <div>
          <button
            onClick={() => setAgentsOpen(!agentsOpen)}
            className="flex w-full items-center gap-0.5 px-1 text-[11px] font-bold uppercase tracking-wider text-discord-muted hover:text-sidebar-primary"
          >
            {agentsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Agents
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateAgent(true);
              }}
              className="ml-auto text-discord-muted hover:text-sidebar-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </button>

          {agentsOpen && (
            <div className="mt-1 space-y-0.5">
              {companyAgents.map((agent) => {
                const identity = state.agentIdentities[agent.id];
                const isActive = state.activeChatTarget?.type === "agent" && state.activeChatTarget?.id === agent.id;

                return (
                  <button
                    key={agent.id}
                    onClick={() => actions.selectChatTarget({ type: "agent", id: agent.id })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-[15px] group",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-discord-muted hover:bg-accent/50"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-discord-blurple text-white text-xs font-semibold">
                        {identity?.emoji || agent.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <ConnectionDot connected={isConnected} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm text-sidebar-primary">
                        {identity?.name || agent.name}
                      </div>
                      <div className="truncate text-[11px] text-discord-muted">
                        {agent.specialty}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAgent(agent);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-discord-muted hover:text-sidebar-primary transition-opacity"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })}
              {companyAgents.length === 0 && (
                <p className="px-2 py-1 text-[12px] text-discord-muted italic">
                  No agents yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateAgentDialog open={showCreateAgent} onOpenChange={setShowCreateAgent} />
      <CreateTeamDialog open={showCreateTeam} onOpenChange={setShowCreateTeam} />
      {editingAgent && (
        <AgentSettingsDialog
          agent={editingAgent}
          open={!!editingAgent}
          onOpenChange={(open) => !open && setEditingAgent(null)}
        />
      )}
    </div>
  );
}

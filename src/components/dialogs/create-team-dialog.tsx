"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { Check } from "lucide-react";

export function CreateTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, actions } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const companyAgents = state.agents.filter((a) => a.companyId === state.activeCompanyId);

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !state.activeCompanyId || selectedAgentIds.length === 0) return;
    await actions.createTeam({
      companyId: state.activeCompanyId,
      name: name.trim(),
      description: description.trim() || undefined,
      agentIds: selectedAgentIds,
    });
    setName("");
    setDescription("");
    setSelectedAgentIds([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-discord-mid border-none text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Team</DialogTitle>
          <p className="text-sm text-discord-muted">
            Create a group chat with multiple agents.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">Team Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dev Team"
              className="mt-2 bg-discord-dark border-none text-foreground placeholder:text-discord-muted"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this team do?"
              className="mt-2 bg-discord-dark border-none text-foreground placeholder:text-discord-muted"
            />
          </div>
          {companyAgents.length > 0 ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">
                Members ({selectedAgentIds.length} selected)
              </label>
              <div className="mt-2 space-y-1">
                {companyAgents.map((agent) => {
                  const selected = selectedAgentIds.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`flex w-full items-center gap-2 rounded-md p-2 transition-colors ${
                        selected
                          ? "bg-discord-blurple/20 text-foreground"
                          : "hover:bg-accent/50 text-discord-muted"
                      }`}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord-blurple text-white text-xs">
                        {agent.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm flex-1 text-left">{agent.name}</span>
                      <span className="text-[11px] text-discord-muted">{agent.specialty}</span>
                      {selected && <Check className="h-4 w-4 text-discord-green" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-discord-muted italic">
              Add agents first before creating a team.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || selectedAgentIds.length === 0}
            className="w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white"
          >
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

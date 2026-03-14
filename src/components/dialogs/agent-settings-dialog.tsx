"use client";

import React, { useState, useEffect } from "react";
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
import { Trash2 } from "lucide-react";
import type { Agent, AgentSpecialty } from "@/types";

const specialties: { value: AgentSpecialty; label: string }[] = [
  { value: "general", label: "General" },
  { value: "coding", label: "Coding" },
  { value: "research", label: "Research" },
  { value: "writing", label: "Writing" },
  { value: "design", label: "Design" },
];

export function AgentSettingsDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actions } = useStore();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [specialty, setSpecialty] = useState<AgentSpecialty>(agent.specialty);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setSpecialty(agent.specialty);
  }, [agent]);

  async function handleSave() {
    await actions.updateAgent(agent.id, {
      name: name.trim(),
      description: description.trim(),
      specialty,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    await actions.deleteAgent(agent.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-discord-mid border-none text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Agent Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-discord-dark border-none text-foreground" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 bg-discord-dark border-none text-foreground" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">Specialty</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {specialties.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpecialty(s.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    specialty === s.value
                      ? "bg-discord-blurple text-white"
                      : "bg-discord-dark text-discord-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-discord-dark">
            <p className="text-xs text-discord-muted">
              Agent ID: <code className="font-mono text-foreground">{agent.id}</code>
            </p>
            <p className="text-xs text-discord-muted mt-1">
              Session key: <code className="font-mono text-foreground">agent:{agent.id}:chatclaw:dm</code>
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="bg-discord-red hover:bg-discord-red/80"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-discord-blurple hover:bg-discord-blurple/80 text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

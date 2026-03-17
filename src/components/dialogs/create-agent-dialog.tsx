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
import { Loader2 } from "lucide-react";
import type { AgentSpecialty } from "@/types";

const specialties: { value: AgentSpecialty; label: string; desc: string }[] = [
  { value: "general", label: "General", desc: "Versatile assistant" },
  { value: "coding", label: "Coding", desc: "Software engineer" },
  { value: "research", label: "Research", desc: "Analyst & researcher" },
  { value: "writing", label: "Writing", desc: "Content creator" },
  { value: "design", label: "Design", desc: "UI/UX designer" },
];

export function CreateAgentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, actions } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState<AgentSpecialty>("general");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !state.activeCompanyId || creating) return;
    setCreating(true);
    try {
      await actions.createAgent({
        companyId: state.activeCompanyId,
        name: name.trim(),
        description: description.trim(),
        specialty,
      });
      setName("");
      setDescription("");
      setSpecialty("general");
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Agent</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create an AI agent. This will set up its OpenClaw workspace.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Agent Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Agent"
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Specialty
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {specialties.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpecialty(s.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    specialty === s.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full"
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

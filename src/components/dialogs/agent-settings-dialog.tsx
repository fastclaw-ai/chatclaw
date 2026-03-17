"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import {
  User,
  Sparkles,
  Puzzle,
  Wrench,
  Trash2,
  ChevronRight,
  Settings,
  IdCard,
  FileText,
  UserCircle,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { getAgentAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { Agent, AgentSpecialty } from "@/types";

const specialties: { value: AgentSpecialty; label: string }[] = [
  { value: "general", label: "General" },
  { value: "coding", label: "Coding" },
  { value: "research", label: "Research" },
  { value: "writing", label: "Writing" },
  { value: "design", label: "Design" },
];

type Section =
  | "general"
  | "soul"
  | "identity"
  | "instructions"
  | "skills"
  | "user"
  | "tools"
  | "heartbeat"
  | "advanced";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: User },
  { id: "soul", label: "Soul & Persona", icon: Sparkles },
  { id: "identity", label: "Identity", icon: IdCard },
  { id: "instructions", label: "Instructions", icon: FileText },
  { id: "skills", label: "Skills", icon: Puzzle },
  { id: "user", label: "User Profile", icon: UserCircle },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "heartbeat", label: "Heartbeat", icon: HeartPulse },
  { id: "advanced", label: "Advanced", icon: Settings },
];

interface SkillInfo {
  name: string;
  scope: string;
  description: string;
}

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
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [workspaceFiles, setWorkspaceFiles] = useState<Record<string, string>>(
    {}
  );
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setSpecialty(agent.specialty);
    setActiveSection("general");
  }, [agent]);

  useEffect(() => {
    if (!open) return;
    setLoadingWorkspace(true);

    fetch(`/api/workspace?agentId=${agent.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.files) setWorkspaceFiles(data.files);
      })
      .catch(() => {})
      .finally(() => setLoadingWorkspace(false));

    fetch(`/api/skills?agentId=${agent.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.skills) setSkills(data.skills);
      })
      .catch(() => {});
  }, [agent.id, open]);

  function updateWorkspaceFile(filename: string, content: string) {
    setWorkspaceFiles((prev) => ({ ...prev, [filename]: content }));
  }

  async function handleSave() {
    await actions.updateAgent(agent.id, {
      name: name.trim(),
      description: description.trim(),
      specialty,
    });

    // Save modified workspace files
    for (const [filename, content] of Object.entries(workspaceFiles)) {
      await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, file: filename, content }),
      });
    }

    onOpenChange(false);
  }

  async function handleDelete() {
    await actions.deleteAgent(agent.id);
    onOpenChange(false);
  }

  const sectionLabel =
    sections.find((s) => s.id === activeSection)?.label ?? "General";

  function renderWorkspaceEditor(
    filename: string,
    label: string,
    desc: string
  ) {
    return (
      <div className="space-y-4">
        <div>
          <Label>{label}</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">{desc}</p>
          {loadingWorkspace ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <Textarea
              value={workspaceFiles[filename] || ""}
              onChange={(e) => updateWorkspaceFile(filename, e.target.value)}
              className="font-mono text-sm min-h-[300px] resize-none"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex h-[600px]">
          {/* LEFT - Sidebar */}
          <div className="w-[200px] border-r bg-muted/40 flex flex-col">
            {/* Agent avatar + name */}
            <div className="flex items-center gap-3 px-4 py-4">
              <img
                src={getAgentAvatarUrl(agent.id)}
                alt={agent.name}
                className="h-10 w-10 rounded-full bg-muted"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{agent.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.specialty}
                </p>
              </div>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-background text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>

            <Separator />

            {/* Delete button */}
            <div className="p-2">
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Agent
              </button>
            </div>
          </div>

          {/* RIGHT - Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb header */}
            <div className="flex items-center gap-1.5 px-6 py-4 text-sm text-muted-foreground border-b">
              <span>Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">
                {sectionLabel}
              </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeSection === "general" && (
                <div className="space-y-5">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Specialty</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {specialties.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setSpecialty(s.value)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors",
                            specialty === s.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Agent ID</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                      {agent.id}
                    </code>
                  </div>
                </div>
              )}

              {activeSection === "soul" &&
                renderWorkspaceEditor(
                  "SOUL.md",
                  "SOUL.md",
                  "Define this agent's personality, tone, and behavior."
                )}

              {activeSection === "identity" &&
                renderWorkspaceEditor(
                  "IDENTITY.md",
                  "IDENTITY.md",
                  "Agent name, ID, specialty, and role description."
                )}

              {activeSection === "instructions" &&
                renderWorkspaceEditor(
                  "AGENTS.md",
                  "AGENTS.md",
                  "Coding guidelines, instructions, and agent-specific rules."
                )}

              {activeSection === "user" &&
                renderWorkspaceEditor(
                  "USER.md",
                  "USER.md",
                  "Information about the human user interacting with this agent."
                )}

              {activeSection === "tools" &&
                renderWorkspaceEditor(
                  "TOOLS.md",
                  "TOOLS.md",
                  "Tool configuration and usage notes for this agent."
                )}

              {activeSection === "heartbeat" &&
                renderWorkspaceEditor(
                  "HEARTBEAT.md",
                  "HEARTBEAT.md",
                  "Periodic task definitions that run on a schedule."
                )}

              {activeSection === "skills" && (
                <div className="space-y-4">
                  <div>
                    <Label>Agent Skills</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Skills specific to this agent.
                    </p>
                    {skills.filter((s) => s.scope === "agent").length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No agent-specific skills installed.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {skills
                          .filter((s) => s.scope === "agent")
                          .map((skill) => (
                            <div
                              key={skill.name}
                              className="flex items-center gap-3 rounded-lg border p-3"
                            >
                              <Puzzle className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {skill.name}
                                </p>
                                {skill.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {skill.description}
                                  </p>
                                )}
                              </div>
                              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                agent
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <Label>Global Skills</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Skills available to all agents.
                    </p>
                    {skills.filter((s) => s.scope === "global").length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No global skills installed.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {skills
                          .filter((s) => s.scope === "global")
                          .map((skill) => (
                            <div
                              key={skill.name}
                              className="flex items-center gap-3 rounded-lg border p-3"
                            >
                              <Puzzle className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {skill.name}
                                </p>
                                {skill.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {skill.description}
                                  </p>
                                )}
                              </div>
                              <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                global
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "advanced" && (
                <div className="space-y-5">
                  <div>
                    <Label>Agent ID</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                      {agent.id}
                    </code>
                  </div>
                  <div>
                    <Label>Session Key</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                      agent:{agent.id}:chatclaw:dm
                    </code>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Model selection is determined by the gateway
                      configuration.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-destructive">
                      Danger Zone
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete this agent and all associated data.
                      This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="mt-3"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Agent
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import {
  User,
  FileCode,
  Puzzle,
  Trash2,
  ChevronRight,
  Settings,
  Loader2,
  X,
  RefreshCw,
  Save,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAgentAvatarUrl, isEmojiAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

type Section = "general" | "files" | "skills" | "advanced";

const sectionList: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: User },
  { id: "files", label: "Files", icon: FileCode },
  { id: "skills", label: "Skills", icon: Puzzle },
  { id: "advanced", label: "Advanced", icon: Settings },
];

const FILE_TABS = [
  { file: "SOUL.md", label: "Soul", desc: "Personality, tone, and behavior." },
  { file: "IDENTITY.md", label: "Identity", desc: "Agent name, ID, specialty, and role." },
  { file: "AGENTS.md", label: "Instructions", desc: "Guidelines and agent-specific rules." },
  { file: "USER.md", label: "User", desc: "Information about the human user." },
  { file: "TOOLS.md", label: "Tools", desc: "Tool configuration and usage notes." },
  { file: "HEARTBEAT.md", label: "Heartbeat", desc: "Periodic tasks that run on a schedule." },
  { file: "MEMORY.md", label: "Memory", desc: "Persistent context across conversations." },
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
  const { state, actions } = useStore();
  const activeCompany = state.companies.find((c) => c.id === state.activeCompanyId);
  const gwHeaders: Record<string, string> = {
    "x-gateway-url": activeCompany?.gatewayUrl || "",
    "x-gateway-token": activeCompany?.gatewayToken || "",
  };

  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [avatar, setAvatar] = useState(agent.avatar || "");
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [workspaceFiles, setWorkspaceFiles] = useState<Record<string, string>>({});
  const [originalFiles, setOriginalFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState(FILE_TABS[0].file);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setAvatar(agent.avatar || "");
    setActiveSection("general");
    setActiveFile(FILE_TABS[0].file);
  }, [agent]);

  // Load workspace files and skills on open
  useEffect(() => {
    if (!open) return;
    loadFiles();
    fetch(`/api/skills?agentId=${agent.id}`, { headers: gwHeaders })
      .then((r) => r.json())
      .then((data) => { if (data.skills) setSkills(data.skills); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, open]);

  async function loadFiles() {
    setLoadingWorkspace(true);
    setFileError("");
    try {
      const res = await fetch(`/api/workspace?agentId=${agent.id}`, { headers: gwHeaders });
      const data = await res.json();
      if (data.files) {
        setWorkspaceFiles(data.files);
        setOriginalFiles(data.files);
      }
    } catch {
      setFileError("Failed to load files");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  async function handleRefreshFile() {
    setFileError("");
    setLoadingWorkspace(true);
    try {
      const res = await fetch(`/api/workspace?agentId=${agent.id}&file=${activeFile}`, { headers: gwHeaders });
      const data = await res.json();
      setWorkspaceFiles((prev) => ({ ...prev, [activeFile]: data.content || "" }));
      setOriginalFiles((prev) => ({ ...prev, [activeFile]: data.content || "" }));
    } catch {
      setFileError("Failed to refresh file");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  async function handleSaveFile() {
    const content = workspaceFiles[activeFile] ?? "";
    setSavingFile(true);
    setFileError("");
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gwHeaders },
        body: JSON.stringify({ agentId: agent.id, file: activeFile, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFileError(data.error || `Failed to save: ${res.status}`);
      } else {
        setOriginalFiles((prev) => ({ ...prev, [activeFile]: content }));
      }
    } catch (e) {
      setFileError(`Failed to save: ${e}`);
    } finally {
      setSavingFile(false);
    }
  }

  async function autoSaveAgent(updates: Partial<{ name: string; description: string; avatar: string }>) {
    const merged = {
      name: (updates.name ?? name).trim(),
      description: (updates.description ?? description).trim(),
      avatar: (updates.avatar ?? avatar) || undefined,
    };
    if (!merged.name) return;
    await actions.updateAgent(agent.id, merged);
  }

  function handleGeneralBlur() {
    autoSaveAgent({});
  }

  function handleAvatarChange(newAvatar: string) {
    setAvatar(newAvatar);
    autoSaveAgent({ avatar: newAvatar });
  }

  function handleDelete() {
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    await actions.deleteAgent(agent.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  const isDefaultAgent = agent.id === "main";
  const sectionLabel = sectionList.find((s) => s.id === activeSection)?.label ?? "General";
  const currentTab = FILE_TABS.find((t) => t.file === activeFile) || FILE_TABS[0];
  const fileChanged = (workspaceFiles[activeFile] ?? "") !== (originalFiles[activeFile] ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Agent Settings</DialogTitle>
        <div className="flex h-[600px]">
          {/* LEFT - Sidebar */}
          <div className="w-[200px] border-r bg-muted/40 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <div className="shrink-0">
                {isEmojiAvatar(avatar) ? (
                  <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">{avatar}</span>
                ) : (
                  <img
                    src={avatar || getAgentAvatarUrl(agent.id)}
                    alt={agent.name}
                    className="h-8 w-8 rounded-full bg-muted object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{agent.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.description || agent.specialty}
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
              {sectionList.map((section) => {
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

            {!isDefaultAgent && (
              <div className="p-2">
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Agent
                </button>
              </div>
            )}
          </div>

          {/* RIGHT - Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-muted-foreground border-b">
              <span>Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{sectionLabel}</span>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-auto rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className={cn(
              "flex-1 min-h-0",
              activeSection === "files" ? "flex flex-col" : "overflow-y-auto px-6 py-5"
            )}>
              {activeSection === "general" && (
                <div className="space-y-5">
                  <AvatarPicker
                    value={avatar}
                    onChange={handleAvatarChange}
                    shape="circle"
                    seed={agent.id}
                    fallback={
                      <img
                        src={getAgentAvatarUrl(agent.id)}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    }
                  />
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={handleGeneralBlur}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleGeneralBlur}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {activeSection === "files" && (
                <>
                  {/* Horizontal file tabs */}
                  <div className="flex gap-1 overflow-x-auto border-b px-6 pt-3 shrink-0">
                    {FILE_TABS.map((tab) => (
                      <button
                        key={tab.file}
                        onClick={() => { setActiveFile(tab.file); setFileError(""); }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-t-md border-b-2 transition-colors",
                          activeFile === tab.file
                            ? "border-primary text-foreground bg-background"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* File description */}
                  <div className="flex items-center gap-2 px-6 pt-3 shrink-0">
                    <code className="text-xs font-mono text-muted-foreground">{currentTab.file}</code>
                    <span className="text-xs text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground">{currentTab.desc}</span>
                  </div>

                  {/* Editor - fills remaining space */}
                  <div className="flex-1 min-h-0 px-6 py-2">
                    {loadingWorkspace ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm h-full justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <Textarea
                        value={workspaceFiles[activeFile] || ""}
                        onChange={(e) => {
                          setWorkspaceFiles((prev) => ({ ...prev, [activeFile]: e.target.value }));
                          setFileError("");
                        }}
                        className="font-mono text-sm h-full resize-none"
                      />
                    )}
                  </div>

                  {/* Fixed footer */}
                  <div className="flex items-center border-t px-6 py-2 shrink-0">
                    {fileError && (
                      <p className="text-sm text-destructive flex-1 mr-2 truncate">{fileError}</p>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshFile}
                        disabled={loadingWorkspace}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loadingWorkspace && "animate-spin")} />
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveFile}
                        disabled={savingFile || !fileChanged}
                      >
                        {savingFile ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {activeSection === "skills" && (
                <div className="space-y-4">
                  <div>
                    <Label>Agent Skills</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Skills specific to this agent.</p>
                    {skills.filter((s) => s.scope === "agent").length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No agent-specific skills installed.</p>
                    ) : (
                      <div className="space-y-2">
                        {skills.filter((s) => s.scope === "agent").map((skill) => (
                          <div key={skill.name} className="flex items-center gap-3 rounded-lg border p-3">
                            <Puzzle className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{skill.name}</p>
                              {skill.description && <p className="text-xs text-muted-foreground">{skill.description}</p>}
                            </div>
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">agent</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <Label>Global Skills</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Skills available to all agents.</p>
                    {skills.filter((s) => s.scope === "global").length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No global skills installed.</p>
                    ) : (
                      <div className="space-y-2">
                        {skills.filter((s) => s.scope === "global").map((skill) => (
                          <div key={skill.name} className="flex items-center gap-3 rounded-lg border p-3">
                            <Puzzle className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{skill.name}</p>
                              {skill.description && <p className="text-xs text-muted-foreground">{skill.description}</p>}
                            </div>
                            <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">global</span>
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
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">{agent.id}</code>
                  </div>
                  <div>
                    <Label>Workspace</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                      {agent.id === "main" ? "~/.openclaw" : `~/.openclaw/workspace-${agent.id}`}
                    </code>
                  </div>
                  <div>
                    <Label>Session Key</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">agent:{agent.id}:chatclaw:dm</code>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Model selection is determined by the gateway configuration.</p>
                  </div>
                  {!isDefaultAgent && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Permanently delete this agent and all associated data. This action cannot be undone.
                        </p>
                        <Button variant="destructive" onClick={handleDelete} className="mt-3">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Agent
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

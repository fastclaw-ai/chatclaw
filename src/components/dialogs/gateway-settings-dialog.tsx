"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { useAppConfig } from "@/hooks/use-app-config";
import { testConnection } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import {
  Building, Wifi, Wrench, Trash2, ChevronRight,
  Loader2, CheckCircle2, XCircle, WifiOff, Upload, Smile, X,
} from "lucide-react";

type Section = "general" | "gateway" | "advanced";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building },
  { id: "gateway", label: "Gateway", icon: Wifi },
  { id: "advanced", label: "Advanced", icon: Wrench },
];

const MAX_LOGO_SIZE = 128 * 1024; // 128KB max for base64 logo

const EMOJI_GROUPS = [
  ["😀", "😂", "🤣", "😊", "😎", "🤩", "😇", "🥳"],
  ["🚀", "⚡", "🔥", "💡", "⭐", "🌟", "✨", "💫"],
  ["🤖", "👾", "🎮", "🧠", "💻", "🛠️", "🔧", "⚙️"],
  ["🐱", "🐶", "🦊", "🐼", "🦁", "🐯", "🐻", "🐸"],
  ["🏢", "🏠", "🏗️", "🌍", "🎯", "🎨", "📦", "💎"],
];

function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

function handleImageUpload(
  file: File,
  onSuccess: (base64: string) => void,
  onError: (msg: string) => void,
) {
  if (!file.type.startsWith("image/")) {
    onError("Please select an image file");
    return;
  }
  if (file.size > MAX_LOGO_SIZE) {
    onError(`Image must be under ${MAX_LOGO_SIZE / 1024}KB`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Resize to 128x128 max for storage efficiency
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      const base64 = canvas.toDataURL("image/png");
      onSuccess(base64);
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

function normalizeGatewayUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  normalized = normalized.replace(/^wss?:\/\//, "http://");
  if (!normalized.startsWith("http")) normalized = "http://" + normalized;
  normalized = normalized.replace(/\/+$/, "");
  normalized = normalized
    .replace("://127.0.0.1", "://localhost")
    .replace("://0.0.0.0", "://localhost")
    .replace("://[::1]", "://localhost");
  return normalized;
}

export function GatewaySettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, actions } = useStore();
  const { multiCompany } = useAppConfig();
  const company = state.companies.find((c) => c.id === state.activeCompanyId);

  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [logoError, setLogoError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [description, setDescription] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [urlError, setUrlError] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setLogo(company.logo || "");
      setLogoError("");
      setShowEmojiPicker(false);
      setDescription(company.description || "");
      setGatewayUrl(company.gatewayUrl || "");
      setGatewayToken(company.gatewayToken || "");
      setUrlError("");
      setActiveSection("general");
    }
  }, [company]);

  if (!company) return null;

  const isConnected = state.connectionStatus === "connected";

  async function handleTest() {
    if (!gatewayUrl || !gatewayToken) return;
    setTestState("testing");
    setTestError("");
    const result = await testConnection(gatewayUrl, gatewayToken, "openclaw");
    if (result.ok) {
      setTestState("success");
    } else {
      setTestState("error");
      setTestError(result.error || "Connection failed");
    }
  }

  async function handleDetect() {
    try {
      const res = await fetch("/api/detect-gateway");
      const data = await res.json();
      if (data.found) {
        setGatewayUrl(data.url);
        setGatewayToken(data.token);
        setUrlError("");
        setTestState("idle");
      }
    } catch {
      // Failed to detect
    }
  }

  async function handleSave() {
    if (!company || !name.trim()) return;

    // Check for duplicate gateway URL (exclude current company)
    if (gatewayUrl.trim()) {
      const normalized = normalizeGatewayUrl(gatewayUrl);
      const existing = state.companies.find(
        (c) => c.id !== company.id && c.gatewayUrl && normalizeGatewayUrl(c.gatewayUrl) === normalized
      );
      if (existing) {
        setUrlError(`This gateway is already connected as "${existing.name}"`);
        setActiveSection("gateway");
        return;
      }
    }

    await actions.updateCompany(company.id, {
      name: name.trim(),
      logo: logo.trim() || undefined,
      description: description.trim() || undefined,
      gatewayUrl: gatewayUrl.trim(),
      gatewayToken: gatewayToken.trim(),
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!company) return;
    await actions.deleteCompany(company.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  const sectionLabel = sections.find((s) => s.id === activeSection)?.label ?? "General";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Company Settings</DialogTitle>
        <div className="flex h-[550px]">
          {/* LEFT - Sidebar */}
          <div className="w-[200px] border-r bg-muted/40 flex flex-col">
            {/* Company avatar + name */}
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold overflow-hidden">
                {logo && isImageData(logo) ? (
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : logo ? (
                  <span className="text-xl">{logo}</span>
                ) : (
                  name.slice(0, 2).toUpperCase() || company.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{name || company.name}</p>
              </div>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-2 flex-1">
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
            {multiCompany && (
              <div className="p-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Company
                </button>
              </div>
            )}
          </div>

          {/* RIGHT - Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb header */}
            <div className="flex items-center gap-1.5 px-6 py-4 text-sm text-muted-foreground border-b">
              <span>Company Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{sectionLabel}</span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeSection === "general" && (
                <div className="space-y-5">
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="relative group">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground text-2xl font-semibold overflow-hidden border">
                          {logo && isImageData(logo) ? (
                            <img src={logo} alt="" className="h-full w-full object-cover" />
                          ) : logo ? (
                            <span className="text-2xl">{logo}</span>
                          ) : (
                            name.slice(0, 2).toUpperCase() || "CC"
                          )}
                        </div>
                        {logo && (
                          <button
                            type="button"
                            onClick={() => { setLogo(""); setLogoError(""); }}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          >
                            <Smile className="h-4 w-4 mr-1.5" />
                            Emoji
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  handleImageUpload(
                                    file,
                                    (base64) => { setLogo(base64); setLogoError(""); },
                                    (msg) => setLogoError(msg),
                                  );
                                }
                              };
                              input.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-1.5" />
                            Upload
                          </Button>
                        </div>
                        {logoError && (
                          <p className="text-xs text-destructive">{logoError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Pick an emoji or upload an image (max 128KB)
                        </p>
                      </div>
                    </div>
                    {showEmojiPicker && (
                      <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                        <div className="space-y-2">
                          {EMOJI_GROUPS.map((row, i) => (
                            <div key={i} className="flex gap-1">
                              {row.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => { setLogo(emoji); setShowEmojiPicker(false); setLogoError(""); }}
                                  className={cn(
                                    "h-9 w-9 rounded-md text-lg flex items-center justify-center hover:bg-background transition-colors",
                                    logo === emoji && "bg-background ring-2 ring-primary"
                                  )}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Company Name</Label>
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
                </div>
              )}

              {activeSection === "gateway" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Label>Connection Status</Label>
                    <div className="flex items-center gap-1.5 text-xs">
                      {state.connectionStatus === "connected" ? (
                        <><Wifi className="h-3 w-3 text-green-600" /><span className="text-green-600">Connected</span></>
                      ) : state.connectionStatus === "connecting" ? (
                        <><Loader2 className="h-3 w-3 text-yellow-500 animate-spin" /><span className="text-yellow-500">Connecting</span></>
                      ) : (
                        <><WifiOff className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Disconnected</span></>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Gateway URL</Label>
                    <Input
                      value={gatewayUrl}
                      onChange={(e) => { setGatewayUrl(e.target.value); setTestState("idle"); setUrlError(""); }}
                      placeholder="ws://localhost:18789"
                      className="mt-2 font-mono text-sm"
                    />
                    {urlError && (
                      <p className="text-sm text-destructive mt-1">{urlError}</p>
                    )}
                  </div>
                  <div>
                    <Label>Gateway Token</Label>
                    <Input
                      type="password"
                      value={gatewayToken}
                      onChange={(e) => { setGatewayToken(e.target.value); setTestState("idle"); }}
                      placeholder="Your gateway token"
                      className="mt-2 font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={!gatewayUrl || !gatewayToken || testState === "testing"}
                      className="flex-1"
                    >
                      {testState === "testing" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {testState === "success" && <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />}
                      {testState === "error" && <XCircle className="h-4 w-4 mr-2 text-destructive" />}
                      Test Connection
                    </Button>
                    <Button variant="outline" onClick={handleDetect}>
                      Auto-detect
                    </Button>
                  </div>
                  {testError && (
                    <p className="text-sm text-destructive">{testError}</p>
                  )}
                </div>
              )}

              {activeSection === "advanced" && (
                <div className="space-y-5">
                  <div>
                    <Label>Company ID</Label>
                    <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                      {company.id}
                    </code>
                  </div>
                  {multiCompany && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Permanently delete this company and all associated agents, teams, and data. This action cannot be undone.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="mt-3"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Company
                        </Button>
                      </div>
                    </>
                  )}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{company.name}</strong> and all associated agents, teams, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

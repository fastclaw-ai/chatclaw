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
import { testConnection, gatewayRpc } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import {
  Building, Wifi, Wrench, Trash2, ChevronRight, RefreshCw,
  Loader2, CheckCircle2, XCircle, WifiOff, X, FileCode,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";

type Section = "general" | "gateway" | "config" | "advanced";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building },
  { id: "gateway", label: "Gateway", icon: Wifi },
  { id: "config", label: "Config", icon: FileCode },
  { id: "advanced", label: "Advanced", icon: Wrench },
];


function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
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
  const [description, setDescription] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [model, setModel] = useState("");
  const [channels, setChannels] = useState("");
  const [urlError, setUrlError] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [testConfigHint, setTestConfigHint] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [configContent, setConfigContent] = useState("");
  const [configOriginal, setConfigOriginal] = useState("");
  const [configHash, setConfigHash] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState("");

  // Reset form when company ID changes (not on every company data update)
  const companyId = company?.id;
  useEffect(() => {
    if (company) {
      setName(company.name);
      setLogo(company.logo || "");
      setDescription(company.description || "");
      setGatewayUrl(company.gatewayUrl || "");
      setGatewayToken(company.gatewayToken || "");
      setModel(company.model || "");
      setChannels(company.channels || "");
      setUrlError("");
      setActiveSection("general");
      setConfigContent("");
      setConfigOriginal("");
      setConfigError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Load config from gateway when switching to config tab
  useEffect(() => {
    if (activeSection === "config" && !configContent && gatewayUrl) {
      setLoadingConfig(true);
      setConfigError("");
      gatewayRpc(gatewayUrl, gatewayToken, "config.get")
        .then((result) => {
          if (!result.ok) throw new Error(result.error?.message || "Failed");
          setConfigHash((result.payload?.hash as string) || "");
          const raw = result.payload?.raw as string | undefined;
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const formatted = JSON.stringify(parsed, null, 2);
              setConfigContent(formatted);
              setConfigOriginal(formatted);
            } catch {
              setConfigContent(raw);
              setConfigOriginal(raw);
            }
          } else {
            const formatted = JSON.stringify(result.payload, null, 2);
            setConfigContent(formatted);
            setConfigOriginal(formatted);
          }
        })
        .catch((e) => setConfigError(`Failed to load config: ${e.message || e}`))
        .finally(() => setLoadingConfig(false));
    }
  }, [activeSection, configContent, gatewayUrl, gatewayToken]);

  if (!company) return null;

  const isConnected = state.connectionStatus === "connected";

  async function handleTest() {
    if (!gatewayUrl || !gatewayToken) return;
    setTestState("testing");
    setTestError("");
    setTestConfigHint("");
    const result = await testConnection(gatewayUrl, gatewayToken, "openclaw");
    if (result.ok) {
      setTestState("success");
    } else {
      setTestState("error");
      setTestError(result.error || "Connection failed");
      if (result.configHint) setTestConfigHint(result.configHint);
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

  async function autoSaveCompany(updates: Record<string, string | undefined>) {
    if (!company) return;
    const current = {
      name: name.trim(),
      logo: logo.trim() || undefined,
      description: description.trim() || undefined,
      gatewayUrl: gatewayUrl.trim(),
      gatewayToken: gatewayToken.trim(),
      model: model.trim() || undefined,
      channels: channels.trim() || undefined,
    };
    const merged = { ...current, ...updates };
    if (!merged.name) return;
    await actions.updateCompany(company.id, merged);
  }

  function handleGeneralBlur() {
    autoSaveCompany({});
  }

  function handleLogoChange(newLogo: string) {
    setLogo(newLogo);
    autoSaveCompany({ logo: newLogo.trim() || undefined });
  }

  function handleGatewayBlur() {
    // Check for duplicate gateway URL
    if (gatewayUrl.trim() && company) {
      const normalized = normalizeGatewayUrl(gatewayUrl);
      const existing = state.companies.find(
        (c) => c.id !== company.id && c.gatewayUrl && normalizeGatewayUrl(c.gatewayUrl) === normalized
      );
      if (existing) {
        setUrlError(`This gateway is already connected as "${existing.name}"`);
        return;
      }
    }
    autoSaveCompany({});
  }

  async function handleConfigSave() {
    if (!configContent) return;
    // Validate JSON
    let parsed;
    try {
      parsed = JSON.parse(configContent);
    } catch {
      setConfigError("Invalid JSON");
      return;
    }
    setConfigError("");
    setSavingConfig(true);
    try {
      const result = await gatewayRpc(gatewayUrl, gatewayToken, "config.apply", { raw: JSON.stringify(parsed, null, 2), baseHash: configHash });
      if (!result.ok) {
        setConfigError(`Failed to save: ${result.error?.message || "Unknown error"}`);
      } else {
        const formatted = JSON.stringify(parsed, null, 2);
        setConfigContent(formatted);
        setConfigOriginal(formatted);
      }
    } catch (e) {
      setConfigError(`Failed to save: ${e}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleConfigRefresh() {
    if (!gatewayUrl) return;
    setLoadingConfig(true);
    setConfigError("");
    try {
      const result = await gatewayRpc(gatewayUrl, gatewayToken, "config.get");
      if (!result.ok) throw new Error(result.error?.message || "Failed");
      setConfigHash((result.payload?.hash as string) || "");
      const raw = result.payload?.raw as string | undefined;
      let formatted: string;
      if (raw) {
        try { formatted = JSON.stringify(JSON.parse(raw), null, 2); } catch { formatted = raw; }
      } else {
        formatted = JSON.stringify(result.payload, null, 2);
      }
      setConfigContent(formatted);
      setConfigOriginal(formatted);
    } catch (e) {
      setConfigError(`Failed to load config: ${e}`);
    } finally {
      setLoadingConfig(false);
    }
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
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold overflow-hidden">
                {logo && isImageData(logo) ? (
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : logo ? (
                  <span className="text-base">{logo}</span>
                ) : (
                  name.slice(0, 2).toUpperCase() || company.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{name || company.name}</p>
              </div>
            </div>

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
            <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-muted-foreground border-b">
              <span>Company Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{sectionLabel}</span>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-auto rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeSection === "general" && (
                <div className="space-y-5">
                  <AvatarPicker
                    label="Logo"
                    value={logo}
                    onChange={handleLogoChange}
                    shape="rounded"
                    seed={company.id}
                    fallback={<span className="text-sm font-semibold">{name.slice(0, 2).toUpperCase() || "CC"}</span>}
                  />
                  <div>
                    <Label>Company Name</Label>
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
                      onBlur={handleGatewayBlur}
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
                      onBlur={handleGatewayBlur}
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
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">{testError}</p>
                      {testConfigHint && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Add the following to your OpenClaw config:</p>
                          <pre className="text-xs bg-muted rounded-md p-3 font-mono overflow-x-auto select-all">{testConfigHint}</pre>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {activeSection === "config" && (
                <div className="flex flex-col h-full">
                  <div className="mb-2">
                    <Label>openclaw.json</Label>
                  </div>
                  {loadingConfig ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading config from gateway...
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={configContent}
                        onChange={(e) => { setConfigContent(e.target.value); setConfigError(""); }}
                        spellCheck={false}
                        className="flex-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/30 overflow-auto whitespace-pre"
                        style={{ minHeight: 200, resize: "none", tabSize: 2 }}
                      />
                      {configError && (
                        <p className="text-sm text-destructive mt-2">{configError}</p>
                      )}
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="outline"
                          onClick={handleConfigRefresh}
                          disabled={loadingConfig}
                          size="sm"
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-2", loadingConfig && "animate-spin")} />
                          Refresh
                        </Button>
                        <Button
                          onClick={handleConfigSave}
                          disabled={savingConfig || configContent === configOriginal}
                          size="sm"
                        >
                          {savingConfig && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Config
                        </Button>
                      </div>
                    </>
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

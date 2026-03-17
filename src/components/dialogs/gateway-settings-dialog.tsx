"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { testConnection } from "@/lib/gateway";
import { cn } from "@/lib/utils";
import {
  Building, Wifi, Wrench, Trash2, ChevronRight,
  Loader2, CheckCircle2, XCircle, WifiOff,
} from "lucide-react";

type Section = "general" | "gateway" | "advanced";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building },
  { id: "gateway", label: "Gateway", icon: Wifi },
  { id: "advanced", label: "Advanced", icon: Wrench },
];

export function GatewaySettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, actions } = useStore();
  const company = state.companies.find((c) => c.id === state.activeCompanyId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("general");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description || "");
      setGatewayUrl(company.gatewayUrl || "");
      setGatewayToken(company.gatewayToken || "");
      setActiveSection("general");
    }
  }, [company]);

  if (!company) return null;

  const isConnected = state.connectionStatus === "connected";

  async function handleTest() {
    if (!gatewayUrl || !gatewayToken) return;
    setTestState("testing");
    setTestError("");
    const result = await testConnection(gatewayUrl, gatewayToken);
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
        setTestState("idle");
      }
    } catch {
      // Failed to detect
    }
  }

  async function handleSave() {
    if (!company || !name.trim()) return;
    await actions.updateCompany(company.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      gatewayUrl: gatewayUrl.trim(),
      gatewayToken: gatewayToken.trim(),
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!company) return;
    await actions.deleteCompany(company.id);
    onOpenChange(false);
  }

  const sectionLabel = sections.find((s) => s.id === activeSection)?.label ?? "General";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex h-[550px]">
          {/* LEFT - Sidebar */}
          <div className="w-[200px] border-r bg-muted/40 flex flex-col">
            {/* Company avatar + name */}
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {company.logo || company.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {isConnected ? "Connected" : "Disconnected"}
                </p>
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
            <div className="p-2">
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Company
              </button>
            </div>
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
                      onChange={(e) => { setGatewayUrl(e.target.value); setTestState("idle"); }}
                      placeholder="ws://localhost:18789"
                      className="mt-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>API Token</Label>
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
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete this company and all associated agents, teams, and data. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="mt-3"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Company
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

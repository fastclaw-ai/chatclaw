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
import { testConnection } from "@/lib/gateway";
import { Loader2, CheckCircle2, XCircle, Trash2, Wifi, WifiOff } from "lucide-react";

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

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description || "");
      setGatewayUrl(company.gatewayUrl || "");
      setGatewayToken(company.gatewayToken || "");
    }
  }, [company]);

  if (!company) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-discord-mid border-none text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {/* Company info */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">
              Company Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 bg-discord-dark border-none text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 bg-discord-dark border-none text-foreground"
            />
          </div>

          {/* Gateway config */}
          <div className="pt-2 border-t border-discord-dark">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-discord-muted">
                Gateway Connection
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                {state.connectionStatus === "connected" ? (
                  <><Wifi className="h-3 w-3 text-discord-green" /><span className="text-discord-green">Connected</span></>
                ) : state.connectionStatus === "connecting" ? (
                  <><Loader2 className="h-3 w-3 text-discord-yellow animate-spin" /><span className="text-discord-yellow">Connecting</span></>
                ) : (
                  <><WifiOff className="h-3 w-3 text-discord-muted" /><span className="text-discord-muted">Disconnected</span></>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-discord-muted">Gateway URL</label>
                <Input
                  value={gatewayUrl}
                  onChange={(e) => { setGatewayUrl(e.target.value); setTestState("idle"); }}
                  placeholder="ws://localhost:18789"
                  className="mt-1 bg-discord-dark border-none text-foreground font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-discord-muted">API Token</label>
                <Input
                  type="password"
                  value={gatewayToken}
                  onChange={(e) => { setGatewayToken(e.target.value); setTestState("idle"); }}
                  placeholder="Your gateway token"
                  className="mt-1 bg-discord-dark border-none text-foreground font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleTest}
                  disabled={!gatewayUrl || !gatewayToken || testState === "testing"}
                  className="flex-1 bg-discord-dark hover:bg-discord-darker text-foreground"
                >
                  {testState === "testing" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {testState === "success" && <CheckCircle2 className="h-4 w-4 mr-2 text-discord-green" />}
                  {testState === "error" && <XCircle className="h-4 w-4 mr-2 text-discord-red" />}
                  Test
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDetect}
                  className="bg-discord-dark hover:bg-discord-darker text-foreground"
                >
                  Auto-detect
                </Button>
              </div>
              {testError && (
                <p className="text-sm text-discord-red">{testError}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="bg-discord-red hover:bg-discord-red/80"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
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

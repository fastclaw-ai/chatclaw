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
import { testConnection } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

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

export function CreateCompanyDialog({
  open,
  onOpenChange,
  required,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required?: boolean;
}) {
  const { state, actions } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [urlError, setUrlError] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  // Auto-detect gateway on dialog open
  useEffect(() => {
    if (open && !gatewayUrl && !gatewayToken) {
      fetch("/api/detect-gateway")
        .then((res) => res.json())
        .then((data) => {
          if (data.found) {
            setGatewayUrl(data.url);
            setGatewayToken(data.token);
          }
        })
        .catch(() => {});
    }
  }, [open, gatewayUrl, gatewayToken]);

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

  async function handleCreate() {
    if (!name.trim()) return;

    // Check for duplicate gateway URL
    if (gatewayUrl.trim()) {
      const normalized = normalizeGatewayUrl(gatewayUrl);
      const existing = state.companies.find(
        (c) => c.gatewayUrl && normalizeGatewayUrl(c.gatewayUrl) === normalized
      );
      if (existing) {
        setUrlError(`This gateway is already connected as "${existing.name}"`);
        return;
      }
    }

    const company = await actions.createCompany(
      name.trim(),
      gatewayUrl.trim(),
      gatewayToken.trim(),
      description.trim() || undefined,
    );
    await actions.selectCompany(company.id);
    setName("");
    setDescription("");
    setGatewayUrl("");
    setGatewayToken("");
    setUrlError("");
    setTestState("idle");
    setTestError("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", required && "[&>button]:hidden")} onInteractOutside={required ? (e) => e.preventDefault() : undefined} onEscapeKeyDown={required ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Create a Company</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Your company is where you and your AI agents work together.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Company Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Company"
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
              placeholder="What does your company do?"
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gateway URL
            </label>
            <Input
              value={gatewayUrl}
              onChange={(e) => { setGatewayUrl(e.target.value); setUrlError(""); setTestState("idle"); }}
              placeholder="ws://localhost:18789"
              className="mt-2 font-mono text-sm"
            />
            {urlError && (
              <p className="text-sm text-destructive mt-1">{urlError}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gateway Token
            </label>
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
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { testConnection } from "@/lib/gateway";
import { Settings, Loader2, CheckCircle2, XCircle } from "lucide-react";

type TestState = "idle" | "testing" | "success" | "error";

export function SettingsDialog() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    if (state.settingsLoaded && !state.settings?.gatewayUrl) {
      setOpen(true);
    }
  }, [state.settingsLoaded, state.settings?.gatewayUrl]);

  // Fill fields when dialog opens
  useEffect(() => {
    if (open) {
      setUrl(state.settings?.gatewayUrl || state.detectedGatewayUrl || "");
      setToken(state.settings?.token || state.detectedToken || "");
    }
  }, [open, state.settings]);

  // Auto-fill detected values if dialog is already open and fields are empty
  useEffect(() => {
    if (open && !url && state.detectedGatewayUrl) {
      setUrl(state.detectedGatewayUrl);
    }
    if (open && !token && state.detectedToken) {
      setToken(state.detectedToken);
    }
  }, [open, url, token, state.detectedGatewayUrl, state.detectedToken]);

  const handleTest = async () => {
    if (!url || !token) return;
    setTestState("testing");
    setTestError("");
    const result = await testConnection(url, token);
    if (result.ok) {
      setTestState("success");
    } else {
      setTestState("error");
      setTestError(result.error ?? "Unknown error");
    }
  };

  const handleSave = async () => {
    if (!url || !token) return;
    await actions.saveAndConnect(url, token);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-8"
      >
        <Settings className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gateway Settings</DialogTitle>
            <DialogDescription>
              Connect to your OpenClaw Gateway instance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gateway URL</label>
              <Input
                placeholder="ws://localhost:18789"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestState("idle");
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Token</label>
              <Input
                type="password"
                placeholder="Your API token"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setTestState("idle");
                }}
              />
            </div>
            {testState === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <XCircle className="size-4" />
                {testError}
              </div>
            )}
            {testState === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="size-4" />
                Connection successful!
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!url || !token || testState === "testing"}
              >
                {testState === "testing" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Test Connection
              </Button>
              <Button onClick={handleSave} disabled={!url || !token}>
                Save & Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

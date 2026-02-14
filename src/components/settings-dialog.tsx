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

  // Show on first visit when no settings
  useEffect(() => {
    if (state.settingsLoaded && !state.settings?.gatewayUrl) {
      setOpen(true);
    }
  }, [state.settingsLoaded, state.settings?.gatewayUrl]);

  // Sync form when dialog opens
  useEffect(() => {
    if (open && state.settings) {
      setUrl(state.settings.gatewayUrl);
      setToken(state.settings.token);
    }
  }, [open, state.settings]);

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
        className="h-8 w-8"
      >
        <Settings className="h-4 w-4" />
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
                placeholder="ws://localhost:9099"
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
                <XCircle className="h-4 w-4" />
                {testError}
              </div>
            )}
            {testState === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

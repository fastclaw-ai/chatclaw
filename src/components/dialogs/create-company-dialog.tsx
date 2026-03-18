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
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { RuntimeType } from "@/types";

const runtimeOptions: { value: RuntimeType; label: string; description: string }[] = [
  { value: "openclaw", label: "OpenClaw", description: "Full OpenClaw integration" },
  { value: "openai", label: "OpenAI Compatible", description: "OpenRouter, LiteLLM, vLLM, etc." },
  { value: "custom", label: "Custom", description: "Custom endpoint" },
];

export function CreateCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actions } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [runtimeType, setRuntimeType] = useState<RuntimeType>("openclaw");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [model, setModel] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");

  // Auto-detect gateway on dialog open (only for openclaw)
  useEffect(() => {
    if (open && runtimeType === "openclaw" && !gatewayUrl && !gatewayToken) {
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
  }, [open, runtimeType, gatewayUrl, gatewayToken]);

  async function handleCreate() {
    if (!name.trim()) return;
    const company = await actions.createCompany(
      name.trim(),
      gatewayUrl.trim(),
      gatewayToken.trim(),
      description.trim() || undefined,
      {
        runtimeType,
        model: model.trim() || undefined,
        customHeaders: customHeaders.trim() || undefined,
      }
    );
    await actions.selectCompany(company.id);
    setName("");
    setDescription("");
    setRuntimeType("openclaw");
    setGatewayUrl("");
    setGatewayToken("");
    setModel("");
    setCustomHeaders("");
    onOpenChange(false);
  }

  const urlLabel = runtimeType === "openclaw" ? "Gateway URL" : "API Base URL";
  const urlPlaceholder = runtimeType === "openclaw" ? "ws://localhost:18789" : "https://api.openai.com/v1";
  const tokenLabel = runtimeType === "openclaw" ? "Gateway Token" : "API Key";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {/* Runtime Type Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Runtime Type
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {runtimeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRuntimeType(opt.value)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors",
                    runtimeType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-xs font-medium">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {urlLabel}
            </label>
            <Input
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder={urlPlaceholder}
              className="mt-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tokenLabel}
            </label>
            <Input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder={runtimeType === "openclaw" ? "Your gateway token" : "sk-..."}
              className="mt-2 font-mono text-sm"
            />
          </div>

          {/* Model field for openai/custom */}
          {runtimeType !== "openclaw" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Model
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4, claude-3-opus, etc."
                className="mt-2 font-mono text-sm"
              />
            </div>
          )}

          {/* Custom headers for custom runtime */}
          {runtimeType === "custom" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Custom Headers (JSON)
              </label>
              <Textarea
                value={customHeaders}
                onChange={(e) => setCustomHeaders(e.target.value)}
                placeholder={'{"X-Custom-Header": "value"}'}
                className="mt-2 font-mono text-sm min-h-[60px]"
              />
            </div>
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

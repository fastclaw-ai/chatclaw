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
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");

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

  async function handleCreate() {
    if (!name.trim()) return;
    const company = await actions.createCompany(
      name.trim(),
      gatewayUrl.trim(),
      gatewayToken.trim(),
      description.trim() || undefined
    );
    await actions.selectCompany(company.id);
    setName("");
    setDescription("");
    setGatewayUrl("");
    setGatewayToken("");
    onOpenChange(false);
  }

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
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gateway URL
            </label>
            <Input
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="ws://localhost:18789"
              className="mt-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              API Token
            </label>
            <Input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="Your gateway token"
              className="mt-2 font-mono text-sm"
            />
          </div>
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

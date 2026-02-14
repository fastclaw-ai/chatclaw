"use client";

import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusConfig: Record<
  ConnectionStatus,
  { color: string; pulse: boolean; label: string }
> = {
  connected: { color: "bg-emerald-500", pulse: false, label: "Connected" },
  connecting: {
    color: "bg-yellow-500",
    pulse: true,
    label: "Connecting...",
  },
  disconnected: {
    color: "bg-zinc-500",
    pulse: false,
    label: "Disconnected",
  },
  error: { color: "bg-red-500", pulse: true, label: "Connection error" },
};

export function ConnectionIndicator() {
  const { state } = useStore();
  const config = statusConfig[state.connectionStatus];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-default">
          <span className="relative flex h-2.5 w-2.5">
            {config.pulse && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.color} opacity-75`}
              />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.color}`}
            />
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {config.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

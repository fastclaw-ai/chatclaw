"use client";

import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  ConnectionStatus,
  { color: string; pulse: boolean; label: string }
> = {
  connected: { color: "bg-emerald-500", pulse: false, label: "Connected" },
  connecting: { color: "bg-amber-500", pulse: true, label: "Connecting..." },
  disconnected: { color: "bg-zinc-500", pulse: false, label: "Disconnected" },
  error: { color: "bg-red-500", pulse: true, label: "Connection error" },
};

export function ConnectionIndicator() {
  const { state } = useStore();
  const config = statusConfig[state.connectionStatus];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md px-2 py-1 cursor-default">
          <span className="relative flex size-2">
            {config.pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  config.color
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                config.color
              )}
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

"use client";

import React, { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateCompanyDialog } from "@/components/dialogs/create-company-dialog";
import { GatewaySettingsDialog } from "@/components/dialogs/gateway-settings-dialog";

export function CompanySidebar() {
  const { state, actions } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-[72px] flex-col items-center bg-discord-darker py-3 gap-2">
        {/* Company list */}
        <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto scrollbar-none">
          {state.companies.map((company) => {
            const isActive = state.activeCompanyId === company.id;
            return (
              <Tooltip key={company.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => actions.selectCompany(company.id)}
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-[24px] transition-all duration-200",
                      "bg-discord-mid text-foreground hover:bg-discord-blurple hover:rounded-[16px]",
                      isActive && "bg-discord-blurple rounded-[16px]"
                    )}
                  >
                    {company.logo ? (
                      <span className="text-xl">{company.logo}</span>
                    ) : (
                      <span className="text-sm font-semibold">
                        {company.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div
                      className={cn(
                        "absolute -left-[4px] top-1/2 -translate-y-1/2 w-[4px] rounded-r-full bg-white transition-all",
                        isActive ? "h-10" : "h-0 group-hover:h-5"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-discord-darker border-none text-white font-semibold">
                  {company.name}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="mx-auto h-[2px] w-8 rounded-full bg-discord-mid" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowCreate(true)}
                className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-discord-mid text-discord-green hover:bg-discord-green hover:text-white hover:rounded-[16px] transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-discord-darker border-none text-white font-semibold">
              Add a Company
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2 border-t border-discord-mid">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[24px] bg-discord-mid hover:rounded-[16px] transition-all duration-200",
                  state.connectionStatus === "connected"
                    ? "text-discord-green hover:text-white"
                    : "text-discord-muted hover:text-white"
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-discord-darker border-none text-white font-semibold">
              Gateway Settings ({state.connectionStatus})
            </TooltipContent>
          </Tooltip>
        </div>

        <CreateCompanyDialog open={showCreate} onOpenChange={setShowCreate} />
        <GatewaySettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </TooltipProvider>
  );
}

"use client";

import { StoreProvider } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatArea } from "@/components/chat-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useGatewayEvents } from "@/hooks/use-gateway-events";

function GatewayEventsProvider({ children }: { children: React.ReactNode }) {
  useGatewayEvents();
  return <>{children}</>;
}

export default function Home() {
  return (
    <StoreProvider>
      <GatewayEventsProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-svh overflow-hidden">
            <ChatArea />
          </SidebarInset>
        </SidebarProvider>
      </GatewayEventsProvider>
    </StoreProvider>
  );
}

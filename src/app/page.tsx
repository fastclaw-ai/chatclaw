"use client";

import { StoreProvider } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatArea } from "@/components/chat-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <StoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <ChatArea />
        </SidebarInset>
      </SidebarProvider>
    </StoreProvider>
  );
}

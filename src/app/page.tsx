"use client";

import { StoreProvider } from "@/lib/store";
import { CompanySidebar } from "@/components/company-sidebar";
import { NavigationPanel } from "@/components/navigation-panel";
import { ChatArea } from "@/components/chat-area";

export default function Home() {
  return (
    <StoreProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <CompanySidebar />
        <NavigationPanel />
        <ChatArea />
      </div>
    </StoreProvider>
  );
}

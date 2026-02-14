"use client";

import { StoreProvider } from "@/lib/store";
import { ChatLayout } from "@/components/chat-layout";

export default function Home() {
  return (
    <StoreProvider>
      <ChatLayout />
    </StoreProvider>
  );
}

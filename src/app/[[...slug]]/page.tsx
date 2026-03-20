"use client";

import { useParams } from "next/navigation";
import { StoreProvider } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatArea } from "@/components/chat-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useRouteSync } from "@/hooks/use-route-sync";

export interface InitialRoute {
  companyId?: string;
  targetType?: "agent" | "team";
  targetId?: string;
  conversationId?: string;
}

function parseSlug(slug: string[]): InitialRoute {
  const route: InitialRoute = {};
  if (slug[0] === "c" && slug[1]) {
    route.companyId = slug[1];
    if (slug[2] === "agent" && slug[3]) {
      route.targetType = "agent";
      route.targetId = slug[3];
      route.conversationId = slug[4];
    } else if (slug[2] === "team" && slug[3]) {
      route.targetType = "team";
      route.targetId = slug[3];
      route.conversationId = slug[4];
    }
  }
  return route;
}

function AppShell() {
  useRouteSync();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <ChatArea />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Home() {
  const params = useParams();
  const slug = (params.slug as string[]) || [];
  const initialRoute = parseSlug(slug);

  return (
    <StoreProvider initialRoute={initialRoute}>
      <AppShell />
    </StoreProvider>
  );
}

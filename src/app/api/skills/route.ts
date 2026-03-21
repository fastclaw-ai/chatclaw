import { NextRequest, NextResponse } from "next/server";
import { gatewayRpcCall } from "@/lib/gateway-ws";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") || "main";
  const gatewayUrl = req.headers.get("x-gateway-url") || "";
  const gatewayToken = req.headers.get("x-gateway-token") || "";

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ skills: [] });
  }

  try {
    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, "skills.status", {});
    if (!result.ok || !result.payload) {
      return NextResponse.json({ skills: [] });
    }

    const rawSkills = (result.payload.skills || []) as Array<{
      name: string;
      scope?: string;
      description?: string;
      agentId?: string;
    }>;

    // Categorize as global vs agent-specific
    const skills = rawSkills.map(s => ({
      name: s.name,
      scope: s.agentId && s.agentId !== "main" ? "agent" : "global",
      description: s.description || "",
    }));

    return NextResponse.json({ skills });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { gatewayRpcCall } from "@/lib/gateway-ws";

export async function POST(req: NextRequest) {
  const { gatewayUrl, gatewayToken } = await req.json();
  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ error: "Missing gatewayUrl or gatewayToken" }, { status: 400 });
  }

  try {
    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, "agents.list", {});
    if (!result.ok) {
      return NextResponse.json({ error: result.error?.message || "Failed to fetch agents" }, { status: 502 });
    }

    const payload = result.payload || {};
    const agentsList = (payload.agents || payload.list || []) as Array<{ id: string; name: string }>;
    const defaultId = payload.defaultId as string | undefined;

    const agents: Array<{ id: string; name: string }> = [];

    for (const a of agentsList) {
      agents.push({ id: a.id, name: a.name || a.id });
    }

    // If no real agents found but there's a defaultId, use it
    if (agents.length === 0 && defaultId) {
      agents.push({ id: defaultId, name: "Default" });
    }

    return NextResponse.json({ agents, defaultId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

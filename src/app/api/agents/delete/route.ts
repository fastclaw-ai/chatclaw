import { NextResponse } from "next/server";
import { connectGatewayWs } from "@/lib/gateway-ws";

export async function POST(request: Request) {
  try {
    const { agentId, gatewayUrl, gatewayToken } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    if (!gatewayUrl || !gatewayToken) {
      return NextResponse.json({ error: "gatewayUrl and gatewayToken are required" }, { status: 400 });
    }

    const conn = await connectGatewayWs({ gatewayUrl, gatewayToken });

    try {
      // Get current config
      const configRes = await conn.call("config.get", {});
      if (!configRes.ok) {
        return NextResponse.json({ error: `Failed to fetch config: ${configRes.error?.message}` }, { status: 502 });
      }

      const payload = configRes.payload || {};
      const configHash = payload.hash as string;
      let config: Record<string, unknown>;
      if (payload.parsed && typeof payload.parsed === "object") {
        config = payload.parsed as Record<string, unknown>;
      } else if (typeof payload.raw === "string") {
        try { config = JSON.parse(payload.raw as string); } catch { config = {}; }
      } else {
        config = {};
      }

      // Remove agent from list
      const agents = (config.agents || {}) as Record<string, unknown>;
      if (agents.list && Array.isArray(agents.list)) {
        agents.list = (agents.list as Array<{ id: string }>).filter(a => a.id !== agentId);
      }

      // Write config back
      const setRes = await conn.call("config.apply", { raw: JSON.stringify(config, null, 2), baseHash: configHash });
      if (!setRes.ok) {
        return NextResponse.json({ error: `Failed to write config: ${setRes.error?.message}` }, { status: 502 });
      }

      return NextResponse.json({ ok: true });
    } finally {
      conn.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

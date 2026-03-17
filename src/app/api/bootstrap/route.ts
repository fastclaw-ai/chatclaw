import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export async function GET() {
  try {
    const configPath = join(homedir(), ".openclaw", "openclaw.json");
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw);

    const gateway = config?.gateway;
    if (!gateway?.auth?.token) {
      return NextResponse.json({ found: false });
    }

    const port = gateway.port ?? 18789;
    const gatewayUrl = `ws://localhost:${port}`;
    const gatewayToken = gateway.auth.token;

    // Always include default agent (from agents.defaults) as first entry
    const agents: Array<{ id: string; name: string; workspace: string | null }> = [
      { id: "main", name: "Default", workspace: null },
    ];

    // Append agents from agents.list
    const agentsList = config?.agents?.list ?? [];
    for (const a of agentsList) {
      agents.push({
        id: a.id,
        name: a.name || a.id,
        workspace: a.workspace ?? null,
      });
    }

    return NextResponse.json({
      found: true,
      gateway: { url: gatewayUrl, token: gatewayToken },
      agents,
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}

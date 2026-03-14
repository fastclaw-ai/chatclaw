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

    const agentsList = config?.agents?.list ?? [];
    const agents = agentsList.map((a: Record<string, unknown>) => ({
      id: a.id,
      name: a.name || a.id,
      workspace: a.workspace,
    }));

    return NextResponse.json({
      found: true,
      gateway: { url: gatewayUrl, token: gatewayToken },
      agents,
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { gatewayRpcCall } from "@/lib/gateway-ws";

const WORKSPACE_FILES = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "AGENTS.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
];

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") || "main";
  const file = req.nextUrl.searchParams.get("file");
  const gatewayUrl = req.headers.get("x-gateway-url") || "";
  const gatewayToken = req.headers.get("x-gateway-token") || "";

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ error: "Missing gateway credentials" }, { status: 400 });
  }

  // Resolve the actual agent ID (gateway doesn't accept "main")
  const resolvedAgentId = await resolveAgentId(gatewayUrl, gatewayToken, agentId);

  // Read a single file
  if (file) {
    if (!WORKSPACE_FILES.includes(file)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    const content = await readFile(gatewayUrl, gatewayToken, resolvedAgentId, file);
    return NextResponse.json({ content });
  }

  // Read all files
  const files: Record<string, string> = {};
  await Promise.all(
    WORKSPACE_FILES.map(async (f) => {
      files[f] = await readFile(gatewayUrl, gatewayToken, resolvedAgentId, f);
    })
  );

  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const { agentId, file, content } = await req.json();
  const gatewayUrl = req.headers.get("x-gateway-url") || "";
  const gatewayToken = req.headers.get("x-gateway-token") || "";

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ error: "Missing gateway credentials" }, { status: 400 });
  }

  if (!file || !WORKSPACE_FILES.includes(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const resolvedAgentId = await resolveAgentId(gatewayUrl, gatewayToken, agentId || "main");

  try {
    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, "agents.files.set", {
      agentId: resolvedAgentId,
      name: file,
      content,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error?.message || "Failed to write" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Failed to write: ${e}` }, { status: 500 });
  }
}

// Gateway doesn't accept "main" as agent ID — resolve to the default agent ID
async function resolveAgentId(gatewayUrl: string, gatewayToken: string, agentId: string): Promise<string> {
  if (agentId !== "main") return agentId;
  try {
    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, "agents.list", {});
    if (result.ok && result.payload) {
      const defaultId = result.payload.defaultId as string;
      if (defaultId) return defaultId;
      const agents = (result.payload.agents || result.payload.list || []) as Array<{ id: string }>;
      if (agents.length > 0) return agents[0].id;
    }
  } catch {
    // fallback
  }
  return agentId;
}

async function readFile(gatewayUrl: string, gatewayToken: string, agentId: string, file: string): Promise<string> {
  try {
    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, "agents.files.get", { agentId, name: file });
    if (result.ok && result.payload) {
      const fileData = result.payload.file as Record<string, unknown> | undefined;
      return (fileData?.content as string) || (result.payload.content as string) || "";
    }
  } catch {
    // ignore
  }
  return "";
}

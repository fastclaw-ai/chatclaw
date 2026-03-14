import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const gatewayUrl = req.headers.get("x-gateway-url") || "";
  const gatewayToken = req.headers.get("x-gateway-token") || "";
  const agentId = req.headers.get("x-openclaw-agent-id") || "main";
  const sessionKey = req.headers.get("x-openclaw-session-key") || "";

  const body = await req.text();

  const baseUrl = gatewayUrl
    .replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://");

  const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      "Content-Type": "application/json",
      "x-openclaw-agent-id": agentId,
      "x-openclaw-session-key": sessionKey,
    },
    body,
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return new Response(errorText, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

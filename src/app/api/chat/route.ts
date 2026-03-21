import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const gatewayUrl = req.headers.get("x-gateway-url") || "";
  const gatewayToken = req.headers.get("x-gateway-token") || "";
  const agentId = req.headers.get("x-openclaw-agent-id") || "main";
  const sessionKey = req.headers.get("x-openclaw-session-key") || "";

  const body = await req.text();

  let baseUrl = gatewayUrl
    .replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${gatewayToken}`,
    "Content-Type": "application/json",
    "x-openclaw-agent-id": agentId,
    "x-openclaw-session-key": sessionKey,
  };

  console.log(`[chat] requesting: ${baseUrl}/v1/chat/completions, agent: ${agentId}, session: ${sessionKey}`);

  // Manual redirect to preserve Authorization header across HTTP→HTTPS
  let upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (location) {
      const redirectUrl = location.startsWith("http")
        ? location
        : new URL(location, `${baseUrl}/v1/chat/completions`).toString();
      upstream = await fetch(redirectUrl, {
        method: "POST",
        headers,
        body,
      });
    }
  }

  console.log(`[chat] upstream status: ${upstream.status}, content-type: ${upstream.headers.get("content-type")}`);

  if (!upstream.ok) {
    const errorText = await upstream.text();
    console.log(`[chat] upstream error: ${errorText.slice(0, 500)}`);
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

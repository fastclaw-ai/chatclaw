/**
 * Server-side helper to call OpenClaw gateway methods via the ClawHost sidecar proxy.
 *
 * Flow: ChatClaw server → HTTP POST → Sidecar /gateway/proxy → WebSocket → OpenClaw Gateway
 */

interface GatewayRpcResult {
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

/**
 * Call a gateway WebSocket method via the ClawHost sidecar proxy.
 */
export async function gatewayRpc(
  proxyUrl: string,
  gatewayUrl: string,
  gatewayToken: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 15000
): Promise<GatewayRpcResult> {
  const baseUrl = proxyUrl.replace(/\/+$/, "");

  const res = await fetch(`${baseUrl}/gateway/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gateway_url: gatewayUrl,
      gateway_token: gatewayToken,
      method,
      params,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: { code: "HTTP_ERROR", message: `Proxy returned ${res.status}: ${text}` } };
  }

  const data = await res.json();
  return data;
}

/**
 * Helper: read a workspace file via gateway RPC.
 * Note: gateway uses "name" param (not "file"), and "main" is not a valid agentId.
 */
export async function rpcReadFile(
  proxyUrl: string, gatewayUrl: string, gatewayToken: string,
  agentId: string, file: string
): Promise<string> {
  const result = await gatewayRpc(proxyUrl, gatewayUrl, gatewayToken, "agents.files.get", { agentId, name: file });
  if (result.ok && result.payload) {
    // Content may be nested in payload.file.content
    const fileData = result.payload.file as Record<string, unknown> | undefined;
    return (fileData?.content as string) || (result.payload.content as string) || "";
  }
  return "";
}

/**
 * Helper: write a workspace file via gateway RPC.
 */
export async function rpcWriteFile(
  proxyUrl: string, gatewayUrl: string, gatewayToken: string,
  agentId: string, file: string, content: string
): Promise<boolean> {
  const result = await gatewayRpc(proxyUrl, gatewayUrl, gatewayToken, "agents.files.set", { agentId, name: file, content });
  return !!result.ok;
}

/**
 * Helper: list agents via gateway RPC.
 */
export async function rpcListAgents(
  proxyUrl: string, gatewayUrl: string, gatewayToken: string
): Promise<Array<{ id: string; name: string }>> {
  const result = await gatewayRpc(proxyUrl, gatewayUrl, gatewayToken, "agents.list", {});
  if (result.ok && result.payload) {
    const list = (result.payload.agents || result.payload.list || []) as Array<{ id: string; name: string }>;
    return list;
  }
  return [];
}

/**
 * Helper: get config via gateway RPC.
 */
export async function rpcGetConfig(
  proxyUrl: string, gatewayUrl: string, gatewayToken: string
): Promise<Record<string, unknown> | null> {
  const result = await gatewayRpc(proxyUrl, gatewayUrl, gatewayToken, "config.get", {});
  if (result.ok && result.payload) {
    return result.payload;
  }
  return null;
}

/**
 * Helper: set config via gateway RPC.
 */
export async function rpcSetConfig(
  proxyUrl: string, gatewayUrl: string, gatewayToken: string,
  config: Record<string, unknown>
): Promise<boolean> {
  const result = await gatewayRpc(proxyUrl, gatewayUrl, gatewayToken, "config.set", { config });
  return !!result.ok;
}

/**
 * Gateway WebSocket client for RPC calls to OpenClaw gateway.
 * Used server-side (in API routes) to communicate with OpenClaw gateway.
 *
 * Uses "openclaw-control-ui" client ID to get full operator scopes
 * (operator.read, operator.write, operator.admin) with token-only auth.
 */

interface WsRpcOptions {
  gatewayUrl: string;
  gatewayToken: string;
  timeoutMs?: number;
}

interface WsFrame {
  type: string;
  id?: string;
  ok?: boolean;
  event?: string;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

/**
 * Open a WebSocket connection to the gateway, authenticate, and return
 * a helper to call RPC methods. Caller must call close() when done.
 */
export async function connectGatewayWs(opts: WsRpcOptions): Promise<{
  call: (method: string, params: Record<string, unknown>) => Promise<WsFrame>;
  close: () => void;
}> {
  const timeout = opts.timeoutMs || 15000;

  // Normalize URL to ws:// or wss://
  let wsUrl = opts.gatewayUrl;
  if (wsUrl.startsWith("http://")) wsUrl = wsUrl.replace("http://", "ws://");
  else if (wsUrl.startsWith("https://")) wsUrl = wsUrl.replace("https://", "wss://");
  else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) wsUrl = "ws://" + wsUrl;

  // Auto-upgrade ws:// to wss:// for non-local hosts
  if (wsUrl.startsWith("ws://")) {
    try {
      const host = new URL(wsUrl).hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
      if (!isLocal) {
        wsUrl = wsUrl.replace("ws://", "wss://");
      }
    } catch {
      // Invalid URL, let it fail naturally
    }
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Connection timeout"));
    }, timeout);

    const ws = new WebSocket(wsUrl);
    const pending = new Map<string, { resolve: (f: WsFrame) => void; reject: (e: Error) => void }>();

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onmessage = (event) => {
      let frame: WsFrame;
      try {
        frame = JSON.parse(String(event.data));
      } catch {
        return;
      }

      // Handle challenge → send connect
      if (frame.type === "event" && frame.event === "connect.challenge") {
        const connectId = crypto.randomUUID();

        pending.set(connectId, {
          resolve: (f) => {
            clearTimeout(timer);
            if (!f.ok) {
              reject(new Error(f.error?.message || "Connect failed"));
              return;
            }

            resolve({
              call: (method, params) => {
                return new Promise((res, rej) => {
                  const id = crypto.randomUUID();
                  pending.set(id, { resolve: res, reject: rej });
                  ws.send(JSON.stringify({ type: "req", id, method, params }));
                  setTimeout(() => {
                    if (pending.has(id)) {
                      pending.delete(id);
                      rej(new Error(`RPC timeout: ${method}`));
                    }
                  }, timeout);
                });
              },
              close: () => ws.close(),
            });
          },
          reject,
        });

        ws.send(JSON.stringify({
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: "openclaw-control-ui", version: "2026.3.13", platform: "node", mode: "cli" },
            role: "operator",
            scopes: ["operator.read", "operator.write", "operator.admin", "operator.pairing", "operator.approvals"],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: opts.gatewayToken },
            locale: "en-US",
            userAgent: "chatclaw/1.0",
          },
        }));
        return;
      }

      // Handle RPC responses
      if (frame.type === "res" && frame.id && pending.has(frame.id)) {
        const p = pending.get(frame.id)!;
        pending.delete(frame.id);
        p.resolve(frame);
      }
    };
  });
}

/**
 * One-shot RPC call: connect, call method, close.
 */
export async function gatewayRpcCall(
  gatewayUrl: string,
  gatewayToken: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs?: number,
): Promise<WsFrame> {
  const conn = await connectGatewayWs({ gatewayUrl, gatewayToken, timeoutMs });
  try {
    return await conn.call(method, params);
  } finally {
    conn.close();
  }
}

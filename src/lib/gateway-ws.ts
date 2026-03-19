/**
 * Singleton WebSocket manager for persistent connection to OpenClaw gateway.
 * Handles challenge auth, reconnection, and pub/sub for push events.
 */

export interface GatewayPushEvent {
  event: string;
  sessionKey?: string;
  agentId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

type Listener = (event: GatewayPushEvent) => void;

class GatewayWSManager {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private gatewayUrl = "";
  private gatewayToken = "";
  private connected = false;
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1000;
  private destroyed = false;

  connect(gatewayUrl: string, gatewayToken: string): void {
    if (this.destroyed) return;

    // If already connected to same gateway, skip
    if (this.connected && this.gatewayUrl === gatewayUrl && this.gatewayToken === gatewayToken) {
      return;
    }

    // If credentials changed, disconnect first
    if (this.ws && (this.gatewayUrl !== gatewayUrl || this.gatewayToken !== gatewayToken)) {
      this.disconnect();
    }

    this.gatewayUrl = gatewayUrl;
    this.gatewayToken = gatewayToken;

    if (this.connecting) return;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.destroyed || !this.gatewayUrl || !this.gatewayToken) return;
    this.connecting = true;

    // Convert HTTP URL to WebSocket URL
    let wsUrl = this.gatewayUrl;
    wsUrl = wsUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    if (!wsUrl.startsWith("ws")) wsUrl = "ws://" + wsUrl;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      let challengeHandled = false;
      let connectId = "";

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data));

          // Handle challenge
          if (frame.type === "event" && frame.event === "connect.challenge" && !challengeHandled) {
            challengeHandled = true;
            connectId = crypto.randomUUID();
            ws.send(JSON.stringify({
              type: "req",
              id: connectId,
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: "cli",
                  version: "1.0.0",
                  platform: "node",
                  mode: "cli",
                },
                role: "operator",
                scopes: ["operator.read", "operator.write", "operator.admin"],
                caps: [],
                commands: [],
                permissions: {},
                auth: { token: this.gatewayToken },
                locale: "en-US",
                userAgent: "chatclaw/1.0.0",
              },
            }));
            return;
          }

          // Handle connect response
          if (frame.type === "res" && frame.id === connectId) {
            if (frame.ok) {
              this.connected = true;
              this.connecting = false;
              this.reconnectDelay = 1000;
              this.startKeepalive();
              console.log("[GatewayWS] Connected to gateway");
            } else {
              console.error("[GatewayWS] Connect failed:", frame.error?.message);
              this.connecting = false;
              ws.close();
            }
            return;
          }

          // Handle push events - broadcast to all listeners
          if (frame.type === "event" && frame.event !== "connect.challenge") {
            // For "agent" events, extract sessionKey from payload
            const sessionKey = frame.payload?.sessionKey || frame.sessionKey;
            const pushEvent: GatewayPushEvent = {
              event: frame.event,
              sessionKey,
              agentId: frame.payload?.agentId || frame.agentId,
              payload: frame.payload || {},
              timestamp: Date.now(),
            };
            this.broadcast(pushEvent);
          }

          // Handle unsolicited messages (e.g., delivery messages from cron/heartbeat)
          if (frame.type === "req" && frame.method === "message.deliver") {
            const pushEvent: GatewayPushEvent = {
              event: "message.deliver",
              sessionKey: frame.params?.sessionKey,
              agentId: frame.params?.agentId,
              payload: frame.params || {},
              timestamp: Date.now(),
            };
            this.broadcast(pushEvent);

            // Acknowledge the delivery
            ws.send(JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: {},
            }));
          }
        } catch {
          // Skip parse errors
        }
      };

      ws.onerror = () => {
        console.error("[GatewayWS] WebSocket error");
      };

      ws.onclose = () => {
        this.connected = false;
        this.connecting = false;
        this.stopKeepalive();

        if (!this.destroyed) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error("[GatewayWS] Failed to create WebSocket:", err);
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return;

    console.log(`[GatewayWS] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, this.reconnectDelay);

    // Exponential backoff, max 30s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.ws && this.connected) {
        try {
          this.ws.send(JSON.stringify({
            type: "req",
            id: crypto.randomUUID(),
            method: "ping",
            params: {},
          }));
        } catch {
          // Ignore keepalive errors
        }
      }
    }, 30000);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private broadcast(event: GatewayPushEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect(): void {
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Module-level singleton
let instance: GatewayWSManager | null = null;

export function getGatewayWS(): GatewayWSManager {
  if (!instance) {
    instance = new GatewayWSManager();
  }
  return instance;
}

import { v4 as uuidv4 } from "uuid";
import type {
  GatewayFrame,
  GatewayResponse,
  GatewayEvent,
  ChatEventPayload,
  ConnectionStatus,
  AgentIdentity,
} from "@/types";

// ── Types ───────────────────────────────────────────────────────────

type PendingRequest = {
  resolve: (res: GatewayResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type GatewayEventHandler = {
  onConnectionStatus?: (status: ConnectionStatus) => void;
  onChatEvent?: (payload: ChatEventPayload) => void;
  onAgentIdentity?: (identity: AgentIdentity) => void;
  onError?: (error: string) => void;
};

// ── Constants ───────────────────────────────────────────────────────

const REQUEST_TIMEOUT = 30_000;
const RECONNECT_BASE = 1_000;
const RECONNECT_MAX = 16_000;

// ── Gateway Client ──────────────────────────────────────────────────

export class GatewayClient {
  private ws: WebSocket | null = null;
  private url: string = "";
  private token: string = "";
  private handlers: GatewayEventHandler = {};
  private pending = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private connected = false;
  private challengeReceived = false;

  // ── Lifecycle ───────────────────────────────────────────────────

  configure(url: string, token: string, handlers: GatewayEventHandler): void {
    this.url = url;
    this.token = token;
    this.handlers = handlers;
  }

  connect(): void {
    if (this.destroyed) return;
    if (this.ws) this.cleanup();

    this.connected = false;
    this.challengeReceived = false;
    this.handlers.onConnectionStatus?.("connecting");

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.handlers.onConnectionStatus?.("error");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Wait for challenge event — don't set connected yet
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onerror = () => {
      if (!this.connected) {
        this.handlers.onConnectionStatus?.("error");
      }
    };

    this.ws.onclose = () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.rejectAllPending("Connection closed");
      if (!this.destroyed) {
        this.handlers.onConnectionStatus?.(wasConnected ? "disconnected" : "error");
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.cancelReconnect();
    this.cleanup();
    this.handlers.onConnectionStatus?.("disconnected");
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
    this.pending.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ── Message Handling ──────────────────────────────────────────

  private handleMessage(raw: string): void {
    let frame: GatewayFrame;
    try {
      frame = JSON.parse(raw) as GatewayFrame;
    } catch {
      return;
    }

    switch (frame.type) {
      case "event":
        this.handleEvent(frame as GatewayEvent);
        break;
      case "res":
        this.handleResponse(frame as GatewayResponse);
        break;
    }
  }

  private handleEvent(event: GatewayEvent): void {
    switch (event.event) {
      case "connect.challenge":
        this.handleChallenge();
        break;
      case "chat":
        this.handlers.onChatEvent?.(event.payload as unknown as ChatEventPayload);
        break;
    }
  }

  private async handleChallenge(): Promise<void> {
    if (this.challengeReceived) return;
    this.challengeReceived = true;

    try {
      const res = await this.sendRequest("connect", {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "webchat",
          version: "1.0.0",
          platform: "web",
          mode: "webchat",
        },
        role: "operator",
        scopes: ["operator.read", "operator.write", "operator.admin"],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: this.token },
        locale: "en-US",
        userAgent: "chatclaw-web/1.0.0",
      });

      if (res.ok) {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.handlers.onConnectionStatus?.("connected");

        // Fetch agent identity after connect
        this.fetchAgentIdentity();
      } else {
        this.handlers.onConnectionStatus?.("error");
        this.handlers.onError?.(
          res.error?.message ?? "Connection rejected"
        );
      }
    } catch {
      this.handlers.onConnectionStatus?.("error");
      this.scheduleReconnect();
    }
  }

  private handleResponse(res: GatewayResponse): void {
    const pending = this.pending.get(res.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(res.id);
    pending.resolve(res);
  }

  // ── Request/Response ──────────────────────────────────────────

  sendRequest(
    method: string,
    params: Record<string, unknown>
  ): Promise<GatewayResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not open"));
        return;
      }

      const id = uuidv4();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, REQUEST_TIMEOUT);

      this.pending.set(id, { resolve, reject, timer });

      this.ws.send(
        JSON.stringify({
          type: "req",
          id,
          method,
          params,
        })
      );
    });
  }

  // ── Chat Methods ──────────────────────────────────────────────

  async sendMessage(
    sessionKey: string,
    message: string
  ): Promise<GatewayResponse> {
    return this.sendRequest("chat.send", {
      sessionKey,
      message,
      deliver: false,
      idempotencyKey: uuidv4(),
    });
  }

  async abortChat(sessionKey: string, runId?: string): Promise<GatewayResponse> {
    const params: Record<string, unknown> = { sessionKey };
    if (runId) params.runId = runId;
    return this.sendRequest("chat.abort", params);
  }

  async getChatHistory(
    sessionKey: string,
    limit: number = 50
  ): Promise<GatewayResponse> {
    return this.sendRequest("chat.history", { sessionKey, limit });
  }

  async listSessions(): Promise<GatewayResponse> {
    return this.sendRequest("sessions.list", {});
  }

  // ── Agent Identity ────────────────────────────────────────────

  private async fetchAgentIdentity(): Promise<void> {
    try {
      const res = await this.sendRequest("agent.identity.get", {});
      if (res.ok && res.payload) {
        this.handlers.onAgentIdentity?.(res.payload as unknown as AgentIdentity);
      }
    } catch {
      // Non-critical, ignore
    }
  }

  // ── Reconnect Logic ───────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    this.cancelReconnect();

    const delay = Math.min(
      RECONNECT_BASE * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────

  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.connected = false;
    this.challengeReceived = false;
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────

let instance: GatewayClient | null = null;

export function getGateway(): GatewayClient {
  if (!instance) {
    instance = new GatewayClient();
  }
  return instance;
}

export function resetGateway(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

// ── Test Connection (standalone) ────────────────────────────────────

export function testConnection(
  url: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ ok: false, error: "Connection timed out" });
    }, 10_000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      clearTimeout(timeout);
      resolve({ ok: false, error: `Invalid URL: ${e}` });
      return;
    }

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve({ ok: false, error: "Connection failed" });
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data as string) as GatewayFrame;
        if (frame.type === "event" && (frame as GatewayEvent).event === "connect.challenge") {
          // Send connect request
          const id = uuidv4();
          ws.send(
            JSON.stringify({
              type: "req",
              id,
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: "webchat",
                  version: "1.0.0",
                  platform: "web",
                  mode: "webchat",
                },
                role: "operator",
                scopes: ["operator.read", "operator.write", "operator.admin"],
                caps: [],
                commands: [],
                permissions: {},
                auth: { token },
                locale: "en-US",
                userAgent: "chatclaw-web/1.0.0",
              },
            })
          );

          // Wait for response
          ws.onmessage = (ev) => {
            try {
              const res = JSON.parse(ev.data as string) as GatewayFrame;
              if (res.type === "res") {
                const response = res as GatewayResponse;
                clearTimeout(timeout);
                ws.close();
                if (response.ok) {
                  resolve({ ok: true });
                } else {
                  resolve({
                    ok: false,
                    error: response.error?.message ?? "Auth failed",
                  });
                }
              }
            } catch {
              clearTimeout(timeout);
              ws.close();
              resolve({ ok: false, error: "Invalid response" });
            }
          };
        }
      } catch {
        clearTimeout(timeout);
        ws.close();
        resolve({ ok: false, error: "Invalid frame" });
      }
    };
  });
}

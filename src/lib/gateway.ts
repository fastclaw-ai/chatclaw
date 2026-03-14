import { v4 as uuidv4 } from "uuid";
import type {
  ChatEventPayload,
  ConnectionStatus,
} from "@/types";

// ── Types ───────────────────────────────────────────────────────────

export type GatewayEventHandler = {
  onConnectionStatus?: (status: ConnectionStatus) => void;
  onChatEvent?: (payload: ChatEventPayload) => void;
  onError?: (error: string) => void;
};

// ── Gateway Client (HTTP SSE) ──────────────────────────────────────

export class GatewayClient {
  private baseUrl: string = "";
  private token: string = "";
  private handlers: GatewayEventHandler = {};
  private destroyed = false;
  private connected = false;
  private activeAbortControllers = new Map<string, AbortController>();

  configure(url: string, token: string, handlers: GatewayEventHandler): void {
    this.baseUrl = url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
    this.token = token;
    this.handlers = handlers;
  }

  connect(): void {
    if (this.destroyed) return;
    this.connected = true;
    this.handlers.onConnectionStatus?.("connected");
  }

  disconnect(): void {
    for (const controller of this.activeAbortControllers.values()) {
      controller.abort();
    }
    this.activeAbortControllers.clear();
    this.connected = false;
    this.handlers.onConnectionStatus?.("disconnected");
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  isConnected(): boolean {
    return this.connected && !this.destroyed;
  }

  async sendMessage(sessionKey: string, message: string): Promise<void> {
    const agentId = this.extractAgentId(sessionKey);
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionKey, abortController);

    const runId = uuidv4();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gateway-url": this.baseUrl,
          "x-gateway-token": this.token,
          "x-openclaw-agent-id": agentId,
          "x-openclaw-session-key": sessionKey,
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          messages: [{ role: "user", content: message }],
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "error",
          message: { role: "assistant", content: [{ type: "text", text: "" }], timestamp: Date.now() },
          error: `HTTP ${res.status}: ${errorText}`,
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            this.handlers.onChatEvent?.({
              runId,
              sessionKey,
              state: "final",
              message: {
                role: "assistant",
                content: [{ type: "text", text: accumulated }],
                timestamp: Date.now(),
              },
            });
            this.activeAbortControllers.delete(sessionKey);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              this.handlers.onChatEvent?.({
                runId,
                sessionKey,
                state: "delta",
                message: {
                  role: "assistant",
                  content: [{ type: "text", text: accumulated }],
                  timestamp: Date.now(),
                },
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // If we exit without [DONE], emit final with whatever we have
      if (accumulated) {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "final",
          message: {
            role: "assistant",
            content: [{ type: "text", text: accumulated }],
            timestamp: Date.now(),
          },
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "aborted",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "" }],
            timestamp: Date.now(),
          },
        });
      } else {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "error",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "" }],
            timestamp: Date.now(),
          },
          error: String(err),
        });
      }
    } finally {
      this.activeAbortControllers.delete(sessionKey);
    }
  }

  async abortChat(sessionKey: string, _runId?: string): Promise<void> {
    const controller = this.activeAbortControllers.get(sessionKey);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(sessionKey);
    }
  }

  private extractAgentId(sessionKey: string): string {
    const parts = sessionKey.split(":");
    return parts[1] || "main";
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

// ── Test Connection (HTTP) ────────────────────────────────────────

export async function testConnection(
  url: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": baseUrl,
        "x-gateway-token": token,
        "x-openclaw-agent-id": "main",
      },
      body: JSON.stringify({
        model: "openclaw",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      return { ok: false, error: "Authentication failed" };
    }
    // Any response from the endpoint means connectivity works
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, error: "Connection timed out" };
    }
    return { ok: false, error: `Connection failed: ${e}` };
  }
}

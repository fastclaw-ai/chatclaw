import { v4 as uuidv4 } from "uuid";
import type { RuntimeConfig, RuntimeEventHandler, RuntimeProvider } from "./types";

export class RuntimeClient implements RuntimeProvider {
  private config: RuntimeConfig = { type: "openclaw", baseUrl: "", apiKey: "" };
  private handlers: RuntimeEventHandler = {};
  private destroyed = false;
  private connected = false;
  private activeAbortControllers = new Map<string, AbortController>();

  configure(config: RuntimeConfig, handlers: RuntimeEventHandler): void {
    this.config = config;
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

  getConfig(): RuntimeConfig {
    return this.config;
  }

  supportsAgentSync(): boolean {
    return this.config.type === "openclaw";
  }

  supportsWorkspaceFiles(): boolean {
    return this.config.type === "openclaw";
  }

  supportsSessionKeys(): boolean {
    return this.config.type === "openclaw";
  }

  async sendMessage(sessionKey: string, message: string, agentId?: string): Promise<void> {
    const resolvedAgentId = agentId || this.extractAgentId(sessionKey);
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionKey, abortController);
    const runId = uuidv4();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-gateway-url": this.config.baseUrl,
        "x-gateway-token": this.config.apiKey,
      };

      let model = this.config.model || "gpt-4";

      if (this.config.type === "openclaw") {
        headers["x-openclaw-agent-id"] = resolvedAgentId;
        headers["x-openclaw-session-key"] = sessionKey;
        model = `openclaw:${resolvedAgentId}`;
      }

      if (this.config.headers) {
        for (const [k, v] of Object.entries(this.config.headers)) {
          headers[k] = v;
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
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
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            this.handlers.onChatEvent?.({
              runId,
              sessionKey,
              state: "final",
              message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
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
                message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
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
          message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "aborted",
          message: { role: "assistant", content: [{ type: "text", text: "" }], timestamp: Date.now() },
        });
      } else {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "error",
          message: { role: "assistant", content: [{ type: "text", text: "" }], timestamp: Date.now() },
          error: String(err),
        });
      }
    } finally {
      this.activeAbortControllers.delete(sessionKey);
    }
  }

  async abortChat(sessionKey: string): Promise<void> {
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

export type { RuntimeType, RuntimeConfig, RuntimeEventHandler, RuntimeProvider } from "./types";

// ── Test Connection ────────────────────────────────────────────────

export async function testConnection(
  url: string,
  token: string,
  runtimeType: string = "openclaw"
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-gateway-url": baseUrl,
      "x-gateway-token": token,
    };

    if (runtimeType === "openclaw") {
      headers["x-openclaw-agent-id"] = "main";
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: runtimeType === "openclaw" ? "openclaw" : "test",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      return { ok: false, error: "Authentication failed" };
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, error: "Connection timed out" };
    }
    return { ok: false, error: `Connection failed: ${e}` };
  }
}

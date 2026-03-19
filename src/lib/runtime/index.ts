import { v4 as uuidv4 } from "uuid";
import type { RuntimeConfig, RuntimeEventHandler, RuntimeProvider } from "./types";
import type { MessageAttachment, ToolCallContent } from "@/types";

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

  async sendMessage(sessionKey: string, message: string, agentId?: string, attachments?: MessageAttachment[]): Promise<void> {
    const resolvedAgentId = agentId || this.extractAgentId(sessionKey);
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionKey, abortController);
    let runId = uuidv4();

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

      // Build message content - use multi-part format if attachments exist
      const imageAttachments = attachments?.filter(a => a.type === "image" && a.url) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let messageContent: string | Array<any>;
      if (imageAttachments.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: Array<any> = [];
        if (message) {
          parts.push({ type: "text", text: message });
        }
        for (const att of imageAttachments) {
          // Use OpenAI image_url format - works with both data URLs and regular URLs
          parts.push({ type: "image_url", image_url: { url: att.url } });
        }
        messageContent = parts;
      } else {
        messageContent = message;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: messageContent }],
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
      // Track tool calls being streamed
      const activeToolCalls = new Map<number, { id: string; name: string; arguments: string }>();
      let currentToolCalls: ToolCallContent[] = [];

      const IDLE_TIMEOUT = 3000; // 3s idle = treat as message boundary

      while (true) {
        // Race between reading data and idle timeout
        const readPromise = reader.read();
        let result: ReadableStreamReadResult<Uint8Array>;

        if (accumulated) {
          const timeout = new Promise<"idle">((resolve) => setTimeout(() => resolve("idle"), IDLE_TIMEOUT));
          const winner = await Promise.race([readPromise, timeout]);

          if (winner === "idle") {
            // No data for IDLE_TIMEOUT ms — save accumulated content as a completed message
            this.handlers.onChatEvent?.({
              runId,
              sessionKey,
              state: "message_done",
              message: {
                role: "assistant",
                content: [{ type: "text", text: accumulated }],
                timestamp: Date.now(),
              },
              toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            });
            accumulated = "";
            currentToolCalls = [];
            activeToolCalls.clear();
            runId = uuidv4();
            // Now wait for the actual read to complete
            result = await readPromise;
          } else {
            result = winner as ReadableStreamReadResult<Uint8Array>;
          }
        } else {
          result = await readPromise;
        }

        const { done, value } = result;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            // Emit current accumulated content as a completed message
            if (accumulated || currentToolCalls.length > 0) {
              this.handlers.onChatEvent?.({
                runId,
                sessionKey,
                state: "message_done",
                message: {
                  role: "assistant",
                  content: [{ type: "text", text: accumulated }],
                  timestamp: Date.now(),
                },
                toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
              });
              // Reset for potential next message in the same stream
              accumulated = "";
              currentToolCalls = [];
              activeToolCalls.clear();
              runId = uuidv4();
            }
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle non-choices events (some gateways send tool results as separate events)
            if (parsed.type === "tool_result" || parsed.type === "tool_output") {
              const toolId = parsed.tool_call_id || parsed.id;
              if (toolId) {
                currentToolCalls = currentToolCalls.map(tc =>
                  tc.id === toolId ? { ...tc, status: "completed" as const, result: typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed.content) } : tc
                );
                this.handlers.onChatEvent?.({
                  runId,
                  sessionKey,
                  state: "delta",
                  message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
                  toolCalls: currentToolCalls,
                  phase: "tool-calling",
                });
              }
              continue;
            }

            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            if (!delta) continue;

            // Handle text content
            if (delta.content) {
              accumulated += delta.content;
              this.handlers.onChatEvent?.({
                runId,
                sessionKey,
                state: "delta",
                message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
                toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
              });
            }

            // Handle tool calls (OpenAI format)
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (tc.id) {
                  // New tool call starting
                  activeToolCalls.set(idx, {
                    id: tc.id,
                    name: tc.function?.name || "",
                    arguments: tc.function?.arguments || "",
                  });
                } else if (activeToolCalls.has(idx)) {
                  // Continue accumulating arguments
                  const existing = activeToolCalls.get(idx)!;
                  if (tc.function?.name) existing.name += tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                }
              }

              // Update currentToolCalls from activeToolCalls
              currentToolCalls = Array.from(activeToolCalls.values()).map(tc => ({
                type: "tool_call" as const,
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments,
                status: "calling" as const,
              }));

              this.handlers.onChatEvent?.({
                runId,
                sessionKey,
                state: "delta",
                message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
                toolCalls: currentToolCalls,
                phase: "tool-calling",
              });
            }

            // When a segment finishes (tool_calls or stop), save accumulated content as a separate message
            if (choice?.finish_reason === "tool_calls" || choice?.finish_reason === "function_call" || choice?.finish_reason === "stop") {
              if (choice.finish_reason !== "stop" ) {
                // Mark all tool calls as completed
                currentToolCalls = currentToolCalls.map(tc => ({ ...tc, status: "completed" as const }));
              }
              // Save current accumulated text as a completed message segment
              if (accumulated) {
                this.handlers.onChatEvent?.({
                  runId,
                  sessionKey,
                  state: "message_done",
                  message: {
                    role: "assistant",
                    content: [{ type: "text", text: accumulated }],
                    timestamp: Date.now(),
                  },
                  toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
                });
                // Reset for next segment
                accumulated = "";
                currentToolCalls = [];
                activeToolCalls.clear();
                runId = uuidv4();
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // If we exit with remaining content (no trailing [DONE]), emit as message_done
      if (accumulated || currentToolCalls.length > 0) {
        this.handlers.onChatEvent?.({
          runId,
          sessionKey,
          state: "message_done",
          message: { role: "assistant", content: [{ type: "text", text: accumulated }], timestamp: Date.now() },
          toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
        });
      }
      // Signal stream end
      this.handlers.onChatEvent?.({
        runId,
        sessionKey,
        state: "final",
        message: { role: "assistant", content: [{ type: "text", text: "" }], timestamp: Date.now() },
      });
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
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Authentication failed – check your token" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Server returned ${res.status}${text ? `: ${text.slice(0, 100)}` : ""}` };
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, error: "Connection timed out" };
    }
    return { ok: false, error: `Connection failed: ${e}` };
  }
}

import type { ChatEventPayload, ConnectionStatus } from "@/types";

export type RuntimeType = "openclaw" | "openai" | "custom";

export interface RuntimeConfig {
  type: RuntimeType;
  baseUrl: string;
  apiKey: string;
  model?: string;
  headers?: Record<string, string>;
}

export interface RuntimeEventHandler {
  onConnectionStatus?: (status: ConnectionStatus) => void;
  onChatEvent?: (payload: ChatEventPayload) => void;
  onError?: (error: string) => void;
}

export interface RuntimeProvider {
  configure(config: RuntimeConfig, handlers: RuntimeEventHandler): void;
  connect(): void;
  disconnect(): void;
  destroy(): void;
  isConnected(): boolean;
  getConfig(): RuntimeConfig;
  sendMessage(sessionKey: string, message: string, agentId?: string): Promise<void>;
  abortChat(sessionKey: string, runId?: string): Promise<void>;
  supportsAgentSync(): boolean;
  supportsWorkspaceFiles(): boolean;
  supportsSessionKeys(): boolean;
}

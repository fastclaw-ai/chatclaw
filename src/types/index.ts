// ── Gateway Protocol Types ──────────────────────────────────────────

export interface GatewayRequest {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface GatewayEvent {
  type: "event";
  event: string;
  payload: Record<string, unknown>;
}

export type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent;

// ── Connect Challenge ───────────────────────────────────────────────

export interface ConnectChallenge {
  nonce: string;
  ts: number;
}

// ── Chat Streaming ──────────────────────────────────────────────────

export type ChatState = "delta" | "final" | "error" | "aborted";

export interface ChatMessageContent {
  type: "text";
  text: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: ChatMessageContent[];
  timestamp: number;
}

export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  state: ChatState;
  message: ChatMessage;
  error?: string;
}

// ── Agent Identity ──────────────────────────────────────────────────

export interface AgentIdentity {
  name: string;
  avatar?: string;
  emoji?: string;
}

// ── Connection Status ───────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

// ── Database Models ─────────────────────────────────────────────────

export interface Settings {
  id: string;
  gatewayUrl: string;
  token: string;
  theme: "dark" | "light";
}

export interface Conversation {
  id: string;
  title: string;
  sessionKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

// ── Store Types ─────────────────────────────────────────────────────

export interface AppState {
  // Settings
  settings: Settings | null;
  settingsLoaded: boolean;

  // Connection
  connectionStatus: ConnectionStatus;
  agentIdentity: AgentIdentity | null;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Messages for active conversation
  messages: Message[];

  // Auto-detect
  detectedGatewayUrl: string | null;
  detectedToken: string | null;

  // Streaming
  isStreaming: boolean;
  streamingContent: string;
  currentRunId: string | null;
  streamingConversationId: string | null;
}

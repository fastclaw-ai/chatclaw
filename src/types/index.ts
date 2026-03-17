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

// ── Agent Identity (from gateway) ──────────────────────────────────

export interface AgentIdentity {
  name: string;
  avatar?: string;
  emoji?: string;
}

// ── Connection Status ───────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

// ── Chat Target ─────────────────────────────────────────────────────

export type ChatTargetType = "agent" | "team";

export interface ChatTarget {
  type: ChatTargetType;
  id: string;
  conversationId?: string;
}

// ── Database Models ─────────────────────────────────────────────────

export interface Company {
  id: string;
  userId?: string;
  name: string;
  logo?: string;
  description?: string;
  gatewayUrl: string;
  gatewayToken: string;
  createdAt: number;
  updatedAt: number;
}

export type AgentSpecialty = "coding" | "research" | "writing" | "design" | "general";

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  avatar?: string;
  description: string;
  specialty: AgentSpecialty;
  createdAt: number;
}

export interface AgentTeam {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  agentIds: string[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  targetType: ChatTargetType;
  targetId: string;
  companyId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  targetType: ChatTargetType;
  targetId: string;
  role: "user" | "assistant";
  agentId?: string;
  content: string;
  createdAt: number;
}

// ── Store Types ─────────────────────────────────────────────────────

export interface AppState {
  // Data
  companies: Company[];
  agents: Agent[];
  teams: AgentTeam[];
  messages: Message[];
  conversations: Conversation[];

  // Selection
  activeCompanyId: string | null;
  activeChatTarget: ChatTarget | null;
  activeConversationId: string | null;

  // Gateway connection (shared)
  connectionStatus: ConnectionStatus;

  // Agent identities
  agentIdentities: Record<string, AgentIdentity>;

  // Streaming - keyed by agentId
  streamingStates: Record<string, {
    isStreaming: boolean;
    content: string;
    runId: string | null;
    targetType: ChatTargetType;
    targetId: string;
    sessionKey: string;
  }>;

  // UI
  initialized: boolean;
}

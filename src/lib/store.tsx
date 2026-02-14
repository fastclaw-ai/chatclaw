"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getSettings,
  saveSettings,
  updateTheme,
  getAllConversations,
  createConversation,
  updateConversationTitle,
  deleteConversation as dbDeleteConversation,
  getMessages,
  addMessage,
} from "@/lib/db";
import { getGateway, resetGateway } from "@/lib/gateway";
import type {
  Settings,
  Conversation,
  Message,
  ConnectionStatus,
  AgentIdentity,
  ChatEventPayload,
  AppState,
} from "@/types";

// ── Action Types ────────────────────────────────────────────────────

type Action =
  | { type: "SET_SETTINGS"; settings: Settings | null }
  | { type: "SET_SETTINGS_LOADED" }
  | { type: "SET_CONNECTION_STATUS"; status: ConnectionStatus }
  | { type: "SET_AGENT_IDENTITY"; identity: AgentIdentity }
  | { type: "SET_CONVERSATIONS"; conversations: Conversation[] }
  | { type: "ADD_CONVERSATION"; conversation: Conversation }
  | { type: "UPDATE_CONVERSATION_TITLE"; id: string; title: string }
  | { type: "REMOVE_CONVERSATION"; id: string }
  | { type: "SET_ACTIVE_CONVERSATION"; id: string | null }
  | { type: "SET_MESSAGES"; messages: Message[] }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "SET_STREAMING"; isStreaming: boolean }
  | { type: "SET_STREAMING_CONTENT"; content: string; runId: string | null }
  | { type: "SET_THEME"; theme: "dark" | "light" };

// ── Initial State ───────────────────────────────────────────────────

const initialState: AppState = {
  settings: null,
  settingsLoaded: false,
  connectionStatus: "disconnected",
  agentIdentity: null,
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  currentRunId: null,
};

// ── Reducer ─────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "SET_SETTINGS_LOADED":
      return { ...state, settingsLoaded: true };
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.status };
    case "SET_AGENT_IDENTITY":
      return { ...state, agentIdentity: action.identity };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.conversations };
    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [action.conversation, ...state.conversations],
      };
    case "UPDATE_CONVERSATION_TITLE":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, title: action.title } : c
        ),
      };
    case "REMOVE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.id),
        activeConversationId:
          state.activeConversationId === action.id
            ? null
            : state.activeConversationId,
        messages:
          state.activeConversationId === action.id ? [] : state.messages,
      };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.id };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_STREAMING":
      return {
        ...state,
        isStreaming: action.isStreaming,
        ...(action.isStreaming ? {} : { streamingContent: "", currentRunId: null }),
      };
    case "SET_STREAMING_CONTENT":
      return {
        ...state,
        streamingContent: action.content,
        currentRunId: action.runId,
      };
    case "SET_THEME":
      return {
        ...state,
        settings: state.settings
          ? { ...state.settings, theme: action.theme }
          : null,
      };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: StoreActions;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ── Actions ─────────────────────────────────────────────────────────

interface StoreActions {
  loadSettings: () => Promise<void>;
  saveAndConnect: (url: string, token: string) => Promise<void>;
  connectGateway: () => void;
  disconnectGateway: () => void;
  loadConversations: () => Promise<void>;
  newConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, convId?: string) => Promise<void>;
  abortStreaming: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// ── Provider ────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track accumulated text for delta computation
  const lastTextRef = useRef("");

  // ── Gateway event handlers ──────────────────────────────────────

  const handleConnectionStatus = useCallback(
    (status: ConnectionStatus) => {
      dispatch({ type: "SET_CONNECTION_STATUS", status });
    },
    []
  );

  const handleChatEvent = useCallback(
    (payload: ChatEventPayload) => {
      const current = stateRef.current;
      const text =
        payload.message?.content?.[0]?.text ?? "";

      switch (payload.state) {
        case "delta": {
          dispatch({
            type: "SET_STREAMING_CONTENT",
            content: text,
            runId: payload.runId,
          });
          break;
        }
        case "final": {
          const finalText = text || current.streamingContent;
          if (finalText && current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: finalText,
              createdAt: payload.message?.timestamp ?? Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
        case "error": {
          const errText =
            payload.error || text || "An error occurred";
          if (current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: `Error: ${errText}`,
              createdAt: Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
        case "aborted": {
          // Save whatever we had
          const abortedText = current.streamingContent;
          if (abortedText && current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: abortedText,
              createdAt: Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
      }
    },
    []
  );

  const handleAgentIdentity = useCallback(
    (identity: AgentIdentity) => {
      dispatch({ type: "SET_AGENT_IDENTITY", identity });
    },
    []
  );

  const handleError = useCallback(
    (_error: string) => {
      // Could display toast notification
    },
    []
  );

  // ── Actions ─────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    dispatch({ type: "SET_SETTINGS", settings });
    dispatch({ type: "SET_SETTINGS_LOADED" });
  }, []);

  const connectGateway = useCallback(() => {
    const s = stateRef.current.settings;
    if (!s?.gatewayUrl || !s?.token) return;

    const gw = getGateway();
    gw.configure(s.gatewayUrl, s.token, {
      onConnectionStatus: handleConnectionStatus,
      onChatEvent: handleChatEvent,
      onAgentIdentity: handleAgentIdentity,
      onError: handleError,
    });
    gw.connect();
  }, [handleConnectionStatus, handleChatEvent, handleAgentIdentity, handleError]);

  const disconnectGateway = useCallback(() => {
    resetGateway();
    dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
  }, []);

  const saveAndConnect = useCallback(
    async (url: string, token: string) => {
      const theme = stateRef.current.settings?.theme ?? "dark";
      const settings = await saveSettings(url, token, theme);
      dispatch({ type: "SET_SETTINGS", settings });
      // Reconnect with new settings
      resetGateway();
      const gw = getGateway();
      gw.configure(url, token, {
        onConnectionStatus: handleConnectionStatus,
        onChatEvent: handleChatEvent,
        onAgentIdentity: handleAgentIdentity,
        onError: handleError,
      });
      gw.connect();
    },
    [handleConnectionStatus, handleChatEvent, handleAgentIdentity, handleError]
  );

  const loadConversations = useCallback(async () => {
    const conversations = await getAllConversations();
    dispatch({ type: "SET_CONVERSATIONS", conversations });
  }, []);

  const newConversation = useCallback(async () => {
    // If current conversation is empty (no messages), just stay on it
    const current = stateRef.current;
    if (current.activeConversationId) {
      const activeConv = current.conversations.find(c => c.id === current.activeConversationId);
      if (activeConv && activeConv.title === "New Chat" && current.messages.length === 0) {
        return current.activeConversationId;
      }
    }

    const id = uuidv4();
    const sessionKey = uuidv4();
    const conv = await createConversation(id, sessionKey, "New Chat");
    dispatch({ type: "ADD_CONVERSATION", conversation: conv });
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id });
    dispatch({ type: "SET_MESSAGES", messages: [] });
    return id;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id });
    const msgs = await getMessages(id);
    dispatch({ type: "SET_MESSAGES", messages: msgs });
  }, []);

  const doDeleteConversation = useCallback(async (id: string) => {
    await dbDeleteConversation(id);
    dispatch({ type: "REMOVE_CONVERSATION", id });
  }, []);

  const sendMessageAction = useCallback(async (content: string, convId?: string) => {
    const current = stateRef.current;
    const activeId = convId || current.activeConversationId; if (!activeId || current.isStreaming) return;

    const conv = current.conversations.find(
      (c) => c.id === activeId
    );
    if (!conv) return;

    // Add user message to DB and state
    const userMsg: Message = {
      id: uuidv4(),
      conversationId: activeId!,
      role: "user",
      content,
      createdAt: Date.now(),
    };
    await addMessage(userMsg);
    dispatch({ type: "ADD_MESSAGE", message: userMsg });

    // Auto-title from first message
    if (conv.title === "New Chat") {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      await updateConversationTitle(conv.id, title);
      dispatch({
        type: "UPDATE_CONVERSATION_TITLE",
        id: conv.id,
        title,
      });
    }

    // Start streaming
    dispatch({ type: "SET_STREAMING", isStreaming: true });
    lastTextRef.current = "";

    // Send via gateway
    const gw = getGateway();
    try {
      await gw.sendMessage(conv.sessionKey, content);
    } catch {
      dispatch({ type: "SET_STREAMING", isStreaming: false });
    }
  }, []);

  const abortStreaming = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isStreaming || !current.activeConversationId) return;

    const conv = current.conversations.find(
      (c) => c.id === current.activeConversationId
    );
    if (!conv) return;

    const gw = getGateway();
    try {
      await gw.abortChat(conv.sessionKey, current.currentRunId ?? undefined);
    } catch {
      // Force stop UI anyway
      dispatch({ type: "SET_STREAMING", isStreaming: false });
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const current = stateRef.current;
    const newTheme = current.settings?.theme === "light" ? "dark" : "light";
    if (current.settings) {
      await updateTheme(newTheme);
      dispatch({ type: "SET_THEME", theme: newTheme });
    }
  }, []);

  // ── Init ────────────────────────────────────────────────────────

  useEffect(() => {
    loadSettings().then(() => {
      loadConversations();
    });
    return () => {
      resetGateway();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect when settings are loaded
  useEffect(() => {
    if (state.settingsLoaded && state.settings?.gatewayUrl && state.settings?.token) {
      connectGateway();
    }
  }, [state.settingsLoaded, state.settings?.gatewayUrl, state.settings?.token, connectGateway]);

  // Theme class on html
  useEffect(() => {
    const theme = state.settings?.theme ?? "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [state.settings?.theme]);

  const actions: StoreActions = {
    loadSettings,
    saveAndConnect,
    connectGateway,
    disconnectGateway,
    loadConversations,
    newConversation,
    selectConversation,
    deleteConversation: doDeleteConversation,
    sendMessage: sendMessageAction,
    abortStreaming,
    toggleTheme,
  };

  return (
    <StoreContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </StoreContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

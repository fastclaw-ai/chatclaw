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
  getAllCompanies,
  createCompany as dbCreateCompany,
  updateCompany as dbUpdateCompany,
  deleteCompany as dbDeleteCompany,
  getAgentsByCompany,
  createAgent as dbCreateAgent,
  updateAgent as dbUpdateAgent,
  deleteAgent as dbDeleteAgent,
  getTeamsByCompany,
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  getMessagesByTarget,
  addMessage,
} from "@/lib/db";
import { GatewayClient } from "@/lib/gateway";
import type {
  Company,
  Agent,
  AgentTeam,
  Message,
  ConnectionStatus,
  AgentIdentity,
  ChatEventPayload,
  AppState,
  AgentSpecialty,
  ChatTarget,
  ChatTargetType,
} from "@/types";

// ── Session Key Helpers ────────────────────────────────────────────

function dmSessionKey(agentId: string): string {
  return `agent:${agentId}:chatclaw:dm`;
}

function teamSessionKey(agentId: string, teamId: string): string {
  return `agent:${agentId}:chatclaw:team:${teamId}`;
}

// ── Action Types ────────────────────────────────────────────────────

type Action =
  | { type: "SET_INITIALIZED" }
  | { type: "SET_COMPANIES"; companies: Company[] }
  | { type: "ADD_COMPANY"; company: Company }
  | { type: "UPDATE_COMPANY"; id: string; updates: Partial<Company> }
  | { type: "REMOVE_COMPANY"; id: string }
  | { type: "SET_AGENTS"; agents: Agent[] }
  | { type: "ADD_AGENT"; agent: Agent }
  | { type: "UPDATE_AGENT"; id: string; updates: Partial<Agent> }
  | { type: "REMOVE_AGENT"; id: string }
  | { type: "SET_TEAMS"; teams: AgentTeam[] }
  | { type: "ADD_TEAM"; team: AgentTeam }
  | { type: "UPDATE_TEAM"; id: string; updates: Partial<AgentTeam> }
  | { type: "REMOVE_TEAM"; id: string }
  | { type: "SET_ACTIVE_COMPANY"; id: string | null }
  | { type: "SET_CHAT_TARGET"; target: ChatTarget | null }
  | { type: "SET_MESSAGES"; messages: Message[] }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "SET_CONNECTION_STATUS"; status: ConnectionStatus }
  | { type: "SET_AGENT_IDENTITY"; agentId: string; identity: AgentIdentity }
  | { type: "SET_STREAMING"; agentId: string; targetType: ChatTargetType; targetId: string; sessionKey: string; isStreaming: boolean }
  | { type: "SET_STREAMING_CONTENT"; agentId: string; content: string; runId: string | null }
  | { type: "CLEAR_STREAMING"; agentId: string };

// ── Initial State ───────────────────────────────────────────────────

const initialState: AppState = {
  companies: [],
  agents: [],
  teams: [],
  messages: [],
  activeCompanyId: null,
  activeChatTarget: null,
  connectionStatus: "disconnected",
  agentIdentities: {},
  streamingStates: {},
  initialized: false,
};

// ── Reducer ─────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_INITIALIZED":
      return { ...state, initialized: true };

    case "SET_COMPANIES":
      return { ...state, companies: action.companies };
    case "ADD_COMPANY":
      return { ...state, companies: [...state.companies, action.company] };
    case "UPDATE_COMPANY":
      return {
        ...state,
        companies: state.companies.map((c) =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
      };
    case "REMOVE_COMPANY": {
      const newState = {
        ...state,
        companies: state.companies.filter((c) => c.id !== action.id),
        agents: state.agents.filter((a) => a.companyId !== action.id),
        teams: state.teams.filter((t) => t.companyId !== action.id),
      };
      if (state.activeCompanyId === action.id) {
        newState.activeCompanyId = newState.companies[0]?.id ?? null;
        newState.activeChatTarget = null;
        newState.messages = [];
      }
      return newState;
    }

    case "SET_AGENTS":
      return { ...state, agents: action.agents };
    case "ADD_AGENT":
      return { ...state, agents: [...state.agents, action.agent] };
    case "UPDATE_AGENT":
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.id ? { ...a, ...action.updates } : a
        ),
      };
    case "REMOVE_AGENT":
      return { ...state, agents: state.agents.filter((a) => a.id !== action.id) };

    case "SET_TEAMS":
      return { ...state, teams: action.teams };
    case "ADD_TEAM":
      return { ...state, teams: [...state.teams, action.team] };
    case "UPDATE_TEAM":
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.id ? { ...t, ...action.updates } : t
        ),
      };
    case "REMOVE_TEAM":
      return { ...state, teams: state.teams.filter((t) => t.id !== action.id) };

    case "SET_ACTIVE_COMPANY":
      return { ...state, activeCompanyId: action.id, activeChatTarget: null, messages: [] };
    case "SET_CHAT_TARGET":
      return { ...state, activeChatTarget: action.target };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.status };
    case "SET_AGENT_IDENTITY":
      return {
        ...state,
        agentIdentities: { ...state.agentIdentities, [action.agentId]: action.identity },
      };

    case "SET_STREAMING":
      if (action.isStreaming) {
        return {
          ...state,
          streamingStates: {
            ...state.streamingStates,
            [action.agentId]: {
              isStreaming: true,
              content: "",
              runId: null,
              targetType: action.targetType,
              targetId: action.targetId,
              sessionKey: action.sessionKey,
            },
          },
        };
      }
      return {
        ...state,
        streamingStates: Object.fromEntries(
          Object.entries(state.streamingStates).filter(([k]) => k !== action.agentId)
        ),
      };
    case "SET_STREAMING_CONTENT":
      return {
        ...state,
        streamingStates: {
          ...state.streamingStates,
          [action.agentId]: {
            ...state.streamingStates[action.agentId],
            content: action.content,
            runId: action.runId,
          },
        },
      };
    case "CLEAR_STREAMING":
      return {
        ...state,
        streamingStates: Object.fromEntries(
          Object.entries(state.streamingStates).filter(([k]) => k !== action.agentId)
        ),
      };

    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────

interface StoreActions {
  createCompany: (name: string, gatewayUrl: string, gatewayToken: string, description?: string) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  selectCompany: (id: string) => Promise<void>;

  createAgent: (opts: {
    companyId: string;
    name: string;
    description: string;
    specialty: AgentSpecialty;
  }) => Promise<Agent>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;

  createTeam: (opts: { companyId: string; name: string; description?: string; agentIds: string[] }) => Promise<AgentTeam>;
  updateTeam: (id: string, updates: Partial<AgentTeam>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  selectChatTarget: (target: ChatTarget) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  abortStreaming: (agentId: string) => Promise<void>;

  connectGateway: () => void;
  disconnectGateway: () => void;
  restartGateway: () => Promise<void>;
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: StoreActions;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const gatewayRef = useRef<GatewayClient | null>(null);
  const pendingStreamResolvers = useRef<Map<string, () => void>>(new Map());

  // ── Resolve agentId from sessionKey ───────────────────────────

  const resolveAgentFromSession = useCallback((sessionKey: string): string | null => {
    const match = sessionKey.match(/^agent:([^:]+):/);
    return match ? match[1] : null;
  }, []);

  // ── Gateway connection ───────────────────────────────────────

  const connectGateway = useCallback(() => {
    const current = stateRef.current;
    const company = current.companies.find((c) => c.id === current.activeCompanyId);
    if (!company?.gatewayUrl || !company?.gatewayToken) return;

    if (gatewayRef.current) {
      gatewayRef.current.destroy();
    }

    const client = new GatewayClient();
    gatewayRef.current = client;

    client.configure(company.gatewayUrl, company.gatewayToken, {
      onConnectionStatus: (status: ConnectionStatus) => {
        dispatch({ type: "SET_CONNECTION_STATUS", status });
      },
      onChatEvent: (payload: ChatEventPayload) => {
        const agentId = resolveAgentFromSession(payload.sessionKey);
        if (!agentId) return;

        const current = stateRef.current;
        const streaming = current.streamingStates[agentId];
        const text = payload.message?.content?.[0]?.text ?? "";

        switch (payload.state) {
          case "delta": {
            dispatch({
              type: "SET_STREAMING_CONTENT",
              agentId,
              content: text,
              runId: payload.runId,
            });
            break;
          }
          case "final": {
            const finalText = text || streaming?.content || "";
            if (finalText && streaming) {
              const msg: Message = {
                id: uuidv4(),
                targetType: streaming.targetType,
                targetId: streaming.targetId,
                role: "assistant",
                agentId,
                content: finalText,
                createdAt: payload.message?.timestamp ?? Date.now(),
              };
              addMessage(msg).then(() => {
                const s = stateRef.current;
                if (s.activeChatTarget?.type === streaming.targetType && s.activeChatTarget?.id === streaming.targetId) {
                  dispatch({ type: "ADD_MESSAGE", message: msg });
                }
              });
            }
            dispatch({ type: "SET_STREAMING", agentId, targetType: streaming?.targetType ?? "agent", targetId: streaming?.targetId ?? "", sessionKey: "", isStreaming: false });
            const finalResolver = pendingStreamResolvers.current.get(agentId);
            if (finalResolver) {
              pendingStreamResolvers.current.delete(agentId);
              finalResolver();
            }
            break;
          }
          case "error": {
            const errText = payload.error || text || "An error occurred";
            if (streaming) {
              const msg: Message = {
                id: uuidv4(),
                targetType: streaming.targetType,
                targetId: streaming.targetId,
                role: "assistant",
                agentId,
                content: `Error: ${errText}`,
                createdAt: Date.now(),
              };
              addMessage(msg).then(() => {
                const s = stateRef.current;
                if (s.activeChatTarget?.type === streaming.targetType && s.activeChatTarget?.id === streaming.targetId) {
                  dispatch({ type: "ADD_MESSAGE", message: msg });
                }
              });
            }
            dispatch({ type: "SET_STREAMING", agentId, targetType: streaming?.targetType ?? "agent", targetId: streaming?.targetId ?? "", sessionKey: "", isStreaming: false });
            const errorResolver = pendingStreamResolvers.current.get(agentId);
            if (errorResolver) {
              pendingStreamResolvers.current.delete(agentId);
              errorResolver();
            }
            break;
          }
          case "aborted": {
            const abortedText = streaming?.content;
            if (abortedText && streaming) {
              const msg: Message = {
                id: uuidv4(),
                targetType: streaming.targetType,
                targetId: streaming.targetId,
                role: "assistant",
                agentId,
                content: abortedText,
                createdAt: Date.now(),
              };
              addMessage(msg).then(() => {
                const s = stateRef.current;
                if (s.activeChatTarget?.type === streaming.targetType && s.activeChatTarget?.id === streaming.targetId) {
                  dispatch({ type: "ADD_MESSAGE", message: msg });
                }
              });
            }
            dispatch({ type: "SET_STREAMING", agentId, targetType: streaming?.targetType ?? "agent", targetId: streaming?.targetId ?? "", sessionKey: "", isStreaming: false });
            const abortedResolver = pendingStreamResolvers.current.get(agentId);
            if (abortedResolver) {
              pendingStreamResolvers.current.delete(agentId);
              abortedResolver();
            }
            break;
          }
        }
      },
      onError: () => {},
    });

    client.connect();
  }, [resolveAgentFromSession]);

  const disconnectGateway = useCallback(() => {
    if (gatewayRef.current) {
      gatewayRef.current.destroy();
      gatewayRef.current = null;
    }
    dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────

  const createCompanyAction = useCallback(async (name: string, gatewayUrl: string, gatewayToken: string, description?: string) => {
    const now = Date.now();
    const company: Company = {
      id: uuidv4(),
      name,
      description,
      gatewayUrl,
      gatewayToken,
      createdAt: now,
      updatedAt: now,
    };
    await dbCreateCompany(company);
    dispatch({ type: "ADD_COMPANY", company });
    return company;
  }, []);

  const updateCompanyAction = useCallback(async (id: string, updates: Partial<Company>) => {
    await dbUpdateCompany(id, updates);
    dispatch({ type: "UPDATE_COMPANY", id, updates });

    if (updates.gatewayUrl || updates.gatewayToken) {
      const current = stateRef.current;
      if (current.activeCompanyId === id) {
        setTimeout(() => connectGateway(), 100);
      }
    }
  }, [connectGateway]);

  const deleteCompanyAction = useCallback(async (id: string) => {
    const current = stateRef.current;
    if (current.activeCompanyId === id) {
      disconnectGateway();
    }
    await dbDeleteCompany(id);
    dispatch({ type: "REMOVE_COMPANY", id });
  }, [disconnectGateway]);

  const selectCompanyAction = useCallback(async (id: string) => {
    disconnectGateway();
    dispatch({ type: "SET_ACTIVE_COMPANY", id });

    const [agents, teams] = await Promise.all([
      getAgentsByCompany(id),
      getTeamsByCompany(id),
    ]);
    dispatch({ type: "SET_AGENTS", agents });
    dispatch({ type: "SET_TEAMS", teams });

    setTimeout(() => connectGateway(), 50);
  }, [disconnectGateway, connectGateway]);

  const createAgentAction = useCallback(async (opts: {
    companyId: string;
    name: string;
    description: string;
    specialty: AgentSpecialty;
  }) => {
    const agent: Agent = {
      id: uuidv4(),
      companyId: opts.companyId,
      name: opts.name,
      description: opts.description,
      specialty: opts.specialty,
      createdAt: Date.now(),
    };

    await dbCreateAgent(agent);
    dispatch({ type: "ADD_AGENT", agent });

    try {
      await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          name: agent.name,
          description: agent.description,
          specialty: agent.specialty,
        }),
      });
    } catch {
      // Non-critical
    }

    return agent;
  }, []);

  const updateAgentAction = useCallback(async (id: string, updates: Partial<Agent>) => {
    await dbUpdateAgent(id, updates);
    dispatch({ type: "UPDATE_AGENT", id, updates });
  }, []);

  const deleteAgentAction = useCallback(async (id: string) => {
    await dbDeleteAgent(id);
    dispatch({ type: "REMOVE_AGENT", id });

    try {
      await fetch("/api/agents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id }),
      });
    } catch {
      // Non-critical
    }

    // Clear chat if this was the active target
    const current = stateRef.current;
    if (current.activeChatTarget?.type === "agent" && current.activeChatTarget?.id === id) {
      dispatch({ type: "SET_CHAT_TARGET", target: null });
      dispatch({ type: "SET_MESSAGES", messages: [] });
    }
  }, []);

  const createTeamAction = useCallback(async (opts: { companyId: string; name: string; description?: string; agentIds: string[] }) => {
    const team: AgentTeam = {
      id: uuidv4(),
      companyId: opts.companyId,
      name: opts.name,
      description: opts.description,
      agentIds: opts.agentIds,
      createdAt: Date.now(),
    };
    await dbCreateTeam(team);
    dispatch({ type: "ADD_TEAM", team });
    return team;
  }, []);

  const updateTeamAction = useCallback(async (id: string, updates: Partial<AgentTeam>) => {
    await dbUpdateTeam(id, updates);
    dispatch({ type: "UPDATE_TEAM", id, updates });
  }, []);

  const deleteTeamAction = useCallback(async (id: string) => {
    await dbDeleteTeam(id);
    dispatch({ type: "REMOVE_TEAM", id });
    const current = stateRef.current;
    if (current.activeChatTarget?.type === "team" && current.activeChatTarget?.id === id) {
      dispatch({ type: "SET_CHAT_TARGET", target: null });
      dispatch({ type: "SET_MESSAGES", messages: [] });
    }
  }, []);

  const selectChatTargetAction = useCallback(async (target: ChatTarget) => {
    dispatch({ type: "SET_CHAT_TARGET", target });
    const msgs = await getMessagesByTarget(target.type, target.id);
    dispatch({ type: "SET_MESSAGES", messages: msgs });
  }, []);

  const sendMessageAction = useCallback(async (content: string) => {
    const current = stateRef.current;
    const target = current.activeChatTarget;
    if (!target) return;

    const client = gatewayRef.current;
    if (!client || !client.isConnected()) return;

    const userMsg: Message = {
      id: uuidv4(),
      targetType: target.type,
      targetId: target.id,
      role: "user",
      content,
      createdAt: Date.now(),
    };
    await addMessage(userMsg);
    dispatch({ type: "ADD_MESSAGE", message: userMsg });

    if (target.type === "agent") {
      const sessionKey = dmSessionKey(target.id);
      dispatch({
        type: "SET_STREAMING",
        agentId: target.id,
        targetType: "agent",
        targetId: target.id,
        sessionKey,
        isStreaming: true,
      });
      try {
        await client.sendMessage(sessionKey, content);
      } catch {
        dispatch({ type: "SET_STREAMING", agentId: target.id, targetType: "agent", targetId: target.id, sessionKey, isStreaming: false });
      }
    } else {
      const team = current.teams.find((t) => t.id === target.id);
      if (!team) return;

      const STREAM_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      // Build full team conversation history from existing messages
      const teamHistory = current.messages
        .filter(m => m.targetType === "team" && m.targetId === target.id)
        .map(m => {
          if (m.role === "user") return `[User]: ${m.content}`;
          const agent = current.agents.find(a => a.id === m.agentId);
          return `[${agent?.name || m.agentId || "Assistant"}]: ${m.content}`;
        })
        .join("\n\n");

      let currentRoundReplies: Array<{ agentName: string; content: string }> = [];

      for (const agentId of team.agentIds) {
        const sessionKey = teamSessionKey(agentId, target.id);
        dispatch({
          type: "SET_STREAMING",
          agentId,
          targetType: "team",
          targetId: target.id,
          sessionKey,
          isStreaming: true,
        });
        try {
          // Build full context: history + current round replies + new message
          let messageToSend = content;
          const contextParts: string[] = [];

          if (teamHistory) {
            contextParts.push(`[Team conversation history]\n${teamHistory}`);
          }

          if (currentRoundReplies.length > 0) {
            const roundContext = currentRoundReplies
              .map(r => `[${r.agentName}]: ${r.content}`)
              .join("\n\n");
            contextParts.push(`[Current round replies]\n${roundContext}`);
          }

          if (contextParts.length > 0) {
            messageToSend = `${contextParts.join("\n\n")}\n\n[New user message]\n${content}`;
          }

          await client.sendMessage(sessionKey, messageToSend);

          // Wait for this agent's streaming to complete before sending to the next
          await Promise.race([
            new Promise<void>((resolve) => {
              pendingStreamResolvers.current.set(agentId, resolve);
            }),
            new Promise<void>((resolve) => setTimeout(() => {
              pendingStreamResolvers.current.delete(agentId);
              resolve();
            }, STREAM_TIMEOUT)),
          ]);

          // Collect this agent's reply for the next agent's context in this round
          const latestState = stateRef.current;
          const agentReply = [...latestState.messages].reverse().find(
            (m) => m.role === "assistant" && m.agentId === agentId && m.targetId === target.id
          );
          if (agentReply) {
            const agent = latestState.agents.find((a) => a.id === agentId);
            currentRoundReplies.push({ agentName: agent?.name || agentId, content: agentReply.content });
          }
        } catch {
          dispatch({ type: "SET_STREAMING", agentId, targetType: "team", targetId: target.id, sessionKey, isStreaming: false });
        }
      }
    }
  }, []);

  const abortStreamingAction = useCallback(async (agentId: string) => {
    const current = stateRef.current;
    const streaming = current.streamingStates[agentId];
    if (!streaming) return;

    const client = gatewayRef.current;
    if (client) {
      try {
        await client.abortChat(streaming.sessionKey, streaming.runId ?? undefined);
      } catch {
        dispatch({ type: "CLEAR_STREAMING", agentId });
      }
    }
  }, []);

  const restartGatewayAction = useCallback(async () => {
    try {
      await fetch("/api/gateway/restart", { method: "POST" });
      disconnectGateway();
      setTimeout(() => connectGateway(), 2000);
    } catch {
      // Failed to restart
    }
  }, [disconnectGateway, connectGateway]);

  // ── Init ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const companies = await getAllCompanies();

      if (companies.length === 0) {
        // Bootstrap from OpenClaw config
        try {
          const res = await fetch("/api/bootstrap");
          const data = await res.json();
          if (data.found) {
            const companyId = uuidv4();
            const company: Company = {
              id: companyId,
              name: "OpenClaw",
              description: "Auto-configured from OpenClaw Gateway",
              gatewayUrl: data.gateway.url,
              gatewayToken: data.gateway.token,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await dbCreateCompany(company);
            dispatch({ type: "ADD_COMPANY", company });
            dispatch({ type: "SET_ACTIVE_COMPANY", id: companyId });

            for (const agentConfig of data.agents) {
              const agent: Agent = {
                id: agentConfig.id,
                companyId,
                name: agentConfig.name,
                description: `OpenClaw agent: ${agentConfig.name}`,
                specialty: "general" as AgentSpecialty,
                createdAt: Date.now(),
              };
              await dbCreateAgent(agent);
              dispatch({ type: "ADD_AGENT", agent });
            }
          }
        } catch {
          // Bootstrap failed, user can configure manually
        }
      } else {
        dispatch({ type: "SET_COMPANIES", companies });
        const firstId = companies[0].id;
        dispatch({ type: "SET_ACTIVE_COMPANY", id: firstId });

        const [agents, teams] = await Promise.all([
          getAgentsByCompany(firstId),
          getTeamsByCompany(firstId),
        ]);
        dispatch({ type: "SET_AGENTS", agents });
        dispatch({ type: "SET_TEAMS", teams });
      }

      dispatch({ type: "SET_INITIALIZED" });
    }

    init();

    return () => {
      if (gatewayRef.current) {
        gatewayRef.current.destroy();
        gatewayRef.current = null;
      }
    };
  }, []);

  // Connect gateway when company/config changes
  useEffect(() => {
    if (!state.initialized) return;
    const company = state.companies.find((c) => c.id === state.activeCompanyId);
    if (company?.gatewayUrl && company?.gatewayToken) {
      connectGateway();
    }
  }, [state.initialized, state.activeCompanyId, connectGateway]);

  const actions: StoreActions = {
    createCompany: createCompanyAction,
    updateCompany: updateCompanyAction,
    deleteCompany: deleteCompanyAction,
    selectCompany: selectCompanyAction,
    createAgent: createAgentAction,
    updateAgent: updateAgentAction,
    deleteAgent: deleteAgentAction,
    createTeam: createTeamAction,
    updateTeam: updateTeamAction,
    deleteTeam: deleteTeamAction,
    selectChatTarget: selectChatTargetAction,
    sendMessage: sendMessageAction,
    abortStreaming: abortStreamingAction,
    connectGateway,
    disconnectGateway,
    restartGateway: restartGatewayAction,
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

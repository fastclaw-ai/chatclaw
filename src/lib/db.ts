import type { Company, Agent, AgentTeam, Message, Conversation } from "@/types";

type DbModule = typeof import("./db-indexeddb");

let impl: DbModule;
let backendResolved = "";

async function getBackend(): Promise<string> {
  if (backendResolved !== "") return backendResolved;

  // Server-side: read env directly
  if (typeof window === "undefined") {
    backendResolved = process.env.DB_BACKEND || "indexeddb";
    return backendResolved;
  }

  // Client-side: fetch from config API
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    backendResolved = data.dbBackend || "indexeddb";
  } catch {
    backendResolved = "indexeddb";
  }
  return backendResolved;
}

async function getImpl(): Promise<DbModule> {
  if (!impl) {
    const backend = await getBackend();
    if (backend === "drizzle") {
      impl = await import("./db-drizzle");
    } else {
      impl = await import("./db-indexeddb");
    }
  }
  return impl;
}

// ── Company helpers ────────────────────────────────────────────────

export async function getAllCompanies(): Promise<Company[]> {
  return (await getImpl()).getAllCompanies();
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return (await getImpl()).getCompany(id);
}

export async function createCompany(company: Company): Promise<void> {
  return (await getImpl()).createCompany(company);
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<void> {
  return (await getImpl()).updateCompany(id, updates);
}

export async function deleteCompany(id: string): Promise<void> {
  return (await getImpl()).deleteCompany(id);
}

// ── Agent helpers ──────────────────────────────────────────────────

export async function getAgentsByCompany(companyId: string): Promise<Agent[]> {
  return (await getImpl()).getAgentsByCompany(companyId);
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  return (await getImpl()).getAgent(id);
}

export async function createAgent(agent: Agent): Promise<void> {
  return (await getImpl()).createAgent(agent);
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<void> {
  return (await getImpl()).updateAgent(id, updates);
}

export async function deleteAgent(id: string): Promise<void> {
  return (await getImpl()).deleteAgent(id);
}

// ── Team helpers ───────────────────────────────────────────────────

export async function getTeamsByCompany(companyId: string): Promise<AgentTeam[]> {
  return (await getImpl()).getTeamsByCompany(companyId);
}

export async function createTeam(team: AgentTeam): Promise<void> {
  return (await getImpl()).createTeam(team);
}

export async function updateTeam(id: string, updates: Partial<AgentTeam>): Promise<void> {
  return (await getImpl()).updateTeam(id, updates);
}

export async function deleteTeam(id: string): Promise<void> {
  return (await getImpl()).deleteTeam(id);
}

// ── Message helpers ────────────────────────────────────────────────

export async function getMessagesByTarget(targetType: string, targetId: string): Promise<Message[]> {
  return (await getImpl()).getMessagesByTarget(targetType, targetId);
}

export async function addMessage(message: Message): Promise<void> {
  return (await getImpl()).addMessage(message);
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  return (await getImpl()).getMessagesByConversation(conversationId);
}

// ── Conversation helpers ──────────────────────────────────────────

export async function getConversationsByTarget(targetType: string, targetId: string): Promise<Conversation[]> {
  return (await getImpl()).getConversationsByTarget(targetType, targetId);
}

export async function createConversation(conv: Conversation): Promise<void> {
  return (await getImpl()).createConversation(conv);
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
  return (await getImpl()).updateConversation(id, updates);
}

export async function deleteConversation(id: string): Promise<void> {
  return (await getImpl()).deleteConversation(id);
}

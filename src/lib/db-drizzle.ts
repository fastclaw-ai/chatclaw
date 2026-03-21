import type { Company, Agent, AgentTeam, Message, Conversation } from "@/types";

async function call(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `DB API error: ${res.status}`);
  }
  return res.json();
}

// ── Company helpers ────────────────────────────────────────────────

export async function getAllCompanies(): Promise<Company[]> {
  const res = (await call("getAllCompanies")) as { data: Company[] };
  return res.data;
}

export async function getCompany(id: string): Promise<Company | undefined> {
  const res = (await call("getAllCompanies")) as { data: Company[] };
  return res.data.find((c) => c.id === id);
}

export async function createCompany(company: Company): Promise<void> {
  await call("createCompany", company as unknown as Record<string, unknown>);
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<void> {
  await call("updateCompany", { id, updates });
}

export async function deleteCompany(id: string): Promise<void> {
  await call("deleteCompany", { id });
}

// ── Agent helpers ──────────────────────────────────────────────────

export async function getAgentsByCompany(companyId: string): Promise<Agent[]> {
  const res = (await call("getAgentsByCompany", { companyId })) as { data: Agent[] };
  return res.data;
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  return undefined;
}

export async function createAgent(agent: Agent): Promise<void> {
  await call("createAgent", agent as unknown as Record<string, unknown>);
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<void> {
  await call("updateAgent", { id, updates });
}

export async function deleteAgent(id: string): Promise<void> {
  await call("deleteAgent", { id });
}

// ── Team helpers ───────────────────────────────────────────────────

export async function getTeamsByCompany(companyId: string): Promise<AgentTeam[]> {
  const res = (await call("getTeamsByCompany", { companyId })) as { data: AgentTeam[] };
  return res.data;
}

export async function createTeam(team: AgentTeam): Promise<void> {
  await call("createTeam", team as unknown as Record<string, unknown>);
}

export async function updateTeam(id: string, updates: Partial<AgentTeam>): Promise<void> {
  await call("updateTeam", { id, updates });
}

export async function deleteTeam(id: string): Promise<void> {
  await call("deleteTeam", { id });
}

// ── Message helpers ────────────────────────────────────────────────

export async function getMessagesByTarget(targetType: string, targetId: string): Promise<Message[]> {
  const res = (await call("getMessagesByTarget", { targetType, targetId })) as { data: Message[] };
  return res.data;
}

export async function addMessage(message: Message): Promise<void> {
  await call("addMessage", message as unknown as Record<string, unknown>);
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const res = (await call("getMessagesByConversation", { conversationId })) as { data: Message[] };
  return res.data;
}

// ── Conversation helpers ──────────────────────────────────────────

export async function getConversationsByTarget(targetType: string, targetId: string, companyId?: string): Promise<Conversation[]> {
  const res = (await call("getConversationsByTarget", { targetType, targetId, companyId })) as { data: Conversation[] };
  return res.data;
}

export async function createConversation(conv: Conversation): Promise<void> {
  await call("createConversation", conv as unknown as Record<string, unknown>);
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
  await call("updateConversation", { id, updates });
}

export async function deleteConversation(id: string): Promise<void> {
  await call("deleteConversation", { id });
}

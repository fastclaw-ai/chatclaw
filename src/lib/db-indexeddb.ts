import Dexie, { type EntityTable } from "dexie";
import type { Company, Agent, AgentTeam, Message, Conversation } from "@/types";

// ── Database Schema ────────────────────────────────────────────────

const db = new Dexie("chatclaw") as Dexie & {
  companies: EntityTable<Company, "id">;
  agents: EntityTable<Agent, "id">;
  teams: EntityTable<AgentTeam, "id">;
  messages: EntityTable<Message, "id">;
  conversations: EntityTable<Conversation, "id">;
};

db.version(1).stores({
  companies: "id, updatedAt",
  agents: "id, companyId",
  teams: "id, companyId",
  messages: "id, [targetType+targetId], createdAt",
});

db.version(2).stores({
  companies: "id, updatedAt",
  agents: "id, companyId",
  teams: "id, companyId",
  messages: "id, conversationId, [targetType+targetId], createdAt",
  conversations: "id, companyId, [targetType+targetId], updatedAt",
});

// ── Company helpers ────────────────────────────────────────────────

export async function getAllCompanies(): Promise<Company[]> {
  return db.companies.orderBy("updatedAt").reverse().toArray();
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return db.companies.get(id);
}

export async function createCompany(company: Company): Promise<void> {
  await db.companies.add(company);
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<void> {
  await db.companies.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteCompany(id: string): Promise<void> {
  await db.transaction("rw", [db.companies, db.agents, db.teams, db.messages], async () => {
    const agents = await db.agents.where("companyId").equals(id).toArray();
    const teams = await db.teams.where("companyId").equals(id).toArray();
    for (const agent of agents) {
      await db.messages.where("[targetType+targetId]").equals(["agent", agent.id]).delete();
    }
    for (const team of teams) {
      await db.messages.where("[targetType+targetId]").equals(["team", team.id]).delete();
    }
    await db.teams.where("companyId").equals(id).delete();
    await db.agents.where("companyId").equals(id).delete();
    await db.companies.delete(id);
  });
}

// ── Agent helpers ──────────────────────────────────────────────────

export async function getAgentsByCompany(companyId: string): Promise<Agent[]> {
  return db.agents.where("companyId").equals(companyId).toArray();
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  return db.agents.get(id);
}

export async function createAgent(agent: Agent): Promise<void> {
  await db.agents.add(agent);
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<void> {
  await db.agents.update(id, updates);
}

export async function deleteAgent(id: string): Promise<void> {
  await db.transaction("rw", [db.agents, db.teams, db.messages], async () => {
    const teams = await db.teams.toArray();
    for (const team of teams) {
      if (team.agentIds.includes(id)) {
        await db.teams.update(team.id, {
          agentIds: team.agentIds.filter((a) => a !== id),
        });
      }
    }
    await db.messages.where("[targetType+targetId]").equals(["agent", id]).delete();
    await db.agents.delete(id);
  });
}

// ── Team helpers ───────────────────────────────────────────────────

export async function getTeamsByCompany(companyId: string): Promise<AgentTeam[]> {
  return db.teams.where("companyId").equals(companyId).toArray();
}

export async function createTeam(team: AgentTeam): Promise<void> {
  await db.teams.add(team);
}

export async function updateTeam(id: string, updates: Partial<AgentTeam>): Promise<void> {
  await db.teams.update(id, updates);
}

export async function deleteTeam(id: string): Promise<void> {
  await db.transaction("rw", db.teams, db.messages, async () => {
    await db.messages.where("[targetType+targetId]").equals(["team", id]).delete();
    await db.teams.delete(id);
  });
}

// ── Message helpers ────────────────────────────────────────────────

export async function getMessagesByTarget(targetType: string, targetId: string): Promise<Message[]> {
  return db.messages
    .where("[targetType+targetId]")
    .equals([targetType, targetId])
    .sortBy("createdAt");
}

export async function addMessage(message: Message): Promise<void> {
  await db.messages.add(message);
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  return db.messages.where("conversationId").equals(conversationId).sortBy("createdAt");
}

// ── Conversation helpers ──────────────────────────────────────────

export async function getConversationsByTarget(targetType: string, targetId: string): Promise<Conversation[]> {
  return db.conversations.where("[targetType+targetId]").equals([targetType, targetId]).reverse().sortBy("updatedAt");
}

export async function createConversation(conv: Conversation): Promise<void> {
  await db.conversations.add(conv);
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
  await db.conversations.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", [db.conversations, db.messages], async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

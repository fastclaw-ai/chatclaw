import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/drizzle";
import { eq, and } from "drizzle-orm";

function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { action, params } = await req.json();

  try {
    switch (action) {
      case "getAllCompanies": {
        const rows = getDb().select().from(schema.companies).orderBy(schema.companies.updatedAt).all().reverse();
        return NextResponse.json({ data: rows.map(snakeToCamel) });
      }
      case "createCompany": {
        getDb().insert(schema.companies).values({
          id: params.id,
          name: params.name,
          logo: params.logo || null,
          description: params.description || null,
          gatewayUrl: params.gatewayUrl || "",
          gatewayToken: params.gatewayToken || "",
          createdAt: params.createdAt,
          updatedAt: params.updatedAt,
        }).run();
        return NextResponse.json({ ok: true });
      }
      case "updateCompany": {
        const updates = camelToSnake(params.updates);
        updates.updated_at = Date.now();
        getDb().update(schema.companies)
          .set(updates)
          .where(eq(schema.companies.id, params.id))
          .run();
        return NextResponse.json({ ok: true });
      }
      case "deleteCompany": {
        const agents = getDb().select().from(schema.agents).where(eq(schema.agents.companyId, params.id)).all();
        const teams = getDb().select().from(schema.teams).where(eq(schema.teams.companyId, params.id)).all();
        for (const agent of agents) {
          getDb().delete(schema.messages).where(
            and(eq(schema.messages.targetType, "agent"), eq(schema.messages.targetId, agent.id))
          ).run();
        }
        for (const team of teams) {
          getDb().delete(schema.messages).where(
            and(eq(schema.messages.targetType, "team"), eq(schema.messages.targetId, team.id))
          ).run();
        }
        getDb().delete(schema.teams).where(eq(schema.teams.companyId, params.id)).run();
        getDb().delete(schema.agents).where(eq(schema.agents.companyId, params.id)).run();
        getDb().delete(schema.companies).where(eq(schema.companies.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      case "getAgentsByCompany": {
        const rows = getDb().select().from(schema.agents).where(eq(schema.agents.companyId, params.companyId)).all();
        return NextResponse.json({ data: rows.map(snakeToCamel) });
      }
      case "createAgent": {
        getDb().insert(schema.agents).values({
          id: params.id,
          companyId: params.companyId,
          name: params.name,
          avatar: params.avatar || null,
          description: params.description || "",
          specialty: params.specialty || "general",
          createdAt: params.createdAt,
        }).run();
        return NextResponse.json({ ok: true });
      }
      case "updateAgent": {
        const updates = camelToSnake(params.updates);
        getDb().update(schema.agents).set(updates).where(eq(schema.agents.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      case "deleteAgent": {
        const allTeams = getDb().select().from(schema.teams).all();
        for (const team of allTeams) {
          const ids = JSON.parse(team.agentIds) as string[];
          if (ids.includes(params.id)) {
            getDb().update(schema.teams)
              .set({ agentIds: JSON.stringify(ids.filter((a: string) => a !== params.id)) })
              .where(eq(schema.teams.id, team.id))
              .run();
          }
        }
        getDb().delete(schema.messages).where(
          and(eq(schema.messages.targetType, "agent"), eq(schema.messages.targetId, params.id))
        ).run();
        getDb().delete(schema.agents).where(eq(schema.agents.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      case "getTeamsByCompany": {
        const rows = getDb().select().from(schema.teams).where(eq(schema.teams.companyId, params.companyId)).all();
        const parsed = rows.map((r) => {
          const obj = snakeToCamel(r as unknown as Record<string, unknown>);
          obj.agentIds = JSON.parse(r.agentIds);
          return obj;
        });
        return NextResponse.json({ data: parsed });
      }
      case "createTeam": {
        getDb().insert(schema.teams).values({
          id: params.id,
          companyId: params.companyId,
          name: params.name,
          description: params.description || null,
          agentIds: JSON.stringify(params.agentIds || []),
          createdAt: params.createdAt,
        }).run();
        return NextResponse.json({ ok: true });
      }
      case "updateTeam": {
        const updates = camelToSnake(params.updates);
        if (updates.agent_ids && Array.isArray(updates.agent_ids)) {
          updates.agent_ids = JSON.stringify(updates.agent_ids);
        }
        getDb().update(schema.teams).set(updates).where(eq(schema.teams.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      case "deleteTeam": {
        getDb().delete(schema.messages).where(
          and(eq(schema.messages.targetType, "team"), eq(schema.messages.targetId, params.id))
        ).run();
        getDb().delete(schema.teams).where(eq(schema.teams.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      case "getMessagesByTarget": {
        const rows = getDb().select().from(schema.messages)
          .where(and(
            eq(schema.messages.targetType, params.targetType),
            eq(schema.messages.targetId, params.targetId)
          ))
          .orderBy(schema.messages.createdAt)
          .all();
        return NextResponse.json({ data: rows.map(snakeToCamel) });
      }
      case "addMessage": {
        getDb().insert(schema.messages).values({
          id: params.id,
          conversationId: params.conversationId || "",
          targetType: params.targetType,
          targetId: params.targetId,
          role: params.role,
          agentId: params.agentId || null,
          content: params.content || "",
          createdAt: params.createdAt,
        }).run();
        return NextResponse.json({ ok: true });
      }
      case "getMessagesByConversation": {
        const rows = getDb().select().from(schema.messages)
          .where(eq(schema.messages.conversationId, params.conversationId))
          .orderBy(schema.messages.createdAt)
          .all();
        return NextResponse.json({ data: rows.map(snakeToCamel) });
      }
      case "getConversationsByTarget": {
        const rows = getDb().select().from(schema.conversations)
          .where(and(
            eq(schema.conversations.targetType, params.targetType),
            eq(schema.conversations.targetId, params.targetId)
          ))
          .all()
          .sort((a, b) => b.updatedAt - a.updatedAt);
        return NextResponse.json({ data: rows.map(snakeToCamel) });
      }
      case "createConversation": {
        getDb().insert(schema.conversations).values({
          id: params.id,
          targetType: params.targetType,
          targetId: params.targetId,
          companyId: params.companyId,
          title: params.title || "New Chat",
          createdAt: params.createdAt,
          updatedAt: params.updatedAt,
        }).run();
        return NextResponse.json({ ok: true });
      }
      case "updateConversation": {
        const updates = camelToSnake(params.updates);
        updates.updated_at = Date.now();
        getDb().update(schema.conversations)
          .set(updates)
          .where(eq(schema.conversations.id, params.id))
          .run();
        return NextResponse.json({ ok: true });
      }
      case "deleteConversation": {
        getDb().delete(schema.messages).where(eq(schema.messages.conversationId, params.id)).run();
        getDb().delete(schema.conversations).where(eq(schema.conversations.id, params.id)).run();
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

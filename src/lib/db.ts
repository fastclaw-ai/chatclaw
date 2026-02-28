import Dexie, { type EntityTable } from "dexie";
import type { Settings, Conversation, Message } from "@/types";

const db = new Dexie("chatclaw") as Dexie & {
  settings: EntityTable<Settings, "id">;
  conversations: EntityTable<Conversation, "id">;
  messages: EntityTable<Message, "id">;
};

db.version(1).stores({
  settings: "id",
  conversations: "id, sessionKey, updatedAt",
  messages: "id, conversationId, createdAt",
});

export { db };

// ── Settings helpers ────────────────────────────────────────────────

const SETTINGS_KEY = "default";

export async function getSettings(): Promise<Settings | null> {
  return (await db.settings.get(SETTINGS_KEY)) ?? null;
}

export async function saveSettings(
  gatewayUrl: string,
  token: string,
  theme: "dark" | "light" = "dark"
): Promise<Settings> {
  const settings: Settings = { id: SETTINGS_KEY, gatewayUrl, token, theme };
  await db.settings.put(settings);
  return settings;
}

export async function updateTheme(theme: "dark" | "light"): Promise<void> {
  await db.settings.update(SETTINGS_KEY, { theme });
}

// ── Conversation helpers ────────────────────────────────────────────

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return db.conversations.get(id);
}

export async function getAllConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy("updatedAt").reverse().toArray();
}

export async function createConversation(
  id: string,
  sessionKey: string,
  title: string
): Promise<Conversation> {
  const now = Date.now();
  const conv: Conversation = { id, title, sessionKey, createdAt: now, updatedAt: now };
  await db.conversations.add(conv);
  return conv;
}

export async function updateConversationTitle(
  id: string,
  title: string
): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: Date.now() });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

export async function deleteAllConversations(): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.clear();
    await db.conversations.clear();
  });
}

// ── Message helpers ─────────────────────────────────────────────────

export async function getMessages(conversationId: string): Promise<Message[]> {
  return db.messages
    .where("conversationId")
    .equals(conversationId)
    .sortBy("createdAt");
}

export async function addMessage(message: Message): Promise<void> {
  await db.messages.add(message);
  await db.conversations.update(message.conversationId, {
    updatedAt: Date.now(),
  });
}

export async function searchConversations(query: string): Promise<Conversation[]> {
  const lower = query.toLowerCase();
  const all = await getAllConversations();
  return all.filter((c) => c.title.toLowerCase().includes(lower));
}

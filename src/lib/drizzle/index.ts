import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const { join } = require("path");
    const { existsSync, mkdirSync } = require("fs");

    const DATA_DIR = process.env.CHATCLAW_DATA_DIR || join(process.cwd(), "data");
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    const sqlite = new Database(join(DATA_DIR, "chatclaw.db"));
    sqlite.pragma("journal_mode = WAL");

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
        password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, logo TEXT, description TEXT,
        runtime_type TEXT NOT NULL DEFAULT 'openclaw',
        gateway_url TEXT NOT NULL DEFAULT '', gateway_token TEXT NOT NULL DEFAULT '',
        model TEXT, custom_headers TEXT,
        user_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT,
        description TEXT NOT NULL DEFAULT '', specialty TEXT NOT NULL DEFAULT 'general',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
        agent_ids TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL DEFAULT '',
        target_type TEXT NOT NULL, target_id TEXT NOT NULL,
        role TEXT NOT NULL, agent_id TEXT, content TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
        company_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'New Chat',
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
    `);

    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export { schema };

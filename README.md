# ChatClaw

An open-source multi-agent chat platform. Create virtual companies, hire AI agent employees, build teams for collaborative work.

Works with [OpenClaw](https://github.com/openclaw/openclaw) gateway or any OpenAI-compatible API.

![ChatClaw Preview](./preview.png)

## Features

### Multi-Agent Chat
- DM with individual agents or group chat with teams
- Agents reply sequentially in teams, each seeing the full conversation context
- Multi-message streaming — agents can send multiple messages in one response (like Discord/Telegram)
- Real-time tool call display with collapsible arguments/results and inline image rendering
- Image and file upload via paperclip button or clipboard paste
- Markdown rendering with syntax-highlighted code blocks
- Message actions: copy, retry

### Customizable Avatars
- Shared `AvatarPicker` component used across company, agent, team, and user profiles
- Three modes: **Random** (8 DiceBear styles, re-randomized on each click), **Emoji** (curated grid), **Upload** (resized to 128x128, max 128KB)
- Circle shape for agents/users, rounded for companies/teams

### Company & Gateway
- Create companies connected to OpenClaw gateways
- Auto-detect local gateway on setup
- Test connection before saving
- Edit `openclaw.json` config directly in the UI with JSON validation
- Multi-company mode with dropdown switcher (optional)

### Agent Configuration
- Per-agent workspace file editors: `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`
- Auto-sync agents from OpenClaw gateway
- View installed skills (global + agent-specific)
- Custom avatar, name, and description per agent
- Default agent protected from deletion

### Team Management
- Create teams with multiple agents
- Custom team avatars and descriptions
- Member selection from company agents
- Delete confirmation dialogs

### Multi-Conversation
- Multiple conversations per agent/team
- Collapsible conversation panel with rename and delete
- Conversation-scoped session keys

### User Profile & Appearance
- Customizable user avatar and nickname
- Theme modes: Light, Dark, System (follows OS preference)
- Settings accessible from sidebar footer

### Auth (Optional)
- Email/password authentication (next-auth v5)
- Enable for cloud multi-tenant deployment
- Disabled by default for local use

## Quick Start

```bash
git clone https://github.com/fastclaw-ai/chatclaw.git
cd chatclaw
pnpm install
pnpm dev
```

Open http://localhost:3000 — auto-detects your local OpenClaw gateway.

## Docker

```bash
docker compose up -d

# Or build manually
docker build -t chatclaw .
docker run -p 3000:3000 -v chatclaw-data:/data chatclaw
```

## Configuration

```env
# Database: "indexeddb" (default, browser) or "drizzle" (server-side SQLite)
DB_BACKEND=indexeddb

# Auth: "true" for cloud deployment
AUTH_ENABLED=false
AUTH_SECRET=your-secret

# Multi-company mode (default: true)
MULTI_COMPANY=true

# Data directory (drizzle mode)
CHATCLAW_DATA_DIR=./data
```

## Tech Stack

- **Next.js 16** — App Router, TypeScript
- **Tailwind CSS** + **shadcn/ui** — UI components
- **Dexie.js** — IndexedDB (default storage)
- **Drizzle ORM** + **better-sqlite3** — Optional server-side SQLite
- **next-auth v5** — Optional authentication
- **HTTP SSE** — OpenAI-compatible streaming

## Architecture

```
chatclaw (Web UI)
    ├── RuntimeClient
    │   └── openclaw → OpenClaw Gateway (SSE streaming)
    ├── AvatarPicker (shared: Random / Emoji / Upload)
    ├── DB Layer
    │   ├── IndexedDB  (browser, default)
    │   └── Drizzle    (SQLite, cloud)
    ├── Config Editor
    │   ├── openclaw.json  (gateway config)
    │   └── Workspace files (agent config)
    └── Auth (optional)
        └── next-auth v5 (credentials)
```

## License

MIT

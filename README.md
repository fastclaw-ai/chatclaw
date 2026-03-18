# ChatClaw

An open-source multi-agent chat platform. Create virtual companies, hire AI agent employees, build teams for collaborative work.

Works with [OpenClaw](https://github.com/openclaw/openclaw), OpenAI-compatible APIs, or any custom endpoint.

![ChatClaw Preview](./preview.png)

## Features

### 🏢 Virtual Companies
- Create multiple companies, each with its own agent runtime
- Switch between companies via dropdown
- Support **OpenClaw**, **OpenAI Compatible**, and **Custom** runtime providers

### 🤖 Multi-Agent Management
- Auto-sync agents from OpenClaw Gateway
- Manually create agents for any runtime
- Per-agent settings: Soul, Identity, Instructions, Skills, Tools, Heartbeat
- DiceBear robot avatars

### 👥 Team Collaboration
- Create teams with multiple agents
- **Sequential replies** — agents respond in order with full context
- Each agent sees the complete team conversation history

### 💬 Multi-Conversation
- Multiple conversations per agent/team
- Conversation panel with rename, delete
- Conversation-scoped session keys

### ⚙️ Agent Configuration (OpenClaw)
- Edit `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`
- View installed skills (global + agent-specific)
- All changes saved directly to OpenClaw workspace files

### 🔐 Auth (Optional)
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

Open http://localhost:3000 — auto-detects your local OpenClaw Gateway.

## Docker

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t chatclaw .
docker run -p 3000:3000 -v chatclaw-data:/data chatclaw
```

## K8s Deployment

```yaml
containers:
- name: chatclaw
  image: chatclaw:latest
  ports: [{containerPort: 3000}]
  volumeMounts: [{name: data, mountPath: /data}]
  env:
  - {name: NEXT_PUBLIC_DB_BACKEND, value: "drizzle"}
  - {name: NEXT_PUBLIC_AUTH_ENABLED, value: "true"}
  - {name: AUTH_SECRET, valueFrom: {secretKeyRef: {name: chatclaw, key: auth-secret}}}
```

## Runtime Providers

| Provider | Use Case | Features |
|---|---|---|
| **OpenClaw** | OpenClaw Gateway | Agent sync, workspace files, session memory |
| **OpenAI** | OpenRouter, LiteLLM, vLLM | Standard chat completions |
| **Custom** | Any endpoint | Custom headers, flexible config |

## Configuration

```env
# Database: "indexeddb" (default, browser) or "drizzle" (server-side SQLite)
NEXT_PUBLIC_DB_BACKEND=indexeddb

# Auth: "true" for cloud deployment
NEXT_PUBLIC_AUTH_ENABLED=false
AUTH_SECRET=your-secret

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
    ├── RuntimeClient (provider pattern)
    │   ├── openclaw  → OpenClaw Gateway
    │   ├── openai    → OpenAI-compatible API
    │   └── custom    → Any endpoint
    ├── DB Layer (facade)
    │   ├── IndexedDB  (browser, default)
    │   └── Drizzle    (SQLite, cloud)
    └── Auth (optional)
        └── next-auth v5 (credentials)
```

## License

MIT

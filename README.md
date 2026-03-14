# ChatClaw

A polished, open-source web chat client for [OpenClaw](https://github.com/openclaw/openclaw) Gateway.

Think ChatGPT/Claude.ai UX, but connecting to your own OpenClaw agents.

![ChatClaw Preview](./preview.png)

## Features

- 🤖 **Multi-Agent Support** — Auto-syncs agents from your OpenClaw config
- 👥 **Team Chat** — Create teams of agents that reply sequentially with shared context
- 💬 **Agent DM** — Direct message individual agents
- ⚡ **Streaming Responses** — Real-time SSE streaming via OpenAI-compatible API
- 📝 **Markdown Rendering** — Syntax highlighting, tables, and more
- 🎨 **Dark Theme** — Discord-inspired dark UI
- 💾 **Local Storage** — All data in IndexedDB, zero backend database
- 🔌 **Auto-Bootstrap** — Reads `~/.openclaw/openclaw.json` on first launch

## Quick Start

```bash
# Clone
git clone https://github.com/idoubi/chatclaw.git
cd chatclaw

# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — ChatClaw auto-detects your local OpenClaw Gateway and syncs your agents.

## Prerequisites

A running [OpenClaw](https://github.com/openclaw/openclaw) Gateway with:

- HTTP endpoint enabled (`gateway.http.endpoints.chatCompletions.enabled: true`)
- Auth token configured

## How It Works

```
Browser → Next.js API proxy (/api/chat) → OpenClaw Gateway (/v1/chat/completions)
```

- ChatClaw communicates with the Gateway via the OpenAI-compatible Chat Completions endpoint
- Requests are proxied through a Next.js API route to avoid CORS issues
- Streaming uses Server-Sent Events (SSE)

## Architecture

- **Next.js 16** — App Router + TypeScript
- **Tailwind CSS** + **shadcn/ui** — UI components
- **Dexie.js** — IndexedDB for local storage
- **HTTP SSE** — OpenAI-compatible streaming API

## Team Chat

Teams let multiple agents collaborate on the same conversation:

- Agents reply **sequentially** in configured order
- Each agent sees the **full conversation history** plus previous agents' replies from the current round
- Useful for agent teams (e.g., code review + security audit + testing)

## Development

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm lint     # Lint
```

## License

MIT — see [LICENSE](./LICENSE)

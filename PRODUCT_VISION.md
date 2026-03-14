# ChatClaw - Product Vision: Discord-like Agent Company Platform

## Overview
Transform ChatClaw from a simple chat client into a Discord-like platform where users can create "one-person companies" powered by AI agents.

## Core Concepts

### 1. Company (类似 Discord Server)
- User creates a "Company" (workspace)
- Company has a name, logo, description
- Company contains multiple Channels and Agent Teams
- Settings page for company configuration

### 2. Agents (类似 Discord Bot)
- Each Agent connects to an OpenClaw Gateway instance
- Agent has: name, avatar, description, role/specialty, gateway URL + token
- Agent can be assigned to specific channels
- Agent has a status indicator (online/offline/busy)
- Support multiple agents with different specialties (coding, research, writing, design, etc.)

### 3. Agent Teams (类似 Discord Roles/Groups)
- Group multiple agents into a team
- Team can be assigned to channels
- Team has a shared purpose/goal
- Agents in a team can collaborate (future)

### 4. Channels (类似 Discord Channels)
- Multiple chat channels within a company
- Channel types:
  - **General** - open discussion
  - **Task** - specific task/project focused
  - **Private** - 1:1 with a specific agent
- Each channel can have assigned agents
- Channel shows which agents are "present"
- Message history per channel

### 5. Tasks
- Users can create tasks and assign to agents/teams
- Task has: title, description, status, assigned agent/team, channel
- Task statuses: pending, in-progress, completed, failed
- Tasks appear as structured messages in channels

## UI Layout (Discord-like)

```
┌──────────┬──────────────┬─────────────────────────────────┐
│ Company  │  Channel     │  Chat Area                      │
│ Sidebar  │  List        │                                 │
│          │              │  [Messages]                     │
│ 🏢 My Co │ # general    │                                 │
│          │ # coding     │  Agent: Hello! How can I help?  │
│ [+] New  │ # research   │  You: Build me a landing page   │
│ Company  │ # design     │  Agent: On it! ...              │
│          │              │                                 │
│          │ 👥 Teams     │                                 │
│          │  Dev Team    │                                 │
│          │  Research    │  ┌───────────────────────────┐  │
│          │              │  │ Type a message...     📎 ▶│  │
│ ⚙️       │ 🤖 Agents    │  └───────────────────────────┘  │
│ Settings │  Coder       │                                 │
│          │  Writer      │  [Agent Status Bar]             │
└──────────┴──────────────┴─────────────────────────────────┘
```

### Left Sidebar (Company level)
- Company icon/avatar at top
- List of joined companies
- "+" button to create new company
- Settings at bottom

### Middle Panel (Channel/Navigation)
- Company name header
- Channel list (grouped by category)
- Agent Teams section
- Individual Agents section
- Each shows online/offline status

### Right Panel (Chat/Content)
- Channel name header with agent presence
- Message area with streaming support
- Rich message rendering (markdown, code blocks)
- Input area with file attachment support
- Agent typing indicator

## Data Model (IndexedDB via Dexie)

### Company
```ts
{
  id: string
  name: string
  logo?: string
  description?: string
  createdAt: number
  updatedAt: number
}
```

### Agent
```ts
{
  id: string
  companyId: string
  name: string
  avatar?: string
  description: string
  specialty: string // coding, research, writing, design, general
  gatewayUrl: string
  apiToken: string
  status: 'online' | 'offline' | 'busy'
  createdAt: number
}
```

### AgentTeam
```ts
{
  id: string
  companyId: string
  name: string
  description?: string
  agentIds: string[]
  createdAt: number
}
```

### Channel
```ts
{
  id: string
  companyId: string
  name: string
  type: 'general' | 'task' | 'private'
  description?: string
  agentIds: string[] // agents assigned to this channel
  teamId?: string // optional team assigned
  createdAt: number
  updatedAt: number
}
```

### Message
```ts
{
  id: string
  channelId: string
  role: 'user' | 'assistant'
  agentId?: string // which agent responded
  content: string
  createdAt: number
}
```

## Tech Requirements
- Keep Next.js 16 + TypeScript + Tailwind + shadcn/ui
- Keep Dexie for IndexedDB storage
- Keep existing OpenClaw Gateway WebSocket integration
- Dark theme (Discord-like dark colors: #2b2d31, #1e1f22, #313338)
- Responsive but desktop-first
- Smooth animations/transitions
- Each agent maintains its own WS connection to its gateway

## Migration
- This is a full rewrite of the UI/pages
- Keep: lib/gateway.ts (WS connection), lib/db.ts (extend), ui components
- Rewrite: pages, layout, store, all business components
- Add: company/agent/team CRUD, channel system, multi-agent routing

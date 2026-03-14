# ChatClaw Refinement: Team = Group Chat, Agent = Private Chat

## Key Design Changes

### Team = Group Chat (群聊)
- A Team is a group chat channel where multiple agents are present
- When you click a Team in the sidebar, it opens a group chat
- Messages go to all agents in the team, they can each respond
- Like a Discord channel with multiple bots

### Agent = Private Chat (私聊)  
- Clicking an Agent opens a 1:1 private chat with that agent
- Direct conversation with a single agent
- Like a Discord DM

### Remove "Channels" concept
- No separate "channels" - Teams ARE the group channels, Agents ARE the DM channels
- Simplify the sidebar to just: Teams (group chats) and Agents (private chats)

## OpenClaw Multi-Agent Integration

When creating an agent in ChatClaw, it should also create the agent in OpenClaw:

### Agent Config in OpenClaw
Each agent needs:
1. A workspace directory: `~/.openclaw/workspace-<agentId>` 
2. Entry in openclaw.json `agents.list`:
```json5
{
  agents: {
    list: [
      { 
        id: "<agentId>", 
        name: "<agentName>", 
        workspace: "~/.openclaw/workspace-<agentId>" 
      }
    ]
  }
}
```
3. Workspace files (AGENTS.md, SOUL.md, etc.) - customize based on agent's role/specialty

### Creating an Agent Flow:
1. User fills in agent details in ChatClaw (name, description, specialty, avatar)
2. ChatClaw creates the workspace directory with appropriate files:
   - AGENTS.md - with instructions based on the agent's specialty
   - SOUL.md - personality based on the agent's description
   - IDENTITY.md - name, emoji, vibe
3. ChatClaw updates ~/.openclaw/openclaw.json to add the agent to agents.list
4. The agent connects via the SAME gateway (ws://127.0.0.1:18789) but with different agentId
5. When sending chat via WS, use x-openclaw-agent-id header or specify in the session key

### WS Chat with Specific Agent:
- Use sessionKey format: `agent:<agentId>:main` for DMs
- Use sessionKey format: `agent:<agentId>:<channel>:chatclaw:<teamId>` for team chats
- All agents share the same gateway URL and token (it's one OpenClaw instance)

### Sidebar Layout:
```
┌──────────┬──────────────────────────────────────────────┐
│ Company  │  Chat Area                                    │
│ Sidebar  │                                               │
│          │  [Messages with agent avatars]                │
│ 👥 Teams │                                               │
│  Dev Team│  Agent A: I can handle the frontend...        │
│  Research│  Agent B: I'll take the backend...            │
│          │  You: Great, let's do it!                     │
│ 🤖 Agents│                                               │
│  Coder ● │                                               │
│  Writer ●│  ┌────────────────────────────────────────┐   │
│  Researcher│  │ Type a message...                  ▶ │   │
│          │  └────────────────────────────────────────┘   │
│ ⚙️ [+]   │                                               │
└──────────┴──────────────────────────────────────────────┘
```

## Implementation Notes:
- Settings dialog should have fields for gateway URL + token (shared for all agents)
- Creating agent = create OpenClaw agent workspace + update config + restart gateway
- Gateway restart can be done via: `openclaw gateway restart`
- Each agent needs its own SOUL.md/AGENTS.md customized for its role
- Team chat: route message to all agents in team, show all responses

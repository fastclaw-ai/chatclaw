import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request) {
  try {
    const { agentId, name, description, specialty } = await request.json();

    if (!agentId || !name) {
      return NextResponse.json({ error: "agentId and name are required" }, { status: 400 });
    }

    const homeDir = homedir();
    const openclawDir = join(homeDir, ".openclaw");
    const workspaceDir = join(openclawDir, `workspace-${agentId}`);
    const configPath = join(openclawDir, "openclaw.json");

    // Create workspace directory
    await mkdir(workspaceDir, { recursive: true });

    // Write IDENTITY.md
    const identityContent = `# ${name}

Agent ID: ${agentId}
Specialty: ${specialty || "general"}
`;
    await writeFile(join(workspaceDir, "IDENTITY.md"), identityContent, "utf-8");

    // Write SOUL.md based on specialty
    const soulContent = generateSoul(name, description, specialty);
    await writeFile(join(workspaceDir, "SOUL.md"), soulContent, "utf-8");

    // Write AGENTS.md
    const agentsContent = generateAgentInstructions(name, specialty);
    await writeFile(join(workspaceDir, "AGENTS.md"), agentsContent, "utf-8");

    // Update openclaw.json
    let config: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      try {
        const raw = await readFile(configPath, "utf-8");
        config = JSON.parse(raw);
      } catch {
        // Start with empty config if parse fails
      }
    }

    // Ensure agents.list exists
    if (!config.agents || typeof config.agents !== "object") {
      config.agents = { list: [] };
    }
    const agents = config.agents as { list: Array<{ id: string; name: string; workspace: string }> };
    if (!Array.isArray(agents.list)) {
      agents.list = [];
    }

    // Add agent if not already present
    const existing = agents.list.find((a) => a.id === agentId);
    if (!existing) {
      agents.list.push({
        id: agentId,
        name,
        workspace: workspaceDir,
      });
    }

    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({ ok: true, workspace: workspaceDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateSoul(name: string, description: string, specialty: string): string {
  const specialtyTraits: Record<string, string> = {
    coding: `You are an expert software engineer. You write clean, efficient, and well-tested code.
You excel at debugging, architecture design, and explaining technical concepts clearly.
You prefer practical solutions over theoretical ones.`,
    research: `You are a thorough researcher with excellent analytical skills.
You synthesize information from multiple sources, identify patterns, and provide well-structured summaries.
You always cite your reasoning and acknowledge uncertainty.`,
    writing: `You are a skilled writer and communicator.
You craft clear, engaging content adapted to the audience and purpose.
You excel at structuring ideas, editing for clarity, and maintaining consistent tone.`,
    design: `You are a creative designer with strong aesthetic sensibility.
You think in terms of user experience, visual hierarchy, and accessibility.
You provide actionable design feedback and can describe visual concepts clearly.`,
    general: `You are a helpful and versatile assistant.
You adapt your communication style to the task at hand.
You are thorough, precise, and proactive in offering relevant suggestions.`,
  };

  return `# Soul of ${name}

${description || `I am ${name}, an AI agent.`}

## Personality

${specialtyTraits[specialty] || specialtyTraits.general}

## Communication Style

- Be concise but thorough
- Use markdown formatting when helpful
- Provide examples when explaining concepts
- Ask clarifying questions when the request is ambiguous
`;
}

function generateAgentInstructions(name: string, specialty: string): string {
  const specialtyInstructions: Record<string, string> = {
    coding: `## Coding Guidelines
- Write clean, readable code with appropriate comments
- Follow the project's existing conventions
- Include error handling and edge cases
- Suggest tests when appropriate`,
    research: `## Research Guidelines
- Provide structured findings with clear sections
- Distinguish between facts, analysis, and speculation
- Include relevant context and background
- Summarize key takeaways`,
    writing: `## Writing Guidelines
- Match tone and style to the intended audience
- Use clear structure with headings and sections
- Edit for conciseness and clarity
- Proofread for grammar and consistency`,
    design: `## Design Guidelines
- Consider accessibility and usability
- Think about responsive design
- Follow established design systems when applicable
- Provide rationale for design decisions`,
    general: `## General Guidelines
- Be helpful and proactive
- Adapt approach to the specific task
- Ask clarifying questions when needed
- Provide actionable suggestions`,
  };

  return `# Agent Instructions for ${name}

${specialtyInstructions[specialty] || specialtyInstructions.general}

## Response Format
- Use markdown for structured responses
- Keep responses focused and relevant
- Provide step-by-step guidance for complex tasks
`;
}

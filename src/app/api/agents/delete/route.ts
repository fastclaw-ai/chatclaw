import { NextResponse } from "next/server";
import { readFile, writeFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const homeDir = homedir();
    const openclawDir = join(homeDir, ".openclaw");
    const workspaceDir = join(openclawDir, `workspace-${agentId}`);
    const configPath = join(openclawDir, "openclaw.json");

    // Remove workspace directory
    if (existsSync(workspaceDir)) {
      await rm(workspaceDir, { recursive: true, force: true });
    }

    // Update openclaw.json - remove agent from list
    if (existsSync(configPath)) {
      try {
        const raw = await readFile(configPath, "utf-8");
        const config = JSON.parse(raw);

        if (config.agents?.list && Array.isArray(config.agents.list)) {
          config.agents.list = config.agents.list.filter(
            (a: { id: string }) => a.id !== agentId
          );
          await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
        }
      } catch {
        // Config parse error, skip update
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

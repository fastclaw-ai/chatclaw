import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

interface SkillInfo {
  name: string;
  scope: "global" | "agent";
  description: string;
  hasSkillMd: boolean;
}

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  const skills: SkillInfo[] = [];

  // Global skills
  const globalPaths = [
    join(homedir(), ".openclaw", "workspace", "skills"),
    join(homedir(), ".openclaw", "skills"),
  ];

  for (const skillsDir of globalPaths) {
    if (!existsSync(skillsDir)) continue;
    try {
      const entries = await readdir(skillsDir);
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        const entryPath = join(skillsDir, entry);
        const entryStat = await stat(entryPath);
        if (!entryStat.isDirectory()) continue;

        let description = "";
        const skillMd = join(entryPath, "SKILL.md");
        if (existsSync(skillMd)) {
          const content = await readFile(skillMd, "utf-8");
          const descMatch =
            content.match(/^description:\s*(.+)/m) ||
            content.match(/^#.*\n+(.+)/m);
          if (descMatch) description = descMatch[1].trim();
        }

        if (!skills.find((s) => s.name === entry)) {
          skills.push({
            name: entry,
            scope: "global",
            description,
            hasSkillMd: existsSync(skillMd),
          });
        }
      }
    } catch {
      /* skip */
    }
  }

  // Agent-specific skills
  if (agentId) {
    const agentSkillsDir =
      agentId === "main"
        ? join(homedir(), ".openclaw", "workspace-main", "skills")
        : join(homedir(), ".openclaw", `workspace-${agentId}`, "skills");

    if (existsSync(agentSkillsDir)) {
      try {
        const entries = await readdir(agentSkillsDir);
        for (const entry of entries) {
          if (entry.startsWith(".")) continue;
          const entryPath = join(agentSkillsDir, entry);
          const entryStat = await stat(entryPath);
          if (!entryStat.isDirectory()) continue;

          let description = "";
          const skillMd = join(entryPath, "SKILL.md");
          if (existsSync(skillMd)) {
            const content = await readFile(skillMd, "utf-8");
            const descMatch =
              content.match(/^description:\s*(.+)/m) ||
              content.match(/^#.*\n+(.+)/m);
            if (descMatch) description = descMatch[1].trim();
          }

          skills.push({
            name: entry,
            scope: "agent",
            description,
            hasSkillMd: existsSync(skillMd),
          });
        }
      } catch {
        /* skip */
      }
    }
  }

  return NextResponse.json({ skills });
}

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, readdir } from "fs/promises";
import { homedir } from "os";
import { join, resolve } from "path";
import { existsSync } from "fs";

const WORKSPACE_FILES = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "AGENTS.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
];

function getWorkspacePath(agentId: string): string {
  if (agentId === "main") {
    return join(homedir(), ".openclaw", "workspace-main");
  }
  const byId = join(homedir(), ".openclaw", `workspace-${agentId}`);
  if (existsSync(byId)) return byId;
  return join(homedir(), ".openclaw", "workspace");
}

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") || "main";
  const file = req.nextUrl.searchParams.get("file");

  const workspacePath = getWorkspacePath(agentId);

  if (file) {
    if (!WORKSPACE_FILES.includes(file)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    const filePath = join(workspacePath, file);
    try {
      const content = await readFile(filePath, "utf-8");
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ content: "" });
    }
  }

  const files: Record<string, string> = {};
  for (const f of WORKSPACE_FILES) {
    try {
      files[f] = await readFile(join(workspacePath, f), "utf-8");
    } catch {
      files[f] = "";
    }
  }

  let skills: string[] = [];
  const skillsDir = join(workspacePath, "skills");
  try {
    const entries = await readdir(skillsDir);
    skills = entries.filter((e) => !e.startsWith("."));
  } catch {
    // No skills dir
  }

  return NextResponse.json({ files, skills, workspacePath });
}

export async function POST(req: NextRequest) {
  const { agentId, file, content } = await req.json();

  if (!file || !WORKSPACE_FILES.includes(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const workspacePath = getWorkspacePath(agentId || "main");
  const filePath = join(workspacePath, file);

  const resolved = resolve(filePath);
  if (!resolved.startsWith(resolve(workspacePath))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  await writeFile(filePath, content, "utf-8");
  return NextResponse.json({ ok: true });
}

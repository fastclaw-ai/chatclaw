import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".openclaw", "openclaw.json");
const WORKSPACE_PATH = join(homedir(), ".openclaw", "workspace-main");

export async function GET() {
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return NextResponse.json({
      content,
      configPath: CONFIG_PATH,
      workspacePath: WORKSPACE_PATH,
    });
  } catch {
    return NextResponse.json({
      content: "",
      configPath: CONFIG_PATH,
      workspacePath: WORKSPACE_PATH,
    });
  }
}

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  try {
    JSON.parse(content);
    await writeFile(CONFIG_PATH, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof SyntaxError ? "Invalid JSON" : String(e) },
      { status: 400 }
    );
  }
}

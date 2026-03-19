import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join, extname } from "path";
import { existsSync } from "fs";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

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
  const since = req.nextUrl.searchParams.get("since"); // timestamp in ms

  const workspacePath = getWorkspacePath(agentId);

  if (!existsSync(workspacePath)) {
    return NextResponse.json({ images: [] });
  }

  try {
    const entries = await readdir(workspacePath);
    const images: { name: string; url: string; createdAt: number }[] = [];

    for (const entry of entries) {
      const ext = extname(entry).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;

      const filePath = join(workspacePath, entry);
      const fileStat = await stat(filePath);
      const createdAt = fileStat.mtimeMs;

      // Filter by timestamp if provided
      if (since && createdAt < Number(since)) continue;

      images.push({
        name: entry,
        url: `/api/workspace/files?agentId=${encodeURIComponent(agentId)}&file=${encodeURIComponent(entry)}`,
        createdAt,
      });
    }

    // Sort by most recent first
    images.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

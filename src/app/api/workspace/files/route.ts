import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join, resolve, extname } from "path";
import { existsSync } from "fs";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

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
  const fileName = req.nextUrl.searchParams.get("file");

  if (!fileName) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  // Security: only allow simple filenames, no path traversal
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const workspacePath = getWorkspacePath(agentId);
  const filePath = join(workspacePath, fileName);

  // Ensure the resolved path is within the workspace
  const resolved = resolve(filePath);
  if (!resolved.startsWith(resolve(workspacePath))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    const ext = extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

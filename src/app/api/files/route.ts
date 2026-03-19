import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { resolve, extname, basename } from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".md": "text/markdown",
  ".html": "text/html",
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Resolve ~ to home directory
  const resolved = filePath.startsWith("~")
    ? resolve(process.env.HOME || "/", filePath.slice(2))
    : resolve(filePath);

  // Security: block path traversal
  if (resolved.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const fileInfo = await stat(resolved);
    if (!fileInfo.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    const data = await readFile(resolved);
    const ext = extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const name = basename(resolved);

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentType === "application/octet-stream"
          ? `attachment; filename="${encodeURIComponent(name)}"`
          : "inline",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export async function GET() {
  try {
    const configPath = join(homedir(), ".openclaw", "openclaw.json");
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw);

    const gateway = config?.gateway;
    if (!gateway?.auth?.token) {
      return NextResponse.json({ found: false });
    }

    const port = gateway.port ?? 18789;
    const url = `ws://localhost:${port}`;
    const token = gateway.auth.token;

    return NextResponse.json({ found: true, url, token });
  } catch {
    return NextResponse.json({ found: false });
  }
}

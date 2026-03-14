import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync("openclaw gateway restart", {
      timeout: 15_000,
    });

    return NextResponse.json({
      ok: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

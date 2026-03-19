import { NextResponse } from "next/server";

/**
 * Exposes runtime configuration to the client.
 * All values are read from server-side env vars (no NEXT_PUBLIC_ needed),
 * so they can be set at deploy time via .env / ConfigMap without rebuilding.
 */
export async function GET() {
  return NextResponse.json({
    dbBackend: process.env.DB_BACKEND || "indexeddb",
    authEnabled: process.env.AUTH_ENABLED === "true",
    multiCompany: process.env.MULTI_COMPANY !== "false",
  });
}

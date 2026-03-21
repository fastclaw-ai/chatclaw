import { NextRequest, NextResponse } from "next/server";
import { serverGatewayFetch } from "@/lib/gateway-fetch";

/**
 * Unified gateway proxy — forwards requests to the gateway server-side,
 * avoiding browser CORS issues and handling HTTP→HTTPS redirects.
 *
 * Client sends:
 *   POST /api/gateway/proxy
 *   Body: { url, token, path, method?, body? }
 */
export async function POST(req: NextRequest) {
  try {
    const { url, token, path, method = "GET", body } = await req.json();

    if (!url || !path) {
      return NextResponse.json({ error: "Missing url or path" }, { status: 400 });
    }

    const res = await serverGatewayFetch(url, token || "", path, {
      method,
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });

    // Return the upstream response as-is
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new Response(text, { status: res.status });
  } catch (e) {
    const message = e instanceof Error && e.name === "TimeoutError"
      ? "Connection timed out"
      : `Connection failed: ${e}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

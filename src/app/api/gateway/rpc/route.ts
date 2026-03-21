import { NextRequest, NextResponse } from "next/server";
import { gatewayRpcCall } from "@/lib/gateway-ws";

/**
 * Gateway WebSocket RPC proxy.
 * All gateway operations go through this single endpoint.
 *
 * Client sends: POST /api/gateway/rpc
 * Body: { gatewayUrl, gatewayToken, method, params }
 */
export async function POST(req: NextRequest) {
  try {
    const { gatewayUrl, gatewayToken, method, params } = await req.json();

    if (!gatewayUrl || !gatewayToken || !method) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Missing gatewayUrl, gatewayToken, or method" } },
        { status: 400 }
      );
    }

    const result = await gatewayRpcCall(gatewayUrl, gatewayToken, method, params || {});
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: { code: "CONNECTION_ERROR", message } },
      { status: 502 }
    );
  }
}

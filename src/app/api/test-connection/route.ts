import { NextRequest, NextResponse } from "next/server";
import { connectGatewayWs } from "@/lib/gateway-ws";

export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json();

    if (!url || !token) {
      return NextResponse.json({ ok: false, error: "Missing url or token" });
    }

    // Test by connecting via WebSocket
    const conn = await connectGatewayWs({
      gatewayUrl: url,
      gatewayToken: token,
      timeoutMs: 10000,
    });
    conn.close();

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    if (message.includes("token") || message.includes("unauthorized") || message.includes("AUTH")) {
      return NextResponse.json({ ok: false, error: "Authentication failed – check your token" });
    }
    if (message.includes("timeout") || message.includes("Timeout")) {
      return NextResponse.json({ ok: false, error: "Connection timed out" });
    }
    if (message.includes("control ui requires HTTPS") || message.includes("secure context")) {
      return NextResponse.json({
        ok: false,
        error: message,
        configHint: JSON.stringify({
          gateway: {
            controlUi: {
              dangerouslyDisableDeviceAuth: true,
              allowedOrigins: ["*"],
            },
          },
        }, null, 2),
      });
    }

    return NextResponse.json({ ok: false, error: message });
  }
}

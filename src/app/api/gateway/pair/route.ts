import { NextRequest, NextResponse } from "next/server";
import { pairDevice } from "@/lib/gateway-ws";

export async function POST(req: NextRequest) {
  try {
    const { gatewayUrl, gatewayToken, deviceName } = await req.json();

    if (!gatewayUrl || !gatewayToken) {
      return NextResponse.json({ error: "Missing gatewayUrl or gatewayToken" }, { status: 400 });
    }

    const result = await pairDevice({
      gatewayUrl,
      gatewayToken,
      deviceName: deviceName || "ChatClaw",
      timeoutMs: 300000, // 5 minutes
    });

    return NextResponse.json({ ok: true, deviceToken: result.deviceToken });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}

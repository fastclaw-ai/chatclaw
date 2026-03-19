import { NextRequest } from "next/server";
import { getGatewayWS } from "@/lib/gateway-ws";
import { getDb, schema } from "@/lib/drizzle";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return new Response("Missing companyId", { status: 400 });
  }

  // Look up company credentials from DB
  const company = getDb()
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId))
    .get();

  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const gatewayUrl = company.gatewayUrl;
  const gatewayToken = company.gatewayToken;

  if (!gatewayUrl || !gatewayToken) {
    return new Response("Gateway not configured", { status: 400 });
  }

  // Ensure the WebSocket manager is connected
  const manager = getGatewayWS();
  manager.connect(gatewayUrl, gatewayToken);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(":connected\n\n"));

      // Subscribe to gateway events
      const unsubscribe = manager.subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      });

      // Keepalive every 15 seconds to prevent proxy timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15000);

      // Store cleanup function
      (controller as unknown as Record<string, unknown>).__cleanup = () => {
        unsubscribe();
        clearInterval(keepalive);
      };
    },
    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, unknown>)?.__cleanup;
      if (typeof cleanup === "function") cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

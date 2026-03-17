import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { gatewayUrl, gatewayToken } = await req.json();
  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json(
      { error: "Missing gatewayUrl or gatewayToken" },
      { status: 400 }
    );
  }

  try {
    const agents = await fetchAgentsViaWebSocket(gatewayUrl, gatewayToken);
    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function fetchAgentsViaWebSocket(
  gatewayUrl: string,
  gatewayToken: string
): Promise<Array<{ id: string; name: string }>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Timeout connecting to gateway"));
    }, 15000);

    const ws = new WebSocket(gatewayUrl);
    let challengeHandled = false;
    let connectId = "";
    let agentsListId = "";

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data));

        // Handle challenge
        if (
          frame.type === "event" &&
          frame.event === "connect.challenge" &&
          !challengeHandled
        ) {
          challengeHandled = true;
          connectId = crypto.randomUUID();
          ws.send(
            JSON.stringify({
              type: "req",
              id: connectId,
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: "cli",
                  version: "1.0.0",
                  platform: "node",
                  mode: "cli",
                },
                role: "operator",
                scopes: [
                  "operator.read",
                  "operator.write",
                  "operator.admin",
                ],
                caps: [],
                commands: [],
                permissions: {},
                auth: { token: gatewayToken },
                locale: "en-US",
                userAgent: "chatclaw-server/1.0.0",
              },
            })
          );
        }

        // Handle connect response
        if (frame.type === "res" && frame.id === connectId) {
          if (!frame.ok) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(frame.error?.message || "Connect failed"));
            return;
          }
          // Connected — request agents list
          agentsListId = crypto.randomUUID();
          ws.send(
            JSON.stringify({
              type: "req",
              id: agentsListId,
              method: "agents.list",
              params: {},
            })
          );
        }

        // Handle agents.list response
        if (frame.type === "res" && frame.id === agentsListId) {
          clearTimeout(timeout);
          ws.close();
          if (!frame.ok) {
            reject(
              new Error(frame.error?.message || "agents.list failed")
            );
            return;
          }
          const agentsList =
            frame.payload?.agents || frame.payload?.list || [];

          // Always include default agent first
          const agents: Array<{ id: string; name: string }> = [
            { id: "main", name: "Default" },
          ];

          for (const a of agentsList) {
            agents.push({
              id: a.id || a.agentId,
              name: a.name || a.id || a.agentId,
            });
          }

          resolve(agents);
        }
      } catch {
        // Skip parse errors
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

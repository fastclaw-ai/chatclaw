/**
 * Server-side helper to fetch from the gateway with proper redirect handling.
 * Handles HTTP→HTTPS redirects that strip Authorization headers.
 */
export async function serverGatewayFetch(
  gatewayUrl: string,
  token: string,
  path: string,
  options?: { method?: string; body?: string; timeout?: number }
): Promise<Response> {
  const baseUrl = gatewayUrl
    .replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://")
    .replace(/\/+$/, "");

  const method = options?.method || "GET";
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options?.body) headers["Content-Type"] = "application/json";

  const timeout = AbortSignal.timeout(options?.timeout ?? 15_000);

  // Manual redirect to preserve Authorization header across HTTP→HTTPS
  let res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options?.body,
    redirect: "manual",
    signal: timeout,
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      const redirectUrl = location.startsWith("http")
        ? location
        : new URL(location, `${baseUrl}${path}`).toString();
      res = await fetch(redirectUrl, {
        method,
        headers,
        body: options?.body,
        signal: timeout,
      });
    }
  }

  return res;
}

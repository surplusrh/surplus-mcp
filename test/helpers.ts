import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../src/config.js";
import { createServer } from "../src/server.js";

export const KEY = "sk-surplus-abcdefghijklmnopqrstuvwxyz012345";

export const testConfig = (over: Partial<Config> = {}): Config => ({
  apiKey: KEY,
  baseUrl: "https://api.test/api/v1",
  defaultModel: null,
  timeoutMs: 5_000,
  ...over,
});

export interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

/** A fetch stub that answers by path and records every call. */
export function stubFetch(routes: Record<string, () => Response>): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const path = new URL(url).pathname.replace("/api/v1", "");
    const route = routes[path];
    return route ? route() : new Response(JSON.stringify({ error: { message: "nope", code: "not_found" } }), { status: 404 });
  }) as typeof fetch;
  return { fetch: impl, calls };
}

export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export async function connect(config: Config, fetchImpl: typeof fetch): Promise<Client> {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createServer(config, fetchImpl).connect(serverT);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientT);
  return client;
}

export const textOf = (r: Record<string, unknown>): string =>
  ((r.content ?? []) as { type: string; text?: string }[]).map((c) => c.text ?? "").join("\n");

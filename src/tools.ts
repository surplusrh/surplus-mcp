import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SurplusError, type ChatMessage, type SurplusClient } from "./client.js";
import { filterModels, formatChatFooter, formatModels } from "./format.js";

const MAX_PROMPT_CHARS = 400_000;
const USAGE_MAX = 100;

const text = (t: string): CallToolResult => ({ content: [{ type: "text", text: t }] });
const json = (v: unknown): CallToolResult => text(JSON.stringify(v, null, 2));

/** Turns any thrown error into a tool error the model can read, instead of crashing the server. */
async function guarded(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    const message =
      err instanceof SurplusError
        ? `Surplus API error${err.status ? ` (HTTP ${err.status})` : ""}: ${err.message}`
        : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(MAX_PROMPT_CHARS),
});

export function registerTools(server: McpServer, client: SurplusClient, defaultModel: string | null): void {
  server.registerTool(
    "list_models",
    {
      title: "List Surplus models",
      description: "List models available on Surplus with context length and USD price per 1M tokens. Use `search` to filter by id or name.",
      inputSchema: { search: z.string().max(100).optional().describe("Substring to match, e.g. 'qwen' or 'claude'") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ search }) => guarded(async () => text(formatModels(filterModels(await client.listModels(), search)))),
  );

  server.registerTool(
    "chat",
    {
      title: "Run inference on Surplus",
      description:
        "Send a prompt to a model on Surplus and return its reply. Billed to the configured API key. " +
        "Pass `prompt` for a single turn, or `messages` for a full conversation. Call list_models to pick a model id.",
      inputSchema: {
        model: z.string().min(1).max(200).optional().describe(`Model id, e.g. "qwen/qwen3.8-flash"${defaultModel ? `. Defaults to ${defaultModel}` : ""}`),
        prompt: z.string().min(1).max(MAX_PROMPT_CHARS).optional().describe("User message for a single-turn request"),
        system: z.string().max(MAX_PROMPT_CHARS).optional().describe("Optional system prompt, used with `prompt`"),
        messages: z.array(messageSchema).min(1).max(200).optional().describe("Full conversation; overrides prompt/system"),
        max_tokens: z.number().int().min(1).max(200_000).optional(),
        temperature: z.number().min(0).max(2).optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    (args) =>
      guarded(async () => {
        const model = args.model ?? defaultModel;
        if (!model) return { isError: true, content: [{ type: "text", text: "No model given. Pass `model` (see list_models) or set SURPLUS_DEFAULT_MODEL." }] };
        const messages = buildMessages(args);
        if (!messages) return { isError: true, content: [{ type: "text", text: "Pass either `prompt` or `messages`." }] };
        const r = await client.chat({ model, messages, max_tokens: args.max_tokens, temperature: args.temperature });
        return { content: [{ type: "text", text: r.text || "(empty reply)" }, { type: "text", text: formatChatFooter(r) }] };
      }),
  );

  server.registerTool(
    "get_balance",
    {
      title: "Surplus balance",
      description: "Show the USD credit balance and the free daily allowance for the configured API key.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () => guarded(async () => json({ ...(await client.balance()), allowance: await client.allowance() })),
  );

  server.registerTool(
    "get_usage",
    {
      title: "Surplus usage",
      description: "List the most recent requests billed to the configured API key, newest first, with model, tokens and cost.",
      inputSchema: { limit: z.number().int().min(1).max(USAGE_MAX).optional().describe(`How many rows, 1–${USAGE_MAX} (default 20)`) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ limit }) => guarded(async () => json((await client.usage(limit ?? 20)).data ?? [])),
  );

  server.registerTool(
    "get_tee_receipt",
    {
      title: "Confidential inference receipt",
      description: "Fetch the signed TEE receipt for one of your confidential (tee/…) responses, to verify it ran inside the enclave.",
      inputSchema: { id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).describe("Receipt id from the x-surplus-tee-receipt header") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ id }) => guarded(async () => json(await client.teeReceipt(id))),
  );
}

interface MessageArgs {
  readonly prompt?: string;
  readonly system?: string;
  readonly messages?: readonly ChatMessage[];
}

export function buildMessages(args: MessageArgs): readonly ChatMessage[] | null {
  if (args.messages && args.messages.length > 0) return args.messages;
  if (!args.prompt) return null;
  const system: ChatMessage[] = args.system ? [{ role: "system", content: args.system }] : [];
  return [...system, { role: "user", content: args.prompt }];
}

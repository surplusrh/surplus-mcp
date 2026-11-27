import type { Config } from "./config.js";

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly role: Role;
  readonly content: string;
}

export interface ChatRequest {
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly max_tokens?: number;
  readonly temperature?: number;
}

export interface ChatResult {
  readonly model: string;
  readonly text: string;
  readonly finishReason: string | null;
  readonly usage: { readonly prompt_tokens?: number; readonly completion_tokens?: number } | null;
  readonly costUsd: string | null;
  readonly requestId: string | null;
}

export interface Model {
  readonly id: string;
  readonly name?: string;
  readonly context_length?: number;
  readonly pricing?: { readonly prompt: number; readonly completion: number };
  readonly architecture?: { readonly input_modalities?: readonly string[] };
  readonly supported_parameters?: readonly string[];
}

export class SurplusError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

/** A small typed wrapper over the OpenAI-compatible Surplus API. */
export class SurplusClient {
  constructor(
    private readonly config: Config,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  get hasKey(): boolean {
    return this.config.apiKey !== null;
  }

  async listModels(): Promise<readonly Model[]> {
    const body = await this.request<{ data?: unknown }>("GET", "/models", { auth: false });
    return Array.isArray(body.data) ? (body.data as Model[]) : [];
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const { body, headers } = await this.requestWithHeaders<ChatResponse>("POST", "/chat/completions", {
      body: { ...req, stream: false },
    });
    const choice = body.choices?.[0];
    return {
      model: body.model ?? req.model,
      text: typeof choice?.message?.content === "string" ? choice.message.content : "",
      finishReason: choice?.finish_reason ?? null,
      usage: body.usage ?? null,
      costUsd: headers.get("x-surplus-cost-usd"),
      requestId: headers.get("x-surplus-request-id"),
    };
  }

  balance(): Promise<{ balance_usd: string | number }> {
    return this.request("GET", "/balance");
  }

  allowance(): Promise<Record<string, unknown>> {
    return this.request("GET", "/allowance");
  }

  usage(limit: number): Promise<{ data?: readonly Record<string, unknown>[] }> {
    return this.request("GET", `/usage?limit=${encodeURIComponent(String(limit))}`);
  }

  teeReceipt(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/tee/receipts/${encodeURIComponent(id)}`);
  }

  private async request<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
    return (await this.requestWithHeaders<T>(method, path, opts)).body;
  }

  private async requestWithHeaders<T>(method: string, path: string, opts: RequestOpts): Promise<{ body: T; headers: Headers }> {
    const auth = opts.auth ?? true;
    if (auth && !this.config.apiKey) {
      throw new SurplusError("SURPLUS_API_KEY is not set. Create a key at https://surplusllm.com/account.", 401, "missing_api_key");
    }
    const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "surplus-mcp" };
    if (auth && this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (err) {
      const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "could not be reached";
      throw new SurplusError(`The Surplus API ${reason}. Retry shortly.`, 0, "network_error");
    }

    const text = await res.text();
    const parsed = parseJson(text);
    if (!res.ok) throw toError(res.status, parsed);
    if (parsed === undefined) throw new SurplusError("The Surplus API returned a non-JSON response.", res.status, "bad_response");
    return { body: parsed as T, headers: res.headers };
  }
}

interface RequestOpts {
  readonly auth?: boolean;
  readonly body?: unknown;
}

interface ChatResponse {
  readonly model?: string;
  readonly choices?: readonly { readonly message?: { readonly content?: unknown }; readonly finish_reason?: string | null }[];
  readonly usage?: ChatResult["usage"];
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toError(status: number, body: unknown): SurplusError {
  const err = (body as { error?: { message?: unknown; code?: unknown } } | undefined)?.error;
  const message = typeof err?.message === "string" ? err.message : `Request failed with HTTP ${status}.`;
  const code = typeof err?.code === "string" ? err.code : null;
  return new SurplusError(message, status, code);
}

import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/tools.js";
import { connect, jsonResponse, KEY, stubFetch, testConfig, textOf } from "./helpers.js";

const chatReply = () =>
  jsonResponse(
    { model: "qwen/qwen3.8-flash", choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }], usage: { prompt_tokens: 4, completion_tokens: 2 } },
    200,
    { "x-surplus-cost-usd": "0.000001", "x-surplus-request-id": "req_1" },
  );

describe("MCP server", () => {
  it("exposes the five tools", async () => {
    const client = await connect(testConfig(), stubFetch({}).fetch);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["chat", "get_balance", "get_tee_receipt", "get_usage", "list_models"]);
  });

  it("list_models calls the public endpoint without a key", async () => {
    const stub = stubFetch({ "/models": () => jsonResponse({ data: [{ id: "qwen/qwen3.8-flash", context_length: 1000 }] }) });
    const client = await connect(testConfig({ apiKey: null }), stub.fetch);
    const r = await client.callTool({ name: "list_models", arguments: { search: "qwen" } });
    expect(textOf(r)).toContain("qwen/qwen3.8-flash");
    expect(new Headers(stub.calls[0]!.init.headers).get("Authorization")).toBeNull();
  });

  it("chat sends the key and a non-streaming body, and reports cost", async () => {
    const stub = stubFetch({ "/chat/completions": chatReply });
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "chat", arguments: { model: "qwen/qwen3.8-flash", prompt: "hi", system: "be brief" } });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).toContain("Hello!");
    expect(textOf(r)).toContain("cost: $0.000001");
    const call = stub.calls[0]!;
    expect(new Headers(call.init.headers).get("Authorization")).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(call.init.body))).toEqual({
      model: "qwen/qwen3.8-flash",
      messages: [
        { role: "system", content: "be brief" },
        { role: "user", content: "hi" },
      ],
      stream: false,
    });
  });

  it("chat falls back to the default model", async () => {
    const stub = stubFetch({ "/chat/completions": chatReply });
    const client = await connect(testConfig({ defaultModel: "z-ai/glm-5.3-flash" }), stub.fetch);
    await client.callTool({ name: "chat", arguments: { prompt: "hi" } });
    expect(JSON.parse(String(stub.calls[0]!.init.body)).model).toBe("z-ai/glm-5.3-flash");
  });

  it("chat without a model or prompt is a tool error, not a request", async () => {
    const stub = stubFetch({});
    const client = await connect(testConfig(), stub.fetch);
    expect((await client.callTool({ name: "chat", arguments: { prompt: "hi" } })).isError).toBe(true);
    expect((await client.callTool({ name: "chat", arguments: { model: "m" } })).isError).toBe(true);
    expect(stub.calls).toHaveLength(0);
  });

  it("chat without a key fails clearly", async () => {
    const client = await connect(testConfig({ apiKey: null }), stubFetch({}).fetch);
    const r = await client.callTool({ name: "chat", arguments: { model: "m", prompt: "hi" } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("SURPLUS_API_KEY is not set");
  });

  it("surfaces the API's error message", async () => {
    const stub = stubFetch({
      "/chat/completions": () => jsonResponse({ error: { message: "Insufficient balance.", code: "insufficient_quota" } }, 402),
    });
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "chat", arguments: { model: "m", prompt: "hi" } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toBe("Surplus API error (HTTP 402): Insufficient balance.");
  });

  it("reports a network failure without throwing", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const client = await connect(testConfig(), failing);
    const r = await client.callTool({ name: "list_models", arguments: {} });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("could not be reached");
  });

  it("get_balance combines balance and allowance", async () => {
    const stub = stubFetch({
      "/balance": () => jsonResponse({ account: "a1", balance_usd: "4.20" }),
      "/allowance": () => jsonResponse({ enabled: false }),
    });
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "get_balance", arguments: {} });
    expect(JSON.parse(textOf(r))).toEqual({ account: "a1", balance_usd: "4.20", allowance: { enabled: false } });
  });

  it("get_usage passes the limit", async () => {
    const stub = stubFetch({ "/usage": () => jsonResponse({ data: [{ model: "m", cost_usd: "0.01" }] }) });
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "get_usage", arguments: { limit: 5 } });
    expect(stub.calls[0]!.url).toBe("https://api.test/api/v1/usage?limit=5");
    expect(JSON.parse(textOf(r))).toEqual([{ model: "m", cost_usd: "0.01" }]);
  });

  it("get_tee_receipt rejects ids that could escape the path", async () => {
    const stub = stubFetch({});
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "get_tee_receipt", arguments: { id: "../balance" } });
    expect(r.isError).toBe(true);
    expect(stub.calls).toHaveLength(0);
  });

  it("rejects a non-JSON success body", async () => {
    const stub = stubFetch({ "/models": () => new Response("<html>", { status: 200 }) });
    const client = await connect(testConfig(), stub.fetch);
    const r = await client.callTool({ name: "list_models", arguments: {} });
    expect(textOf(r)).toContain("non-JSON");
  });
});

describe("buildMessages", () => {
  it("prefers messages over prompt", () => {
    const messages = [{ role: "user" as const, content: "a" }];
    expect(buildMessages({ messages, prompt: "b" })).toBe(messages);
    expect(buildMessages({ prompt: "b" })).toEqual([{ role: "user", content: "b" }]);
    expect(buildMessages({})).toBeNull();
  });
});

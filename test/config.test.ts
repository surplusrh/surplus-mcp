import { describe, expect, it } from "vitest";
import { ConfigError, DEFAULT_BASE_URL, loadConfig } from "../src/config.js";
import { KEY } from "./helpers.js";

describe("loadConfig", () => {
  it("uses defaults with only a key", () => {
    const c = loadConfig({ SURPLUS_API_KEY: KEY });
    expect(c).toEqual({ apiKey: KEY, baseUrl: DEFAULT_BASE_URL, defaultModel: null, timeoutMs: 120_000 });
  });

  it("allows a missing key", () => {
    expect(loadConfig({}).apiKey).toBeNull();
  });

  it("rejects a key with the wrong prefix", () => {
    expect(() => loadConfig({ SURPLUS_API_KEY: "sk-or-123" })).toThrow(ConfigError);
  });

  it("rejects plain http except on localhost", () => {
    expect(() => loadConfig({ SURPLUS_BASE_URL: "http://evil.example/v1" })).toThrow(/https/);
    expect(loadConfig({ SURPLUS_BASE_URL: "http://localhost:8787/api/v1/" }).baseUrl).toBe("http://localhost:8787/api/v1");
  });

  it("rejects a bad URL and a bad timeout", () => {
    expect(() => loadConfig({ SURPLUS_BASE_URL: "not a url" })).toThrow(/valid URL/);
    expect(() => loadConfig({ SURPLUS_TIMEOUT_MS: "5" })).toThrow(/TIMEOUT/);
  });

  it("reads the default model", () => {
    expect(loadConfig({ SURPLUS_DEFAULT_MODEL: " qwen/qwen3.8-flash " }).defaultModel).toBe("qwen/qwen3.8-flash");
  });
});

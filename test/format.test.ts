import { describe, expect, it } from "vitest";
import { filterModels, formatChatFooter, formatModels, perMillion } from "../src/format.js";

const models = [
  { id: "qwen/qwen3.8-flash", name: "Qwen 3.8 Flash", context_length: 262_144, pricing: { prompt: 0.0000001, completion: 0.0000004 } },
  {
    id: "anthropic/claude-fable-5.2",
    context_length: 1_000_000,
    pricing: { prompt: 0.0000088, completion: 0.000044 },
    architecture: { input_modalities: ["text", "image"] },
    supported_parameters: ["tools"],
  },
];

describe("format", () => {
  it("prices per million tokens", () => {
    expect(perMillion(0.0000088)).toBe("$8.80");
    expect(perMillion(0.0000001)).toBe("$0.100");
    expect(perMillion(undefined)).toBe("?");
  });

  it("filters by id or name, case-insensitively", () => {
    expect(filterModels(models, "CLAUDE").map((m) => m.id)).toEqual(["anthropic/claude-fable-5.2"]);
    expect(filterModels(models, "flash").map((m) => m.id)).toEqual(["qwen/qwen3.8-flash"]);
    expect(filterModels(models, " ")).toHaveLength(2);
  });

  it("lists models with capabilities", () => {
    const out = formatModels(models);
    expect(out).toContain("2 model(s)");
    expect(out).toContain("- anthropic/claude-fable-5.2 (1000k ctx, vision, tools) $8.80 in / $44.00 out per 1M");
    expect(formatModels([])).toBe("No models matched.");
  });

  it("summarises a chat result", () => {
    const footer = formatChatFooter({
      model: "m",
      text: "",
      finishReason: "length",
      usage: { prompt_tokens: 3, completion_tokens: 5 },
      costUsd: "0.000012",
      requestId: null,
    });
    expect(footer).toBe("model: m · tokens: 3 in / 5 out · cost: $0.000012 · finish: length");
  });
});

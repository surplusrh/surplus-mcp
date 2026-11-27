import type { ChatResult, Model } from "./client.js";

const PER_MILLION = 1_000_000;

/** Per-token USD price as dollars per 1M tokens, e.g. 0.0000088 → "$8.80". */
export function perMillion(price: number | undefined): string {
  if (price === undefined || !Number.isFinite(price)) return "?";
  const v = price * PER_MILLION;
  return `$${v >= 1 ? v.toFixed(2) : v.toFixed(3)}`;
}

export function filterModels(models: readonly Model[], search: string | undefined): readonly Model[] {
  const q = search?.trim().toLowerCase();
  if (!q) return models;
  return models.filter((m) => m.id.toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q));
}

export function formatModels(models: readonly Model[]): string {
  if (models.length === 0) return "No models matched.";
  const lines = models.map((m) => {
    const ctx = m.context_length ? `${Math.round(m.context_length / 1000)}k ctx` : "? ctx";
    const vision = m.architecture?.input_modalities?.includes("image") ? ", vision" : "";
    const tools = m.supported_parameters?.includes("tools") ? ", tools" : "";
    const price = `${perMillion(m.pricing?.prompt)} in / ${perMillion(m.pricing?.completion)} out per 1M`;
    return `- ${m.id} (${ctx}${vision}${tools}) ${price}`;
  });
  return `${models.length} model(s):\n${lines.join("\n")}`;
}

export function formatChatFooter(r: ChatResult): string {
  const parts = [`model: ${r.model}`];
  if (r.usage?.prompt_tokens !== undefined) parts.push(`tokens: ${r.usage.prompt_tokens} in / ${r.usage.completion_tokens ?? 0} out`);
  if (r.costUsd) parts.push(`cost: $${r.costUsd}`);
  if (r.finishReason && r.finishReason !== "stop") parts.push(`finish: ${r.finishReason}`);
  return parts.join(" · ");
}

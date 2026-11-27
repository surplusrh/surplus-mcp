export const DEFAULT_BASE_URL = "https://api.surplusllm.com/api/v1";
export const KEY_PREFIX = "sk-surplus-";
export const DEFAULT_TIMEOUT_MS = 120_000;

export interface Config {
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly defaultModel: string | null;
  readonly timeoutMs: number;
}

export class ConfigError extends Error {}

/** Reads and validates the environment once at startup; fails fast with a message a user can act on. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const apiKey = env.SURPLUS_API_KEY?.trim() || null;
  if (apiKey !== null && !apiKey.startsWith(KEY_PREFIX)) {
    throw new ConfigError(`SURPLUS_API_KEY must start with "${KEY_PREFIX}". Create one at https://surplusllm.com/account.`);
  }

  const rawBase = env.SURPLUS_BASE_URL?.trim() || DEFAULT_BASE_URL;
  let base: URL;
  try {
    base = new URL(rawBase);
  } catch {
    throw new ConfigError(`SURPLUS_BASE_URL is not a valid URL: ${rawBase}`);
  }
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (base.protocol !== "https:" && !(local && base.protocol === "http:")) {
    throw new ConfigError("SURPLUS_BASE_URL must use https (http is allowed only for localhost).");
  }

  const rawTimeout = env.SURPLUS_TIMEOUT_MS?.trim();
  const timeoutMs = rawTimeout ? Number(rawTimeout) : DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000) {
    throw new ConfigError("SURPLUS_TIMEOUT_MS must be a whole number of milliseconds, at least 1000.");
  }

  return {
    apiKey,
    baseUrl: base.toString().replace(/\/+$/, ""),
    defaultModel: env.SURPLUS_DEFAULT_MODEL?.trim() || null,
    timeoutMs,
  };
}

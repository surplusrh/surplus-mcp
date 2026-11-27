#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConfigError, loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  if (!config.apiKey) {
    // stdout belongs to the MCP protocol; diagnostics go to stderr.
    console.error("surplus-mcp: SURPLUS_API_KEY is not set. list_models works; chat, balance and usage need a key.");
  }
  await createServer(config).connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(`surplus-mcp: ${err instanceof ConfigError ? err.message : err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});

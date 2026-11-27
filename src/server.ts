import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SurplusClient } from "./client.js";
import type { Config } from "./config.js";
import { registerTools } from "./tools.js";
import { VERSION } from "./version.js";

export function createServer(config: Config, fetchImpl: typeof fetch = fetch): McpServer {
  const server = new McpServer(
    { name: "surplus", version: VERSION },
    {
      instructions:
        "Surplus is an OpenAI-compatible inference API. Use list_models to find a model id, then chat to run it. " +
        "Requests are billed to the user's Surplus key; check get_balance before long or expensive jobs.",
    },
  );
  registerTools(server, new SurplusClient(config, fetchImpl), config.defaultModel);
  return server;
}

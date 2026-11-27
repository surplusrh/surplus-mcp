<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
  <img src="assets/logo-light.png" alt="Surplus" width="280">
</picture>

### The official MCP server for Surplus

Give Claude, Cursor, Windsurf and any MCP client direct access to open and frontier LLMs,<br>
with live pricing and spend tracking, through one API key.

[![npm](https://img.shields.io/npm/v/surplus-mcp?color=111&label=npm)](https://www.npmjs.com/package/surplus-mcp)
[![CI](https://github.com/surplusrh/surplus-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/surplusrh/surplus-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-111)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-111)](https://modelcontextprotocol.io)

[Website](https://surplusllm.com) · [Get an API key](https://surplusllm.com/account) · [Report an issue](https://github.com/surplusrh/surplus-mcp/issues)

</div>

---

## Why

Your assistant is good at one model. Surplus gives it the rest of the catalogue: Qwen, DeepSeek, GLM, Claude and
more behind a single OpenAI-compatible API. With this server installed, your agent can:

- **Delegate work to the right model.** Hand a long summarisation to a cheap fast model, or ask a second model for a
  review.
- **Compare models side by side** on the same prompt without leaving the chat.
- **Stay inside budget.** Every reply comes back with its token count and exact USD cost, and the agent can check your
  balance before a long job.
- **Verify confidential inference.** Fetch the signed enclave receipt for any `tee/…` response.

## Quick start

**1. Get a key** at [surplusllm.com/account](https://surplusllm.com/account). It looks like `sk-surplus-…`.

**2. Add the server to your client.**

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add surplus -e SURPLUS_API_KEY=sk-surplus-... -- npx -y surplus-mcp
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Settings → Developer → Edit Config, then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "surplus": {
      "command": "npx",
      "args": ["-y", "surplus-mcp"],
      "env": { "SURPLUS_API_KEY": "sk-surplus-..." }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "surplus": {
      "command": "npx",
      "args": ["-y", "surplus-mcp"],
      "env": { "SURPLUS_API_KEY": "sk-surplus-..." }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "surplus": {
      "command": "npx",
      "args": ["-y", "surplus-mcp"],
      "env": { "SURPLUS_API_KEY": "sk-surplus-..." }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code (Copilot agent mode)</b></summary>

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "surplus": {
      "command": "npx",
      "args": ["-y", "surplus-mcp"],
      "env": { "SURPLUS_API_KEY": "sk-surplus-..." }
    }
  }
}
```

</details>

**3. Ask your assistant.**

> *"List the Qwen models on Surplus and their prices."*
>
> *"Ask qwen/qwen3.8-flash and deepseek/deepseek-v4-flash to explain this function, then compare the answers."*
>
> *"How much have I spent on Surplus today?"*

## Tools

| Tool | Description | Key required |
| :--- | :--- | :---: |
| `list_models` | Every available model with context length, vision and tool-calling support, and USD price per 1M tokens. Filter with `search`. | — |
| `chat` | Run a single `prompt` or a full `messages` conversation on any model. Returns the reply plus tokens used and cost. | ✓ |
| `get_balance` | Your credit balance and free daily allowance. | ✓ |
| `get_usage` | Your most recent billed requests, newest first. | ✓ |
| `get_tee_receipt` | The signed enclave receipt for a confidential (`tee/…`) response. | ✓ |

## Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SURPLUS_API_KEY` | — | Your API key. Without it, only `list_models` is available. |
| `SURPLUS_DEFAULT_MODEL` | — | Model `chat` uses when none is given, e.g. `qwen/qwen3.8-flash`. |
| `SURPLUS_BASE_URL` | `https://api.surplusllm.com/api/v1` | API endpoint. Must be `https` (plain `http` is allowed for `localhost` only). |
| `SURPLUS_TIMEOUT_MS` | `120000` | Per-request timeout in milliseconds. |

## Security

- Your key is sent only to `SURPLUS_BASE_URL`, over HTTPS, and is never logged.
- The server runs locally over stdio. It opens no ports and stores nothing on disk.
- API errors come back to the assistant as readable tool errors; they never crash the server.

## Development

Requires Node.js 20 or later.

```bash
git clone https://github.com/surplusrh/surplus-mcp.git
cd surplus-mcp
npm install
npm test
npm run build
```

Explore the tools interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Contributions are welcome. Please open an issue first for anything larger than a small fix.

## License

[MIT](LICENSE) © Surplus

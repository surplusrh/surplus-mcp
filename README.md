# surplus-mcp

An [MCP](https://modelcontextprotocol.io) server for [Surplus](https://surplusllm.com), the OpenAI-compatible inference
API. Add it to Claude Desktop, Claude Code, Cursor, Windsurf or any MCP client, and your assistant can call Surplus
models, check prices and watch its own spend.

## Tools

| Tool | What it does | Needs a key |
| --- | --- | --- |
| `list_models` | Models with context length, vision/tool support and USD price per 1M tokens. Optional `search`. | No |
| `chat` | Runs a prompt (or a full `messages` conversation) on a model and returns the reply, tokens and cost. | Yes |
| `get_balance` | Credit balance and free daily allowance for your key. | Yes |
| `get_usage` | Your most recent billed requests, newest first. | Yes |
| `get_tee_receipt` | The signed enclave receipt for a confidential (`tee/…`) response. | Yes |

## Get a key

Sign in at [surplusllm.com/account](https://surplusllm.com/account) and create an API key (`sk-surplus-…`).

## Setup

### Claude Code

```bash
claude mcp add surplus -e SURPLUS_API_KEY=sk-surplus-... -- npx -y surplus-mcp
```

### Claude Desktop, Cursor, Windsurf

Add to the client's MCP config (`claude_desktop_config.json`, `~/.cursor/mcp.json`, …):

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

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `SURPLUS_API_KEY` | none | Your key. Without it only `list_models` works. |
| `SURPLUS_DEFAULT_MODEL` | none | Model `chat` uses when the caller gives none, e.g. `qwen/qwen3.8-flash`. |
| `SURPLUS_BASE_URL` | `https://api.surplusllm.com/api/v1` | Override for self-hosted or local gateways. Must be https (http only for localhost). |
| `SURPLUS_TIMEOUT_MS` | `120000` | Per-request timeout. |

Your key is only sent to `SURPLUS_BASE_URL`, and never logged.

## Development

```bash
npm install
npm test
npm run build
```

Try it with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT

# scaffold-agent

A multi-layered AI agent system with orchestrator, specialists, and workers. Built on the Anthropic Claude Code SDK (`@anthropic-ai/claude-code`).

## Quick Start

1. `cp .env.example .env` — add your API keys
2. `npm install`
3. `npm run build`
4. `npm start`

## Providers

This scaffold is **Anthropic-only**. It uses the `@anthropic-ai/claude-code` SDK which communicates with Anthropic's Claude models directly.

- Set `ANTHROPIC_API_KEY` in your `.env` file.
- Select your model via `CLAUDE_MODEL` (default: `claude-sonnet-4-5`).

Supported models: `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-3-5-sonnet`, `claude-3-5-haiku`.

## Architecture

Three-layer agent hierarchy:

```
OrchestratorAgent       ← Layer 1: task planning and delegation
  ├── CodeSpecialist     ← Layer 2: domain-focused execution
  ├── ResearchSpecialist
  ├── DataSpecialist
  └── SecuritySpecialist
        └── Workers      ← Layer 3: atomic file/search/transform tasks
```

## Configuration

Edit `src/core/config.ts` to set model, tools, budget limits, and hook behavior.

Key environment variables:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key. |
| `CLAUDE_MODEL` | `claude-sonnet-4-5` | Model to use. |
| `MAX_TURNS` | `50` | Maximum agentic turns per task. |
| `MAX_BUDGET_USD` | `10.0` | Spend cap per task in USD. |
| `WS_PORT` | `3001` | WebSocket port for the progress listener. |
| `ALLOWED_PATHS` | `/workspace,/tmp` | Paths the agent may read/write. |
| `BLOCKED_COMMANDS` | `rm -rf,sudo,...` | Shell commands the agent may not run. |

## Usage

```typescript
import { createSystem } from "scaffold-agent";

const system = await createSystem({
  model: "claude-sonnet-4-5",
  maxTurns: 30,
});

const result = await system.execute("Refactor src/utils.ts to use async/await");
console.log(result.output);
await system.shutdown();
```

## Skills

Drop a `SKILL.md` file into `src/skills/<skill-name>/`. Skills are auto-loaded and injected into the system prompt when their activation keywords appear in the task.

## Runtime

Node.js >= 20. Scripts use `tsc` + `node dist/`. There is no Bun-specific setup — standard `npm install` and `npm run build` work out of the box.

# open-scaffolds

## Project Overview
App scaffolds for AI agents. Install production-ready app templates with a single command.

## Architecture
- **Hub**: `src/` — registry, installer, runner, CLI, MCP server (management layer)
- **Scaffolds**: `scaffolds/scaffold-<name>/` — individual app templates
- **Installed**: `.scaffolds/<name>/` — installed scaffolds in user projects

## Key Files
- `src/lib/registry.ts` — all scaffold metadata
- `src/lib/installer.ts` — copies scaffold to target dir, replaces template vars
- `src/lib/runner.ts` — runs post-install setup commands
- `src/mcp/index.ts` — MCP server
- `src/cli/index.tsx` — hub CLI

## Scaffolds
- scaffold-saas — Full SaaS (Next.js 15, Drizzle, Auth, Stripe)
- scaffold-agent — Multi-provider agent (OpenAI + Anthropic) with loop
- scaffold-blog — Blog engine (from engine-blog)
- scaffold-news — News platform (from engine-news)
- scaffold-landing-pages — Landing page builder (from engine-lander)
- scaffold-review — Product reviews (from engine-review)
- scaffold-social — Social media platform
- scaffold-competition — Hackathon/competition platform

## All app scaffolds require:
- OAuth (Google + GitHub)
- Email + password auth
- Magic link auth
- Bun + TypeScript strict

## Adding a New Scaffold
1. Create `scaffolds/scaffold-<name>/` with full app
2. Add entry to `src/lib/registry.ts`
3. Test with `scaffolds install <name>`

## Running Tests
```bash
bun test
```

## Build
```bash
bun run build
```

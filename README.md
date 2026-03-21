# @hasna/scaffolds

App scaffolds for AI agents. Install production-ready app templates with a single command.

## Install

```bash
bun install -g @hasna/scaffolds
```

## Setup MCP Server

```bash
scaffolds mcp --register all
```

Or individually:
```bash
scaffolds mcp --register claude
scaffolds mcp --register codex
scaffolds mcp --register gemini
```

## Quick Start

```bash
# Browse scaffolds
scaffolds

# List all
scaffolds list

# Install a scaffold
scaffolds install saas --dir ./my-app --name "My App"

# Get info
scaffolds info blog
```

## Available Scaffolds

| Name | Category | Description | Auth |
|------|----------|-------------|------|
| `saas` | App | Full SaaS — Next.js 15, Drizzle, Auth, Stripe | OAuth · Email · Magic Link |
| `agent` | AI | Anthropic-primary agent (OpenAI also supported) with task loop | — |
| `blog` | App | Blog engine — Hono API + React/Vite, posts, tags, comments | OAuth · Email · Magic Link |
| `news` | App | News platform with articles, categories, feeds | OAuth · Email · Magic Link |
| `landing-pages` | App | Landing page builder with leads and analytics | OAuth · Email · Magic Link |
| `review` | App | Product review platform with ratings and moderation | OAuth · Email · Magic Link |
| `social` | App | Social media — feed, follows, likes, notifications | OAuth · Email · Magic Link |
| `competition` | App | Hackathon platform — teams, submissions, judging | OAuth · Email · Magic Link |

## CLI Commands

```bash
scaffolds                             # Interactive TUI
scaffolds list                        # List all scaffolds
scaffolds list --installed            # Installed only
scaffolds search <query>              # Search
scaffolds info <name>                 # Details + tech stack
scaffolds install <name> [--dir]      # Install to directory
scaffolds categories                  # List categories
scaffolds status                      # Installed in current project
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_scaffolds` | List with optional category filter |
| `search_scaffolds` | Search by name/keyword |
| `scaffold_info` | Metadata + tech stack + auth |
| `install_scaffold` | Copy scaffold to target dir |
| `list_categories` | Categories with counts |
| `list_installed` | Installed in a directory |

## App Scaffold Auth

All app scaffolds (saas, blog, news, landing-pages, review, social, competition) include three auth methods out of the box:

- **OAuth** — Google and GitHub (set `AUTH_GOOGLE_ID`, `AUTH_GITHUB_ID`)
- **Email + Password** — bcrypt hashed, email verification
- **Magic Link** — passwordless via Resend (set `RESEND_API_KEY`, `AUTH_EMAIL_FROM`)

## Architecture

```
scaffolds/
├── scaffold-saas/           # Next.js 15 monorepo (Turbo)
├── scaffold-agent/          # Bun TypeScript agent (Anthropic-primary)
├── scaffold-blog/           # Hono API + React/Vite
├── scaffold-news/           # Next.js 15 (based on saas)
├── scaffold-landing-pages/  # Next.js 15 (based on saas)
├── scaffold-review/         # Next.js 15 (based on saas)
├── scaffold-social/         # Next.js 15 (based on saas)
└── scaffold-competition/    # Next.js 15 (based on saas)
src/
├── lib/registry.ts          # Scaffold metadata registry
├── lib/installer.ts         # Copy + template var replacement
├── lib/runner.ts            # Post-install commands
├── cli/index.tsx            # Commander + Ink TUI
└── mcp/index.ts             # MCP server
```

## Library API

```typescript
import { SCAFFOLDS, searchScaffolds, installScaffold } from "@hasna/scaffolds";

// List all
console.log(Object.values(SCAFFOLDS));

// Search
const results = searchScaffolds("social");

// Install
const result = await installScaffold("social", {
  targetDir: "./my-social-app",
  name: "MySocial",
  description: "My social media platform",
});
```

## License

Apache-2.0

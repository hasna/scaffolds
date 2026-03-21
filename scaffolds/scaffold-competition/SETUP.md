# {{name}}

A hackathon and competition platform — create competitions, form teams, submit projects, and judge entries.

## Quick Start
1. cp .env.example .env
2. bun install
3. docker compose up -d postgres redis
4. bun db:push && bun db:seed
5. bun dev

## Features
- Competition lifecycle: draft → open → judging → closed
- Team formation with invites and max team size
- Project submission with URL, demo, and repo links
- Judge panel with 1-10 scoring and feedback
- Public submissions gallery

## Auth
Google/GitHub OAuth + Email/Password + Magic Link

## Tech Stack
Next.js 15 · Drizzle ORM · PostgreSQL · NextAuth.js · Bun · TypeScript · Tailwind · shadcn/ui

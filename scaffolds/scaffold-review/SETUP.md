# {{name}}

A product review platform with ratings, moderation, and voting.

## Quick Start
1. cp .env.example .env
2. bun install
3. docker compose up -d postgres redis
4. bun db:push && bun db:seed
5. bun dev

## Features
- Product catalog with categories
- Star ratings (1-5) with review text
- Admin moderation (approve/reject reviews)
- Helpful vote system
- Auth: Google/GitHub OAuth + Email/Password + Magic Link

## Tech Stack
Next.js 15 · Drizzle ORM · PostgreSQL · NextAuth.js · Bun · TypeScript · Tailwind · shadcn/ui

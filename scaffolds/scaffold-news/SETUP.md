# {{name}}

A news/media platform with articles, categories, tags, and comments.

## Quick Start
1. cp .env.example .env
2. bun install
3. docker compose up -d postgres redis
4. bun db:push && bun db:seed
5. bun dev

## Auth
- Google OAuth: AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
- GitHub OAuth: AUTH_GITHUB_ID + AUTH_GITHUB_SECRET
- Email/Password: works out of the box
- Magic Link: AUTH_EMAIL_FROM + RESEND_API_KEY

## Tech Stack
Next.js 15 · Drizzle ORM · PostgreSQL · NextAuth.js · Bun · TypeScript · Tailwind CSS · shadcn/ui

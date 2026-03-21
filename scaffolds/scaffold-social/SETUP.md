# {{name}}

A social media platform with feed, follows, likes, and notifications.

## Quick Start
1. cp .env.example .env
2. bun install
3. docker compose up -d postgres redis
4. bun db:push && bun db:seed
5. bun dev

## Features
- Chronological feed from followed users
- Posts with likes, comments, reposts
- Follow/unfollow users
- Notifications (likes, comments, follows)
- User profiles with avatar, bio, stats

## Auth
Google/GitHub OAuth + Email/Password + Magic Link

## Tech Stack
Next.js 15 · Drizzle ORM · PostgreSQL · NextAuth.js · Bun · TypeScript · Tailwind · shadcn/ui

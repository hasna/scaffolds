# scaffold-landing-pages

A landing page builder — create, publish, and collect leads.

## Quick Start

1. cp .env.example .env
2. bun install
3. docker compose up -d postgres redis
4. bun db:push && bun db:seed
5. bun dev

## Features

- Section-based page builder (hero, features, CTA, pricing, footer)
- Lead capture with email collection
- Custom slugs
- View count analytics

## Auth

Google/GitHub OAuth + Email/Password + Magic Link

## Tech Stack

Next.js 15 · Drizzle ORM · PostgreSQL · NextAuth.js · Bun · TypeScript · Tailwind · shadcn/ui

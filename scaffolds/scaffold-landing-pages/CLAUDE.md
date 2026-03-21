# Scaffold SaaS

A production-ready SaaS scaffold with authentication, multi-tenancy, billing, and AI assistant.

## First Time Setup

1. **Create local PostgreSQL database:**

   ```bash
   psql postgres -c "CREATE DATABASE scaffold_saas;"
   ```

2. **Copy and configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL=postgresql://YOUR_USER@localhost:5432/scaffold_saas
   ```

3. **Push database schema:**

   ```bash
   DATABASE_URL="postgresql://YOUR_USER@localhost:5432/scaffold_saas" bunx drizzle-kit push --force
   ```

4. **Seed database (creates test user):**

   ```bash
   DATABASE_URL="postgresql://YOUR_USER@localhost:5432/scaffold_saas" bun run src/seeds/index.ts
   ```

   (Run from `packages/database` directory)

5. **Start dev server:**
   ```bash
   bun dev:web
   ```

## Development

### Dev Server

```bash
bun dev:web      # Start web app on port 5900
bun dev          # Start all apps (web + workers)
```

**URL**: http://localhost:5900

### Database (Local PostgreSQL)

```bash
# Schema operations (set DATABASE_URL first)
bunx drizzle-kit push --force   # Push schema changes
bunx drizzle-kit studio         # Open Drizzle Studio

# From packages/database directory
bun run src/seeds/index.ts      # Seed database (includes test user)
```

## Dev Test Credentials

Use these credentials for local development and testing:

| Field    | Value            |
| -------- | ---------------- |
| Email    | andrei@hasna.com |
| Password | TestDev#2024!    |
| Role     | super_admin      |
| Tenant   | hasna-dev        |

**To seed the test user:**

```bash
bun db:seed
```

## Project Structure

```
scaffold-landing-pages/
├── apps/
│   ├── web/              # Next.js web application (port 5900)
│   └── workers/          # Background job workers
├── packages/
│   ├── database/         # Drizzle ORM, schemas, seeds
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
├── e2e/                  # Playwright E2E tests
└── .claude/              # Claude Code config and agents
```

## Key Routes

### Marketing (Public)

- `/` - Homepage
- `/pricing` - Pricing page
- `/docs` - Documentation
- `/docs/api` - API Reference

### Auth

- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset

### Dashboard (Authenticated)

- `/dashboard` - Main dashboard
- `/dashboard/assistant` - AI Assistant
- `/dashboard/billing` - Billing & subscription
- `/dashboard/settings` - User settings
- `/dashboard/team` - Team management
- `/dashboard/webhooks` - Webhook configuration

### Admin (super_admin only)

- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/tenants` - Tenant management
- `/admin/analytics` - Analytics
- `/admin/feature-flags` - Feature flags
- `/admin/health` - System health

## Testing

```bash
bun test              # Unit tests (Vitest)
bun test:e2e          # E2E tests (Playwright)
bun test:e2e:ui       # E2E tests with UI
```

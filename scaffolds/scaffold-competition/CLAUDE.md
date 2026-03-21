# Scaffold Competition

A production-ready hackathon and competition platform scaffold with authentication, team formation, submissions, and judging.

## First Time Setup

1. **Create local PostgreSQL database:**

   ```bash
   psql postgres -c "CREATE DATABASE scaffold_competition;"
   ```

2. **Copy and configure environment:**

   ```bash
   cp apps/web/.env.example apps/web/.env
   # Edit .env and set DATABASE_URL=postgresql://YOUR_USER@localhost:5432/scaffold_competition
   ```

3. **Push database schema:**

   ```bash
   DATABASE_URL="postgresql://YOUR_USER@localhost:5432/scaffold_competition" bunx drizzle-kit push --force
   ```

4. **Seed database (creates test user):**

   ```bash
   DATABASE_URL="postgresql://YOUR_USER@localhost:5432/scaffold_competition" bun run src/seeds/index.ts
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

| Field    | Value            |
| -------- | ---------------- |
| Email    | andrei@hasna.com |
| Password | TestDev#2024!    |
| Role     | super_admin      |

## Project Structure

```
scaffold-competition/
├── apps/
│   ├── web/              # Next.js web application (port 5900)
│   └── workers/          # Background job workers
├── packages/
│   ├── database/         # Drizzle ORM, schemas, seeds
│   │   └── src/schema/
│   │       ├── competition.ts  # competitions, teams, team_members, submissions, judges, scores
│   │       ├── users.ts
│   │       ├── auth.ts
│   │       ├── audit.ts
│   │       ├── webhooks.ts
│   │       └── feature-flags.ts
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
├── e2e/                  # Playwright E2E tests
└── .claude/              # Claude Code config and agents
```

## Key Routes

### Public

- `/` - Homepage with open competitions
- `/competitions` - Browse all open competitions
- `/competitions/[slug]` - Competition detail with timeline, prizes, rules
- `/competitions/[slug]/submissions` - Public submissions gallery

### Auth

- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset

### Dashboard (Authenticated)

- `/dashboard` - Participant dashboard: competitions joined, team status
- `/dashboard/competitions/[slug]/team` - Team management: members, invite, leave
- `/dashboard/competitions/[slug]/submit` - Submit project (title, desc, URLs)
- `/dashboard/settings` - User settings
- `/dashboard/api-keys` - API key management
- `/dashboard/webhooks` - Webhook configuration

### Admin (admin/super_admin only)

- `/admin` - Admin dashboard
- `/admin/competitions` - Competition list with create/edit
- `/admin/competitions/new` - Create competition form
- `/admin/competitions/[slug]/judge` - Judging panel: score 1-10 + feedback
- `/admin/users` - User management
- `/admin/feature-flags` - Feature flags
- `/admin/health` - System health

## API Routes

- `POST /api/v1/competitions` — create competition (admin)
- `GET /api/v1/competitions` — list open competitions
- `POST /api/v1/competitions/[slug]/join` — create or join a team
- `DELETE /api/v1/competitions/[slug]/join` — leave team
- `POST /api/v1/submissions` — create/update submission
- `GET /api/v1/submissions?competitionSlug=xxx` — get team submission
- `POST /api/v1/scores` — submit a judge score
- `GET /api/v1/scores?submissionId=xxx` — get scores for a submission

## Competition Lifecycle

```
draft → open → judging → closed
```

- **draft**: Only visible to admins
- **open**: Participants can register teams and submit
- **judging**: Deadline passed, judges scoring
- **closed**: Results finalized, public gallery updated

## Testing

```bash
bun test              # Unit tests (Vitest)
bun test:e2e          # E2E tests (Playwright)
bun test:e2e:ui       # E2E tests with UI
```

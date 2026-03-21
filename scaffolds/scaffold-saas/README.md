# Scaffold SaaS

A production-ready SaaS scaffold with multi-tenant architecture, authentication, billing, webhooks, and AI assistant.

## Tech Stack

- **Runtime**: Bun 1.1.38+
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js v5 (JWT strategy)
- **Billing**: Stripe
- **Background Jobs**: BullMQ + Redis
- **AI**: OpenAI / Anthropic

## Project Structure

```
scaffold-saas/
├── apps/
│   ├── web/            # Next.js web application
│   └── workers/        # Background job workers
├── packages/
│   ├── config/         # Shared configuration
│   ├── types/          # Shared TypeScript types
│   ├── utils/          # Shared utilities
│   └── database/       # Drizzle ORM schemas and client
├── e2e/                # Playwright end-to-end tests
└── docker-compose.yml  # Docker services configuration
```

## Getting Started

### Prerequisites

- Bun 1.1.38 or later
- Docker (for local databases)
- Node.js 20+ (for some tooling)

### Installation

```bash
# Clone and install dependencies
bun install

# Start development databases
bun docker:dev

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bun db:migrate

# Seed initial data
bun db:seed

# Start development server
bun dev
```

### Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe billing
- `OPENAI_API_KEY` - AI assistant

## Development

```bash
# Run development server
bun dev

# Run web app only
bun dev:web

# Run workers only
bun dev:workers

# Type checking
bun typecheck

# Linting
bun lint
bun lint:fix

# Formatting
bun format
bun format:check

# Testing
bun test
bun test:watch
bun test:coverage

# E2E testing
bun test:e2e
bun test:e2e:ui
```

## Database

```bash
# Generate migrations
bun db:generate

# Run migrations
bun db:migrate

# Push schema directly (dev)
bun db:push

# Open Drizzle Studio
bun db:studio

# Seed data
bun db:seed
```

## Docker

```bash
# Development (DB + Redis only)
bun docker:dev
bun docker:dev:down

# Production (full stack)
bun docker:up
bun docker:down
bun docker:build
bun docker:logs
```

## Features

### Authentication
- Email/password login
- Google OAuth
- JWT sessions
- Password reset
- Email verification

### Multi-Tenancy
- Team-based isolation
- Role-based access (member, manager, owner)
- Team invitations

### Billing (Stripe)
- Subscription management
- Multiple pricing plans
- Billing portal
- Webhook handling

### Webhooks
- HMAC signature verification
- Retry with exponential backoff
- Delivery logs

### AI Assistant
- Chat interface
- Conversation threads
- Usage tracking

### Background Jobs
- Email sending
- Webhook delivery
- Billing sync
- Cleanup tasks

## License

MIT

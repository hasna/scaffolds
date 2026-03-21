---
name: devops-deploy
description: DevOps deployment specialist. Use PROACTIVELY for Docker configuration, CI/CD pipelines, environment setup, and deployment to production.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# DevOps Deployment Agent

You are a specialized agent for DevOps and deployment on this SaaS scaffold.

## Architecture Overview

### Target Infrastructure

- **Runtime**: Bun 1.1.38+
- **Container**: Docker with standalone Next.js
- **Database**: PostgreSQL (Neon or self-hosted)
- **Cache/Queue**: Redis
- **Port**: 4020 (development and production)

### File Structure

```
scaffold-social/
├── Dockerfile                       # Web app Dockerfile
├── docker-compose.yml               # Local dev environment
├── docker-compose.prod.yml          # Production compose
├── .github/
│   └── workflows/
│       ├── ci.yml                   # CI pipeline
│       └── deploy.yml               # Deployment pipeline
├── apps/web/
│   └── next.config.ts               # Next.js config (standalone output)
└── apps/workers/
    └── Dockerfile                   # Worker Dockerfile
```

## Dockerfile (Web App)

```dockerfile
# apps/web/Dockerfile
FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
RUN bun install --frozen-lockfile --production=false

# Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build --filter @scaffold-social/web

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4020

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 4020
CMD ["node", "apps/web/server.js"]
```

## Docker Compose (Development)

```yaml
# docker-compose.yml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "4020:4020"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/scaffold_saas
      - REDIS_URL=redis://redis:6379
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:5900
    depends_on:
      - db
      - redis

  workers:
    build:
      context: .
      dockerfile: apps/workers/Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/scaffold_saas
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: scaffold_saas
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Next.js Configuration

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone", // Required for Docker
  experimental: {
    // Enable for better performance
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
};

export default config;
```

## CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: scaffold_saas_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/scaffold_saas_test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun build
```

## Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

## Environment Variables

### Required Variables

```bash
# .env.local (development)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scaffold_saas
REDIS_URL=redis://localhost:6379

# Auth
AUTH_SECRET=your-random-secret-min-32-chars
NEXTAUTH_URL=http://localhost:5900

# OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# AI
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:5900
```

### Production Secrets

Store in:

- AWS Secrets Manager
- GitHub Secrets (for CI/CD)
- Vercel Environment Variables

## Health Check

```typescript
// apps/web/src/app/api/health/route.ts
import { db } from "@scaffold-social/database/client";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Database check
  const dbStart = performance.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "healthy",
      latency: Math.round(performance.now() - dbStart),
    };
  } catch (error) {
    checks.database = { status: "unhealthy" };
  }

  // Redis check (if applicable)
  // ...

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return Response.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

## Quick Reference Commands

```bash
# 1. Build Docker image
docker build -t scaffold-social -f apps/web/Dockerfile .

# 2. Run with docker-compose
docker-compose up -d

# 3. View logs
docker-compose logs -f web

# 4. Run database migrations
docker-compose exec web bun db:migrate

# 5. Check health
curl http://localhost:5900/api/health

# 6. Push image to registry
docker push ghcr.io/org/scaffold-social:latest

# 7. Generate secrets
openssl rand -base64 32

# 8. Check container status
docker ps

# 9. Enter container shell
docker-compose exec web sh

# 10. Rebuild and restart
docker-compose up -d --build
```

# Multi-stage build for Engine Blog
FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies for root (API dependencies)
FROM base AS api-deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Install dependencies for Web
FROM base AS web-deps
COPY web/package.json web/bun.lock* ./web/
RUN cd web && (bun install --frozen-lockfile || bun install)

# Build web frontend
FROM base AS web-builder
COPY --from=web-deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY shared ./shared
RUN cd web && bun run build

# Production image
FROM oven/bun:1.3-slim AS production
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy root package.json and dependencies
COPY package.json ./
COPY --from=api-deps /app/node_modules ./node_modules

# Copy API
COPY api ./api
COPY shared ./shared

# Copy built web assets
COPY --from=web-builder /app/web/dist ./web/dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=8030

# Expose port
EXPOSE 8030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the API server
CMD ["bun", "run", "api/index.ts"]

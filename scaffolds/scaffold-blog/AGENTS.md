# Repository Guidelines

## Project Structure & Module Organization

- `api/`: Bun + Hono API server (routes in `api/routes/`, business logic in `api/services/`, DB in `api/db/`).
- `web/`: React + Vite frontend (`web/src/pages/`, `web/src/components/`, `web/src/lib/`).
- `cli/`: Bun-powered CLI entrypoint (`cli/index.ts`) and commands in `cli/commands/`.
- `shared/`: Shared config/types/validators used across packages (see TS path aliases in `tsconfig.json`).
- `uploads/`: User-uploaded assets served by the API (gitignored).
- `data/`: Local data files (gitignored).

## Build, Test, and Development Commands

From the repo root (preferred):

- `bun install`: install root dependencies.
- `bun dev`: run API + web dev servers concurrently.
- `bun dev:api`: start API with file watching (default `PORT=8030`).
- `bun dev:web`: start Vite dev server (http://localhost:3030) with `/api` + `/uploads` proxied to the API.
- `bun build`: build the frontend (Vite).
- `bun start`: run the API without watching.
- `bun run cli -- post list`: run the CLI (replace args as needed).
- `bun db:seed`: seed a default admin user (also runs on API startup).

Frontend-only (when working inside `web/`):

- `cd web && npm install`
- `cd web && npm run dev | build | preview`
- `cd web && npm run lint` (requires an ESLint config; add `web/eslint.config.js` if you enable linting)

## Coding Style & Naming Conventions

- TypeScript (ESM) with strict type-checking (`tsconfig.json`).
- Match existing style: 2-space indentation, single quotes, no semicolons.
- Keep route handlers thin (`api/routes/*`) and push logic into services (`api/services/*`).
- Frontend linting is intended to use ESLint (see `web/package.json`).

## Testing Guidelines

- No test runner is configured yet. If you add tests, colocate as `*.test.ts` / `*.test.tsx` and wire a `test` script in the relevant `package.json`.

## Commit & Pull Request Guidelines

- Git history is minimal (e.g., “Initial commit”), so there’s no established convention yet.
- Use clear, scoped commits (recommended: Conventional Commits like `feat(api): ...`, `fix(web): ...`).
- PRs should include: summary, local run instructions (env + DB), and screenshots for UI changes.

## Configuration & Security

- Copy `.env.example` → `.env` and set `DATABASE_URL` (or `DB_*`), `JWT_SECRET`, and optional AI/S3 keys.
- The API currently connects via `pg` (PostgreSQL). Ensure your `DATABASE_URL` points to a reachable Postgres instance.
- Don’t commit secrets. Local DB files and uploads are intentionally gitignored (`data/`, `uploads/`).

# {{name}}

A blog platform with posts, tags, authors, and comments.

## Quick Start

1. `cp .env.example .env`
2. `bun install`
3. `docker compose up -d postgres` (or set DATABASE_URL to existing DB)
4. `bun db:push && bun db:seed`
5. `bun dev`

## Auth
- Google OAuth: AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
- GitHub OAuth: AUTH_GITHUB_ID + AUTH_GITHUB_SECRET
- Email/Password: works out of the box
- Magic Link: AUTH_EMAIL_FROM + RESEND_API_KEY

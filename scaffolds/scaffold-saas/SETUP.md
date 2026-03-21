# {{name}}

Quick start in 5 commands:

1. Copy env: `cp .env.example .env` — fill in your values
2. Install deps: `bun install`
3. Start DB: `docker compose up -d postgres redis`
4. Push schema: `bun db:push && bun db:seed`
5. Start dev: `bun dev`

## Auth Providers
- Google OAuth: set AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
- GitHub OAuth: set AUTH_GITHUB_ID + AUTH_GITHUB_SECRET
- Email/Password: works out of the box
- Magic Link: set AUTH_EMAIL_FROM + configure Resend API key

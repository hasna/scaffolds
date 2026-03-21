export interface EnvVar {
  key: string;
  label: string;
  description: string;
  default?: string;
  required: boolean;
  secret: boolean;
  group: string;
  hint?: string;
}

export const ENV_VARS: EnvVar[] = [
  // App
  {
    key: "PORT",
    label: "Server Port",
    description: "Port for the Hono API server to listen on",
    default: "3000",
    required: false,
    secret: false,
    group: "App",
  },
  {
    key: "API_URL",
    label: "API Base URL",
    description: "Public base URL of the API (used for CORS and frontend config)",
    default: "http://localhost:3000",
    required: false,
    secret: false,
    group: "App",
  },

  // Database
  {
    key: "DATABASE_URL",
    label: "PostgreSQL Connection URL",
    description: "Your Postgres DB URL. Start local DB with: docker compose up -d postgres",
    default: "postgresql://postgres:postgres@localhost:5432/scaffold_blog",
    required: true,
    secret: true,
    group: "Database",
    hint: "Format: postgresql://user:password@host:port/database",
  },

  // Auth
  {
    key: "JWT_SECRET",
    label: "JWT Secret",
    description: "Secret key for signing JWT tokens. Generate with: openssl rand -base64 32",
    required: true,
    secret: true,
    group: "Auth",
    hint: "Run: openssl rand -base64 32",
  },

  // Email
  {
    key: "RESEND_API_KEY",
    label: "Resend API Key",
    description: "Optional — API key for sending transactional emails via Resend",
    required: false,
    secret: true,
    group: "Email",
    hint: "Get from https://resend.com/api-keys",
  },

  // OAuth
  {
    key: "AUTH_GOOGLE_ID",
    label: "Google OAuth Client ID",
    description: "Optional — Google OAuth 2.0 client ID for sign-in with Google",
    required: false,
    secret: false,
    group: "OAuth",
    hint: "Get from https://console.cloud.google.com/apis/credentials",
  },
  {
    key: "AUTH_GOOGLE_SECRET",
    label: "Google OAuth Client Secret",
    description: "Optional — Google OAuth 2.0 client secret",
    required: false,
    secret: true,
    group: "OAuth",
    hint: "Get from https://console.cloud.google.com/apis/credentials",
  },
  {
    key: "AUTH_GITHUB_ID",
    label: "GitHub OAuth App Client ID",
    description: "Optional — GitHub OAuth app client ID for sign-in with GitHub",
    required: false,
    secret: false,
    group: "OAuth",
    hint: "Get from https://github.com/settings/developers",
  },
  {
    key: "AUTH_GITHUB_SECRET",
    label: "GitHub OAuth App Client Secret",
    description: "Optional — GitHub OAuth app client secret",
    required: false,
    secret: true,
    group: "OAuth",
    hint: "Get from https://github.com/settings/developers",
  },
];

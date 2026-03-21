import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:5900"),
  NEXT_PUBLIC_APP_NAME: z.string().default("ReviewHub"),

  // Database
  DATABASE_URL: z.url(),
  DB_POOL_SIZE: z.string().default("10").transform(Number),

  // Redis
  REDIS_URL: z.url().optional(),

  // Auth
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.url().optional(),
  ADMIN_EMAILS: z.string().optional(),

  // Google OAuth
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // GitHub OAuth
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  // Email
  AUTH_EMAIL_FROM: z.email().optional(),
  AUTH_EMAIL_SERVER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_DEFAULT_MODEL: z.string().default("gpt-4o"),

  // Webhooks
  WEBHOOK_SIGNING_SECRET: z.string().optional(),
  WEBHOOK_MAX_RETRIES: z.string().default("5").transform(Number),
  WEBHOOK_RETRY_DELAY_MS: z.string().default("60000").transform(Number),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = getEnv();

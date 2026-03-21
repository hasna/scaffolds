-- Add scopes column to api_keys table for permission control
-- Empty array means legacy key with full access (backwards compatible)
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL;

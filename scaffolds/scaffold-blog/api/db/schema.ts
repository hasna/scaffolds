// Database schema definitions for PostgreSQL

export const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author')),
  avatar TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  meta_title TEXT,
  meta_description TEXT
);

-- Post likes table (public likes; deduped by like_key)
CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  like_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, like_key)
);

-- Post categories junction table
CREATE TABLE IF NOT EXISTS post_categories (
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Post tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  alt_text TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI generations table
CREATE TABLE IF NOT EXISTS ai_generations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('content', 'image')),
  prompt TEXT,
  model TEXT,
  provider TEXT CHECK (provider IN ('openai', 'gemini', 'anthropic')),
  result TEXT,
  tokens_used INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error TEXT,
  post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI schedules table
CREATE TABLE IF NOT EXISTS ai_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cron TEXT NOT NULL,
  topic_pool TEXT,
  settings TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  show_in_nav BOOLEAN DEFAULT FALSE,
  nav_order INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_lower TEXT UNIQUE NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'footer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_post ON ai_generations(post_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_subscribers(created_at);

-- OAuth accounts table (links users to Google/GitHub identities)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Magic link tokens table (passwordless email login)
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for oauth and magic link tables
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens(email);

-- Migrations for existing databases
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
`

export const seedData = `
-- Insert default admin user (password: admin123)
INSERT INTO users (id, email, password_hash, name, role)
VALUES ('admin-001', 'admin@blog.local', '$2b$10$rQZ5hJqJ5HqJ5HqJ5HqJ5O5HqJ5HqJ5HqJ5HqJ5HqJ5HqJ5HqJ5Hq', 'Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert default categories
INSERT INTO categories (id, name, slug, description)
VALUES
  ('cat-001', 'Technology', 'technology', 'Posts about technology and software'),
  ('cat-002', 'Business', 'business', 'Business and entrepreneurship topics'),
  ('cat-003', 'Lifestyle', 'lifestyle', 'Lifestyle and personal development'),
  ('cat-004', 'Design', 'design', 'Design systems, UI, UX, and visual craft'),
  ('cat-005', 'Marketing', 'marketing', 'Growth, content, and distribution strategies'),
  ('cat-006', 'Product', 'product', 'Product building, strategy, and shipping'),
  ('cat-007', 'AI & Automation', 'ai-automation', 'AI workflows, automation, and tooling')
ON CONFLICT (id) DO NOTHING;

-- Insert default tags
INSERT INTO tags (id, name, slug)
VALUES
  ('tag-001', 'AI', 'ai'),
  ('tag-002', 'Tutorial', 'tutorial'),
  ('tag-003', 'News', 'news'),
  ('tag-004', 'Opinion', 'opinion')
ON CONFLICT (id) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value)
VALUES
  ('site_name', '"Engine Blog"'),
  ('site_description', '"An autonomous blog powered by AI"'),
  ('posts_per_page', '10'),
  ('allow_comments', 'true')
ON CONFLICT (key) DO NOTHING;
`

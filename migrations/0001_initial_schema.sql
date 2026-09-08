-- Initial Schema for X-Manager Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  active_variant_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  tweet_url TEXT NOT NULL DEFAULT '',
  metrics TEXT NOT NULL DEFAULT '{}',
  scheduled_for TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_variants (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  hook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  variant_label TEXT NOT NULL DEFAULT 'Вариант 1',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_variants_post_id ON post_variants(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

CREATE TABLE IF NOT EXISTS methodologies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  formula TEXT NOT NULL,
  template_example TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tone_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Мой стиль',
  rules TEXT NOT NULL DEFAULT '[]',
  avoid_words TEXT NOT NULL DEFAULT '[]',
  target_audience TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

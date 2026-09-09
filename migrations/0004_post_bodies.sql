-- Migration 0004: Add post_bodies table and pinned_body_id to post_variants

CREATE TABLE IF NOT EXISTS post_bodies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  body_label TEXT NOT NULL DEFAULT 'Тело 1',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_bodies_post_id ON post_bodies(post_id);

ALTER TABLE post_variants ADD COLUMN pinned_body_id TEXT;

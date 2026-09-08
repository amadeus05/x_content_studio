CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  model_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_morph ON media (model_type, model_id, order_index);
CREATE INDEX IF NOT EXISTS idx_media_storage_key ON media (storage_key);

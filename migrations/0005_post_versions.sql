-- Migration 0005: Post Variant & Version Lifecycle
-- Introduces PostVariant and immutable PostVersion entities with cascade deletes and unique version constraints.

CREATE TABLE IF NOT EXISTS post_variants (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Вариант 1',
  order_index INTEGER NOT NULL DEFAULT 0,
  active_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_versions (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  hook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  action_metadata TEXT,
  FOREIGN KEY (variant_id) REFERENCES post_variants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_variants_post_id ON post_variants(post_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_variant_id ON post_versions(variant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_versions_variant_num ON post_versions(variant_id, version_number);

-- Backfill Version 1 for any variants that do not have versions yet
INSERT OR IGNORE INTO post_versions (id, variant_id, version_number, hook, body, created_at, action_metadata)
SELECT
  id || ':v1',
  id,
  1,
  COALESCE(hook, ''),
  COALESCE(body, ''),
  created_at,
  'initial_backfill'
FROM post_variants
WHERE NOT EXISTS (
  SELECT 1 FROM post_versions pv WHERE pv.variant_id = post_variants.id
);

UPDATE post_variants
SET active_version_id = (
  SELECT id FROM post_versions pv
  WHERE pv.variant_id = post_variants.id AND pv.version_number = 1
  LIMIT 1
)
WHERE active_version_id IS NULL OR active_version_id = '';

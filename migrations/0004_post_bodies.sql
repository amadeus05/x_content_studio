-- Migration 0004: post_bodies pool + pins + active_body_id
-- Idempotent: safe to re-run (CREATE IF NOT EXISTS / INSERT WHERE NOT EXISTS).
-- Column adds (pinned_body_id, active_body_id) are applied by scripts/d1-migrate.mjs

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

-- Backfill: one body per post from the first variant (by order_index), only if post has no bodies yet
INSERT INTO post_bodies (id, post_id, text, body_label, order_index, created_at, updated_at)
SELECT
  pv.id || ':body',
  pv.post_id,
  COALESCE(pv.body, ''),
  'Тело 1',
  0,
  pv.created_at,
  pv.updated_at
FROM post_variants pv
INNER JOIN (
  SELECT post_id, MIN(order_index) AS min_ord
  FROM post_variants
  GROUP BY post_id
) first_v ON first_v.post_id = pv.post_id AND first_v.min_ord = pv.order_index
WHERE NOT EXISTS (
  SELECT 1 FROM post_bodies pb WHERE pb.post_id = pv.post_id
);

-- Extra bodies: unique non-empty texts from other variants of the same post
INSERT INTO post_bodies (id, post_id, text, body_label, order_index, created_at, updated_at)
SELECT
  pv.id || ':body',
  pv.post_id,
  pv.body,
  'Тело ' || (
    SELECT COUNT(*) + 1 FROM post_bodies pb0 WHERE pb0.post_id = pv.post_id
  ),
  (
    SELECT COUNT(*) FROM post_bodies pb0 WHERE pb0.post_id = pv.post_id
  ),
  pv.created_at,
  pv.updated_at
FROM post_variants pv
WHERE TRIM(COALESCE(pv.body, '')) != ''
  AND EXISTS (SELECT 1 FROM post_bodies pb WHERE pb.post_id = pv.post_id)
  AND NOT EXISTS (
    SELECT 1 FROM post_bodies pb
    WHERE pb.post_id = pv.post_id AND pb.text = pv.body
  )
  AND pv.id = (
    SELECT pv2.id FROM post_variants pv2
    WHERE pv2.post_id = pv.post_id AND pv2.body = pv.body
    ORDER BY pv2.order_index ASC
    LIMIT 1
  );

-- Pin hooks (variants) to matching body when a post has more than one distinct body text
UPDATE post_variants
SET pinned_body_id = (
  SELECT pb.id FROM post_bodies pb
  WHERE pb.post_id = post_variants.post_id AND pb.text = post_variants.body
  ORDER BY pb.order_index ASC
  LIMIT 1
)
WHERE (pinned_body_id IS NULL OR pinned_body_id = '')
  AND TRIM(COALESCE(body, '')) != ''
  AND (
    SELECT COUNT(DISTINCT body) FROM post_variants pv2 WHERE pv2.post_id = post_variants.post_id
  ) > 1
  AND EXISTS (
    SELECT 1 FROM post_bodies pb
    WHERE pb.post_id = post_variants.post_id AND pb.text = post_variants.body
  );

-- Restore active body from pin of active variant, else first body
UPDATE posts
SET active_body_id = COALESCE(
  (
    SELECT v.pinned_body_id FROM post_variants v
    WHERE v.id = posts.active_variant_id AND v.pinned_body_id IS NOT NULL AND v.pinned_body_id != ''
  ),
  (
    SELECT pb.id FROM post_bodies pb
    WHERE pb.post_id = posts.id
    ORDER BY pb.order_index ASC
    LIMIT 1
  )
)
WHERE active_body_id IS NULL OR active_body_id = '';

-- =========================================================================
-- SOURCE-CATEGORY MAPPING (Multi-tenant Architecture)
-- =========================================================================
-- Purpose: Configure which sources hunt for which categories
-- Benefits:
--   - Performance: Don't fetch irrelevant lots
--   - Cost: Reduce API calls and compute
--   - Quality: Match sources to their strengths
--   - SaaS-ready: Per-user/tenant configurations

-- Apply to remote:
-- npx wrangler d1 execute dfg-scout-db-preview --remote --file=./migrations/002-source-category-mapping.sql

-- =========================================================================
-- SOURCE_CATEGORY_MAP: Many-to-many mapping
-- =========================================================================
CREATE TABLE IF NOT EXISTS source_category_map (
  source TEXT NOT NULL,                   -- Source identifier (sierra, craigslist, etc.)
  category_id TEXT NOT NULL,              -- FK to category_defs.id
  enabled INTEGER NOT NULL DEFAULT 1,     -- 0/1 toggle without deletion

  -- Source-specific optimization hints
  search_keywords TEXT,                   -- JSON array: category keywords to pass to source API
  search_params TEXT,                     -- JSON object: source-specific params (e.g., location filters)

  -- Performance tracking
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_candidates INTEGER NOT NULL DEFAULT 0,
  hit_rate REAL GENERATED ALWAYS AS (
    CASE
      WHEN total_fetched > 0 THEN (CAST(total_candidates AS REAL) / total_fetched) * 100
      ELSE 0
    END
  ) STORED,

  last_fetched_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (source, category_id),
  FOREIGN KEY (category_id) REFERENCES category_defs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scm_source_enabled
  ON source_category_map(source, enabled);

CREATE INDEX IF NOT EXISTS idx_scm_category_enabled
  ON source_category_map(category_id, enabled);

CREATE INDEX IF NOT EXISTS idx_scm_hit_rate
  ON source_category_map(hit_rate DESC)
  WHERE enabled = 1;

-- =========================================================================
-- SEED: Initial mappings for current categories
-- =========================================================================
-- Strategy: Sierra is good for all equipment categories
-- Future sources (Craigslist, Facebook, GovDeals, etc.) will have selective mappings

INSERT OR IGNORE INTO source_category_map (source, category_id, enabled, search_keywords) VALUES
  -- Sierra: Equipment categories
  ('sierra', 'buy_box', 1, '["trailer", "equipment trailer", "utility trailer", "flatbed"]'),
  ('sierra', 'welders', 1, '["welder", "welding", "mig", "tig"]'),
  ('sierra', 'air_compressors', 1, '["air compressor", "compressor"]'),
  ('sierra', 'generators', 1, '["generator", "portable generator"]'),
  ('sierra', 'power_tools', 1, '["drill", "impact driver", "power tool", "combo kit"]'),
  ('sierra', 'tool_storage', 1, '["tool box", "tool chest", "tool storage"]');

-- =========================================================================
-- FUTURE: Multi-tenant support (when SaaS-ready)
-- =========================================================================
-- Add tenant_id column and update primary key:
-- ALTER TABLE source_category_map ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
-- CREATE UNIQUE INDEX idx_scm_tenant_pk ON source_category_map(tenant_id, source, category_id);
-- DROP PRIMARY KEY constraint and use the new index instead

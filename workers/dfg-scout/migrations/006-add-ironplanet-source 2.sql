-- Migration 006: Add source_category_map table and IronPlanet mappings
-- Apply: npx wrangler d1 execute dfg-scout-db --file=./migrations/006-add-ironplanet-source.sql --remote

-- Create the source_category_map table if it doesn't exist
CREATE TABLE IF NOT EXISTS source_category_map (
  source TEXT NOT NULL,                   -- Source identifier (sierra, ironplanet, etc.)
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

  PRIMARY KEY (source, category_id)
);

CREATE INDEX IF NOT EXISTS idx_scm_source_enabled
  ON source_category_map(source, enabled);

CREATE INDEX IF NOT EXISTS idx_scm_category_enabled
  ON source_category_map(category_id, enabled);

-- Seed Sierra mappings for existing categories
INSERT OR IGNORE INTO source_category_map (source, category_id, enabled, search_keywords) VALUES
  ('sierra', 'buy_box', 1, '["trailer", "equipment trailer", "utility trailer", "flatbed"]'),
  ('sierra', 'fleet_trucks', 1, '["truck", "pickup", "van", "box truck"]');

-- IronPlanet specializes in trucks, trailers, and heavy equipment
-- Category parameters:
--   ct=3: Trucks & Trailers (top-level)
--   c=2268: Utility Trailers
--   c=2252: Flatbed Trailers

INSERT OR IGNORE INTO source_category_map (source, category_id, enabled, search_keywords, search_params) VALUES
  ('ironplanet', 'buy_box', 1,
   '["trailer", "utility trailer", "equipment trailer", "flatbed trailer", "dump trailer"]',
   '{"ct": "3", "l2": "USA-AZ"}'),

  ('ironplanet', 'fleet_trucks', 1,
   '["truck", "pickup", "van", "box truck", "flatbed truck"]',
   '{"ct": "3", "c": "2866", "l2": "USA-AZ"}');

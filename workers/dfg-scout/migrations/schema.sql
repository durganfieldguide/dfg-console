-- DFG Headless Scout Schema v1.6 (PR1)
-- Apply: npx wrangler d1 execute dfg-scout-db --file=./schema.sql --remote

-- =========================================================
-- LISTINGS (System of Record)
-- =========================================================
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,                    -- {source}_{source_id} e.g. sierra_12345
  source TEXT NOT NULL,                   -- sierra, craigslist, etc.
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  current_bid REAL,
  end_time INTEGER,                       -- unix epoch seconds
  location TEXT,
  location_text TEXT,
  auction_end_at INTEGER,
  image_url TEXT,
  photos TEXT,                            -- JSON array of photo URLs

  status TEXT NOT NULL DEFAULT 'new',     -- new|candidate|rejected|analyzed|won|lost
  sub_status TEXT NOT NULL DEFAULT 'review', -- attack|review|stale|archived
  rejection_reason TEXT,

  category_id TEXT,
  buy_box_score INTEGER NOT NULL DEFAULT 0,

  title_status TEXT NOT NULL DEFAULT 'unknown', -- clean|salvage|rebuilt|bonded|bill_of_sale|none|unknown
  is_homemade INTEGER NOT NULL DEFAULT 0,       -- 0/1
  parts_only INTEGER NOT NULL DEFAULT 0,        -- 0/1

  price_kind TEXT,                        -- winning_bid|current_bid|starting_bid|etc
  price_verified INTEGER DEFAULT 0,       -- 0/1
  lot_status TEXT,                        -- active|closing|closed|unknown

  distance_miles REAL,
  travel_cost_est REAL,

  est_resale_value REAL,
  fees_est REAL,
  repair_reserve_est REAL NOT NULL DEFAULT 200,

  price_delta REAL GENERATED ALWAYS AS (
    CASE
      WHEN est_resale_value IS NULL THEN NULL
      ELSE
        COALESCE(est_resale_value, 0)
        - COALESCE(current_bid, 0)
        - COALESCE(fees_est, 0)
        - COALESCE(travel_cost_est, 0)
        - COALESCE(repair_reserve_est, 0)
    END
  ) STORED,

  attributes_json TEXT,
  analysis_json TEXT,

  analyzed_at INTEGER,

  source_hash TEXT,
  source_updated_at INTEGER,
  last_refreshed_at INTEGER,

  r2_snapshot_key TEXT,

  sync_state TEXT NOT NULL DEFAULT 'pending', -- pending|syncing|synced|failed
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_error TEXT,
  next_sync_after INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_source ON listings(source, source_id);

CREATE INDEX IF NOT EXISTS idx_listings_sync
  ON listings(status, sync_state, next_sync_after);

CREATE INDEX IF NOT EXISTS idx_listings_end_time ON listings(end_time);
CREATE INDEX IF NOT EXISTS idx_listings_refresh ON listings(status, end_time, last_refreshed_at);

CREATE INDEX IF NOT EXISTS idx_listings_cat_score ON listings(category_id, buy_box_score);
CREATE INDEX IF NOT EXISTS idx_listings_cat_delta ON listings(category_id, price_delta);
CREATE INDEX IF NOT EXISTS idx_listings_title_status ON listings(title_status);

CREATE INDEX IF NOT EXISTS idx_attack_delta
  ON listings(price_delta)
  WHERE status='candidate' AND sub_status='attack';

-- =========================================================
-- SCOUT RUNS (Observability)
-- =========================================================
CREATE TABLE IF NOT EXISTS scout_runs (
  id TEXT PRIMARY KEY,                    -- uuid
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,
  duration_ms INTEGER,

  fetched INTEGER NOT NULL DEFAULT 0,
  parsed INTEGER NOT NULL DEFAULT 0,
  new_listings INTEGER NOT NULL DEFAULT 0,
  updated_listings INTEGER NOT NULL DEFAULT 0,
  candidates INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  refreshed INTEGER NOT NULL DEFAULT 0,

  candidate_rate REAL,
  rejection_rate REAL,

  top_rejection_reasons TEXT,             -- JSON [{reason,count}]
  error_summary TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =========================================================
-- FAILED OPERATIONS (Dead Letter Queue + Retry Cap)
-- =========================================================
CREATE TABLE IF NOT EXISTS failed_operations (
  id TEXT PRIMARY KEY,                    -- uuid
  op_type TEXT NOT NULL,                  -- r2_put|d1_upsert|analyzer_call|parse
  listing_id TEXT,
  run_id TEXT,

  payload_json TEXT,
  error TEXT NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|retrying|dead|resolved
  next_retry_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_failed_ops_status ON failed_operations(status, next_retry_at);

-- =========================================================
-- OUTCOMES (Ledger)
-- =========================================================
CREATE TABLE IF NOT EXISTS outcomes (
  listing_id TEXT PRIMARY KEY,
  purchase_price REAL,
  repair_cost_parts REAL,
  repair_cost_labor REAL,
  sold_price REAL,
  fees REAL,
  net_profit REAL,
  date_acquired INTEGER,
  date_sold INTEGER,
  days_held INTEGER,
  notes TEXT,
  FOREIGN KEY(listing_id) REFERENCES listings(id)
);

-- =========================================================
-- CATEGORY DEFS (Optional config)
-- =========================================================
CREATE TABLE IF NOT EXISTS category_defs (
  id TEXT PRIMARY KEY,                    -- e.g. TRAILER_GENERIC
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,

  keywords_positive TEXT,                 -- JSON array
  keywords_negative TEXT,                 -- JSON array

  min_length_ft REAL,
  max_length_ft REAL,
  min_width_ft REAL,
  max_width_ft REAL,
  max_weight_lbs REAL,

  base_score INTEGER NOT NULL DEFAULT 50,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =========================================================
-- PRICE GUIDES (Optional)
-- =========================================================
CREATE TABLE IF NOT EXISTS price_guides (
  id TEXT PRIMARY KEY,                    -- uuid
  category_id TEXT NOT NULL,

  description TEXT,
  condition TEXT,                         -- excellent|good|fair|poor

  low_price REAL,
  mid_price REAL,
  high_price REAL,

  source TEXT,
  source_url TEXT,
  observed_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_price_guides_cat ON price_guides(category_id);

-- =========================================================
-- ANALYSES (Stored analysis results)
-- =========================================================
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,                    -- analysis-{listing_id}
  listing_id TEXT NOT NULL UNIQUE,        -- Reference to listings(id)
  analysis_timestamp TEXT NOT NULL,       -- ISO timestamp

  -- Core report fields
  verdict TEXT NOT NULL DEFAULT 'PASS',   -- BUY|WATCH|PASS
  max_bid_mid REAL NOT NULL DEFAULT 0,
  max_bid_worst REAL NOT NULL DEFAULT 0,
  max_bid_best REAL NOT NULL DEFAULT 0,
  retail_est REAL NOT NULL DEFAULT 0,
  expected_profit REAL NOT NULL DEFAULT 0,
  expected_margin REAL NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 1,  -- 1-5

  -- Full report
  report_markdown TEXT,

  -- Complete analysis response (JSON)
  full_response TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_analyses_listing ON analyses(listing_id);
CREATE INDEX IF NOT EXISTS idx_analyses_verdict ON analyses(verdict);
CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(analysis_timestamp);



CREATE TABLE listings_new (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  current_bid REAL,
  end_time INTEGER,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  sub_status TEXT NOT NULL DEFAULT 'review',
  rejection_reason TEXT,
  category_id TEXT,
  buy_box_score INTEGER NOT NULL DEFAULT 0,
  title_status TEXT NOT NULL DEFAULT 'unknown',
  is_homemade INTEGER NOT NULL DEFAULT 0,
  parts_only INTEGER NOT NULL DEFAULT 0,
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
  sync_state TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_error TEXT,
  next_sync_after INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 2: Copy data
INSERT INTO listings_new (
  id, source, source_id, url, title, current_bid, end_time, location,
  status, sub_status, rejection_reason, category_id, buy_box_score,
  title_status, is_homemade, parts_only,
  distance_miles, travel_cost_est, est_resale_value, fees_est, repair_reserve_est,
  attributes_json, analysis_json, analyzed_at,
  source_hash, source_updated_at, last_refreshed_at, r2_snapshot_key,
  sync_state, sync_attempts, last_sync_error, next_sync_after,
  created_at, updated_at
)
SELECT
  id, source, source_id, url, title, current_bid, end_time, location,
  status, sub_status, rejection_reason, category_id, buy_box_score,
  title_status, is_homemade, parts_only,
  distance_miles, travel_cost_est, est_resale_value, fees_est, repair_reserve_est,
  attributes_json, analysis_json, analyzed_at,
  source_hash, source_updated_at, last_refreshed_at, r2_snapshot_key,
  sync_state, sync_attempts, last_sync_error, next_sync_after,
  created_at, updated_at
FROM listings;

-- Step 3: Drop old table
DROP TABLE listings;

-- Step 4: Rename new table
ALTER TABLE listings_new RENAME TO listings;

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX idx_listings_source ON listings(source, source_id);
CREATE INDEX idx_listings_sync ON listings(status, sync_state, next_sync_after);
CREATE INDEX idx_listings_end_time ON listings(end_time);
CREATE INDEX idx_listings_refresh ON listings(status, end_time, last_refreshed_at);
CREATE INDEX idx_listings_cat_score ON listings(category_id, buy_box_score);
CREATE INDEX idx_listings_cat_delta ON listings(category_id, price_delta);
CREATE INDEX idx_listings_title_status ON listings(title_status);
CREATE INDEX idx_attack_delta ON listings(price_delta) WHERE status='candidate' AND sub_status='attack';

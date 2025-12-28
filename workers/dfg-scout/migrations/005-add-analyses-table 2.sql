-- Migration 005: Add analyses table for storing analysis results
-- Apply: npx wrangler d1 execute dfg-scout-db --file=./migrations/005-add-analyses-table.sql --remote

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

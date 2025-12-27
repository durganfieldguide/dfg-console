-- =============================================================================
-- DFG API Migration 001: Opportunities Schema
-- =============================================================================
-- Creates the core tables for the operator console:
-- - opportunities: Main entity replacing 'listings' for operator workflow
-- - operator_actions: Audit log of all operator decisions (includes alert dismissals)
-- - tuning_events: Signals for future automation tuning
-- - sources: Auction platform configurations
-- =============================================================================

-- =============================================================================
-- SOURCES TABLE
-- =============================================================================
-- Stores configuration for each auction source (Sierra, IronPlanet, etc.)

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  base_url TEXT NOT NULL,
  default_buyer_premium_pct REAL NOT NULL DEFAULT 15.0,
  default_pickup_days INTEGER NOT NULL DEFAULT 5,
  last_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed default sources
INSERT OR IGNORE INTO sources (id, name, display_name, enabled, base_url, default_buyer_premium_pct, default_pickup_days, created_at, updated_at)
VALUES
  ('sierra_auction', 'sierra_auction', 'Sierra Auctions', 1, 'https://sierraauction.com', 15.0, 5, datetime('now'), datetime('now')),
  ('ironplanet', 'ironplanet', 'IronPlanet', 1, 'https://www.ironplanet.com', 12.0, 7, datetime('now'), datetime('now')),
  ('govplanet', 'govplanet', 'GovPlanet', 0, 'https://www.govplanet.com', 10.0, 10, datetime('now'), datetime('now'));

-- =============================================================================
-- OPPORTUNITIES TABLE
-- =============================================================================
-- Main table for operator workflow. Created from scout listings.

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,

  -- Source linkage
  source TEXT NOT NULL REFERENCES sources(id),
  source_lot_id TEXT,
  source_url TEXT,
  listing_id TEXT,  -- FK to scout's listings table

  -- Workflow state
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN (
    'inbox', 'qualifying', 'watch', 'inspect', 'bid', 'won', 'lost', 'rejected', 'archived'
  )),
  status_changed_at TEXT NOT NULL,

  -- Core listing data
  category_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  distance_miles REAL,

  -- Pricing
  current_bid REAL DEFAULT 0,
  buy_now_price REAL,
  reserve_status TEXT CHECK (reserve_status IN ('unknown', 'reserve_met', 'reserve_not_met')),
  estimated_fees REAL,

  -- Timing
  auction_ends_at TEXT,
  pickup_deadline TEXT,

  -- Scoring
  buy_box_score REAL DEFAULT 0,
  score_breakdown TEXT,  -- JSON
  unknown_count INTEGER DEFAULT 0,

  -- Analysis
  max_bid_low REAL,
  max_bid_high REAL,
  analysis_summary TEXT,
  last_analyzed_at TEXT,

  -- Operator augmentation
  observed_facts TEXT,  -- JSON: { universal: {}, category: {} }

  -- Watch state
  watch_cycle INTEGER DEFAULT 0,
  watch_until TEXT,
  watch_trigger TEXT CHECK (watch_trigger IN ('ending_soon', 'time_window', 'manual') OR watch_trigger IS NULL),
  watch_threshold TEXT,  -- JSON
  watch_fired_at TEXT,

  -- Bid state
  max_bid_locked REAL,
  bid_strategy TEXT CHECK (bid_strategy IN ('manual', 'snipe', 'auto') OR bid_strategy IS NULL),

  -- Outcome
  final_price REAL,
  outcome_notes TEXT,

  -- Rejection
  rejection_reason TEXT CHECK (rejection_reason IN (
    'too_far', 'too_expensive', 'wrong_category', 'poor_condition', 'missing_info', 'other'
  ) OR rejection_reason IS NULL),
  rejection_note TEXT,

  -- Media
  r2_snapshot_key TEXT,
  photos TEXT,  -- JSON array of URLs
  primary_image_url TEXT,

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_listing_id ON opportunities(listing_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_auction_ends ON opportunities(auction_ends_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_status_changed ON opportunities(status_changed_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_watch ON opportunities(status, watch_fired_at) WHERE status = 'watch';
CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities(buy_box_score DESC);

-- =============================================================================
-- OPERATOR_ACTIONS TABLE
-- =============================================================================
-- Audit log of all operator decisions and actions

CREATE TABLE IF NOT EXISTS operator_actions (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'status_change', 'augmentation', 'note', 'alert_dismiss',
    'batch_reject', 'batch_archive', 're_analyze'
  )),
  from_status TEXT,
  to_status TEXT,
  alert_key TEXT,
  payload TEXT,  -- JSON
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_actions_opportunity ON operator_actions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_operator_actions_created ON operator_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_actions_type ON operator_actions(action_type);

-- =============================================================================
-- TUNING_EVENTS TABLE
-- =============================================================================
-- Signals captured for future automation tuning

CREATE TABLE IF NOT EXISTS tuning_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'rejection', 'win', 'loss', 'score_override', 'time_in_stage'
  )),
  opportunity_id TEXT REFERENCES opportunities(id),
  source TEXT,
  category_id TEXT,
  signal_data TEXT NOT NULL,  -- JSON
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tuning_events_type ON tuning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tuning_events_source ON tuning_events(source);
CREATE INDEX IF NOT EXISTS idx_tuning_events_category ON tuning_events(category_id);
CREATE INDEX IF NOT EXISTS idx_tuning_events_created ON tuning_events(created_at DESC);

-- =============================================================================
-- ALERT DISMISSALS INDEX
-- =============================================================================
-- Alert dismissals are stored in operator_actions with action_type='alert_dismiss'
-- This index supports efficient lookups for dismissed alert keys

CREATE INDEX IF NOT EXISTS idx_operator_actions_dismissals
  ON operator_actions(opportunity_id, alert_key)
  WHERE action_type = 'alert_dismiss';

-- Migration 007: Extend category_defs for pluggable category system
-- Run: npx wrangler d1 execute dfg-scout-db --file=./migrations/007-category-config.sql --remote
--
-- Goal: New category = D1 row + prompt file. No code changes required.

-- =============================================================================
-- EXTEND CATEGORY_DEFS SCHEMA
-- =============================================================================

-- Parent category for inheritance
ALTER TABLE category_defs ADD COLUMN parent_id TEXT REFERENCES category_defs(id);

-- Classification confidence threshold (0-100, used by Scout)
ALTER TABLE category_defs ADD COLUMN confidence_threshold INTEGER DEFAULT 60;

-- Hard gates - JSON array of gate rules for Scout auto-reject
-- Format: [{"field": "title_status", "operator": "equals", "value": "salvage", "action": "reject"}]
ALTER TABLE category_defs ADD COLUMN hard_gates TEXT DEFAULT '[]';

-- Evidence requirements for Analyst
ALTER TABLE category_defs ADD COLUMN min_photos INTEGER DEFAULT 3;
ALTER TABLE category_defs ADD COLUMN required_evidence TEXT DEFAULT '[]'; -- JSON array of required fields

-- Economic thresholds for Analyst verdicts
ALTER TABLE category_defs ADD COLUMN min_profit_dollars REAL DEFAULT 600;
ALTER TABLE category_defs ADD COLUMN min_margin_percent REAL DEFAULT 40;
ALTER TABLE category_defs ADD COLUMN max_acquisition REAL DEFAULT 6000;
ALTER TABLE category_defs ADD COLUMN target_days_to_sell INTEGER DEFAULT 14;

-- Geography limits
ALTER TABLE category_defs ADD COLUMN max_distance_miles REAL DEFAULT 100;
ALTER TABLE category_defs ADD COLUMN distance_margin_override REAL; -- Override margin % for distant items

-- Analyst prompt configuration
ALTER TABLE category_defs ADD COLUMN prompt_file TEXT; -- e.g., 'prompts-vehicles.ts'
ALTER TABLE category_defs ADD COLUMN condition_schema TEXT; -- JSON schema for condition extraction
ALTER TABLE category_defs ADD COLUMN market_comps_file TEXT; -- e.g., 'analysis-vehicles.ts'

-- Verdict thresholds (JSON for flexibility)
-- Format: {"buy": {"min_profit": 600, "min_margin": 0.40}, "watch": {"min_profit": 400, "min_margin": 0.25}}
ALTER TABLE category_defs ADD COLUMN verdict_thresholds TEXT;

-- Display configuration
ALTER TABLE category_defs ADD COLUMN display_order INTEGER DEFAULT 100;
ALTER TABLE category_defs ADD COLUMN icon TEXT; -- Emoji or icon name

-- =============================================================================
-- SEED EXISTING CATEGORIES WITH NEW FIELDS
-- =============================================================================

-- Trailers (default buy_box category)
UPDATE category_defs SET
  confidence_threshold = 60,
  hard_gates = '[
    {"field": "title_status", "operator": "equals", "value": "salvage", "action": "flag"},
    {"field": "parts_only", "operator": "equals", "value": true, "action": "reject"}
  ]',
  min_photos = 4,
  required_evidence = '["frame_integrity", "axle_status", "tires"]',
  min_profit_dollars = 600,
  min_margin_percent = 40,
  max_acquisition = 6000,
  target_days_to_sell = 14,
  max_distance_miles = 100,
  prompt_file = 'prompts.ts',
  market_comps_file = 'analysis.ts',
  verdict_thresholds = '{"buy": {"min_profit": 600, "min_margin": 0.40}, "watch": {"min_profit": 400, "min_margin": 0.25}, "pass": {"max_profit": 400}}',
  display_order = 10,
  icon = 'truck'
WHERE id = 'buy_box';

-- Fleet Trucks / Vehicles
UPDATE category_defs SET
  confidence_threshold = 70,
  hard_gates = '[
    {"field": "title_status", "operator": "in", "value": ["salvage", "parts_only"], "action": "flag"},
    {"field": "mileage", "operator": "gt", "value": 200000, "action": "flag"}
  ]',
  min_photos = 6,
  required_evidence = '["year", "make", "model", "mileage", "title_status"]',
  min_profit_dollars = 1500,
  min_margin_percent = 20,
  max_acquisition = 15000,
  target_days_to_sell = 21,
  max_distance_miles = 150,
  prompt_file = 'prompts-vehicles.ts',
  market_comps_file = 'analysis-vehicles.ts',
  verdict_thresholds = '{"buy": {"min_profit": 1500, "min_margin": 0.20}, "watch": {"min_profit": 1000, "min_margin": 0.15}, "pass": {"max_profit": 1000}}',
  display_order = 20,
  icon = 'car'
WHERE id = 'fleet_trucks';

-- =============================================================================
-- INSERT POWER TOOLS CATEGORY (if not exists)
-- =============================================================================

INSERT OR IGNORE INTO category_defs (
  id, name, enabled,
  keywords_positive, keywords_negative,
  confidence_threshold, hard_gates,
  min_photos, required_evidence,
  min_profit_dollars, min_margin_percent, max_acquisition, target_days_to_sell,
  max_distance_miles,
  prompt_file, market_comps_file, verdict_thresholds,
  display_order, icon, min_score, requires_snapshot
) VALUES (
  'power_tools',
  'Power Tools',
  1,
  '["drill", "impact driver", "circular saw", "reciprocating saw", "jigsaw", "grinder", "sander", "router", "planer", "jointer", "table saw", "miter saw", "band saw", "scroll saw", "dewalt", "milwaukee", "makita", "bosch", "ryobi", "ridgid", "craftsman", "porter cable", "hitachi", "metabo", "festool", "cordless", "battery", "18v", "20v", "12v", "combo kit", "tool set"]',
  '["parts only", "for parts", "broken", "not working", "damaged", "incomplete"]',
  50,
  '[{"field": "parts_only", "operator": "equals", "value": true, "action": "reject"}]',
  2,
  '["tool_type", "make", "power_source"]',
  40,
  30,
  500,
  7,
  50,
  'prompts-power-tools.ts',
  'analysis-power-tools.ts',
  '{"buy": {"min_profit": 40, "min_margin": 0.30}, "watch": {"min_profit": 25, "min_margin": 0.20}, "pass": {"max_profit": 25}}',
  30,
  'wrench',
  20,
  0
);

-- =============================================================================
-- CREATE INDEX FOR EFFICIENT LOOKUPS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_category_defs_enabled ON category_defs(enabled);
CREATE INDEX IF NOT EXISTS idx_category_defs_parent ON category_defs(parent_id);

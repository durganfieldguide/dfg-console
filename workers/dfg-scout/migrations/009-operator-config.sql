-- Migration 009: Create operator_config table for user-level configuration
-- Issue #214: https://github.com/durganfieldguide/dfg-console/issues/214
--
-- Separates operator constraints (distance, budget, profit thresholds) from
-- category definitions. Allows per-user customization of constraints.

CREATE TABLE IF NOT EXISTS operator_config (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);

-- Seed default configuration for user_id='default'
-- These values represent the primary operator's constraints
INSERT INTO operator_config (user_id, key, value) VALUES
  ('default', 'max_acquisition_dollars', '6000'),
  ('default', 'max_distance_miles', '100'),
  ('default', 'home_location', 'Phoenix, AZ'),
  ('default', 'home_lat', '33.4484'),
  ('default', 'home_lon', '-112.0740'),
  ('default', 'min_profit_dollars', '600'),
  ('default', 'min_margin_percent', '40');

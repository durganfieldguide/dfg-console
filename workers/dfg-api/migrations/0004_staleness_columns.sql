-- =============================================================================
-- DFG API Migration 004: Staleness Tracking Columns
-- =============================================================================
-- Adds columns for operator attention tracking:
-- - last_operator_review_at: When operator last touched/reviewed this opportunity
-- - exit_price: Operator's target exit price for profit calculations
-- =============================================================================

-- Add last_operator_review_at for staleness tracking
ALTER TABLE opportunities ADD COLUMN last_operator_review_at TEXT;

-- Add exit_price for operator's target exit price
ALTER TABLE opportunities ADD COLUMN exit_price REAL;

-- Index for efficient staleness queries
-- Covers opportunities that need attention (non-terminal, stale, or ending soon)
CREATE INDEX IF NOT EXISTS idx_opportunities_staleness
  ON opportunities(status, last_operator_review_at, auction_ends_at)
  WHERE status NOT IN ('rejected', 'archived', 'won', 'lost');

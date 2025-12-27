-- =============================================================================
-- DFG API Migration 003: Analysis Runs + Operator Inputs
-- =============================================================================
-- Sprint 1.5 Foundation: Persists operator inputs and analysis runs for
-- retained, iterable workflow. Enables capture → analyze → re-analyze loop.
-- =============================================================================

-- =============================================================================
-- ANALYSIS_RUNS TABLE
-- =============================================================================
-- Stores each analysis execution as a retained snapshot.
-- UI reads from current_analysis_run_id; history is queryable for audit/diff.

CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,

  -- Snapshot inputs (frozen at analysis time)
  listing_snapshot_hash TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  operator_inputs_json TEXT,  -- NULL until operator captures inputs

  -- Computed outputs
  derived_json TEXT NOT NULL,
  gates_json TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('BID', 'WATCH', 'PASS', 'NEEDS_INFO')),
  trace_json TEXT NOT NULL,

  -- Metadata
  calc_version TEXT,
  gates_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_opportunity ON analysis_runs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created ON analysis_runs(created_at DESC);

-- =============================================================================
-- MODIFY OPPORTUNITIES TABLE
-- =============================================================================
-- Add operator_inputs_json and current_analysis_run_id columns

ALTER TABLE opportunities ADD COLUMN operator_inputs_json TEXT;

ALTER TABLE opportunities ADD COLUMN current_analysis_run_id TEXT REFERENCES analysis_runs(id);

-- Index for quick lookup of current analysis
CREATE INDEX IF NOT EXISTS idx_opportunities_current_analysis ON opportunities(current_analysis_run_id);

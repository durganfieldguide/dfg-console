-- =============================================================================
-- DFG API Migration 007: Add ai_analysis_json column to analysis_runs
-- =============================================================================
-- Fixes #53/#54/#57: Add missing column for storing full AI analysis result
-- =============================================================================

ALTER TABLE analysis_runs ADD COLUMN ai_analysis_json TEXT;

-- Add index for querying opportunities with AI analysis
CREATE INDEX IF NOT EXISTS idx_analysis_runs_has_ai ON analysis_runs(opportunity_id)
  WHERE ai_analysis_json IS NOT NULL;

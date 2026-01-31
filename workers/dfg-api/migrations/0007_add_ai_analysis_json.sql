-- =============================================================================
-- DFG API Migration 007: Add AI Analysis JSON Column (#53, #54, #57)
-- =============================================================================
-- Documents the ai_analysis_json column on analysis_runs table.
-- NOTE: This column may already exist in production (added manually).
-- This migration serves as documentation and for fresh database setups.
-- =============================================================================

-- Add the column to store full AI analysis results (if not exists)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so this may fail
-- on databases where the column already exists. That's OK - the migration
-- runner should continue past this error.
ALTER TABLE analysis_runs ADD COLUMN ai_analysis_json TEXT;

-- The column stores the complete AnalysisResult from dfg-analyst as JSON:
-- - verdict, maxBid, minFlip, conditionSummary
-- - redFlags, opportunities, marketComps
-- - acquisition breakdown, profit calculations

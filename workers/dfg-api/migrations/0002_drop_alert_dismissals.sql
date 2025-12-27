-- =============================================================================
-- DFG API Migration 002: Drop legacy alert_dismissals table
-- =============================================================================
-- Alert dismissals are now stored in operator_actions with action_type='alert_dismiss'.
-- This migration removes the unused alert_dismissals table if it exists.
-- =============================================================================

DROP TABLE IF EXISTS alert_dismissals;
DROP INDEX IF EXISTS idx_alert_dismissals_opportunity;

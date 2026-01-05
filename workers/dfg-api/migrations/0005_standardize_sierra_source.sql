-- =============================================================================
-- DFG API Migration 005: Standardize Sierra Source Name (#100)
-- =============================================================================
-- Renames 'sierra_auction' to 'sierra' for consistency across the codebase.
-- The frontend handles display formatting via formatSourceLabel().
-- =============================================================================

-- Update the sources table
UPDATE sources SET id = 'sierra', name = 'sierra' WHERE id = 'sierra_auction';

-- Update any opportunities that reference the old source name
UPDATE opportunities SET source = 'sierra' WHERE source = 'sierra_auction';

-- Update any tuning_events that reference the old source name
UPDATE tuning_events SET source = 'sierra' WHERE source = 'sierra_auction';

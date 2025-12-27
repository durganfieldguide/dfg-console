-- Reset Data Script
-- This clears all listing data, scout runs, and analysis while preserving schema and category definitions.
-- Run: npx wrangler d1 execute dfg-scout-db --file=./migrations/reset-data.sql --remote

-- Clear all listings (this is the main data)
DELETE FROM listings;

-- Clear scout run history
DELETE FROM scout_runs;

-- Clear failed operations queue
DELETE FROM failed_operations;

-- Clear outcomes ledger (if any)
DELETE FROM outcomes;

-- Verify counts are zero
SELECT 'listings' as table_name, COUNT(*) as row_count FROM listings
UNION ALL
SELECT 'scout_runs', COUNT(*) FROM scout_runs
UNION ALL
SELECT 'failed_operations', COUNT(*) FROM failed_operations
UNION ALL
SELECT 'outcomes', COUNT(*) FROM outcomes;

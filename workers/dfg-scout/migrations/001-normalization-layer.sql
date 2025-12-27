-- =============================================================================
-- DFG Scout - Normalization Layer Schema Migration
-- Apply to BOTH preview and production D1 databases
-- =============================================================================

-- NOTE:
-- D1/SQLite supports ALTER TABLE ADD COLUMN, but not IF NOT EXISTS for columns.
-- If this migration is re-run, it may fail with "duplicate column name".
-- Treat this as a one-time migration per environment.

-- -----------------------------------------------------------------------------
-- listings: add normalized columns
-- -----------------------------------------------------------------------------
ALTER TABLE listings ADD COLUMN location_text TEXT;
ALTER TABLE listings ADD COLUMN auction_end_at TEXT;              -- ISO datetime
ALTER TABLE listings ADD COLUMN image_url TEXT;
ALTER TABLE listings ADD COLUMN price_kind TEXT;                  -- PriceKind enum value
ALTER TABLE listings ADD COLUMN price_verified INTEGER DEFAULT 0;  -- 0 or 1
ALTER TABLE listings ADD COLUMN lot_status TEXT;                  -- LotStatus enum value

-- -----------------------------------------------------------------------------
-- indexes for common filters/sorts
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_auction_end_at ON listings(auction_end_at);
CREATE INDEX IF NOT EXISTS idx_listings_lot_status ON listings(lot_status);
CREATE INDEX IF NOT EXISTS idx_listings_price_verified ON listings(price_verified);
CREATE INDEX IF NOT EXISTS idx_listings_price_kind ON listings(price_kind);

-- -----------------------------------------------------------------------------
-- verification
-- -----------------------------------------------------------------------------
SELECT
  name,
  type
FROM
  pragma_table_info('listings')
WHERE
  name IN ('location_text', 'auction_end_at', 'image_url', 'price_kind', 'price_verified', 'lot_status');

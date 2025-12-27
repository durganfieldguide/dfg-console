-- Migration 004: Add photos column for full gallery URLs
-- Run: npx wrangler d1 execute dfg-scout-db --file=./migrations/004-add-photos-column.sql --remote

-- Add photos column to store JSON array of photo URLs
-- This enables analyst to receive full gallery instead of just thumbnail
ALTER TABLE listings ADD COLUMN photos TEXT;

-- Also add missing columns that the pipeline uses
ALTER TABLE listings ADD COLUMN description TEXT;
ALTER TABLE listings ADD COLUMN location_text TEXT;
ALTER TABLE listings ADD COLUMN auction_end_at INTEGER;
ALTER TABLE listings ADD COLUMN image_url TEXT;
ALTER TABLE listings ADD COLUMN price_kind TEXT;
ALTER TABLE listings ADD COLUMN price_verified INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN lot_status TEXT;

-- =============================================================================
-- DFG API Migration 006: MVC Event Logging (#187)
-- =============================================================================
-- Creates mvc_events table for operator decision-making audit trail.
-- Supports idempotency via unique constraint on (opportunity_id, sequence_number).
-- =============================================================================

CREATE TABLE IF NOT EXISTS mvc_events (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,

  -- Event identification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'decision_made',
    'bid_submitted',
    'bid_result',
    'sale_result'
  )),

  -- Idempotency support
  idempotency_key TEXT NOT NULL UNIQUE,
  sequence_number INTEGER NOT NULL,

  -- Event payload
  payload TEXT NOT NULL,  -- JSON: event-specific data
  schema_version TEXT NOT NULL DEFAULT '1.0',

  -- Timestamps
  emitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mvc_events_opportunity
  ON mvc_events(opportunity_id, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_mvc_events_type
  ON mvc_events(event_type, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_mvc_events_emitted
  ON mvc_events(emitted_at DESC);

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_mvc_events_idempotency
  ON mvc_events(opportunity_id, sequence_number);

# Technical Lead Contribution -- PRD Review Round 3 (Final)

**Author:** Technical Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Final after 3 rounds
**Codebase Revision:** `a4979fe` (main)

---

## Changes from Round 2

1. **Resolved ADR-006 (Outcomes Table Schema Ownership): committed to Option C for MVP, Option A for Phase 1.** All roles converged on this position in Round 2. The PM decided `sold_price` field on the `opportunities` table (not a separate `outcomes` table) is the MVP outcome tracking mechanism. The Technical Lead adds migration 0010 to formalize this. The `outcomes` table in dfg-scout's schema.sql remains dormant until Phase 1 when it will be rebuilt as a dfg-api-owned table keyed on `opportunity_id`. No remaining disagreement.

2. **Resolved ADR-007 (Verdict Threshold Logic): committed to AND logic for BUY.** Every role confirmed this in Round 2. The Target Customer said it is non-negotiable. The Business Analyst confirmed the codebase uses OR logic at `category-config.ts` line 258. The PM elevated it to P0. Migration 0008 handles the tuning_events fix; the verdict threshold fix is a code change in `applyVerdictThresholds()`, not a migration. Added to the Phase 0 implementation plan with the specific code change required.

3. **Promoted scout failure alerting from observability NFR to Phase 0 implementation requirement with concrete architecture.** Round 2 left this as an NFR with "minimum viable implementation" language. Every role in Round 2 -- PM, Business Analyst, UX Lead, Target Customer, Competitor Analyst -- identified this as the single highest-priority gap. Round 3 specifies the exact implementation: a `scout_health` cron check in dfg-api that queries `scout_runs` via the shared D1, populates `last_scout_run` on the stats endpoint, and exposes a `pipeline_stale` boolean when the last successful run exceeds 30 minutes. No push notification infrastructure is required for MVP; the dashboard red banner is sufficient.

4. **Added migration 0010 (`sold_price` column on opportunities).** The PM's ADR-003 revision and the Business Analyst's OQ-004 both require this field to measure the "realized margin >= 25%" success metric. This is a simple `ALTER TABLE ADD COLUMN` migration. The field is nullable and only populated when the operator records a sale outcome on a won deal. Added to the migration lineage and DDL.

5. **Revised tuning_events bug fix strategy: code fix preferred over migration.** Round 2 proposed migration 0008 to add `status_change` to the CHECK constraint. The Business Analyst's EC-013 resolution identified a simpler fix: change the auto-rejection code at `opportunities.ts` line 1278 to use `event_type: 'rejection'` with `auto_rejected: true` in `signal_data`. This is semantically cleaner (an auto-rejection IS a rejection) and avoids the D1 table rebuild migration. Migration 0008 is simplified to only the listing_id UNIQUE constraint fix. The tuning_events CHECK constraint migration moves to 0008b as a belt-and-suspenders backup.

6. **Consolidated CORS origin list to match codebase exactly.** Round 2 added `localhost:8787` to documentation. Codebase verification at `http.ts` line 11-15 shows only three origins: `https://app.durganfieldguide.com`, `https://durganfieldguide.com`, `http://localhost:3000`. The `localhost:8787` was a documentation error; wrangler dev for dfg-analyst uses port 8787 but it is not a browser origin that needs CORS. Corrected.

7. **Confirmed analyst endpoint authentication is implemented.** Round 2 listed this as "P0 -- verify implementation." Codebase verification at `worker.ts` line 2570 confirms `ANALYST_SERVICE_SECRET` Bearer token check is present on `/analyze`, `/analyze/justifications`, and `/debug/fetch-photo` endpoints. The `/health` endpoint is intentionally unauthenticated. Issue #123 status: the authentication mechanism exists, but needs verification that service binding calls from dfg-api bypass the check correctly (service bindings do not carry headers; the analyst must detect service binding calls). This needs a focused test, not a code change.

8. **Aligned `prompt()` replacement priority with cross-role consensus.** Round 2 classified this as R9 with "Accept for MVP (founder-only use)." The PM, Target Customer, UX Lead, and Business Analyst all called for P0 or P1-pre-beta treatment. The Target Customer said: "This is where real money gets committed." Final position: accept for the current founder-only deployment but track as a P0-adjacent item. The code change is a frontend concern (custom modal component), not a backend API change.

9. **Added explicit ingest endpoint error handling for UNIQUE constraint.** Migration 0008 adds a UNIQUE index on `opportunities(listing_id)`. The ingest endpoint must handle the resulting D1 constraint violation error gracefully (catch, log as `skipped`, continue) rather than failing the entire batch. Added to the API surface notes.

---

## Architecture & Technical Design

### System Boundary Diagram

```
                         iOS Safari
                             |
                             v
                    +----------------+
                    |   dfg-app      |
                    |  (Next.js 14)  |
                    |  Vercel        |
                    +-------+--------+
                            |
                   Bearer OPS_TOKEN
                            |
                            v
              +-------------+--------------+
              |         dfg-api            |
              |   (Cloudflare Worker)      |
              |   - Hono router            |
              |   - State machine          |
              |   - CRUD + Ingest          |
              |   - Cron: */5 watch check  |
              |   - D1 binding: "DB"       |
              +--+--------+--------+------+
                 |        |        |
      Service    |   D1   |        | Service
      Binding    |  Shared|        | Binding
                 v        v        v
        +--------+   +----+---+  +----------+
        |dfg-scout|  |  D1    |  |dfg-analyst|
        | (Worker)|  |SQLite  |  | (Worker)  |
        | Cron:   |  |16 tbls |  | Claude API|
        | */15    |  +--------+  +-----+-----+
        | D1: "DFG_DB"               |
        +---+-----+             Anthropic API
            |     |
            v     v
       +------+ +-----+
       |  R2  | | KV  |
       |Evid. | |Scout|
       +------+ +-----+
```

### Layer Architecture

| Layer | Service | Responsibility | Runtime | D1 Binding |
|-------|---------|----------------|---------|------------|
| Presentation | dfg-app | Operator console, iOS Safari optimized | Next.js 14 on Vercel | N/A |
| API Gateway | dfg-api | Auth, CRUD, state machine, ingest orchestration, watch cron | CF Worker | `DB` |
| Intelligence | dfg-analyst | AI-powered condition assessment + profit analysis | CF Worker | N/A |
| Collection | dfg-scout | Auction scraping, normalization, category routing | CF Worker | `DFG_DB` |

**Key architectural fact:** dfg-api and dfg-scout use different binding names (`DB` vs `DFG_DB`) but point to the same D1 database instance (`dfg-scout-db` in production, ID `08c267b8-b252-422a-8381-891d12917b33`; `dfg-scout-db-preview` in development, ID `e6af9d25-b031-4958-a3b2-455bafdff5f1`). This is confirmed in both `wrangler.toml` files. Migration runbooks must reference the correct binding name per worker.

### Key Design Decisions (Decided)

1. **Shared D1 database.** dfg-api and dfg-scout share the same D1 instance. dfg-api reads from `listings` (written by scout) and manages `opportunities` as the operator-facing entity. Binding names differ (`DB` vs `DFG_DB`). This avoids cross-worker synchronization but couples schema evolution. Migrations live in their respective owner directories.

2. **Service bindings for worker-to-worker calls.** dfg-api calls dfg-analyst and dfg-scout via Cloudflare service bindings in production (`ANALYST` and `SCOUT` bindings), with URL fallbacks for local development. Zero-latency RPC without network egress. Service binding calls bypass the analyst's Bearer token auth (service bindings are trusted, same account).

3. **Alerts are computed, not stored.** Alert state is derived at read time from opportunity fields (`watch_fired_at`, `auction_ends_at`, `status_changed_at`). Dismissals are stored as `operator_actions` rows with `action_type='alert_dismiss'`. This eliminates stale alert data at the cost of per-request computation.

4. **Analysis runs are immutable snapshots.** Each analysis execution creates a new `analysis_runs` row. The `opportunities.current_analysis_run_id` pointer enables history traversal and delta comparison without mutation.

5. **Optimistic concurrency on analysis.** The analyze endpoint uses `WHERE id = ? AND updated_at = ?` to detect concurrent modifications. On conflict, the orphaned `analysis_runs` record is cleaned up and a 409 is returned.

6. **Category-specific AI prompts.** The analyst worker dispatches to different prompt files and market data depending on category (trailers via `prompts.ts`/`analysis.ts`, vehicles via `prompts-vehicles.ts`/`analysis-vehicles.ts`, power tools via `prompts-power-tools.ts`/`analysis-power-tools.ts`). Each asset class has fundamentally different valuation drivers.

7. **State machine enforces disciplined evaluation.** The opportunity workflow requires progressive stage advancement (inbox -> qualifying -> inspect -> bid). Direct jumps from inbox to bid are intentionally disallowed. This enforces Product Principle #3 (conservative over optimistic) and prevents impulsive bidding. The Target Customer acknowledged the rationale in Round 2 and retracted the inbox-to-bid request.

8. **Verdict thresholds use AND logic for BUY.** (Decided in Round 2/3.) `applyVerdictThresholds` must require BOTH `min_profit` AND `min_margin` for a BUY recommendation. WATCH requires meeting either threshold. PASS when neither is met. This aligns with Product Principle #3 and is confirmed as non-negotiable by the Target Customer.

### Design Decisions Needing Validation

1. **No request queuing for analyst calls.** The dfg-api worker calls dfg-analyst synchronously with a 25-second timeout. If Claude API is slow or the analyst is under load, operator-initiated analysis requests will fail. For MVP this is acceptable, but any scale beyond a single operator will need a queue (CF Queues or Durable Objects).

2. **D1 row-level locking via application-layer checks.** SQLite (D1) has no row-level locks. The system uses conditional UPDATEs and optimistic locking. This is fine for single-operator MVP but will produce conflicts under concurrent use.

3. **No WebSocket / real-time push.** The operator must poll or refresh to see updated prices, new opportunities, or fired watch alerts. The 5-minute cron for watch triggers means up to 5 minutes of latency for time-sensitive alerts. Web Push API is the recommended Phase 1 solution (PM ADR-002, Part B).

---

## Proposed Data Model

The schema below reflects what is currently deployed (migrations 0001 through 0007) plus three required Phase 0 migrations (0008, 0009, 0010). This is the canonical reference for MVP.

### Migration Lineage

| Migration | Description | Owner | Status |
|-----------|-------------|-------|--------|
| 0001 | opportunities, operator_actions, tuning_events, sources + seeds | dfg-api | Deployed |
| 0002 | Drop alert_dismissals (folded into operator_actions) | dfg-api | Deployed |
| 0003 | analysis_runs + operator_inputs_json + current_analysis_run_id | dfg-api | Deployed |
| 0004 | staleness columns (last_operator_review_at, exit_price) | dfg-api | Deployed |
| 0005 | Standardize Sierra source ID | dfg-api | Deployed |
| 0006 | mvc_events table | dfg-api | Deployed |
| 0007 | ai_analysis_json on analysis_runs | dfg-api | Deployed |
| **0008** | **listing_id UNIQUE constraint on opportunities** | **dfg-api** | **Required -- Phase 0** |
| **0008b** | **Fix tuning_events CHECK constraint (belt-and-suspenders)** | **dfg-api** | **Required -- Phase 0** |
| **0009** | **Formalize analysis_runs snapshot columns** | **dfg-api** | **Required -- Phase 0** |
| **0010** | **Add sold_price to opportunities** | **dfg-api** | **Required -- Phase 0** |

### Core Tables

```sql
-- =============================================================================
-- sources: Auction platform definitions
-- Owner: dfg-api (migration 0001)
-- =============================================================================
CREATE TABLE sources (
  id                      TEXT PRIMARY KEY,       -- e.g., 'sierra_auction', 'ironplanet'
  name                    TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  enabled                 INTEGER NOT NULL DEFAULT 1,
  base_url                TEXT NOT NULL,
  default_buyer_premium_pct REAL NOT NULL DEFAULT 15.0,
  default_pickup_days     INTEGER NOT NULL DEFAULT 5,
  last_run_at             TEXT,                    -- ISO 8601
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

-- Seeded sources:
-- sierra_auction: 15% premium, 5 pickup days (active, primary)
-- ironplanet: 12% premium, 7 pickup days (active, ~17% capture rate -- P0 fix or disable)
-- govplanet: 10% premium, 10 pickup days (disabled, Phase 1 candidate)

-- =============================================================================
-- listings: Raw auction data from dfg-scout
-- Owner: dfg-scout (scout migrations)
-- NOTE: dfg-api reads from this table during ingest/sync. Schema changes
-- require coordination between dfg-api and dfg-scout teams.
-- =============================================================================
-- Key columns referenced by API:
--   id, source, source_id, url, title, description, current_bid, category_id,
--   buy_box_score, status, end_time, location, image_url, photos

-- =============================================================================
-- opportunities: Operator-facing entity for acquisition workflow
-- Owner: dfg-api (migrations 0001, 0003, 0004, 0008, 0010)
-- =============================================================================
CREATE TABLE opportunities (
  id                      TEXT PRIMARY KEY,
  source                  TEXT NOT NULL REFERENCES sources(id),
  source_lot_id           TEXT,
  source_url              TEXT,
  listing_id              TEXT,                    -- FK to scout listings table

  -- State machine
  status                  TEXT NOT NULL DEFAULT 'inbox'
                          CHECK (status IN (
                            'inbox','qualifying','watch','inspect',
                            'bid','won','lost','rejected','archived'
                          )),
  status_changed_at       TEXT NOT NULL,            -- ISO 8601

  -- Listing data (denormalized from scout)
  category_id             TEXT,
  title                   TEXT NOT NULL,
  description             TEXT,
  location                TEXT,
  distance_miles          REAL,
  current_bid             REAL DEFAULT 0,
  buy_now_price           REAL,
  reserve_status          TEXT CHECK (reserve_status IN (
                            'unknown','reserve_met','reserve_not_met'
                          )),
  estimated_fees          REAL,
  auction_ends_at         TEXT,                     -- ISO 8601
  pickup_deadline         TEXT,

  -- Scoring
  buy_box_score           REAL DEFAULT 0,           -- 0-100
  score_breakdown         TEXT,                     -- JSON: { margin: N, demand: N, condition: N, logistics: N }
  unknown_count           INTEGER DEFAULT 0,

  -- Analysis
  max_bid_low             REAL,
  max_bid_high            REAL,
  analysis_summary        TEXT,
  last_analyzed_at        TEXT,
  operator_inputs_json    TEXT,                     -- JSON: OperatorInputs (added 0003)
  current_analysis_run_id TEXT REFERENCES analysis_runs(id), -- (added 0003)

  -- Observed facts (operator augmentation)
  observed_facts          TEXT,                     -- JSON: ObservedFacts

  -- Watch state
  watch_cycle             INTEGER DEFAULT 0,
  watch_until             TEXT,
  watch_trigger           TEXT CHECK (watch_trigger IN (
                            'ending_soon','time_window','manual'
                          ) OR watch_trigger IS NULL),
  watch_threshold         TEXT,                     -- JSON: WatchThreshold
  watch_fired_at          TEXT,

  -- Bid state
  max_bid_locked          REAL,
  bid_strategy            TEXT CHECK (bid_strategy IN (
                            'manual','snipe','auto'
                          ) OR bid_strategy IS NULL),

  -- Outcome
  exit_price              REAL,                     -- (added 0004)
  final_price             REAL,                     -- Purchase price on won deals
  sold_price              REAL,                     -- Sale price recorded by operator (added 0010)
  outcome_notes           TEXT,

  -- Rejection
  rejection_reason        TEXT CHECK (rejection_reason IN (
                            'too_far','too_expensive','wrong_category',
                            'poor_condition','missing_info','other'
                          ) OR rejection_reason IS NULL),
  rejection_note          TEXT,

  -- Media
  r2_snapshot_key         TEXT,
  photos                  TEXT,                     -- JSON array of URLs
  primary_image_url       TEXT,

  -- Staleness tracking
  last_operator_review_at TEXT,                     -- (added 0004)

  -- Timestamps
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

-- Key indexes
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_listing_id ON opportunities(listing_id);
CREATE INDEX idx_opportunities_source ON opportunities(source);
CREATE INDEX idx_opportunities_category ON opportunities(category_id);
CREATE INDEX idx_opportunities_auction_ends ON opportunities(auction_ends_at);
CREATE INDEX idx_opportunities_score ON opportunities(buy_box_score DESC);
CREATE INDEX idx_opportunities_watch ON opportunities(status, watch_fired_at)
  WHERE status = 'watch';
CREATE INDEX idx_opportunities_staleness
  ON opportunities(status, last_operator_review_at, auction_ends_at)
  WHERE status NOT IN ('rejected', 'archived', 'won', 'lost');

-- MIGRATION 0008: Prevent duplicate opportunities from the same listing
CREATE UNIQUE INDEX idx_opportunities_listing_id_unique
  ON opportunities(listing_id) WHERE listing_id IS NOT NULL;

-- =============================================================================
-- analysis_runs: Immutable analysis snapshots
-- Owner: dfg-api (migrations 0003, 0007, 0009)
-- =============================================================================
CREATE TABLE analysis_runs (
  id                      TEXT PRIMARY KEY,
  opportunity_id          TEXT NOT NULL REFERENCES opportunities(id)
                          ON DELETE CASCADE,
  created_at              TEXT NOT NULL,

  -- Snapshot inputs (frozen at analysis time)
  listing_snapshot_hash   TEXT NOT NULL,
  assumptions_json        TEXT NOT NULL,
  operator_inputs_json    TEXT,

  -- Computed outputs
  derived_json            TEXT NOT NULL,            -- JSON: max bids, AI verdict
  gates_json              TEXT NOT NULL,            -- JSON: ComputedGates
  recommendation          TEXT NOT NULL
                          CHECK (recommendation IN (
                            'BID','WATCH','PASS','NEEDS_INFO'
                          )),
  trace_json              TEXT NOT NULL,            -- JSON: computation trace

  -- AI analysis result (from dfg-analyst) -- added 0007
  ai_analysis_json        TEXT,                     -- JSON: DualLensReport subset

  -- Snapshot context (MIGRATION 0009: formalize existing ad-hoc columns)
  snapshot_current_bid    REAL,
  snapshot_photo_count    INTEGER,
  snapshot_end_time       TEXT,

  -- Versioning
  calc_version            TEXT,
  gates_version           TEXT
);

CREATE INDEX idx_analysis_runs_opportunity ON analysis_runs(opportunity_id);
CREATE INDEX idx_analysis_runs_created ON analysis_runs(created_at DESC);

-- =============================================================================
-- operator_actions: Audit log (all operator + system actions)
-- Owner: dfg-api (migration 0001)
-- =============================================================================
CREATE TABLE operator_actions (
  id                      TEXT PRIMARY KEY,
  opportunity_id          TEXT NOT NULL REFERENCES opportunities(id),
  action_type             TEXT NOT NULL
                          CHECK (action_type IN (
                            'status_change','augmentation','note',
                            'alert_dismiss','batch_reject',
                            'batch_archive','re_analyze'
                          )),
  from_status             TEXT,
  to_status               TEXT,
  alert_key               TEXT,
  payload                 TEXT,                     -- JSON
  created_at              TEXT NOT NULL
);

CREATE INDEX idx_operator_actions_opportunity ON operator_actions(opportunity_id);
CREATE INDEX idx_operator_actions_created ON operator_actions(created_at DESC);
CREATE INDEX idx_operator_actions_type ON operator_actions(action_type);
CREATE INDEX idx_operator_actions_dismissals
  ON operator_actions(opportunity_id, alert_key)
  WHERE action_type = 'alert_dismiss';

-- =============================================================================
-- mvc_events: Immutable decision event log
-- Owner: dfg-api (migration 0006)
-- =============================================================================
CREATE TABLE mvc_events (
  id                      TEXT PRIMARY KEY,
  opportunity_id          TEXT NOT NULL REFERENCES opportunities(id)
                          ON DELETE CASCADE,
  event_type              TEXT NOT NULL
                          CHECK (event_type IN (
                            'decision_made','bid_submitted',
                            'bid_result','sale_result'
                          )),
  idempotency_key         TEXT NOT NULL UNIQUE,
  sequence_number         INTEGER NOT NULL,
  payload                 TEXT NOT NULL,            -- JSON
  schema_version          TEXT NOT NULL DEFAULT '1.0',
  emitted_at              TEXT NOT NULL,
  created_at              TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_mvc_events_idempotency
  ON mvc_events(opportunity_id, sequence_number);
CREATE INDEX idx_mvc_events_opportunity
  ON mvc_events(opportunity_id, emitted_at DESC);
CREATE INDEX idx_mvc_events_type
  ON mvc_events(event_type, emitted_at DESC);

-- =============================================================================
-- tuning_events: Signals for algorithm improvement
-- Owner: dfg-api (migrations 0001, 0008b)
-- =============================================================================
-- MIGRATION 0008b: Added 'status_change' to CHECK constraint as belt-and-suspenders
-- for auto-rejection events. Primary fix is code change (use 'rejection' event_type).
-- See Business Analyst EC-013.
CREATE TABLE tuning_events (
  id                      TEXT PRIMARY KEY,
  event_type              TEXT NOT NULL
                          CHECK (event_type IN (
                            'rejection','win','loss',
                            'score_override','time_in_stage',
                            'status_change'
                          )),
  opportunity_id          TEXT REFERENCES opportunities(id),
  source                  TEXT,
  category_id             TEXT,
  signal_data             TEXT NOT NULL,            -- JSON
  created_at              TEXT NOT NULL
);

CREATE INDEX idx_tuning_events_type ON tuning_events(event_type);
CREATE INDEX idx_tuning_events_source ON tuning_events(source);
CREATE INDEX idx_tuning_events_category ON tuning_events(category_id);
CREATE INDEX idx_tuning_events_created ON tuning_events(created_at DESC);

-- =============================================================================
-- category_defs: Category configuration (D1-driven, no code changes needed)
-- Owner: dfg-scout (scout migration 007-category-config.sql)
-- NOTE: Read by both dfg-api and dfg-scout. Prompt files remain in analyst
-- worker code (prompts.ts, prompts-vehicles.ts, prompts-power-tools.ts).
-- =============================================================================
CREATE TABLE category_defs (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  keywords_positive       TEXT NOT NULL DEFAULT '[]',
  keywords_negative       TEXT NOT NULL DEFAULT '[]',
  enabled                 INTEGER DEFAULT 1,
  parent_id               TEXT REFERENCES category_defs(id),
  min_score               INTEGER DEFAULT 30,
  requires_snapshot       INTEGER DEFAULT 1,
  confidence_threshold    INTEGER DEFAULT 60,
  hard_gates              TEXT DEFAULT '[]',
  min_photos              INTEGER DEFAULT 3,
  required_evidence       TEXT DEFAULT '[]',
  min_profit_dollars      REAL DEFAULT 600,
  min_margin_percent      REAL DEFAULT 40,
  max_acquisition         REAL DEFAULT 6000,
  target_days_to_sell     INTEGER DEFAULT 14,
  max_distance_miles      REAL DEFAULT 100,
  distance_margin_override REAL,
  prompt_file             TEXT,
  condition_schema        TEXT,
  market_comps_file       TEXT,
  verdict_thresholds      TEXT,                     -- JSON
  display_order           INTEGER DEFAULT 100,
  icon                    TEXT,
  updated_at              INTEGER
);
```

### Required Migration: 0008

```sql
-- =============================================================================
-- DFG API Migration 0008: listing_id uniqueness
-- =============================================================================
-- Prevents duplicate opportunities from the same listing.
-- After this migration, the ingest endpoint must handle UNIQUE constraint
-- violations gracefully (catch, log as 'skipped', continue processing batch).
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_listing_id_unique
  ON opportunities(listing_id) WHERE listing_id IS NOT NULL;
```

### Required Migration: 0008b

```sql
-- =============================================================================
-- DFG API Migration 0008b: Fix tuning_events CHECK constraint
-- =============================================================================
-- Belt-and-suspenders fix for EC-013. The primary fix is a code change:
-- auto-rejection tuning events should use event_type='rejection' with
-- auto_rejected=true in signal_data (semantically correct).
--
-- This migration adds 'status_change' to the CHECK constraint as a fallback
-- so that if any code path still uses 'status_change', it does not silently
-- fail. D1/SQLite does not support ALTER TABLE DROP CONSTRAINT, so this
-- requires a table rebuild.
-- =============================================================================

CREATE TABLE tuning_events_new (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'rejection', 'win', 'loss', 'score_override', 'time_in_stage', 'status_change'
  )),
  opportunity_id TEXT REFERENCES opportunities(id),
  source TEXT,
  category_id TEXT,
  signal_data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO tuning_events_new SELECT * FROM tuning_events;
DROP TABLE tuning_events;
ALTER TABLE tuning_events_new RENAME TO tuning_events;

-- Recreate indexes
CREATE INDEX idx_tuning_events_type ON tuning_events(event_type);
CREATE INDEX idx_tuning_events_source ON tuning_events(source);
CREATE INDEX idx_tuning_events_category ON tuning_events(category_id);
CREATE INDEX idx_tuning_events_created ON tuning_events(created_at DESC);
```

### Required Migration: 0009

```sql
-- =============================================================================
-- DFG API Migration 0009: Formalize analysis_runs snapshot columns
-- =============================================================================
-- These columns may already exist in production via ad-hoc ALTER statements.
-- This migration documents them and ensures they exist on fresh databases.
-- SQLite silently succeeds on ADD COLUMN for existing columns in some builds.
-- =============================================================================

ALTER TABLE analysis_runs ADD COLUMN snapshot_current_bid REAL;
ALTER TABLE analysis_runs ADD COLUMN snapshot_photo_count INTEGER;
ALTER TABLE analysis_runs ADD COLUMN snapshot_end_time TEXT;
```

### Required Migration: 0010

```sql
-- =============================================================================
-- DFG API Migration 0010: Add sold_price to opportunities
-- =============================================================================
-- Enables minimum viable outcome tracking per PM ADR-003 and BA OQ-004.
-- Operator enters sold_price when recording a sale on a won deal.
-- Combined with final_price and source defaults, this enables realized
-- margin calculation using canonical money math:
--
--   Acquisition Cost = final_price * (1 + buyer_premium_pct/100)
--                      + estimated_transport + estimated_repairs
--   Net Proceeds     = sold_price - listing_fees - payment_processing
--   Realized Profit  = Net Proceeds - Acquisition Cost
--   Realized Margin  = (Realized Profit / Acquisition Cost) * 100
--
-- Full P&L entry (actual repair costs, actual transport, listing fees)
-- is Phase 1.
-- =============================================================================

ALTER TABLE opportunities ADD COLUMN sold_price REAL;
```

### State Machine

```
inbox --> qualifying --> watch --> inspect --> bid --> won
  |           |            |          |         |       |
  |           |            |          |         +-> lost |
  |           |            |          |                  |
  +-----+-----+-----+------+-----+---+---------+--------+
        |                        |              |
        v                        v              v
     rejected ────────────> archived <──────────+
```

Valid transitions (from `STATE_TRANSITIONS` in `@dfg/types`, file: `packages/dfg-types/src/index.ts`):

| From | Allowed To |
|------|-----------|
| inbox | qualifying, watch, rejected, archived |
| qualifying | watch, inspect, rejected, archived |
| watch | qualifying, inspect, rejected, archived |
| inspect | bid, rejected, archived |
| bid | won, lost, rejected, archived |
| won | archived |
| lost | archived |
| rejected | archived |
| archived | (terminal) |

**Design note on workflow friction (final position):** The Target Customer retracted the inbox-to-bid shortcut request in Round 2, acknowledging that the progressive evaluation stages protect against impulsive bidding. The UX Lead proposed an "Inspect" shortcut button on the inbox action bar that auto-advances through qualifying. This is a frontend UX pattern, not a state machine change -- the API still receives two sequential PATCH calls (`inbox->qualifying`, `qualifying->inspect`). The state machine in `@dfg/types` is not modified.

---

## API Surface

All endpoints are served by dfg-api on Cloudflare Workers. Auth is via `Authorization: Bearer <OPS_TOKEN>` header. CORS is restricted to three origins (verified in `http.ts` line 11-15):

- `https://app.durganfieldguide.com`
- `https://durganfieldguide.com`
- `http://localhost:3000`

### Public Endpoints

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/health` | `{ status: "ok", service: "dfg-api", env: string }` | No auth required |

### Opportunities

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/opportunities` | Query: `status`, `category_id`, `ending_within`, `score_band`, `needs_attention`, `stale_qualifying`, `attention`, `stale`, `analysis_stale`, `decision_stale`, `ending_soon`, `strike_zone`, `verification_needed`, `new_today`, `limit` (max 100), `offset`, `sort`, `order` | `{ data: { opportunities: [...], total }, meta: { limit, offset } }` | Comma-separated status values supported |
| GET | `/api/opportunities/:id` | -- | `{ data: { ...opportunity, source_defaults, actions, alerts, operatorInputs, currentAnalysisRun, gates, inputsChangedSinceAnalysis } }` | Full detail view with computed gates and alerts |
| PATCH | `/api/opportunities/:id` | `{ status?, rejection_reason?, rejection_note?, watch_trigger?, watch_threshold?, max_bid_locked?, bid_strategy?, final_price?, sold_price?, observed_facts?, outcome_notes? }` | Updated opportunity | State machine enforced. `sold_price` added in migration 0010. |
| POST | `/api/opportunities/:id/actions` | `{ action_type, payload }` | `{ data: { id, action_type, created_at } }` | Audit log entry |
| PATCH | `/api/opportunities/:id/inputs` | `{ title?: TitleInputsV1, overrides?: OperatorOverrides }` | `{ success, operatorInputs, inputsChangedSinceAnalysis, autoRejected, hardGateFailures? }` | Deep-merges with existing; triggers auto-reject on hard gate failures |
| POST | `/api/opportunities/:id/analyze` | `{ assumptions?, skipAiAnalysis? }` | `{ analysisRun: { id, recommendation, derived, gates, aiAnalysis }, delta? }` | Calls dfg-analyst via service binding; 25s timeout; optimistic lock (409 on conflict) |
| POST | `/api/opportunities/:id/touch` | -- | 204 (dedupe) or 200 (recorded) | 60-second dedupe window |
| POST | `/api/opportunities/batch` | `{ opportunity_ids: string[], action: "reject"\|"archive", rejection_reason?, rejection_note? }` | `{ data: { processed, failed, results } }` | Max 50 per batch |
| GET | `/api/opportunities/stats` | -- | `{ data: { by_status, strike_zone, verification_needed, ending_soon, new_today, stale_qualifying, watch_alerts_fired, needs_attention, last_scout_run, pipeline_stale } }` | Dashboard summary counts. `last_scout_run` and `pipeline_stale` are P0 implementations. |

### Alerts

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/opportunities/:id/alerts/dismiss` | `{ alert_key }` | `{ data: { success, dismissed } }` | Legacy endpoint |
| POST | `/api/alerts/dismiss` | `{ opportunity_id, alert_key }` | `{ data: { success, dismissed } }` | Spec-compliant |
| POST | `/api/alerts/dismiss/batch` | `{ dismissals: [{ opportunity_id, alert_key }] }` | `{ data: { processed, failed, results } }` | Max 50 |

### Dashboard

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/api/dashboard/attention` | `{ items: [...], total_count }` | Priority-sorted attention queue with reason tags |

### Sources

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/sources` | -- | `{ data: { sources: [...] } }` |
| GET | `/api/sources/:id` | -- | `{ data: { ...source } }` |
| PATCH | `/api/sources/:id` | `{ enabled?, display_name?, default_buyer_premium_pct?, default_pickup_days? }` | Updated source |

### Categories

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/categories` | `{ data: [...category_defs] }` |
| GET | `/api/categories/:id` | `{ data: { ...category_def } }` |

### Ingest

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/ingest` | `{ listings: IngestListing[], source? }` | `{ data: { created, updated, skipped, errors } }` | Max 100 per batch. After migration 0008, duplicate `listing_id` inserts must be caught and counted as `skipped`, not as errors. |
| POST | `/api/ingest/sync` | -- | `{ data: { created, updated, skipped, errors, photos_synced } }` | Pulls candidates from listings table |
| POST | `/api/ingest/sync-photos` | -- | `{ data: { updated, skipped, errors } }` | Syncs photos from listings to opportunities |

### Events (MVC Audit)

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/events` | `{ opportunity_id, event_type, payload, emitted_at? }` | `{ data: { id, ..., idempotent: bool } }` | Idempotent via sequence number |
| GET | `/api/events?opportunity_id=X` | -- | `{ data: { events: [...] } }` | Ordered by sequence_number ASC |

### Triggers

| Method | Path | Response |
|--------|------|----------|
| POST | `/api/triggers/check` | `{ data: { checked, fired, timestamp } }` |

### Scout Operations

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/scout/run` | `{ source?, dryRun? }` | `{ data: { triggered, method, source, dryRun, result? } }` |

### dfg-analyst Endpoints (Internal, service-binding only in production)

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| GET | `/health` | -- | `{ status: "ok" }` | None |
| POST | `/analyze` | `ListingData` | `DualLensReport` | Bearer ANALYST_SERVICE_SECRET (URL access); bypassed via service binding |
| POST | `/analyze/justifications` | Justification request | Justification response | Bearer ANALYST_SERVICE_SECRET |

### dfg-scout Endpoints (Internal, service-binding only in production)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |
| GET | `/ops/run` | OPS_TOKEN |
| GET | `/ops/stats` | OPS_TOKEN |
| GET | `/ops/listings` | OPS_TOKEN |
| GET | `/ops/listings/:id` | OPS_TOKEN |
| GET | `/ops/analysis/:id` | OPS_TOKEN |
| POST | `/ops/analysis` | OPS_TOKEN |
| POST | `/ops/hydrate-backfill` | OPS_TOKEN |
| GET | `/ops/photo-stats` | OPS_TOKEN |
| GET | `/ops/verify-snapshots` | OPS_TOKEN |

---

## Non-Functional Requirements

### Performance Budgets

| Metric | Target | Rationale |
|--------|--------|-----------|
| API response (list endpoints) | < 200ms p95 | D1 SQLite queries; simple JOINs; indexed |
| API response (single opportunity GET) | < 300ms p95 | Includes 3 queries (opportunity + actions + alerts computation) |
| API response (analyze with AI) | < 30s p95 | Claude API call dominates; 25s timeout + overhead |
| API response (analyze without AI) | < 500ms p95 | Gate-only refresh, no external call |
| End-to-end analysis pipeline | < 45s p95 | From listing ingestion to scored opportunity |
| Ingest batch (50 listings) | < 5s p95 | Sequential D1 inserts; consider D1 batch API for improvement |
| Scout scrape cycle | < 60s p95 | Runs every 15 minutes via cron |
| Frontend LCP (iOS Safari) | < 2.5s | Next.js SSR + API fetch |
| Frontend INP (iOS Safari) | < 200ms | Touch interactions must feel instant; Target Customer: "Next Action Card within 1 second" |

### Reliability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API availability | 99.5% monthly | Cloudflare Workers SLA; single region |
| Scout cron success rate | > 95% | External auction sites may be flaky |
| Analysis success rate | > 90% | Claude API may timeout or rate-limit |
| Data loss tolerance | Zero for opportunities, operator_actions, mvc_events | D1 provides durable storage; R2 snapshots are immutable |

### Scout Health Observability (Phase 0 Implementation)

The following is the minimum viable implementation for scout failure alerting, the highest-priority gap identified across all roles.

**Architecture:**

```
dfg-scout (cron */15)
  |
  | Writes to scout_runs table after each cron execution
  | (success/failure, source, listings_found, timestamp)
  |
  v
D1 (shared)
  ^
  |
  | dfg-api stats endpoint reads scout_runs
  | SELECT MAX(completed_at) FROM scout_runs WHERE success = 1
  |
dfg-api (/api/opportunities/stats)
  |
  | Returns: last_scout_run (ISO 8601 or null)
  |          pipeline_stale (boolean: last_scout_run > 30 min ago)
  |
  v
dfg-app (Dashboard)
  |
  | Red banner: "Scout has not run since [time]. Deal flow may be stale."
  | Shown when pipeline_stale = true
```

**Implementation details:**

1. `GET /api/opportunities/stats` queries the `scout_runs` table (owned by dfg-scout, already exists) for the most recent successful run timestamp.
2. If `last_successful_run` is older than 30 minutes or null, `pipeline_stale` is set to `true`.
3. The frontend renders a red warning banner on the dashboard when `pipeline_stale` is `true`.
4. No push notification infrastructure is required for MVP. The operator sees the banner when they open the console. Push notifications for scout failure are Phase 1 (PM ADR-002, Part B).

**Why this is sufficient for MVP:** The Target Customer checks the console "several times a day in 2-3 minute bursts." A dashboard banner will be seen within hours of a failure. The PM's kill criterion is "operator discovers a scout outage more than 4 hours after it begins" -- a dashboard banner during regular use will meet this threshold.

### Capacity Limits (MVP)

| Resource | Limit | Source |
|----------|-------|--------|
| D1 database size | 10 GB | Cloudflare D1 free/pro tier |
| D1 rows read per query | 5,000,000 | D1 limit per request |
| D1 rows written per request | 100,000 | D1 limit |
| Worker CPU time | 30s (paid) / 10ms (free) | CF Workers limit |
| Worker subrequests | 50 per request | CF Workers limit |
| R2 object size | 5 GB max | R2 limit |
| Batch operation size | 50 items | Application-enforced |
| Ingest batch size | 100 listings | Application-enforced |

### Security Requirements

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| No wildcard CORS | Origin allowlist in `http.ts` (3 origins) | Implemented |
| No exposed debug endpoints | 404 for unmatched routes; no `/debug/*` in production | Implemented |
| SQL injection prevention | All queries use `.bind()` parameterization | Implemented |
| Auth on all API endpoints | Bearer OPS_TOKEN check before route dispatch | Implemented |
| Auth on analyst endpoints | ANALYST_SERVICE_SECRET required for URL-based calls; service bindings trusted | Implemented (needs integration test) |
| R2 snapshot immutability | New key per snapshot; no overwrites | Implemented |
| Secrets not in source control | Wrangler secrets for OPS_TOKEN, ANTHROPIC_API_KEY, ANALYST_SERVICE_SECRET | Implemented |
| Input validation at boundaries | JSON parse with null fallback; field-level validation | Partial -- some endpoints do not validate payload shapes |

---

## Technical Risks

| # | Risk | Severity | Likelihood | Mitigation | Status |
|---|------|----------|------------|------------|--------|
| R1 | **D1 concurrent write conflicts** -- `PATCH /api/opportunities/:id` does not use optimistic locking. Two requests updating the same opportunity simultaneously could cause lost updates. | High | Low (single operator) | Accept for MVP. Add `updated_at` optimistic lock to PATCH before Phase 1. | Accepted |
| R2 | **Analyst timeout under Claude API load** -- 25-second timeout may be exceeded during peak periods. | Medium | Medium | Gate-only fallback already implemented. UI must indicate when recommendation is gate-only vs AI-powered. | Accepted; UI indicator needed |
| R3 | **Shared D1 schema coupling** -- dfg-scout and dfg-api share the same D1 with different binding names (`DFG_DB` vs `DB`). Schema changes require coordination. | High | Medium | Schema ownership matrix (see Appendix) documents who owns what. Migrations live in owner's directory. | Documented |
| R4 | **Thread-local CORS pattern** -- `setCurrentRequest()` stores request in module-level variable. If CF Workers process concurrent requests in same isolate, CORS headers could leak. | Medium | Low | CF Workers use one-request-per-isolate. Document assumption. | Accepted |
| R5 | **No rate limiting on API** -- Compromised OPS_TOKEN or runaway client could exhaust D1 quotas. | Medium | Low | Add per-IP rate limiting via CF WAF in Phase 1. | Accepted |
| R6 | **Auction data freshness** -- Scout runs every 15 minutes. Prices and lot status can be up to 15 minutes stale. | Medium | High | Display "last updated" timestamp prominently (per UX Lead Change #3). On-demand refresh in Phase 1. | Accepted |
| R7 | **Ingest idempotency** -- Duplicate listings could create duplicate opportunities. | Medium | Low | **Fixed in Phase 0 by migration 0008** (UNIQUE constraint on listing_id). Ingest endpoint must handle constraint violations gracefully. | Fix in progress |
| R8 | **Watch trigger latency** -- 5-minute cron means alerts can fire up to 5 minutes late. | Low | High | 4-hour default threshold provides buffer. Durable Objects alarms for sub-minute precision in Phase 1. | Accepted |
| R9 | **Browser `prompt()` for financial inputs** -- No validation, no formatting, no confirmation step for the most consequential dollar amounts. | Medium | Medium | Accept for current founder-only deployment. Replace with custom modal component before Phase 1 private beta. Frontend change only. | Tracked, P0-adjacent |
| R10 | **Platform access revocation** -- IronPlanet (Ritchie Bros/RB Global) could restrict scraping access. GovDeals investing in buyer tools. | High | Medium | Adapter architecture isolates platform logic. Rate limiting and polite headers implemented. GovPlanet adapter seeded for Phase 1. If platform blocks, disable source transparently. | Accepted |
| R11 | **tuning_events CHECK constraint failure** -- Auto-rejection code inserts `event_type = 'status_change'` but CHECK constraint does not allow it. Silent data loss. | High | High | **Fix via code change:** use `event_type: 'rejection'` with `auto_rejected: true` in signal_data. Migration 0008b adds `status_change` as belt-and-suspenders. | Fix in progress |
| R12 | **Verdict threshold OR logic** -- `applyVerdictThresholds` uses OR logic, allowing low-margin deals to receive BUY recommendation. Violates Product Principle #3. | High | High | **Fix via code change:** change OR to AND at `category-config.ts` line 258. Backtest against historical data required. | Fix in progress |

---

## Phase 0 Implementation Plan (Priority-Ordered)

This is the concrete implementation sequence for remaining Phase 0 work, derived from cross-role consensus across all three rounds.

### P0 Items (Must-fix before Phase 0 is considered complete)

| # | Item | Type | Estimated Effort | Dependencies |
|---|------|------|-----------------|--------------|
| 1 | Fix auto-rejection tuning event type | Code change | 1 hour | None |
|   | File: `workers/dfg-api/src/routes/opportunities.ts` line 1278 | | | |
|   | Change: `event_type: 'status_change'` to `event_type: 'rejection'` | | | |
| 2 | Run migration 0008b (tuning_events CHECK constraint) | Migration | 30 min | Item 1 deployed first |
| 3 | Run migration 0008 (listing_id UNIQUE constraint) | Migration | 30 min | None |
|   | Also: update ingest endpoint to catch UNIQUE violation errors gracefully | | | |
| 4 | Run migration 0009 (analysis_runs snapshot columns) | Migration | 15 min | None |
| 5 | Fix verdict threshold logic | Code change | 2 hours | Backtest data review |
|   | File: `workers/dfg-analyst/src/category-config.ts` line 258 | | | |
|   | Change: `\|\|` to `&&` for BUY threshold; keep `\|\|` for WATCH threshold | | | |
| 6 | Implement `last_scout_run` on stats endpoint | Code change | 4 hours | Shared D1 access to scout_runs |
|   | File: `workers/dfg-api/src/routes/opportunities.ts` (stats handler) | | | |
|   | Query: `SELECT MAX(completed_at) FROM scout_runs WHERE success = 1` | | | |
|   | Return: `last_scout_run` (ISO 8601), `pipeline_stale` (boolean) | | | |
| 7 | Dashboard stale pipeline banner | Frontend change | 2 hours | Item 6 |
|   | Red banner on dashboard when `pipeline_stale = true` | | | |
| 8 | IronPlanet capture rate: diagnose and fix or disable | Investigation | 4-8 hours | None |
|   | If structural (anti-scraping): disable source, remove from Sources page | | | |
|   | If fixable: fix adapter to >= 80% capture rate | | | |
| 9 | Verify analyst endpoint auth via service bindings | Test | 1 hour | None |

### P1 Items (Pre-Phase 1 beta blockers)

| # | Item | Type | Estimated Effort |
|---|------|------|-----------------|
| 10 | Run migration 0010 (sold_price column) | Migration | 15 min |
| 11 | Add `sold_price` to PATCH endpoint and opportunity detail response | Code change | 2 hours |
| 12 | Replace `prompt()` with custom financial input modal | Frontend change | 8 hours |
| 13 | Dashboard quick-pass action: change default reason from `other` to `missing_info` | Frontend change | 30 min |

---

## Open Decisions / ADRs

### ADR-001: Event Sourcing Scope

**Status:** Decided (Hybrid)

Financial events (decisions, bids, outcomes) use immutable `mvc_events`. Workflow state changes use direct mutation tracked by `operator_actions`. No change from Round 2. All roles accepted this.

### ADR-002: Notification Channels

**Status:** Split decision (unchanged from Round 2)

- **Part A: Scout failure alerting (Phase 0):** Dashboard banner when `pipeline_stale = true`. No push notification infrastructure. Implementation specified in Scout Health Observability section above.
- **Part B: Opportunity alerting (Phase 1):** Web Push API via service worker. SMS as critical-only fallback. The Competitor Analyst documented that all direct competitors have native push notifications; DFG's web push will have structural limitations on iOS Safari but is sufficient for 3-5 beta users.

### ADR-003: Outcomes / P&L Tracking

**Status:** Decided for MVP (finalized Round 3)

Add `sold_price` column to `opportunities` via migration 0010. Combined with `final_price` and source defaults, enables realized margin calculation. The `outcomes` table in dfg-scout's schema.sql remains dormant. Phase 1 creates an API-owned outcomes table keyed on `opportunity_id` with full P&L fields.

**Realized margin formula (using existing + new data):**
```
Acquisition Cost = final_price * (1 + source.default_buyer_premium_pct/100)
                   + analysis_runs.assumptions_json.transport_estimate
                   + analysis_runs.assumptions_json.repairs_total
Net Proceeds     = sold_price - estimated_listing_fees - estimated_processing_fees
Realized Profit  = Net Proceeds - Acquisition Cost
Realized Margin  = (Realized Profit / Acquisition Cost) * 100
```

Note: transport and repair estimates come from the analysis assumptions, not actual costs. Full P&L with actual costs is Phase 1.

### ADR-004: Category System Extensibility

**Status:** Decided (D1-driven categories with code-side prompts)

No change from Round 2. `category_defs` provides runtime configuration. Prompt files remain in analyst worker code. Adding a new category requires: (1) insert row in category_defs, (2) add prompt file and analysis file to analyst worker, (3) deploy.

### ADR-005: Photo Storage Strategy

**Status:** Decided (R2 for evidence, URL references for display)

No change from Round 2. External URLs for display (fast, no storage cost), R2 for evidence snapshots (immutable, survives auction site changes). The UX Lead specified swipe-through lightbox navigation; this is a frontend concern, not a storage architecture change.

### ADR-006: Outcomes Table Schema Ownership

**Status:** Decided (Option C for MVP, Option A for Phase 1)

For MVP: use `sold_price` on the `opportunities` table (migration 0010) plus `sale_result` event payload in `mvc_events`. No dedicated outcomes table.

For Phase 1: create the outcomes table as a dfg-api migration, keyed on `opportunity_id` (not `listing_id`). The existing `outcomes` table in dfg-scout's schema.sql will be superseded.

### ADR-007: Verdict Threshold Logic

**Status:** Decided (AND logic for BUY)

**Code change required:**
```typescript
// File: workers/dfg-analyst/src/category-config.ts, line 258
// BEFORE (current, incorrect):
if (profit >= thresholds.buy.min_profit || margin >= thresholds.buy.min_margin) {
  return 'BUY';
}

// AFTER (correct, conservative):
if (profit >= thresholds.buy.min_profit && margin >= thresholds.buy.min_margin) {
  return 'BUY';
}

// WATCH threshold remains OR logic (unchanged):
if (profit >= thresholds.watch.min_profit || margin >= thresholds.watch.min_margin) {
  return 'WATCH';
}
```

**Validation required:** Backtest this change against historical opportunities (query `analysis_runs` for cases where the verdict would change). The PM must review any deals that would have been downgraded from BUY to WATCH under AND logic.

---

## Appendix: Money Math Validation Checklist

Any new feature that touches pricing must validate against these canonical formulas (from CLAUDE.md, non-negotiable):

```
Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
Net Proceeds     = Sale Price - Listing Fees - Payment Processing
Profit           = Net Proceeds - Acquisition Cost
Margin %         = (Profit / Acquisition Cost) * 100
```

**Critical invariant:** Listing fees are SELLING COSTS ONLY. They must never appear in acquisition cost. Double-counting listing fees is the most common money math bug.

The analyst worker implements these in `calculation-spine.ts` (file: `workers/dfg-analyst/src/calculation-spine.ts`). Buyer premium calculation uses `calculateBuyerPremium` from `@dfg/money-math` with `SIERRA_FEE_SCHEDULE` for Sierra Auction source (tiered schedule with flat fees, percent fees, and caps). The API worker references `max_bid_low` / `max_bid_high` from analysis runs. Any new endpoint or view that displays profit/margin must use these exact definitions.

---

## Appendix: Schema Ownership Matrix

| Table | Owner | Migrations In | Binding | Notes |
|-------|-------|--------------|---------|-------|
| sources | dfg-api | dfg-api/0001 | DB | Seeded with 3 sources |
| opportunities | dfg-api | dfg-api/0001, 0003, 0004, 0008, 0010 | DB | Core operator entity. `sold_price` added in 0010. |
| analysis_runs | dfg-api | dfg-api/0003, 0007, 0009 | DB | Immutable snapshots |
| operator_actions | dfg-api | dfg-api/0001 | DB | Audit log |
| mvc_events | dfg-api | dfg-api/0006 | DB | Immutable event log |
| tuning_events | dfg-api | dfg-api/0001, 0008b | DB | Algorithm tuning signals |
| category_defs | dfg-scout | dfg-scout/007 | DFG_DB | Shared config, read by both workers |
| listings | dfg-scout | dfg-scout/001, 004, 008 | DFG_DB | Raw auction data |
| scout_runs | dfg-scout | dfg-scout/schema | DFG_DB | Pipeline health tracking. Read by dfg-api stats endpoint via shared D1. |
| failed_operations | dfg-scout | dfg-scout/schema | DFG_DB | Retry queue |
| outcomes | dfg-scout (dormant) | dfg-scout/schema | DFG_DB | Not used in MVP. Phase 1: rebuild as dfg-api-owned table. |
| price_guides | dfg-scout | dfg-scout/schema | DFG_DB | Reference data |

---

## Appendix: Cross-Role Dependency Map

| Technical Decision | Affects Role | How | Final Status |
|-------------------|-------------|-----|-------------|
| State machine transitions (no inbox-to-bid) | Target Customer, UX Lead | Constrains action bar buttons per status. UX Lead added "Inspect" shortcut on inbox action bar as a workaround. | Resolved -- Target Customer accepted |
| 25s analyst timeout with gate fallback | Business Analyst, UX Lead | AC-003.6 handles null AI analysis. Target Customer wants a visual indicator for gate-only vs AI-powered recommendations. | Resolved -- UI indicator needed |
| Computed alerts (not stored) | UX Lead | Every detail page load recomputes alerts. No push mechanism possible without cron or Web Push API. | Accepted for MVP |
| D1 CHECK constraints | Business Analyst | EC-013 (tuning_events) is a confirmed bug. Fix via code change + migration 0008b. | Fix in progress |
| No WebSocket support | UX Lead, Target Customer, Competitor Analyst | Alerts only visible when console is open. 5-minute cron latency for watch triggers. | Accepted for MVP; Web Push in Phase 1 |
| UNIQUE listing_id constraint (0008) | Business Analyst | Ingest behavior changes: duplicate listing_id now returns UNIQUE violation. Ingest endpoint must handle gracefully. | Fix in progress |
| `prompt()` for financial inputs | UX Lead, Target Customer | Money math correctness risk. Must be replaced before Phase 1 private beta. | Tracked, P0-adjacent |
| Verdict threshold AND logic (ADR-007) | Business Analyst, Target Customer | Changes which deals receive BUY recommendation. Requires backtest before deployment. | Fix in progress |
| `sold_price` column (migration 0010) | PM, Business Analyst | Enables "realized margin >= 25%" success metric measurement. PATCH endpoint must accept `sold_price`. | Migration ready |
| Scout health on stats endpoint | PM, Target Customer, UX Lead | Enables dashboard stale pipeline banner. Requires cross-worker D1 read of `scout_runs`. | Implementation specified |

---

## Unresolved Issues

### Issue 1: IronPlanet -- Fix or Disable

**Disagreement:** The PM says "fix adapter to >= 80% capture or disable." The Target Customer shifted in Round 2 from "fix it" to "have a fallback" (add a third source). The Competitor Analyst warns the platform could block access entirely. The Technical Lead has not investigated the root cause of the 17% capture rate.

**Impact:** If the capture rate is due to anti-scraping measures (rate limiting, CAPTCHAs, dynamic rendering), fixing may be impossible without a fundamentally different approach (headless browser, Puppeteer via Browser Rendering API). If it is a parsing bug in the adapter, it could be a 2-hour fix.

**My position:** Investigate first (4-8 hours). The root cause determines the path. If the adapter is parsing incorrectly, fix it. If the platform is actively blocking, disable the source immediately -- a 17% capture rate shown as "active" violates the operator's trust. Do not invest in a third source (GovPlanet) until the IronPlanet question is resolved. Adding sources while existing sources are broken is anti-pattern.

**What is needed:** A time-boxed investigation of the IronPlanet adapter's failure mode. Check response codes, page structure changes, rate limiting headers, and whether the scout is being served different content than a browser. Report findings to PM for a fix/disable decision.

### Issue 2: `prompt()` Replacement -- Phase 0 or Phase 1

**Disagreement:** The PM classified `prompt()` replacement as Phase 1 ("Replace browser `prompt()` for bid/won entry"). The Target Customer said in Round 2: "This is where real money gets committed" and called for P0. The UX Lead specified a custom modal design (Pattern 8). The Business Analyst documented the data integrity risk (OQ-010). My Round 2 classified it as R9 with "accept for MVP."

**Impact:** Low probability of actual error for the founder (Scott is financially literate and enters numbers carefully), but the risk increases nonlinearly with additional users in Phase 1. The `prompt()` dialog on iOS Safari is small, the keyboard covers the input, and there is no confirmation step.

**My position:** Accept for the current single-operator deployment. It is a frontend change that does not affect the API, data model, or backend architecture. The UX Lead has already specified the replacement modal (Pattern 8). Implement it as the first Phase 1 deliverable, before any beta users access the system. Calling it P0 overstates the risk for a single technically-competent operator; calling it Phase 1 understates the urgency relative to other Phase 1 items. It should be the bridge item between Phase 0 completion and Phase 1 beta onboarding.

**What is needed:** PM decision on whether to implement before or after the Phase 0/Phase 1 boundary. The implementation itself is a 6-8 hour frontend task with no backend dependencies.

### Issue 3: Dashboard Quick-Pass Default Reason Code

**Disagreement:** The UX Lead identified that the dashboard's inline "Pass" action uses `rejection_reason='other'` as the default. The Business Analyst (EC-014) identified that this will fail backend validation because `other` requires a `rejection_note`. The Target Customer wants the undo toast approach rather than a reason code prompt.

**Impact:** If the quick-pass sends `rejection_reason='other'` without a note, it silently fails (400 error). The operator does not see a rejection happen. This is a functional bug, not a design disagreement.

**My position:** Change the default quick-pass reason to `missing_info` (does not require a note, and "missing info" is a reasonable default for dashboard-level triage). This is a 30-minute frontend fix. The undo toast is a separate, more complex feature (requires temporary state, timer, rollback API call) that should be Phase 1. Do not block the quick-pass fix on the undo toast design.

**What is needed:** PM confirmation that `missing_info` is an acceptable default for quick-pass rejections from the dashboard.

### Issue 4: Service Binding Auth Bypass Verification

**Disagreement:** None -- this is an unverified assumption, not a disagreement. The analyst worker at `worker.ts` line 2570 checks `Bearer ${env.ANALYST_SERVICE_SECRET}`. Service binding calls from dfg-api do not carry this header. The assumption is that service binding calls are detected and allowed through, but this has not been tested in production.

**Impact:** If service binding calls are rejected by the auth check, the analyze endpoint is broken in production via the primary code path (service binding). The URL fallback path (development) works because it sends the Bearer token explicitly.

**My position:** This needs a focused integration test before any other Phase 0 work. If the auth check is rejecting service binding calls, analysis is broken. The fix is to detect service binding calls (check for the `cf-worker` header or the absence of an `Origin` header) and bypass the Bearer token check for those requests.

**What is needed:** A test: trigger analysis via dfg-api's service binding to dfg-analyst in production (or staging) and verify the response is 200, not 401.

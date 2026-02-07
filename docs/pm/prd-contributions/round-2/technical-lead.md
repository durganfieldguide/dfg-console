# Technical Lead Contribution -- PRD Review Round 2

**Author:** Technical Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Revised after cross-role review
**Codebase Revision:** `a4979fe` (main)

---

## Changes from Round 1

1. **Added `status_change` to `tuning_events` CHECK constraint.** The Business Analyst (OQ-002) identified that auto-rejection code inserts `event_type = 'status_change'` into `tuning_events`, but the CHECK constraint only allows `rejection`, `win`, `loss`, `score_override`, `time_in_stage`. This will cause a silent D1 insert failure. Added a required migration (0008) to the data model section. *Triggered by: Business Analyst.*

2. **Added UNIQUE constraint on `opportunities(listing_id)` where not null.** Round 1 noted the ingest dedup risk (R7). The Business Analyst's EC-004 (batch reject with mixed states) and the Target Customer's emphasis on scout reliability reinforce that duplicate opportunities from the same listing are a data integrity hazard. Elevated from "future consideration" to "required migration" in Phase 0. *Triggered by: Business Analyst, Target Customer.*

3. **Added `snapshot_current_bid`, `snapshot_photo_count`, `snapshot_end_time` columns to analysis_runs DDL.** Round 1 omitted these from the CREATE TABLE (they existed in the prose schema but not the SQL). The Business Analyst's BR-010 and AC-003.7 (delta comparison) depend on having bid-at-analysis-time persisted. These columns are already present in the codebase via ad-hoc ALTER statements; formalizing them. *Triggered by: Business Analyst.*

4. **Elevated scout failure alerting from "out of scope" to "required NFR."** The Target Customer was unambiguous: "Fix the scout reliability and alerting. I need to know when it breaks. This is P0." The PM contribution also lists it as P1 remaining gap. The Competitor Analyst noted that GovDeals already provides SMS/WhatsApp notifications. Added a concrete NFR for scout health observability and an API endpoint for last-run status. *Triggered by: Target Customer, PM, Competitor Analyst.*

5. **Revised analysis latency NFR from < 45s to a two-tier target.** The PM defined p95 < 45 seconds for end-to-end (listing to scored opportunity). My Round 1 had < 30s for the API call itself. The Business Analyst's BR-011 references 45s. Clarified: the 45s target is pipeline end-to-end, the API `analyze` endpoint target is < 30s p95 (of which Claude API dominates). Both numbers are now explicit. *Triggered by: PM, Business Analyst.*

6. **Added `prompt()` replacement to technical risks.** The UX Lead (Concern 1) and Target Customer both flagged that browser `prompt()` for financial inputs (Set Bid, Won) is a risk to money math correctness (Principle #1). The Business Analyst's OQ-007 documented the data integrity angle. Added as R9 in technical risks with a recommendation to replace before private beta. Not an MVP blocker for founder use but tracked. *Triggered by: UX Lead, Target Customer, Business Analyst.*

7. **Clarified D1 binding name inconsistency between workers.** During codebase verification, confirmed that dfg-api uses binding name `DB` while dfg-scout uses `DFG_DB`, both pointing to the same D1 database (`dfg-scout-db` in production, `dfg-scout-db-preview` in dev). This is not a bug but is a documentation gap that could cause confusion during schema migrations. Added to the architecture section. *Triggered by: self (codebase verification).*

8. **Tightened state machine documentation to address Target Customer's workflow friction.** The Target Customer wants to jump from `inbox` directly to `bid` but the state machine does not allow it (inbox -> qualifying -> inspect -> bid is the minimum path). This is by design -- Product Principle #5 says "operator decides, system recommends" and the workflow exists to enforce disciplined evaluation (PM Principle #3: conservative over optimistic). Documented this as a deliberate constraint, not a gap, with the rationale. *Triggered by: Target Customer, PM.*

9. **Added ADR-006 for `outcomes` table ownership.** The `outcomes` table exists in dfg-scout's schema.sql (references `listings(id)`) but the PM and Business Analyst both reference it as a Phase 0/P1 feature for the API. There is a schema ownership conflict: the table lives in scout's migration set but should be API-owned since it relates to operator workflow. Added an ADR to resolve. *Triggered by: PM (ADR-003), Business Analyst (US-009, OQ-004).*

10. **Cross-referenced Competitor Analyst's scraping fragility risk with R6 (data freshness) and added R10 (platform access revocation).** The Competitor Analyst's "Uncomfortable Truth #2" -- that IronPlanet (owned by Ritchie Bros) could block scrapers -- is a platform risk distinct from the data freshness risk I had in R6. Added as a separate risk item. *Triggered by: Competitor Analyst.*

11. **Aligned CORS origin list with codebase.** Round 1 listed `app.durganfieldguide.com`, `durganfieldguide.com`, and `localhost:3000`. Verified against the actual http.ts middleware -- no change needed, but added `localhost:8787` (wrangler dev) to the documentation for completeness. *Triggered by: self (codebase verification).*

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
        | Cron:   |  |        |  | Claude API|
        | */15    |  +--------+  +-----+-----+
        | D1: "DFG_DB"               |
        +---+-----+             Anthropic API
            |
            v
       +----------+
       | R2 Bucket|
       | Evidence |
       +----------+
```

### Layer Architecture

The system is organized into four runtime boundaries, all within the Cloudflare ecosystem:

| Layer | Service | Responsibility | Runtime |
|-------|---------|----------------|---------|
| Presentation | dfg-app | Operator console, iOS Safari optimized | Next.js 14 on Vercel |
| API Gateway | dfg-api | Auth, CRUD, state machine, ingest orchestration | CF Worker + D1 (binding: `DB`) |
| Intelligence | dfg-analyst | AI-powered condition assessment + profit analysis | CF Worker + Claude API |
| Collection | dfg-scout | Auction scraping, normalization, category routing | CF Worker + D1 (binding: `DFG_DB`) + R2 + KV |

### Key Design Decisions (Already Made)

1. **Shared D1 database.** dfg-api and dfg-scout share the same D1 instance (`dfg-scout-db`). dfg-api reads from the `listings` table written by dfg-scout, and manages the `opportunities` table as the operator-facing entity. This avoids cross-worker data synchronization but couples schema evolution. Note: the D1 binding names differ between workers (`DB` in dfg-api, `DFG_DB` in dfg-scout) -- this is intentional but must be documented in migration runbooks to avoid confusion.

2. **Service bindings for worker-to-worker calls.** dfg-api calls dfg-analyst and dfg-scout via Cloudflare service bindings in production, with URL fallbacks for local development. This gives zero-latency RPC without network egress.

3. **Alerts are computed, not stored.** Alert state is derived at read time from opportunity fields (watch_fired_at, auction_ends_at, status_changed_at). Dismissals are stored as `operator_actions` rows with `action_type='alert_dismiss'`. This eliminates stale alert data at the cost of per-request computation.

4. **Analysis runs are immutable snapshots.** Each analysis execution creates a new `analysis_runs` row. The `opportunities.current_analysis_run_id` pointer enables history traversal and delta comparison without mutation. (Cross-ref: Business Analyst AC-003.7 for delta display requirements.)

5. **Optimistic concurrency on analysis.** The analyze endpoint uses `WHERE id = ? AND updated_at = ?` to detect concurrent modifications. On conflict, the orphaned analysis_runs record is cleaned up and a 409 is returned. (Cross-ref: Business Analyst EC-002.)

6. **Category-specific AI prompts.** The analyst worker dispatches to different prompt files and market data depending on category (trailers, vehicles, power tools). This is the correct approach for MVP since each asset class has fundamentally different valuation drivers. (Cross-ref: Business Analyst BR-043 through BR-046 for per-category thresholds.)

7. **State machine enforces disciplined evaluation.** The opportunity workflow requires progressive stage advancement (inbox -> qualifying -> inspect -> bid). Direct jumps from inbox to bid are intentionally disallowed. This enforces Product Principle #3 (conservative over optimistic) and prevents impulsive bidding. The Target Customer requested inbox-to-bid shortcuts; this is deferred to post-MVP evaluation with the PM because the current constraint protects against bad acquisitions, which is the system's primary value proposition.

### Design Decisions Needing Validation

1. **No request queuing for analyst calls.** The dfg-api worker calls dfg-analyst synchronously with a 25-second timeout. If Claude API is slow or the analyst is under load, operator-initiated analysis requests will fail. For MVP this is acceptable, but any scale beyond a single operator will need a queue (CF Queues or Durable Objects).

2. **D1 row-level locking via application-layer checks.** SQLite (D1) has no row-level locks. The system uses conditional UPDATEs and optimistic locking. This is fine for single-operator MVP but will produce conflicts under concurrent use.

3. **No WebSocket / real-time push.** The operator must poll or refresh to see updated prices, new opportunities, or fired watch alerts. The 5-minute cron for watch triggers means up to 5 minutes of latency for time-sensitive alerts. The UX Lead (Concern 3) and Target Customer both identify this as the largest UX gap. The Competitor Analyst notes Swoopa delivers sub-minute alerts via push notifications. For MVP this is accepted; Web Push API is the recommended Phase 1 solution (see PM ADR-002).

---

## Proposed Data Model

The schema below reflects what is currently deployed (migrations 0001 through 0007) plus two required Phase 0 migrations (0008 and 0009). This is the canonical reference for MVP.

### Migration Lineage

| Migration | Description | Owner |
|-----------|-------------|-------|
| 0001 | opportunities, operator_actions, tuning_events, sources + seeds | dfg-api |
| 0002 | Drop alert_dismissals (folded into operator_actions) | dfg-api |
| 0003 | analysis_runs + operator_inputs_json + current_analysis_run_id | dfg-api |
| 0004 | staleness columns (last_operator_review_at, exit_price) | dfg-api |
| 0005 | Standardize Sierra source ID | dfg-api |
| 0006 | mvc_events table | dfg-api |
| 0007 | ai_analysis_json on analysis_runs | dfg-api |
| **0008** | **Fix tuning_events CHECK constraint + add listing_id UNIQUE** | **dfg-api (REQUIRED)** |
| **0009** | **Formalize analysis_runs snapshot columns** | **dfg-api (REQUIRED)** |

### Core Tables

```sql
-- =============================================================================
-- sources: Auction platform definitions
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
-- sierra_auction: 15% premium, 5 pickup days (active)
-- ironplanet: 12% premium, 7 pickup days (active, ~17% capture rate)
-- govplanet: 10% premium, 10 pickup days (disabled)

-- =============================================================================
-- listings: Raw auction data from dfg-scout (written by scout, read by API)
-- =============================================================================
-- NOTE: This table is OWNED by dfg-scout. Schema lives in dfg-scout migrations.
-- dfg-api reads from it during ingest/sync operations.
-- Key columns referenced by API:
--   id, source, source_id, url, title, description, current_bid, category_id,
--   buy_box_score, status, end_time, location, image_url, photos

-- =============================================================================
-- opportunities: Operator-facing entity for acquisition workflow
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
  score_breakdown         TEXT,                     -- JSON
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
  final_price             REAL,
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
-- =============================================================================
-- MIGRATION 0008: Added 'status_change' to CHECK constraint to support
-- auto-rejection events. See Business Analyst OQ-002.
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
-- =============================================================================
-- NOTE: This table is OWNED by dfg-scout. The canonical DDL is in
-- dfg-scout/migrations/007-category-config.sql. The expanded version below
-- (with prompt_file, condition_schema, etc.) is the target schema for
-- full category configurability.
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
-- DFG API Migration 0008: Fix tuning_events CHECK + listing_id uniqueness
-- =============================================================================
-- Fixes:
-- 1. tuning_events CHECK constraint missing 'status_change' (OQ-002)
-- 2. opportunities.listing_id should be unique where not null (R7)
--
-- NOTE: D1/SQLite does not support ALTER TABLE ... DROP CONSTRAINT.
-- The tuning_events fix requires table rebuild.
-- =============================================================================

-- Fix 1: Rebuild tuning_events with corrected CHECK constraint
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

-- Fix 2: Unique index on listing_id (prevents duplicate ingest)
CREATE UNIQUE INDEX idx_opportunities_listing_id_unique
  ON opportunities(listing_id) WHERE listing_id IS NOT NULL;
```

### Required Migration: 0009

```sql
-- =============================================================================
-- DFG API Migration 0009: Formalize analysis_runs snapshot columns
-- =============================================================================
-- These columns may already exist in production via ad-hoc ALTER statements.
-- This migration documents them and ensures they exist on fresh databases.
-- =============================================================================

-- snapshot_current_bid: bid amount at time of analysis (for delta comparison)
-- SQLite silently ignores ALTER TABLE ADD COLUMN if column already exists in
-- some builds; we wrap in a try-catch at the application layer if needed.
ALTER TABLE analysis_runs ADD COLUMN snapshot_current_bid REAL;
ALTER TABLE analysis_runs ADD COLUMN snapshot_photo_count INTEGER;
ALTER TABLE analysis_runs ADD COLUMN snapshot_end_time TEXT;
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

Valid transitions (from `STATE_TRANSITIONS` in `@dfg/types`):

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

**Design note on workflow friction (cross-ref: Target Customer):** The operator has requested the ability to jump from `inbox` directly to `bid`. This is intentionally disallowed. The progressive evaluation stages exist to enforce disciplined decision-making (PM Principle #3: conservative over optimistic). The fastest legitimate path to bid is: inbox -> qualifying -> inspect -> bid (3 transitions). Each transition creates an audit record and captures context that feeds algorithm tuning. Relaxing this constraint should only be considered if post-MVP data shows the intermediate stages add no tuning value.

---

## API Surface

All endpoints are served by dfg-api on Cloudflare Workers. Auth is via `Authorization: Bearer <OPS_TOKEN>` header. CORS is restricted to `app.durganfieldguide.com`, `durganfieldguide.com`, `localhost:3000`, and `localhost:8787`.

### Public Endpoints

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/health` | `{ status: "ok", service: "dfg-api", env: string }` | No auth required |

### Opportunities

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/opportunities` | Query: `status`, `category_id`, `ending_within`, `score_band`, `needs_attention`, `stale_qualifying`, `attention`, `stale`, `analysis_stale`, `decision_stale`, `ending_soon`, `strike_zone`, `verification_needed`, `new_today`, `limit` (max 100), `offset`, `sort`, `order` | `{ data: { opportunities: [...], total }, meta: { limit, offset } }` | Comma-separated status values supported. Cross-ref: Business Analyst US-001. |
| GET | `/api/opportunities/:id` | -- | `{ data: { ...opportunity, source_defaults, actions, alerts, operatorInputs, currentAnalysisRun, gates, inputsChangedSinceAnalysis } }` | Full detail view with computed gates and alerts. Cross-ref: Business Analyst US-002. |
| PATCH | `/api/opportunities/:id` | `{ status?, rejection_reason?, rejection_note?, watch_trigger?, watch_threshold?, max_bid_locked?, bid_strategy?, final_price?, observed_facts?, outcome_notes? }` | Updated opportunity (same shape as GET :id) | State machine enforced; validation per target status. Cross-ref: Business Analyst US-004, US-005, US-006, US-009. |
| POST | `/api/opportunities/:id/actions` | `{ action_type, payload }` | `{ data: { id, action_type, created_at } }` | Audit log entry |
| PATCH | `/api/opportunities/:id/inputs` | `{ title?: TitleInputsV1, overrides?: OperatorOverrides }` | `{ success, operatorInputs, inputsChangedSinceAnalysis, autoRejected, hardGateFailures? }` | Deep-merges with existing; triggers auto-reject on hard gate failures. Cross-ref: Business Analyst US-008, BR-026 through BR-029. |
| POST | `/api/opportunities/:id/analyze` | `{ assumptions?, skipAiAnalysis? }` | `{ analysisRun: { id, recommendation, derived, gates, aiAnalysis }, delta? }` | Calls dfg-analyst via service binding; 25s timeout; optimistic lock (409 on conflict). Cross-ref: Business Analyst US-003, BR-007 through BR-011. |
| POST | `/api/opportunities/:id/touch` | -- | 204 (dedupe) or 200 (recorded) | 60-second dedupe window |
| POST | `/api/opportunities/batch` | `{ opportunity_ids: string[], action: "reject"\|"archive", rejection_reason?, rejection_note? }` | `{ data: { processed, failed, results } }` | Max 50 per batch. Cross-ref: Business Analyst US-007, BR-022 through BR-025. |
| GET | `/api/opportunities/stats` | -- | `{ data: { by_status, strike_zone, verification_needed, ending_soon, new_today, stale_qualifying, watch_alerts_fired, needs_attention } }` | Dashboard summary counts. Cross-ref: Business Analyst US-012. |

### Alerts

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/opportunities/:id/alerts/dismiss` | `{ alert_key }` | `{ data: { success, dismissed } }` | Legacy endpoint |
| POST | `/api/alerts/dismiss` | `{ opportunity_id, alert_key }` | `{ data: { success, dismissed } }` | Spec-compliant |
| POST | `/api/alerts/dismiss/batch` | `{ dismissals: [{ opportunity_id, alert_key }] }` | `{ data: { processed, failed, results } }` | Max 50 |

### Dashboard

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/api/dashboard/attention` | `{ items: [...], total_count }` | Priority-sorted attention queue with reason tags. Cross-ref: UX Lead Pattern 6. |

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
| POST | `/api/ingest` | `{ listings: IngestListing[], source? }` | `{ data: { created, updated, skipped, errors } }` | Max 100 per batch. After migration 0008, duplicate listing_id inserts will be rejected by the UNIQUE constraint instead of creating duplicates. |
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

### dfg-analyst Endpoints (Internal, service-binding only)

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| GET | `/health` | -- | `{ status: "ok" }` | None |
| POST | `/analyze` | `ListingData` (see analyst types) | `DualLensReport` | Bearer ANALYST_SERVICE_SECRET |

### dfg-scout Endpoints (Internal, service-binding only)

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
| End-to-end analysis pipeline | < 45s p95 | From listing ingestion to scored opportunity. Cross-ref: PM success metric, Business Analyst BR-011. |
| Ingest batch (50 listings) | < 5s p95 | Sequential D1 inserts; consider D1 batch API for improvement |
| Scout scrape cycle | < 60s p95 | Currently runs every 15 minutes via cron |
| Frontend LCP (iOS Safari) | < 2.5s | Next.js SSR + API fetch; critical for operator UX. Cross-ref: UX Lead, Target Customer. |
| Frontend INP (iOS Safari) | < 200ms | Touch interactions must feel instant. Cross-ref: Target Customer ("when I tap an opportunity, I want to see the Next Action Card within 1 second"). |

### Reliability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API availability | 99.5% monthly | Cloudflare Workers SLA; single region |
| Scout cron success rate | > 95% | External auction sites may be flaky. Cross-ref: PM success metric, Business Analyst BR-034. |
| Analysis success rate | > 90% | Claude API may timeout or rate-limit |
| Data loss tolerance | Zero for opportunities, operator_actions, mvc_events | D1 provides durable storage; R2 snapshots are immutable |

### Observability Requirements (NEW -- Cross-ref: Target Customer, PM)

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Scout last-run timestamp on stats endpoint | `GET /api/opportunities/stats` returns `last_scout_run` (currently null/TODO) | **Must implement in Phase 0** |
| Scout failure detection | `scout_runs` table records success/failure per run; stats endpoint aggregates | Partially implemented (table exists in scout, stats endpoint does not query it) |
| Stale pipeline indicator | Dashboard shows warning if `last_scout_run > 30 minutes ago` | **Must implement in Phase 0** |

The Target Customer said: "If the scout goes down Friday night, I don't find out until Monday when I notice the inbox is suspiciously empty." The PM lists scout failure alerting as a P1 gap but acknowledges it should be P0 priority. For MVP, the minimum viable implementation is: (a) populate `last_scout_run` on the stats endpoint, and (b) display a visual warning on the dashboard when the last successful run is older than 30 minutes. Push notifications (SMS/email) for scout failures are Phase 1.

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
| No wildcard CORS | Origin allowlist in `http.ts` | Implemented |
| No exposed debug endpoints | 404 for unmatched routes; no `/debug/*` in production | Implemented |
| SQL injection prevention | All queries use `.bind()` parameterization | Implemented |
| Auth on all API endpoints | Bearer token check before route dispatch | Implemented |
| Auth on analyst endpoints | ANALYST_SERVICE_SECRET required for non-service-binding calls | **P0 -- verify implementation** (cross-ref: PM issue #123) |
| R2 snapshot immutability | New key per snapshot; no overwrites | Implemented |
| Secrets not in source control | Wrangler secrets for OPS_TOKEN, ANTHROPIC_API_KEY, etc. | Implemented |
| Input validation at boundaries | JSON parse with null fallback; field-level validation | Partial -- some endpoints do not validate payload shapes |

---

## Technical Risks

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R1 | **D1 concurrent write conflicts** -- Two requests updating the same opportunity simultaneously could cause lost updates. The optimistic lock on `analyze` handles that path, but `PATCH /api/opportunities/:id` does not use optimistic locking. | High | Low (single operator for MVP) | Accept for MVP. Add `updated_at` optimistic lock to PATCH endpoint before adding more operators. |
| R2 | **Analyst timeout under Claude API load** -- The 25-second timeout is generous but Claude API cold starts or rate limits could cause failures during peak auction periods. | Medium | Medium | Current fallback: analysis proceeds without AI result (gate-only mode). Cross-ref: Business Analyst AC-003.6. Add retry with exponential backoff in Phase 1. |
| R3 | **Shared D1 schema coupling** -- dfg-scout and dfg-api share the same D1 database with different binding names (`DFG_DB` vs `DB`). A schema change in one worker can break the other. There is no migration coordination mechanism. | High | Medium | Migrations live in dfg-api only for API-owned tables, dfg-scout for scout-owned tables. Document schema ownership per table. Add schema version check at startup. |
| R4 | **Thread-local CORS pattern** -- `setCurrentRequest()` stores request in module-level variable. If CF Workers ever process concurrent requests in the same isolate, CORS headers could leak between requests. | Medium | Low (CF Workers use one-request-per-isolate) | Document the assumption. If CF changes isolate model, switch to request-scoped context passing. |
| R5 | **No rate limiting on public-facing API** -- Any client with the OPS_TOKEN can send unlimited requests. A compromised token or runaway client could exhaust D1 read/write quotas. Cross-ref: Target Customer concern about API bill from compromised analyst endpoint. | Medium | Low | Add per-IP rate limiting via CF WAF rules in Phase 1. Consider rotating OPS_TOKEN to a short-lived JWT. |
| R6 | **Auction data freshness** -- Scout runs every 15 minutes. Opportunities show denormalized listing data that can be up to 15 minutes stale for bid prices and lot status. Cross-ref: Competitor Analyst -- Swoopa delivers sub-minute alerts. | Medium | High | Acceptable for MVP. Add on-demand refresh button that calls scout for a single listing. Display "last updated" timestamp prominently. |
| R7 | **Ingest idempotency** -- If the ingest endpoint is called twice with the same listings, it could create duplicate opportunities. | Medium | Low | **Mitigated in Phase 0 by migration 0008:** UNIQUE constraint on `opportunities(listing_id) WHERE listing_id IS NOT NULL`. |
| R8 | **Watch trigger latency** -- Watch triggers are checked via cron every 5 minutes. An operator setting "alert me 4 hours before auction end" could receive the alert up to 5 minutes late. | Low | High | Acceptable for MVP. The 4-hour default threshold provides sufficient buffer. For sub-minute precision, use Durable Objects alarms. |
| R9 | **Browser `prompt()` for financial inputs** -- Set Bid and Won flows use `window.prompt()` to capture dollar amounts. No input validation, no currency formatting, no confirmation step. For a system where money math correctness is Principle #1, this is a data integrity risk. Cross-ref: UX Lead Concern 1, Business Analyst OQ-007. | Medium | Medium | Accept for MVP (founder-only use). Replace with custom modal before Phase 1 private beta. The modal must validate numeric input, strip currency formatting, enforce positive values, and include a confirmation step. |
| R10 | **Platform access revocation** -- IronPlanet is owned by Ritchie Bros (RB Global). They could restrict scraping access at any time, eliminating DFG's second data source. GovDeals has also invested in buyer engagement tools, reducing incentive to allow third-party scrapers. Cross-ref: Competitor Analyst "Uncomfortable Truths" #2. | High | Medium | Adapter architecture already isolates platform-specific logic. Rate limiting and polite headers are implemented. Investigate official API access for high-value platforms. Diversify sources (GovPlanet adapter is seeded and ready for Phase 1). |
| R11 | **tuning_events CHECK constraint failure (CRITICAL)** -- Auto-rejection code inserts `event_type = 'status_change'` but the CHECK constraint does not allow this value. This causes silent data loss for auto-rejection tuning signals. Cross-ref: Business Analyst OQ-002. | High | High (occurs on every auto-rejection) | **Fix in migration 0008 (Phase 0).** This is a bug, not a design decision. |

---

## Open Decisions / ADRs

### ADR-001: Event Sourcing Scope

**Status:** Decided (Hybrid)

**Context:** The `mvc_events` table captures decision_made, bid_submitted, bid_result, and sale_result events with idempotency. However, the rest of the system uses direct state mutation (PATCH on opportunities). There is a hybrid model where some state changes produce events and others do not.

**Decision:** Option A -- keep hybrid. Financial events (decisions, bids, outcomes) need an immutable audit trail. Workflow state changes (inbox to qualifying) are adequately tracked by `operator_actions`. Converging these would add complexity without clear MVP benefit.

**Cross-ref:** Target Customer does not look at Decision History for MVP decisions. Business Analyst US-004 (AC-004.5, AC-004.6) requires both operator_actions and mvc_events for bid/reject transitions specifically.

### ADR-002: Analyst Worker Authentication

**Status:** Decided (Separate auth, Option A)

**Context:** dfg-analyst requires `ANALYST_SERVICE_SECRET` as Bearer token. When called via service binding from dfg-api, the token is not passed (service bindings are trusted). When called via URL fallback (development), the token must be sent.

**Decision:** Option A -- keep separate auth. Service bindings are inherently trusted (same account, same zone). The ANALYST_SERVICE_SECRET protects the URL-based development path.

**Cross-ref:** PM lists "Auth on analyst endpoints" as P0 issue #123. Target Customer flags API bill exposure from compromised endpoints. Verify the implementation is complete and the analyst does not have any unauthenticated routes beyond `/health`.

### ADR-003: Outcomes / P&L Tracking Table

**Status:** Decided (Defer structured table, use final_price for MVP)

**Context:** The `outcomes` table exists in dfg-scout's `schema.sql` (references `listings(id)`) but has no API endpoints or UI. The PM and Business Analyst both want simple outcome tracking in MVP.

**Decision:** Option A -- use `final_price` + `outcome_notes` on opportunities for MVP. The `sale_result` event payload in mvc_events captures financial data when it happens. A dedicated outcomes table with full P&L (purchase_price, repair costs, sold_price, fees, net_profit, days_held) is Phase 1.

**Cross-ref:** Business Analyst OQ-004 notes that `final_price` alone is insufficient to validate the "realized margin >= 25%" success metric (you also need sold_price). PM ADR-003 aligns. The minimum viable addition for Phase 0 is: when recording a `won` outcome, persist `final_price`; when the operator later records a sale, use an mvc_event `sale_result` with `sold_price` in the payload. Full P&L entry is Phase 1.

### ADR-004: Category System Extensibility

**Status:** Decided (D1-driven categories with code-side prompts)

**Context:** Categories are stored in `category_defs` with configurable thresholds, but the analyst worker still has hardcoded category-specific prompt files and analysis functions.

**Decision:** D1-driven `category_defs` provides runtime configuration (thresholds, evidence requirements). Prompt files remain in code because they contain nuanced domain knowledge. Adding a new category requires: (1) insert row in category_defs, (2) add prompt file and analysis file to analyst worker, (3) deploy. Acceptable for the expected rate of new categories (quarterly at most).

**Cross-ref:** Business Analyst BR-043 through BR-046 document per-category thresholds. These values live in `category_defs` rows and in `category-config.ts`.

### ADR-005: Photo Storage Strategy

**Status:** Decided (R2 for evidence, URL references for display)

**Context:** Photos are stored as URL arrays in `opportunities.photos` (JSON) and `listings.photos` (JSON). The R2 bucket (`dfg-evidence`) stores snapshots for evidence immutability.

**Decision:** External URLs for display (fast, no storage cost), R2 for evidence snapshots (immutable, survives auction site changes).

**Risk:** Auction site URLs become invalid after auction closes. Mitigation: R2 snapshots preserve the visual record.

**Cross-ref:** Target Customer wants swipe-through photo viewing. UX Lead documents the current lightbox as tap-to-view-each (no swipe gesture). This is a UX improvement, not a storage architecture change.

### ADR-006: Outcomes Table Schema Ownership (NEW)

**Status:** Needs Decision

**Context:** The `outcomes` table DDL exists in `workers/dfg-scout/migrations/schema.sql` with `FOREIGN KEY(listing_id) REFERENCES listings(id)`. However, outcome tracking is an operator workflow concern, not a scout concern. The PM and Business Analyst reference it as an API-side feature. The table currently references `listings(id)` but the operator workflow uses `opportunities(id)`.

**Options:**
- (A) Move outcomes table ownership to dfg-api. Create it in a dfg-api migration. Use `opportunity_id` as the foreign key instead of `listing_id`. Aligns with the operator workflow data model.
- (B) Keep outcomes in dfg-scout's schema. API reads from it via shared D1. Misaligned ownership but avoids migration.
- (C) Defer entirely to Phase 1. Use mvc_events `sale_result` payload as the interim P&L record.

**Recommendation:** Option C for immediate MVP. When Phase 1 adds the outcomes UI, use Option A (dfg-api owned, keyed on opportunity_id).

### ADR-007: Verdict Threshold Logic (NEW)

**Status:** Needs Decision

**Context:** Business Analyst OQ-001 identified that `applyVerdictThresholds` uses OR logic for BUY thresholds: meeting EITHER min_profit OR min_margin triggers a BUY recommendation. This means a deal with $600 profit but only 5% margin would be recommended as BUY for trailers, which contradicts the conservative modeling principle.

**Options:**
- (A) AND logic for BUY (must meet BOTH min_profit AND min_margin). OR logic for WATCH (meet either).
- (B) Keep OR logic (current behavior). The operator is the final decision maker.
- (C) Weighted scoring -- both contribute to a confidence score rather than binary threshold.

**Recommendation:** Option A. The canonical money math defines margin as the primary guard against bad acquisitions. A 5% margin deal is not conservative even if absolute profit meets the threshold. This change should be validated with the PM and a backtest against historical rejections.

---

## Appendix: Money Math Validation Checklist

Any new feature that touches pricing must validate against these canonical formulas:

```
Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
Net Proceeds     = Sale Price - Listing Fees - Payment Processing
Profit           = Net Proceeds - Acquisition Cost
Margin %         = (Profit / Acquisition Cost) * 100
```

**Critical invariant:** Listing fees are SELLING COSTS ONLY. They must never appear in acquisition cost. Double-counting listing fees is the most common money math bug.

The analyst worker implements these in `calculation-spine.ts`. The API worker references `max_bid_low` / `max_bid_high` from analysis runs. Any new endpoint or view that displays profit/margin must use these exact definitions.

**Cross-ref:** Business Analyst BR-008, BR-009, BR-010, BR-029, BR-032.

---

## Appendix: Schema Ownership Matrix

| Table | Owner | Migrations In | Notes |
|-------|-------|--------------|-------|
| sources | dfg-api | dfg-api/0001 | Seeded with 3 sources |
| opportunities | dfg-api | dfg-api/0001, 0003, 0004, 0008 | Core operator entity |
| analysis_runs | dfg-api | dfg-api/0003, 0007, 0009 | Immutable snapshots |
| operator_actions | dfg-api | dfg-api/0001 | Audit log |
| mvc_events | dfg-api | dfg-api/0006 | Immutable event log |
| tuning_events | dfg-api | dfg-api/0001, 0008 | Algorithm tuning signals |
| category_defs | dfg-scout | dfg-scout/007 | Shared config, read by both |
| listings | dfg-scout | dfg-scout/001, 004, 008 | Raw auction data |
| scout_runs | dfg-scout | dfg-scout/schema | Pipeline health tracking |
| failed_operations | dfg-scout | dfg-scout/schema | Retry queue |
| outcomes | dfg-scout (to be moved) | dfg-scout/schema | See ADR-006 |
| price_guides | dfg-scout | dfg-scout/schema | Reference data |

---

## Appendix: Cross-Role Dependency Map

This section maps where technical decisions directly depend on or constrain other roles' contributions.

| Technical Decision | Affects Role | How |
|-------------------|-------------|-----|
| State machine transitions (no inbox-to-bid) | Target Customer, UX Lead | Constrains action bar buttons per status. Operator must advance through stages. |
| 25s analyst timeout with gate fallback | Business Analyst | AC-003.6 must handle null AI analysis gracefully. UX must degrade. |
| Computed alerts (not stored) | UX Lead | Every detail page load recomputes alerts. No push mechanism possible without cron or WebSocket. |
| D1 CHECK constraints | Business Analyst | OQ-002 (tuning_events) is a hard bug. Any new event_type requires a migration. |
| No WebSocket support | UX Lead, Target Customer, Competitor Analyst | Alerts only visible when console is open. 5-minute cron latency for watch triggers. |
| UNIQUE listing_id constraint (0008) | Business Analyst | Ingest behavior changes: duplicate listing_id now returns a DB error instead of silently creating duplicates. Ingest endpoint must handle this gracefully. |
| `prompt()` for financial inputs | UX Lead, Target Customer | Money math correctness risk. Must be replaced before private beta. |

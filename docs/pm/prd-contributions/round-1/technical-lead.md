# Technical Lead Contribution -- PRD Review Round 1

**Author:** Technical Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Codebase Revision:** `a4979fe` (main)

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
                    |  Vercel/CF     |
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
        +---+-----+                    |
            |                     Anthropic API
            v
       +----------+
       | R2 Bucket|
       | Evidence |
       +----------+
```

### Layer Architecture

The system is organized into four runtime boundaries, all within the Cloudflare ecosystem:

| Layer        | Service     | Responsibility                                    | Runtime                |
| ------------ | ----------- | ------------------------------------------------- | ---------------------- |
| Presentation | dfg-app     | Operator console, iOS Safari optimized            | Next.js 14 on Vercel   |
| API Gateway  | dfg-api     | Auth, CRUD, state machine, ingest orchestration   | CF Worker + D1         |
| Intelligence | dfg-analyst | AI-powered condition assessment + profit analysis | CF Worker + Claude API |
| Collection   | dfg-scout   | Auction scraping, normalization, category routing | CF Worker + D1 + R2    |

### Key Design Decisions (Already Made)

1. **Shared D1 database.** dfg-api and dfg-scout share the same D1 instance (`dfg-scout-db`). dfg-api reads from the `listings` table written by dfg-scout, and manages the `opportunities` table as the operator-facing entity. This avoids cross-worker data synchronization but couples schema evolution.

2. **Service bindings for worker-to-worker calls.** dfg-api calls dfg-analyst and dfg-scout via Cloudflare service bindings in production, with URL fallbacks for local development. This gives zero-latency RPC without network egress.

3. **Alerts are computed, not stored.** Alert state is derived at read time from opportunity fields (watch_fired_at, auction_ends_at, status_changed_at). Dismissals are stored as `operator_actions` rows with `action_type='alert_dismiss'`. This eliminates stale alert data at the cost of per-request computation.

4. **Analysis runs are immutable snapshots.** Each analysis execution creates a new `analysis_runs` row. The `opportunities.current_analysis_run_id` pointer enables history traversal and delta comparison without mutation.

5. **Optimistic concurrency on analysis.** The analyze endpoint uses `WHERE id = ? AND updated_at = ?` to detect concurrent modifications. On conflict, the orphaned analysis_runs record is cleaned up and a 409 is returned.

6. **Category-specific AI prompts.** The analyst worker dispatches to different prompt files and market data depending on category (trailers, vehicles, power tools). This is the correct approach for MVP since each asset class has fundamentally different valuation drivers.

### Design Decisions Needing Validation

1. **No request queuing for analyst calls.** The dfg-api worker calls dfg-analyst synchronously with a 25-second timeout. If Claude API is slow or the analyst is under load, operator-initiated analysis requests will fail. For MVP this is acceptable, but any scale beyond a single operator will need a queue (CF Queues or Durable Objects).

2. **D1 row-level locking via application-layer checks.** SQLite (D1) has no row-level locks. The system uses conditional UPDATEs and optimistic locking. This is fine for single-operator MVP but will produce conflicts under concurrent use.

3. **No WebSocket / real-time push.** The operator must poll or refresh to see updated prices, new opportunities, or fired watch alerts. The 5-minute cron for watch triggers means up to 5 minutes of latency for time-sensitive alerts.

---

## Proposed Data Model

The schema below reflects what is currently deployed (migrations 0001 through 0007) with annotations on constraints and relationships. This is the canonical reference for MVP.

### Core Tables

```sql
-- =============================================================================
-- sources: Auction platform definitions
-- =============================================================================
CREATE TABLE sources (
  id                      TEXT PRIMARY KEY,       -- e.g., 'sierra', 'ironplanet'
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

-- =============================================================================
-- listings: Raw auction data from dfg-scout (written by scout, read by API)
-- =============================================================================
-- NOTE: This table is owned by dfg-scout. Schema changes require coordinating
-- both workers. The dfg-api reads from it during ingest/sync operations.
-- Full schema is in dfg-scout's migrations; key columns referenced by API:
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
  operator_inputs_json    TEXT,                     -- JSON: OperatorInputs
  current_analysis_run_id TEXT REFERENCES analysis_runs(id),

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
  exit_price              REAL,
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
  last_operator_review_at TEXT,

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

  -- AI analysis result (from dfg-analyst)
  ai_analysis_json        TEXT,                     -- JSON: DualLensReport subset
  snapshot_current_bid    REAL,
  snapshot_photo_count    INTEGER,
  snapshot_end_time       TEXT,

  -- Versioning
  calc_version            TEXT,
  gates_version           TEXT
);

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

-- Unique constraint for idempotency
CREATE UNIQUE INDEX idx_mvc_events_idempotency
  ON mvc_events(opportunity_id, sequence_number);

-- =============================================================================
-- tuning_events: Signals for algorithm improvement
-- =============================================================================
CREATE TABLE tuning_events (
  id                      TEXT PRIMARY KEY,
  event_type              TEXT NOT NULL
                          CHECK (event_type IN (
                            'rejection','win','loss',
                            'score_override','time_in_stage'
                          )),
  opportunity_id          TEXT REFERENCES opportunities(id),
  source                  TEXT,
  category_id             TEXT,
  signal_data             TEXT NOT NULL,            -- JSON
  created_at              TEXT NOT NULL
);

-- =============================================================================
-- category_defs: Category configuration (D1-driven, no code changes needed)
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

### State Machine

```
inbox ──> qualifying ──> watch ──> inspect ──> bid ──> won
  |           |            |          |         |       |
  |           |            |          |         +-> lost |
  |           |            |          |                  |
  +-----+-----+-----+------+-----+---+---------+--------+
        |                        |              |
        v                        v              v
     rejected ────────────> archived <──────────+
```

Valid transitions (from `STATE_TRANSITIONS` in `@dfg/types`):

| From       | Allowed To                              |
| ---------- | --------------------------------------- |
| inbox      | qualifying, watch, rejected, archived   |
| qualifying | watch, inspect, rejected, archived      |
| watch      | qualifying, inspect, rejected, archived |
| inspect    | bid, rejected, archived                 |
| bid        | won, lost, rejected, archived           |
| won        | archived                                |
| lost       | archived                                |
| rejected   | archived                                |
| archived   | (terminal)                              |

---

## API Surface

All endpoints are served by dfg-api on Cloudflare Workers. Auth is via `Authorization: Bearer <OPS_TOKEN>` header. CORS is restricted to `app.durganfieldguide.com`, `durganfieldguide.com`, and `localhost:3000`.

### Public Endpoints

| Method | Path      | Response                                            | Notes            |
| ------ | --------- | --------------------------------------------------- | ---------------- |
| GET    | `/health` | `{ status: "ok", service: "dfg-api", env: string }` | No auth required |

### Opportunities

| Method | Path                             | Request                                                                                                                                                                                                                                                                        | Response                                                                                                                                   | Notes                                                                                 |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------- |
| GET    | `/api/opportunities`             | Query: `status`, `category_id`, `ending_within`, `score_band`, `needs_attention`, `stale_qualifying`, `attention`, `stale`, `analysis_stale`, `decision_stale`, `ending_soon`, `strike_zone`, `verification_needed`, `new_today`, `limit` (max 100), `offset`, `sort`, `order` | `{ data: { opportunities: [...], total }, meta: { limit, offset } }`                                                                       | Comma-separated status values supported                                               |
| GET    | `/api/opportunities/:id`         | --                                                                                                                                                                                                                                                                             | `{ data: { ...opportunity, source_defaults, actions, alerts, operatorInputs, currentAnalysisRun, gates, inputsChangedSinceAnalysis } }`    | Full detail view with computed gates and alerts                                       |
| PATCH  | `/api/opportunities/:id`         | `{ status?, rejection_reason?, rejection_note?, watch_trigger?, watch_threshold?, max_bid_locked?, bid_strategy?, final_price?, observed_facts?, outcome_notes? }`                                                                                                             | Updated opportunity (same shape as GET :id)                                                                                                | State machine enforced; validation per target status                                  |
| POST   | `/api/opportunities/:id/actions` | `{ action_type, payload }`                                                                                                                                                                                                                                                     | `{ data: { id, action_type, created_at } }`                                                                                                | Audit log entry                                                                       |
| PATCH  | `/api/opportunities/:id/inputs`  | `{ title?: TitleInputsV1, overrides?: OperatorOverrides }`                                                                                                                                                                                                                     | `{ success, operatorInputs, inputsChangedSinceAnalysis, autoRejected, hardGateFailures? }`                                                 | Deep-merges with existing; triggers auto-reject on hard gate failures                 |
| POST   | `/api/opportunities/:id/analyze` | `{ assumptions?, skipAiAnalysis? }`                                                                                                                                                                                                                                            | `{ analysisRun: { id, recommendation, derived, gates, aiAnalysis }, delta? }`                                                              | Calls dfg-analyst via service binding; 25s timeout; optimistic lock (409 on conflict) |
| POST   | `/api/opportunities/:id/touch`   | --                                                                                                                                                                                                                                                                             | 204 (dedupe) or 200 (recorded)                                                                                                             | 60-second dedupe window                                                               |
| POST   | `/api/opportunities/batch`       | `{ opportunity_ids: string[], action: "reject"                                                                                                                                                                                                                                 | "archive", rejection_reason?, rejection_note? }`                                                                                           | `{ data: { processed, failed, results } }`                                            | Max 50 per batch |
| GET    | `/api/opportunities/stats`       | --                                                                                                                                                                                                                                                                             | `{ data: { by_status, strike_zone, verification_needed, ending_soon, new_today, stale_qualifying, watch_alerts_fired, needs_attention } }` | Dashboard summary counts                                                              |

### Alerts

| Method | Path                                    | Request                                           | Response                                   | Notes           |
| ------ | --------------------------------------- | ------------------------------------------------- | ------------------------------------------ | --------------- |
| POST   | `/api/opportunities/:id/alerts/dismiss` | `{ alert_key }`                                   | `{ data: { success, dismissed } }`         | Legacy endpoint |
| POST   | `/api/alerts/dismiss`                   | `{ opportunity_id, alert_key }`                   | `{ data: { success, dismissed } }`         | Spec-compliant  |
| POST   | `/api/alerts/dismiss/batch`             | `{ dismissals: [{ opportunity_id, alert_key }] }` | `{ data: { processed, failed, results } }` | Max 50          |

### Dashboard

| Method | Path                       | Response                        | Notes                                            |
| ------ | -------------------------- | ------------------------------- | ------------------------------------------------ |
| GET    | `/api/dashboard/attention` | `{ items: [...], total_count }` | Priority-sorted attention queue with reason tags |

### Sources

| Method | Path               | Request                                                                         | Response                       |
| ------ | ------------------ | ------------------------------------------------------------------------------- | ------------------------------ |
| GET    | `/api/sources`     | --                                                                              | `{ data: { sources: [...] } }` |
| GET    | `/api/sources/:id` | --                                                                              | `{ data: { ...source } }`      |
| PATCH  | `/api/sources/:id` | `{ enabled?, display_name?, default_buyer_premium_pct?, default_pickup_days? }` | Updated source                 |

### Categories

| Method | Path                  | Response                        |
| ------ | --------------------- | ------------------------------- |
| GET    | `/api/categories`     | `{ data: [...category_defs] }`  |
| GET    | `/api/categories/:id` | `{ data: { ...category_def } }` |

### Ingest

| Method | Path                      | Request                                  | Response                                                         | Notes                                       |
| ------ | ------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| POST   | `/api/ingest`             | `{ listings: IngestListing[], source? }` | `{ data: { created, updated, skipped, errors } }`                | Max 100 per batch                           |
| POST   | `/api/ingest/sync`        | --                                       | `{ data: { created, updated, skipped, errors, photos_synced } }` | Pulls candidates from listings table        |
| POST   | `/api/ingest/sync-photos` | --                                       | `{ data: { updated, skipped, errors } }`                         | Syncs photos from listings to opportunities |

### Events (MVC Audit)

| Method | Path                           | Request                                                | Response                                  | Notes                          |
| ------ | ------------------------------ | ------------------------------------------------------ | ----------------------------------------- | ------------------------------ |
| POST   | `/api/events`                  | `{ opportunity_id, event_type, payload, emitted_at? }` | `{ data: { id, ..., idempotent: bool } }` | Idempotent via sequence number |
| GET    | `/api/events?opportunity_id=X` | --                                                     | `{ data: { events: [...] } }`             | Ordered by sequence_number ASC |

### Triggers

| Method | Path                  | Response                                  |
| ------ | --------------------- | ----------------------------------------- |
| POST   | `/api/triggers/check` | `{ data: { checked, fired, timestamp } }` |

### Scout Operations

| Method | Path             | Request                | Response                                                   |
| ------ | ---------------- | ---------------------- | ---------------------------------------------------------- |
| POST   | `/api/scout/run` | `{ source?, dryRun? }` | `{ data: { triggered, method, source, dryRun, result? } }` |

### dfg-analyst Endpoints (Internal, service-binding only)

| Method | Path       | Request                           | Response           | Auth                          |
| ------ | ---------- | --------------------------------- | ------------------ | ----------------------------- |
| GET    | `/health`  | --                                | `{ status: "ok" }` | None                          |
| POST   | `/analyze` | `ListingData` (see analyst types) | `DualLensReport`   | Bearer ANALYST_SERVICE_SECRET |

### dfg-scout Endpoints (Internal, service-binding only)

| Method | Path                    | Auth      |
| ------ | ----------------------- | --------- |
| GET    | `/health`               | None      |
| GET    | `/ops/run`              | OPS_TOKEN |
| GET    | `/ops/stats`            | OPS_TOKEN |
| GET    | `/ops/listings`         | OPS_TOKEN |
| GET    | `/ops/listings/:id`     | OPS_TOKEN |
| GET    | `/ops/analysis/:id`     | OPS_TOKEN |
| POST   | `/ops/analysis`         | OPS_TOKEN |
| POST   | `/ops/hydrate-backfill` | OPS_TOKEN |
| GET    | `/ops/photo-stats`      | OPS_TOKEN |
| GET    | `/ops/verify-snapshots` | OPS_TOKEN |

---

## Non-Functional Requirements

### Performance Budgets

| Metric                                | Target      | Rationale                                                       |
| ------------------------------------- | ----------- | --------------------------------------------------------------- |
| API response (list endpoints)         | < 200ms p95 | D1 SQLite queries; simple JOINs; indexed                        |
| API response (single opportunity GET) | < 300ms p95 | Includes 3 queries (opportunity + actions + alerts computation) |
| API response (analyze with AI)        | < 30s p95   | Claude API call dominates; 25s timeout + overhead               |
| API response (analyze without AI)     | < 500ms p95 | Gate-only refresh, no external call                             |
| Ingest batch (50 listings)            | < 5s p95    | Sequential D1 inserts; consider D1 batch API for improvement    |
| Scout scrape cycle                    | < 60s p95   | Currently runs every 15 minutes via cron                        |
| Frontend LCP (iOS Safari)             | < 2.5s      | Next.js SSR + API fetch; critical for operator UX               |
| Frontend INP (iOS Safari)             | < 200ms     | Touch interactions must feel instant                            |

### Reliability Targets

| Metric                  | Target                                               | Notes                                                   |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| API availability        | 99.5% monthly                                        | Cloudflare Workers SLA; single region                   |
| Scout cron success rate | > 95%                                                | External auction sites may be flaky                     |
| Analysis success rate   | > 90%                                                | Claude API may timeout or rate-limit                    |
| Data loss tolerance     | Zero for opportunities, operator_actions, mvc_events | D1 provides durable storage; R2 snapshots are immutable |

### Capacity Limits (MVP)

| Resource                    | Limit                    | Source                      |
| --------------------------- | ------------------------ | --------------------------- |
| D1 database size            | 10 GB                    | Cloudflare D1 free/pro tier |
| D1 rows read per query      | 5,000,000                | D1 limit per request        |
| D1 rows written per request | 100,000                  | D1 limit                    |
| Worker CPU time             | 30s (paid) / 10ms (free) | CF Workers limit            |
| Worker subrequests          | 50 per request           | CF Workers limit            |
| R2 object size              | 5 GB max                 | R2 limit                    |
| Batch operation size        | 50 items                 | Application-enforced        |
| Ingest batch size           | 100 listings             | Application-enforced        |

### Security Requirements

| Requirement                    | Implementation                                          | Status                                                   |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| No wildcard CORS               | Origin allowlist in `http.ts`                           | Implemented                                              |
| No exposed debug endpoints     | 404 for unmatched routes; no `/debug/*` in production   | Implemented                                              |
| SQL injection prevention       | All queries use `.bind()` parameterization              | Implemented                                              |
| Auth on all API endpoints      | Bearer token check before route dispatch                | Implemented                                              |
| R2 snapshot immutability       | New key per snapshot; no overwrites                     | Implemented                                              |
| Secrets not in source control  | Wrangler secrets for OPS_TOKEN, ANTHROPIC_API_KEY, etc. | Implemented                                              |
| Input validation at boundaries | JSON parse with null fallback; field-level validation   | Partial -- some endpoints do not validate payload shapes |

---

## Technical Risks

| #   | Risk                                                                                                                                                                                                                                             | Severity | Likelihood                                   | Mitigation                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **D1 concurrent write conflicts** -- Two requests updating the same opportunity simultaneously could cause lost updates. The optimistic lock on `analyze` handles that path, but `PATCH /api/opportunities/:id` does not use optimistic locking. | High     | Low (single operator for MVP)                | Accept for MVP. Add `updated_at` optimistic lock to PATCH endpoint before adding more operators.                                                |
| R2  | **Analyst timeout under Claude API load** -- The 25-second timeout is generous but Claude API cold starts or rate limits could cause failures during peak auction periods.                                                                       | Medium   | Medium                                       | Current fallback: analysis proceeds without AI result (gate-only mode). Add retry with exponential backoff in Phase 1.                          |
| R3  | **Shared D1 schema coupling** -- dfg-scout and dfg-api share the same D1 database. A schema change in one worker can break the other. There is no migration coordination mechanism.                                                              | High     | Medium                                       | Migrations live in dfg-api only. Scout reads/writes its own tables. Document schema ownership clearly. Add schema version check at startup.     |
| R4  | **Thread-local CORS pattern** -- `setCurrentRequest()` stores request in module-level variable. If CF Workers ever process concurrent requests in the same isolate, CORS headers could leak between requests.                                    | Medium   | Low (CF Workers use one-request-per-isolate) | Document the assumption. If CF changes isolate model, switch to request-scoped context passing.                                                 |
| R5  | **No rate limiting on public-facing API** -- Any client with the OPS_TOKEN can send unlimited requests. A compromised token or runaway client could exhaust D1 read/write quotas.                                                                | Medium   | Low                                          | Add per-IP rate limiting via CF WAF rules in Phase 1. Consider rotating OPS_TOKEN to a short-lived JWT.                                         |
| R6  | **Auction data freshness** -- Scout runs every 15 minutes. Opportunities show denormalized listing data that can be up to 15 minutes stale for bid prices and lot status.                                                                        | Medium   | High                                         | Acceptable for MVP. Add on-demand refresh button that calls scout for a single listing. Display "last updated" timestamp prominently.           |
| R7  | **No idempotency on ingest** -- If the ingest endpoint is called twice with the same listings, it creates duplicate opportunities (unless the listing_id already has an opportunity). The dedup relies on listing_id uniqueness.                 | Low      | Low                                          | Current dedup is adequate for single-scout-source operation. Add UNIQUE constraint on `opportunities(listing_id)` where listing_id IS NOT NULL. |
| R8  | **Watch trigger latency** -- Watch triggers are checked via cron every 5 minutes. An operator setting "alert me 4 hours before auction end" could receive the alert up to 5 minutes late.                                                        | Low      | High                                         | Acceptable for MVP. The 4-hour default threshold provides sufficient buffer. For sub-minute precision, use Durable Objects alarms.              |

---

## Open Decisions / ADRs

### ADR-001: Event Sourcing Scope

**Status:** Needs Decision

**Context:** The `mvc_events` table captures decision_made, bid_submitted, bid_result, and sale_result events with idempotency. However, the rest of the system uses direct state mutation (PATCH on opportunities). There is a hybrid model where some state changes produce events and others do not.

**Options:**

- (A) Keep hybrid: events for financial milestones, direct mutation for workflow state. Simpler, already working.
- (B) Full event sourcing: all state changes go through events, state is derived. Expensive refactor, questionable value at MVP scale.

**Recommendation:** Option A. Financial events (decisions, bids, outcomes) need an immutable audit trail. Workflow state changes (inbox to qualifying) are adequately tracked by `operator_actions`. Converging these would add complexity without clear MVP benefit.

### ADR-002: Analyst Worker Authentication

**Status:** Needs Decision

**Context:** dfg-analyst requires `ANALYST_SERVICE_SECRET` as Bearer token. When called via service binding from dfg-api, the token is not passed (service bindings are trusted). When called via URL fallback (development), the token must be sent. The analyst has its own auth middleware separate from dfg-api.

**Options:**

- (A) Keep separate auth: analyst has its own secret, verified independently. Service bindings bypass it.
- (B) Unified auth: pass OPS_TOKEN through service bindings, analyst validates the same token.
- (C) mTLS via service binding trust only: remove analyst-side auth, rely on CF service binding identity.

**Recommendation:** Option A for MVP. Service bindings are inherently trusted (same account, same zone). The ANALYST_SERVICE_SECRET protects the URL-based development path. Unifying tokens would couple the workers unnecessarily.

### ADR-003: Outcomes / P&L Tracking Table

**Status:** Needs Decision

**Context:** The schema defines an `outcomes` table (from the specification documents) for actual purchase/sale P&L tracking, but it is not referenced in any current migration or code. The `opportunities` table has `final_price` and `outcome_notes` but no structured P&L fields.

**Options:**

- (A) Defer outcomes table to Phase 1. Use `final_price` + `outcome_notes` on opportunities for MVP.
- (B) Add outcomes table now with minimal columns (purchase_price, sold_price, fees, net_profit).
- (C) Use mvc_events `sale_result` payload as the P&L record, derive outcomes from events.

**Recommendation:** Option A. The operator has made profitable acquisitions without structured P&L tracking. The `sale_result` event payload captures the needed data when it happens. A dedicated table can be introduced when there is enough historical data to warrant reporting queries.

### ADR-004: Category System Extensibility

**Status:** Decided (D1-driven categories)

**Context:** Categories are stored in `category_defs` with configurable thresholds, but the analyst worker still has hardcoded category-specific prompt files and analysis functions (prompts-power-tools.ts, analysis-vehicles.ts, etc.).

**Decision:** The D1-driven `category_defs` table provides runtime configuration (thresholds, evidence requirements). The prompt files remain in code because they contain nuanced domain knowledge that changes infrequently. Adding a new category requires: (1) insert row in category_defs, (2) add prompt file and analysis file to analyst worker, (3) deploy. This is acceptable for the expected rate of new categories (quarterly at most).

### ADR-005: Photo Storage Strategy

**Status:** Decided (R2 for evidence, URL references for display)

**Context:** Photos are stored as URL arrays in `opportunities.photos` (JSON) and `listings.photos` (JSON). The R2 bucket (`dfg-evidence`) stores snapshots for evidence immutability. Display photos reference external URLs from auction sites.

**Decision:** External URLs for display (fast, no storage cost), R2 for evidence snapshots (immutable, survives auction site changes). The photo sync pipeline (`sync-photos`) backfills opportunities from listings when hydration completes after initial ingest.

**Risk:** Auction site URLs may become invalid after auction closes. Mitigation: R2 snapshots preserve the visual record.

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

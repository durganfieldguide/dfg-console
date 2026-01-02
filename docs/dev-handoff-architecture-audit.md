# Dev Team Handoff: Architecture Audit & Sprint N+1 Complete

**Date:** 2026-01-02
**Sprint:** N+1 (Complete)
**Status:** Ready for Sprint N+2 development

---

## CRITICAL: Development Guidelines

### DO NOT Deprecate Without Explicit Instruction

**All existing functionality must be preserved unless explicitly instructed to remove it.** This includes:

- All API endpoints and their response formats
- All database schemas and columns
- All frontend components and their props
- All worker bindings and environment variables
- All scoring algorithms and thresholds

When modifying existing code:
1. **Extend, don't replace** - Add new fields/options rather than changing existing ones
2. **Maintain backwards compatibility** - Existing API consumers must continue to work
3. **Document breaking changes** - If unavoidable, document in PR description

---

## Sprint N+1 Accomplishments

### Completed Features

| Issue | Feature | Status |
|-------|---------|--------|
| #3, #19 | Story 2b: Inline CTAs on Attention Required | ✅ Complete |
| #5, #23 | Story 3: Ending Soon dashboard section | ✅ Complete |
| #20 | P0: CI failures on main | ✅ Fixed |
| #25 | Bug: Re-analyze fails with undefined analysisRun | ✅ Fixed |
| #26 | Bug: Pass action requires rejection_reason | ✅ Fixed |
| #27 | Bug: Watch action needs watch_trigger | ✅ Fixed |

### Recent Commits (Sprint N+1)

```
95f5d9f fix(dfg-app): use manual watch trigger instead of ending_soon
80a4fce fix(dfg-app): add watch_trigger and watch_threshold to Watch CTA
788e58c fix(dfg-app): P0 bugs in Story 2b inline CTAs
d7aa660 feat(dfg-app): add Ending Soon dashboard section with countdown timers
dd641c2 feat: add inline CTAs to Attention Required list (Story 2b)
b1f40ba fix: CI failures on main (#20)
```

### Key Files Modified

| File | Changes |
|------|---------|
| `apps/dfg-app/src/components/features/attention-required-list.tsx` | Added inline CTAs (Re-analyze, Touch, Pass, Watch) with optimistic UI |
| `apps/dfg-app/src/components/features/ending-soon-list.tsx` | NEW - Ending Soon section with countdown timers |
| `apps/dfg-app/src/app/page.tsx` | Added EndingSoonList component to dashboard |
| `apps/dfg-app/src/lib/api.ts` | Fixed triggerAnalysis response parsing |
| `apps/dfg-app/.eslintrc.json` | Created ESLint config for CI |
| `workers/dfg-scout/tsconfig.json` | Created TypeScript config for CI |

---

## Project Structure

```
dfg/
├── apps/
│   └── dfg-app/           # Next.js frontend (Vercel)
├── workers/
│   ├── dfg-api/           # Cloudflare Worker - REST API
│   ├── dfg-scout/         # Cloudflare Worker - Auction scraping
│   ├── dfg-analyst/       # Cloudflare Worker - AI analysis (Claude)
│   └── dfg-relay/         # Cloudflare Worker - PM→GitHub automation
└── docs/                  # Documentation
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS, TypeScript |
| API | Cloudflare Workers, Hono router |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (photos, snapshots) |
| AI | Claude API (Anthropic) |
| Auth | NextAuth.js |
| CI/CD | GitHub Actions → Vercel (app) / Wrangler (workers) |

### Environment Setup

**Required for dfg-app:**
```bash
cd apps/dfg-app
npm install
cp .env.example .env.local  # Configure DFG_API_URL, OPS_TOKEN
npm run dev
```

**Required for workers:**
```bash
cd workers/dfg-api  # or dfg-scout, dfg-analyst
npm install
npx wrangler dev    # Local development
```

### CI Pipeline

All PRs must pass 3 jobs:
1. **DFG App** - lint, type-check, build
2. **DFG API Worker** - type-check, tests
3. **DFG Scout Worker** - type-check, tests

---

## Architecture Audit Results

### Question 1: Where is category/buy-box config stored?

| Component | Location | Type |
|-----------|----------|------|
| Category Definitions | D1 table: `category_defs` | Database |
| Source-Category Mappings | D1 table: `source_category_map` | Database |
| Scoring Thresholds | `wrangler.toml` + `env.ts` | Environment Vars |
| Scoring Algorithm | `router.ts` `evaluateLotPure()` | Hardcoded |
| Score Bands (API) | `opportunities.ts` | Hardcoded |

#### Category Definitions (D1: `category_defs`)

**Schema:** `workers/dfg-scout/migrations/schema.sql:163-181`

```sql
CREATE TABLE IF NOT EXISTS category_defs (
  id TEXT PRIMARY KEY,              -- e.g. TRAILER_GENERIC
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  keywords_positive TEXT,           -- JSON array
  keywords_negative TEXT,           -- JSON array
  min_length_ft REAL,
  max_length_ft REAL,
  base_score INTEGER NOT NULL DEFAULT 50,
  ...
);
```

**Seeded Categories:** `seed_categories.sql`
- TRAILER_UTILITY (base_score: 70)
- GENERATOR_PORTABLE (base_score: 65)
- WELDER_PRO (base_score: 60)

#### Buy-Box Scoring Logic

**Location:** `workers/dfg-scout/src/categories/router.ts:84-260`

```typescript
// Keyword scoring: positives +20pts, negatives -30pts (weighted 1.5x)
let keywordScore = Math.min(60, matchedPositive.length * 20)
                 - Math.min(60, matchedNegative.length * 30);

// Price scoring (0-40 pts based on thresholds)
if (price <= 1000) priceScore = hasVerifiedPrice ? 40 : 35;
else if (price <= stealThreshold) priceScore = hasVerifiedPrice ? 25 : 20;
else if (price <= 4000) priceScore = hasVerifiedPrice ? 10 : 5;

// Final: base(10) + keywords + price, clamped to 0-100
const score = Math.max(0, Math.min(base + keywordScore + priceScore, 100));
```

#### Environment Config

**Location:** `workers/dfg-scout/wrangler.toml`

```toml
MAX_BID_LIMIT = "6000"
STEAL_THRESHOLD = "2000"
```

#### API Score Bands

**Location:** `workers/dfg-api/src/routes/opportunities.ts`

- High: >= 70
- Medium: 40-69
- Low: < 40

---

### Question 2: What does Scout pass to Analyst?

#### Data Flow

```
Scout (NormalizedLot) → D1 listings → API (IngestListing) → D1 opportunities → Analyst (ListingData)
```

#### Scout's NormalizedLot

**Location:** `workers/dfg-scout/src/core/types.ts:65-90`

```typescript
export type NormalizedLot = {
  source: string;              // 'sierra', 'rbid', etc.
  sourceLotId: string;
  sourceUrl: string;
  title: string;
  description?: string;
  auctionEndAt?: string;       // ISO datetime
  locationText?: string;       // "Phoenix, AZ"
  price: NormalizedPrice;      // {amount, kind, verified}
  imageUrl?: string;           // Primary thumbnail
  photoUrls?: string[];        // Full gallery URLs
  photoCount?: number;         // Computed from photoUrls.length
  sourceCategories?: string[];
  raw: unknown;                // Preserved for evidence
};
```

#### What Analyst Receives (ListingData)

**Location:** `workers/dfg-analyst/src/types.ts:32-67`

```typescript
export interface ListingData {
  source: string;
  listing_url: string;
  lot_id?: string;
  category_id?: string;        // From Scout's category router
  title: string;
  description: string;
  photos: string[];            // Full gallery URLs from Scout
  photo_count?: number;
  current_bid: number;
  buy_now_price?: number;
  fee_schedule?: { buyer_premium, sales_tax_percent };
  location: { city, state, distance_miles };
  ends_at?: string;
  operator_inputs?: { ... };   // From frontend
}
```

#### Key Points

1. **No direct queue** - Database-mediated (Scout → D1 → API → Analyst)
2. **Photos passed as URLs** - Analyst fetches directly from source CDN
3. **Category context included** - `category_id` from Scout's router
4. **Raw preserved** - Stored in R2 for evidence, not passed to Analyst

---

### Question 3: Is there category-specific logic today?

#### YES - Extensive Category Branching in Analyst

**Location:** `workers/dfg-analyst/src/worker.ts:1850-1868`

```typescript
const isPowerTools = categoryLower === 'power_tools';
const isVehicle = isVehicleByCategory || (categoryLower === 'buy_box' && titleLooksLikeVehicle);
const isTrailer = !isPowerTools && !isVehicle; // Default fallback
```

#### Three Category Tiers

| Category | Detection | Prompts File | Market Comps |
|----------|-----------|--------------|--------------|
| Power Tools | Explicit category | `prompts-power-tools.ts` | `analysis-power-tools.ts` |
| Vehicles | Category OR title keywords | `prompts-vehicles.ts` | `analysis-vehicles.ts` |
| Trailers | Default fallback | `prompts.ts` | `analysis.ts` + `phoenix-market-data.ts` |

#### Category-Specific Logic

1. **Condition Prompts** - Different extraction fields per category
   - Vehicles: year, make, model, VIN, mileage, title_status
   - Trailers: dimensions, axle_status, hitch_type, enclosure
   - Power Tools: tool_type, battery_system, charger status

2. **Market Comps** - Different lookup tables
   - Vehicles: Phoenix baselines by make (truck_ford, lexus, etc.)
   - Trailers: Size-based (5x8, 6x12, 7x14) by type (enclosed/utility)
   - Power Tools: Brand tier + voltage multipliers

3. **Repair Calculations** - Different MVR items
   - Vehicles: Detailing, tires, brakes, cosmetic
   - Trailers: Axle-aware tires, lights, deck, rust
   - Power Tools: Battery replacement, charger, chuck/blade

4. **Profit Thresholds** - Different minimums
   - Vehicles: >$1,500 profit OR >20% margin
   - Trailers: >$600 profit OR >40% margin
   - Power Tools: >$40 profit OR >30% margin

5. **Reporting Templates** - Different next steps, listing prep, channels

#### Scout Category Logic

Scout uses **database-driven keywords**, not hardcoded category logic. The `CategoryRouter` class loads from `category_defs` table.

---

### Question 4: Photo Pipeline Audit

#### Where photo_count Comes From

**CRITICAL FINDING: Three Different Counts**

| Count | Source | Reliability |
|-------|--------|-------------|
| `available` | `photoUrls.length` in Scout | **Unreliable** - just URL count, not source metadata |
| `received` | URLs passed to Analyst | Based on what Scout sent |
| `analyzed_ok` | Vision API results | **Most reliable** - what Claude actually saw |

#### Photo Flow

```
Sierra API → Scout hydration → D1 listings.photos (JSON) → API ingest → D1 opportunities.photos → Analyst fetch
```

#### How photo_count is Computed

**Scout:** `workers/dfg-scout/src/sources/sierra/normalize.ts:103`
```typescript
const photoCount = photoUrls.length;  // Just counting URLs we have
```

**Analyst:** `workers/dfg-analyst/src/worker.ts:1938-1956`
```typescript
const photosReceived = listingData.photos.length;
const photosAvailable = listingData.photo_count ?? photosReceived;
const actualFetchOk = imageFetchResults.filter(r => r.status === 'ok').length;

// What's stored in condition.photo_metrics:
{
  available: photosAvailable,      // Source count OR inferred
  availability_known: boolean,     // Did source provide explicit count?
  received: photosReceived,        // URLs we got
  selected: photosSelected,        // Capped at 10
  analyzed_ok: actualFetchOk,      // What Claude actually processed
  analyzed_failed: number          // Fetch failures
}
```

#### Reliability Issues

1. **photo_count is computed, not sourced** - Not extracted from Sierra metadata
2. **Stale by design** - Photos fetched once per Scout run, never refreshed
3. **Hotlink blocking common** - Analyst can't fetch even if URLs valid
4. **Claude's claim vs reality** - Scoring uses `photos_analyzed` from Claude, not `analyzed_ok`
5. **No re-sync on updates** - Photos static after initial ingest

#### Low Photo Penalty

**Location:** `workers/dfg-analyst/src/calculation-spine.ts:789`
```typescript
if (photoCount < 4) { score -= 1.0 }  // Uses Claude's claim, not actual count
```

---

## API Quick Reference

### Key Endpoints (dfg-api)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/opportunities` | List with filters (?status, ?ending_soon, ?attention) |
| GET | `/api/opportunities/:id` | Get single opportunity |
| PATCH | `/api/opportunities/:id` | Update status, inputs, etc. |
| POST | `/api/opportunities/:id/analyze` | Trigger re-analysis |
| POST | `/api/opportunities/:id/touch` | Record operator review |
| GET | `/api/dashboard/attention` | Get attention-required items |
| GET | `/api/opportunities/stats` | Dashboard stats |

### Frontend API Client

**Location:** `apps/dfg-app/src/lib/api.ts`

Key functions:
- `listOpportunities(params)` - Fetch opportunity list
- `getOpportunity(id)` - Fetch single opportunity
- `updateOpportunity(id, params)` - Update opportunity
- `triggerAnalysis(id)` - Trigger re-analysis
- `touchOpportunity(id)` - Mark as reviewed
- `getAttentionRequired(limit)` - Get attention items

---

## Database Schema Quick Reference

### opportunities (D1: dfg-api)

Key columns for attention/staleness:
- `status` - Pipeline stage
- `auction_ends_at` - When auction ends
- `status_changed_at` - Last status change
- `last_operator_review_at` - Last touch
- `last_analyzed_at` - Last analysis run
- `current_analysis_run_id` - FK to analysis_runs

### Computed Staleness Flags (in queries)

```sql
-- is_stale: No review in 3+ days
julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > 3

-- is_decision_stale: bid/watch status, ends within 24h
status IN ('bid', 'watch') AND auction_ends_at within 24h

-- is_ending_soon: Ends within 48h
auction_ends_at within 48h

-- is_analysis_stale: No analysis in 7+ days
julianday('now') - julianday(last_analyzed_at) > 7
```

---

## Summary

| Question | Answer |
|----------|--------|
| Category/buy-box config | D1 tables + hardcoded scoring in `router.ts` |
| Scout → Analyst data | Parsed fields via D1, category context included, raw in R2 |
| Category-specific logic | YES - extensive branching in Analyst (3 tiers) |
| photo_count reliability | **UNRELIABLE** - computed from URL count, not source metadata |

---

## Known Issues & Tech Debt

1. **Photo Count**: Consider extracting actual photo count from source metadata (if available)
2. **Staleness**: Add photo gallery change detection to staleness checks
3. **Hotlink Tracking**: Surface `analyzed_ok` vs `received` gap to operator
4. **Category Config**: Consider moving scoring algorithm to database for tunability
5. **Seed SQL Mismatch**: `seed_categories.sql` references columns not in schema

---

## Getting Started for New Developers

1. Clone repo and install dependencies in all packages
2. Set up local environment variables (see `.env.example` files)
3. Run `npx wrangler d1 migrations apply` for each worker with D1
4. Start local dev servers: `npm run dev` (app) or `npx wrangler dev` (workers)
5. Review this document and the codebase before making changes
6. **Always run CI checks locally before pushing:** `npm run lint && npm run type-check`

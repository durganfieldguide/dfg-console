# DFG Technical Debt & Recommendations Handoff

**Date:** December 24, 2025
**Status:** Ready for Prioritization
**Prepared By:** Senior Development Team Review

---

## Executive Summary

This document catalogs technical debt, security concerns, and improvement opportunities identified during a comprehensive code review of the DFG application. Items are prioritized by risk and organized with sufficient detail for a development team to execute without additional context gathering.

**Quick Stats:**
- 🔴 Critical Issues: 3 (address before next deployment)
- 🟠 Moderate Issues: 4 (address within 2 weeks)
- 🟡 Technical Debt: 5 (backlog items)
- Estimated Total Effort: 3-5 developer days

---

## 🔴 Critical Issues

### CRIT-001: Debug Endpoints Exposed Without Authentication

**Priority:** P0 - Security
**Effort:** 30 minutes
**Risk:** Information disclosure, reconnaissance for attackers

#### Problem

Three debug endpoints in the Scout worker are publicly accessible without authentication:

```
GET /debug/analyses      → Exposes analysis table structure and sample data
GET /debug/sources       → Exposes source list and candidate counts
GET /debug/analysis/:id  → Exposes partial analysis data for any listing
```

#### Location

`workers/dfg-scout/src/index.ts` lines 21-60

#### Current Code

```typescript
// 1b. Debug: Check analyses table
if (cleanPath === '/debug/analyses') {
  try {
    const result = await env.DFG_DB.prepare('SELECT listing_id, verdict FROM analyses LIMIT 5').all();
    return json({ analyses: result.results, count: result.results?.length || 0 });
  } catch (err: any) {
    return json({ error: err.message });
  }
}
```

#### Solution

**Option A (Recommended): Add authentication checks**

```typescript
// 1b. Debug: Check analyses table (PROTECTED)
if (cleanPath === '/debug/analyses') {
  if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
  try {
    const result = await env.DFG_DB.prepare('SELECT listing_id, verdict FROM analyses LIMIT 5').all();
    return json({ analyses: result.results, count: result.results?.length || 0 });
  } catch (err: any) {
    return json({ error: err.message });
  }
}
```

Apply the same pattern to `/debug/sources` and `/debug/analysis/:id`.

**Option B: Environment-gate the endpoints**

```typescript
// Only enable debug endpoints in non-production
if (env.ENVIRONMENT !== 'production' && cleanPath === '/debug/analyses') {
  // ... existing code
}
```

**Option C: Remove entirely**

Delete lines 21-60 if debug endpoints are no longer needed.

#### Verification

```bash
# Before fix - should return data:
curl https://dfg-scout.automation-ab6.workers.dev/debug/sources

# After fix - should return 401:
curl https://dfg-scout.automation-ab6.workers.dev/debug/sources
# Response: {"error":"Unauthorized"}
```

---

### CRIT-002: Missing Local Development Environment Configuration

**Priority:** P0 - Developer Experience
**Effort:** 15 minutes
**Risk:** New developers unable to run locally, deployment confusion

#### Problem

The `wrangler.toml` only defines bindings under `[env.production]` and `[env.preview]`. Running `wrangler dev` without an environment flag fails with:

```
Cannot read properties of undefined (reading 'prepare')
```

#### Location

`workers/dfg-scout/wrangler.toml`

#### Current State

```toml
name = "dfg-scout"
main = "src/index.ts"
compatibility_date = "2025-11-25"

# No default bindings - local dev fails!

[env.production]
# ... all bindings here
```

#### Solution

Add a development environment section:

```toml
name = "dfg-scout"
main = "src/index.ts"
compatibility_date = "2025-11-25"

# =============================================================================
# LOCAL DEVELOPMENT (wrangler dev)
# Uses preview resources for safety
# =============================================================================
[vars]
ENVIRONMENT = "development"
MAX_BID_LIMIT = "6000"
STEAL_THRESHOLD = "2000"

[[kv_namespaces]]
binding = "SCOUT_KV"
id = "654357f4ea634d8db682f54bae0170a2"  # Preview KV

[[d1_databases]]
binding = "DFG_DB"
database_name = "dfg-scout-db-preview"
database_id = "e6af9d25-b031-4958-a3b2-455bafdff5f1"  # Preview DB

[[r2_buckets]]
binding = "DFG_EVIDENCE"
bucket_name = "dfg-evidence"  # Production bucket (preview R2 was removed)

# =============================================================================
# PRODUCTION
# =============================================================================
[env.production]
# ... existing production config
```

#### Alternative: Documentation Fix

If you prefer to keep the current structure, add prominent documentation:

```toml
# =============================================================================
# IMPORTANT: Local development requires --env flag
#
# For local development:   wrangler dev --env preview
# For deployment:          wrangler deploy --env production
#
# Running `wrangler dev` without --env will FAIL.
# =============================================================================
```

Also update `workers/dfg-scout/README.md` (create if needed) with:

```markdown
## Local Development

```bash
# REQUIRED: Must specify environment
wrangler dev --env preview

# Deploy to production
wrangler deploy --env production
```

**Warning:** Running `wrangler dev` or `wrangler deploy` without `--env` will fail.
```

---

### CRIT-003: R2 Public URL Hardcoded with Type Coercion

**Priority:** P0 - Configuration
**Effort:** 20 minutes
**Risk:** Broken image URLs if R2 bucket changes

#### Problem

The R2 public URL is hardcoded with a type coercion hack:

```typescript
function getR2PublicBase(env: Env): string {
  return (env as any).R2_PUBLIC_URL || 'https://pub-dfg-evidence.r2.dev';
}
```

This:
1. Uses `as any` to bypass TypeScript
2. Hardcodes a fallback URL that may become stale
3. Is not configurable per environment

#### Location

`workers/dfg-scout/src/core/pipeline/runScout.ts` lines 9-12

#### Solution

**Step 1: Update Env interface**

`workers/dfg-scout/src/core/env.ts`:

```typescript
export interface Env {
  ENVIRONMENT: 'production' | 'preview';
  SIERRA_API_URL: string;
  SIERRA_API_KEY: string;

  // Databases
  DFG_DB: D1Database;
  DFG_EVIDENCE: R2Bucket;
  SCOUT_KV: KVNamespace;

  // Security
  RESET_TOKEN: string;
  OPS_TOKEN: string;

  // Business Logic Config
  MAX_BID_LIMIT: string;
  STEAL_THRESHOLD: string;

  // R2 Configuration (NEW)
  R2_PUBLIC_URL?: string;
}
```

**Step 2: Update wrangler.toml**

```toml
[env.production.vars]
ENVIRONMENT = "production"
MAX_BID_LIMIT = "6000"
STEAL_THRESHOLD = "2000"
ANALYST_URL = "https://dfg-analyst.automation-ab6.workers.dev"
R2_PUBLIC_URL = "https://pub-dfg-evidence.r2.dev"
```

**Note:** Preview environment was removed. Local development uses the default bindings which point to preview D1/KV but production R2.

**Step 3: Update runScout.ts**

```typescript
function getR2PublicBase(env: Env): string {
  if (!env.R2_PUBLIC_URL) {
    console.warn('[Scout] R2_PUBLIC_URL not configured, images may not display correctly');
    return 'https://pub-dfg-evidence.r2.dev'; // Fallback with warning
  }
  return env.R2_PUBLIC_URL;
}
```

---

## 🟠 Moderate Issues

### MOD-001: Inconsistent Source Name Mapping

**Priority:** P1 - Maintainability
**Effort:** 1 hour
**Risk:** Bugs when adding new sources, data inconsistency

#### Problem

Frontend uses `sierra_auction` while backend uses `sierra`. This mapping is duplicated in 4+ locations:

| File | Mapping Direction |
|------|-------------------|
| `frontend/src/app/api/scout/run/route.ts:7-12` | frontend → backend |
| `workers/dfg-scout/src/index.ts:107-109` | backend → frontend (listings) |
| `workers/dfg-scout/src/index.ts:163` | backend → frontend (transform) |
| `workers/dfg-scout/src/index.ts:131-134` | backend → frontend (count) |

#### Solution

**Step 1: Create shared mapping utility**

Create `workers/dfg-scout/src/core/source-mapping.ts`:

```typescript
/**
 * Source Name Mapping
 *
 * Backend uses short names (sierra, ironplanet) for storage efficiency.
 * Frontend uses descriptive names (sierra_auction) for UI clarity.
 *
 * This is the SINGLE SOURCE OF TRUTH for all mappings.
 */

// Backend → Frontend mapping
const BACKEND_TO_FRONTEND: Record<string, string> = {
  sierra: 'sierra_auction',
  ironplanet: 'ironplanet',
  govplanet: 'govplanet',  // Prepared for future
};

// Inverse mapping (computed once)
const FRONTEND_TO_BACKEND: Record<string, string> = Object.fromEntries(
  Object.entries(BACKEND_TO_FRONTEND).map(([k, v]) => [v, k])
);

/**
 * Convert backend source name to frontend display name.
 * Returns input unchanged if no mapping exists.
 */
export function toFrontendSource(backendSource: string): string {
  return BACKEND_TO_FRONTEND[backendSource] ?? backendSource;
}

/**
 * Convert frontend source name to backend storage name.
 * Returns input unchanged if no mapping exists.
 */
export function toBackendSource(frontendSource: string): string {
  return FRONTEND_TO_BACKEND[frontendSource] ?? frontendSource;
}

/**
 * Get all known backend source names.
 */
export function getAllBackendSources(): string[] {
  return Object.keys(BACKEND_TO_FRONTEND);
}

/**
 * Get all known frontend source names.
 */
export function getAllFrontendSources(): string[] {
  return Object.values(BACKEND_TO_FRONTEND);
}
```

**Step 2: Update index.ts**

```typescript
import { toFrontendSource, toBackendSource } from './core/source-mapping';

// In listings endpoint:
if (source) {
  const backendSource = toBackendSource(source);
  query += ` AND source = ?`;
  params.push(backendSource);
}

// In transform:
return {
  id: row.id,
  source: toFrontendSource(row.source),
  // ...
};
```

**Step 3: Update frontend route**

`frontend/src/app/api/scout/run/route.ts`:

```typescript
// Option A: Import from shared package (if using monorepo sharing)
// import { toBackendSource } from '@dfg/shared';

// Option B: Duplicate the mapping (simpler for now)
const FRONTEND_TO_BACKEND: Record<string, string> = {
  sierra_auction: 'sierra',
  ironplanet: 'ironplanet',
};

function toBackendSource(source: string): string {
  return FRONTEND_TO_BACKEND[source] ?? source;
}
```

---

### MOD-002: IronPlanet Capturing Only ~17% of Available Inventory

**Priority:** P1 - Business Impact
**Effort:** 2 hours
**Risk:** Missing profitable deals

#### Problem

IronPlanet shows ~573 items for Arizona Trucks & Trailers, but the adapter only captures ~96 items from the first page load.

#### Location

`workers/dfg-scout/src/sources/ironplanet/adapter.ts` lines 180-195

#### Current State

```typescript
async fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>> {
  return [
    {
      auctionId: 'az-trucks-trailers',
      title: 'Arizona Trucks & Trailers',
      searchParams: { ...DEFAULT_SEARCH_CONFIG },
    },
    // Commented out subcategories...
  ];
}
```

#### Solution

**Phase 1: Add subcategory searches**

Uncomment and expand the virtual auctions:

```typescript
async fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>> {
  return [
    // Broad category (catches items not in subcategories)
    {
      auctionId: 'az-trucks-trailers',
      title: 'Arizona Trucks & Trailers',
      searchParams: { ct: '3', l2: 'USA-AZ', sm: '0' },
    },
    // Specific trailer subcategories
    {
      auctionId: 'az-utility-trailers',
      title: 'Arizona Utility Trailers',
      searchParams: { ct: '3', c: '2268', l2: 'USA-AZ', sm: '0' },
    },
    {
      auctionId: 'az-flatbed-trailers',
      title: 'Arizona Flatbed Trailers',
      searchParams: { ct: '3', c: '2252', l2: 'USA-AZ', sm: '0' },
    },
    {
      auctionId: 'az-dump-trailers',
      title: 'Arizona Dump Trailers',
      searchParams: { ct: '3', c: '2260', l2: 'USA-AZ', sm: '0' },
    },
    {
      auctionId: 'az-equipment-trailers',
      title: 'Arizona Equipment Trailers',
      searchParams: { ct: '3', c: '2264', l2: 'USA-AZ', sm: '0' },
    },
    {
      auctionId: 'az-enclosed-trailers',
      title: 'Arizona Enclosed Trailers',
      searchParams: { ct: '3', c: '2262', l2: 'USA-AZ', sm: '0' },
    },
  ];
}
```

**Phase 2: Add neighboring states (optional)**

```typescript
// Add after AZ categories
{
  auctionId: 'nv-trucks-trailers',
  title: 'Nevada Trucks & Trailers',
  searchParams: { ct: '3', l2: 'USA-NV', sm: '0' },
},
{
  auctionId: 'ca-trucks-trailers',
  title: 'California Trucks & Trailers',
  searchParams: { ct: '3', l2: 'USA-CA', sm: '0' },
},
```

**Note:** The existing deduplication (by `source:sourceId` in D1) handles overlapping results automatically.

#### Coverage Tracking

Add to run stats to monitor improvement:

```typescript
// In runScout.ts, after fetching:
console.log(`[IronPlanet] Coverage: ${all.length} fetched of ${totalCount ?? 'unknown'} available`);
```

---

### MOD-003: Missing Retry Logic for Claude API Calls

**Priority:** P1 - Reliability
**Effort:** 1.5 hours
**Risk:** Analysis failures on transient errors

#### Problem

The analyst worker calls Claude API but doesn't retry on transient failures (429 rate limits, 503 service unavailable, network timeouts).

#### Location

`workers/dfg-analyst/src/worker.ts` - Claude API call locations

#### Solution

Create a retry utility:

```typescript
// workers/dfg-analyst/src/utils/retry.ts

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
          opts.maxDelayMs
        );
        await new Promise(r => setTimeout(r, delay));
        console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} after ${Math.round(delay)}ms`);
      }

      const response = await fetch(url, init);

      if (opts.retryableStatuses.includes(response.status)) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Network errors are retryable
      continue;
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}
```

Apply to Claude API calls:

```typescript
import { fetchWithRetry } from './utils/retry';

// Replace:
const response = await fetch('https://api.anthropic.com/v1/messages', { ... });

// With:
const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify(payload),
}, {
  maxRetries: 3,
  retryableStatuses: [429, 500, 502, 503, 504, 529], // 529 = Anthropic overloaded
});
```

---

### MOD-004: D1 Batch Size Undocumented

**Priority:** P2 - Maintainability
**Effort:** 15 minutes
**Risk:** Confusion for future developers

#### Problem

Magic number `100` used without explanation:

```typescript
for (let i = 0; i < d1Statements.length; i += 100) {
  await env.DFG_DB.batch(d1Statements.slice(i, i + 100));
}
```

#### Location

`workers/dfg-scout/src/core/pipeline/runScout.ts` line 381

#### Solution

Extract to configuration with documentation:

```typescript
// At top of file or in env.ts:

/**
 * D1 batch write configuration.
 *
 * Cloudflare D1 has these limits:
 * - Max 1000 statements per batch (but we use 100 for safety margin)
 * - Each statement counts toward the 50 subrequest limit
 * - Batches are atomic (all succeed or all fail)
 *
 * We use 100 to:
 * 1. Stay well under the 1000 limit
 * 2. Allow for future growth without hitting limits
 * 3. Reduce memory pressure on large runs
 *
 * @see https://developers.cloudflare.com/d1/platform/limits/
 */
const D1_BATCH_SIZE = 100;

// Usage:
for (let i = 0; i < d1Statements.length; i += D1_BATCH_SIZE) {
  await env.DFG_DB.batch(d1Statements.slice(i, i + D1_BATCH_SIZE));
}
```

---

## 🟡 Technical Debt

### DEBT-001: Insufficient Test Coverage

**Priority:** P2 - Quality
**Effort:** 4-6 hours
**Risk:** Regressions when modifying adapters

#### Current State

- ✅ `workers/dfg-analyst/src/__tests__/acquisition.test.ts` - acquisition calculations
- ❌ No IronPlanet adapter tests
- ❌ No runScout integration tests
- ❌ No router edge case tests

#### Recommended Test Additions

**1. IronPlanet Extraction Tests**

Create `workers/dfg-scout/src/sources/ironplanet/adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Import the internal function (may need to export it)
// or test via the public API

describe('extractQuickviews', () => {
  it('extracts single quickview from HTML', () => {
    const html = `
      <script>
        var quickviews = [];
        quickviews.push({"equipId":"123","description":"Test Trailer","convPrice":"US $5,000"});
      </script>
    `;
    // Test extraction
  });

  it('handles nested JSON objects', () => {
    const html = `
      quickviews.push({"equipId":"456","nested":{"key":"value"}});
    `;
    // Test brace counting works
  });

  it('skips malformed JSON gracefully', () => {
    const html = `
      quickviews.push({malformed);
      quickviews.push({"equipId":"789","valid":true});
    `;
    // Should get one result, not crash
  });

  it('returns empty array when no quickviews found', () => {
    const html = '<html><body>No listings</body></html>';
    // Test empty case
  });
});
```

**2. IronPlanet Normalization Tests**

Create `workers/dfg-scout/src/sources/ironplanet/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeIronPlanetLot, safeNormalizeIronPlanetLot } from './normalize';

describe('normalizeIronPlanetLot', () => {
  const NOW = new Date('2025-12-24T12:00:00Z').getTime();

  it('normalizes complete quickview object', () => {
    const raw = {
      equipId: '14109982',
      description: '2016 Load Trail 44ft Gooseneck',
      convPrice: 'US $21,000',
      price: 21000,
      hasBid: true,
      timeLeft: 'Jan 8',
      photo: 'https://cdn.example.com/image.jpg',
      location: 'Phoenix, AZ',
    };

    const result = normalizeIronPlanetLot(raw, NOW);

    expect(result.source).toBe('ironplanet');
    expect(result.sourceLotId).toBe('14109982');
    expect(result.title).toBe('2016 Load Trail 44ft Gooseneck');
    expect(result.price.amount).toBe(21000);
    expect(result.price.kind).toBe('current_bid');
    expect(result.price.verified).toBe(true);
    expect(result.locationText).toBe('Phoenix, AZ');
  });

  it('handles buy now pricing', () => {
    const raw = {
      equipId: '123',
      description: 'Test',
      price: 5000,
      buyItNow: true,
    };

    const result = normalizeIronPlanetLot(raw, NOW);
    expect(result.price.kind).toBe('buy_now');
    expect(result.price.verified).toBe(true);
  });

  it('parses relative time correctly', () => {
    const raw = {
      equipId: '123',
      description: 'Test',
      timeLeft: '2d 4h',
    };

    const result = normalizeIronPlanetLot(raw, NOW);
    expect(result.lotStatus).toBe('active');
    expect(result.auctionEndAt).toBeDefined();
  });

  it('handles closed auctions', () => {
    const raw = {
      equipId: '123',
      description: 'Test',
      timeLeft: 'Closed',
    };

    const result = normalizeIronPlanetLot(raw, NOW);
    expect(result.lotStatus).toBe('closed');
  });
});

describe('safeNormalizeIronPlanetLot', () => {
  it('returns success result for valid input', () => {
    const raw = { equipId: '123', description: 'Test' };
    const result = safeNormalizeIronPlanetLot(raw);
    expect(result.success).toBe(true);
  });

  it('returns failure result for missing equipId', () => {
    const raw = { description: 'No ID' };
    const result = safeNormalizeIronPlanetLot(raw);
    expect(result.success).toBe(false);
    expect(result.error).toContain('equipId');
  });
});
```

**3. Router Edge Case Tests**

Add to `workers/dfg-scout/src/categories/router.test.ts`:

```typescript
describe('evaluateLotPure edge cases', () => {
  it('rejects global negative keywords regardless of category match', () => {
    const input = {
      title: 'Utility Trailer - SALVAGE TITLE',
      description: '',
      price: 1000,
      priceVerified: true,
      priceKind: 'current_bid' as const,
    };

    const categories = [{
      id: 'buy_box',
      name: 'Buy Box',
      enabled: true,
      minScore: 30,
      requiresSnapshot: true,
      positive: ['utility trailer'],
      negative: [],
    }];

    const result = evaluateLotPure(input, categories, { maxBid: 6000, stealThreshold: 2000 });

    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBe('global_negative_trigger');
  });

  it('handles multi-word keywords with hyphens', () => {
    // Test that "dump trailer" matches "dump-trailer"
  });

  it('respects word boundaries for keywords', () => {
    // Test that "trailer" doesn't match "trailer-less"
  });
});
```

---

### DEBT-002: Hardcoded Phoenix Market Data

**Priority:** P3 - Scalability
**Effort:** 3-4 hours
**Risk:** Cannot expand to new markets without code changes

#### Problem

Market comparison data is hardcoded in TypeScript:

```typescript
// workers/dfg-analyst/src/phoenix-market-data.ts
// Pre-loaded comparable sales data for Phoenix trailers
```

#### Future Solution

**Phase 1: Define D1 Schema**

```sql
-- Migration: 007-market-data.sql

CREATE TABLE IF NOT EXISTS market_comps (
  id TEXT PRIMARY KEY,
  market TEXT NOT NULL,          -- 'phoenix', 'tucson', etc.
  asset_category TEXT NOT NULL,  -- 'utility_trailer', 'dump_trailer', etc.
  condition TEXT NOT NULL,       -- 'excellent', 'good', 'fair', 'poor'
  retail_low INTEGER NOT NULL,
  retail_high INTEGER NOT NULL,
  wholesale_low INTEGER NOT NULL,
  wholesale_high INTEGER NOT NULL,
  sample_size INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_market_comps_lookup ON market_comps(market, asset_category);

-- Seed with Phoenix data
INSERT INTO market_comps (id, market, asset_category, condition, retail_low, retail_high, wholesale_low, wholesale_high, sample_size, last_updated)
VALUES
  ('phx-utility-excellent', 'phoenix', 'utility_trailer', 'excellent', 3500, 5500, 2500, 4000, 15, strftime('%s', 'now')),
  ('phx-utility-good', 'phoenix', 'utility_trailer', 'good', 2500, 4000, 1800, 3000, 22, strftime('%s', 'now')),
  -- ... additional rows
;
```

**Phase 2: Create Data Access Layer**

```typescript
// workers/dfg-analyst/src/market-data.ts

interface MarketComp {
  market: string;
  assetCategory: string;
  condition: string;
  retailRange: { low: number; high: number };
  wholesaleRange: { low: number; high: number };
  sampleSize: number;
  lastUpdated: Date;
}

export async function lookupMarketComps(
  env: Env,
  market: string,
  assetCategory: string
): Promise<MarketComp[]> {
  const results = await env.DFG_DB.prepare(`
    SELECT * FROM market_comps
    WHERE market = ? AND asset_category = ?
    ORDER BY condition
  `).bind(market, assetCategory).all();

  return (results.results || []).map(row => ({
    market: row.market,
    assetCategory: row.asset_category,
    condition: row.condition,
    retailRange: { low: row.retail_low, high: row.retail_high },
    wholesaleRange: { low: row.wholesale_low, high: row.wholesale_high },
    sampleSize: row.sample_size,
    lastUpdated: new Date(row.last_updated * 1000),
  }));
}
```

**Note:** This is a larger refactor. For now, the hardcoded data works for Phoenix operations.

---

### DEBT-003: Type Safety in D1 Queries

**Priority:** P3 - Code Quality
**Effort:** 2 hours
**Risk:** Runtime type errors, IDE autocomplete broken

#### Problem

D1 query results use `any` throughout:

```typescript
const row = result as any;
const params: any[] = [];
```

#### Solution

Define row types:

```typescript
// workers/dfg-scout/src/core/db-types.ts

export interface ListingRow {
  id: string;
  source: string;
  source_id: string;
  url: string;
  title: string;
  description: string | null;
  current_bid: number | null;
  category_id: string | null;
  buy_box_score: number | null;
  status: string;
  end_time: number | null;  // Unix timestamp
  location: string | null;
  image_url: string | null;
  photos: string | null;    // JSON string
  price_kind: string | null;
  price_verified: number | null;  // 0 or 1
  lot_status: string | null;
  created_at: number;
  updated_at: number;
  r2_snapshot_key: string | null;
}

export interface AnalysisRow {
  id: string;
  listing_id: string;
  analysis_timestamp: string;
  verdict: string;
  max_bid_mid: number;
  max_bid_worst: number;
  max_bid_best: number;
  retail_est: number;
  expected_profit: number;
  expected_margin: number;
  confidence: number;
  report_markdown: string | null;
  full_response: string | null;
  updated_at: number;
}

export interface ScoutRunRow {
  run_id: string;
  started_at: number;
  completed_at: number | null;
  duration_ms: number | null;
  fetched: number;
  parsed: number;
  new_listings: number;
  updated_listings: number;
  candidates: number;
  rejected: number;
  refreshed: number;
  candidate_rate: number;
  rejection_rate: number;
  top_rejection_reasons: string | null;  // JSON string
  error_summary: string | null;
}

export interface CategoryDefRow {
  id: string;
  name: string;
  enabled: number;
  min_score: number;
  requires_snapshot: number;
  keywords_positive: string | null;
  keywords_negative: string | null;
}
```

Usage:

```typescript
import { ListingRow } from './core/db-types';

const result = await env.DFG_DB.prepare<ListingRow>(`
  SELECT * FROM listings WHERE id = ?
`).bind(listingId).first();

if (result) {
  // TypeScript now knows result.title is string, result.current_bid is number | null, etc.
  console.log(result.title);
}
```

---

### DEBT-004: Subrequest Limit Management

**Priority:** P3 - Architecture
**Effort:** 4-6 hours (if implementing queues)
**Risk:** Hitting Cloudflare limits as sources grow

#### Problem

Manual subrequest tracking is fragile:

```typescript
const SUBREQUEST_LIMIT = 45;
const subreq = { count: 0 };

async function trackSubrequest<T>(...) {
  if (counter.count >= limit) {
    console.warn(`[Scout] Subrequest limit reached...`);
    return null;
  }
  counter.count++;
  return await operation();
}
```

#### Current Mitigation

The code already uses `ctx.waitUntil()` for background photo hydration, which helps. The issue is the main request path still needs many subrequests.

#### Future Architecture Options

**Option A: Cloudflare Queues (Recommended)**

```
[Scout Cron] → [Queue Producer] → [Queue Consumer Workers]
                                        ↓
                               Process 1 source per invocation
```

Benefits:
- Each queue consumer gets its own 50-subrequest budget
- Automatic retries
- Better observability

**Option B: Durable Objects**

Use Durable Objects for stateful source processing:
- Each source gets its own DO
- DOs can make unlimited subrequests over time
- More complex to implement

**For Now:** The current implementation works with 2 sources. Revisit when adding 3+ sources or if hitting limits.

---

### DEBT-005: Missing Observability

**Priority:** P3 - Operations
**Effort:** 2-3 hours
**Risk:** Difficult to debug production issues

#### Problem

Current logging is `console.log` based with no structured format:

```typescript
console.log(`[Scout] Starting run ${runId}...`);
console.warn(`[Scout] Skipped ${sourceName} due to subrequest limit`);
```

#### Recommendations

**Phase 1: Structured Logging**

```typescript
// workers/dfg-scout/src/core/logger.ts

interface LogContext {
  runId?: string;
  source?: string;
  auctionId?: string;
  listingId?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

function log(level: 'info' | 'warn' | 'error', message: string, ctx: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...ctx,
  };

  // Cloudflare Workers support structured logs
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),
};
```

**Phase 2: Add to Wrangler (Optional)**

```toml
[env.production.observability]
enabled = true
head_sampling_rate = 1
```

This enables Cloudflare's built-in observability features.

---

## GovPlanet Integration Guide

Based on the handoff document, GovPlanet should be the next source to add. Here's a complete implementation guide.

### Step 1: Copy IronPlanet Adapter

```bash
cd workers/dfg-scout/src/sources
cp -r ironplanet govplanet
```

### Step 2: Modify GovPlanet Adapter

`workers/dfg-scout/src/sources/govplanet/adapter.ts`:

```typescript
import type { AdapterContext, NormalizedLot, NormalizedSourceAdapter } from '../../core/types';
import { registry } from '../../core/registry';
import { safeNormalizeGovPlanetLot, type GovPlanetQuickview } from './normalize';

const BASE_URL = 'https://www.govplanet.com';
const SEARCH_PATH = '/jsp/s/search.ips';

// GovPlanet categories (different from IronPlanet)
// Research these by browsing govplanet.com and inspecting URLs
export const GOVPLANET_CATEGORIES = {
  TRUCKS_TRAILERS: { ct: '3' },
  // Add specific categories after research
} as const;

const DEFAULT_SEARCH_CONFIG = {
  ct: '3',           // Trucks & Trailers (verify this)
  l2: 'USA-AZ',      // Arizona
  sm: '0',
};

// ... rest of adapter (same as IronPlanet but with source: 'govplanet')

export const GovPlanetAdapter: NormalizedSourceAdapter = {
  source: 'govplanet',

  async fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>> {
    return [
      {
        auctionId: 'gov-az-trucks-trailers',
        title: 'GovPlanet Arizona Trucks & Trailers',
        searchParams: { ...DEFAULT_SEARCH_CONFIG },
      },
    ];
  },

  // ... copy other methods from IronPlanet, updating source name
};

registry.register(GovPlanetAdapter);
```

### Step 3: Modify Normalize

`workers/dfg-scout/src/sources/govplanet/normalize.ts`:

```typescript
// Copy from ironplanet/normalize.ts
// Change source: 'ironplanet' to source: 'govplanet'
// Update type names: IronPlanetQuickview → GovPlanetQuickview
```

### Step 4: Register in Pipeline

`workers/dfg-scout/src/core/pipeline/runScout.ts`:

```typescript
import '../../sources/sierra/adapter';
import '../../sources/ironplanet/adapter';
import '../../sources/govplanet/adapter';  // Add this
```

### Step 5: Add Database Mapping

Create migration `workers/dfg-scout/migrations/007-add-govplanet-source.sql`:

```sql
-- Add GovPlanet to source_category_map
INSERT INTO source_category_map (source, category_id, enabled, search_params)
VALUES
  ('govplanet', 'buy_box', 1, '{"ct":"3","l2":"USA-AZ"}'),
  ('govplanet', 'fleet_trucks', 1, '{"ct":"3","l2":"USA-AZ"}')
ON CONFLICT(source, category_id) DO UPDATE SET
  enabled = excluded.enabled,
  search_params = excluded.search_params;
```

Run migration:

```bash
cd workers/dfg-scout
npx wrangler d1 execute dfg-scout-db --remote --file=migrations/007-add-govplanet-source.sql
```

### Step 6: Update Frontend

**Add to types:**

`frontend/src/lib/types/index.ts`:

```typescript
export type AuctionSource = 'sierra_auction' | 'ironplanet' | 'govplanet';
```

**Add to source mapping:**

`frontend/src/app/api/scout/run/route.ts`:

```typescript
const sourceMap: Record<string, string> = {
  sierra_auction: 'sierra',
  ironplanet: 'ironplanet',
  govplanet: 'govplanet',  // Add
};
```

**Add to UI dropdowns:**

Update these files to include GovPlanet in source lists:
- `frontend/src/components/features/pipeline-status.tsx`
- `frontend/src/app/(dashboard)/settings/page.tsx`
- `frontend/src/app/(dashboard)/opportunities/page.tsx`

### Step 7: Deploy

```bash
# Deploy Scout with new adapter
cd workers/dfg-scout
npx wrangler deploy --env production

# Verify
curl -H "Authorization: Bearer $OPS_TOKEN" \
  https://dfg-scout.automation-ab6.workers.dev/debug/sources
# Should include 'govplanet'
```

### Step 8: Test

```bash
# Run GovPlanet scout
curl -X POST -H "Authorization: Bearer $OPS_TOKEN" \
  "https://dfg-scout.automation-ab6.workers.dev/ops/run?source=govplanet"

# Check results
curl -H "Authorization: Bearer $OPS_TOKEN" \
  "https://dfg-scout.automation-ab6.workers.dev/ops/listings?source=govplanet&status=candidate"
```

---

## Appendix A: File Reference

| Issue | Primary File(s) |
|-------|----------------|
| CRIT-001 | `workers/dfg-scout/src/index.ts:21-60` |
| CRIT-002 | `workers/dfg-scout/wrangler.toml` |
| CRIT-003 | `workers/dfg-scout/src/core/env.ts`, `runScout.ts:9-12` |
| MOD-001 | `workers/dfg-scout/src/index.ts`, `frontend/src/app/api/scout/run/route.ts` |
| MOD-002 | `workers/dfg-scout/src/sources/ironplanet/adapter.ts:180-195` |
| MOD-003 | `workers/dfg-analyst/src/worker.ts` |
| MOD-004 | `workers/dfg-scout/src/core/pipeline/runScout.ts:381` |
| DEBT-001 | `workers/dfg-scout/src/sources/ironplanet/*.test.ts` (create) |
| DEBT-002 | `workers/dfg-analyst/src/phoenix-market-data.ts` |
| DEBT-003 | `workers/dfg-scout/src/core/db-types.ts` (create) |
| DEBT-004 | `workers/dfg-scout/src/core/pipeline/runScout.ts` |
| DEBT-005 | `workers/dfg-scout/src/core/logger.ts` (create) |

---

## Appendix B: Effort Estimates

| Issue ID | Effort | Dependencies |
|----------|--------|--------------|
| CRIT-001 | 30 min | None |
| CRIT-002 | 15 min | None |
| CRIT-003 | 20 min | None |
| MOD-001 | 1 hr | None |
| MOD-002 | 2 hr | None |
| MOD-003 | 1.5 hr | None |
| MOD-004 | 15 min | None |
| DEBT-001 | 4-6 hr | None |
| DEBT-002 | 3-4 hr | Database migration |
| DEBT-003 | 2 hr | None |
| DEBT-004 | 4-6 hr | Cloudflare Queues setup |
| DEBT-005 | 2-3 hr | None |
| GovPlanet | 3-4 hr | CRIT-001 through MOD-001 |

**Total Critical:** ~1 hour
**Total Moderate:** ~5 hours
**Total Tech Debt:** ~15-20 hours
**GovPlanet Integration:** ~4 hours

---

## Appendix C: Verification Commands

```bash
# Verify Scout deployment
curl https://dfg-scout.automation-ab6.workers.dev/health

# Check registered sources
curl -H "Authorization: Bearer $OPS_TOKEN" \
  https://dfg-scout.automation-ab6.workers.dev/ops/stats

# Run scout for specific source
curl -X POST -H "Authorization: Bearer $OPS_TOKEN" \
  "https://dfg-scout.automation-ab6.workers.dev/ops/run?source=ironplanet"

# Check candidates
curl -H "Authorization: Bearer $OPS_TOKEN" \
  "https://dfg-scout.automation-ab6.workers.dev/ops/listings?status=candidate&limit=10"

# Tail production logs
cd workers/dfg-scout
npx wrangler tail --env production
```

---

*Document Version: 1.0*
*Last Updated: December 24, 2025*

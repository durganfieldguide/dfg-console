# IronPlanet Integration - Dev Team Handoff

**Date:** December 23, 2025
**Status:** MVP Complete - Production Deployed
**Priority:** Continue with GovPlanet (shares IronPlanet infrastructure)

---

## Executive Summary

IronPlanet has been successfully integrated as the second source in the DFG Scout pipeline. The integration follows the established adapter pattern used by Sierra Auction, enabling modular source addition. Listings are being fetched, normalized, categorized, and displayed in the frontend.

---

## What Was Accomplished

### 1. IronPlanet Source Adapter

**Files Created:**
- `workers/dfg-scout/src/sources/ironplanet/adapter.ts` - Main adapter implementation
- `workers/dfg-scout/src/sources/ironplanet/normalize.ts` - Data normalization logic

**Key Implementation Details:**

Unlike Sierra (which has a GraphQL API), IronPlanet embeds listing data directly in HTML as JavaScript arrays:

```javascript
// IronPlanet embeds data like this in <script> tags:
quickviews.push({"equipId":"14109982","description":"2016 Load Trail...","convPrice":"US $21,000",...});
```

The adapter extracts these JSON objects by:
1. Finding `quickviews.push(` in the HTML
2. Counting braces to find the matching closing brace
3. Parsing the extracted JSON string

**Important:** The regex approach was insufficient because the JSON objects contain nested structures and escaped HTML. The current brace-counting approach handles this correctly.

```typescript
// adapter.ts - Core extraction logic (lines 61-112)
function extractQuickviews(html: string): IronPlanetQuickview[] {
  const pushPrefix = 'quickviews.push(';
  // ... brace counting to extract valid JSON objects
}
```

### 2. Database Schema Updates

**Migration Created:** `workers/dfg-scout/migrations/006-add-ironplanet-source.sql`

This migration:
- Creates `source_category_map` table (maps sources to categories with search params)
- Seeds IronPlanet category mappings for `buy_box` and `fleet_trucks`

**Category Keywords Updated** (directly in D1):
- `buy_box`: Added trailer-specific keywords (`gooseneck`, `lowboy`, `drop deck`, `transport trailer`, `hydraulic tail`, `tag trailer`)
- `fleet_trucks`: Added truck keywords (`van truck`, `box truck`, `step van`, `water truck`, `freightliner`, `kenworth`, `peterbilt`, `international`, `mack`, `volvo vnr/vnl`, `f-450/550/650/750`)

### 3. Frontend Integration

**Files Modified:**
- `frontend/src/lib/types/index.ts` - Added `'ironplanet'` to `AuctionSource` type
- `frontend/src/app/api/scout/run/route.ts` - Added source mapping
- `frontend/src/components/features/pipeline-status.tsx` - Added source labels, marked as active
- `frontend/src/app/(dashboard)/settings/page.tsx` - Added to SOURCES array
- `frontend/src/app/(dashboard)/opportunities/page.tsx` - Added to source filter options

### 4. Backend Pipeline Integration

**Files Modified:**
- `workers/dfg-scout/src/core/pipeline/runScout.ts` - Import for auto-registration
- `workers/dfg-scout/src/core/pipeline/getStats.ts` - Dynamic source list from registry

**Critical Fix:** Deployment must use `--env production` flag:
```bash
npx wrangler deploy --env production
```
Without this flag, D1/KV/R2 bindings are not attached (they're only defined under `[env.production]` in wrangler.toml).

---

## Architecture Overview

### Source Adapter Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        runScout.ts                               │
│  - Imports adapters (triggers registration)                      │
│  - Gets adapter from registry by source name                     │
│  - Calls adapter.fetchActiveAuctions() → adapter.fetchLotsNormalized() │
│  - Passes lots through CategoryRouter                            │
│  - Stores candidates/rejected in D1                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        registry.ts                               │
│  - Singleton SourceRegistry                                      │
│  - Adapters self-register on import via registry.register()      │
│  - runScout calls registry.get('ironplanet') to get adapter      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│   Sierra Adapter     │        │  IronPlanet Adapter  │
│   - GraphQL API      │        │  - HTML Scraping     │
│   - Real auctions    │        │  - Virtual auctions  │
└──────────────────────┘        └──────────────────────┘
```

### NormalizedSourceAdapter Interface

Every adapter must implement:

```typescript
interface NormalizedSourceAdapter {
  source: string;  // e.g., 'ironplanet'

  // Returns list of "auctions" (or virtual search categories)
  fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>>;

  // Fetch raw lots for an auction
  fetchLots(auctionId: string, ctx?: AdapterContext): Promise<unknown[]>;

  // Fetch and normalize lots to canonical NormalizedLot format
  fetchLotsNormalized(auctionId: string, ctx?: AdapterContext): Promise<NormalizedLot[]>;

  // Optional: Fetch additional photos for a lot
  hydratePhotosForLot?(lotId: string, ctx?: AdapterContext): Promise<string[]>;
}
```

### NormalizedLot Schema

All sources must produce this canonical format:

```typescript
interface NormalizedLot {
  source: string;
  sourceId: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  photos: string[];
  photoCount: number;
  location: { city: string; state: string; country: string } | null;
  price: { amount: number; currency: string } | null;
  priceKind: 'current_bid' | 'starting_bid' | 'buy_now' | 'none';
  priceVerified: boolean;
  auctionStatus: 'upcoming' | 'live' | 'ended' | 'buy_now';
  endTime: string | null;  // ISO timestamp
  auctionId: string;
  auctionTitle: string;
}
```

---

## Current State

### What's Working
- IronPlanet listings are fetched from Arizona Trucks & Trailers category
- Listings are normalized and stored in D1
- CategoryRouter assigns categories based on keyword matching
- Frontend displays IronPlanet as a source option
- Run Scout works for IronPlanet from the dashboard
- Analyze button works on IronPlanet listings

### Known Limitations

1. **Single Search Category:** Currently only fetches `ct=3` (Trucks & Trailers) for Arizona. The adapter supports multiple "virtual auctions" but only one is configured.

2. **Pagination:** IronPlanet doesn't have traditional pagination. The first page load (~96 items) is captured. To get more coverage, add more category-specific searches.

3. **Uncategorized Listings:** Some listings show as "Uncategorized" because the CategoryRouter keywords don't match. This is a data quality issue, not a bug. Expand keywords in `category_defs` as needed.

4. **No End Time Parsing:** IronPlanet shows dates like "Jan 8" or "Dec 29" without year/time. The normalizer makes best-effort guesses but may be inaccurate.

5. **Price Parsing:** Some listings have no price (just "Make Offer"). These are stored with `priceKind: 'none'` and may be rejected by the router.

---

## Next Steps

### Immediate: GovPlanet Integration

GovPlanet is owned by the same company as IronPlanet and uses **identical page structure**. Implementation should be straightforward:

1. Copy `sources/ironplanet/` to `sources/govplanet/`
2. Change `BASE_URL` to `https://www.govplanet.com`
3. Adjust search parameters (GovPlanet has different categories)
4. Register the adapter
5. Add to frontend

### Future Sources (from spec)

| Source | API Type | Notes |
|--------|----------|-------|
| GovPlanet | HTML (same as IronPlanet) | Government surplus |
| Purple Wave | JSON API | Has documented API |
| Public Surplus | HTML | Government/municipal surplus |

### Recommended Improvements

1. **Add More IronPlanet Categories:**
   ```typescript
   // In fetchActiveAuctions(), add more virtual auctions:
   { auctionId: 'az-utility-trailers', searchParams: { ct: '3', c: '2268', l2: 'USA-AZ' } },
   { auctionId: 'az-flatbed-trailers', searchParams: { ct: '3', c: '2252', l2: 'USA-AZ' } },
   ```

2. **Expand Geographic Coverage:**
   - Add searches for neighboring states (NV, CA, NM, UT)
   - Consider distance-based filtering in router

3. **Scheduled Runs:**
   - Scout has a cron trigger (`*/15 * * * *`) but currently only runs Sierra
   - Consider adding IronPlanet to scheduled runs

4. **Deduplication:**
   - IronPlanet listings may appear across multiple searches
   - Current dedup is by `source:sourceId` composite key (handled by DB UNIQUE constraint)

---

## File Reference

### Backend (dfg-scout worker)

| File | Purpose |
|------|---------|
| `src/sources/ironplanet/adapter.ts` | Main adapter, HTML parsing, registry |
| `src/sources/ironplanet/normalize.ts` | Price/time/location normalization |
| `src/core/registry.ts` | Source adapter registry |
| `src/core/pipeline/runScout.ts` | Main pipeline orchestration |
| `src/core/pipeline/getStats.ts` | Stats endpoint, source list |
| `src/categories/router.ts` | Category matching logic |
| `migrations/006-add-ironplanet-source.sql` | DB schema/seed |

### Frontend

| File | Purpose |
|------|---------|
| `src/lib/types/index.ts` | AuctionSource type |
| `src/app/api/scout/run/route.ts` | Run Scout API route |
| `src/components/features/pipeline-status.tsx` | Source dropdown |
| `src/app/(dashboard)/settings/page.tsx` | Settings page sources |
| `src/app/(dashboard)/opportunities/page.tsx` | Opportunities filter |

---

## Deployment Commands

```bash
# Deploy Scout worker (MUST use --env production)
cd workers/dfg-scout
npx wrangler deploy --env production

# Run migrations
npx wrangler d1 execute dfg-scout-db --remote --file=migrations/006-add-ironplanet-source.sql

# Check database
npx wrangler d1 execute dfg-scout-db --remote --command "SELECT COUNT(*), source FROM listings GROUP BY source;"

# View logs
npx wrangler tail --env production

# Test debug endpoint
curl https://dfg-scout.automation-ab6.workers.dev/debug/sources
```

---

## Troubleshooting

### "Cannot read properties of undefined (reading 'prepare')"
- **Cause:** Deployed without `--env production`
- **Fix:** `npx wrangler deploy --env production`

### "0 candidates" from IronPlanet
- **Cause:** HTML parsing failed (structure changed)
- **Debug:** Fetch the URL manually and check if `quickviews.push(` still exists
- **Fix:** Update `extractQuickviews()` regex/logic

### Listings showing as "Uncategorized"
- **Cause:** No keyword match in `category_defs`
- **Fix:** Add relevant keywords to the category's `keywords_positive` field

### Sources not appearing in dropdown
- **Cause:** `getStats` not returning sources array
- **Debug:** Check `/debug/sources` endpoint
- **Fix:** Ensure adapter imports in `getStats.ts` aren't tree-shaken

---

## Contact

For questions about this integration, reference:
- This document
- The original Technical Specifications (provided by user)
- Sierra adapter as reference implementation (`src/sources/sierra/`)

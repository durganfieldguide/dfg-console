# Git Worktrees for Parallel Development - Analysis

**Date:** 2026-01-07
**Issue:** #172
**Status:** ⚠️ Type consolidation required before parallel work

---

## Executive Summary

Git worktrees can enable parallel Claude Code sessions for DFG development, but **critical preparation is needed first**. The codebase has significant type duplication across workers and the app, creating guaranteed merge conflicts if parallel sessions modify types.

**Verdict:** Fix types first (2-3 hours), then worktrees become low-risk and high-value.

---

## Codebase Structure

### Components

| Component | Lines | Purpose | Dependencies |
|-----------|-------|---------|--------------|
| `dfg-app` | ~10.6K | Next.js operator console | None (@dfg packages unused) |
| `dfg-analyst` | ~15K | AI analysis engine | `@dfg/money-math` |
| `dfg-api` | ~5.5K | REST API, CRUD operations | `@sentry/cloudflare` |
| `dfg-scout` | ~3.7K | Auction scraping pipeline | None |
| `dfg-relay` | ~500 | GitHub issue integration | None |

### Shared Packages

| Package | Purpose | Used By | Status |
|---------|---------|---------|--------|
| `@dfg/types` | Shared TypeScript types | **NONE** | ❌ Exists but unused |
| `@dfg/money-math` | Canonical financial calculations | `dfg-analyst` | ✅ Used correctly |

---

## Critical Issue: Type Duplication

### The Problem

Identical types are defined in **4 separate locations** with no shared imports:

```
packages/dfg-types/src/index.ts         ← Intended shared location (UNUSED)
apps/dfg-app/src/types/index.ts         ← App duplicates
workers/dfg-api/src/core/types.ts       ← API worker duplicates
workers/dfg-analyst/src/types.ts        ← Analyst-specific types
workers/dfg-scout/src/core/types.ts     ← Scout-specific types
```

### Duplicated Types

**Shared across app + API worker:**
- `OpportunityStatus` (9 states: inbox → qualifying → watch → inspect → bid → won/lost/rejected/archived)
- `RejectionReason` (7+ values, different sets!)
- `WatchTrigger`, `AlertType`, `AlertSeverity`
- `UniversalFacts`, `TrailerFacts`, `CategoryFacts`, `ObservedFacts`
- `WatchThreshold`, `Alert`, `Source`

**Risk Example:**
- Session A (Analysis stream): Updates `RejectionReason` in `dfg-api/src/core/types.ts`
- Session B (UI stream): Updates `RejectionReason` in `dfg-app/src/types/index.ts`
- Session C (Main): Updates `RejectionReason` in `@dfg/types`
- **Result:** Merge conflict + runtime type mismatches

### Why This Happened

The `@dfg/types` package exists but:
1. App doesn't import from it (has local copy)
2. API worker doesn't import from it (has local copy)
3. No build-time enforcement

---

## Proposed Work Streams

### Stream 1: Analysis + UI (Sprint N+8)

**Files:**
- `workers/dfg-analyst/src/**` (analysis engine, prompts, category config)
- `apps/dfg-app/src/app/opportunities/[id]/**` (opportunity detail pages)
- `apps/dfg-app/src/components/features/**` (analysis display components)

**Work Examples:**
- #145: Core Risk vs Optional Value-Add Tagging
- #146: Buyer Impact Context on Every Defect
- #152: Single Source of Truth for Exit Pricing
- #153: Remove Score Vanity Metric
- #154: Report/Deal Review as Default View

**Independence:** Medium
**Conflict Risk:** Low (after types consolidated)
**Shared Dependencies:** `@dfg/types`, `@dfg/money-math`

### Stream 2: Sources (New Adapters)

**Files:**
- `workers/dfg-scout/src/sources/**` (adapter implementations)
- `workers/dfg-scout/src/categories/router.ts` (category classifier)
- `workers/dfg-scout/src/core/registry.ts` (adapter registration)

**Work Examples:**
- Add GovPlanet adapter
- Add Ritchie Bros adapter
- Expand category taxonomy

**Independence:** Very High
**Conflict Risk:** Very Low
**Shared Dependencies:** None

### Stream 3: App UI (General)

**Files:**
- `apps/dfg-app/src/components/**` (shared UI components)
- `apps/dfg-app/src/app/**` (pages, layouts, routing)
- `apps/dfg-app/src/lib/**` (utilities, hooks)

**Work Examples:**
- Navigation improvements
- Dashboard enhancements
- Filter system updates

**Independence:** Medium
**Conflict Risk:** Medium (shared types, shared components)
**Shared Dependencies:** `@dfg/types`

---

## File Boundaries by Stream

### Analysis + UI Stream

**Can Modify:**
- `workers/dfg-analyst/**` (except `worker.ts` entry point)
- `apps/dfg-app/src/app/opportunities/[id]/**`
- `apps/dfg-app/src/components/features/analysis-*.tsx`
- `apps/dfg-app/src/components/features/buyer-*.tsx`
- `apps/dfg-app/src/components/features/verdict-*.tsx`
- `apps/dfg-app/src/components/features/risk-*.tsx`

**Should NOT Modify:**
- `workers/dfg-api/**` (API contracts)
- `workers/dfg-scout/**` (scraping pipeline)
- `apps/dfg-app/src/app/layout.tsx` (root layout)
- `apps/dfg-app/src/components/ui/**` (shared primitives)

### Sources Stream

**Can Modify:**
- `workers/dfg-scout/src/sources/**`
- `workers/dfg-scout/src/categories/**`
- `workers/dfg-scout/src/core/registry.ts`
- `workers/dfg-scout/src/core/types.ts` (scout-specific types)

**Should NOT Modify:**
- `workers/dfg-analyst/**`
- `workers/dfg-api/**`
- `apps/dfg-app/**`

### App UI Stream

**Can Modify:**
- `apps/dfg-app/src/components/**` (except features owned by Analysis stream)
- `apps/dfg-app/src/app/**` (except `/opportunities/[id]/**`)
- `apps/dfg-app/src/lib/**`
- `apps/dfg-app/src/hooks/**`

**Should NOT Modify:**
- `workers/**` (any worker)
- `apps/dfg-app/src/app/opportunities/[id]/**` (owned by Analysis stream)

---

## Conflict Zones (After Type Consolidation)

### High Risk (Avoid Parallel Changes)

| File | Why |
|------|-----|
| `packages/dfg-types/src/index.ts` | Shared types - coordinate changes |
| `packages/dfg-money-math/src/**` | Canonical calculations - single source of truth |
| `apps/dfg-app/src/lib/utils.ts` | Shared utilities |
| `apps/dfg-app/src/components/ui/**` | Primitive components |

### Medium Risk (Coordinate if Possible)

| File | Why |
|------|-----|
| `workers/dfg-api/src/routes/opportunities.ts` | API contract changes |
| `apps/dfg-app/src/app/layout.tsx` | Root layout |
| `apps/dfg-app/CLAUDE.md` | Shared guidance |
| `CLAUDE.md` (root) | Shared guidance |

### Low Risk (Safe for Parallel)

| Path | Why |
|------|-----|
| `workers/dfg-scout/src/sources/**` | Isolated adapters |
| `workers/dfg-analyst/src/prompts*.ts` | Category-specific prompts |
| `apps/dfg-app/src/app/opportunities/[id]/**` | Feature-isolated pages |
| `apps/dfg-app/src/components/features/**` | Feature components |

---

## Preparation Checklist

### Phase 1: Type Consolidation (Required)

**Time Estimate:** 2-3 hours

- [ ] **Step 1:** Audit type differences
  - Compare `OpportunityStatus`, `RejectionReason` across app/API/types
  - Identify canonical version (likely API worker has most complete)
  - Document any breaking changes

- [ ] **Step 2:** Consolidate into `@dfg/types`
  - Copy canonical types from `workers/dfg-api/src/core/types.ts`
  - Ensure `packages/dfg-types/src/index.ts` exports all shared types
  - Add any missing types from app/worker implementations

- [ ] **Step 3:** Update imports in `dfg-app`
  ```typescript
  // Before
  import type { OpportunityStatus } from '@/types';

  // After
  import type { OpportunityStatus } from '@dfg/types';
  ```
  - Update `apps/dfg-app/package.json` to depend on `@dfg/types`
  - Update all imports in `apps/dfg-app/src/**`
  - Delete `apps/dfg-app/src/types/index.ts`

- [ ] **Step 4:** Update imports in `dfg-api`
  ```typescript
  // Before
  import type { OpportunityStatus } from '../core/types';

  // After (for shared types)
  import type { OpportunityStatus } from '@dfg/types';
  ```
  - Update `workers/dfg-api/package.json` to depend on `@dfg/types`
  - Update imports for shared types
  - Keep API-specific types in `src/core/types.ts` (like `OpportunityRow`)

- [ ] **Step 5:** Verify builds
  ```bash
  cd packages/dfg-types && npm run build
  cd ../../apps/dfg-app && npm run type-check
  cd ../../workers/dfg-api && npx tsc --noEmit
  cd ../dfg-analyst && npx tsc --noEmit
  ```

- [ ] **Step 6:** Commit and push
  ```bash
  git add .
  git commit -m "refactor: consolidate types into @dfg/types package"
  ```

### Phase 2: Boundary Documentation (Optional)

**Time Estimate:** 30 minutes

- [ ] Update `workers/dfg-analyst/CLAUDE.md`
  - Add "File Boundaries" section
  - List files owned by Analysis stream

- [ ] Update `workers/dfg-scout/CLAUDE.md`
  - Add "File Boundaries" section
  - List files owned by Sources stream

- [ ] Update `apps/dfg-app/CLAUDE.md`
  - Add "File Boundaries" section
  - List files owned by UI stream vs Analysis stream

### Phase 3: Worktree Setup (When Ready)

**Time Estimate:** 5 minutes

```bash
# Main branch (stays in current location)
cd /path/to/dfg

# Create worktree for Analysis + UI stream
git worktree add ../dfg-analysis main

# Create worktree for Sources stream
git worktree add ../dfg-sources main

# Each worktree gets its own Claude Code session
```

---

## Alternative: Just Start and Deal With It

If you want to skip preparation and learn by doing:

**Pros:**
- Start parallel work immediately
- Discover real conflict patterns organically
- Less upfront planning

**Cons:**
- Guaranteed type conflicts on first merge
- Wasted time resolving conflicts
- Risk of introducing type mismatches
- Frustrating developer experience

**Recommendation:** Don't do this. The type consolidation is <3 hours and prevents days of debugging.

---

## Recommendations

### Short Term (This Week)

1. ✅ **Execute Phase 1** (Type Consolidation)
   - Single PR, focused scope
   - High value, low risk
   - Unblocks all parallel work

2. ⏸️ **Hold on Worktrees** until types are consolidated

### Medium Term (Next Sprint)

1. **After types consolidated:**
   - Analysis + UI stream: Ready for parallel work
   - Sources stream: Already isolated, can start anytime

2. **Assign streams to sessions:**
   - Session 1 (Main): Sprint N+8 coordination, API changes
   - Session 2 (Worktree): Analysis implementation (#145, #146, #152)
   - Session 3 (Worktree): Sources expansion (GovPlanet, Ritchie Bros)

### Long Term (Future Optimization)

1. **Extract more shared packages:**
   - `@dfg/api-client` - Typed API client for app
   - `@dfg/ui` - Shared UI components
   - `@dfg/test-utils` - Shared test utilities

2. **Enforce boundaries:**
   - ESLint rules for import restrictions
   - CODEOWNERS for conflict zones
   - Pre-commit hooks for type consistency

---

## Appendix: Type Inventory

### Currently in @dfg/types

```typescript
// Opportunity lifecycle
OpportunityStatus
RejectionReason
WatchTrigger
AlertType
AlertSeverity

// Domain models
Alert
WatchThreshold
UniversalFacts
TrailerFacts
CategoryFacts
ObservedFacts
Source
SourceDefaults

// API contracts
ApiResponse<T>
ApiError
ListResponse<T>
DashboardStats

// State machine
STATE_TRANSITIONS
canTransition()
```

### Missing from @dfg/types (should be added)

```typescript
// From dfg-api (API-specific)
OpportunityRow         // D1 database row
OpportunityProjection  // API response shape
OperatorAction         // Action history

// From dfg-app (UI-specific)
OpportunitySummary     // List view shape
OpportunityDetail      // Detail view shape
```

### Worker-Specific (Keep Local)

```typescript
// dfg-analyst
ListingData            // Analyst ingress contract
ConditionAssessment    // AI output
BuyerPerceptionLens    // AI output
AnalystVerdict         // AI output

// dfg-scout
NormalizedLot          // Scout output contract
PriceKind              // Price classification
LotStatus              // Auction lifecycle
RouterInput            // Category router input
```

---

## Questions?

Post in issue #172 or ping @Dev team in handoff.

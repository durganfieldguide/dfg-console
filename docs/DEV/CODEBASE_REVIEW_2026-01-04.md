# DFG Codebase Review: Architecture Audit

**Date:** 2026-01-04
**Scope:** Full monorepo review for SaaS readiness
**Status:** Complete

---

## Executive Summary

The DFG platform has a **solid architectural foundation** with good separation of concerns between workers and clear type definitions. However, there are several areas needing attention before SaaS deployment: **duplicate data models**, **missing authentication infrastructure**, **type inconsistencies**, and **incomplete adapter abstraction**.

### Verdict: **Good Foundation, Needs Hardening**

---

## 1. Architecture Overview

### Current Structure
```
dfg/
├── apps/
│   └── dfg-app/          # Next.js frontend (operator console)
├── workers/
│   ├── dfg-scout/        # Listing discovery + categorization
│   ├── dfg-api/          # Operator workflow API
│   ├── dfg-analyst/      # AI analysis (GPT-4 Vision)
│   └── dfg-relay/        # CORS proxy for external APIs
├── packages/
│   └── dfg-data-gateway/ # Shared utilities (minimal)
└── _archived/            # Legacy code
```

### Data Flow
```
Sources → dfg-scout → D1 (listings) → dfg-api → D1 (opportunities) → dfg-app
                ↓                           ↓
           dfg-analyst ←────────────────────┘
```

---

## 2. What's Working Well

### 2.1 Adapter Pattern (dfg-scout)
**Location:** `workers/dfg-scout/src/sources/*/adapter.ts`

The source adapter system is **well-designed for extensibility**:
- Clean `NormalizedSourceAdapter` interface (`src/core/types.ts:227-235`)
- Self-registering adapters via side-effect imports
- Registry pattern allows runtime source discovery
- Adapters normalize diverse APIs into unified `NormalizedLot` format

```typescript
// Adding a new source is straightforward:
// 1. Create adapter implementing NormalizedSourceAdapter
// 2. Call registry.register(adapter) on import
// 3. runScout automatically picks it up
```

### 2.2 Category Router (dfg-scout)
**Location:** `workers/dfg-scout/src/categories/router.ts`

- Database-driven category definitions (no code changes to add categories)
- Source-to-category mapping via `source_category_map` table
- Keyword-based scoring with positive/negative weighting
- Hard gate system for auto-rejection rules

### 2.3 State Machine (dfg-api)
**Location:** `workers/dfg-api/src/core/types.ts:33-47`

- Well-defined opportunity status transitions
- Validation prevents invalid state changes
- Audit trail via `operator_actions` table

### 2.4 Analysis Persistence
**Location:** `workers/dfg-api/src/routes/opportunities.ts:1399-1639`

- Analysis results properly persisted to `analysis_runs` table
- Staleness detection for re-analysis triggers
- Gate computation with operator input integration

### 2.5 Frontend Architecture
**Location:** `apps/dfg-app/`

- Clean component structure (UI/features separation)
- API proxy keeps tokens server-side
- Responsive design with mobile-first hamburger nav
- Good use of TypeScript with proper typing

---

## 3. Critical Issues

### 3.1 CRITICAL: Duplicate Data Models (listings vs opportunities)

**Problem:** Two separate tables store the same data with different schemas.

| Table | Worker | Schema | Purpose |
|-------|--------|--------|---------|
| `listings` | dfg-scout | Unix timestamps, snake_case | Raw discovery |
| `opportunities` | dfg-api | ISO strings, snake_case | Operator workflow |

**Impact:**
- Data sync required between tables (fragile)
- Inconsistent field naming (`end_time` vs `auction_ends_at`)
- Timestamp format mismatch (epoch vs ISO)
- `listing_id` FK on opportunities often NULL

**Recommendation:**
1. **Short-term:** Add proper sync validation and error handling
2. **Long-term:** Migrate to single table with status field indicating "raw" vs "triaged"

### 3.2 CRITICAL: No Multi-Tenant Foundation

**Problem:** No `tenant_id` column anywhere in the schema.

**Impact:** Cannot support multiple users/organizations without major migration.

**Files needing changes:**
- `workers/dfg-scout/migrations/schema.sql`
- `workers/dfg-api/migrations/0001_opportunities.sql`
- All router and query logic

**Recommendation:** Add `tenant_id TEXT NOT NULL DEFAULT 'default'` to:
- `listings`
- `opportunities`
- `category_defs`
- `source_category_map`
- All analysis tables

### 3.3 HIGH: Authentication is Placeholder-Only

**Location:** `apps/dfg-app/src/app/api/auth/[...nextauth]/route.ts`

```typescript
// Current: Passwords in environment variable
const allowedUsers = process.env.ALLOWED_USERS || '';
// Format: "email1:password1,email2:password2"
```

**Issues:**
- Plaintext passwords in env vars
- No password hashing
- No user database
- No role-based access control
- 30-day JWT expiry is too long

**Recommendation for SaaS:**
1. Add `users` table with hashed passwords (bcrypt)
2. Implement proper session management
3. Add role-based permissions (admin, operator, viewer)
4. Consider OAuth providers for enterprise customers

### 3.4 HIGH: Type Duplication Across Packages

**Problem:** Same types defined in multiple places:

| Type | dfg-scout | dfg-api | dfg-app |
|------|-----------|---------|---------|
| OpportunityStatus | - | `src/core/types.ts` | `src/types/index.ts` |
| OperatorInputs | - | `src/core/types.ts` | via api.ts |
| Alert types | - | `src/core/types.ts` | `src/types/index.ts` |

**Recommendation:** Create shared `@dfg/types` package in `packages/` with canonical type definitions, imported by all workers and the app.

---

## 4. Security Vulnerabilities

### 4.1 API Token Exposure Risk

**Location:** `apps/dfg-app/src/app/api/[...path]/route.ts:88`

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiToken}`,
},
```

**Issue:** Single static `OPS_TOKEN` used for all API calls. No per-user tokens.

**Recommendation:**
1. Generate per-session tokens
2. Implement token refresh mechanism
3. Add rate limiting per token

### 4.2 SQL Injection Potential

**Location:** `workers/dfg-api/src/routes/opportunities.ts:135-330`

The query building uses string interpolation in several places:
```typescript
query += ` AND julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > ${STALE_THRESHOLD_DAYS}`;
```

While `STALE_THRESHOLD_DAYS` is derived from env vars (not user input), this pattern is risky.

**Recommendation:** Use parameterized queries consistently:
```typescript
query += ` AND julianday('now') - julianday(...) > ?`;
params.push(STALE_THRESHOLD_DAYS);
```

### 4.3 Debug Endpoints in Production

**Location:** `workers/dfg-scout/src/index.ts:22-64`

Debug endpoints expose internal state:
- `/debug/analyses`
- `/debug/sources`
- `/debug/analysis/:id`

**Issue:** Even with auth, these shouldn't exist in production.

**Recommendation:** Gate behind `ENVIRONMENT === 'development'`.

### 4.4 CORS is Wide Open

**Location:** `workers/dfg-api/src/index.ts:37-45`

```typescript
'Access-Control-Allow-Origin': '*',
```

**Recommendation:** Restrict to known origins in production.

---

## 5. Technical Debt

### 5.1 Hardcoded Business Logic

**Locations:**
- `workers/dfg-scout/src/categories/router.ts:193-224` - Global negatives
- `workers/dfg-scout/src/core/env.ts:25-26` - Max bid defaults
- `workers/dfg-api/src/routes/opportunities.ts:132-133` - Staleness thresholds

**Recommendation:** Move to `category_defs` or new `config` table.

### 5.2 Source Name Inconsistency

**Problem:** `sierra` vs `sierra_auction` used interchangeably.

**Locations:**
- `workers/dfg-scout/src/index.ts:111` - Maps `sierra_auction` → `sierra`
- `workers/dfg-scout/src/index.ts:167` - Maps `sierra` → `sierra_auction`
- `workers/dfg-api/migrations/0001_opportunities.sql:32` - Seeds as `sierra_auction`

**Recommendation:** Pick one canonical name and update all references.

### 5.3 Unused/Dead Code

| File | Issue |
|------|-------|
| `packages/dfg-data-gateway/` | Contains only `makeRunId()` - minimal utility |
| `workers/dfg-scout/src/core/pipeline/runScout.ts:8-21` | Commented R2 proxy code |
| `_archived/` | Legacy code should be removed |

### 5.4 Missing `/sources` Page

**Location:** `apps/dfg-app/src/components/Navigation.tsx:22`

Navigation links to `/sources` but page doesn't exist (will 404).

### 5.5 Filter Logic Duplication

**Location:** `apps/dfg-app/src/app/opportunities/page.tsx`

Per Sprint N+5 handoff: "Filter chip logic is duplicated between mobile and desktop panels."

---

## 6. Extensibility Gaps for SaaS

### 6.1 Missing Subscription Infrastructure

**Needed:**
- `subscriptions` table (plan, status, billing_cycle)
- `usage_events` table (API calls, analyses, storage)
- Usage-based billing hooks in dfg-analyst
- Plan-gated features (analysis count, source count)

### 6.2 No Category Templates

**Current:** Categories defined directly in `category_defs`.

**Needed for SaaS:**
- `category_templates` table (master list)
- Tenant-specific overrides
- Import/export functionality

### 6.3 No Source Credentials Management

**Current:** Sierra API is unauthenticated. IronPlanet uses HTML scraping.

**Needed:**
- `source_credentials` table with encrypted secrets
- Per-tenant API keys for authenticated sources
- OAuth token refresh flows

### 6.4 No Webhook/Integration Framework

**Needed:**
- Webhook endpoints for external integrations
- Event bus for status changes
- Zapier/Make.com trigger support

---

## 7. Immediate Action Items

### Priority 1 (Before Next Sprint)
1. **Create `/sources` page** - Navigation already links to it
2. **Extract filter chips** - DRY up mobile/desktop duplication
3. **Remove debug endpoints** from production builds
4. **Fix source name inconsistency** - Standardize on `sierra`

### Priority 2 (Next 2 Sprints)
1. **Create `@dfg/types` package** - Single source of truth for types
2. **Add `tenant_id` column** - Foundation for multi-tenancy
3. **Implement proper auth** - Move away from env var passwords
4. **Parameterize all SQL** - Eliminate string interpolation

### Priority 3 (Before SaaS Launch)
1. **Merge listings/opportunities** - Single data model
2. **Add subscription tables** - Billing infrastructure
3. **Implement rate limiting** - Per-tenant quotas
4. **Add audit logging** - SOC2 compliance

---

## 8. Architecture Recommendations

### 8.1 Proposed Package Structure
```
packages/
├── @dfg/types/           # Shared type definitions
├── @dfg/auth/            # Authentication utilities
├── @dfg/config/          # Configuration management
└── @dfg/billing/         # Subscription/usage tracking
```

### 8.2 Proposed Table Additions
```sql
-- Tenant management
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL
);

-- User management
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TEXT NOT NULL
);

-- Subscription tracking
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL REFERENCES tenants(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TEXT,
  stripe_subscription_id TEXT
);
```

### 8.3 New Adapter Interface for SaaS
```typescript
interface TenantAwareAdapter extends NormalizedSourceAdapter {
  // Existing methods...

  // New: Check if source requires authentication
  requiresAuth(): boolean;

  // New: Configure with tenant-specific credentials
  configure(credentials: SourceCredentials): Promise<void>;

  // New: Validate credentials before use
  validateCredentials(): Promise<{ valid: boolean; error?: string }>;
}
```

---

## 9. Positive Patterns to Preserve

1. **Adapter Registry** - Excellent for source extensibility
2. **Database-driven categories** - No deploys to add categories
3. **State machine validation** - Prevents invalid workflows
4. **Staleness detection** - Smart re-analysis triggers
5. **Operator input capture** - Audit trail with verification levels
6. **Analysis persistence** - Full history retention
7. **Sprint handoff documentation** - Great knowledge transfer

---

## 10. Conclusion

The DFG platform has a **thoughtful architecture** that separates concerns appropriately. The adapter pattern and database-driven configuration make it genuinely extensible without code changes.

**Key risks for SaaS:**
1. No multi-tenancy foundation
2. Placeholder authentication
3. Duplicate data models
4. Type fragmentation

**Estimated effort to SaaS-ready:**
- Multi-tenancy: 2-3 sprints
- Auth/billing: 2 sprints
- Data model unification: 1-2 sprints
- Type consolidation: 1 sprint

**Recommendation:** Address Priority 1 items immediately, then tackle multi-tenancy as the next major initiative before adding more features.

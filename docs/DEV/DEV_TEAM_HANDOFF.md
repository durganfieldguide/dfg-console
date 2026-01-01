# DFG Dev Team Handoff Document

**Date:** December 30, 2025  
**Status:** Ready for Sprint 2 Development  
**Version:** 2.0.0

---

## ⚠️ CRITICAL DIRECTIVE

> **DO NOT DEPRECATE, REMOVE, OR DISABLE ANY EXISTING FEATURES WITHOUT EXPLICIT WRITTEN APPROVAL FROM THE PRODUCT OWNER.**
>
> This codebase represents months of iterative development. Every endpoint, every field, every workflow exists for a reason. If something seems unused or redundant:
> 1. **ASK** before removing
> 2. **Document** why you think it's unused
> 3. **Wait** for explicit approval
>
> Violations of this directive will require rollback and rework.

---

## 1. What We Are Building

### Product Vision

**Durgan Field Guide (DFG)** is a subscription-based SaaS platform that helps equipment dealers and fleet operators identify, analyze, and win profitable auction opportunities.

The system transforms auction chaos into actionable deal flow:
- **Scout** monitors auction sites 24/7, filtering noise from opportunity
- **Analyst** applies dual-lens valuation (retail + wholesale) to score deals
- **Console** gives operators a mobile-first workflow to process candidates fast

### Business Model

- **Target Users:** Equipment dealers, fleet managers, resellers
- **Pricing:** Subscription-based (tiers TBD)
- **Value Prop:** "Never miss a deal, never overpay"

### Success Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Candidate Yield | Candidates / Total Listings | 5-8% |
| Operator Throughput | Lots processed per hour | 20+ |
| Bid Win Rate | Won / Bid | 15-25% |
| Profit Accuracy | Actual vs Projected Profit | ±15% |

---

## 2. What We Have Built

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE EDGE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │  dfg-scout   │────────►│  dfg-analyst │◄────────│   dfg-api    │    │
│  │              │         │              │         │              │    │
│  │ • Monitors   │         │ • Claude AI  │         │ • Operator   │    │
│  │   auctions   │         │   valuation  │         │   console    │    │
│  │ • Classifies │         │ • Dual-lens  │         │   API        │    │
│  │   candidates │         │   analysis   │         │ • Workflow   │    │
│  │ • Stores     │         │ • Max bid    │         │   engine     │    │
│  │   photos     │         │   derivation │         │              │    │
│  │              │         │              │         │              │    │
│  │ Cron: */15   │         │ On-demand    │         │ Cron: */5    │    │
│  └──────┬───────┘         └──────────────┘         └──────┬───────┘    │
│         │                                                  │            │
│         │              ┌──────────────┐                   │            │
│         └─────────────►│     D1       │◄──────────────────┘            │
│                        │ dfg-scout-db │                                 │
│                        └──────────────┘                                 │
│                               │                                         │
│                        ┌──────┴──────┐                                 │
│                        │     R2      │                                 │
│                        │ dfg-evidence│                                 │
│                        └─────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       VERCEL (dfg-app)                                   │
│                                                                          │
│  • Next.js 14 operator console                                          │
│  • Server-side API proxy (tokens never exposed to browser)              │
│  • NextAuth authentication (temporary credentials-based)                │
│  • Mobile-first responsive UI                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Repository Structure

```
dfg/
├── apps/
│   └── dfg-app/                    # Next.js operator console
│       ├── src/
│       │   ├── app/                # App router pages
│       │   │   ├── api/            # API routes (proxy + auth)
│       │   │   ├── login/          # Auth pages
│       │   │   └── (dashboard)/    # Protected routes
│       │   ├── components/         # React components
│       │   └── lib/                # Utilities, API client
│       └── package.json
│
├── workers/
│   ├── dfg-scout/                  # Auction monitoring worker
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point, routes
│   │   │   ├── core/               # Pipeline, types, env
│   │   │   ├── sources/            # Per-source adapters
│   │   │   │   ├── sierra/
│   │   │   │   └── ironplanet/
│   │   │   └── categories/         # Classification router
│   │   ├── migrations/             # D1 schema migrations
│   │   └── wrangler.toml
│   │
│   ├── dfg-api/                    # Operator console API
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point, routing
│   │   │   ├── core/               # HTTP helpers, auth
│   │   │   ├── routes/             # Endpoint handlers
│   │   │   └── lib/                # Utilities
│   │   ├── migrations/
│   │   └── wrangler.toml
│   │
│   └── dfg-analyst/                # AI valuation worker
│       ├── src/
│       │   ├── worker.ts           # Entry point
│       │   ├── calculation-spine.ts # Cost calculations
│       │   └── types.ts            # Analysis types
│       └── wrangler.toml
│
├── packages/                       # Shared packages (future)
│
├── docs/                           # Documentation
│   ├── DEV_TEAM_HANDOFF.md        # THIS FILE
│   ├── TECH_DEBT_HANDOFF.md       # Known issues & fixes
│   ├── DEPLOYMENT.md              # Deployment procedures
│   └── ...
│
├── _archived/                      # Archived code (reference only)
│
└── .github/
    └── workflows/
        └── ci.yml                  # GitHub Actions CI
```

### Current Features (DO NOT REMOVE)

#### DFG Scout
- ✅ Sierra Auctions adapter (primary source)
- ✅ IronPlanet adapter (secondary source)
- ✅ Three-gate classification (price → negative keywords → positive keywords)
- ✅ Buy box scoring (0-100)
- ✅ Photo capture and R2 storage
- ✅ Photo hydration backfill endpoints
- ✅ Staleness detection
- ✅ Debug endpoints (auth-protected)
- ✅ Cron-triggered runs (every 15 min)

#### DFG Analyst
- ✅ Claude AI integration for deal analysis
- ✅ Dual-lens valuation (retail + wholesale)
- ✅ Max bid derivation (best/mid/worst scenarios)
- ✅ Confidence scoring
- ✅ Report markdown generation

#### DFG API
- ✅ Full opportunity CRUD
- ✅ Workflow state machine (inbox → qualifying → watch/inspect → bid → won/lost/rejected)
- ✅ Computed alerts (watch_fired, ending_soon, stale_qualifying, price_alert)
- ✅ Alert dismissals via operator_actions
- ✅ Watch triggers with cycle support
- ✅ Batch operations (reject, archive)
- ✅ Source configuration
- ✅ Scout-to-opportunity sync (ingest)
- ✅ Cron-triggered watch checks (every 5 min)

#### DFG App
- ✅ NextAuth authentication (credentials provider)
- ✅ Protected dashboard
- ✅ Opportunity list with filters
- ✅ Opportunity detail view
- ✅ Analysis display with profit/margin calculations
- ✅ Capture → Analyze → Recapture workflow
- ✅ Server-side API proxy (tokens protected)

### Database Schema (v1.6)

**Primary Tables:**

| Table | Owner | Purpose |
|-------|-------|---------|
| `listings` | dfg-scout | Raw auction listings from all sources |
| `analyses` | dfg-scout | AI analysis results per listing |
| `scout_runs` | dfg-scout | Run statistics and metrics |
| `category_defs` | dfg-scout | Classification categories |
| `opportunities` | dfg-api | Operator workflow entities |
| `operator_actions` | dfg-api | Audit log of all actions |
| `sources` | dfg-api | Source configuration |
| `tuning_events` | dfg-api | ML/automation training signals |

**Key Relationships:**
- `listings.id` → `analyses.listing_id` (1:many)
- `listings.id` → `opportunities.listing_id` (1:1)
- `opportunities.id` → `operator_actions.opportunity_id` (1:many)

---

## 3. Where We Are Going

### Sprint 2 Priorities

| Priority | Feature | Effort | Rationale |
|----------|---------|--------|-----------|
| **P0** | Error tracking (Sentry) | 1-2 hrs | Catch production issues |
| **P1** | Test coverage expansion | 4-6 hrs | Prevent regressions |
| **P2** | GovPlanet adapter | 3-4 hrs | Third source, proven pattern |
| **P3** | IronPlanet coverage expansion | 2 hrs | Currently capturing ~17% |

### Medium-Term Roadmap

| Milestone | Features | Timeline |
|-----------|----------|----------|
| **Multi-tenancy** | User isolation, tenant-specific data | When first external user |
| **Subscription billing** | Clerk auth + Stripe | Pre-launch |
| **Push notifications** | Real-time alerts | Post-launch |
| **Mobile app** | React Native or PWA | Q2 2026 |

### Long-Term Vision

- Category expansion beyond trailers (equipment, vehicles, machinery)
- Geographic expansion (neighboring states, then national)
- Automated bidding (snipe mode, auto-bid to max)
- ML-powered buy box tuning
- White-label offering for dealer groups

---

## 4. Development Environment Setup

### Prerequisites

- Node.js 18+ (recommend 20 LTS)
- npm 9+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with access to the DFG project
- Git

### Clone & Install

```bash
git clone https://github.com/[org]/dfg.git
cd dfg

# Install root dependencies
npm install

# Install worker dependencies
cd workers/dfg-scout && npm install && cd ../..
cd workers/dfg-api && npm install && cd ../..
cd workers/dfg-analyst && npm install && cd ../..

# Install app dependencies
cd apps/dfg-app && npm install && cd ../..
```

### Local Development

**Terminal 1: DFG Scout**
```bash
cd workers/dfg-scout
wrangler dev
# Runs on http://localhost:8787
```

**Terminal 2: DFG API**
```bash
cd workers/dfg-api
wrangler dev
# Runs on http://localhost:8788
```

**Terminal 3: DFG Analyst**
```bash
cd workers/dfg-analyst
wrangler dev
# Runs on http://localhost:8789
```

**Terminal 4: DFG App**
```bash
cd apps/dfg-app
cp .env.local.example .env.local
# Edit .env.local with local URLs
npm run dev
# Runs on http://localhost:3000
```

### Environment Files

**apps/dfg-app/.env.local:**
```env
DFG_API_URL=http://localhost:8787
OPS_TOKEN=your-local-ops-token

NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

ALLOWED_USERS=dev@local.test:devpassword
```

---

## 5. Environment Configuration

### Cloudflare Workers

#### dfg-scout

| Binding | Type | Dev Value | Prod Value |
|---------|------|-----------|------------|
| `DFG_DB` | D1 | dfg-scout-db-preview | dfg-scout-db |
| `DFG_EVIDENCE` | R2 | dfg-evidence | dfg-evidence |
| `SCOUT_KV` | KV | (preview id) | (prod id) |
| `ENVIRONMENT` | Var | development | production |
| `MAX_BID_LIMIT` | Var | 6000 | 6000 |
| `STEAL_THRESHOLD` | Var | 2000 | 2000 |
| `ANALYST_URL` | Var | http://localhost:8788 | https://dfg-analyst.automation-ab6.workers.dev |
| `R2_PUBLIC_URL` | Var | https://pub-dfg-evidence.r2.dev | https://pub-dfg-evidence.r2.dev |
| `OPS_TOKEN` | Secret | (local value) | (prod secret) |
| `RESET_TOKEN` | Secret | (local value) | (prod secret) |

#### dfg-api

| Binding | Type | Dev Value | Prod Value |
|---------|------|-----------|------------|
| `DB` | D1 | dfg-scout-db-preview | dfg-scout-db |
| `ENVIRONMENT` | Var | development | production |
| `OPS_TOKEN` | Secret | (local value) | (prod secret) |
| `MAKE_WEBHOOK_URL` | Secret | (optional) | (Make.com URL) |
| `SCOUT` | Service | N/A | dfg-scout |

#### dfg-analyst

| Binding | Type | Dev Value | Prod Value |
|---------|------|-----------|------------|
| `ANTHROPIC_API_KEY` | Secret | (your key) | (prod key) |

### Vercel (dfg-app)

| Variable | Value | Notes |
|----------|-------|-------|
| `DFG_API_URL` | https://dfg-api.automation-ab6.workers.dev | Production API |
| `OPS_TOKEN` | (secret) | Must match worker secret |
| `NEXTAUTH_SECRET` | (secret) | Session encryption |
| `NEXTAUTH_URL` | https://dfg-console.vercel.app | Production URL |
| `ALLOWED_USERS` | email:password,email:password | Comma-separated |

### Database IDs

| Resource | Preview ID | Production ID |
|----------|------------|---------------|
| D1: dfg-scout-db | e6af9d25-b031-4958-a3b2-455bafdff5f1 | 08c267b8-b252-422a-8381-891d12917b33 |
| KV: SCOUT_KV | 654357f4ea634d8db682f54bae0170a2 | fdd4f609a8d34b32817d6f156396898a |
| R2: dfg-evidence | dfg-evidence | dfg-evidence |

---

## 6. Deployment Procedures

### Deploying Workers

```bash
# Always deploy to production environment explicitly
cd workers/dfg-scout
wrangler deploy --env production

cd workers/dfg-api
wrangler deploy --env production

cd workers/dfg-analyst
wrangler deploy --env production
```

### Deploying DFG App

Push to `main` branch triggers Vercel auto-deploy.

```bash
git add -A
git commit -m "feat: description of changes"
git push origin main
```

### Running Migrations

```bash
# Preview database (local testing)
wrangler d1 execute dfg-scout-db-preview --local --file=./migrations/XXX.sql

# Production database (CAREFUL!)
wrangler d1 execute dfg-scout-db --remote --file=./migrations/XXX.sql
```

### Setting Secrets

```bash
# Scout secrets
cd workers/dfg-scout
wrangler secret put OPS_TOKEN --env production
wrangler secret put RESET_TOKEN --env production

# API secrets
cd workers/dfg-api
wrangler secret put OPS_TOKEN --env production
wrangler secret put MAKE_WEBHOOK_URL --env production

# Analyst secrets
cd workers/dfg-analyst
wrangler secret put ANTHROPIC_API_KEY --env production
```

---

## 7. API Reference

### Authentication

All worker endpoints (except `/health`) require:
```
Authorization: Bearer <OPS_TOKEN>
```

### DFG Scout Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (public) |
| GET | `/ops/run` | Trigger scout run |
| GET | `/ops/listings` | List processed listings |
| GET | `/ops/listing/:id` | Get listing detail |
| GET | `/ops/stats` | Run statistics |
| POST | `/ops/photo-hydrate` | Backfill missing photos |
| POST | `/ops/photo-hydrate/:id` | Hydrate single listing |
| GET | `/debug/analyses` | Debug: view analyses (auth required) |
| GET | `/debug/sources` | Debug: view sources (auth required) |

### DFG API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (public) |
| GET | `/api/opportunities` | List opportunities |
| GET | `/api/opportunities/:id` | Get opportunity detail |
| PATCH | `/api/opportunities/:id` | Update opportunity |
| POST | `/api/opportunities/:id/actions` | Add action |
| POST | `/api/opportunities/batch` | Batch operations |
| GET | `/api/opportunities/stats` | Dashboard stats |
| POST | `/api/alerts/dismiss` | Dismiss alert |
| POST | `/api/alerts/dismiss/batch` | Batch dismiss |
| GET | `/api/sources` | List sources |
| PATCH | `/api/sources/:id` | Update source |
| POST | `/api/ingest/sync` | Sync listings → opportunities |
| POST | `/api/triggers/check` | Check watch triggers |
| POST | `/api/scout/run` | Trigger scout |

### DFG Analyst Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Analyze a listing |

---

## 8. Testing

### Running Tests

```bash
# Scout tests
cd workers/dfg-scout
npm test

# Analyst tests
cd workers/dfg-analyst
npm test

# App tests
cd apps/dfg-app
npm test
```

### CI Pipeline

GitHub Actions runs on every push to `main`:
- Lint check
- Type check
- Unit tests

See `.github/workflows/ci.yml`

### Manual Testing Checklist

Before deploying major changes:

- [ ] Scout run completes without errors
- [ ] New listings appear in database
- [ ] Photos are captured to R2
- [ ] Analysis runs successfully
- [ ] Profit/margin calculations are correct
- [ ] App loads without console errors
- [ ] Login works
- [ ] Opportunity list displays
- [ ] Detail view shows analysis
- [ ] Status transitions work

---

## 9. Known Issues & Tech Debt

See `docs/TECH_DEBT_HANDOFF.md` for complete details.

### Critical (Fixed)
- ~~Debug endpoints exposed without auth~~ ✅ Fixed
- ~~Local dev environment not configured~~ ✅ Fixed

### Moderate (Backlog)
- IronPlanet capturing only ~17% of inventory
- Missing retry logic for Claude API calls
- Inconsistent source name mapping

### Tech Debt (Backlog)
- Insufficient test coverage
- Hardcoded Phoenix market data
- Type safety in D1 queries
- Subrequest limit management
- Missing structured observability

---

## 10. Coding Standards

### General Rules

1. **TypeScript everywhere** — No `any` unless absolutely necessary
2. **Pure functions preferred** — Side effects at the edges
3. **Explicit over implicit** — Name things clearly
4. **Small atomic commits** — One concern per commit
5. **Tests for business logic** — Calculations, classification, parsing

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `source-mapping.ts` |
| Functions | camelCase | `computeMaxBid()` |
| Types/Interfaces | PascalCase | `NormalizedLot` |
| Constants | SCREAMING_SNAKE | `MAX_BID_LIMIT` |
| Database columns | snake_case | `buy_box_score` |

### Commit Messages

```
type(scope): description

feat(scout): add GovPlanet adapter
fix(api): correct profit calculation
chore(docs): update handoff document
refactor(analyst): extract retry utility
test(scout): add IronPlanet extraction tests
```

### Refactoring Rules

> **NEVER** mix these in a single commit:
> 1. Renaming
> 2. Logic changes
> 3. Architecture changes
>
> Each gets its own atomic commit.

---

## 11. Contacts & Resources

### Key Resources

| Resource | URL |
|----------|-----|
| GitHub Repo | (your repo URL) |
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Vercel Dashboard | https://vercel.com |
| Production App | https://dfg-console.vercel.app |
| Production API | https://dfg-api.automation-ab6.workers.dev |
| Production Scout | https://dfg-scout.automation-ab6.workers.dev |

### Documentation

| Doc | Purpose |
|-----|---------|
| `DEV_TEAM_HANDOFF.md` | This document |
| `TECH_DEBT_HANDOFF.md` | Known issues and fixes |
| `DEPLOYMENT.md` | Deployment procedures |
| `HANDOFF.md` | Original architecture doc |

### Useful Commands

```bash
# Tail production logs
wrangler tail dfg-scout --env production
wrangler tail dfg-api --env production

# Query production database
wrangler d1 execute dfg-scout-db --remote --command "SELECT COUNT(*) FROM listings"

# Check worker status
curl https://dfg-scout.automation-ab6.workers.dev/health
curl https://dfg-api.automation-ab6.workers.dev/health
```

---

## 12. Final Reminders

### DO

- ✅ Read existing code before adding new code
- ✅ Test locally before deploying
- ✅ Ask questions when uncertain
- ✅ Document non-obvious decisions
- ✅ Use feature branches for major changes
- ✅ Keep PRs small and focused

### DON'T

- ❌ Remove features without explicit approval
- ❌ Change database schema without migration
- ❌ Deploy directly to production without testing
- ❌ Store secrets in code or .env files committed to git
- ❌ Mix refactoring with feature work
- ❌ Ignore failing tests

---

*Document Version: 2.0.0*  
*Last Updated: December 30, 2025*  
*Maintained By: DFG Platform Team*

# DFG Platform Handoff Document

**Date:** 2025-12-26
**Status:** Ready for operator testing
**Version:** 1.0.0

---

## Executive Summary

DFG (Durgan Field Guide) is an internal platform for identifying and processing equipment/trailer deals across auction sites. The system consists of two Cloudflare Workers sharing a D1 database, plus a Next.js operator console.

**Current State:** Core infrastructure is deployed to production. The system can scout auction listings, ingest them as opportunities, and provide an operator workflow UI. Watch alerts, batch operations, and Make.com integration are implemented.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    service binding    ┌──────────────────────┐   │
│  │  dfg-scout   │◄─────────────────────►│      dfg-api         │   │
│  │              │                        │                      │   │
│  │ • Scrapes    │                        │ • Operator console   │   │
│  │   auctions   │                        │   API                │   │
│  │ • Stores     │                        │ • Opportunity        │   │
│  │   listings   │                        │   workflow           │   │
│  │ • Cron:      │                        │ • Alert computation  │   │
│  │   */15 min   │                        │ • Cron: */5 min      │   │
│  └──────┬───────┘                        └──────────┬───────────┘   │
│         │                                           │                │
│         └─────────────┬─────────────────────────────┘                │
│                       ▼                                              │
│              ┌────────────────┐                                      │
│              │ D1: dfg-scout-db│                                     │
│              │                │                                      │
│              │ • listings     │                                      │
│              │ • opportunities│                                      │
│              │ • operator_    │                                      │
│              │   actions      │                                      │
│              │ • sources      │                                      │
│              │ • tuning_events│                                      │
│              └────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP (dfg-app)                          │
│                                                                      │
│  • Operator console UI                                               │
│  • Server-side API proxy (token never exposed to browser)           │
│  • Deployed to Vercel/Cloudflare Pages                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
dfg/
├── workers/
│   ├── dfg-scout/              # Auction scraper worker
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point, cron handler
│   │   │   ├── scrapers/       # Per-source scraping logic
│   │   │   └── lib/            # Shared utilities
│   │   ├── migrations/         # D1 migrations for listings
│   │   └── wrangler.toml
│   │
│   └── dfg-api/                # Operator console API
│       ├── src/
│       │   ├── index.ts        # Entry point, routing, cron
│       │   ├── core/
│       │   │   ├── env.ts      # Environment bindings
│       │   │   ├── http.ts     # Response helpers, auth
│       │   │   └── types.ts    # TypeScript types
│       │   ├── routes/
│       │   │   ├── opportunities.ts  # CRUD, workflow transitions
│       │   │   ├── alerts.ts         # Computed alerts, dismissals
│       │   │   ├── sources.ts        # Source configuration
│       │   │   └── ingest.ts         # Scout → Opportunities sync
│       │   └── lib/
│       │       └── utils.ts    # Date/ID utilities
│       ├── migrations/
│       │   ├── 0001_opportunities.sql  # Core schema
│       │   └── 0002_drop_alert_dismissals.sql  # Cleanup migration
│       └── wrangler.toml
│
└── apps/
    └── dfg-app/                # Next.js 14 operator console
        ├── src/
        │   ├── app/
        │   │   ├── api/[...path]/route.ts  # Server-side API proxy
        │   │   ├── page.tsx                # Dashboard
        │   │   ├── opportunities/
        │   │   │   ├── page.tsx            # List view
        │   │   │   └── [id]/page.tsx       # Detail view
        │   │   └── settings/page.tsx       # Source config
        │   ├── components/
        │   │   ├── ui/                     # Button, Badge, Card
        │   │   ├── Navigation.tsx
        │   │   └── OpportunityCard.tsx
        │   ├── lib/
        │   │   ├── api.ts                  # API client (uses proxy)
        │   │   └── utils.ts
        │   └── types/index.ts
        ├── .env.local.example
        ├── tailwind.config.ts
        └── package.json
```

---

## Key Technical Decisions

### 1. Alerts Are Computed, Not Stored

Alerts are derived from opportunity state at read time, not stored in a separate table. This avoids sync issues and ensures alerts always reflect current data.

**Alert types:**
- `watch_fired` — Watch timer expired
- `ending_soon` — Auction ending within 4h/24h/48h
- `stale_qualifying` — Opportunity stuck in qualifying >24h
- `price_alert` — Current bid approaching max bid threshold

**Dismissals** are stored in `operator_actions` with `action_type='alert_dismiss'`. The `alert_key` column identifies which alert was dismissed (e.g., `watch_fired:3`, `ending_24h:2025-01-15T10:00:00Z`).

### 2. Single Source of Truth for Actions

All operator actions (status changes, notes, dismissals, augmentations) are logged to `operator_actions`. This provides:
- Complete audit trail
- Tuning signals for future automation
- No separate tables for different action types

### 3. Watch Cycle for Re-watching

When an operator sets a new watch on an opportunity, `watch_cycle` increments. This allows the same opportunity to be watched multiple times without conflicting dismissal keys.

### 4. Server-Side API Token

The Next.js app proxies all `/api/*` requests through a server-side route handler. The `DFG_API_TOKEN` is never exposed to the browser (no `NEXT_PUBLIC_` prefix).

### 5. Idempotent Watch Firing

Both the cron handler and HTTP trigger use a conditional UPDATE:
```sql
UPDATE opportunities SET watch_fired_at = ?
WHERE id = ? AND watch_fired_at IS NULL
```
This prevents duplicate firing from concurrent triggers.

---

## Database Schema

### opportunities
Main workflow entity. Key columns:
- `status`: inbox → qualifying → watch/inspect → bid → won/lost/rejected/archived
- `watch_cycle`, `watch_until`, `watch_fired_at`: Watch state machine
- `max_bid_locked`, `bid_strategy`: Bidding configuration
- `buy_box_score`, `score_breakdown`: Scoring from scout

### operator_actions
Audit log with `action_type`:
- `status_change` — Workflow transitions
- `augmentation` — Operator-added facts
- `note` — Freeform notes
- `alert_dismiss` — Alert dismissals (uses `alert_key` column)
- `batch_reject`, `batch_archive` — Bulk operations
- `re_analyze` — Request re-scoring

### sources
Auction platform configuration (Sierra, IronPlanet, GovPlanet).

### tuning_events
Signals for future ML/automation tuning.

---

## API Endpoints

### Opportunities
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/opportunities` | List with filters |
| GET | `/api/opportunities/:id` | Get detail with alerts |
| PATCH | `/api/opportunities/:id` | Update status, set watch, etc. |
| POST | `/api/opportunities/:id/actions` | Add note, augmentation |
| POST | `/api/opportunities/batch` | Batch reject/archive |
| GET | `/api/opportunities/stats` | Dashboard statistics |

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/alerts/dismiss` | Dismiss single alert |
| POST | `/api/alerts/dismiss/batch` | Dismiss up to 50 alerts |
| POST | `/api/opportunities/:id/alerts/dismiss` | Legacy (still works) |

### Sources
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sources` | List all sources |
| PATCH | `/api/sources/:id` | Update source config |

### Ingest & Triggers
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest/sync` | Sync listings → opportunities |
| POST | `/api/triggers/check` | Manual watch trigger check |
| POST | `/api/scout/run` | Trigger scout run |

---

## Deployment

### Workers (Cloudflare)

```bash
# dfg-api
cd workers/dfg-api
npx wrangler d1 execute dfg-scout-db --remote --file=./migrations/0001_opportunities.sql
npx wrangler d1 execute dfg-scout-db --remote --file=./migrations/0002_drop_alert_dismissals.sql
npx wrangler secret put OPS_TOKEN --env production
npx wrangler deploy --env production

# dfg-scout
cd workers/dfg-scout
npx wrangler deploy --env production
```

### Next.js App

**Production URLs:**
- Operator Console: https://dfg-app.vercel.app
- Backend API: https://dfg-api.automation-ab6.workers.dev

```bash
cd apps/dfg-app
cp .env.local.example .env.local
# Edit .env.local with production values:
#   DFG_API_URL=https://dfg-api.automation-ab6.workers.dev
#   OPS_TOKEN=<your-ops-token>
npm run build
# Deploy to Vercel or Cloudflare Pages
```

### Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `OPS_TOKEN` | Worker secret | API auth token |
| `MAKE_WEBHOOK_URL` | Worker secret (optional) | Make.com integration |
| `DFG_API_URL` | Next.js server (Vercel) | Worker API URL |
| `OPS_TOKEN` | Next.js server (Vercel) | Same as worker OPS_TOKEN |

---

## Cron Schedules

| Worker | Schedule | Purpose |
|--------|----------|---------|
| dfg-scout | `*/15 * * * *` | Scrape auction sites |
| dfg-api | `*/5 * * * *` | Check watch triggers |

---

## Recent Accomplishments

1. **Core API implementation** — Full CRUD for opportunities, workflow transitions, batch operations
2. **Computed alerts system** — Real-time alerts based on opportunity state
3. **Dismissal architecture fix** — Moved from separate table to `operator_actions`
4. **Spec-compliant endpoints** — Added `POST /api/alerts/dismiss` and batch variant
5. **Idempotent watch firing** — Prevents duplicate alerts from concurrent triggers
6. **Secure API proxy** — Token stays server-side in Next.js
7. **Next.js operator console** — Dashboard, list view, detail view, settings

---

## Known Risks & Gotchas

### 1. Database is Shared
Both `dfg-scout` and `dfg-api` share the same D1 database. Schema changes require coordination. The `listings` table is owned by scout; `opportunities` and related tables are owned by api.

### 2. No Auth on Frontend Yet
The Next.js app has no user authentication. Anyone with the URL can access it. For internal use only until auth is added.

### 3. Partial Index Support
The dismissal index uses a partial index (`WHERE action_type = 'alert_dismiss'`). D1 supports this, but verify if migrating to another SQLite-based system.

### 4. Watch Trigger Timing
Watch triggers fire when `watch_until <= now()`. The 5-minute cron means alerts may fire up to 5 minutes late. For time-critical auctions, consider more frequent checks or push notifications.

### 5. No Real Push Notifications
"Alerts" are computed at read time. There's no push notification system yet. Operators must refresh to see new alerts.

### 6. Scraper Brittleness
`dfg-scout` scrapers depend on auction site HTML structure. Any site redesign will break scraping. Monitor for failures and be prepared to update scrapers.

### 7. Make.com Webhook Not Configured
The `MAKE_WEBHOOK_URL` secret is optional. If not set, the `/api/scout/run` endpoint will attempt service binding, then return a "not configured" message.

---

## Suggested Next Steps

### Immediate (Pre-Launch)
- [ ] Add basic auth to Next.js app (NextAuth.js or Clerk)
- [ ] Test end-to-end flow: scout → ingest → workflow → alerts
- [ ] Verify cron triggers are firing in production logs
- [ ] Add error monitoring (Sentry or similar)

### Short-Term
- [ ] Push notifications for critical alerts (Firebase, Pusher, or WebSockets)
- [ ] Mobile-responsive UI improvements
- [ ] Operator notes with timestamps in detail view
- [ ] Filter opportunities by source in list view

### Medium-Term
- [ ] R2 snapshot storage for listing HTML/images
- [ ] LLM-based analysis integration (Claude API for deal scoring)
- [ ] Bidding automation (auto-bid at max, snipe mode)
- [ ] Tuning dashboard (view tuning_events, adjust scoring weights)

### Long-Term
- [ ] Multi-tenant support (multiple operators, separate views)
- [ ] Historical analytics (win rate, average profit by category)
- [ ] Additional auction sources (beyond Sierra, IronPlanet, GovPlanet)

---

## Testing Locally

### Workers
```bash
cd workers/dfg-api
npm install
npx wrangler dev
# API available at http://localhost:8787
```

### Next.js App
```bash
cd apps/dfg-app
npm install
cp .env.local.example .env.local
# Edit .env.local: DFG_API_URL=http://localhost:8787
npm run dev
# App available at http://localhost:3000
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| API routing | `workers/dfg-api/src/index.ts` |
| Opportunity CRUD | `workers/dfg-api/src/routes/opportunities.ts` |
| Alert computation | `workers/dfg-api/src/routes/alerts.ts` |
| Database schema | `workers/dfg-api/migrations/0001_opportunities.sql` |
| TypeScript types | `workers/dfg-api/src/core/types.ts` |
| Frontend API client | `apps/dfg-app/src/lib/api.ts` |
| API proxy | `apps/dfg-app/src/app/api/[...path]/route.ts` |

---

## Contact & Resources

- **GitHub Issues:** Report bugs and feature requests
- **Cloudflare Dashboard:** Worker logs, D1 explorer, cron history
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

---

*This document was generated on 2025-12-26. Update as the system evolves.*

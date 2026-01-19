# Durgan Field Guide (DFG) - Project Description

**Version:** 1.0
**Last Updated:** 2026-01-18
**Venture:** Durgan Field Guide (DFG)
**Scope:** dfg

---

## Project Identity

**Mission:** Build a demand-driven intelligence system that finds undervalued physical assets across the US, analyzes their profit potential, and enables rapid acquisition decisions.

**Focus:** Trailers, light equipment, and other high-margin fast-moving physical goods at auction.

---

## What DFG Does

### Core Capability
Automated intelligence system that:
1. **Monitors** thousands of auction listings across multiple platforms
2. **Analyzes** each item for undervaluation and profit potential
3. **Scores** opportunities based on demand signals and margin potential
4. **Alerts** when high-value opportunities appear
5. **Provides** instant analysis for acquisition decisions

### Target Assets
- Trailers (utility, enclosed, cargo)
- Light equipment (generators, tools, machinery)
- Vehicles (trucks, vans, specialty vehicles)
- Industrial equipment

### Value Proposition
**Speed + Accuracy** → Make profitable acquisition decisions in minutes, not days

---

## Architecture Overview

### Tech Stack
- **Frontend:** iOS app (Swift/SwiftUI) + Web dashboard
- **Backend:** Cloudflare Workers (TypeScript)
- **Database:** D1 (SQLite), Durable Objects
- **Infrastructure:** Cloudflare ecosystem

### Key Services

**dfg-scout** (Scout Worker)
- Scrapes auction platforms
- Normalizes listing data
- Stores in D1 database

**dfg-analyst** (Analyst Worker)
- Analyzes listings for profit potential
- Applies demand scoring models
- Generates buy/pass recommendations

**dfg-api** (API Worker)
- Serves data to iOS app and web
- Handles authentication
- Manages user preferences

**dfg-relay** (Relay Worker)
- Webhook endpoint for external integrations
- Event routing
- Real-time notifications

### Data Flow
```
Auction Sites → dfg-scout → D1 Database
                                ↓
                          dfg-analyst
                                ↓
                   Scored Opportunities
                                ↓
                           dfg-api
                                ↓
                    iOS App / Web Dashboard
```

---

## Development Approach

### Monorepo Structure
```
dfg-console/
├── apps/
│   └── dfg-app/           # iOS app (Swift)
├── workers/
│   ├── dfg-scout/         # Auction scraper
│   ├── dfg-analyst/       # Profit analyzer
│   ├── dfg-api/           # API server
│   └── dfg-relay/         # Webhook handler
├── packages/              # Shared code
└── docs/                  # Documentation
```

### Key Conventions
- **TypeScript** for all workers
- **Wrangler** for Cloudflare deployments
- **D1** for persistent data
- **Durable Objects** for stateful services
- **Test-driven** development

---

## Critical Patterns

### Money Math
**RULE:** All money calculations use integers (cents, not dollars)
- ❌ `price = 1500.50` (floating point errors)
- ✅ `priceInCents = 150050` (exact)

**See:** `check-money-math` command for validation

### Auction Data Normalization
Different platforms have different formats. Always normalize to standard schema:
```typescript
interface NormalizedListing {
  id: string;
  platform: 'govdeals' | 'publicsurplus' | 'ironplanet';
  title: string;
  description: string;
  category: string;
  currentBid: number;  // cents
  estimatedValue: number;  // cents
  endTime: Date;
  location: {
    city: string;
    state: string;
    zip: string;
  };
}
```

### Scoring Algorithm
Opportunities scored on:
1. **Margin Potential** (40%) - Estimated value vs current bid
2. **Demand Signals** (30%) - Recent sales, search volume
3. **Condition** (15%) - Based on photos, description
4. **Logistics** (15%) - Location, pickup feasibility

**Score Range:** 0-100 (higher = better opportunity)

---

## Testing Requirements

### Before Deployment
- ✅ All TypeScript compiles without errors
- ✅ Unit tests pass for worker logic
- ✅ Money math validated (no floating point)
- ✅ API endpoints return expected schemas
- ✅ iOS app builds without warnings

### Commands
```bash
/test-all           # Run all tests
/check-money-math   # Validate money calculations
/build-all          # Build all packages
/ios-check          # Check iOS app status
```

---

## Deployment Process

### Workers (Cloudflare)
```bash
cd workers/dfg-api
wrangler deploy

# Or use command
/deploy-worker dfg-api
```

### iOS App
```bash
cd apps/dfg-app
# Build and submit via Xcode
```

### Database Migrations
```bash
cd workers/dfg-api
wrangler d1 migrations apply crane-dfg-db --remote

# Or use command
/migrate-db
```

---

## Common Tasks

### Adding New Auction Platform
1. Add scraper in `dfg-scout/src/scrapers/`
2. Implement normalization logic
3. Add tests
4. Update platform enum
5. Deploy scout worker

### Updating Scoring Algorithm
1. Modify `dfg-analyst/src/scoring.ts`
2. Backtest on historical data
3. Update tests
4. Deploy analyst worker

### Adding API Endpoint
1. Add route in `dfg-api/src/routes/`
2. Add TypeScript types
3. Add tests
4. Update iOS app to consume
5. Deploy API worker

---

## Key Metrics

### Business Metrics
- **Opportunities Found:** Daily listing count
- **High-Score Alerts:** Listings with score >80
- **Acquisition Rate:** % of alerts that result in purchases
- **Margin Realized:** Average profit per acquisition

### Technical Metrics
- **Scout Uptime:** % time scraper is running
- **Analysis Latency:** Time from listing to score
- **API Response Time:** p95 latency
- **iOS Crash Rate:** % of sessions with crashes

---

## Important Links

### Infrastructure
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **D1 Database:** crane-dfg-db-prod

### Code
- **Repository:** durganfieldguide/dfg-console
- **iOS App:** apps/dfg-app
- **Workers:** workers/dfg-*

### Documentation
- **Technical Spec:** `docs/technical/dfg-technical-spec.md` (if exists)
- **Handoffs:** `docs/handoffs/`
- **API Docs:** `workers/dfg-api/README.md`

---

## Team Context

### This Project Is
- **Early stage:** Core functionality working, refining algorithms
- **Revenue generating:** Actually making profitable acquisitions
- **Founder-operated:** Scott makes final acquisition decisions

### Development Priority
1. **Accuracy** - Better scoring = better acquisitions
2. **Speed** - Auctions are time-sensitive
3. **Reliability** - Can't miss high-value opportunities

---

## Quick Reference

**Start working:**
```bash
cd ~/path/to/dfg-console
/sod dfg
```

**Common commands:**
```bash
/test-all              # Run all tests
/build-all             # Build all packages
/deploy-worker <name>  # Deploy a worker
/migrate-db            # Run DB migrations
/ios-check             # Check iOS app
/security-audit        # Run security checks
```

**Key files:**
- `workers/dfg-api/src/routes/` - API endpoints
- `workers/dfg-analyst/src/scoring.ts` - Scoring logic
- `workers/dfg-scout/src/scrapers/` - Platform scrapers
- `apps/dfg-app/` - iOS app

---

## Summary

**DFG = Auction Intelligence System**

Find undervalued assets → Analyze profit potential → Make fast acquisition decisions

**Tech:** Cloudflare Workers + D1 + iOS
**Focus:** Speed, accuracy, reliability
**Stage:** Early, revenue-generating, growing

When working on DFG, remember: **Money math must be perfect** and **auctions are time-sensitive**.


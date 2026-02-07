# Product Manager Contribution -- PRD Review Round 1

**Author:** Product Manager
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Ground Truth:** Codebase at `dfg-console` repo, CLAUDE.md, and operational handoffs

---

## Executive Summary

**Problem:** Auction arbitrage on physical assets (trailers, equipment, vehicles) is profitable but time-intensive. Listings surface across fragmented platforms, expire within hours, and require rapid valuation against local demand signals. A solo operator cannot monitor, evaluate, and decide at the volume required to capture the best deals.

**Solution:** DFG is an automated intelligence system that continuously scrapes auction platforms, runs AI-powered profit analysis on each listing, scores opportunities against demand signals, and surfaces actionable buy/pass recommendations to the operator via a mobile-first web console.

**Value:** DFG compresses the acquisition decision cycle from hours of manual research to minutes of operator review. It eliminates missed opportunities from platform fragmentation and reduces bad acquisitions through consistent, conservative financial modeling. The system is already revenue-generating -- profitable acquisitions are being made using the existing platform.

**Current State:** DFG is an operational, founder-used tool. The core pipeline (Scout --> Analyst --> API --> Console) is functional with two auction sources (Sierra Auction, IronPlanet), three category tiers (Trailers, Vehicles, Power Tools), Claude-powered dual-lens valuation, and a full opportunity lifecycle workflow. The web console runs on iOS Safari as the primary interface. Auth is prototype-grade (hardcoded). No external users yet.

---

## Product Vision & Identity

**Name:** Durgan Field Guide (DFG)

**Tagline:** Find the deals others miss. Move before they can.

**Positioning:** DFG is an operator intelligence tool for physical asset arbitrage at auction. It automates the information-gathering and analysis work so the operator focuses exclusively on decision-making and execution.

**What DFG IS:**
- A deal flow intelligence engine for physical asset acquisition
- A conservative financial analysis tool that protects the operator from bad buys
- A workflow system that enforces disciplined evaluation before bidding
- A mobile-first operator console designed for on-the-go decision-making

**What DFG is NOT:**
- Not a marketplace or auction platform
- Not a general-purpose dashboard or analytics tool
- Not a fully automated bidding bot (operator makes final decisions)
- Not a multi-tenant SaaS product yet (founder-operated, private beta planned)
- Not an iOS native app (it is a Next.js web app accessed via iOS Safari)

---

## Product Principles

These are ordered by priority. When principles conflict, the higher-numbered principle wins.

1. **Numbers must be right.** Financial calculations are non-negotiable. A single incorrect margin or double-counted fee destroys operator trust permanently. The canonical money math (Acquisition Cost, Net Proceeds, Profit, Margin) is the foundation of every product decision. This overrides speed, UX polish, and feature velocity.

2. **Speed is competitive advantage.** Auctions are time-sensitive. Every minute between listing appearance and operator review is a minute a competitor could act. Analysis latency, page load time, and alert delivery must be optimized relentlessly. A fast, correct answer beats a perfect, late answer.

3. **Conservative over optimistic.** DFG exists to protect the operator from bad acquisitions, not to encourage volume. Analysis should err on the side of lower valuations, higher cost estimates, and PASS/WATCH recommendations when data is insufficient. A missed good deal is recoverable; a bad acquisition is cash destroyed.

4. **Mobile-first, iOS Safari always.** The operator uses this tool in the field -- at auctions, in the truck, walking lots. Every feature must work flawlessly on iOS Safari. Desktop is a convenience, not the primary interface. Touch targets, viewport handling, and offline resilience matter more than desktop aesthetics.

5. **Operator decides, system recommends.** DFG provides analysis, scoring, and recommendations. The operator makes the final call. The system must never auto-bid, auto-reject viable opportunities, or hide information that could inform a decision. Transparency of reasoning is required.

6. **Audit everything.** Every operator decision, every analysis run, every status change must be logged with full context. This data feeds algorithm tuning, enables post-mortem analysis of wins and losses, and builds the training corpus for better future recommendations.

7. **Reliability over features.** A system that misses a high-value opportunity because the scraper was down or the analyst timed out is worse than a system with fewer features that never drops a listing. Uptime and data completeness take priority over new capabilities.

---

## Success Metrics & Kill Criteria

### MVP Success Metrics

| Metric | Target | Measurement Method | Timeframe |
|--------|--------|-------------------|-----------|
| Opportunities surfaced per day | >= 15 qualified candidates | `opportunities` table, status != rejected/archived, created_at = today | Daily average over 30 days |
| Analysis accuracy (operator agreement) | >= 70% of BID recommendations result in operator bid or watch | MVC events: decision_made where analyst_verdict = BID and decision IN (BID, WATCH) | Rolling 30-day window |
| False positive rate | <= 30% of scored >80 opportunities get rejected | Rejection rate of high-score opportunities | Rolling 30-day window |
| Operator response time | Median < 4 hours from inbox to qualifying/rejected | status_changed_at delta from inbox to next status | Rolling 30-day window |
| Scout uptime | >= 95% of scheduled runs complete successfully | scout_runs table success rate | Weekly |
| Analysis latency | p95 < 45 seconds from listing to scored opportunity | Time delta: listing.created_at to opportunity.last_analyzed_at | Rolling 7-day window |
| Won deals per month | >= 2 acquisitions from DFG pipeline | Opportunities with status = won | Monthly |
| Realized margin on won deals | >= 25% average margin | outcomes table: (net_profit / acquisition_cost) * 100 | Per-deal, trailing 90 days |

### Kill Criteria

The MVP should be killed or fundamentally reconsidered if any of the following hold true after 90 days of operation:

| Kill Criterion | Threshold | Rationale |
|---------------|-----------|-----------|
| Zero profitable acquisitions | 0 won deals with positive net_profit in 90 days | System is not generating actionable intelligence |
| Sustained negative margins | Average margin < 10% across all won deals over 90 days | Deals being surfaced are not sufficiently undervalued |
| Operator stops using the tool | < 3 logins per week for 4 consecutive weeks | Tool is not providing enough value to justify checking |
| Scout data staleness | > 50% of opportunities have auction_ends_at in the past when operator first sees them | Pipeline is too slow to be useful for time-sensitive auctions |
| Analysis disagreement rate | > 60% of BID recommendations are rejected by operator over 60 days | AI analysis is not calibrated to operator's actual buy box |

---

## Risks & Mitigations

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Auction platform blocks scraping | High | Critical -- no data, no product | Multiple source adapters (Sierra, IronPlanet already built; GovPlanet, GovDeals queued). Adapter architecture isolates platform-specific logic. Rate limiting and polite scraping headers. Investigate official API access for high-value platforms. |
| Market shift reduces trailer margins | Medium | High -- core thesis invalidated | Category system already supports Power Tools and Vehicles. Expand category tiers to diversify. Outcomes tracking provides early warning via declining margin trends. |
| Sole operator dependency (Scott) | High | Medium -- product stalls without active use | Roadmap includes private beta (Feb 2026) to validate multi-user value. Auth upgrade (Clerk) is prerequisite. |
| AI analysis costs exceed deal value | Low | Medium -- unit economics break | Claude API costs per analysis are predictable. Pre-filter with scoring algorithm (three-gate classification) to reduce unnecessary AI calls. Monitor cost-per-opportunity. |

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| D1/Worker subrequest limits | Medium | High -- pipeline stalls | Already mitigated: batch queries, content hashing, Set lookups. Monitor subrequest counts per invocation. |
| Claude API reliability | Medium | Medium -- analysis delays | Exponential backoff retry (1s, 2s, 4s) already implemented. Analysis runs are idempotent and replayable. Queue-based retry via failed_operations table. |
| Auth is prototype-grade | High | Critical for multi-user | Hardcoded credentials work for founder use. Clerk + Stripe planned before any external user. No external access until auth is production-grade. |
| IronPlanet capture rate (~17%) | High | Medium -- missing most listings from second source | Investigate adapter failures. Likely HTML structure changes. Prioritize adapter resilience and failure alerting. |
| No frontend tests | High | Medium -- UI regressions | Accept risk for founder-only use. Add critical path tests (opportunity detail, reject flow) before private beta. |

### Execution Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep into multi-tenant SaaS | Medium | High -- diverts from core value | This PRD explicitly scopes to MVP/Phase 0. Multi-tenant is Phase 2 at earliest. Every feature must prove value for single operator first. |
| Over-engineering scoring algorithm | Medium | Medium -- complexity without accuracy gains | Scoring changes require backtesting on historical data (per CLAUDE.md). Tuning events capture signals for data-driven iteration. |
| Security incident before auth upgrade | Medium | Critical -- data exposure, reputation | P0 issue #123 (unauthenticated analyst endpoints) must be resolved before any external access. Security audit slash command available. |

---

## Open Decisions / ADRs

### ADR-001: Auth System Selection
- **Status:** Decided (Clerk + Stripe), not yet implemented
- **Decision:** Use Clerk for authentication, Stripe for billing
- **Rationale:** Clerk handles OAuth, session management, and user management. Stripe handles subscription billing. Both have Cloudflare Workers compatibility.
- **Blocker for:** Private beta (Feb 2026 target)
- **Risk if deferred:** No external users can access the system

### ADR-002: Notification Channel for Alerts
- **Status:** Open
- **Question:** How should time-sensitive alerts (ending_soon, high-score new opportunity) reach the operator?
- **Options:** (a) Push notifications via web push API, (b) SMS via Twilio, (c) Email digest, (d) iOS home screen PWA badge
- **Recommendation:** Web push notifications as primary, SMS as critical-only fallback. Email for daily digest.
- **Blocker for:** Alert effectiveness -- currently alerts only appear when operator opens the console

### ADR-003: Outcome Tracking Depth
- **Status:** Open
- **Question:** How detailed should post-acquisition tracking be in MVP?
- **Context:** The `outcomes` table schema exists (purchase_price, repair costs, sold_price, fees, net_profit, days_held) but no UI surfaces it.
- **Options:** (a) Full P&L entry per deal, (b) Simple win/loss with final price only, (c) Defer entirely
- **Recommendation:** Option (b) for MVP. Capture final_price on won deals, sale_price when sold. Full P&L is Phase 1.
- **Blocker for:** Realized margin metrics (currently cannot validate if system recommendations produce profit)

### ADR-004: Multi-Source Expansion Priority
- **Status:** Open
- **Question:** Which auction platform adapter should be built next?
- **Context:** GovPlanet is seeded in sources table (disabled). GovDeals referenced in project docs.
- **Options:** (a) GovPlanet (government surplus, already seeded), (b) GovDeals (municipal surplus), (c) Public Surplus
- **Recommendation:** GovPlanet first -- already has source definition, government surplus overlaps with target asset categories.
- **Dependency:** Scout adapter architecture supports this (registry pattern in `core/registry.ts`)

### ADR-005: Scoring Algorithm Transparency
- **Status:** Open
- **Question:** How much of the scoring breakdown should be visible to the operator?
- **Context:** `score_breakdown` is stored as JSON on opportunities. The four scoring dimensions (Margin 40%, Demand 30%, Condition 15%, Logistics 15%) exist but may not be fully surfaced in UI.
- **Recommendation:** Surface all four dimensions with individual scores in opportunity detail view. Operator trust requires understanding why a score is what it is.

---

## Phased Development Plan

### Phase 0: MVP (Current -- Operational)

Phase 0 is largely complete. The system is operational and producing revenue. Remaining Phase 0 work is hardening and gap-filling.

**What is built and working:**
- Scout pipeline with Sierra + IronPlanet adapters (cron every 15 min)
- Three-gate classification (price, negative keywords, positive keywords)
- Claude-powered dual-lens analysis (operator perspective + buyer perspective)
- Three category tiers with specialized prompts (Trailers, Vehicles, Power Tools)
- Full opportunity lifecycle workflow (inbox --> qualifying --> watch --> inspect --> bid --> won/lost)
- Operator console on iOS Safari (dashboard, opportunity list with filters, opportunity detail with analysis)
- Operator inputs system (title status, VIN, condition, overrides)
- Gates system (critical/confidence gates that block or inform bidding)
- Staleness detection and attention-required alerts
- Next Action guidance card (verdict-driven operator guidance)
- Decision reason taxonomy (13 codes, 8 categories, multi-select)
- MVC event logging (immutable audit trail)
- R2 photo storage with 100% coverage
- Batch operations (reject, archive)

**Remaining Phase 0 work (MVP gaps):**

| Item | Priority | Description |
|------|----------|-------------|
| P0 Security: Auth on analyst endpoints | P0 | Issue #123 -- unauthenticated analyst endpoints must be locked down |
| IronPlanet capture rate fix | P1 | Currently ~17% capture rate vs Sierra. Investigate and fix adapter. |
| Outcome tracking (simple) | P1 | Surface final_price on won deals. Basic win/loss P&L. |
| Scout failure alerting | P1 | Operator must know when scout runs fail, not discover stale data |
| 3 failing scout tests | P2 | Known tech debt -- fix before adding more tests |

### Phase 1: Private Beta Readiness (Target: Feb-Mar 2026)

Phase 1 transforms DFG from a founder tool into a system that 3-5 private beta users can access.

**Features in Phase 1:**

| Feature | Rationale |
|---------|-----------|
| Clerk authentication | Replace hardcoded auth. Required for any external user. |
| Stripe billing integration | Subscription management for beta users ($149/mo target) |
| Push notification system | Operators need alerts without keeping the console open |
| GovPlanet adapter | Third auction source, expands deal flow coverage |
| Outcome tracking UI | Full P&L entry for won deals, realized margin dashboard |
| Onboarding flow | New users need location setup, category preferences, notification preferences |
| Per-user category/location preferences | Different operators have different buy boxes |

**Not in Phase 1:**
- Multi-tenant data isolation (beta users share the same deal flow)
- Custom scoring algorithm per user
- Native mobile app
- Automated bidding

### Phase 2: Scale (Target: Q2-Q3 2026)

Phase 2 targets 25-30 paying users at ~$3,200 MRR.

**Deferred to Phase 2:**

| Feature | Rationale for Deferral |
|---------|----------------------|
| Multi-tenant data isolation | Not needed until user count requires it |
| Per-user scoring customization | Need enough outcome data to calibrate |
| Additional auction platform adapters | GovDeals, Public Surplus, etc. |
| Algorithm auto-tuning from outcomes | Requires sufficient outcome volume for statistical validity |
| Geographic market expansion | Currently Phoenix-focused (phoenix-market-data.ts); expand to other metros |
| Daily email digest | Lower priority than push notifications |
| Team/organization support | Solo operators first, teams later |

---

## Appendix: Current System Inventory

For reference, the following summarizes what exists in the codebase as of this review:

**Workers:** dfg-scout (cron */15), dfg-api (cron */5), dfg-analyst, dfg-relay
**App Pages:** Dashboard, Opportunities (list + detail), Filters, Sources, Settings, Login
**Database Tables:** 16 tables including sources, listings, opportunities, analysis_runs, category_defs, operator_actions, outcomes, mvc_events, tuning_events, scout_runs, failed_operations
**Shared Packages:** @dfg/types (consolidated TypeScript types)
**Auction Sources:** Sierra Auction (active), IronPlanet (active, low capture), GovPlanet (seeded, disabled)
**Category Tiers:** Trailers (default), Vehicles, Power Tools -- each with distinct prompts, market comps, profit thresholds
**Auth:** Hardcoded credentials (prototype-grade)
**Deployment:** Cloudflare Workers, Vercel (Next.js), D1, R2

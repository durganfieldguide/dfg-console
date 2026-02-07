# Durgan Field Guide -- Product Requirements Document

> Synthesized from 3-round, 6-role PRD review process. Generated 2026-02-06.
> Roles: Product Manager, Technical Lead, Business Analyst, UX Lead, Target Customer, Competitor Analyst.
> Codebase revision: `a4979fe` (main branch).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Identity](#2-product-vision--identity)
3. [Target Users & Personas](#3-target-users--personas)
4. [Core Problem](#4-core-problem)
5. [Product Principles](#5-product-principles)
6. [Competitive Positioning](#6-competitive-positioning)
7. [MVP User Journey](#7-mvp-user-journey)
8. [MVP Feature Specifications](#8-mvp-feature-specifications)
9. [Information Architecture](#9-information-architecture)
10. [Architecture & Technical Design](#10-architecture--technical-design)
11. [Proposed Data Model](#11-proposed-data-model)
12. [API Surface](#12-api-surface)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Platform-Specific Design Constraints](#14-platform-specific-design-constraints)
15. [Success Metrics & Kill Criteria](#15-success-metrics--kill-criteria)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Open Decisions / ADRs](#17-open-decisions--adrs)
18. [Phased Development Plan](#18-phased-development-plan)
19. [Glossary](#19-glossary)
20. [Appendix: Unresolved Issues](#appendix-unresolved-issues)

---

## 1. Executive Summary

**Problem:** Auction arbitrage on physical assets (trailers, equipment, vehicles) is profitable but time-intensive. Listings surface across fragmented platforms, expire within hours, and require rapid valuation against local demand signals. A solo operator cannot monitor, evaluate, and decide at the volume required to capture the best deals. The operator spends 80% of time rejecting obviously bad listings and 20% evaluating viable ones. Missed opportunities from platform fragmentation and bad acquisitions from rushed math are the two costliest failure modes.

**Solution:** DFG is an automated intelligence system that continuously scrapes auction platforms, runs AI-powered conservative profit analysis on each listing, scores opportunities against demand signals, and surfaces actionable buy/pass recommendations to the operator via a mobile-first web console. The system compresses per-listing evaluation time from 10-15 minutes of manual research to 10-30 seconds of operator review.

**Value:** DFG eliminates three specific failure modes: (1) missed opportunities due to platform fragmentation and manual monitoring limits, (2) bad acquisitions due to rushed or emotional bidding without rigorous financial analysis, and (3) wasted time evaluating listings that do not meet the operator's buy box criteria. The system is already revenue-generating -- profitable acquisitions have been made using the existing platform.

**Current State:** DFG is operational and founder-used. The core pipeline (Scout to Analyst to API to Console) is functional with two auction sources (Sierra Auction active, IronPlanet active but degraded at approximately 17% capture), three category tiers (Trailers, Vehicles, Power Tools), Claude-powered dual-lens valuation, and a full opportunity lifecycle workflow. The web console runs on iOS Safari as the primary interface. Auth is prototype-grade (hardcoded). No external users.

**Competitive context:** Swoopa Dealers (launched January 2026) provides instant valuations and margin clarity for vehicle dealers, converging on DFG's value proposition from the marketplace direction. Rouse Fleet Manager (RB Global) now offers free AI-powered equipment valuations as a buyer acquisition funnel. GSA Auction Pro and AuctionWiser are bringing AI predictions to government surplus auctions. No competitor combines cross-platform auction scraping, conservative per-deal financial modeling with canonical money math, gate-enforced bid readiness, and structured operator workflow. DFG's durable advantages are conservative financial modeling (58 business rules, source-specific fee schedules) and structured workflow with gate enforcement -- the hardest capabilities to replicate because they require domain-specific operational knowledge, not just API calls.

---

## 2. Product Vision & Identity

**Name:** Durgan Field Guide (DFG)

**Tagline:** Find the deals others miss. Move before they can.

**Positioning:** DFG is an operator intelligence tool for physical asset arbitrage at auction. It automates information-gathering and analysis so the operator focuses exclusively on decision-making and execution. DFG's differentiation is (1) accurate, conservative profit analysis that prevents bad acquisitions, and (2) structured workflow that enforces disciplined decision-making. These are harder to replicate than alerts or scraping.

**What DFG IS:**
- A deal flow intelligence engine for physical asset acquisition
- A conservative financial analysis tool that protects the operator from bad buys
- A workflow system that enforces disciplined evaluation before bidding
- A mobile-first operator console designed for on-the-go decision-making (iOS Safari primary, per CLAUDE.md)

**What DFG is NOT:**
- Not a marketplace or auction platform (DFG scrapes platforms; it does not host listings)
- Not a general-purpose dashboard or analytics tool
- Not a fully automated bidding bot (the operator makes final decisions -- Principle #6)
- Not a multi-tenant SaaS product (founder-operated in Phase 0; private beta in Phase 1)
- Not an iOS native app (it is a Next.js web app accessed via iOS Safari, per CLAUDE.md)
- Not competing on alert speed or platform coverage (those are races DFG cannot win yet)

> **Target Customer validation:** "The Competitor Analyst confirmed what I suspected: no one else does what DFG does. Swoopa Dealers is getting closer with instant valuations and margin clarity, but it is vehicles-only and marketplace-only. DFG's conservative financial modeling with acquisition cost breakdown, the dual-lens AI analysis, and the gated workflow -- that combination does not exist anywhere else."

---

## 3. Target Users & Personas

### Persona 1: Scott -- The Founder-Operator (Phase 0)

Scott is the sole operator of DFG and the only user today. He runs a trailer and equipment flipping business out of the Phoenix metro area. His day starts early -- checking auction listings from his phone while drinking coffee, then driving to inspect assets, then placing bids from the truck cab between lot inspections. He does not sit at a desk for extended periods. His phone (iPhone, Safari) is his primary tool.

**Goals:** See what needs action immediately. Make fast, confident bid/pass decisions. Never miss a high-value opportunity. Never buy a bad deal because the math was wrong. Know when the system is broken before it costs him a deal.

**Frustrations:** Stale data (checking a listing only to find it ended yesterday). False positives (high scores on items he would never buy). Slow page loads on mobile. Having to scroll past irrelevant information to reach the decision-critical data. Too many form fields when rejecting obvious garbage. Being redirected away from a page he was reading. Not knowing whether a recommendation came from AI analysis or gate-only fallback.

**Workflow:** Interrupt-driven. He checks the console several times a day in 2-3 minute bursts. He triages quickly -- most opportunities get rejected within seconds of reading the title and seeing the price. The ones that survive get deeper analysis. He rarely uses desktop unless doing end-of-day review.

> **Target Customer validation:** "Before DFG, I spent 2-3 hours a day manually scanning auctions and doing back-of-napkin valuations. DFG cuts that to 20-30 minutes of reviewing pre-scored opportunities. That is roughly 2 hours saved per day."

**Financial literacy:** Scott is financially literate. He understands buyer premiums, transport costs, repair estimates, and resale margins. He does not need these concepts explained -- he needs them calculated correctly and presented clearly. He has zero tolerance for incorrect numbers.

**Buy box:** Trailers: minimum $600 profit, 40% margin, under $6,000 acquisition cost, within 100 miles. These are encoded in the system's category defaults (BR-043).

### Persona 2: Future Beta Tester (Phase 1, referenced for forward compatibility only)

While not an MVP user, the Phase 1 private beta (3-5 users) is the next milestone. These users will be similar to Scott: solo operators in physical asset arbitrage, mobile-first, financially experienced, time-constrained. They will have different geographic locations, different category preferences, and different risk tolerances. DFG's $149/month price will be compared against tools with native apps and push notifications ($0-352/month range). DFG must justify the premium through analysis quality and workflow value.

The MVP architecture should not hard-code assumptions that will break when these users arrive (e.g., Phoenix-specific market data in UI labels) -- but the UX should be optimized exclusively for Scott's workflow today.

---

## 4. Core Problem

> **Target Customer:** "The hardest part of this job is not selling -- it is finding. Finding the deal before someone else does, knowing the real value before I bid, and not getting burned by hidden problems the listing did not mention. I can manually process maybe 20-30 listings a day. There are thousands going through Sierra and IronPlanet every week. I am leaving money on the table every day because I physically cannot look at everything."

The core problem has three dimensions:

1. **Volume vs. capacity mismatch.** Thousands of listings surface weekly across fragmented auction platforms. A solo operator can manually evaluate 20-30 per day. The gap between available deal flow and processing capacity means high-value opportunities are missed daily.

2. **Time pressure under auction constraints.** Auctions have defined end times. Every minute between listing appearance and operator review is a minute a competitor could act. The 10-15 minutes required for manual evaluation per listing -- checking comps, calculating margins, estimating costs -- is too slow at volume.

3. **Cognitive load leading to bad acquisitions.** Under time pressure, operators rush the math or make emotional decisions. A single incorrect margin calculation or missed deal-breaker (salvage title buried in paragraph four of a listing description) can turn a profitable flip into a cash-destroying loss.

> **Target Customer:** "The worst part is the ones I miss. I see a listing the day after it ended -- a utility trailer that went for $900 that I could have flipped for $2,200 -- and I want to throw my phone. I did not miss it because I am bad at this. I missed it because I was busy evaluating the five listings before it."

---

## 5. Product Principles

These are ordered by priority. When principles conflict, the higher-numbered principle wins.

1. **Numbers must be right.** Financial calculations are non-negotiable. A single incorrect margin or double-counted fee destroys operator trust permanently. The canonical money math is the foundation of every product decision:

   - Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
   - Net Proceeds = Sale Price - Listing Fees - Payment Processing
   - Profit = Net Proceeds - Acquisition Cost
   - Margin % = (Profit / Acquisition Cost) * 100

   Listing fees are selling costs only -- never included in acquisition cost. Never double-counted. This principle extends to input mechanisms: browser `prompt()` for entering bid amounts is a numbers-must-be-right issue, not just a UX issue.

2. **Reliability over features.** A system that misses a high-value opportunity because the scraper was down is worse than a system with fewer features that never drops a listing. Uptime, data completeness, and failure visibility take priority over new capabilities. The operator must know when the pipeline breaks without having to discover it by observation. All six review roles identified scout failure alerting as the highest-priority gap.

3. **Conservative over optimistic.** DFG exists to protect the operator from bad acquisitions, not to encourage volume. Analysis should err on the side of lower valuations, higher cost estimates, and PASS/WATCH recommendations when data is insufficient. Verdict thresholds must use AND logic for BUY (both profit AND margin met). A missed good deal is recoverable; a bad acquisition is cash destroyed.

4. **Speed is competitive advantage.** Auctions are time-sensitive. Every minute between listing appearance and operator review is a minute a competitor could act. Performance budgets: API list endpoints under 200ms p95, opportunity detail under 300ms p95, AI analysis under 30s p95, frontend LCP on iOS Safari under 2.5s, INP under 200ms.

5. **Mobile-first, iOS Safari always.** The operator uses this tool in the field -- at auctions, in the truck, walking lots. Every feature must work flawlessly on iOS Safari. Desktop is a convenience, not the primary interface. Per CLAUDE.md: `min-h-screen` not `h-screen`, prefer `position: sticky` over `position: fixed`, 44px minimum touch targets, `pb-safe` for safe area insets.

6. **Operator decides, system recommends.** DFG provides analysis, scoring, and recommendations. The operator makes the final call. The system must never auto-bid, auto-reject viable opportunities, or hide information that could inform a decision. Transparency of reasoning is required. Hard gate auto-rejection is acceptable for clearly disqualifying conditions (salvage title, confirmed), but the operator must be able to see the reason and override. The Kill Switch Banner must not auto-redirect the operator away from the detail page.

7. **Audit everything.** Every operator decision, every analysis run, every status change must be logged with full context. This data feeds algorithm tuning, enables post-mortem analysis, and builds the training corpus for better recommendations. The operator does not interact with audit data directly today -- it is infrastructure for future algorithm tuning.

---

## 6. Competitive Positioning

DFG operates at the intersection of four markets with limited overlap:

| Segment | Players | Relevance to DFG |
|---------|---------|-------------------|
| Government/surplus auction platforms | GovDeals, PublicSurplus, GovPlanet | Data sources with increasingly sophisticated buyer tools (alerts via email/SMS/WhatsApp, saved searches). Platform risk if they block scraping. |
| Equipment auction platforms | IronPlanet/Ritchie Bros, Proxibid, BidSpotter | Data sources with buyer tooling. RB Global owns IronPlanet (DFG's second source at 17% capture) and offers free Rouse Fleet Manager as a buyer funnel. |
| Dealer/professional sourcing tools | Swoopa Dealers, Swoopa (consumer), Flipify, DealScout | Alert-based sourcing tools for resellers. Swoopa Dealers has moved into valuations and comps, converging toward DFG's territory. DealScout offers a free tier. |
| Equipment valuation services | Rouse Analytics (RB Global), GSA Auction Pro, AuctionWiser | AI-powered valuation and analytics. Rouse Fleet Manager base tier is now free. GSA Auction Pro provides AI price predictions for government surplus. |

### Feature Comparison Matrix

| Feature | DFG (MVP) | Swoopa Dealers | Swoopa | Flipify | DealScout | Rouse Fleet Manager | GSA Auction Pro |
|---------|-----------|----------------|--------|---------|-----------|--------------------|----|
| Cross-platform auction scraping | Yes (2 sources) | No (marketplaces) | No (marketplaces) | No (2 marketplaces) | No (1 marketplace) | No (own platforms) | No (GSA only) |
| AI-powered profit analysis | Yes (Claude, dual-lens) | Basic (comps + margin) | Basic (price compare) | No | No | Yes (ML, institutional) | Yes (price prediction) |
| Conservative financial modeling | Yes (canonical money math, 58 rules) | No | No | No | No | No (reference values) | No |
| Category-specific intelligence | Yes (3 tiers) | Vehicles only | No | No | No | Yes (75K+ models) | Yes (by GSA category) |
| Gate-enforced bid readiness | Yes (critical + confidence gates) | No | No | No | No | No | No |
| Operator workflow (7-stage lifecycle) | Yes | No | No | No | No | No | No |
| Push notifications | No (in-app only) | Yes (native) | Yes (native) | Yes (native) | Yes (native) | No | No |
| Alert speed | 15-min cron | Near-instant | Sub-minute | Seconds | 5 min (premium) | N/A | N/A |
| Decision audit trail | Yes (MVC events, immutable) | No | No | No | No | No | No |
| Free tier | No | Free download | 48-hr trial | 5-day trial | Yes (1-hr alerts) | Yes (base tier) | Unknown |
| Price per month | $149 target | $47-145 | $47-352 | $5-10 | Free-premium | Free-$500+ | Unknown |

### Durable Competitive Advantages

1. **Conservative financial modeling with canonical money math.** No competitor implements a structured acquisition cost model with separate selling cost modeling and explicit guard against double-counting. The 58 business rules governing this system encode domain-specific knowledge of auction fee structures. This is the hardest thing for competitors to replicate.

2. **Gate-enforced bid readiness.** The seven-stage lifecycle with critical gates (title status, lien status, mileage verification) that block bidding on unverified deals is unique. The 20% max-bid haircut on uncleared gates (BR-029) allows the operator to proceed while signaling risk.

3. **AI-powered dual-lens analysis with calibrated tuning feedback loop.** Claude-powered analysis from both investor and buyer perspectives, with specialized prompts per asset class, calibrated through the tuning events system. The moat is calibration data and domain knowledge, not the API call. Feature-level AI parity from competitors is expected within 12-18 months; calibration-level parity requires operational data DFG is accumulating now.

### Where DFG Does NOT Differentiate

1. **Alert speed and delivery.** 15-minute cron with in-app-only alerts is the weakest point. Every direct competitor has push notifications.
2. **Platform coverage breadth.** Two active sources (one degraded) versus Swoopa's 7+ marketplaces.
3. **Native app experience.** DFG is a web app on iOS Safari. All direct competitors are native.
4. **Upfront valuations.** DFG requires the operator to tap "Analyze." Swoopa Dealers shows estimates immediately.
5. **Free-tier entry point.** DealScout and Rouse Fleet Manager offer free tiers. DFG has none.

### Pricing Defensibility

DFG's $149/month target is at the top of the individual operator segment -- above Swoopa Dealers' ceiling ($145/month) and well above alert-only tools ($0-47/month). The premium is justified by analysis quality and workflow discipline. The ROI math is the key selling point: one good deal ($600 minimum profit) covers four months of subscription. For Phase 1: a 14-day free trial (time-limited, not feature-limited) is recommended.

> **Target Customer validation:** "I would pay $300/month without blinking if the analysis is reliable and the scout does not miss things. The price sensitivity is not about the dollar amount -- it is about whether the tool actually works."

---

## 7. MVP User Journey

The MVP user journey has two primary flows designed for the interrupt-driven, mobile-first usage pattern.

### Flow 1: Daily Triage Loop (2-3 minutes, multiple times per day)

**Step 1: Open Console (Dashboard)**
Scott opens the app from his iPhone home screen. The Dashboard loads and immediately shows:
- **Scout Health Banner (topmost element):** Hidden when scout is healthy (last successful run within 30 minutes); red full-width banner when unhealthy: "Scout has not run since [relative time]. Deal flow may be stale." with "Details" link to Sources page. This is the first thing the operator sees to establish trust in data freshness.
- **Attention Required list:** Priority-sorted items needing action, with inline quick actions for pass/watch/re-analyze.
- **Quick Stats grid:** Inbox count, Strike Zone count, Needs Info count, Qualifying count, Watching count, Bidding count.
- **Ending Soon list:** Items with countdown timers, sorted by urgency.
- **Pipeline Overview:** Counts by status with tap-to-filter.
- **New Today indicator:** Deep-linked to filtered list.
- **Results footer bar:** "Won: N deals / $X,XXX total" using `SUM(final_price)` -- this is acquisition spend, not profit.

This screen answers: "What needs my attention right now?"

**Step 2: Triage Inbox (Opportunities List, status=inbox)**
Scott taps the Inbox card. Each opportunity card shows urgency indicators, status badge, title, price, time remaining, distance, and a "Last updated X min ago" label (amber when older than 15 minutes). Cards are visually differentiated by score (green tint for high-score) and urgency (left border for alerts).

Filter chips on mobile are consolidated: "Needs Refresh" (combines stale, analysis_stale, decision_stale) and "Ending Soon" replace five separate staleness toggles. The full filter page retains granular API-backed filters.

**Step 3: Quick Reject or Advance**
For most inbox items, Scott opens the detail page, scans the Next Action Card (verdict + reasoning + max bid + analysis source indicator), glances at photos, and either rejects (tap Reject, select one reason code from 6-code grid) or advances to qualifying (tap Qualify). This takes 10-30 seconds per item.

**Step 4: Return to Dashboard**
After triaging, Scott returns to confirm counts have changed and checks if any Ending Soon items need immediate attention.

### Flow 2: Deep Evaluation Flow (3-10 minutes per opportunity)

**Step 1:** Navigate to opportunity detail page. The Next Action Card is the most prominent element.

**Step 2: Review AI Analysis.** If no analysis exists, tap "Analyze." Analysis runs (p95 under 45 seconds) and populates the tabbed interface. Default tab is **Summary** (max bid range, retail estimate, expected profit, margin percentage, all-in acquisition cost breakdown). The Next Action Card includes an analysis source indicator: "AI-powered analysis" (default) or "Estimate only -- AI unavailable" (amber badge when gate-only fallback).

> **Target Customer validation:** "I want to open an opportunity and know in 3 seconds what I should do."

**Step 3: Review Photos.** Horizontal-scrolling 96x96 thumbnails. Tap opens full-screen lightbox with swipe navigation between photos.

**Step 4: Verify Title Information (Operator Inputs).** Fill in Title Info form: title status, title in hand, lien status, VIN, odometer. Saving triggers gate computation. Hard gate failure produces the Kill Switch Banner inline -- no auto-redirect.

**Step 5: Check Gates (Bid Readiness).** Gates Display shows critical and confidence gates with pass/fail/unknown status. 20% max-bid haircut when gates are NOT cleared.

**Step 6: Decision.** Based on current status, the action bar shows contextually relevant actions:
- `inbox`: Qualify (primary), Watch (secondary), Reject (danger)
- `qualifying`: Inspect (primary -- highlighted green when analysis exists with BID/WATCH recommendation), Watch (secondary), Reject (danger)
- `watch`: Inspect (primary), Qualify (secondary), Reject (danger)
- `inspect`: Set Bid (primary), Reject (danger)
- `bid`: Won (primary), Lost (danger)
- `won`/`lost`/`rejected`: Archive (secondary)

Financial inputs (Set Bid, Won) use custom modals with `inputmode="decimal"`, currency formatting preview, positive-value validation, and confirmation step. Reject uses a single-select 6-code grid.

**Step 7: Staleness Loop.** If operator inputs change after analysis, a Staleness Banner appears with a "Re-Analyze" button.

---

## 8. MVP Feature Specifications

### US-001: Review New Opportunities

**Narrative:** As an operator, I want to see all newly surfaced auction opportunities in a prioritized inbox so that I can quickly identify which items deserve further evaluation before their auctions close.

**Acceptance Criteria:**
- AC-001.1: Inbox opportunities displayed sorted by `auction_ends_at ASC` (soonest-ending first, NULLs last).
- AC-001.2: Strike Zone criteria: status `inbox` or `qualifying`, score >= 70, analysis exists, and auction ends within 48 hours or created within last 12 hours.
- AC-001.3: Opportunity cards display title, current bid (USD), auction end time (relative), distance, buy_box_score, primary image, and "Last updated X min ago" label (amber when > 15 minutes). All interactive elements meet 44x44px minimum touch targets.
- AC-001.4: Status filter returns only matching opportunities with accurate total count.
- AC-001.5: Pagination via `limit` and `offset` with correct totals.
- AC-001.6: List endpoint responds in < 200ms at p95.

**Business Rules:** BR-001 (opportunities enter as `inbox` via Scout), BR-002 (stats returns all 9 statuses), BR-003 (score bands: high >= 70, medium 40-69, low < 40).

### US-002: Evaluate Opportunity Detail

**Narrative:** As an operator, I want to view comprehensive details of a single opportunity -- including AI-generated analysis, pricing breakdown, photos, timing, and gates status -- so that I can make an informed acquisition decision.

**Acceptance Criteria:**
- AC-002.1: Detail page displays all fields from the GET response including title, description, source, status, pricing, timing, photos, scoring, analysis, operator inputs, gates, and action history.
- AC-002.2: Persisted AI analysis is displayed from `analysis_runs.ai_analysis_json` without requiring a new AI call.
- AC-002.3: Photo thumbnails open full-screen lightbox with swipe-left/right navigation. Tap outside or Escape closes it.
- AC-002.4: "View Listing" opens original auction listing in new tab. If `source_url` is null, "No link" label shown.
- AC-002.5: Alerts displayed sorted by severity (critical > high > medium > low) with dismiss buttons.
- AC-002.6: Default tab is **Summary** (not Report), showing max bid range, retail estimate, expected profit, margin percentage, and all-in acquisition cost breakdown.
- AC-002.7: API response completes in < 300ms at p95.
- AC-002.8: "Last updated X min ago" label in detail header, turning amber when data is older than 15 minutes.

**Business Rules:** BR-004 (`source_defaults` returns premium/pickup from sources table), BR-005 (no "View Listing" when URL is null), BR-006 (alert dismissals stored in `operator_actions`).

### US-003: Run AI Analysis on Demand

**Narrative:** As an operator, I want to trigger an AI-powered analysis so that I get a dual-lens evaluation with max bid recommendation, repair estimates, and deal readiness assessment.

**Acceptance Criteria:**
- AC-003.1: Analysis creates an `analysis_runs` record with recommendation, derived, gates, and AI analysis persisted.
- AC-003.2: BUY verdict requires all critical gates cleared AND both `min_profit` AND `min_margin` met (BR-065, AND logic).
- AC-003.3: If critical gates NOT cleared, recommendation is WATCH (not BID).
- AC-003.4: MARGINAL verdict maps to WATCH regardless of gates.
- AC-003.5: PASS verdict maps to PASS regardless of gates.
- AC-003.6: When analyst is unavailable, analysis completes with `aiAnalysisResult = null` and gate-based fallback. UI displays visible indicator: "Estimate only -- AI unavailable" (BR-066).
- AC-003.7: Delta object returned showing change from previous analysis.
- AC-003.8: Optimistic lock (409 Conflict) with orphaned record cleanup on concurrent modifications.
- AC-003.9: Both `last_analyzed_at` and `last_operator_review_at` updated on success.
- AC-003.10: Full analysis (with AI) < 30s p95. Without AI < 500ms p95. End-to-end pipeline < 45s p95.

**Business Rules:** BR-007 (immutable analysis runs), BR-008 (canonical money math), BR-009 (Sierra fee schedule), BR-010 (max_bid_low = AI max bid * 0.9), BR-065 (AND logic for BUY), BR-066 (gate-only fallback visually distinct).

### US-004: Advance Opportunity Through Workflow

**Narrative:** As an operator, I want to transition an opportunity through defined workflow stages so that I maintain a disciplined evaluation process and the system captures decisions for algorithm tuning.

**Acceptance Criteria:**
- AC-004.1: "Qualify" from inbox transitions to qualifying with `status_changed_at` updated.
- AC-004.2: Invalid transitions return `INVALID_TRANSITION` (400).
- AC-004.3: Transition to `bid` requires `max_bid_locked > 0`.
- AC-004.4: Transition to `won` requires `final_price > 0`.
- AC-004.5: Every transition creates an `operator_actions` record.
- AC-004.6: Transition to `bid` emits MVC `decision_made` event BEFORE status change.
- AC-004.7: Transition to `rejected` emits MVC `decision_made` event BEFORE status change.
- AC-004.8: Action bar shows only contextually valid actions per status. For `qualifying`, "Inspect" is highlighted green when analysis exists with BID/WATCH recommendation.

**Business Rules:** BR-012 (state machine transitions enforced server-side), BR-013 (every change creates operator_actions AND MVC event), BR-014 (watch-to-qualifying backward transition allowed), BR-059 (no inbox-to-bid; minimum 3 transitions), BR-067 (Inspect shortcut from inbox: two sequential PATCHes in one user action with full audit records).

### US-005: Set Watch with Alert Trigger

**Narrative:** As an operator, I want to place an opportunity on watch with a configurable trigger condition so that I am alerted at the right moment before the auction closes.

**Acceptance Criteria:**
- AC-005.1: `ending_soon` trigger sets `watch_until` to `auction_ends_at - hours_before`.
- AC-005.2-5.4: Validation for expired auctions, too-short windows, and non-future remind_at.
- AC-005.5: `watch_cycle` increments, `watch_fired_at` nulled on transition.
- AC-005.6: Leaving watch clears all watch fields.
- AC-005.7: Fired watch triggers appear in alerts with severity `high`.

**Business Rules:** BR-015 (trigger types), BR-016 (monotonic watch_cycle), BR-017 (dismissal key format), BR-060 (5-minute cron latency, 4-hour default threshold provides buffer).

### US-006: Reject Opportunity with Structured Reason

**Narrative:** As an operator, I want to reject with a categorized reason so that the system uses rejection patterns to improve future scoring.

**Acceptance Criteria:**
- AC-006.1: Missing rejection_reason returns 400.
- AC-006.2: `other` without rejection_note returns 400.
- AC-006.3: Creates `tuning_events` record with event_type `rejection`.
- AC-006.4: Reject modal shows single-select grid of 6 codes (too_far, too_expensive, wrong_category, poor_condition, missing_info, other) with 44px+ tap targets. Legacy dropdown removed.
- AC-006.5: MVC `decision_made` event logged with `decision='PASS'` and reason codes.
- AC-006.6: Analyst verdict included in event payload when rejecting a BID recommendation.

**Business Rules:** BR-018 (6 valid rejection reasons), BR-019 (13-code taxonomy for Phase 1), BR-020 (rejection signals feed scoring), BR-021 (disagreements tracked as false positives), BR-061 (2-tap completion; multi-select grid is sole mechanism).

### US-007: Batch Operations

**Narrative:** As an operator, I want to batch-reject or batch-archive multiple opportunities to efficiently clear low-quality items.

**Acceptance Criteria:**
- AC-007.1-7.6: Batch applies single reason, max 50 items, partial success, individual results, tuning events per item.

**Business Rules:** BR-022 (reject and archive only), BR-023 (max 50), BR-024 (not atomic, sequential), BR-025 (individual audit records), BR-062 (single reason for all items).

### US-008: Provide Operator Inputs for Gate Clearance

**Narrative:** As an operator, I want to enter verified title/VIN/condition data so that gates can determine bid readiness and analysis produces more accurate economics.

**Acceptance Criteria:**
- AC-008.1: Deep merge of operator inputs.
- AC-008.2: `titleStatus='salvage'` (verified) triggers auto-rejection with hard gate failure.
- AC-008.3: No auto-rejection on terminal states.
- AC-008.4: `augmentation` action record created.
- AC-008.5: `inputsChangedSinceAnalysis` flag when inputs changed.
- AC-008.6: "Needs Info" filter (API: `verification_needed`) for opportunities with missing/unverified title, lien, or mileage data.
- AC-008.7: Auto-rejection tuning events use `event_type: 'rejection'` with `auto_rejected: true` (not `status_change`).

**Business Rules:** BR-026 (hard gates: salvage/missing title), BR-027 (deep merge), BR-028 (auto-rejection audit records), BR-029 (20% haircut when NOT_BID_READY), BR-063 (Kill Switch Banner: no auto-redirect, inline display).

### US-009: Track Auction Outcomes

**Narrative:** As an operator, I want to record win/loss and final price so that the system can validate analysis accuracy and track margins.

**Acceptance Criteria:**
- AC-009.1: Won transition stores `final_price`.
- AC-009.2: Lost transition requires no additional fields.
- AC-009.3: `final_price` retrievable via GET.
- AC-009.5: Financial input validates for positive numeric values. Browser `prompt()` accepted for Phase 0 founder use; custom modal (Pattern 8) required for Phase 1.
- AC-009.6: `sold_price` field (migration 0010) enables minimum viable realized margin: `(sold_price - acquisition_cost) / acquisition_cost * 100`.

**Business Rules:** BR-030 (final_price > 0 for won), BR-032 (realized margin using canonical money math; listing fees are selling costs only), BR-033 (>= 2 acquisitions/month, >= 25% average margin).

### US-010: Monitor Scout Pipeline Health

**Narrative:** As an operator, I want to know when the data pipeline fails so that I can trust I am seeing all available opportunities.

**Acceptance Criteria:**
- AC-010.1: `last_scout_run` on stats endpoint returns timestamp of most recent successful run (currently null -- P0 gap).
- AC-010.2: Ending soon filters correctly exclude expired auctions.
- AC-010.3: 95% of scheduled runs complete successfully.
- AC-010.4: Red warning banner when last successful run > 30 minutes: "Scout has not run since [time]. Deal flow may be stale."

**Business Rules:** BR-034 (95% uptime target), BR-035 (scout alerting is P0 -- unanimous), BR-036 (IronPlanet at 17% is P0: fix or disable).

### US-011: Staleness Detection and Re-Analysis

**Narrative:** As an operator, I want to know when analysis is stale so I can re-analyze before deciding on outdated information.

**Acceptance Criteria:**
- AC-011.1: `is_stale` after 3 days without operator review.
- AC-011.2: `is_analysis_stale` after 7 days (or NULL).
- AC-011.3: `is_decision_stale` for bid/watch within 24 hours of auction end.
- AC-011.4: `is_ending_soon` within 48 hours.
- AC-011.5: Staleness banner with "Re-Analyze" button when inputs changed since analysis.

**Business Rules:** BR-037 (3-day/7-day thresholds), BR-038 (terminal statuses excluded), BR-039 (attention combines stale flags).

### US-012: Dashboard Attention Summary

**Narrative:** As an operator, I want the dashboard to highlight items needing attention so I can prioritize review time.

**Acceptance Criteria:**
- AC-012.1: Stats includes `by_status`, `strike_zone`, `verification_needed` (UI: "Needs Info"), `ending_soon`, `new_today`, `stale_qualifying`, `watch_alerts_fired`, `needs_attention`.
- AC-012.2: Strike zone qualifies when: status inbox/qualifying, score >= 70, analysis exists, ending within 48h or created within 12h.
- AC-012.3: `needs_attention` = watch_alerts_fired + stale_qualifying.over_24h.
- AC-012.4: All counts visible without horizontal scrolling on iOS Safari, 44px+ tap targets.
- AC-012.5: Inline "Pass" action uses `missing_info` as default reason (not `other`) to avoid validation failure (EC-014).
- AC-012.6: Results footer bar displays won count and `SUM(final_price)` for won opportunities.

**Business Rules:** BR-040 (Strike Zone is primary triage), BR-041 ("Needs Info" label; API filter `verification_needed` unchanged), BR-042 (median < 4 hours inbox to qualifying/rejected), BR-068 (Results footer shows acquisition value, not profit).

---

## 9. Information Architecture

### Screen Inventory (7 screens)

Navigation is a sidebar on desktop (w-64, persistent) and a hamburger slide-over menu on mobile (fixed header h-14, slide-in panel w-72 from left).

**Primary navigation items (4):**
1. Dashboard (`/`) -- LayoutDashboard icon
2. Opportunities (`/opportunities`) -- Search icon
3. Sources (`/sources`) -- Database icon
4. Settings (`/settings`) -- Settings icon

#### 1. Login (`/login`)
- DFG Console branding, email + password form (hardcoded, prototype-grade), no registration.

#### 2. Dashboard (`/`)
- **Scout Health Banner (topmost, sticky):** Hidden when healthy; red full-width when last run > 30 min.
- **Attention Required:** Priority-sorted with inline quick actions (re-analyze, touch, pass, watch). Pass uses `missing_info` default with 5-second undo toast.
- **Quick Stats grid:** 2-column tappable cards -- Inbox (blue), Strike Zone (orange), Needs Info (purple, subtitle: "Missing title, lien, or mileage data"), Qualifying (amber), Watching (blue), Bidding (green).
- **Ending Soon list:** Countdown timers, sorted by auction end time.
- **Pipeline Overview:** All 9 statuses with counts.
- **New Today indicator:** Count with filtered list link.
- **Results footer bar (sticky):** "Won: N deals / $X,XXX total" using `SUM(final_price)`.

#### 3. Opportunities List (`/opportunities`)
- Signal-first cards with urgency indicators, score tinting, source labels, "Last updated" timestamps.
- Mobile consolidated filter chips: "Needs Refresh" and "Ending Soon."
- Batch mode: long-press (mobile) or checkbox (desktop), max 50, single reason code grid.

#### 4. Filters (Mobile Full-Page) (`/opportunities/filters`)
- Dropdown selects (Status, Score, Ending), Quick Filters toggles, Views toggles.
- Fixed bottom "Apply Filters" button with `pb-safe`.

#### 5. Opportunity Detail (`/opportunities/[id]`)
- **Header** with back button, title, "Last updated" label, Analyze button, View Listing link.
- **Alerts bar** (red background, severity badges).
- **Next Action Card:** Verdict (BID/INSPECT/PASS) in large colored text, "Why" bullets, walk triggers, max bid (with haircut note if applicable), analysis source indicator (AI-powered vs. "Estimate only -- AI unavailable" amber badge).
- **Staleness Banner** (yellow) with "Re-Analyze" button.
- **Kill Switch Banner** (red) with inline disqualification reason. Two actions: "Confirmed -- reject" and "This info may be wrong -- edit inputs." No auto-redirect.
- **Tabbed Analysis:** Summary (default), Report, Condition, Investor, Buyer.
- **Photo strip** with lightbox (swipe, counter, tap-outside dismiss).
- **Status + Score, Gates Display, Title Info, Required Exit Calculator, Pricing, Timing, Description, Analysis Summary, History, Decision History** cards.
- **Fixed bottom action bar** with contextual buttons per status, 44px height, `pb-safe`.
- **Set Bid Modal, Won Modal:** Bottom-sheet, `inputmode="decimal"`, currency preview, validation, confirm/cancel.
- **Reject Modal:** Bottom-sheet, single-select 6-code grid, 44px+ targets, "other" requires note.

#### 6. Sources (`/sources`)
- Active/Disabled sections, source cards with premium/pickup/last run, "Run Scout" button.

#### 7. Settings (`/settings`)
- Auction sources config, API config, About.

### Interaction Patterns (Key)

| Pattern | Description |
|---------|-------------|
| Pattern 1: Status Transitions | Fixed bottom action bar, contextual per status. Non-optimistic (waits for server response). MVC events block bid/reject transitions. |
| Pattern 2: Filtering | Desktop inline, mobile full-page. URL-parameter state. Consolidated chips: "Needs Refresh," "Ending Soon." |
| Pattern 3: AI Analysis | Analyze button, p95 < 45s. Result in Summary tab + Next Action Card. Gate-only fallback with amber indicator. |
| Pattern 4: Operator Input Save | Deep merge, dirty flag, staleness cascade on save. Kill Switch Banner for hard gate failures. |
| Pattern 5: Photo Viewing | 96x96 thumbnails, fixed full-screen lightbox, swipe navigation, `touch-action: pan-y`, Escape/arrow keys. |
| Pattern 6: Attention Dashboard | Priority-sorted, rank badges, inline actions. Pass with `missing_info` default + 5-second undo toast. |
| Pattern 7: Batch Reject | Long-press activation, single reason code grid, max 50 items, partial success. |
| Pattern 8: Financial Input Modals | Bottom-sheet, `inputmode="decimal"`, currency preview, input sanitization, positive validation, confirm/cancel. |
| Pattern 9: Undo Toast | 5-second window, "Rejected [title]. Undo?" Client-side delay approach: API call fires after 5 seconds, cancelled on undo. |

---

## 10. Architecture & Technical Design

### System Boundary Diagram

```
                         iOS Safari
                             |
                             v
                    +----------------+
                    |   dfg-app      |
                    |  (Next.js 14)  |
                    |  Vercel        |
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
              |   - D1 binding: "DB"       |
              +--+--------+--------+------+
                 |        |        |
      Service    |   D1   |        | Service
      Binding    |  Shared|        | Binding
                 v        v        v
        +--------+   +----+---+  +----------+
        |dfg-scout|  |  D1    |  |dfg-analyst|
        | (Worker)|  |SQLite  |  | (Worker)  |
        | Cron:   |  |16 tbls |  | Claude API|
        | */15    |  +--------+  +-----+-----+
        | D1: "DFG_DB"               |
        +---+-----+             Anthropic API
            |     |
            v     v
       +------+ +-----+
       |  R2  | | KV  |
       |Evid. | |Scout|
       +------+ +-----+
```

### Layer Architecture

| Layer | Service | Responsibility | Runtime | D1 Binding |
|-------|---------|----------------|---------|------------|
| Presentation | dfg-app | Operator console, iOS Safari optimized | Next.js 14 on Vercel | N/A |
| API Gateway | dfg-api | Auth, CRUD, state machine, ingest orchestration, watch cron | CF Worker | `DB` |
| Intelligence | dfg-analyst | AI-powered condition assessment + profit analysis | CF Worker | N/A |
| Collection | dfg-scout | Auction scraping, normalization, category routing | CF Worker | `DFG_DB` |

**Key architectural fact:** dfg-api and dfg-scout use different binding names (`DB` vs `DFG_DB`) but point to the same D1 database instance (`dfg-scout-db` in production, ID `08c267b8-b252-422a-8381-891d12917b33`; `dfg-scout-db-preview` in development, ID `e6af9d25-b031-4958-a3b2-455bafdff5f1`). Migration runbooks must reference the correct binding name per worker.

### Key Design Decisions

1. **Shared D1 database.** dfg-api and dfg-scout share the same D1 instance. dfg-api reads from `listings` (written by scout) and manages `opportunities` as the operator-facing entity. Binding names differ. This avoids cross-worker synchronization but couples schema evolution.

2. **Service bindings for worker-to-worker calls.** dfg-api calls dfg-analyst and dfg-scout via Cloudflare service bindings (`ANALYST` and `SCOUT` bindings), with URL fallbacks for local development. Service binding calls bypass the analyst's Bearer token auth (trusted, same account).

3. **Alerts are computed, not stored.** Alert state derived at read time from opportunity fields. Dismissals stored as `operator_actions` rows. Eliminates stale alert data at the cost of per-request computation.

4. **Analysis runs are immutable snapshots.** Each execution creates a new `analysis_runs` row. `current_analysis_run_id` pointer enables history traversal.

5. **Optimistic concurrency on analysis.** `WHERE id = ? AND updated_at = ?` detects concurrent modifications. 409 Conflict with orphaned record cleanup.

6. **Category-specific AI prompts.** Analyst dispatches to different prompt files per category (trailers, vehicles, power tools).

7. **State machine enforces disciplined evaluation.** Progressive stage advancement (inbox -> qualifying -> inspect -> bid). Direct jumps from inbox to bid intentionally disallowed (Principle #3).

8. **Verdict thresholds use AND logic for BUY (ADR-006/007).** Both `min_profit` AND `min_margin` required. WATCH requires either. PASS when neither.

### Decisions Needing Validation

1. **No request queuing for analyst calls.** Synchronous with 25s timeout. Acceptable for single operator; needs queue for scale.
2. **D1 row-level locking via application-layer checks.** Fine for single operator; will produce conflicts under concurrent use.
3. **No WebSocket / real-time push.** Operator must poll or refresh. Web Push API recommended for Phase 1.

---

## 11. Proposed Data Model

The schema reflects what is deployed (migrations 0001-0007) plus three required Phase 0 migrations (0008, 0008b, 0009, 0010).

### Migration Lineage

| Migration | Description | Owner | Status |
|-----------|-------------|-------|--------|
| 0001 | opportunities, operator_actions, tuning_events, sources + seeds | dfg-api | Deployed |
| 0002 | Drop alert_dismissals (folded into operator_actions) | dfg-api | Deployed |
| 0003 | analysis_runs + operator_inputs_json + current_analysis_run_id | dfg-api | Deployed |
| 0004 | staleness columns (last_operator_review_at, exit_price) | dfg-api | Deployed |
| 0005 | Standardize Sierra source ID | dfg-api | Deployed |
| 0006 | mvc_events table | dfg-api | Deployed |
| 0007 | ai_analysis_json on analysis_runs | dfg-api | Deployed |
| **0008** | **listing_id UNIQUE constraint on opportunities** | **dfg-api** | **Required -- Phase 0** |
| **0008b** | **Fix tuning_events CHECK constraint (belt-and-suspenders)** | **dfg-api** | **Required -- Phase 0** |
| **0009** | **Formalize analysis_runs snapshot columns** | **dfg-api** | **Required -- Phase 0** |
| **0010** | **Add sold_price to opportunities** | **dfg-api** | **Required -- Phase 0** |

### Core Tables DDL

```sql
-- =============================================================================
-- sources: Auction platform definitions
-- Owner: dfg-api (migration 0001)
-- =============================================================================
CREATE TABLE sources (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  enabled                 INTEGER NOT NULL DEFAULT 1,
  base_url                TEXT NOT NULL,
  default_buyer_premium_pct REAL NOT NULL DEFAULT 15.0,
  default_pickup_days     INTEGER NOT NULL DEFAULT 5,
  last_run_at             TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

-- Seeded sources:
-- sierra_auction: 15% premium, 5 pickup days (active, primary)
-- ironplanet: 12% premium, 7 pickup days (active, ~17% capture rate -- P0 fix or disable)
-- govplanet: 10% premium, 10 pickup days (disabled, Phase 1 candidate)

-- =============================================================================
-- opportunities: Operator-facing entity for acquisition workflow
-- Owner: dfg-api (migrations 0001, 0003, 0004, 0008, 0010)
-- =============================================================================
CREATE TABLE opportunities (
  id                      TEXT PRIMARY KEY,
  source                  TEXT NOT NULL REFERENCES sources(id),
  source_lot_id           TEXT,
  source_url              TEXT,
  listing_id              TEXT,

  -- State machine
  status                  TEXT NOT NULL DEFAULT 'inbox'
                          CHECK (status IN (
                            'inbox','qualifying','watch','inspect',
                            'bid','won','lost','rejected','archived'
                          )),
  status_changed_at       TEXT NOT NULL,

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
  auction_ends_at         TEXT,
  pickup_deadline         TEXT,

  -- Scoring
  buy_box_score           REAL DEFAULT 0,
  score_breakdown         TEXT,      -- JSON: { margin, demand, condition, logistics }
  unknown_count           INTEGER DEFAULT 0,

  -- Analysis
  max_bid_low             REAL,
  max_bid_high            REAL,
  analysis_summary        TEXT,
  last_analyzed_at        TEXT,
  operator_inputs_json    TEXT,      -- JSON: OperatorInputs (0003)
  current_analysis_run_id TEXT REFERENCES analysis_runs(id), -- (0003)

  -- Observed facts
  observed_facts          TEXT,      -- JSON: ObservedFacts

  -- Watch state
  watch_cycle             INTEGER DEFAULT 0,
  watch_until             TEXT,
  watch_trigger           TEXT CHECK (watch_trigger IN (
                            'ending_soon','time_window','manual'
                          ) OR watch_trigger IS NULL),
  watch_threshold         TEXT,      -- JSON: WatchThreshold
  watch_fired_at          TEXT,

  -- Bid state
  max_bid_locked          REAL,
  bid_strategy            TEXT CHECK (bid_strategy IN (
                            'manual','snipe','auto'
                          ) OR bid_strategy IS NULL),

  -- Outcome
  exit_price              REAL,      -- (0004)
  final_price             REAL,      -- Purchase price on won deals
  sold_price              REAL,      -- Sale price recorded by operator (0010)
  outcome_notes           TEXT,

  -- Rejection
  rejection_reason        TEXT CHECK (rejection_reason IN (
                            'too_far','too_expensive','wrong_category',
                            'poor_condition','missing_info','other'
                          ) OR rejection_reason IS NULL),
  rejection_note          TEXT,

  -- Media
  r2_snapshot_key         TEXT,
  photos                  TEXT,      -- JSON array of URLs
  primary_image_url       TEXT,

  -- Staleness
  last_operator_review_at TEXT,      -- (0004)

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
CREATE INDEX idx_opportunities_staleness
  ON opportunities(status, last_operator_review_at, auction_ends_at)
  WHERE status NOT IN ('rejected', 'archived', 'won', 'lost');

-- MIGRATION 0008: Prevent duplicate opportunities from the same listing
CREATE UNIQUE INDEX idx_opportunities_listing_id_unique
  ON opportunities(listing_id) WHERE listing_id IS NOT NULL;

-- =============================================================================
-- analysis_runs: Immutable analysis snapshots
-- Owner: dfg-api (migrations 0003, 0007, 0009)
-- =============================================================================
CREATE TABLE analysis_runs (
  id                      TEXT PRIMARY KEY,
  opportunity_id          TEXT NOT NULL REFERENCES opportunities(id)
                          ON DELETE CASCADE,
  created_at              TEXT NOT NULL,

  -- Snapshot inputs
  listing_snapshot_hash   TEXT NOT NULL,
  assumptions_json        TEXT NOT NULL,
  operator_inputs_json    TEXT,

  -- Computed outputs
  derived_json            TEXT NOT NULL,
  gates_json              TEXT NOT NULL,
  recommendation          TEXT NOT NULL
                          CHECK (recommendation IN (
                            'BID','WATCH','PASS','NEEDS_INFO'
                          )),
  trace_json              TEXT NOT NULL,

  -- AI analysis (0007)
  ai_analysis_json        TEXT,

  -- Snapshot context (0009)
  snapshot_current_bid    REAL,
  snapshot_photo_count    INTEGER,
  snapshot_end_time       TEXT,

  -- Versioning
  calc_version            TEXT,
  gates_version           TEXT
);

CREATE INDEX idx_analysis_runs_opportunity ON analysis_runs(opportunity_id);
CREATE INDEX idx_analysis_runs_created ON analysis_runs(created_at DESC);

-- =============================================================================
-- operator_actions: Audit log
-- Owner: dfg-api (migration 0001)
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
  payload                 TEXT,
  created_at              TEXT NOT NULL
);

CREATE INDEX idx_operator_actions_opportunity ON operator_actions(opportunity_id);
CREATE INDEX idx_operator_actions_created ON operator_actions(created_at DESC);
CREATE INDEX idx_operator_actions_type ON operator_actions(action_type);
CREATE INDEX idx_operator_actions_dismissals
  ON operator_actions(opportunity_id, alert_key)
  WHERE action_type = 'alert_dismiss';

-- =============================================================================
-- mvc_events: Immutable decision event log
-- Owner: dfg-api (migration 0006)
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
  payload                 TEXT NOT NULL,
  schema_version          TEXT NOT NULL DEFAULT '1.0',
  emitted_at              TEXT NOT NULL,
  created_at              TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_mvc_events_idempotency
  ON mvc_events(opportunity_id, sequence_number);
CREATE INDEX idx_mvc_events_opportunity
  ON mvc_events(opportunity_id, emitted_at DESC);
CREATE INDEX idx_mvc_events_type
  ON mvc_events(event_type, emitted_at DESC);

-- =============================================================================
-- tuning_events: Signals for algorithm improvement
-- Owner: dfg-api (migrations 0001, 0008b)
-- =============================================================================
CREATE TABLE tuning_events (
  id                      TEXT PRIMARY KEY,
  event_type              TEXT NOT NULL
                          CHECK (event_type IN (
                            'rejection','win','loss',
                            'score_override','time_in_stage',
                            'status_change'
                          )),
  opportunity_id          TEXT REFERENCES opportunities(id),
  source                  TEXT,
  category_id             TEXT,
  signal_data             TEXT NOT NULL,
  created_at              TEXT NOT NULL
);

CREATE INDEX idx_tuning_events_type ON tuning_events(event_type);
CREATE INDEX idx_tuning_events_source ON tuning_events(source);
CREATE INDEX idx_tuning_events_category ON tuning_events(category_id);
CREATE INDEX idx_tuning_events_created ON tuning_events(created_at DESC);

-- =============================================================================
-- category_defs: Category configuration (D1-driven)
-- Owner: dfg-scout (scout migration 007-category-config.sql)
-- Read by both dfg-api and dfg-scout. Prompt files in analyst worker code.
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
  verdict_thresholds      TEXT,
  display_order           INTEGER DEFAULT 100,
  icon                    TEXT,
  updated_at              INTEGER
);
```

### Required Migrations

**Migration 0008: listing_id uniqueness**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_listing_id_unique
  ON opportunities(listing_id) WHERE listing_id IS NOT NULL;
```
After deployment, the ingest endpoint must handle UNIQUE constraint violations gracefully (catch, log as `skipped`, continue).

**Migration 0008b: tuning_events CHECK constraint fix**
```sql
-- Belt-and-suspenders fix for EC-013. Primary fix is code change:
-- auto-rejection uses event_type='rejection' with auto_rejected=true.
-- This adds 'status_change' as fallback. Requires table rebuild (D1/SQLite).
CREATE TABLE tuning_events_new (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'rejection', 'win', 'loss', 'score_override', 'time_in_stage', 'status_change'
  )),
  opportunity_id TEXT REFERENCES opportunities(id),
  source TEXT,
  category_id TEXT,
  signal_data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO tuning_events_new SELECT * FROM tuning_events;
DROP TABLE tuning_events;
ALTER TABLE tuning_events_new RENAME TO tuning_events;
CREATE INDEX idx_tuning_events_type ON tuning_events(event_type);
CREATE INDEX idx_tuning_events_source ON tuning_events(source);
CREATE INDEX idx_tuning_events_category ON tuning_events(category_id);
CREATE INDEX idx_tuning_events_created ON tuning_events(created_at DESC);
```

**Migration 0009: analysis_runs snapshot columns**
```sql
ALTER TABLE analysis_runs ADD COLUMN snapshot_current_bid REAL;
ALTER TABLE analysis_runs ADD COLUMN snapshot_photo_count INTEGER;
ALTER TABLE analysis_runs ADD COLUMN snapshot_end_time TEXT;
```

**Migration 0010: sold_price on opportunities**
```sql
-- Enables minimum viable outcome tracking per ADR-003.
-- Realized Margin = (sold_price - acquisition_cost) / acquisition_cost * 100
ALTER TABLE opportunities ADD COLUMN sold_price REAL;
```

### State Machine

```
inbox --> qualifying --> watch --> inspect --> bid --> won
  |           |            |          |         |       |
  |           |            |          |         +-> lost |
  |           |            |          |                  |
  +-----+-----+-----+------+-----+---+---------+--------+
        |                        |              |
        v                        v              v
     rejected ────────────> archived <──────────+
```

Valid transitions (from `STATE_TRANSITIONS` in `@dfg/types`):

| From | Allowed To |
|------|-----------|
| inbox | qualifying, watch, rejected, archived |
| qualifying | watch, inspect, rejected, archived |
| watch | qualifying, inspect, rejected, archived |
| inspect | bid, rejected, archived |
| bid | won, lost, rejected, archived |
| won | archived |
| lost | archived |
| rejected | archived |
| archived | (terminal) |

### Schema Ownership Matrix

| Table | Owner | Migrations In | Binding |
|-------|-------|--------------|---------|
| sources | dfg-api | 0001 | DB |
| opportunities | dfg-api | 0001, 0003, 0004, 0008, 0010 | DB |
| analysis_runs | dfg-api | 0003, 0007, 0009 | DB |
| operator_actions | dfg-api | 0001 | DB |
| mvc_events | dfg-api | 0006 | DB |
| tuning_events | dfg-api | 0001, 0008b | DB |
| category_defs | dfg-scout | scout/007 | DFG_DB |
| listings | dfg-scout | scout/001, 004, 008 | DFG_DB |
| scout_runs | dfg-scout | scout/schema | DFG_DB |
| failed_operations | dfg-scout | scout/schema | DFG_DB |
| outcomes | dfg-scout (dormant) | scout/schema | DFG_DB |
| price_guides | dfg-scout | scout/schema | DFG_DB |

---

## 12. API Surface

All endpoints served by dfg-api on Cloudflare Workers. Auth: `Authorization: Bearer <OPS_TOKEN>`. CORS restricted to three origins (verified in `http.ts`):
- `https://app.durganfieldguide.com`
- `https://durganfieldguide.com`
- `http://localhost:3000`

### Public Endpoints

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/health` | `{ status: "ok", service: "dfg-api", env }` | No auth |

### Opportunities

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/opportunities` | Query: `status`, `category_id`, `ending_within`, `score_band`, `needs_attention`, `stale_qualifying`, `attention`, `stale`, `analysis_stale`, `decision_stale`, `ending_soon`, `strike_zone`, `verification_needed`, `new_today`, `limit` (max 100), `offset`, `sort`, `order` | `{ data: { opportunities, total }, meta: { limit, offset } }` | Comma-separated status |
| GET | `/api/opportunities/:id` | -- | `{ data: { ...opportunity, source_defaults, actions, alerts, operatorInputs, currentAnalysisRun, gates, inputsChangedSinceAnalysis } }` | Full detail with computed gates/alerts |
| PATCH | `/api/opportunities/:id` | `{ status?, rejection_reason?, rejection_note?, watch_trigger?, watch_threshold?, max_bid_locked?, bid_strategy?, final_price?, sold_price?, observed_facts?, outcome_notes? }` | Updated opportunity | State machine enforced. `sold_price` added in 0010. |
| POST | `/api/opportunities/:id/actions` | `{ action_type, payload }` | `{ data: { id, action_type, created_at } }` | Audit log |
| PATCH | `/api/opportunities/:id/inputs` | `{ title?, overrides? }` | `{ success, operatorInputs, inputsChangedSinceAnalysis, autoRejected, hardGateFailures? }` | Deep merge; auto-reject on hard gate |
| POST | `/api/opportunities/:id/analyze` | `{ assumptions?, skipAiAnalysis? }` | `{ analysisRun: { id, recommendation, derived, gates, aiAnalysis }, delta? }` | 25s timeout; optimistic lock (409) |
| POST | `/api/opportunities/:id/touch` | -- | 204 (dedupe) or 200 | 60s dedupe window |
| POST | `/api/opportunities/batch` | `{ opportunity_ids[], action: "reject"\|"archive", rejection_reason?, rejection_note? }` | `{ data: { processed, failed, results } }` | Max 50 |
| GET | `/api/opportunities/stats` | -- | `{ data: { by_status, strike_zone, verification_needed, ending_soon, new_today, stale_qualifying, watch_alerts_fired, needs_attention, last_scout_run, pipeline_stale } }` | `last_scout_run` and `pipeline_stale` are P0 |

### Alerts

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/opportunities/:id/alerts/dismiss` | `{ alert_key }` | `{ data: { success, dismissed } }` |
| POST | `/api/alerts/dismiss` | `{ opportunity_id, alert_key }` | `{ data: { success, dismissed } }` |
| POST | `/api/alerts/dismiss/batch` | `{ dismissals: [{ opportunity_id, alert_key }] }` | `{ data: { processed, failed, results } }` |

### Dashboard

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/dashboard/attention` | `{ items: [...], total_count }` |

### Sources

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/sources` | -- | `{ data: { sources } }` |
| GET | `/api/sources/:id` | -- | `{ data: { ...source } }` |
| PATCH | `/api/sources/:id` | `{ enabled?, display_name?, default_buyer_premium_pct?, default_pickup_days? }` | Updated source |

### Categories

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/categories` | `{ data: [...category_defs] }` |
| GET | `/api/categories/:id` | `{ data: { ...category_def } }` |

### Ingest

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/ingest` | `{ listings[], source? }` | `{ data: { created, updated, skipped, errors } }` | Max 100. After 0008, duplicate listing_id -> skipped. |
| POST | `/api/ingest/sync` | -- | `{ data: { created, updated, skipped, errors, photos_synced } }` | Pulls from listings |
| POST | `/api/ingest/sync-photos` | -- | `{ data: { updated, skipped, errors } }` | Photo sync |

### Events (MVC Audit)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/events` | `{ opportunity_id, event_type, payload, emitted_at? }` | `{ data: { id, ..., idempotent } }` |
| GET | `/api/events?opportunity_id=X` | -- | `{ data: { events } }` |

### Triggers / Scout Operations

| Method | Path | Response |
|--------|------|----------|
| POST | `/api/triggers/check` | `{ data: { checked, fired, timestamp } }` |
| POST | `/api/scout/run` | `{ data: { triggered, method, source, dryRun, result? } }` |

### dfg-analyst Endpoints (Internal)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |
| POST | `/analyze` | Bearer ANALYST_SERVICE_SECRET (URL); bypassed via service binding |
| POST | `/analyze/justifications` | Bearer ANALYST_SERVICE_SECRET |

### dfg-scout Endpoints (Internal)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |
| GET/POST | `/ops/*` | OPS_TOKEN |

---

## 13. Non-Functional Requirements

### Performance Budgets

| Metric | Target | Rationale |
|--------|--------|-----------|
| API list endpoints | < 200ms p95 | D1 indexed queries |
| API single opportunity GET | < 300ms p95 | 3 queries (opportunity + actions + alerts) |
| API analyze with AI | < 30s p95 | Claude API dominates; 25s timeout |
| API analyze without AI | < 500ms p95 | Gate-only, no external call |
| End-to-end analysis pipeline | < 45s p95 | Listing to scored opportunity |
| Ingest batch (50 listings) | < 5s p95 | Sequential D1 inserts |
| Scout scrape cycle | < 60s p95 | Runs every 15 minutes |
| Frontend LCP (iOS Safari) | < 2.5s | Next.js SSR + API fetch |
| Frontend INP (iOS Safari) | < 200ms | Touch interactions |

### Reliability Targets

| Metric | Target |
|--------|--------|
| API availability | 99.5% monthly |
| Scout cron success rate | > 95% |
| Analysis success rate | > 90% |
| Data loss tolerance | Zero for opportunities, operator_actions, mvc_events |

### Scout Health Observability (Phase 0 Implementation)

```
dfg-scout (cron */15)
  |
  | Writes to scout_runs table after each execution
  v
D1 (shared)
  ^
  |
  | dfg-api stats endpoint: SELECT MAX(completed_at) FROM scout_runs WHERE success = 1
  |
dfg-api (/api/opportunities/stats)
  |
  | Returns: last_scout_run (ISO 8601), pipeline_stale (boolean: > 30 min)
  v
dfg-app (Dashboard)
  |
  | Red banner: "Scout has not run since [time]. Deal flow may be stale."
```

### Capacity Limits (MVP)

| Resource | Limit |
|----------|-------|
| D1 database size | 10 GB |
| D1 rows read per query | 5,000,000 |
| Worker CPU time | 30s (paid) |
| Worker subrequests | 50 per request |
| Batch operation size | 50 items |
| Ingest batch size | 100 listings |

### Security Requirements

| Requirement | Status |
|-------------|--------|
| No wildcard CORS | Implemented (3 origins) |
| No exposed debug endpoints | Implemented |
| SQL injection prevention (`.bind()`) | Implemented |
| Auth on all API endpoints (Bearer OPS_TOKEN) | Implemented |
| Auth on analyst endpoints (ANALYST_SERVICE_SECRET) | Implemented (needs integration test) |
| R2 snapshot immutability | Implemented |
| Secrets not in source control | Implemented |

### Money Math Validation Checklist

Any feature touching pricing must validate against:
```
Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
Net Proceeds     = Sale Price - Listing Fees - Payment Processing
Profit           = Net Proceeds - Acquisition Cost
Margin %         = (Profit / Acquisition Cost) * 100
```
**Critical invariant:** Listing fees are SELLING COSTS ONLY. Never in acquisition cost. Never double-counted.

The analyst worker implements these in `calculation-spine.ts`. Buyer premium uses `calculateBuyerPremium` from `@dfg/money-math` with `SIERRA_FEE_SCHEDULE` for Sierra source (tiered: flat fees, percent fees, caps).

---

## 14. Platform-Specific Design Constraints

### iOS Safari (Primary Platform)

**Viewport:** All pages use `min-h-screen` not `h-screen` (dynamic viewport height issues with URL bar).

**Layout pattern (CLAUDE.md):**
```tsx
<div className="flex flex-col md:flex-row min-h-screen w-full">
  <Navigation />
  <main className="flex-1 min-w-0">
    <div className="h-14 md:hidden" /> {/* Mobile nav spacer */}
    <div className="p-4">{children}</div>
  </main>
</div>
```

**Fixed positioning:**
- Mobile nav header: `position: fixed`, top 0, h-14 spacer div below.
- Detail bottom action bar: `position: fixed`, bottom 0, `pb-safe`, content has `pb-24`.
- No `-webkit-transform: translateZ(0)` on ancestors (breaks fixed positioning).
- `position: sticky` preferred for in-flow elements (Scout Health Banner, Results footer, desktop headers).
- Financial input modals and reject modal: bottom-sheet fixed positioning with `pb-safe`.

**Touch targets:** 44x44px minimum for all interactive elements including action buttons, reason code tiles, confirm/cancel buttons, navigation items (py-3), opportunity cards, filter chips, photo thumbnails (96x96), undo toast button.

**Scroll behavior:**
- Body scroll locked when mobile menu open.
- Photo strip and analysis tab bar use `overflow-x-auto`.
- Lightbox swipe: touch event handlers with `touch-action: pan-y`.

**Animation:** All CSS animations must include `@media (prefers-reduced-motion: reduce)` guard.

**Known iOS Safari gaps:**
1. Checkbox touch targets in Filters page (20x20px) below 44px minimum. Mitigated by label wrapper.
2. No pull-to-refresh.
3. No offline support.

### Desktop (Secondary)
- Persistent sidebar (w-64), responsive breakpoints (`md:`), hover states, inline filter panel.

---

## 15. Success Metrics & Kill Criteria

### MVP Success Metrics

| Metric | Target | Measurement | Timeframe |
|--------|--------|-------------|-----------|
| Opportunities surfaced per day | >= 15 qualified | `COUNT(*) FROM opportunities WHERE status NOT IN ('rejected','archived') AND date(created_at) = date('now')` | Daily avg over 30 days |
| Analysis accuracy (operator agreement) | >= 70% of BID recs result in bid/watch | MVC events: `decision_made` where `analyst_verdict=BID` | Rolling 30 days |
| False positive rate | <= 30% of score >= 80 rejected | Rejection rate of high-score opportunities | Rolling 30 days |
| Operator response time | Median < 4 hours inbox to qualifying/rejected | `status_changed_at` delta | Rolling 30 days |
| Scout uptime | >= 95% of scheduled runs succeed | `scout_runs` success rate | Weekly |
| Analysis latency | p95 < 45s listing to scored opportunity | `listing.created_at` to `opportunity.last_analyzed_at` | Rolling 7 days |
| Won deals per month | >= 2 acquisitions | `COUNT(*) WHERE status='won'` | Monthly |
| Realized margin on won deals | >= 25% average | `(sold_price - acquisition_cost) / acquisition_cost * 100` | Trailing 90 days |
| Scout failure detection latency | < 4 hours from failure to awareness | Time between last successful run and banner display | Per-incident |

### Kill Criteria

The MVP should be killed or reconsidered if any hold true after 90 days:

| Kill Criterion | Threshold | Measurability |
|---------------|-----------|---------------|
| Zero profitable acquisitions | 0 won deals with positive margin in 90 days | Measurable now |
| Sustained negative margins | Average margin < 10% over 90 days | Requires `sold_price` field (0010) |
| Operator abandonment | < 5 detail views per week for 4 consecutive weeks | Measurable via `operator_actions` activity |
| Scout data staleness | > 50% of opportunities expired when first viewed | Measurable now |
| Analysis disagreement rate | > 60% of BID recommendations rejected over 60 days | Measurable now |
| Scout failure undetected | Operator discovers outage > 4 hours after start, more than twice | Measurable after scout alerting implemented |

---

## 16. Risks & Mitigations

### Business Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| B1 | **Auction platform blocks scraping.** IronPlanet (RB Global) could restrict access. Official API access for government auction platforms is rare. | High | Critical | Multiple source adapters isolate platform logic. Rate limiting and polite headers. If unscrapeable, disable transparently. |
| B2 | **IronPlanet capture rate remains degraded at 17%.** | High | High | P0: Investigate. Fix to >= 80% or disable with transparent indicator. Accelerate GovPlanet to late Phase 0 / early Phase 1. |
| B3 | **Swoopa Dealers convergence.** January 2026 launch with instant valuations and margin clarity for vehicle dealers. | Medium | High | DFG's durable advantages are canonical money math and gate enforcement. Invest in calibration data. |
| B4 | **Market shift reduces trailer margins.** | Medium | High | Category system supports expansion. Outcomes tracking provides early warning. |
| B5 | **Sole operator dependency.** | High | Medium | Private beta (Phase 1) validates multi-user value. |
| B6 | **Shallow moat.** Any developer with Claude API access could build comparable analysis. | Medium | Medium | Moat is operational knowledge (fee structures, market economics, prompt engineering) plus structured workflow. Defensibility grows with outcome data. |
| B7 | **AI analysis advantage erodes at feature level within 12-18 months.** | High | Medium | Durable advantage is calibrated AI with domain prompts, category tiers, and tuning feedback loops. |

### Technical Risks

| # | Risk | Severity | Likelihood | Mitigation | Status |
|---|------|----------|------------|------------|--------|
| T1 | **D1 concurrent write conflicts** on PATCH endpoint | High | Low (single operator) | Accept for MVP. Add optimistic lock before Phase 1. | Accepted |
| T2 | **Analyst timeout under Claude API load** (25s) | Medium | Medium | Gate-only fallback. Visible indicator (BR-066). Exponential backoff. | Accepted; indicator needed |
| T3 | **Shared D1 schema coupling** between dfg-scout and dfg-api | High | Medium | Schema ownership matrix documents owners. Migrations in owner directories. | Documented |
| T4 | **Auth is prototype-grade** (hardcoded) | Critical for multi-user | High | Acceptable for Phase 0. Clerk + Stripe for Phase 1. | Accepted |
| T5 | **Verdict threshold OR logic** produces non-conservative BUY | High | High | **P0 fix:** Change to AND logic. Backtest required. | Fix in progress |
| T6 | **tuning_events CHECK constraint** rejects `status_change` | High | High | **P0 fix:** Code change to use `rejection` + migration 0008b. | Fix in progress |
| T7 | **Platform access revocation** by RB Global | High | Medium | Adapter architecture. Diversify sources. Rate limiting. | Accepted |
| T8 | **Browser `prompt()` for financial inputs** -- no validation | Medium | Medium | Accept for Phase 0 founder. Replace with Pattern 8 modal before Phase 1. | Tracked (P0-adjacent) |
| T9 | **Ingest idempotency** -- duplicate listings | Medium | Low | **Fixed by migration 0008** (UNIQUE constraint). Ingest handles violations. | Fix in progress |
| T10 | **Watch trigger latency** -- 5-min cron | Low | High | 4-hour default threshold provides buffer. Durable Objects for Phase 1. | Accepted |
| T11 | **Verdict threshold backtest** has no defined process | High (blocks P0 fix) | Medium | See Unresolved Issues UI-005. | Needs definition |

### Execution Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| E1 | **Scope creep into multi-tenant SaaS** | Medium | High | PRD scopes to Phase 0. Multi-tenant is Phase 2. |
| E2 | **Over-engineering scoring algorithm** without outcome data | Medium | Medium | Scoring changes require backtesting. Tuning events capture signals. |
| E3 | **Native app pressure** from all competitors | Low (Phase 0) | Medium (Phase 1+) | Web app on iOS Safari is deliberate. Web push for Phase 1. Native is Phase 3+. |

---

## 17. Open Decisions / ADRs

### Decided

**ADR-001: Auth System Selection**
- Decision: Clerk + Stripe. Not yet implemented. Blocker for Phase 1.

**ADR-002: Notification Channels (Split Decision)**
- Part A (P0): In-app red banner when `last_scout_run` exceeds 30 minutes on dashboard. Push notification (Pushover/ntfy.sh/Twilio) when scout cron fails -- stretch P0 goal (see Unresolved Issues UI-003).
- Part B (Phase 1): Web push notifications for opportunities. SMS as critical-only fallback.

**ADR-003: Outcome Tracking Depth**
- Decision: Add `sold_price` field via migration 0010. Combined with `final_price` and source defaults, enables realized profit/margin. Full P&L UI is Phase 1.
- Realized Margin formula:
  ```
  Acquisition Cost = final_price * (1 + buyer_premium_pct/100) + transport + repairs
  Net Proceeds     = sold_price - listing_fees - processing_fees
  Realized Profit  = Net Proceeds - Acquisition Cost
  Realized Margin  = (Realized Profit / Acquisition Cost) * 100
  ```

**ADR-004: Multi-Source Expansion Priority**
- Decision: GovPlanet first (seeded). Elevated to late Phase 0 / early Phase 1 as pipeline insurance.

**ADR-005: Scoring Algorithm Transparency**
- Decision: Deferred (behind P0 items). Surface four scoring dimensions when resources allow.

**ADR-006: Verdict Threshold Logic**
- Status: P0 -- needs implementation.
- Decision: AND logic for BUY (BOTH min_profit AND min_margin). OR for WATCH. PASS when neither.
- Code change required at `workers/dfg-analyst/src/category-config.ts` line 258:
  ```typescript
  // BEFORE (incorrect): profit >= buy.min_profit || margin >= buy.min_margin
  // AFTER (correct):    profit >= buy.min_profit && margin >= buy.min_margin
  ```
- Requires backtest against historical data before deployment.

**ADR-007: Reject Flow Simplification**
- Decision: Single-select 6-code grid as sole mechanism. Legacy dropdown removed. Backend maps to `rejection_reason` field. "Other" requires note. Two-tap completion on mobile.

### Architecture Decisions (Technical Lead owned)

- **TL-ADR-001: Event Sourcing Scope** -- Hybrid. Financial events use immutable `mvc_events`. Workflow uses `operator_actions`. No convergence planned.
- **TL-ADR-004: Category System Extensibility** -- D1-driven `category_defs` for config, code-side prompts for domain knowledge. Adding category: insert row + add prompt file + deploy.
- **TL-ADR-005: Photo Storage Strategy** -- External URLs for display, R2 for evidence snapshots (immutable).
- **TL-ADR-006: Outcomes Table Schema Ownership** -- Option C for MVP (defer table, use `sold_price` field + `sale_result` event). Phase 1: dfg-api-owned outcomes table keyed on `opportunity_id`.

---

## 18. Phased Development Plan

### Phase 0: MVP (Current -- Operational)

Phase 0 is largely complete. The system is operational and producing revenue. Remaining work is hardening and gap-filling based on three rounds of cross-role review.

**What is built and working:**
- Scout pipeline with Sierra + IronPlanet adapters (cron every 15 minutes)
- Three-gate classification (price, negative keywords, positive keywords)
- Claude-powered dual-lens analysis (investor + buyer perspectives)
- Three category tiers with specialized prompts (Trailers, Vehicles, Power Tools)
- Full opportunity lifecycle workflow with server-side state machine
- Operator console on iOS Safari (dashboard, list, detail with analysis)
- Operator inputs system with gate computation
- Staleness detection and attention-required alerts
- Next Action guidance card (verdict-driven)
- Decision reason taxonomy (13 codes, 8 categories)
- MVC event logging (immutable audit trail)
- R2 photo storage with 100% coverage
- Batch operations (max 50, sequential)
- Computed alerts with dismissal tracking

**Remaining Phase 0 work (prioritized, stable after three rounds):**

| Item | Priority | Description | Consensus |
|------|----------|-------------|-----------|
| Scout failure alerting -- in-app banner | P0 | Red dashboard banner when `last_scout_run` exceeds 30 minutes. Populate on stats endpoint. | All 6 roles |
| Verdict threshold AND logic | P0 | Change `applyVerdictThresholds` to AND for BUY. Backtest before deploying. | 5 roles |
| `tuning_events` CHECK constraint fix | P0 | Code: use `event_type: 'rejection'` + migration 0008b. | 3 roles (confirmed bug) |
| Security: Auth on analyst endpoints | P0 | Verify `ANALYST_SERVICE_SECRET` on all non-health routes. Integration test needed. | 3 roles |
| IronPlanet capture rate investigation | P0 | Fix to >= 80% or disable. Never show "active" at 17%. | All 6 roles |
| Dashboard quick-pass default reason fix | P0 | Change from `'other'` to `'missing_info'`. One-line fix. | 3 roles |
| Gate-only fallback indicator | P0 | Display "Estimate only -- AI unavailable" on Next Action Card when `ai_analysis_json = null`. | 2 roles |
| Scout failure push notification | P0 (stretch) | Webhook/SMS when cron fails. Notify within 15 minutes. | See UI-003 |
| Add `sold_price` field | P1 | Migration 0010. Enables realized margin metric. | 2 roles |
| `last_scout_run` on stats endpoint | P1 | Currently null. Required for dashboard banner. | 2 roles |
| "Needs Info" label rename | P1 | Frontend text change: "Verification Needed" to "Needs Info." | 3 roles |
| 3 failing scout tests | P2 | Known tech debt. | TL identified |

**Explicitly NOT in Phase 0:**
- Push notifications for opportunities (Phase 1)
- New auction source adapters (late Phase 0 / early Phase 1)
- Outcome tracking UI/dashboard (Phase 1)
- Replace browser `prompt()` (Phase 1, first item)
- Accessibility remediation beyond functional blockers (Phase 1)
- Photo lightbox swipe gestures (Phase 1)
- Frontend tests (Phase 1)
- Direct inbox-to-bid transition (deferred)

### Phase 0 Implementation Plan (Priority-Ordered)

| # | Item | Type | Effort | Dependencies |
|---|------|------|--------|--------------|
| 1 | Fix auto-rejection tuning event type | Code | 1 hr | None |
| 2 | Run migration 0008b (tuning_events CHECK) | Migration | 30 min | Item 1 deployed first |
| 3 | Run migration 0008 (listing_id UNIQUE) | Migration | 30 min | None |
| 4 | Run migration 0009 (analysis_runs snapshots) | Migration | 15 min | None |
| 5 | Fix verdict threshold logic (OR to AND) | Code | 2 hr | Backtest review |
| 6 | Implement `last_scout_run` on stats endpoint | Code | 4 hr | Shared D1 access |
| 7 | Dashboard stale pipeline banner | Frontend | 2 hr | Item 6 |
| 8 | IronPlanet capture rate investigation | Investigation | 4-8 hr | None |
| 9 | Verify analyst endpoint auth via service bindings | Test | 1 hr | None |

### Phase 1: Private Beta Readiness (Target: Feb-Mar 2026)

Phase 1 transforms DFG from a founder tool into a system 3-5 private beta users can access.

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | Replace browser `prompt()` with validated financial input modals | Principle #1. Pre-beta blocker. Pattern 8 specified. |
| 2 | Clerk authentication | Replace hardcoded auth. Required for external users. |
| 3 | Stripe billing ($149/mo target) | Subscription management. |
| 4 | GovPlanet adapter | Third source. Pipeline insurance. |
| 5 | Web push notification system | Competitive table stake. |
| 6 | Reject flow simplification (ADR-007) | Multi-select grid, remove legacy dropdown. |
| 7 | Outcome tracking UI | P&L entry for won deals. |
| 8 | Onboarding flow | Location setup, category preferences. |
| 9 | Per-user preferences | Different buy boxes. |
| 10 | Photo lightbox swipe | Target Customer requested. |
| 11 | Accessibility fixes | Keyboard navigation, focus trapping, touch targets, contrast. |
| 12 | 5-second undo toast for dashboard quick actions | Safety net for accidental Pass. |

**Not in Phase 1:** Multi-tenant isolation, custom scoring per user, native app, automated bidding, inbox-to-bid fast-track.

### Phase 2: Scale (Target: Q2-Q3 2026)

Phase 2 targets 25-30 paying users at approximately $3,700-4,500 MRR.

| Feature | Rationale for Deferral |
|---------|----------------------|
| Multi-tenant data isolation | Not needed until user contention |
| Per-user scoring customization | Needs multi-user outcome data |
| Additional adapters (GovDeals, Public Surplus) | Breadth after depth |
| Algorithm auto-tuning from outcomes | Requires sufficient volume |
| Geographic expansion beyond Phoenix | After per-user location prefs proven |
| Team/organization support | Solo operators first |
| Free trial / freemium | Validate pricing with beta first |
| Optimistic locking on PATCH | Required for concurrent writes |
| Request queuing for analyst | Needed at scale |

---

## 19. Glossary

| Term | Definition |
|------|-----------|
| **Acquisition Cost** | Bid + Buyer Premium + Transport + Immediate Repairs. The total cost to acquire an asset. Listing fees are NOT included (they are selling costs). |
| **Analysis Run** | An immutable snapshot of computed analysis for an opportunity, stored in `analysis_runs`. Each execution creates a new record. |
| **Attention Required** | Dashboard priority list combining watch alerts fired, stale qualifying items, and other items needing operator action. |
| **Buy Box** | The operator's criteria for what constitutes a viable acquisition: min profit, min margin, max acquisition cost, max distance, target days to sell. Encoded per category in `category_defs`. |
| **Buyer Premium** | A percentage fee charged by the auction platform on top of the winning bid. Source-specific: Sierra 15% (tiered), IronPlanet 12%. |
| **Canonical Money Math** | The non-negotiable financial formulas defined in CLAUDE.md: Acquisition Cost, Net Proceeds, Profit, Margin %. All calculations system-wide must use these exact definitions. |
| **Category Tier** | One of three asset classifications with different analysis prompts, market data, and profit thresholds: Trailers (default), Vehicles, Power Tools. |
| **Critical Gate** | A verification checkpoint (title status, lien status, mileage) that must pass before the system marks an opportunity as BID_READY. Failure applies a 20% max-bid haircut. |
| **D1** | Cloudflare's SQLite-based serverless database. Shared instance used by dfg-api (`DB` binding) and dfg-scout (`DFG_DB` binding). |
| **Dual-Lens Analysis** | Claude-powered evaluation from two perspectives: investor (ROI, acquisition cost, margins) and buyer (target buyer profile, demand, resale potential). |
| **Gate-Only Fallback** | When the Claude API is unavailable (timeout/error), analysis completes using only the gate system without AI evaluation. Indicated in UI as "Estimate only -- AI unavailable." |
| **Hard Gate** | A deal-breaker condition (e.g., salvage title confirmed) that triggers automatic rejection. |
| **Kill Switch Banner** | Red inline banner on the detail page when a hard gate failure is detected. Shows reason, allows operator to confirm rejection or edit inputs. No auto-redirect. |
| **Margin %** | (Profit / Acquisition Cost) * 100. Must always use Acquisition Cost as denominator, never Sale Price. |
| **MVC Event** | An immutable event in the `mvc_events` table recording financial decisions (bid, pass) and outcomes (won, lost, sold). |
| **Needs Info** | Dashboard label (previously "Verification Needed") for opportunities missing title, lien, or mileage data. API filter: `verification_needed`. |
| **Net Proceeds** | Sale Price - Listing Fees - Payment Processing. The amount received after selling an asset. |
| **Next Action Card** | The most prominent UI element on the detail page showing verdict, reasoning, max bid, and analysis source indicator. |
| **Operator Actions** | Audit log entries in `operator_actions` recording every operator interaction (status changes, input updates, alert dismissals). |
| **P0 / P1 / P2** | Priority tiers for remaining work. P0: must fix before Phase 0 is complete. P1: must fix before Phase 1 beta. P2: tracked tech debt. |
| **Phase 0** | MVP. Founder-operated. Currently operational. Remaining work is hardening and gap-filling. |
| **Phase 1** | Private beta. 3-5 users. Auth, billing, notifications, outcome tracking UI. Target: Feb-Mar 2026. |
| **Phase 2** | Scale. 25-30 users. Multi-tenant, geographic expansion, auto-tuning. Target: Q2-Q3 2026. |
| **Pipeline Stale** | Boolean on stats endpoint. True when last successful scout run exceeds 30 minutes. Triggers dashboard red banner. |
| **Profit** | Net Proceeds - Acquisition Cost. The actual financial gain from a flip. |
| **R2** | Cloudflare's object storage. Used for immutable evidence snapshots of listing photos. |
| **Score Band** | Opportunity classification by buy_box_score: high (>= 70), medium (40-69), low (< 40). |
| **Scout** | The dfg-scout worker that scrapes auction platforms on a 15-minute cron cycle and normalizes listings. |
| **Service Binding** | Cloudflare mechanism for zero-latency worker-to-worker RPC without network egress. Used by dfg-api to call dfg-analyst and dfg-scout. |
| **State Machine** | The 9-state opportunity lifecycle enforced server-side. Valid transitions defined in `STATE_TRANSITIONS` in `@dfg/types`. |
| **Strike Zone** | High-priority triage items: score >= 70, analysis exists, inbox/qualifying status, ending soon or new today. |
| **Tuning Event** | A signal logged to `tuning_events` capturing operator decisions (rejections, wins, losses) for future algorithm calibration. |
| **Verdict Threshold** | Category-specific profit and margin minimums for BUY/WATCH/PASS recommendations. BUY requires AND (both met). WATCH requires OR (either). PASS when neither. |

---

## Appendix: Unresolved Issues

The following items remain unresolved after three rounds of cross-role review. They are deduplicated across all six contributions.

### UI-001: `attention` filter excludes never-analyzed items

The `attention` filter does not include opportunities that have NEVER been analyzed (`last_analyzed_at IS NULL`). The `analysisStale` filter correctly includes them via `(last_analyzed_at IS NULL OR ...)`, but `attention` does not. A new opportunity sitting in qualifying for 24+ hours without analysis will appear in `analysisStale` but not in `attention`.

**Impact:** Medium -- missed items in the highest-priority dashboard view.
**Owner:** Engineering (API). Simple SQL change. No business rule conflict.
**Source:** Business Analyst OQ-006.

### UI-002: Inspect shortcut partial failure UX

The Inspect shortcut (BR-067) executes two sequential server calls. No specification exists for what happens if the user navigates away mid-sequence. Should the UI block navigation during auto-advance?

**Impact:** Low -- edge case for a fast operation.
**Owner:** Engineering (Frontend). Recommend disabling navigation during auto-advance with loading state.
**Source:** Business Analyst EC-015.

### UI-003: Scout failure push notification scope (in-app banner vs. outbound notification)

The PM's ADR-002 Part A lists outbound notification (webhook/SMS within 15 minutes) as P0. The Target Customer says the in-app banner is sufficient for P0 and push can wait. The Technical Lead's implementation covers only the in-app indicator.

**Impact:** Medium -- the in-app banner only works if the operator opens the app. A Friday evening failure would not be discovered until the operator opens the app.
**Owner:** PM decision needed on whether P0 includes outbound notification or only the in-app banner.
**Source:** Business Analyst UI-003, PM ADR-002 Part A, Target Customer.

### UI-004: Results footer bar label accuracy

The Results footer shows `SUM(final_price)` for won deals (total acquisition cost, not profit). The Target Customer asked for "Total Profit" which requires `sold_price`. The label "Won: N deals / $X,XXX total" avoids implying profit, but shows money spent rather than money earned.

**Impact:** Low -- operator understands the difference, but label must be unambiguous.
**Owner:** Engineering (Frontend). Verify label says "Total Won Value" or "Won: N deals / $X,XXX total" -- never "Total Profit."
**Source:** Business Analyst UI-004, UX Lead.

### UI-005: Verdict threshold backtest has no definition

All roles agree the AND-logic change (ADR-006) requires backtesting before deployment, but no one defined what "backtest" means: dataset size, false-negative definition, acceptable false-negative rate, pass criterion.

**Impact:** High -- this is a P0 item that cannot deploy without the backtest.
**Owner:** PM + Engineering.
**Recommended process:** (1) Query all historical `analysis_runs` where recommendation was BID. (2) Recompute using AND logic. (3) Identify deals downgraded from BID to WATCH. (4) Check if any were won with positive outcomes. (5) If fewer than 10% of historically won deals would have been missed, the change is safe.
**Source:** Business Analyst UI-005, Target Customer #6.

### UI-006: Browser `prompt()` replacement timing -- P0 or P1?

The Target Customer wants P0. The PM classifies as P1 (first item shipped before beta). The PM's Principle #1 says input mechanisms for financial data are a numbers-must-be-right concern, yet the resolution defers the fix. The Target Customer accepted the PM's position but documented it as a contradiction.

**Impact:** Latent risk for current operator (low probability, high consequence). Active risk for Phase 1 beta users.
**Current position:** P1 with elevated urgency -- first Phase 1 item, before any beta user. If PM overrides to P0, one current P0 item is displaced.
**Source:** PM Unresolved #1, Target Customer Unresolved #1, UX Lead Unresolved #1.

### UI-007: Service binding auth bypass verification

The analyst worker checks `Bearer ${env.ANALYST_SERVICE_SECRET}`. Service binding calls from dfg-api do not carry this header. The assumption is that service binding calls are detected and allowed through, but this has not been tested in production.

**Impact:** If service binding calls are rejected, analysis is broken in production via the primary code path.
**Owner:** Engineering. Focused integration test needed.
**Source:** Technical Lead Issue 4.

### UI-008: Gate-only mode visibility definition

The Target Customer asked for a visible indicator when analysis is gate-only. The PM added it as a P0 item. The UX Lead specified the amber "Estimate only -- AI unavailable" badge. However, no formal acceptance criterion was added by the Business Analyst for this specific indicator.

**Impact:** Low -- implementation path is clear from UX specification.
**Owner:** Engineering (Frontend). Implement per UX Lead Pattern 3 and BR-066.
**Source:** Target Customer Unresolved #2. Note: PM added this as a P0 item in the remaining work table, and UX Lead specified it in the Next Action Card. The BA documented it as BR-066. This is effectively resolved but lacks a formal AC number.

### UI-009: Undo toast implementation approach

Two strategies exist for the dashboard quick-pass undo: (a) delay API call 5 seconds client-side, cancel on undo; (b) fire immediately, reverse on undo. Option (a) has 5-second server-state inconsistency. Option (b) requires a state machine transition from `rejected` that may not be valid (`rejected` -> previous status is not in `STATE_TRANSITIONS`). Fallback: one-tap confirmation modal for dashboard Pass.

**Impact:** Low -- affects UX quality of a convenience feature.
**Owner:** Technical Lead to determine feasibility. UX Lead recommends option (a).
**Source:** UX Lead Unresolved #2.

### UI-010: Competitive convergence missing from business risk table

The Competitor Analyst raised Swoopa Dealers to MEDIUM-HIGH threat, but the PM's risk table (B1-B7) does not specifically address the scenario where Swoopa expands from vehicles to equipment and from marketplaces to auctions.

**Impact:** Strategic awareness gap.
**Owner:** PM. The Competitor Analyst's finding deserves an explicit line in the risk table.
**Source:** Target Customer Unresolved #4.

### UI-011: Operator abandonment metric cannot be measured with hardcoded auth

Without real auth, there is no session tracking. The PM revised the kill criterion to use `operator_actions` activity as a proxy. This is a reasonable workaround but should be acknowledged as a known measurement gap.

**Impact:** Low for Phase 0 (single user). Significant for Phase 1 kill criteria validation.
**Owner:** Resolved by Phase 1 Clerk auth implementation.
**Source:** Target Customer Unresolved #3.

### UI-012: GSA Auction Pro and AuctionWiser pricing unknown

Unable to confirm pricing for these emerging competitors. If priced below $100/month for individual access, they would be a closer competitive analog than currently assessed.

**Impact:** Low for Phase 0.
**Owner:** Competitor Analyst. Revisit when pricing becomes available.
**Source:** Competitor Analyst Unresolved #1.

### UI-013: Swoopa Dealers analysis depth unclear from public sources

Assessment that Swoopa Dealers uses comp-based (not conservative financial) modeling is based on marketing language, not hands-on evaluation. If their margin analysis includes buyer premium or transport modeling, threat level should elevate to HIGH.

**Impact:** Medium for competitive positioning accuracy.
**Owner:** Competitor Analyst. Recommendation: purchase one-month subscription for hands-on analysis before Phase 1.
**Source:** Competitor Analyst Unresolved #2.

### UI-014: RB Global strategic intent toward third-party scrapers unknown

Whether RB Global will escalate to active anti-scraping measures is unknown. No official API access has been investigated for any auction platform.

**Impact:** High if access is revoked.
**Owner:** PM / Engineering. Investigate whether any platform offers an official buyer API or partner program.
**Source:** Competitor Analyst Unresolved #3.

---

## Cross-Role Consensus Summary

After three rounds, the following items have universal or near-universal agreement:

| Item | Consensus Level |
|------|----------------|
| Scout failure alerting is P0 | All 6 roles |
| Verdict threshold AND logic is P0 | 5 roles |
| `tuning_events` CHECK constraint is a bug | 3 roles (confirmed) |
| Canonical money math is non-negotiable | All 6 roles |
| IronPlanet at 17% is unacceptable as "active" | All 6 roles |
| Reject flow needs simplification (ADR-007) | 4 roles |
| "Verification Needed" rename to "Needs Info" | 3 roles |
| State machine should NOT allow inbox-to-bid | 4 roles |
| Native app is not Phase 0 or Phase 1 | All 6 roles |
| Outcome tracking UI is Phase 1 | 5 roles |

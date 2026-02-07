# Product Manager Contribution -- PRD Review Round 3 (Final)

**Author:** Product Manager
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Final after 3 rounds

---

## Changes from Round 2

1. **Unified scout failure alerting as unanimous P0 consensus.** In Round 2, I had already elevated scout failure alerting from P1 to P0 and added a kill criterion for detection latency. Round 3 confirms: all six roles agree this is the single highest-priority gap. The Target Customer said it loudest ("Stop calling it P1. It is P0."), the UX Lead called it "the single largest UX gap in the MVP," the Competitor Analyst documented that every competitor has push notifications while DFG has zero, the Technical Lead added it as a required NFR with a concrete implementation path (`last_scout_run` on stats endpoint + stale pipeline indicator), and the Business Analyst promoted it to P0 in the gaps table. Round 3 specifies the exact implementation: (a) populate `last_scout_run` on the stats endpoint, (b) display a red dashboard banner when last successful run exceeds 30 minutes, (c) implement a simple webhook notification (Pushover, ntfy.sh, or Twilio SMS) for cron failures. Parts (a) and (b) are zero-dependency. Part (c) requires a channel decision but the implementation is trivial. All three are P0.

2. **Accepted Target Customer's revised position on IronPlanet.** In Round 2, the P0 item was "fix IronPlanet capture rate to >= 80% or disable." The Target Customer shifted in Round 2 after reading the Competitor Analyst's platform risk assessment: "If IronPlanet is going to be unreliable by nature, then adding GovPlanet or GovDeals as a third source is actually more important than perfecting IronPlanet." Round 3 revises the IronPlanet item: P0 action is to investigate the capture rate failure and either fix to >= 80% or disable with a transparent indicator. Adding a third source moves from Phase 1 to late Phase 0 / early Phase 1 boundary -- prioritized above other Phase 1 items as pipeline insurance. The key principle remains: never show a source as "active" when it captures 17% of listings.

3. **Resolved prompt() replacement timing disagreement.** In Round 2, I classified replacing browser `prompt()` for financial inputs as Phase 1 (pre-beta blocker), noting the Target Customer uses it today without incident. The Target Customer revised his position in Round 2: "This needs a real input modal... This should be P0 for MVP, not Phase 1." The UX Lead specified the exact modal pattern (Pattern 8: Financial Input Modals). The Business Analyst classified it as P1 pre-beta blocker. Round 3 position: this is **P1 with elevated urgency** -- it must be the first Phase 1 item shipped, before any beta user touches the system. The rationale: the founder is financially literate and enters correct values despite the poor UI. The risk materializes with beta users who may enter "$1,500" or "1500.50" (Business Analyst OQ-007). Moving it to P0 would displace items that have unanimous P0 consensus (scout alerting, verdict threshold fix, tuning_events bug). This remains an unresolved disagreement -- see Unresolved Issues section.

4. **Standardized ADR numbering across all contributions.** Round 2 had numbering conflicts between PM and Technical Lead ADRs (both had ADR-001 through ADR-006+ with different content). Round 3 establishes a unified ADR registry: PM-owned ADRs are strategic decisions (auth, notifications, outcomes, sources, scoring transparency, verdict logic, reject flow). Tech-Lead-owned ADRs are architecture decisions (event sourcing, analyst auth, outcomes table, category extensibility, photo storage, outcomes schema ownership, verdict threshold implementation). Cross-references are provided where decisions overlap.

5. **Incorporated Competitor Analyst's Swoopa Dealers escalation into risk assessment.** The Competitor Analyst elevated Swoopa Dealers to MEDIUM-HIGH threat in Round 2 based on January 2026 app launch with instant valuations, comps, and margin clarity. This convergence is faster than anticipated. Round 3 adds this to business risks and adjusts the competitive positioning to emphasize the two advantages hardest to replicate: conservative financial modeling with canonical money math (58 business rules, source-specific fee schedules) and structured workflow with gate enforcement. Alert speed and platform coverage are explicitly acknowledged as races DFG cannot win in Phase 0.

6. **Resolved the dashboard quick-pass validation bug.** The Business Analyst's EC-014 identified that the Attention Required inline "Pass" action sends `rejection_reason='other'` without a `rejection_note`, which would fail backend validation. The UX Lead documented this but did not propose a fix. The Target Customer said: "Either add a one-tap undo or require the reason code selection even from the dashboard. I would prefer the undo toast." Round 3 resolution: change the quick-pass default reason from `other` to `missing_info` (which does not require a note and provides a meaningful signal to the tuning algorithm). This is a one-line code change. The 5-second undo toast is a Phase 1 UX enhancement.

7. **Finalized the reject flow simplification based on cross-role consensus.** The Target Customer softened his position in Round 2 ("I understand the data value") but maintained: "Show me the multi-select grid only. Map the selected codes to the legacy field automatically on the backend." The UX Lead specified a streamlined 6-code grid with expandable "More reasons." The Business Analyst documented both mechanisms and expects at least one code selected. Round 3 decision: the reject modal shows the multi-select reason code grid as the sole user-facing mechanism. The backend maps the first selected code to the legacy `rejection_reason` field for backward compatibility. The legacy single-select dropdown is removed from the UI. This is ADR-007 resolved.

8. **Added explicit "gate-only fallback" indicator based on Target Customer concern.** The Target Customer raised a new concern in Round 2: "If I am looking at a recommendation and it was generated without the AI (gate-only), I need a visible indicator." The Technical Lead documented the fallback behavior (AC-003.6). The UX Lead did not address this directly. Round 3 adds a requirement: when an analysis run has `ai_analysis_json = null`, the Next Action Card must display a subtle indicator (e.g., "Analysis: Gates only -- AI was unavailable") so the operator knows the recommendation depth. This is a small frontend change with significant trust value.

9. **Aligned the "Verification Needed" label rename with cross-role consensus.** The Target Customer, UX Lead, and Business Analyst all agreed the label should change. The UX Lead proposed "Needs Info" with subtitle "Missing title, lien, or mileage data." The Business Analyst documented this as OQ-011. Round 3 adopts "Needs Info" as the standard label. The API parameter `verification_needed` is unchanged.

10. **Tightened Phase 0 remaining work based on three rounds of prioritization.** After three rounds, the P0 items have been validated by all roles. The P1 items have clear ordering. Items that were debated (prompt replacement, photo swipe, inbox-to-bid shortcut) have final dispositions. The phased plan is now stable.

---

## Executive Summary

**Problem:** Auction arbitrage on physical assets (trailers, equipment, vehicles) is profitable but time-intensive. Listings surface across fragmented platforms, expire within hours, and require rapid valuation against local demand signals. A solo operator cannot monitor, evaluate, and decide at the volume required to capture the best deals. The operator spends 80% of time rejecting obviously bad listings and 20% evaluating viable ones. Missed opportunities from platform fragmentation and bad acquisitions from rushed math are the two costliest failure modes.

**Solution:** DFG is an automated intelligence system that continuously scrapes auction platforms, runs AI-powered conservative profit analysis on each listing, scores opportunities against demand signals, and surfaces actionable buy/pass recommendations to the operator via a mobile-first web console. The system compresses per-listing evaluation time from 10-15 minutes of manual research to 10-30 seconds of operator review.

**Value:** DFG eliminates three specific failure modes: (1) missed opportunities due to platform fragmentation and manual monitoring limits, (2) bad acquisitions due to rushed or emotional bidding without rigorous financial analysis, and (3) wasted time evaluating listings that do not meet the operator's buy box criteria. The system is already revenue-generating -- profitable acquisitions have been made using the existing platform.

**Current State:** DFG is operational and founder-used. The core pipeline (Scout to Analyst to API to Console) is functional with two auction sources (Sierra Auction active, IronPlanet active but degraded at approximately 17% capture), three category tiers (Trailers, Vehicles, Power Tools), Claude-powered dual-lens valuation, and a full opportunity lifecycle workflow. The web console runs on iOS Safari as the primary interface. Auth is prototype-grade (hardcoded). No external users. No competitor combines cross-platform auction scraping, AI-powered conservative profit analysis, and structured operator workflow for physical asset arbitrage.

**Competitive context:** Swoopa Dealers (launched January 2026) provides instant valuations and margin clarity for vehicle dealers, converging on DFG's value proposition from the marketplace direction. DFG's durable advantages are conservative financial modeling with canonical money math and structured workflow with gate enforcement -- the hardest capabilities to replicate because they require domain-specific operational knowledge, not just API calls.

---

## Product Vision and Identity

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
- Not a fully automated bidding bot (the operator makes final decisions -- Product Principle #6)
- Not a multi-tenant SaaS product (founder-operated in Phase 0; private beta in Phase 1)
- Not an iOS native app (it is a Next.js web app accessed via iOS Safari, per CLAUDE.md)
- Not competing on alert speed or platform coverage (those are races DFG cannot win yet)

---

## Product Principles

These are ordered by priority. When principles conflict, the higher-numbered principle wins.

1. **Numbers must be right.** Financial calculations are non-negotiable. A single incorrect margin or double-counted fee destroys operator trust permanently. The canonical money math is the foundation of every product decision:

   - Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
   - Net Proceeds = Sale Price - Listing Fees - Payment Processing
   - Profit = Net Proceeds - Acquisition Cost
   - Margin % = (Profit / Acquisition Cost) * 100

   Listing fees are selling costs only -- never included in acquisition cost. Never double-counted. This principle extends to input mechanisms: browser `prompt()` for entering bid amounts is a numbers-must-be-right issue, not just a UX issue. The Target Customer confirmed: "If I bid based on a number the system gave me and the profit calculation was wrong, I am done."

2. **Reliability over features.** A system that misses a high-value opportunity because the scraper was down is worse than a system with fewer features that never drops a listing. Uptime, data completeness, and failure visibility take priority over new capabilities. The operator must know when the pipeline breaks without having to discover it by observation. The Target Customer ranked scout reliability as concern number one. All six review roles identified scout failure alerting as the highest-priority gap.

3. **Conservative over optimistic.** DFG exists to protect the operator from bad acquisitions, not to encourage volume. Analysis should err on the side of lower valuations, higher cost estimates, and PASS/WATCH recommendations when data is insufficient. Verdict thresholds must use AND logic for BUY (both profit AND margin met). A missed good deal is recoverable; a bad acquisition is cash destroyed.

4. **Speed is competitive advantage.** Auctions are time-sensitive. Every minute between listing appearance and operator review is a minute a competitor could act. Performance budgets: API list endpoints under 200ms p95, opportunity detail under 300ms p95, AI analysis under 30s p95, frontend LCP on iOS Safari under 2.5s, INP under 200ms. The Target Customer wants the Next Action Card visible within 1 second of tapping an opportunity.

5. **Mobile-first, iOS Safari always.** The operator uses this tool in the field -- at auctions, in the truck, walking lots. Every feature must work flawlessly on iOS Safari. Desktop is a convenience, not the primary interface. CLAUDE.md specifies: `min-h-screen` not `h-screen`, prefer `position: sticky` over `position: fixed`, 44px minimum touch targets, `pb-safe` for safe area insets.

6. **Operator decides, system recommends.** DFG provides analysis, scoring, and recommendations. The operator makes the final call. The system must never auto-bid, auto-reject viable opportunities, or hide information that could inform a decision. Transparency of reasoning is required. Hard gate auto-rejection is acceptable for clearly disqualifying conditions (salvage title, confirmed), but the operator must be able to see the reason and override -- flag is safer than reject for borderline cases. The Kill Switch Banner must not auto-redirect the operator away from the detail page.

7. **Audit everything.** Every operator decision, every analysis run, every status change must be logged with full context. This data feeds algorithm tuning, enables post-mortem analysis, and builds the training corpus for better recommendations. The operator does not interact with audit data directly today -- it is infrastructure for future algorithm tuning, not a user-facing feature.

---

## Success Metrics and Kill Criteria

### MVP Success Metrics

| Metric | Target | Measurement Method | Timeframe | Notes |
|--------|--------|-------------------|-----------|-------|
| Opportunities surfaced per day | >= 15 qualified candidates | `SELECT COUNT(*) FROM opportunities WHERE status NOT IN ('rejected','archived') AND date(created_at) = date('now')` | Daily average over 30 days | Requires both sources functioning. At 17% IronPlanet capture, target may not be achievable without fix. |
| Analysis accuracy (operator agreement) | >= 70% of BID recommendations result in operator bid or watch | MVC events: `decision_made` where `analyst_verdict = BID` and decision IN (BID, WATCH) | Rolling 30-day window | |
| False positive rate | <= 30% of scored >= 80 opportunities get rejected | Rejection rate of high-score opportunities via `tuning_events` | Rolling 30-day window | Target Customer specifically called out false positives as trust-destroying |
| Operator response time | Median < 4 hours from inbox to qualifying/rejected | `status_changed_at` delta from inbox to next status | Rolling 30-day window | |
| Scout uptime | >= 95% of scheduled runs complete successfully | `scout_runs` table success rate | Weekly | Requires scout failure alerting (P0) to be meaningful |
| Analysis latency | p95 < 45 seconds from listing to scored opportunity | Time delta: `listing.created_at` to `opportunity.last_analyzed_at` | Rolling 7-day window | Technical Lead specified 30s p95 for the AI analysis call itself |
| Won deals per month | >= 2 acquisitions from DFG pipeline | `SELECT COUNT(*) FROM opportunities WHERE status = 'won' AND created_at > datetime('now', '-30 days')` | Monthly | Core revenue validation |
| Realized margin on won deals | >= 25% average margin | `(sold_price - acquisition_cost) / acquisition_cost * 100` using `final_price` + `sold_price` fields | Per-deal, trailing 90 days | Requires adding `sold_price` field to opportunities (ADR-003) |
| Scout failure detection latency | < 4 hours from failure to operator awareness | Time between last successful scout run and operator notification or dashboard banner display | Per-incident | In-app banner is P0; push notification is P0 |

### Kill Criteria

The MVP should be killed or fundamentally reconsidered if any of the following hold true after 90 days of operation:

| Kill Criterion | Threshold | Rationale | Measurability Status |
|---------------|-----------|-----------|---------------------|
| Zero profitable acquisitions | 0 won deals with positive margin in 90 days | System is not generating actionable intelligence | Measurable now: `opportunities WHERE status='won'` |
| Sustained negative margins | Average margin < 10% across all won deals over 90 days | Deals being surfaced are not sufficiently undervalued | Requires `sold_price` field (ADR-003); measurable via spreadsheet until implemented |
| Operator abandonment | < 5 opportunity detail views per week for 4 consecutive weeks | Tool is not providing enough value to justify checking | Measurable via `operator_actions` table activity counts. Hardcoded auth cannot provide login tracking -- this is the best proxy available. |
| Scout data staleness | > 50% of opportunities have `auction_ends_at` in the past when operator first views them | Pipeline is too slow for time-sensitive auctions | Measurable now: compare `auction_ends_at` to first `operator_actions` timestamp per opportunity |
| Analysis disagreement rate | > 60% of BID recommendations rejected by operator over 60 days | AI analysis is not calibrated to operator's actual buy box | Measurable now: MVC events where `analyst_verdict=BID` but `decision=PASS` |
| Scout failure goes undetected | Operator discovers a scout outage > 4 hours after it begins more than twice | Failure alerting is not working; operator cannot trust coverage | Measurable once scout failure alerting is implemented (P0) |

---

## Risks and Mitigations

### Business Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| B1 | **Auction platform blocks scraping.** IronPlanet (owned by RB Global) could restrict access. The Competitor Analyst confirmed: official API access for government auction platforms is rare. | High | Critical -- no data, no product | Multiple source adapters isolate platform-specific logic. Rate limiting and polite scraping headers. If a source becomes unscrapeable, disable it and be transparent rather than showing degraded coverage as functional. Investigate official API access but do not depend on it. |
| B2 | **IronPlanet capture rate remains degraded.** At 17%, this is functionally a dead source. The Target Customer shifted from "fix it" to "have a fallback" after reading the platform risk assessment. | High | High -- false confidence in coverage | P0: Investigate adapter failures. Fix to >= 80% or disable with transparent indicator. Accelerate third source (GovPlanet) to late Phase 0 / early Phase 1 as pipeline insurance. |
| B3 | **Swoopa Dealers convergence.** January 2026 launch with instant valuations, comps, and margin clarity for vehicle dealers. Moving from alert-only to analysis-assisted sourcing. | Medium | High -- narrowing differentiation window | DFG's durable advantages are canonical money math (58 business rules, source-specific fee schedules) and structured workflow with gate enforcement. These require months of operational experience to replicate. Invest in calibration data and domain knowledge encoding. |
| B4 | **Market shift reduces trailer margins.** Phoenix trailer market could soften, reducing the core thesis. | Medium | High -- category thesis invalidated | Category system supports Power Tools and Vehicles. Outcomes tracking provides early warning. Category expansion is Phase 1/2. |
| B5 | **Sole operator dependency.** The product stalls without active use and feedback. | High | Medium -- product stalls | Private beta (Phase 1) validates multi-user value. For Phase 0, the operator IS the product owner. |
| B6 | **Shallow moat.** Any developer with Claude API access could build a comparable analysis engine in weeks. | Medium | Medium -- competitive pressure | The moat is operational knowledge (auction fee structures, trailer market economics, category-specific prompt engineering) plus the structured workflow. Encode this knowledge into the system rather than keeping it in the operator's head. Defensibility grows with outcome data over time. |
| B7 | **AI analysis advantage erodes within 12-18 months.** Swoopa, Rouse, and others are investing in AI capabilities. | High | Medium -- convergence pressure | The durable advantage is calibrated AI with domain-specific prompts, category-tier systems, and operational feedback loops (tuning events). The moat is calibration data and domain knowledge, not the API call. |

### Technical Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| T1 | **D1 concurrent write conflicts.** `PATCH /api/opportunities/:id` does not use optimistic locking. | Low (single operator) | High (multi-user) | Accept for MVP. Add `updated_at` optimistic lock before Phase 1. |
| T2 | **Analyst timeout under Claude API load.** 25-second timeout; Claude API cold starts or rate limits could cause failures. | Medium | Medium -- analysis delays | Fallback: gate-only mode. Add visible indicator when analysis used gate-only fallback (new requirement from Round 3). Exponential backoff retry implemented. Analysis runs idempotent and replayable. |
| T3 | **Shared D1 schema coupling.** dfg-scout and dfg-api share the same D1 database with different binding names. | Medium | High -- pipeline stalls | Migrations live in dfg-api for API-owned tables, dfg-scout for scout-owned tables. Schema ownership documented in Technical Lead's ownership matrix. |
| T4 | **Auth is prototype-grade.** Hardcoded credentials. | High | Critical for multi-user, Medium for single operator | Acceptable for Phase 0. Analyst endpoints behind `ANALYST_SERVICE_SECRET`. Clerk + Stripe for Phase 1. |
| T5 | **Verdict threshold OR logic produces non-conservative recommendations.** A deal with $600 profit but 5% margin would be recommended as BID. | High | High -- violates Principle #3, erodes operator trust | P0: Change `applyVerdictThresholds` to AND logic for BUY. Backtest against historical data before deploying. |
| T6 | **`tuning_events` CHECK constraint rejects `status_change` event type.** Silent data loss on every auto-rejection. | High | High -- undermines algorithm feedback loop | P0: Fix code to use `event_type: 'rejection'` with `auto_rejected: true` in signal_data (preferred, no migration needed). Alternatively, add migration 0008 to expand CHECK constraint. |
| T7 | **Platform access revocation.** IronPlanet (RB Global) could block scraping entirely. GovDeals investing in buyer engagement tools signals tightening access. | Medium | High -- loss of data source | Adapter architecture isolates platform logic. Diversify sources (GovPlanet seeded for Phase 1). Rate limiting and polite headers implemented. |

### Execution Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| E1 | **Scope creep into multi-tenant SaaS.** Competitive pressure could push premature expansion. | Medium | High -- diverts from core value | This PRD explicitly scopes to MVP/Phase 0. Multi-tenant is Phase 2 at earliest. Target Customer: "Do not add features I did not ask for." |
| E2 | **Over-engineering scoring algorithm.** Scoring changes without outcome data are speculative. | Medium | Medium | Scoring changes require backtesting on historical data. Tuning events capture signals for data-driven iteration. |
| E3 | **Native app pressure.** All direct competitors have native apps. | Low (Phase 0) | Medium (Phase 1+) | Do not build a native app. Target Customer uses iOS Safari today and it works. Web push for Phase 1 notifications. Native app is Phase 3+ consideration. |

---

## Open Decisions / ADRs

### Decided (implemented or ready to implement)

**ADR-001: Auth System Selection**
- Status: Decided (Clerk + Stripe), not yet implemented
- Decision: Use Clerk for authentication, Stripe for billing
- Blocker for: Private beta (Phase 1)

**ADR-002: Notification Channels (Split Decision)**
- Part A -- Scout failure alerting (P0): Implement webhook notification when scout cron fails. Use Pushover, ntfy.sh, or Twilio SMS. Operator must be notified within 15 minutes of failure. In-app red banner when `last_scout_run` exceeds 30 minutes. Both mechanisms are P0.
- Part B -- Opportunity alerting (Phase 1): Web push notifications as primary. SMS as critical-only fallback. Email for daily digest (low priority).

**ADR-003: Outcome Tracking Depth**
- Status: Decided for MVP
- Decision: Add `sold_price` field to `opportunities` table via migration. Combined with `final_price` and source `buyer_premium_pct`, enables realized profit/margin calculation using canonical money math. Full P&L UI is Phase 1.
- Realized Profit = sold_price - (final_price * (1 + buyer_premium_pct/100) + estimated_transport + estimated_repairs)

**ADR-004: Multi-Source Expansion Priority**
- Status: Deferred to late Phase 0 / early Phase 1 (elevated from Round 2)
- Decision: GovPlanet first (already seeded). Elevated urgency as pipeline insurance given IronPlanet fragility. Target Customer: "Fix what you have before adding more" but also "have a fallback."

**ADR-005: Scoring Algorithm Transparency**
- Status: Deferred (deprioritized behind P0 items)
- Decision: Surface four scoring dimensions in opportunity detail view when resources allow. Not blocking.

**ADR-006: Verdict Threshold Logic**
- Status: P0 -- needs implementation
- Decision: AND logic for BUY (must meet BOTH min_profit AND min_margin). OR logic for WATCH (meet either). PASS when meeting neither.
- Rationale: OR logic allows 5% margin deals to receive BUY verdict. This violates Principle #3. Target Customer: "I will not trust a system that recommends buying 5% margin deals." Requires backtesting against historical data before deployment.

**ADR-007: Reject Flow Simplification**
- Status: Decided
- Decision: Remove the legacy single-select dropdown from the UI. Show the multi-select reason code grid as the sole mechanism, defaulting to the 6 most common codes with an expandable "More reasons" section. Backend maps the first selected code to the legacy `rejection_reason` field for backward compatibility. "Other" requires a note. Two-tap completion on mobile (select reason, confirm).

### Architecture Decisions (Technical Lead owned, cross-referenced)

- **TL-ADR-001: Event Sourcing Scope** -- Decided: Hybrid. Financial events (decisions, bids, outcomes) use immutable `mvc_events`. Workflow state changes use `operator_actions`. No convergence planned.
- **TL-ADR-004: Category System Extensibility** -- Decided: D1-driven `category_defs` for runtime config, code-side prompt files for domain knowledge. Adding a category requires: insert row + add prompt file + deploy.
- **TL-ADR-005: Photo Storage Strategy** -- Decided: External URLs for display, R2 for evidence snapshots (immutable).
- **TL-ADR-006: Outcomes Table Schema Ownership** -- Decided: Option C for MVP (defer table, use `mvc_events` `sale_result` payload). Phase 1 uses Option A (dfg-api owned, keyed on `opportunity_id`).

---

## Phased Development Plan

### Phase 0: MVP (Current -- Operational)

Phase 0 is largely complete. The system is operational and producing revenue. Remaining Phase 0 work is hardening and gap-filling based on three rounds of cross-role review.

**What is built and working:**
- Scout pipeline with Sierra + IronPlanet adapters (cron every 15 minutes)
- Three-gate classification (price, negative keywords, positive keywords)
- Claude-powered dual-lens analysis (operator perspective + buyer perspective)
- Three category tiers with specialized prompts (Trailers, Vehicles, Power Tools)
- Full opportunity lifecycle workflow (inbox to qualifying to watch to inspect to bid to won/lost) with state machine enforced server-side
- Operator console on iOS Safari (dashboard, opportunity list with filters, opportunity detail with analysis)
- Operator inputs system (title status, VIN, condition, overrides) with gate computation
- Gates system (critical/confidence gates that block or inform bidding)
- Staleness detection and attention-required alerts
- Next Action guidance card (verdict-driven operator guidance)
- Decision reason taxonomy (13 codes, 8 categories, multi-select)
- MVC event logging (immutable audit trail)
- R2 photo storage with 100% coverage
- Batch operations (reject, archive) with max 50 items, sequential processing
- Analysis runs are immutable snapshots with optimistic concurrency control
- Computed alerts (derived at read time) with dismissal tracking

**Remaining Phase 0 work (prioritized, stable after three rounds):**

| Item | Priority | Description | Consensus |
|------|----------|-------------|-----------|
| Scout failure alerting -- in-app banner | P0 | Red dashboard banner when `last_scout_run` exceeds 30 minutes. Populate `last_scout_run` on stats endpoint. | All 6 roles agree |
| Scout failure alerting -- push notification | P0 | Simple webhook/SMS (Pushover, ntfy.sh, or Twilio) when scout cron fails. Notify within 15 minutes. | All 6 roles agree |
| Verdict threshold AND logic | P0 | Change `applyVerdictThresholds` to require BOTH min_profit AND min_margin for BUY. Current OR logic violates Principle #3. Backtest before deploying. | PM, BA, TC, TL agree |
| `tuning_events` CHECK constraint fix | P0 | Fix auto-rejection code to use `event_type: 'rejection'` with `auto_rejected: true` in signal_data. Alternatively, expand CHECK constraint via migration 0008. | BA, TL agree (confirmed bug) |
| Security: Auth on analyst endpoints | P0 | Verify `ANALYST_SERVICE_SECRET` is enforced on all non-health analyst routes. Issue #123. | PM, TC, TL agree |
| IronPlanet capture rate investigation | P0 | Investigate adapter failures. Fix to >= 80% capture rate or disable source and remove from Sources page. Never show "active" at 17%. | PM, TC agree |
| Dashboard quick-pass default reason fix | P0 | Change inline Pass action default from `rejection_reason='other'` to `rejection_reason='missing_info'` to prevent silent validation failure. One-line fix. | BA (EC-014), TC, UX agree |
| Gate-only fallback indicator | P0 | When `ai_analysis_json = null` on an analysis run, display "Analysis: Gates only -- AI was unavailable" on Next Action Card. | TC raised, PM added |
| Add `sold_price` field to opportunities | P1 | Simple migration to enable minimum viable outcome tracking. Required to measure "realized margin >= 25%" success metric. | PM, BA agree |
| `last_scout_run` on stats endpoint | P1 | Currently returns null. Required for dashboard banner and pipeline health monitoring. | BA, TL agree |
| "Needs Info" label rename | P1 | Rename "Verification Needed" to "Needs Info" with subtitle "Missing title, lien, or mileage data." Frontend text change only. | TC, UX, BA agree |
| 3 failing scout tests | P2 | Known tech debt. Fix before adding more tests. | TL identified |

**Explicitly NOT in Phase 0 (confirmed by three rounds of cross-role review):**
- Push notifications for opportunities (Phase 1 -- ADR-002 Part B)
- New auction source adapters (late Phase 0 / early Phase 1 -- ADR-004, elevated)
- Outcome tracking UI/dashboard (Phase 1)
- Replace browser `prompt()` for bid/won entry (Phase 1, first item -- see Unresolved Issues)
- Accessibility remediation beyond functional blockers (Phase 1)
- Photo lightbox swipe gestures (Phase 1 -- Target Customer wants this but not blocking)
- Frontend tests (Phase 1)
- Direct inbox-to-bid transition (deferred -- requires state machine change and risk assessment)
- Inbox-to-inspect shortcut via auto-advance (Phase 1 -- UX Lead proposed, needs BA/TL evaluation)

### Phase 1: Private Beta Readiness (Target: Feb-Mar 2026)

Phase 1 transforms DFG from a founder tool into a system that 3-5 private beta users can access.

**Features in Phase 1 (ordered by priority):**

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | Replace browser `prompt()` with validated financial input modals | Numbers must be right (Principle #1). Pre-beta blocker. UX Lead specified Pattern 8. |
| 2 | Clerk authentication | Replace hardcoded auth. Required for any external user. |
| 3 | Stripe billing integration | Subscription management ($149/mo target). |
| 4 | GovPlanet adapter | Third auction source. Pipeline insurance against IronPlanet fragility. |
| 5 | Web push notification system | Operators need alerts without keeping the console open. Competitive table stake. |
| 6 | Reject flow simplification | Implement ADR-007: single multi-select grid, remove legacy dropdown. |
| 7 | Outcome tracking UI | Simple P&L entry for won deals, realized margin calculation. |
| 8 | Onboarding flow | New users need location setup, category preferences. |
| 9 | Per-user category/location preferences | Different operators have different buy boxes. |
| 10 | Photo lightbox swipe gestures | Target Customer requested. Achievable with CSS touch-action and JS touch handlers. |
| 11 | Accessibility fixes for multi-user | Keyboard navigation, focus trapping, touch target sizes (5 items from UX Lead). |
| 12 | 5-second undo toast for dashboard quick actions | Target Customer requested. Protects against accidental Pass on good deals. |

**Not in Phase 1:**
- Multi-tenant data isolation (beta users can share deal flow for Phoenix area)
- Custom scoring algorithm per user
- Native mobile app
- Automated bidding
- Inbox-to-bid fast-track (state machine change -- evaluate after data shows intermediate stages add no tuning value)

### Phase 2: Scale (Target: Q2-Q3 2026)

Phase 2 targets 25-30 paying users at approximately $3,700-4,500 MRR.

| Feature | Rationale for Deferral |
|---------|----------------------|
| Multi-tenant data isolation | Not needed until user count creates contention on shared deal flow |
| Per-user scoring customization | Needs outcome data from multiple users to calibrate |
| Additional auction platform adapters (GovDeals, Public Surplus) | Breadth after depth |
| Algorithm auto-tuning from outcomes | Requires sufficient outcome volume for statistical validity |
| Geographic market expansion beyond Phoenix | Currently hard-coded in `phoenix-market-data.ts`; expand after per-user location prefs proven |
| Team/organization support | Solo operators first |
| Free trial / freemium tier | Validate pricing with beta before giving anything away |
| Optimistic locking on PATCH endpoint | Required before concurrent multi-user writes |
| Request queuing for analyst calls | Queue needed at scale; synchronous 25s timeout is single-operator only |

---

## Appendix: Cross-Role Consensus Summary

After three rounds, the following items have universal or near-universal agreement:

| Item | Consensus Level | Notes |
|------|----------------|-------|
| Scout failure alerting is P0 | All 6 roles | Highest-priority gap |
| Verdict threshold AND logic is P0 | 5 roles (PM, BA, TC, TL, UX implicit) | OR logic violates Principle #3 |
| `tuning_events` CHECK constraint is a bug | 3 roles (BA, TL, PM) | Silent data loss on every auto-rejection |
| Canonical money math is non-negotiable | All 6 roles | Foundation of product trust |
| IronPlanet at 17% is unacceptable as "active" | All 6 roles | Fix or disable with transparency |
| Reject flow needs simplification | 4 roles (TC, UX, BA, PM) | Single grid, remove legacy dropdown |
| "Verification Needed" rename to "Needs Info" | 3 roles (TC, UX, BA) | Frontend text change |
| State machine should NOT allow inbox-to-bid | 4 roles (TL, BA, PM, TC retracted) | Discipline over speed |
| Native app is not Phase 0 or Phase 1 | All 6 roles | Web app on iOS Safari is deliberate |
| Outcome tracking UI is Phase 1 | 5 roles | Target Customer: "not why I open DFG" |

---

## Appendix: Contradiction Resolution Log (All Rounds)

| Contradiction | Round Identified | Resolution |
|---------------|-----------------|------------|
| Tech Lead defers outcomes table vs. BA says `final_price` alone is insufficient | Round 1 | Resolved: Add `sold_price` field to opportunities (minimal migration, not full table) |
| Target Customer wants inbox-to-bid vs. state machine disallows it | Round 1 | Resolved Round 2: Target Customer retracted after reading state machine rationale. UX Lead proposed inspect shortcut for Phase 1. |
| Target Customer says MVC logging is irrelevant vs. Principle #7 | Round 1 | Resolved: MVC logging stays (already built, zero maintenance cost). No further investment in MVP. |
| UX Lead recommends replacing `prompt()` vs. Target Customer was using it fine | Round 1 | **Partially resolved Round 3:** Classified as P1 first-item (pre-beta blocker). Target Customer revised to "should be P0." See Unresolved Issues. |
| Competitor Analyst says moat is shallow vs. PM positions DFG as differentiated | Round 1 | Resolved: Moat is operational knowledge and conservative analysis quality, not technical barriers. Reflected in Principles and phased plan. |
| PM had scout alerting at P1 vs. Target Customer demanded P0 | Round 2 | Resolved Round 2: Elevated to P0. Unanimous in Round 3. |
| BA classifies `prompt()` as P1 pre-beta blocker vs. TC says P0 | Round 2 | **See Unresolved Issues** |
| Quick-pass dashboard action fails on "other" validation | Round 2 | Resolved Round 3: Change default reason to `missing_info` |
| IronPlanet: fix capture rate vs. add third source as fallback | Round 2 | Resolved Round 3: Do both. Fix or disable IronPlanet (P0). Accelerate GovPlanet (late Phase 0 / early Phase 1). |

---

## Unresolved Issues

### 1. Browser `prompt()` replacement timing: P0 or P1?

**The disagreement:** The Target Customer says replacing `window.prompt()` for financial inputs (Set Bid, Won) should be P0 for MVP: "The money I am committing when I set a max bid is the most consequential number in the entire system. Entering it through a browser prompt is not acceptable." The Business Analyst classifies it as P1 pre-beta blocker. The UX Lead specified the replacement modal (Pattern 8) but did not assign a phase. The Technical Lead listed it as Risk R9 (accept for MVP, replace before Phase 1).

**Why it matters:** Product Principle #1 (Numbers must be right) could be interpreted to make this P0. A fat-fingered bid amount entered via `prompt()` has direct financial consequences. However, the current operator is financially literate and has been using `prompt()` without incident. The risk is probabilistic (fat-finger possibility) rather than deterministic (like the verdict threshold OR logic, which is provably producing incorrect recommendations right now).

**My position:** P1 with elevated urgency -- first item shipped in Phase 1, before any beta user touches the system. The rationale is prioritization: there are five P0 items with unanimous or near-unanimous consensus (scout alerting, verdict thresholds, tuning_events bug, analyst auth, IronPlanet investigation) plus two smaller P0 fixes (quick-pass default, gate-only indicator). Adding `prompt()` replacement to P0 would displace work that is either (a) already failing in production (tuning_events bug, verdict OR logic) or (b) the single highest-priority gap across all roles (scout alerting). The `prompt()` dialog is a latent risk; the other P0 items are active failures.

**Needs:** PM call. If the Target Customer (who is also the PM/founder) overrides this classification and moves it to P0, the trade-off is explicit: one of the current P0 items gets delayed. I recommend the decision be made with awareness of what is displaced.

### 2. Inbox-to-inspect auto-advance shortcut: should it be Phase 0 or Phase 1?

**The disagreement:** The UX Lead proposed in Round 2 that the inbox action bar include an "Inspect" button that auto-advances through qualifying to inspect in a single server round-trip. The Target Customer originally wanted inbox-to-bid (retracted) but still wants fewer taps. The Technical Lead and Business Analyst require the state machine transitions to fire in order (for audit trail and MVC events). The question is whether the auto-advance mechanism (two rapid PATCHes from the client) is safe and should be implemented now.

**Why it matters:** The Target Customer's workflow is interrupt-driven with 2-3 minute bursts. Three taps to reach bid status (inbox to qualifying to inspect to bid) versus two (inbox to inspect to bid via auto-advance) is meaningful friction at scale. However, the auto-advance mechanism needs careful implementation: each transition must fire its audit events, and the intermediate qualifying state must be persisted (not skipped).

**My position:** Phase 1. The auto-advance shortcut requires changes to the frontend state management (fire two PATCHes sequentially, handle partial failure) and has edge cases that need the BA and TL to spec (what if the first transition succeeds but the second fails? the opportunity is stuck in qualifying). For a single operator doing 15-30 opportunities per day, the extra tap is a minor friction. For 3-5 beta users triaging at volume, it becomes meaningful.

**Needs:** BA/TL evaluation of the auto-advance implementation pattern. Specifically: is the sequential double-PATCH safe? How should partial failure be handled? Should this be a single API endpoint (`POST /api/opportunities/:id/fast-track`) that handles both transitions atomically server-side?

### 3. No genuine disagreements remain on Phase 0 scope after three rounds.

Beyond the two items above (which are boundary cases between P0 and P1, not fundamental disagreements), the cross-role panel has reached consensus on all Phase 0 decisions. The product principles, success metrics, kill criteria, risk assessment, and remaining work items are stable. The ADRs that needed decisions have been decided. The items that need implementation have clear owners and specifications.

This is an explicit statement: the PRD review process has converged. Further iteration on Phase 0 scope would produce diminishing returns. The priority is implementation of the P0 items identified above, followed by Phase 1 planning with the full beta readiness checklist.

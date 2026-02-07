# Product Manager Contribution -- PRD Review Round 2

**Author:** Product Manager
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Revised after cross-role review

---

## Changes from Round 1

1. **Elevated scout failure alerting from P1 to P0.** The Target Customer stated: "If the scout goes down Friday night, I don't find out until Monday when I notice the inbox is suspiciously empty. That's a lost weekend of deal flow." The Business Analyst confirmed this is a gap (BR-035), and the Competitor Analyst noted that even basic competitors like GovDeals now offer SMS/text notifications. Scout failure alerting moves into remaining Phase 0 work as P0. The operator must know when the pipeline breaks without having to discover it by observation.

2. **Elevated IronPlanet capture rate fix from P1 to P0.** The Target Customer was emphatic: "That's worse than not having the tool at all, because at least when I was doing it manually, I knew what I was seeing." At 17% capture, IronPlanet is functionally a dead source. Either fix the adapter to achieve >= 80% capture or disable the source and remove it from the Sources page so the operator is not deceived into thinking coverage exists where it does not. Leaving a broken source visible and enabled is worse than having no second source.

3. **Added kill criterion for scout failure detection latency.** Round 1 kill criteria could not detect the most dangerous failure mode: the scout silently failing. The Target Customer identified this as the number one concern. New kill criterion: "Operator discovers a scout outage more than 4 hours after it begins." This is measurable once scout failure alerting is implemented.

4. **Revised Product Principles ordering and added grounding.** The UX Lead's Concern #1 (browser `prompt()` for financial inputs) reinforced that Principle #1 (numbers must be right) extends to the input mechanisms, not just the calculations. The Target Customer's emphasis on simplicity ("Don't add features I didn't ask for") elevated reliability-over-features. Principles are now grounded with concrete examples from the codebase rather than abstract statements.

5. **Revised ADR-002 (Notification Channel) with urgency and specificity.** The Target Customer, UX Lead (Concern #3), and Competitor Analyst all identified the notification gap as the single largest UX gap. Swoopa delivers alerts in under 1 minute; DFG has no outbound notification at all. Round 2 splits the decision: scout failure alerting is P0 (simple webhook/SMS), opportunity alerting is Phase 1 (web push). This prevents conflating an operational necessity with a feature enhancement.

6. **Narrowed ADR-003 (Outcome Tracking) scope based on Target Customer input.** The Target Customer said: "I track my P&L in a spreadsheet. It'd be nice in the app, but it's not why I open DFG." The Business Analyst's OQ-004 confirms that `final_price` alone is insufficient to validate the "realized margin >= 25%" success metric. Round 2 recommendation: capture `final_price` and `sold_price` on won deals (two fields), defer full P&L UI to Phase 1. Adjust the success metric measurement to use these two fields rather than requiring the full outcomes table.

7. **Added explicit risk for scraping fragility.** The Competitor Analyst's "uncomfortable truth" #2 (scraping is a fragile foundation) and the technical reality that IronPlanet's owner (Ritchie Bros/RB Global) could restrict access at any time warrant a dedicated risk entry. The Technical Lead's observation that IronPlanet already has ~17% capture suggests structural resistance, not just a bug.

8. **Aligned phased plan with Technical Lead's ADR decisions.** The Technical Lead decided ADR-001 (event sourcing scope: hybrid), ADR-004 (category extensibility: D1-driven config + code prompts), and ADR-005 (photo storage: R2 + external URLs). These are incorporated as decided constraints rather than open questions. Removed duplicate ADR numbering conflicts between PM and Tech Lead contributions.

9. **Revised success metrics based on Business Analyst's measurability analysis.** The Business Analyst's traceability matrix (User Stories to Kill Criteria) revealed that two kill criteria cannot currently be measured: "Sustained negative margins" requires outcomes data that does not exist, and "Operator stops using the tool" requires session tracking that hardcoded auth cannot provide. Round 2 adjusts these to be measurable with current infrastructure or explicitly marks them as deferred until prerequisites are met.

10. **Resolved the verdict threshold logic question (OQ-001).** The Business Analyst flagged that `applyVerdictThresholds` uses OR logic (meeting EITHER min_profit OR min_margin triggers BUY), meaning a deal with $600 profit but 5% margin would be recommended as BID. This contradicts Product Principle #3 (conservative over optimistic). Round 2 takes a position: BUY requires AND logic (both profit AND margin thresholds met). This is an ADR that needs implementation.

---

## Executive Summary

**Problem:** Auction arbitrage on physical assets (trailers, equipment, vehicles) is profitable but time-intensive. Listings surface across fragmented platforms, expire within hours, and require rapid valuation against local demand signals. A solo operator cannot monitor, evaluate, and decide at the volume required to capture the best deals. As the Target Customer described it: "I spend 80% of my time rejecting things and 20% actually evaluating deals."

**Solution:** DFG is an automated intelligence system that continuously scrapes auction platforms, runs AI-powered conservative profit analysis on each listing, scores opportunities against demand signals, and surfaces actionable buy/pass recommendations to the operator via a mobile-first web console. The system compresses the per-listing evaluation time from 10-15 minutes of manual research to 10-30 seconds of operator review.

**Value:** DFG eliminates three specific failure modes that cost the operator money: (1) missed opportunities due to platform fragmentation and manual monitoring limits, (2) bad acquisitions due to rushed or emotional bidding without rigorous financial analysis, and (3) wasted time evaluating listings that do not meet the operator's buy box criteria. The system is already revenue-generating -- profitable acquisitions have been made using the existing platform.

**Current State:** DFG is operational and founder-used. The core pipeline (Scout -> Analyst -> API -> Console) is functional with two auction sources (Sierra Auction active, IronPlanet active but degraded at ~17% capture), three category tiers (Trailers, Vehicles, Power Tools), Claude-powered dual-lens valuation, and a full opportunity lifecycle workflow. The web console runs on iOS Safari as the primary interface. Auth is prototype-grade (hardcoded). No external users. The Competitor Analyst confirmed that no existing product combines cross-platform auction scraping, AI-powered conservative profit analysis, and structured operator workflow for physical asset arbitrage.

---

## Product Vision & Identity

**Name:** Durgan Field Guide (DFG)

**Tagline:** Find the deals others miss. Move before they can.

**Positioning:** DFG is an operator intelligence tool for physical asset arbitrage at auction. It automates the information-gathering and analysis work so the operator focuses exclusively on decision-making and execution. As the Competitor Analyst summarized: DFG's differentiation is (1) accurate, conservative profit analysis that prevents bad acquisitions, and (2) structured workflow that enforces disciplined decision-making. These are harder to replicate than alerts or scraping.

**What DFG IS:**
- A deal flow intelligence engine for physical asset acquisition
- A conservative financial analysis tool that protects the operator from bad buys
- A workflow system that enforces disciplined evaluation before bidding
- A mobile-first operator console designed for on-the-go decision-making (iOS Safari primary, per CLAUDE.md)

**What DFG is NOT:**
- Not a marketplace or auction platform (DFG scrapes platforms; it does not host listings)
- Not a general-purpose dashboard or analytics tool
- Not a fully automated bidding bot (the operator makes final decisions -- Product Principle #5)
- Not a multi-tenant SaaS product (founder-operated in Phase 0; private beta in Phase 1)
- Not an iOS native app (it is a Next.js web app accessed via iOS Safari, per CLAUDE.md)
- Not competing on alert speed or platform coverage (per Competitor Analyst: "those are races DFG cannot win yet")

---

## Product Principles

These are ordered by priority. When principles conflict, the higher-numbered principle wins.

1. **Numbers must be right.** Financial calculations are non-negotiable. A single incorrect margin or double-counted fee destroys operator trust permanently. The canonical money math (Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs; Profit = Net Proceeds - Acquisition Cost; Margin % = (Profit / Acquisition Cost) * 100) is the foundation of every product decision. Listing fees are selling costs only -- never included in acquisition cost. The Technical Lead documented this invariant in the Money Math Validation Checklist. The Target Customer confirmed: "If I bid based on a number the system gave me and the profit calculation was wrong, I'm done. I'll go back to my spreadsheet." This principle extends to input mechanisms: the UX Lead's Concern #1 (browser `prompt()` for entering bid amounts) is a numbers-must-be-right issue, not just a UX issue.

2. **Reliability over features.** A system that misses a high-value opportunity because the scraper was down or the analyst timed out is worse than a system with fewer features that never drops a listing. Uptime, data completeness, and failure visibility take priority over new capabilities. The Target Customer ranked scout reliability as concern #1 and said: "If I can't trust that the system is watching, I have to go back to watching manually, which means the tool is worthless." The Competitor Analyst observed that DFG's moat is shallow on features but deep on operational discipline -- reliability is the differentiator.

3. **Conservative over optimistic.** DFG exists to protect the operator from bad acquisitions, not to encourage volume. Analysis should err on the side of lower valuations, higher cost estimates, and PASS/WATCH recommendations when data is insufficient. The Business Analyst's OQ-001 (verdict threshold logic) revealed that OR logic in `applyVerdictThresholds` allows a deal with $600 profit but 5% margin to be recommended as BID -- this violates conservatism. Verdict thresholds must use AND logic for BUY (both profit AND margin met). A missed good deal is recoverable; a bad acquisition is cash destroyed.

4. **Speed is competitive advantage.** Auctions are time-sensitive. Every minute between listing appearance and operator review is a minute a competitor could act. Analysis latency, page load time, and alert delivery must be optimized relentlessly. A fast, correct answer beats a perfect, late answer. The Technical Lead specified performance budgets: API list endpoints < 200ms p95, opportunity detail < 300ms p95, AI analysis < 30s p95, frontend LCP on iOS Safari < 2.5s, INP < 200ms. The Target Customer wants the Next Action Card visible within 1 second of tapping an opportunity.

5. **Mobile-first, iOS Safari always.** The operator uses this tool in the field -- at auctions, in the truck, walking lots. Every feature must work flawlessly on iOS Safari. Desktop is a convenience, not the primary interface. CLAUDE.md specifies: `min-h-screen` not `h-screen`, prefer `position: sticky` over `position: fixed`, 44px minimum touch targets, `pb-safe` for safe area insets. The UX Lead identified specific violations: checkbox touch targets at 20x20px, external link buttons at ~18px, and inline CTA buttons at ~30px are all below the 44px minimum. The Target Customer said: "If I have to pinch-zoom or scroll horizontally to see the action buttons, I'm out."

6. **Operator decides, system recommends.** DFG provides analysis, scoring, and recommendations. The operator makes the final call. The system must never auto-bid, auto-reject viable opportunities, or hide information that could inform a decision. Transparency of reasoning is required. The Target Customer raised a specific concern about the Kill Switch Banner auto-rejecting and redirecting to dashboard: "Don't redirect me. Let me see it, let me understand why, and give me an override." Hard gate auto-rejection is acceptable for clearly disqualifying conditions (salvage title, confirmed), but the operator must be able to see and override -- flag is safer than reject for borderline cases.

7. **Audit everything.** Every operator decision, every analysis run, every status change must be logged with full context. This data feeds algorithm tuning, enables post-mortem analysis of wins and losses, and builds the training corpus for better future recommendations. The Technical Lead documented the dual audit system: `operator_actions` for workflow tracking, `mvc_events` for financial milestones (immutable). The Target Customer noted he does not actively use the Decision History section today, but acknowledged it is infrastructure for future algorithm tuning, not a user-facing feature. This principle remains important even though the operator does not interact with audit data directly.

---

## Success Metrics & Kill Criteria

### MVP Success Metrics

| Metric | Target | Measurement Method | Timeframe | Notes |
|--------|--------|-------------------|-----------|-------|
| Opportunities surfaced per day | >= 15 qualified candidates | `SELECT COUNT(*) FROM opportunities WHERE status NOT IN ('rejected','archived') AND date(created_at) = date('now')` | Daily average over 30 days | Requires both sources functioning. At 17% IronPlanet capture, target may not be achievable without fix. |
| Analysis accuracy (operator agreement) | >= 70% of BID recommendations result in operator bid or watch | MVC events: `decision_made` where `analyst_verdict = BID` and decision IN (BID, WATCH) | Rolling 30-day window | Business Analyst mapped this to US-003 and US-006 |
| False positive rate | <= 30% of scored >= 80 opportunities get rejected | Rejection rate of high-score opportunities via `tuning_events` | Rolling 30-day window | Target Customer specifically called out false positives as trust-destroying |
| Operator response time | Median < 4 hours from inbox to qualifying/rejected | `status_changed_at` delta from inbox to next status | Rolling 30-day window | Measures whether the operator is engaging with the tool |
| Scout uptime | >= 95% of scheduled runs complete successfully | `scout_runs` table success rate | Weekly | Requires scout failure alerting (P0) to be meaningful |
| Analysis latency | p95 < 45 seconds from listing to scored opportunity | Time delta: `listing.created_at` to `opportunity.last_analyzed_at` | Rolling 7-day window | Technical Lead specified 30s p95 for AI analysis call itself |
| Won deals per month | >= 2 acquisitions from DFG pipeline | `SELECT COUNT(*) FROM opportunities WHERE status = 'won' AND created_at > datetime('now', '-30 days')` | Monthly | Core revenue validation |
| Realized margin on won deals | >= 25% average margin | `(sold_price - acquisition_cost) / acquisition_cost * 100` using `final_price` + `sold_price` fields on opportunity | Per-deal, trailing 90 days | Requires adding `sold_price` field to opportunities (see ADR-003 revision) |
| Scout failure detection latency | < 4 hours from failure to operator awareness | Time between last successful scout run and operator notification | Per-incident | New metric from Round 2; requires scout failure alerting implementation |

### Kill Criteria

The MVP should be killed or fundamentally reconsidered if any of the following hold true after 90 days of operation:

| Kill Criterion | Threshold | Rationale | Measurability Status |
|---------------|-----------|-----------|---------------------|
| Zero profitable acquisitions | 0 won deals with positive margin in 90 days | System is not generating actionable intelligence | Measurable now: `opportunities WHERE status='won'` |
| Sustained negative margins | Average margin < 10% across all won deals over 90 days | Deals being surfaced are not sufficiently undervalued | Requires `sold_price` field (ADR-003); not measurable until implemented |
| Operator abandonment | < 5 opportunity detail views per week for 4 consecutive weeks | Tool is not providing enough value to justify checking | Measurable via `operator_actions` table activity counts (more reliable than login tracking, which hardcoded auth cannot provide -- per Business Analyst's gap analysis) |
| Scout data staleness | > 50% of opportunities have `auction_ends_at` in the past when operator first views them | Pipeline is too slow to be useful for time-sensitive auctions | Measurable now: compare `auction_ends_at` to first `operator_actions` timestamp per opportunity |
| Analysis disagreement rate | > 60% of BID recommendations rejected by operator over 60 days | AI analysis is not calibrated to operator's actual buy box | Measurable now: MVC events where `analyst_verdict=BID` but `decision=PASS` |
| Scout failure goes undetected | Operator discovers a scout outage > 4 hours after it begins more than twice | Failure alerting is not working; operator cannot trust coverage | Requires scout failure alerting (P0); measurable once implemented |

---

## Risks & Mitigations

### Business Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| B1 | **Auction platform blocks scraping.** IronPlanet (owned by Ritchie Bros/RB Global) could restrict access. GovDeals could block scrapers. The Competitor Analyst noted: "Official API access for government auction platforms is rare and typically restricted to seller-side integrations." | High | Critical -- no data, no product | Multiple source adapters isolate platform-specific logic. Rate limiting and polite scraping headers. Sierra is the primary source and is working well. Investigate official API access but do not depend on it. If a source becomes unscrapeable, disable it and be transparent with the operator rather than showing degraded coverage as functional. |
| B2 | **IronPlanet capture rate remains degraded.** At 17%, this is functionally a dead source. The Technical Lead identified this as Risk R6 (data freshness) and the Target Customer called it the scariest thing about the system. | High | High -- false confidence in coverage | P0: Investigate adapter failures. If structural (HTML changes, anti-scraping), fix the adapter. If the platform is actively blocking, disable the source and remove it from Sources page. Do not show a source as "active" when it captures 17% of listings. Target: >= 80% capture rate or disable. |
| B3 | **Market shift reduces trailer margins.** Phoenix trailer market could soften, reducing the core thesis. | Medium | High -- category thesis invalidated | Category system already supports Power Tools and Vehicles. Outcomes tracking provides early warning via declining margin trends. Category expansion is a Phase 1/2 investment, not a Phase 0 panic response. |
| B4 | **Sole operator dependency (Scott).** The product stalls without active use and feedback. | High | Medium -- product stalls | Roadmap includes private beta (Phase 1) to validate multi-user value. Auth upgrade (Clerk) is prerequisite. For Phase 0, the operator IS the product owner -- this is a feature, not a bug. |
| B5 | **AI analysis costs exceed deal value.** Claude API costs per analysis could erode unit economics. | Low | Medium -- unit economics break | Pre-filter with three-gate classification reduces unnecessary AI calls. Monitor cost-per-opportunity. The Business Analyst documented that the analyst uses category-specific prompts, which avoids wasting expensive AI calls on out-of-scope listings. |
| B6 | **Shallow moat.** The Competitor Analyst stated: "Any developer with Claude API access could build a comparable analysis engine in weeks." Core technical capabilities are not defensible. | Medium | Medium -- competitive pressure | The moat is operational knowledge (which auctions to scrape, how buyer premiums work, what "undervalued" means in the trailer market) plus the structured workflow and conservative financial modeling. Encode this knowledge into the system (category configs, prompt engineering, market data) rather than keeping it in the operator's head. Defensibility grows with outcome data over time. |
| B7 | **Pricing unvalidated at $149/month.** Zero external paying users. The Competitor Analyst benchmarked Swoopa at $47-352/mo covering 7+ platforms with native apps. DFG covers 2 sources via a web app. | Low (Phase 0) | Medium (Phase 1) | Phase 0 is founder-only; pricing is irrelevant. Phase 1 beta validates pricing. The Target Customer stated willingness to pay $300/mo for a reliable tool. The value proposition is not alerts (where competitors are cheaper) but conservative profit analysis and workflow discipline. |

### Technical Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| T1 | **D1 concurrent write conflicts.** The Technical Lead documented that `PATCH /api/opportunities/:id` does not use optimistic locking. Two requests updating the same opportunity could cause lost updates. | Low (single operator) | High (multi-user) | Accept for MVP (single operator). Add `updated_at` optimistic lock to PATCH endpoint before Phase 1 (multi-user). The analyze endpoint already has optimistic locking. |
| T2 | **Analyst timeout under Claude API load.** 25-second timeout is generous but Claude API cold starts or rate limits could cause failures during peak auction periods. | Medium | Medium -- analysis delays | Current fallback: analysis proceeds without AI result (gate-only mode per Business Analyst's BR-049). Exponential backoff retry already implemented. Analysis runs are idempotent and replayable. |
| T3 | **Shared D1 schema coupling.** The Technical Lead's Risk R3: dfg-scout and dfg-api share the same D1 database. Schema changes in one worker can break the other. | Medium | High -- pipeline stalls | Migrations live in dfg-api only. Scout reads/writes its own tables. Document schema ownership clearly (Technical Lead's recommendation). |
| T4 | **Auth is prototype-grade.** Hardcoded credentials. The Target Customer's concern is not about data theft but about someone stumbling onto the analyst endpoint and running up the Claude API bill. | High | Critical for multi-user, Medium for single operator | Acceptable for Phase 0. The Technical Lead confirmed analyst endpoints are behind `ANALYST_SERVICE_SECRET` for direct access and service bindings for production. P0 Issue #123 (unauthenticated analyst endpoints) must be resolved. Clerk + Stripe for Phase 1. |
| T5 | **No rate limiting on API.** The Technical Lead's Risk R5: a compromised token or runaway client could exhaust D1 read/write quotas. | Low | Medium | Add per-IP rate limiting via CF WAF rules in Phase 1. For MVP, the single operator and private access reduce exposure. |
| T6 | **`tuning_events` CHECK constraint may reject `status_change` event_type.** The Business Analyst's OQ-002: auto-rejection events may silently fail because the CHECK constraint does not include `status_change` as a valid `event_type`. | Medium | High -- data loss on auto-rejection events | P0: Verify D1 behavior with CHECK constraints. If strict, add `status_change` to the allowed values via migration before it causes silent data loss. |
| T7 | **Verdict threshold OR logic produces non-conservative recommendations.** The Business Analyst's OQ-001: a deal with $600 profit but 5% margin would be recommended as BID under current OR logic. | High | High -- violates Principle #3 | P0: Change `applyVerdictThresholds` to use AND logic for BUY threshold (must meet BOTH min_profit AND min_margin). See ADR-006. |

### Execution Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| E1 | **Scope creep into multi-tenant SaaS.** The Competitor Analyst's "solo operator market is tiny" observation could pressure premature expansion. | Medium | High -- diverts from core value | This PRD explicitly scopes to MVP/Phase 0. Multi-tenant is Phase 2 at earliest. The Target Customer said: "Don't add features I didn't ask for." |
| E2 | **Over-engineering scoring algorithm.** Scoring changes without outcome data are speculative. | Medium | Medium -- complexity without accuracy gains | Scoring changes require backtesting on historical data (per CLAUDE.md). Tuning events capture signals for data-driven iteration. |
| E3 | **Native app pressure.** The Competitor Analyst documented that Swoopa, Flipify, and DealScout are all native apps. The UX Lead noted web push on iOS Safari remains inferior to native push. | Low (Phase 0) | Medium (Phase 1+) | Do not build a native app. The Target Customer uses iOS Safari today and it works. Web push for Phase 1 notifications. Native app is a Phase 3+ consideration if user acquisition requires App Store presence. |

---

## Open Decisions / ADRs

### ADR-001: Auth System Selection
- **Status:** Decided (Clerk + Stripe), not yet implemented
- **Decision:** Use Clerk for authentication, Stripe for billing
- **Rationale:** Clerk handles OAuth, session management, and user management. Stripe handles subscription billing. Both have Cloudflare Workers compatibility.
- **Blocker for:** Private beta (Phase 1)
- **Risk if deferred:** No external users can access the system. Kill criterion "operator abandonment" cannot be measured via login tracking (Business Analyst's gap).

### ADR-002: Notification Channels
- **Status:** Split decision (Round 2 revision)
- **Part A: Scout failure alerting (P0)**
  - **Decision:** Implement a simple webhook notification when scout cron runs fail. Use a cheap, reliable channel: Pushover, ntfy.sh, or a Twilio SMS via Cloudflare Worker. The operator must receive a notification within 15 minutes of a failed scout run.
  - **Rationale:** The Target Customer ranked this as concern #1. The UX Lead identified it as the "single largest UX gap in the MVP." Scout failure is an operational emergency, not a feature enhancement. The implementation is minimal: check scout_runs success rate after each cron, send webhook if failure detected.
  - **Blocker for:** Kill criterion "scout failure goes undetected"
- **Part B: Opportunity alerting (Phase 1)**
  - **Status:** Open
  - **Question:** How should time-sensitive opportunity alerts (ending_soon, high-score new opportunity) reach the operator?
  - **Options:** (a) Web push notifications via Push API, (b) SMS via Twilio, (c) Email digest, (d) iOS home screen PWA badge
  - **Recommendation:** Web push notifications as primary for Phase 1. SMS as critical-only fallback. Email for daily digest (low priority per Target Customer). The Competitor Analyst noted that native app competitors have a structural advantage here -- web push on iOS Safari is inferior to native push. Accept this gap for Phase 1.

### ADR-003: Outcome Tracking Depth (Revised)
- **Status:** Decided for MVP
- **Decision:** Add a `sold_price` field to the `opportunities` table via migration. When an operator transitions a won deal to archived (or adds outcome data), they enter `sold_price`. Combined with `final_price` (purchase price) and the source's `buyer_premium_pct`, the system can compute realized profit and margin using the canonical money math.
- **Rationale:** The Target Customer said outcome tracking is "nice in the app, but it's not why I open DFG." However, the Business Analyst's OQ-004 confirmed that `final_price` alone is insufficient to validate the "realized margin >= 25%" success metric. Two fields (`final_price` + `sold_price`) are the minimum viable outcome data. Full P&L (repair costs, transport, listing fees) is Phase 1.
- **What this enables:** `Realized Profit = sold_price - (final_price * (1 + buyer_premium_pct/100) + estimated_transport + estimated_repairs)`. This uses existing data (source defaults for premium, analysis assumptions for transport/repairs) plus one new operator input (`sold_price`).
- **What this does NOT include:** Actual repair cost entry, actual transport cost entry, listing fee entry, days-held tracking, or an outcome dashboard. Those are Phase 1 per the Technical Lead's ADR-003 (Option A: defer outcomes table).

### ADR-004: Multi-Source Expansion Priority
- **Status:** Deferred to Phase 1
- **Question:** Which auction platform adapter should be built next?
- **Context:** GovPlanet is seeded in sources table (disabled). GovDeals referenced in project docs.
- **Recommendation:** GovPlanet first (already has source definition, government surplus overlaps with target asset categories). However, per the Target Customer: "Fix what you have before adding more." IronPlanet capture rate fix is P0; new source expansion is Phase 1.

### ADR-005: Scoring Algorithm Transparency
- **Status:** Open (carried from Round 1)
- **Question:** How much of the scoring breakdown should be visible to the operator?
- **Context:** The Technical Lead documented that `score_breakdown` is stored as JSON with four dimensions (Margin 40%, Demand 30%, Condition 15%, Logistics 15%). The Business Analyst specified score bands (high >= 70, medium 40-69, low < 40).
- **Recommendation:** Surface all four dimensions with individual scores in opportunity detail view. Operator trust requires understanding why a score is what it is. The Target Customer's "What confuses me" section did not mention scoring -- the current presentation may be sufficient for MVP. Deprioritize full score transparency behind P0 items.

### ADR-006: Verdict Threshold Logic (New from Round 2)
- **Status:** Needs implementation
- **Decision:** Change `applyVerdictThresholds` to use AND logic for BUY verdicts.
- **Current behavior:** Meeting EITHER `min_profit` OR `min_margin` triggers BUY. A deal with $600 profit but 5% margin would be recommended as BID for trailers.
- **Required behavior:** BUY requires meeting BOTH `min_profit` AND `min_margin`. WATCH requires meeting EITHER (but not both). PASS when meeting neither.
- **Rationale:** The Business Analyst flagged this in OQ-001. It directly violates Product Principle #3 (conservative over optimistic). A 5% margin deal is not a buy regardless of absolute profit -- the risk-adjusted return is too low.
- **Implementation note:** This change requires backtesting against historical opportunities to validate it does not produce excessive false negatives.

### ADR-007: Reject Flow Simplification (New from Round 2)
- **Status:** Needs design decision
- **Context:** The Target Customer said: "The reject modal has both a 'Primary Reason' dropdown AND a multi-select reason code panel. Why do I need to pick the same thing twice?" The Business Analyst documented both the legacy single-select reasons (BR-018: `too_far`, `too_expensive`, etc.) and the decision reason taxonomy (BR-019: 13 codes, 8 categories).
- **Question:** Should the reject flow use the legacy dropdown, the multi-select taxonomy, or a simplified single-select from the taxonomy?
- **Recommendation:** Remove the legacy dropdown. Use the multi-select taxonomy as the sole reject reason mechanism, but default to showing only the 5 most common reason codes with an "Other/More" expander. For batch reject, a single reason code applies to all items (per Target Customer: "batch reject with a single reason code applied to all"). The Business Analyst's BR-019 data feeds tuning events regardless of which UI is used.

---

## Phased Development Plan

### Phase 0: MVP (Current -- Operational)

Phase 0 is largely complete. The system is operational and producing revenue. Remaining Phase 0 work is hardening and gap-filling based on cross-role review findings.

**What is built and working:**
- Scout pipeline with Sierra + IronPlanet adapters (cron every 15 min)
- Three-gate classification (price, negative keywords, positive keywords)
- Claude-powered dual-lens analysis (operator perspective + buyer perspective)
- Three category tiers with specialized prompts (Trailers, Vehicles, Power Tools) -- per Technical Lead's ADR-004, D1-driven `category_defs` table for configuration plus in-code prompt files for domain knowledge
- Full opportunity lifecycle workflow (inbox -> qualifying -> watch -> inspect -> bid -> won/lost) with state machine enforced server-side (Business Analyst BR-012)
- Operator console on iOS Safari (dashboard, opportunity list with filters, opportunity detail with analysis)
- Operator inputs system (title status, VIN, condition, overrides) with gate computation
- Gates system (critical/confidence gates that block or inform bidding)
- Staleness detection and attention-required alerts
- Next Action guidance card (verdict-driven operator guidance)
- Decision reason taxonomy (13 codes, 8 categories, multi-select)
- MVC event logging (immutable audit trail) -- Technical Lead ADR-001 confirmed hybrid approach (events for financial milestones, direct mutation for workflow state)
- R2 photo storage with 100% coverage -- Technical Lead ADR-005 confirmed external URLs for display, R2 for evidence snapshots
- Batch operations (reject, archive) with max 50 items, sequential processing (not atomic)
- Analysis runs are immutable snapshots with optimistic concurrency control
- Computed alerts (derived at read time, not stored) with dismissal tracking

**Remaining Phase 0 work (MVP gaps, revised after cross-role review):**

| Item | Priority | Description | Source |
|------|----------|-------------|--------|
| Scout failure alerting | P0 | Operator must be notified within 15 minutes when scout cron fails. Simple webhook/SMS. | Target Customer #1 concern, UX Lead Concern #3, ADR-002 Part A |
| IronPlanet capture rate fix or disable | P0 | Either fix adapter to >= 80% capture rate or disable source and remove from Sources page. 17% capture with "active" status is deceptive. | Target Customer, Competitor Analyst |
| P0 Security: Auth on analyst endpoints | P0 | Issue #123 -- unauthenticated analyst endpoints must be locked down. Target Customer noted API bill exposure risk. | Business Analyst gap analysis, Target Customer |
| Verdict threshold AND logic | P0 | Change `applyVerdictThresholds` to require BOTH min_profit AND min_margin for BUY. Current OR logic violates Principle #3. | Business Analyst OQ-001, ADR-006 |
| `tuning_events` CHECK constraint fix | P0 | Verify and fix CHECK constraint to allow `status_change` event_type for auto-rejection events. Silent data loss risk. | Business Analyst OQ-002 |
| Add `sold_price` field to opportunities | P1 | Simple migration to enable minimum viable outcome tracking. Required to measure "realized margin >= 25%" success metric. | ADR-003, Business Analyst OQ-004 |
| `last_scout_run` on stats endpoint | P1 | Currently returns null. Required for operator to verify pipeline health from dashboard. | Business Analyst OQ-003 |
| 3 failing scout tests | P2 | Known tech debt -- fix before adding more tests. | Technical inventory |

**Explicitly NOT in Phase 0 (confirmed by cross-role review):**
- Push notifications for opportunities (Phase 1 -- ADR-002 Part B)
- New auction source adapters (Phase 1 -- ADR-004; "fix what you have before adding more" per Target Customer)
- Outcome tracking UI/dashboard (Phase 1 -- Target Customer: "not why I open DFG")
- Replace browser `prompt()` for bid/won entry (Phase 1 -- UX Lead Concern #1; functional for single operator today)
- Accessibility remediation beyond functional blockers (Phase 1 -- UX Lead: "current state is functional for a sighted, mouse/touch-capable sole operator")
- Photo lightbox swipe gestures (Phase 1 -- Target Customer wants this but it is not blocking)
- Frontend tests (Phase 1 -- Technical Lead and Business Analyst agree; accept risk for founder-only use)
- Direct inbox-to-bid transition (Target Customer wants this; requires state machine change and risk assessment)

### Phase 1: Private Beta Readiness (Target: Feb-Mar 2026)

Phase 1 transforms DFG from a founder tool into a system that 3-5 private beta users can access. The Competitor Analyst confirmed that no free trial mechanism exists, which is a conversion risk at $149/mo.

**Features in Phase 1:**

| Feature | Rationale | Cross-Role Input |
|---------|-----------|------------------|
| Clerk authentication | Replace hardcoded auth. Required for any external user. | Business Analyst: cannot measure login-based kill criteria without real auth |
| Stripe billing integration | Subscription management ($149/mo target) | Competitor Analyst: price is in-range but unvalidated; beta is the validation |
| Web push notification system | Operators need alerts without keeping the console open | UX Lead Concern #3: "single largest UX gap"; Competitor Analyst: competitors all have push |
| GovPlanet adapter | Third auction source, expands deal flow coverage | Target Customer: only after existing sources are reliable |
| Outcome tracking UI | Simple P&L entry for won deals, realized margin calculation | Target Customer: "even just a single number -- Total Profit: $X,XXX" |
| Onboarding flow | New users need location setup, category preferences | UX Lead Persona 2 (beta tester) has different location and categories |
| Per-user category/location preferences | Different operators have different buy boxes | Business Analyst OQ-005: distance is static today |
| Replace browser `prompt()` with proper modals | Validate numeric input, currency formatting, confirmation step | UX Lead Concern #1: "the most consequential number in the entire workflow" |
| Reject flow simplification | Remove dual-select (legacy dropdown + taxonomy) | Target Customer: "one tap, one reason code, done"; ADR-007 |
| Accessibility fixes for multi-user | Keyboard navigation, focus trapping, touch target sizes | UX Lead: 5 recommended remediations before private beta |

**Not in Phase 1:**
- Multi-tenant data isolation (beta users can share deal flow for Phoenix area)
- Custom scoring algorithm per user
- Native mobile app (web push is sufficient; Competitor Analyst notes structural gap but Phase 1 is 3-5 users)
- Automated bidding
- Undo/revert for destructive actions (UX Lead Concern #2; tracked but deferred)

### Phase 2: Scale (Target: Q2-Q3 2026)

Phase 2 targets 25-30 paying users at approximately $3,700-4,500 MRR. The Competitor Analyst noted this is "a lifestyle business, not a venture-scale outcome" -- that is acceptable and intentional.

**Deferred to Phase 2:**

| Feature | Rationale for Deferral |
|---------|----------------------|
| Multi-tenant data isolation | Not needed until user count creates contention on shared deal flow |
| Per-user scoring customization | Need enough outcome data from multiple users to calibrate |
| Additional auction platform adapters (GovDeals, Public Surplus) | Breadth after depth |
| Algorithm auto-tuning from outcomes | Requires sufficient outcome volume for statistical validity |
| Geographic market expansion beyond Phoenix | Currently hard-coded in `phoenix-market-data.ts`; expand after per-user location prefs are proven |
| Daily email digest | Lower priority than push notifications per Target Customer |
| Team/organization support | Solo operators first |
| Free trial / freemium tier | Competitor Analyst identified this as a conversion risk; validate pricing with beta before giving anything away |
| Optimistic locking on PATCH endpoint | Technical Lead's Risk R1; required before concurrent multi-user writes |
| Request queuing for analyst calls | Technical Lead noted synchronous calls with 25s timeout; queue needed at scale |

---

## Appendix: Cross-Role Contradiction Resolution

| Contradiction | Resolution |
|---------------|------------|
| Technical Lead recommends deferring outcomes table (ADR-003 Option A) vs. Business Analyst OQ-004 says `final_price` alone is insufficient for realized margin metric | Resolved: Add `sold_price` field to opportunities table (minimal migration, not a full outcomes table). This satisfies the measurement need without the full table. |
| Target Customer wants direct inbox-to-bid transition vs. Business Analyst BR-012 enforces state machine with defined transitions | Deferred: The state machine is server-enforced and changing it has risk implications. Track as a Phase 0/1 boundary item. Evaluate whether `inbox -> bid` should be a valid transition after understanding how often the Target Customer actually encounters this need. |
| Target Customer says "MVC event logging -- DON'T CARE for MVP" vs. Product Principle #7 (Audit everything) | No change: MVC logging is infrastructure, not a user feature. It remains in Phase 0 because it already works and costs nothing to maintain. The Target Customer's feedback confirms it should not receive further investment in MVP, which is already the plan. |
| UX Lead recommends replacing `prompt()` for financial inputs (Principle #1 risk) vs. Target Customer is using it today without complaint | Deferred to Phase 1: The Target Customer is a financially literate single user who enters correct numbers. The risk increases with beta users who may enter "$1,500" or "1500.50" (Business Analyst OQ-007). Phase 1 replacement before external users. |
| Competitor Analyst says "DFG's moat is shallow" vs. PM positioning DFG as differentiated | Acknowledged: The moat is operational knowledge and conservative analysis quality, not technical barriers. This is reflected in Product Principles (numbers must be right, conservative over optimistic) and the phased plan (encode domain knowledge into system before scaling). |

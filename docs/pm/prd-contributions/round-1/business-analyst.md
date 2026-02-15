# Business Analyst Contribution -- PRD Review Round 1

**Author:** Business Analyst
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Ground Truth:** Codebase at `dfg-console` repo, CLAUDE.md, PM contribution, and operational data model

---

## MVP User Stories

### US-001: Review New Opportunities

**Title:** Operator reviews newly ingested auction opportunities

**Persona:** Scott (Solo Operator, Founder)

**Narrative:** As an operator, I want to see all newly surfaced auction opportunities in a prioritized inbox so that I can quickly identify which items deserve further evaluation before their auctions close.

**Acceptance Criteria:**

- [ ] AC-001.1: Given the operator opens the dashboard, when new opportunities have been ingested in the last 24 hours, then opportunities with status `inbox` are displayed sorted by `auction_ends_at ASC` (soonest-ending first, NULLs last).
- [ ] AC-001.2: Given an opportunity is in `inbox` status, when it has a `buy_box_score >= 70` and `last_analyzed_at IS NOT NULL` and auction ends within 48 hours or was created within last 12 hours, then it appears in the Strike Zone count on the stats endpoint.
- [ ] AC-001.3: Given the opportunity list is loaded, when the operator views it on iOS Safari, then each opportunity card displays: title, current bid (formatted as USD), auction end time (relative), distance in miles, buy_box_score, and a primary image thumbnail.
- [ ] AC-001.4: Given the operator applies a status filter, when `status=inbox` is selected, then only inbox opportunities are returned and the total count reflects the filtered set.
- [ ] AC-001.5: Given the opportunity list, when the total exceeds 50 items, then pagination via `limit` and `offset` query parameters returns correct subsets and the `total` count remains accurate.

**Business Rules:**

- BR-001: Opportunities enter the system in `inbox` status exclusively via the Scout ingest pipeline.
- BR-002: The stats endpoint must return counts for all 9 statuses (`inbox`, `qualifying`, `watch`, `inspect`, `bid`, `won`, `lost`, `rejected`, `archived`), returning 0 for statuses with no entries.
- BR-003: Score bands are defined as: high >= 70, medium >= 40 and < 70, low < 40.

**Out of Scope:**

- Push notifications for new opportunities (ADR-002, Phase 1)
- Per-user inbox filtering by category or location preference (Phase 1)
- Custom sort algorithms beyond the 5 allowed sort fields

---

### US-002: Evaluate Opportunity Detail

**Title:** Operator views full opportunity details with AI analysis

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to view comprehensive details of a single opportunity -- including AI-generated analysis, pricing breakdown, photos, timing, and gates status -- so that I can make an informed acquisition decision.

**Acceptance Criteria:**

- [ ] AC-002.1: Given an opportunity exists, when the operator navigates to `/opportunities/:id`, then the detail page displays all fields from the `GET /api/opportunities/:id` response including: title, description, source, status, current_bid, max_bid_low, max_bid_high, auction_ends_at, distance_miles, photos array, score_breakdown, analysis_summary, operator_inputs, gates, and action history.
- [ ] AC-002.2: Given the opportunity has a `current_analysis_run_id`, when the detail page loads, then the persisted AI analysis (from `analysis_runs.ai_analysis_json`) is displayed in the tabbed analysis interface without requiring a new AI call.
- [ ] AC-002.3: Given the opportunity has photos, when the operator taps a photo thumbnail, then a full-screen lightbox appears. Tapping outside the lightbox closes it.
- [ ] AC-002.4: Given the opportunity has `source_url`, when the operator taps "View Listing", then the original auction listing opens in a new browser tab.
- [ ] AC-002.5: Given the opportunity has active alerts, when the detail page loads, then alerts are displayed sorted by severity (critical > high > medium > low) with dismiss buttons.

**Business Rules:**

- BR-004: The `source_defaults` object must return `buyer_premium_pct` and `pickup_days` from the `sources` table for the opportunity's source.
- BR-005: If `source_url` is null, the "View Listing" link must not be rendered; a "No link" label is shown instead.
- BR-006: Alert dismissals are stored in `operator_actions` with `action_type='alert_dismiss'` and are keyed per `alert_key` to prevent re-display.

**Out of Scope:**

- Offline caching of opportunity details (Phase 1 PWA)
- Score breakdown visualization by dimension (ADR-005, open)

---

### US-003: Run AI Analysis on Demand

**Title:** Operator triggers Claude-powered analysis for an opportunity

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to trigger an AI-powered analysis on any opportunity so that I get a dual-lens evaluation (investor + buyer perspective) with max bid recommendation, repair estimates, and deal readiness assessment.

**Acceptance Criteria:**

- [ ] AC-003.1: Given the operator taps the "Analyze" button, when the API call to `POST /api/opportunities/:id/analyze` succeeds, then an `analysis_runs` record is created with `recommendation` (BID/WATCH/PASS/NEEDS_INFO), `derived_json`, `gates_json`, and `ai_analysis_json` persisted.
- [ ] AC-003.2: Given the analyst worker returns an `investor_lens.verdict` of `STRONG_BUY` or `BUY`, when all critical gates are cleared, then the analysis run recommendation is set to `BID`.
- [ ] AC-003.3: Given the analyst worker returns `STRONG_BUY` or `BUY`, when critical gates are NOT cleared, then the recommendation is `WATCH` (not `BID`), ensuring gate compliance.
- [ ] AC-003.4: Given the analyst worker returns `MARGINAL`, then the recommendation is `WATCH` regardless of gate status.
- [ ] AC-003.5: Given the analyst worker returns `PASS`, then the recommendation is `PASS` regardless of gate status.
- [ ] AC-003.6: Given the analyst worker is unavailable or times out (25-second timeout), then the analysis completes with `aiAnalysisResult = null` and a gate-based fallback recommendation is used. The UI displays no error for the fallback.
- [ ] AC-003.7: Given a previous analysis run exists, when a new analysis is run, then a `delta` object is returned showing the change in recommendation and max bid from the previous run.
- [ ] AC-003.8: Given concurrent modifications occur, when the optimistic lock check fails (`updated_at` mismatch), then a 409 Conflict is returned and the orphaned `analysis_runs` record is cleaned up.
- [ ] AC-003.9: Given an analysis is triggered, when it completes successfully, then `last_analyzed_at` and `last_operator_review_at` are both updated on the opportunity (clears STALE badge).

**Business Rules:**

- BR-007: Analysis runs are versioned and immutable. Each run creates a new `analysis_runs` row; previous runs are never modified.
- BR-008: The calculation spine uses the canonical money math: `Profit = Net Proceeds - Acquisition Cost`, `Margin % = (Profit / Acquisition Cost) * 100`. This is non-negotiable per CLAUDE.md.
- BR-009: For Sierra Auction source, buyer premium must use the canonical `SIERRA_FEE_SCHEDULE` from `@dfg/money-math` (tiered schedule with flat fees, percent fees, and caps).
- BR-010: The `max_bid_low` is calculated as `investor_lens.max_bid * 0.9` (90% of AI max bid) and `max_bid_high` is `investor_lens.max_bid` (100%).
- BR-011: AI analysis p95 latency target is < 45 seconds from listing to scored opportunity.

**Out of Scope:**

- Automated re-analysis on bid price changes (future enhancement)
- Batch analysis of multiple opportunities simultaneously

---

### US-004: Advance Opportunity Through Workflow

**Title:** Operator moves an opportunity through the acquisition pipeline

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to transition an opportunity through defined workflow stages (inbox to qualifying to watch/inspect to bid to won/lost) so that I maintain a disciplined evaluation process and the system captures my decisions for future algorithm tuning.

**Acceptance Criteria:**

- [ ] AC-004.1: Given an opportunity in `inbox` status, when the operator taps "Qualify", then the status transitions to `qualifying` and `status_changed_at` is updated.
- [ ] AC-004.2: Given the state machine, when a transition is attempted that violates the defined rules, then the API returns `INVALID_TRANSITION` error (400) and the opportunity remains unchanged.
- [ ] AC-004.3: Given an opportunity transitions to `bid`, when `max_bid_locked` is not provided or is <= 0, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-004.4: Given an opportunity transitions to `won`, when `final_price` is not provided or is <= 0, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-004.5: Given any status transition, then an `operator_actions` record with `action_type='status_change'` is created with `from_status`, `to_status`, and `payload`.
- [ ] AC-004.6: Given a transition to `bid`, then an MVC event of type `decision_made` with `decision='BID'` must be emitted BEFORE the status change. If event emission fails, the transition is blocked.
- [ ] AC-004.7: Given a transition to `rejected`, then an MVC event of type `decision_made` with `decision='PASS'` must be emitted BEFORE the status change. If event emission fails, the transition is blocked.

**Business Rules:**

- BR-012: The state machine defines the following valid transitions (from `STATE_TRANSITIONS` in `@dfg/types`):
  - `inbox` -> `qualifying`, `watch`, `rejected`, `archived`
  - `qualifying` -> `watch`, `inspect`, `rejected`, `archived`
  - `watch` -> `qualifying`, `inspect`, `rejected`, `archived`
  - `inspect` -> `bid`, `rejected`, `archived`
  - `bid` -> `won`, `lost`, `rejected`, `archived`
  - `won` -> `archived`
  - `lost` -> `archived`
  - `rejected` -> `archived`
  - `archived` -> (terminal, no transitions out)
- BR-013: Every status change creates both an `operator_actions` record AND an MVC event for auditable, immutable history.
- BR-014: The `watch` -> `qualifying` transition exists (backward movement is allowed from watch for re-evaluation).

**Out of Scope:**

- Automated bidding (system always recommends, operator decides per Product Principle #5)
- Undo/revert of status transitions
- Bulk status advancement (only batch reject and batch archive are supported)

---

### US-005: Set Watch with Alert Trigger

**Title:** Operator places an opportunity on watch with a configurable trigger

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to place an opportunity on watch with a specific trigger condition (ending soon, time window, manual reminder) so that I am alerted at the right moment to make a decision before the auction closes.

**Acceptance Criteria:**

- [ ] AC-005.1: Given the operator transitions to `watch` with `watch_trigger='ending_soon'`, when the opportunity has an `auction_ends_at` value, then `watch_until` is set to `auction_ends_at - hours_before` (default 4 hours).
- [ ] AC-005.2: Given `watch_trigger='ending_soon'`, when the auction has already ended (not in the future), then the API returns error "auction has already ended".
- [ ] AC-005.3: Given `watch_trigger='ending_soon'`, when the auction ends in less than `hours_before` hours, then the API returns error "auction ends in less than N hours; use a shorter window".
- [ ] AC-005.4: Given `watch_trigger='time_window'` or `watch_trigger='manual'`, when `remind_at` is not in the future, then the API returns error "remind_at must be in the future".
- [ ] AC-005.5: Given any watch transition, then `watch_cycle` increments by 1 and `watch_fired_at` is set to NULL.
- [ ] AC-005.6: Given the operator leaves `watch` status (to any other status), then `watch_until`, `watch_trigger`, `watch_threshold`, and `watch_fired_at` are all set to NULL.
- [ ] AC-005.7: Given a watch trigger fires, when the alert is not dismissed, then it appears in the opportunity's alerts array with type `watch_fired` and severity `high`.

**Business Rules:**

- BR-015: Watch triggers are: `ending_soon`, `time_window`, `manual`.
- BR-016: `watch_cycle` is monotonically increasing per opportunity; it never resets. This ensures alert dismissal keys remain unique across multiple watch cycles.
- BR-017: Watch-fired alerts use the key format `watch_fired:{watch_cycle}` for dismissal tracking.

**Out of Scope:**

- Price-based watch triggers (watching for price drops)
- Push notifications when watch fires (ADR-002, Phase 1)

---

### US-006: Reject Opportunity with Structured Reason

**Title:** Operator rejects an opportunity with a categorized reason and optional detail

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to reject an opportunity with a structured reason code (and optional freeform note) so that the system can use my rejection patterns to improve future scoring and recommendations.

**Acceptance Criteria:**

- [ ] AC-006.1: Given the operator initiates rejection, when no `rejection_reason` is provided, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-006.2: Given the operator selects `rejection_reason='other'`, when no `rejection_note` is provided, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-006.3: Given a valid rejection, then a `tuning_events` record with `event_type='rejection'` is created, capturing `reason_code`, `buy_box_score`, and `time_in_pipeline_hours`.
- [ ] AC-006.4: Given the rejection modal, when the operator selects multi-select reason codes (#188 decision taxonomy), then at least one `DecisionReasonCode` must be selected before the "Confirm Rejection" button is enabled.
- [ ] AC-006.5: Given the rejection is confirmed, then an MVC event of type `decision_made` with `decision='PASS'` and `decision_reason` (array of reason codes) is logged.
- [ ] AC-006.6: Given the operator rejects from the `inspect` status, when the opportunity was analyzed with a `BID` recommendation, then the `analyst_verdict` is included in the decision event payload (for disagreement tracking).

**Business Rules:**

- BR-018: Valid rejection reasons (legacy): `too_far`, `too_expensive`, `wrong_category`, `poor_condition`, `missing_info`, `other`.
- BR-019: The decision reason taxonomy (#188) includes 13 codes across 8 categories: `price_too_high`, `price_no_margin`, `condition_major`, `condition_unknown`, `location_too_far`, `location_restricted`, `timing_ending`, `timing_pickup`, `title_issues`, `category_mismatch`, `competition_concern`, `market_soft`, `other`.
- BR-020: Rejection tuning events feed the scoring algorithm. The `buy_box_score` at time of rejection, combined with the reason code, provides a training signal for false-positive reduction.
- BR-021: If the operator's rejection disagrees with an AI `BID` recommendation, this is tracked as a false positive for the success metric "False positive rate <= 30%".

**Out of Scope:**

- Automatic un-rejection or re-evaluation of previously rejected opportunities
- Rejection reason analytics dashboard (Phase 1)

---

### US-007: Batch Operations

**Title:** Operator batch-rejects or batch-archives multiple opportunities

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to reject or archive multiple opportunities at once so that I can efficiently clear low-quality items from my pipeline without reviewing each individually.

**Acceptance Criteria:**

- [ ] AC-007.1: Given the operator selects multiple opportunities for batch reject, when a valid `rejection_reason` is provided, then all selected opportunities transition to `rejected` status with the same reason.
- [ ] AC-007.2: Given a batch request, when more than 50 `opportunity_ids` are provided, then the API returns `BATCH_TOO_LARGE` error (400).
- [ ] AC-007.3: Given a batch request, when an opportunity cannot transition (invalid transition per state machine), then that item is marked `success: false` with error `INVALID_TRANSITION`, and other items in the batch continue processing.
- [ ] AC-007.4: Given a batch request, when an opportunity_id does not exist, then that item is marked `success: false` with error `NOT_FOUND`, and other items continue processing.
- [ ] AC-007.5: Given a batch operation completes, then the response includes `processed` count, `failed` count, and individual `results` array.
- [ ] AC-007.6: Given a batch reject, then a `tuning_events` record is created for EACH rejected opportunity (with `batch: true` in signal_data).

**Business Rules:**

- BR-022: Batch operations support only two actions: `reject` and `archive`.
- BR-023: Maximum batch size is 50 items per request.
- BR-024: Batch operations are NOT atomic -- they process sequentially. Partial success is a valid outcome.
- BR-025: Each item in a batch operation gets its own `operator_actions` audit record with `action_type='batch_reject'` or `action_type='batch_archive'`.

**Out of Scope:**

- Batch status advancement (e.g., batch qualify, batch inspect)
- Batch with heterogeneous rejection reasons per item

---

### US-008: Provide Operator Inputs for Gate Clearance

**Title:** Operator enters verification data (title status, VIN, condition) to clear gates

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to enter verified information about an opportunity's title, VIN, mileage, and lien status so that the gate system can determine bid readiness and the analysis can produce more accurate economics.

**Acceptance Criteria:**

- [ ] AC-008.1: Given the operator submits title inputs via `PATCH /api/opportunities/:id/inputs`, when the inputs are valid, then `operator_inputs_json` is updated with a deep merge of existing and new values.
- [ ] AC-008.2: Given the operator enters `titleStatus='salvage'` with verification level != 'unverified', when the input is saved, then a hard gate failure triggers auto-rejection with status `rejected`, `rejection_reason='other'`, and `rejection_note` describing the hard gate failure.
- [ ] AC-008.3: Given auto-rejection triggers, when the opportunity is already in a terminal state (`won`, `lost`, `rejected`, `archived`), then no status change occurs -- only the inputs are updated.
- [ ] AC-008.4: Given operator inputs are saved, then an `operator_actions` record with `action_type='augmentation'` is created.
- [ ] AC-008.5: Given operator inputs change after an analysis run exists, then `inputsChangedSinceAnalysis` is set to `true` in the response, signaling the operator should re-analyze.
- [ ] AC-008.6: Given the verification needed filter, when an opportunity has `operator_inputs_json IS NULL` or any of `titleStatus`, `titleInHand`, `lienStatus`, or `odometerMiles` has `verificationLevel='unverified'` or is NULL, then the opportunity appears in the "Verification Needed" count.

**Business Rules:**

- BR-026: Hard gate failures that trigger auto-rejection: title status is `salvage` or `missing` (confirmed/verified, not 'unverified').
- BR-027: Operator inputs use a deep merge strategy: submitting `{ title: { vin: { value: "1HGCM..." } } }` does NOT erase previously saved `titleStatus`.
- BR-028: Auto-rejection from hard gate failures creates both an `operator_actions` record (status_change) and a `tuning_events` record with `auto_rejected: true`.
- BR-029: The gated economics system applies a 20% haircut to max bid when gates are NOT cleared (bid readiness = `NOT_BID_READY`), giving the operator a decision: verify and use full max bid, or accept the haircut.

**Out of Scope:**

- Photo-based condition verification (AI-driven, future enhancement)
- VIN lookup service integration

---

### US-009: Track Auction Outcomes

**Title:** Operator records win/loss and final price for completed auctions

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to record whether I won or lost an auction and at what price so that the system can validate its analysis accuracy and track realized margins.

**Acceptance Criteria:**

- [ ] AC-009.1: Given an opportunity in `bid` status, when the operator taps "Won" and enters a final price, then the status transitions to `won` with `final_price` set.
- [ ] AC-009.2: Given an opportunity in `bid` status, when the operator taps "Lost", then the status transitions to `lost` with no additional required fields.
- [ ] AC-009.3: Given a `won` outcome, then `final_price` is stored on the opportunity and can be retrieved via `GET /api/opportunities/:id`.
- [ ] AC-009.4: Given the `outcomes` table schema exists, when outcome tracking UI is built (P1 remaining gap), then `purchase_price`, `repair_cost_parts`, `repair_cost_labor`, `sold_price`, `fees`, `net_profit`, and `days_held` can be recorded.

**Business Rules:**

- BR-030: `final_price` must be positive (> 0) for a `won` transition.
- BR-031: The `outcomes` table exists in schema but has no UI in Phase 0. This is identified as a P1 remaining gap.
- BR-032: Realized margin is calculated as: `(net_profit / acquisition_cost) * 100` where acquisition_cost follows the canonical formula: `Bid + Buyer Premium + Transport + Immediate Repairs`.
- BR-033: The MVP success metric for won deals is >= 2 acquisitions per month from the DFG pipeline, with >= 25% average realized margin.

**Out of Scope:**

- Full P&L entry per deal (Phase 1, per ADR-003)
- Automated outcome tracking via auction platform API
- Profit/loss dashboard visualization

---

### US-010: Monitor Scout Pipeline Health

**Title:** Operator knows when the data pipeline fails or produces stale data

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to know when the scout scraping pipeline has failed or is producing stale data so that I can trust that I am seeing all available opportunities and not missing deals.

**Acceptance Criteria:**

- [ ] AC-010.1: Given the stats endpoint, then `last_scout_run` returns the timestamp of the most recent successful scout run (currently returns null -- identified as TODO).
- [ ] AC-010.2: Given opportunities exist where `auction_ends_at` is in the past and status is still in an active state, then the "ending soon" filters correctly exclude expired auctions (using `datetime(auction_ends_at) > datetime('now')`).
- [ ] AC-010.3: Given the Scout pipeline runs on a 15-minute cron, when 95% of scheduled runs complete successfully (per MVP success metric), then the operator can trust data freshness.

**Business Rules:**

- BR-034: Scout uptime target is >= 95% of scheduled runs completing successfully.
- BR-035: Scout failure alerting is identified as a P1 remaining gap -- the operator currently discovers stale data by observation, not by proactive alerting.
- BR-036: IronPlanet capture rate is currently ~17% (vs Sierra at higher rates). This is a known P1 gap that affects deal flow completeness.

**Out of Scope:**

- Scout failure push notifications (P1 gap)
- Real-time pipeline monitoring dashboard
- Automatic retry of failed scout runs from the operator console

---

### US-011: Staleness Detection and Re-Analysis

**Title:** Operator is informed when an opportunity's analysis is stale and can refresh it

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want the system to detect when an opportunity's data or analysis is stale (e.g., operator inputs changed, significant time elapsed) so that I can re-analyze before making a decision on potentially outdated information.

**Acceptance Criteria:**

- [ ] AC-011.1: Given an opportunity's `last_operator_review_at` (or `status_changed_at` if null) is more than 3 days ago, and the status is not terminal, then the opportunity is flagged as `is_stale = true`.
- [ ] AC-011.2: Given an opportunity's `last_analyzed_at` is more than 7 days ago (or is NULL), and the status is not terminal, then the opportunity is flagged as `is_analysis_stale = true`.
- [ ] AC-011.3: Given an opportunity in `bid` or `watch` status has `auction_ends_at` within 24 hours and still in the future, then `is_decision_stale = true`.
- [ ] AC-011.4: Given an opportunity has `auction_ends_at` within 48 hours and still in the future, then `is_ending_soon = true`.
- [ ] AC-011.5: Given operator inputs have changed since the last analysis run, when the operator views the detail page, then a staleness banner is displayed with a "Re-Analyze" button.
- [ ] AC-011.6: Given the operator taps "Re-Analyze", when analysis completes, then `isStale` is cleared and `stalenessReasons` is emptied.

**Business Rules:**

- BR-037: Staleness thresholds: 3 days for operator review staleness, 7 days for analysis staleness. These are currently hardcoded as `STALE_THRESHOLD_DAYS = 3` and `ANALYSIS_STALE_DAYS = 7`.
- BR-038: Terminal statuses (`rejected`, `archived`, `won`, `lost`) are excluded from all staleness computations.
- BR-039: The `attention` filter combines stale, decision_stale, ending_soon, and analysis_stale into a single query for dashboard "Attention Required" counts.

**Out of Scope:**

- Auto-re-analysis when inputs change (operator must explicitly trigger)
- Configurable staleness thresholds per category

---

### US-012: Dashboard Attention Summary

**Title:** Operator sees a summary of items requiring attention on the dashboard

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want the dashboard to highlight how many opportunities need my attention -- including stale items, ending-soon auctions, watch alerts, and strike zone items -- so that I can prioritize my review time effectively.

**Acceptance Criteria:**

- [ ] AC-012.1: Given the stats endpoint, then the response includes: `by_status` (all 9 statuses), `strike_zone` count, `verification_needed` count, `ending_soon.within_24h`, `ending_soon.within_48h`, `new_today`, `stale_qualifying.over_24h`, `stale_qualifying.over_48h`, `watch_alerts_fired`, and `needs_attention`.
- [ ] AC-012.2: Given strike zone criteria, then an opportunity qualifies when: status is `inbox` or `qualifying`, score >= 70, analysis exists (`last_analyzed_at IS NOT NULL`), and either auction ends within 48 hours or was created within last 12 hours.
- [ ] AC-012.3: Given needs_attention count, then it equals `watch_alerts_fired + stale_qualifying.over_24h`.
- [ ] AC-012.4: Given the dashboard on iOS Safari, then all counts are visible without horizontal scrolling and tap targets for drill-down are >= 44x44px.

**Business Rules:**

- BR-040: Strike zone is the primary triage mechanism. These are the highest-value items requiring immediate operator attention.
- BR-041: `verification_needed` reflects opportunities with unverified or missing operator inputs across four critical fields: titleStatus, titleInHand, lienStatus, odometerMiles.
- BR-042: The operator response time success metric targets median < 4 hours from inbox to qualifying/rejected.

**Out of Scope:**

- Historical trend charts for dashboard metrics
- Customizable dashboard layout

---

## Acceptance Criteria Summary

All acceptance criteria above are designed to be binary pass/fail. Each criterion references a specific API behavior, data condition, or UI state that can be verified through automated testing or manual inspection. No criterion requires subjective judgment.

---

## Business Rules

### Financial Rules (Non-Negotiable)

| ID     | Rule                                                                                                                               | Source                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| BR-008 | Profit = Net Proceeds - Acquisition Cost. Margin % = (Profit / Acquisition Cost) \* 100.                                           | CLAUDE.md, canonical money math     |
| BR-009 | Sierra Auction buyer premium uses `SIERRA_FEE_SCHEDULE` from `@dfg/money-math` (tiered: flat fees, percent fees, caps).            | `calculation-spine.ts` line 106-108 |
| BR-010 | `max_bid_low` = AI max bid _ 0.9; `max_bid_high` = AI max bid _ 1.0.                                                               | `opportunities.ts` line 1558-1561   |
| BR-029 | Gated economics: 20% haircut on max bid when gates NOT cleared (`NOT_BID_READY`).                                                  | `calculation-spine.ts` line 279     |
| BR-030 | `final_price` must be positive (> 0) for `won` transitions.                                                                        | `opportunities.ts` line 810-813     |
| BR-032 | Realized margin = (net_profit / acquisition_cost) \* 100. Listing fees are SELLING COSTS ONLY, never included in acquisition cost. | CLAUDE.md                           |

### Category Rules

| ID     | Rule                                                                                                                                     | Source                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| BR-043 | Trailers (default): min_profit=$600, min_margin=40%, max_acquisition=$6,000, target_days_to_sell=14, max_distance=100mi.                 | `category-config.ts`                      |
| BR-044 | Fleet Trucks: min_profit=$1,500, min_margin=20%, max_acquisition=$15,000, target_days_to_sell=21, max_distance=150mi.                    | `category-config.ts`                      |
| BR-045 | Power Tools: min_profit=$40, min_margin=30%, max_acquisition=$500, target_days_to_sell=7, max_distance=50mi.                             | `category-config.ts`                      |
| BR-046 | Category detection falls through: explicit category_id match > vehicle keyword match > vehicle make/model title match > default trailer. | `category-config.ts` detectCategoryType() |

### Workflow Rules

| ID     | Rule                                                                                                            | Source                                    |
| ------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| BR-012 | State machine transitions are enforced server-side. Invalid transitions return 400.                             | `@dfg/types` STATE_TRANSITIONS            |
| BR-013 | Every status change creates an `operator_actions` record AND an MVC event.                                      | `opportunities.ts`                        |
| BR-022 | Batch operations: reject and archive only, max 50 items, sequential (not atomic).                               | `opportunities.ts` batchOperation()       |
| BR-026 | Hard gate auto-rejection: title `salvage` or `missing` (verified).                                              | `opportunities.ts` updateOperatorInputs() |
| BR-047 | Optimistic locking on analysis runs: `updated_at` mismatch returns 409 Conflict and cleans up orphaned records. | `opportunities.ts` line 1611-1665         |

### Scoring and Analysis Rules

| ID     | Rule                                                                                                                                                                                                                                | Source                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| BR-003 | Score bands: high >= 70, medium 40-69, low < 40.                                                                                                                                                                                    | `opportunities.ts` line 209-217                      |
| BR-048 | AI verdict mapping: STRONG_BUY/BUY -> BID (if gates clear) or WATCH (if not); MARGINAL -> WATCH; PASS -> PASS.                                                                                                                      | `opportunities.ts` line 1529-1546                    |
| BR-049 | Gate-based fallback: if AI unavailable, allCriticalCleared -> BID, criticalOpen <= 2 -> WATCH, else NEEDS_INFO.                                                                                                                     | `opportunities.ts` line 1540-1546                    |
| BR-050 | Bid readiness: `DO_NOT_BID` for PASS economics, confirmed deal breakers, or salvage/missing title. `NOT_BID_READY` for missing auction end time or unverified title/mileage. `BID_READY` when economics work and all gates cleared. | `calculation-spine.ts` evaluateBidReadiness()        |
| BR-051 | Confidence breakdown has 4 dimensions: price, title, condition, timing. Each scored independently. Overall score 0-5.                                                                                                               | `calculation-spine.ts` evaluateConfidenceBreakdown() |

### Alert Rules

| ID     | Rule                                                                                                                              | Source                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| BR-052 | Auction ending alerts: < 4 hours = critical, < 24 hours = high, < 48 hours = medium.                                              | `alerts.ts` line 49-101  |
| BR-053 | Stale qualifying alert fires after 24 hours in qualifying status. Severity upgrades to high after 48 hours.                       | `alerts.ts` line 106-124 |
| BR-054 | Bid threshold alert fires when current_bid >= 90% of max_bid_locked.                                                              | `alerts.ts` line 127-148 |
| BR-055 | Alert dismissals are per-key, stored in `operator_actions`. Dismissing an alert does not prevent future alerts of different keys. | `alerts.ts`              |

### Data Integrity Rules

| ID     | Rule                                                                                           | Source               |
| ------ | ---------------------------------------------------------------------------------------------- | -------------------- |
| BR-056 | All SQL queries must use `.bind()` parameterization. No template literal interpolation in SQL. | CLAUDE.md            |
| BR-057 | R2 snapshots are immutable. New data creates a new key; existing keys are never overwritten.   | CLAUDE.md            |
| BR-058 | MVC events are immutable. Once emitted, events cannot be modified or deleted.                  | Product Principle #6 |

---

## Edge Cases

### EC-001: Auction Ends During Operator Review

**Scenario:** The operator opens an opportunity detail page while the auction is still active, but the auction ends while they are reviewing it.

**Expected Behavior:** The system does not prevent status transitions on expired auctions. The operator can still reject, archive, or mark as won/lost. The "ending soon" alert severity should have already escalated. The `is_ending_soon` and `is_decision_stale` flags compute correctly based on current time, so refreshing the page will clear these flags once the auction is past.

**Risk:** Low. The operator makes the final decision.

### EC-002: Concurrent Analysis Requests

**Scenario:** The operator taps "Analyze" twice rapidly, or two browser tabs trigger analysis on the same opportunity.

**Expected Behavior:** The optimistic lock (`updated_at` check) in `analyzeOpportunity()` ensures only one analysis wins. The second request receives 409 Conflict. The orphaned `analysis_runs` record from the loser is deleted.

**Risk:** Medium. If cleanup fails, orphaned records accumulate but do not affect functionality.

### EC-003: Analysis Timeout with No Fallback Data

**Scenario:** The analyst worker times out (25-second limit) and the opportunity has never been analyzed before (no previous analysis run, no existing max_bid values).

**Expected Behavior:** Analysis completes with `aiAnalysisResult = null`. Gate-based fallback recommendation is used. `max_bid_low` and `max_bid_high` remain at their existing values (which may be null if never analyzed). The UI should display the opportunity without max bid values and show the gate-based recommendation.

**Risk:** Medium. Operator has less information for decision-making. Recommendation: ensure the Next Action Card degrades gracefully when AI analysis is unavailable.

### EC-004: Batch Reject with Mixed Invalid States

**Scenario:** A batch of 10 opportunity IDs includes: 3 in inbox, 2 in qualifying, 1 already rejected, 1 already archived, 1 not found, 2 in won status.

**Expected Behavior:** The 5 valid transitions (inbox and qualifying -> rejected) succeed. The already-rejected one fails (rejected -> rejected is not a valid transition -- only rejected -> archived). The already-archived one fails (archived is terminal). The won ones fail (won -> rejected is not valid). The not-found one fails. Response: processed=5, failed=5, with individual results.

**Risk:** Low. Partial success is by design (BR-024).

### EC-005: Operator Inputs Cause Auto-Rejection of a Won Deal

**Scenario:** The operator enters `titleStatus='salvage'` on an opportunity that has already been won.

**Expected Behavior:** Auto-rejection does NOT trigger because the opportunity is in a terminal state (`won`). The inputs are saved normally. This is correct behavior per the code check `!terminalStatuses.includes(current.status)`.

**Risk:** Low. Edge case is handled.

### EC-006: Watch Trigger on Opportunity with No Auction End Time

**Scenario:** The operator tries to set `watch_trigger='ending_soon'` on an opportunity where `auction_ends_at` is null.

**Expected Behavior:** The API returns error "ending_soon requires auction end time". The transition to watch is blocked.

**Risk:** Low. Validation is in place.

### EC-007: Score Band Boundary (Exactly 70)

**Scenario:** An opportunity has `buy_box_score = 70`.

**Expected Behavior:** It falls into the `high` score band (>= 70) and qualifies for Strike Zone if other criteria are met.

**Risk:** Low. Boundary is inclusive (>=).

### EC-008: Empty Batch Request

**Scenario:** A batch request is submitted with `opportunity_ids: []`.

**Expected Behavior:** The API returns `INVALID_VALUE` error with message "opportunity_ids required".

**Risk:** Low. Validation exists.

### EC-009: Rejection with 'other' Reason Code and No Note

**Scenario:** The operator selects the `other` decision reason code but leaves the note field empty.

**Expected Behavior:** The "Confirm Rejection" button is disabled (frontend validation: `selectedReasonCodes.includes('other') && !rejectionNote.trim()`). The backend also validates: `rejection_reason === 'other' && !data.rejection_note` returns 400.

**Risk:** Low. Dual validation (client + server).

### EC-010: IronPlanet Adapter Failure During Scout Run

**Scenario:** The IronPlanet adapter fails completely during a scout run, but Sierra succeeds.

**Expected Behavior:** The scout run partially succeeds. Sierra listings are ingested normally. IronPlanet listings are missed. Currently there is no proactive alerting for this (P1 gap per BR-035). The operator would notice reduced deal flow from IronPlanet by observing fewer opportunities from that source.

**Risk:** High. This is an active issue (IronPlanet capture rate is ~17%, per PM contribution). Identified as P1 remaining gap.

### EC-011: Photo Array Format Inconsistency

**Scenario:** The `photos` field on an opportunity is stored as a JSON string in D1 but the frontend expects an array.

**Expected Behavior:** The frontend handles this with a defensive parse: if `photos` is a string, it attempts `JSON.parse()`; if that fails, it falls back to an empty array. The backend always calls `parseJsonSafe(row.photos) || []`.

**Risk:** Low. Both client and server handle the inconsistency.

### EC-012: Analysis Run with Zero Bid Amount

**Scenario:** An opportunity has `current_bid = 0` or null when analysis is triggered.

**Expected Behavior:** The `total_all_in` calculation sets to `0 * 1.15 = 0` (or handles null). In `buildCalculationSpine`, if `bidAmount = 0`, `buyerPremium = 0`, margins are `0`, and `totalAllIn = transport + repairs + otherFees`. The AI analysis may still produce a max bid recommendation based on estimated value.

**Risk:** Medium. Zero bid is valid for auctions that haven't started. The calculation spine handles it, but the UI should clarify that numbers are based on a $0 starting bid.

---

## Open Questions

| ID     | Question                                                                                                                                                                                                                                                                    | Impact                                                           | Suggested Resolution                                                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-001 | Should the `applyVerdictThresholds` function use OR logic (current) or AND logic for buy/watch thresholds? Currently, meeting EITHER min_profit OR min_margin triggers BUY. This means a deal with $600 profit but only 5% margin would be recommended as BUY for trailers. | High -- affects recommendation accuracy                          | Recommend AND logic for BUY threshold (must meet BOTH profit AND margin), OR logic for WATCH (meet either). Flag for PM decision.                                                                                                                        |
| OQ-002 | The `tuning_events` table CHECK constraint allows: `rejection`, `win`, `loss`, `score_override`, `time_in_stage`. But code inserts `event_type = 'status_change'` for auto-rejections. Will this insert fail in production?                                                 | High -- data loss on auto-rejection events                       | Verify D1 behavior with CHECK constraints. If strict, add `status_change` to allowed values via migration.                                                                                                                                               |
| OQ-003 | The stats endpoint `last_scout_run` and `last_ingest` are both `null` (TODO). Without these, the operator cannot verify pipeline health from the dashboard. What is the timeline for implementation?                                                                        | Medium -- relates to Scout failure alerting (P1 gap)             | Implement as part of P1 scout failure alerting work.                                                                                                                                                                                                     |
| OQ-004 | The `outcomes` table exists in schema but has no API endpoints or UI. ADR-003 recommends simple win/loss with final price for MVP. Is this sufficient to validate the success metric "Realized margin >= 25%"?                                                              | High -- cannot validate core success metric without outcome data | `final_price` on won deals is necessary but not sufficient. Need at minimum `sold_price` to calculate profit. Recommend adding a simple outcome entry for won deals in MVP.                                                                              |
| OQ-005 | What happens when the operator's location changes? The `max_distance_miles` category config and `distance_miles` on opportunities are static. Does re-analysis update distance?                                                                                             | Low for MVP (single operator, fixed location)                    | Defer to Phase 1 when per-user location preferences are implemented.                                                                                                                                                                                     |
| OQ-006 | The `attention` filter includes analysis_stale items (last_analyzed_at > 7 days ago). Should items that have NEVER been analyzed (`last_analyzed_at IS NULL`) also appear in the attention count? Currently `analysisStale` filter includes them, but `attention` does not. | Medium -- missed items in attention view                         | The `analysisStale` filter correctly includes NULL with `(last_analyzed_at IS NULL OR ...)` but the `attention` filter only checks `last_analyzed_at IS NOT NULL AND ...`. Recommend aligning the attention filter to also include never-analyzed items. |
| OQ-007 | The bid entry UI uses `prompt()` (browser native dialog) for entering max bid amount and final price. This is functional but does not validate input format. What if the operator enters "$1,500" or "1500.50"?                                                             | Medium -- data integrity risk                                    | Replace `prompt()` with a proper form modal that validates numeric input, strips currency formatting, and enforces positive values before submission.                                                                                                    |

---

## Traceability Matrix

### User Stories to Features

| User Story | Feature                             | API Endpoint(s)                                                        | DB Tables                                                  | UI Component(s)                                          |
| ---------- | ----------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| US-001     | Inbox review, filtering, pagination | GET /api/opportunities, GET /api/opportunities/stats                   | opportunities                                              | Opportunities list page, Dashboard                       |
| US-002     | Opportunity detail view             | GET /api/opportunities/:id                                             | opportunities, analysis_runs, operator_actions, sources    | Opportunity detail page                                  |
| US-003     | AI analysis on demand               | POST /api/opportunities/:id/analyze                                    | analysis_runs, opportunities                               | Analyze button, TabbedAnalysis, NextActionCard           |
| US-004     | Workflow state machine              | PATCH /api/opportunities/:id, POST /api/opportunities/:id/actions      | opportunities, operator_actions, mvc_events                | Status action buttons (Qualify, Inspect, Bid, Won, Lost) |
| US-005     | Watch system                        | PATCH /api/opportunities/:id (to watch)                                | opportunities, operator_actions                            | Watch modal                                              |
| US-006     | Structured rejection                | PATCH /api/opportunities/:id (to rejected)                             | opportunities, operator_actions, tuning_events, mvc_events | Reject modal, ReasonCodeSelect                           |
| US-007     | Batch operations                    | POST /api/opportunities/batch                                          | opportunities, operator_actions, tuning_events             | Batch action UI                                          |
| US-008     | Operator inputs / gate clearance    | PATCH /api/opportunities/:id/inputs                                    | opportunities, operator_actions                            | TitleInputs, GatesDisplay, KillSwitchBanner              |
| US-009     | Outcome tracking                    | PATCH /api/opportunities/:id (to won/lost)                             | opportunities, outcomes (future)                           | Won/Lost buttons                                         |
| US-010     | Pipeline health monitoring          | GET /api/opportunities/stats                                           | sources, scout_runs                                        | Dashboard stats                                          |
| US-011     | Staleness detection                 | GET /api/opportunities (staleness filters), GET /api/opportunities/:id | opportunities, analysis_runs                               | StalenessBanner                                          |
| US-012     | Dashboard attention summary         | GET /api/opportunities/stats                                           | opportunities                                              | Dashboard attention counts                               |

### User Stories to Success Metrics

| User Story     | Success Metric                         | Target                                        | Measurement                                                |
| -------------- | -------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| US-001         | Opportunities surfaced per day         | >= 15 qualified                               | Count of non-rejected/archived opportunities created today |
| US-003, US-006 | Analysis accuracy (operator agreement) | >= 70% BID recs result in operator bid/watch  | MVC events: decision_made where analyst_verdict=BID        |
| US-003, US-006 | False positive rate                    | <= 30% of score > 80 get rejected             | Rejection rate of high-score opportunities                 |
| US-004, US-012 | Operator response time                 | Median < 4 hours inbox to qualifying/rejected | status_changed_at delta                                    |
| US-010         | Scout uptime                           | >= 95% runs succeed                           | scout_runs success rate                                    |
| US-003         | Analysis latency                       | p95 < 45 seconds                              | listing.created_at to opportunity.last_analyzed_at         |
| US-009         | Won deals per month                    | >= 2 acquisitions                             | Opportunities with status=won                              |
| US-009         | Realized margin                        | >= 25% average                                | outcomes table net_profit / acquisition_cost               |

### User Stories to Business Rules

| User Story | Business Rules                                                 |
| ---------- | -------------------------------------------------------------- |
| US-001     | BR-001, BR-002, BR-003                                         |
| US-002     | BR-004, BR-005, BR-006                                         |
| US-003     | BR-007, BR-008, BR-009, BR-010, BR-011, BR-047, BR-048, BR-049 |
| US-004     | BR-012, BR-013, BR-014                                         |
| US-005     | BR-015, BR-016, BR-017                                         |
| US-006     | BR-018, BR-019, BR-020, BR-021                                 |
| US-007     | BR-022, BR-023, BR-024, BR-025                                 |
| US-008     | BR-026, BR-027, BR-028, BR-029                                 |
| US-009     | BR-030, BR-031, BR-032, BR-033                                 |
| US-010     | BR-034, BR-035, BR-036                                         |
| US-011     | BR-037, BR-038, BR-039                                         |
| US-012     | BR-040, BR-041, BR-042                                         |

### User Stories to Kill Criteria

| Kill Criterion                                              | Related User Stories | Detection Method                                                                                            |
| ----------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Zero profitable acquisitions in 90 days                     | US-009               | Query: `SELECT COUNT(*) FROM opportunities WHERE status='won' AND created_at > datetime('now', '-90 days')` |
| Sustained negative margins < 10%                            | US-009               | Requires outcomes data (P1 gap)                                                                             |
| Operator stops using the tool (< 3 logins/week for 4 weeks) | US-001, US-004       | Auth session tracking (currently hardcoded auth -- no tracking)                                             |
| Scout data staleness > 50% expired on first view            | US-010               | Compare `auction_ends_at` to `status_changed_at` for first transition out of inbox                          |
| Analysis disagreement > 60% over 60 days                    | US-003, US-006       | MVC events: `decision_made` where analyst_verdict=BID but operator decision=PASS                            |

---

## Appendix: MVP Phase 0 Gaps Identified

The following gaps were identified through codebase analysis. They represent areas where the system is functional but incomplete relative to full MVP expectations:

| Gap                                                                    | Priority      | User Story                | Impact                                         |
| ---------------------------------------------------------------------- | ------------- | ------------------------- | ---------------------------------------------- |
| Outcome tracking has no UI                                             | P1            | US-009                    | Cannot validate realized margin success metric |
| `last_scout_run` returns null on stats                                 | P1            | US-010                    | Cannot monitor pipeline health from dashboard  |
| IronPlanet capture rate ~17%                                           | P1            | US-010                    | Missing ~83% of IronPlanet listings            |
| Scout failure alerting absent                                          | P1            | US-010                    | Operator discovers stale data by observation   |
| Bid entry uses browser `prompt()`                                      | P2            | US-004                    | No input validation, poor mobile UX            |
| `tuning_events` CHECK constraint may reject `status_change` event_type | P0            | US-008                    | Auto-rejection events may silently fail        |
| No frontend tests                                                      | P2            | All UI stories            | UI regressions undetected                      |
| Auth is hardcoded                                                      | P0 (security) | N/A (pre-Phase 1 blocker) | No session tracking for kill criteria          |

# Business Analyst Contribution -- PRD Review Round 2

**Author:** Business Analyst
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Revised after cross-role review
**Ground Truth:** Codebase at `dfg-console` repo (commit `a4979fe`), CLAUDE.md, all Round 1 contributions

---

## Changes from Round 1

1. **Added US-013 (Simplified Reject Flow) and revised US-006.** The Target Customer explicitly stated the reject modal is too heavy ("One tap, one reason code, done. Stop making me fill out forms."). The dual reject mechanism (legacy single-select dropdown + multi-select reason codes from #188 taxonomy) creates confusion. Added a new story for streamlined mobile rejection and revised US-006 acceptance criteria to clarify which path is primary. *(Triggered by: Target Customer, UX Lead Concern #2)*

2. **Revised US-004 to address "inbox direct to bid" workflow gap.** The Target Customer reported: "I have to go inbox -> qualifying -> inspect before I can set a bid. That's three status changes for something I already know I want." The state machine does not allow inbox -> bid. Added OQ-008 to formalize this as a decision item. The state machine as coded in `@dfg/types` is authoritative; changing it requires a PM decision and migration. *(Triggered by: Target Customer)*

3. **Promoted OQ-002 (tuning_events CHECK constraint) to a confirmed bug (EC-013).** Verified in codebase: migration 0001 line 158-160 defines CHECK constraint allowing only `'rejection', 'win', 'loss', 'score_override', 'time_in_stage'`, but `opportunities.ts` line 1278 inserts `event_type: 'status_change'` for auto-rejection tuning events. D1 (SQLite) enforces CHECK constraints, so this INSERT will fail silently or throw. This is a P0 data integrity issue. *(Triggered by: Technical Lead schema review, self-identified in Round 1)*

4. **Added BR-059 through BR-063 for batch operation clarifications.** Target Customer confirmed batch reject with a single reason code applied to all items is the expected behavior. Codebase review confirms this is already how it works (line 873: `rejection_reason` is a top-level field, not per-item). Documented explicitly to resolve ambiguity. Also added rules for the Attention Required quick-pass action, which the UX Lead identified as using a default "other" reason with no confirmation. *(Triggered by: Target Customer, UX Lead Concern #2)*

5. **Revised US-002 to cross-reference UX Lead's default tab concern.** The UX Lead noted the analysis defaults to the "Report" tab, but the most actionable data is on "Summary" and "Investor" tabs. Added AC-002.6 addressing tab default behavior and linked to OQ-009. *(Triggered by: UX Lead Concern #4)*

6. **Added EC-013 and EC-014 for newly identified edge cases.** EC-013 covers the tuning_events CHECK constraint failure (promoted from OQ-002). EC-014 covers the Attention Required quick-pass action creating rejections with default "other" reason and no note, which passes backend validation only because the batch/quick path does not enforce the `rejection_note` requirement for "other" -- or it fails silently. *(Triggered by: UX Lead Concern #2, codebase verification)*

7. **Revised OQ-001 with codebase-confirmed OR logic in `applyVerdictThresholds`.** Verified at `category-config.ts` line 258: `if (profit >= thresholds.buy.min_profit || margin >= thresholds.buy.min_margin)`. This means a trailer deal with $600 profit but 5% margin receives a BUY verdict. Escalated severity from "High" to "Critical" given Product Principle #1 (Numbers must be right) and Target Customer statement: "If the profit calculation was wrong -- I'm done." *(Triggered by: self-identified Round 1, confirmed via codebase)*

8. **Added BR-064 for photo lightbox swipe gesture gap.** Target Customer explicitly requested swipe-between-photos behavior. Current implementation requires tap-to-dismiss, tap-next-thumbnail. Documented as a P2 UX gap, not a business rule violation. *(Triggered by: Target Customer)*

9. **Revised US-010 to incorporate Target Customer's P0 assessment of scout alerting.** The Target Customer rated scout failure alerting as "the #1 gap" and stated it should be P0, not P1 as originally classified. Both PM and Target Customer agree this is critical for trust. Revised priority in gaps table. *(Triggered by: Target Customer, PM risk assessment)*

10. **Added cross-references to Technical Lead's non-functional requirements throughout acceptance criteria.** Performance budgets (API < 200ms p95, analysis < 30s p95, LCP < 2.5s) are now referenced in relevant user stories as testable thresholds. *(Triggered by: Technical Lead)*

11. **Revised traceability matrix to include UX screens and Technical Lead API endpoints.** Round 1 matrix was correct but sparse on UI component mapping. Now includes specific screen references from UX Lead's information architecture. *(Triggered by: UX Lead)*

12. **Added OQ-010 for the `prompt()` financial input concern.** Both UX Lead and Target Customer flagged this. For a system where Product Principle #1 is "Numbers must be right," entering bid amounts via `window.prompt()` is a design risk. Formalized as an open question with severity. *(Triggered by: UX Lead Concern #1, Target Customer)*

---

## MVP User Stories

### US-001: Review New Opportunities

**Title:** Operator reviews newly ingested auction opportunities

**Persona:** Scott (Solo Operator, Founder)

**Narrative:** As an operator, I want to see all newly surfaced auction opportunities in a prioritized inbox so that I can quickly identify which items deserve further evaluation before their auctions close.

**Acceptance Criteria:**

- [ ] AC-001.1: Given the operator opens the dashboard, when new opportunities have been ingested in the last 24 hours, then opportunities with status `inbox` are displayed sorted by `auction_ends_at ASC` (soonest-ending first, NULLs last).
- [ ] AC-001.2: Given an opportunity is in `inbox` status, when it has a `buy_box_score >= 70` and `last_analyzed_at IS NOT NULL` and auction ends within 48 hours or was created within last 12 hours, then it appears in the Strike Zone count on the stats endpoint.
- [ ] AC-001.3: Given the opportunity list is loaded, when the operator views it on iOS Safari, then each opportunity card displays: title, current bid (formatted as USD), auction end time (relative), distance in miles, buy_box_score, and a primary image thumbnail. All interactive elements meet 44x44px minimum touch targets. *(Ref: UX Lead, CLAUDE.md iOS patterns)*
- [ ] AC-001.4: Given the operator applies a status filter, when `status=inbox` is selected, then only inbox opportunities are returned and the total count reflects the filtered set.
- [ ] AC-001.5: Given the opportunity list, when the total exceeds 50 items, then pagination via `limit` and `offset` query parameters returns correct subsets and the `total` count remains accurate.
- [ ] AC-001.6: Given the API response, then the list endpoint responds in < 200ms at p95. *(Ref: Technical Lead NFR)*

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
- [ ] AC-002.6: Given the tabbed analysis interface, when the operator views it, then the most actionable information (verdict, max bid, margin) is immediately visible without requiring tab navigation. *(Ref: UX Lead Concern #4, see OQ-009)*
- [ ] AC-002.7: Given the detail page, then the API response completes in < 300ms at p95. *(Ref: Technical Lead NFR)*

**Business Rules:**

- BR-004: The `source_defaults` object must return `buyer_premium_pct` and `pickup_days` from the `sources` table for the opportunity's source.
- BR-005: If `source_url` is null, the "View Listing" link must not be rendered; a "No link" label is shown instead.
- BR-006: Alert dismissals are stored in `operator_actions` with `action_type='alert_dismiss'` and are keyed per `alert_key` to prevent re-display.

**Out of Scope:**

- Offline caching of opportunity details (Phase 1 PWA)
- Score breakdown visualization by dimension (ADR-005, open)
- Photo swipe gesture between images (P2, see BR-064)

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
- [ ] AC-003.10: Given an analysis is triggered, then the full analysis (including AI call) completes in < 30s at p95. Without AI, it completes in < 500ms at p95. *(Ref: Technical Lead NFR)*

**Business Rules:**

- BR-007: Analysis runs are versioned and immutable. Each run creates a new `analysis_runs` row; previous runs are never modified.
- BR-008: The calculation spine uses the canonical money math: `Profit = Net Proceeds - Acquisition Cost`, `Margin % = (Profit / Acquisition Cost) * 100`. This is non-negotiable per CLAUDE.md.
- BR-009: For Sierra Auction source, buyer premium must use the canonical `SIERRA_FEE_SCHEDULE` from `@dfg/money-math` (tiered schedule with flat fees, percent fees, and caps).
- BR-010: `max_bid_low` is calculated as `investor_lens.max_bid * 0.9` (90% of AI max bid) and `max_bid_high` is `investor_lens.max_bid` (100%).
- BR-011: AI analysis p95 latency target is < 45 seconds from listing to scored opportunity.

**Out of Scope:**

- Automated re-analysis on bid price changes (future enhancement)
- Batch analysis of multiple opportunities simultaneously

---

### US-004: Advance Opportunity Through Workflow

**Title:** Operator moves an opportunity through the acquisition pipeline

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to transition an opportunity through defined workflow stages so that I maintain a disciplined evaluation process and the system captures my decisions for future algorithm tuning.

**Acceptance Criteria:**

- [ ] AC-004.1: Given an opportunity in `inbox` status, when the operator taps "Qualify", then the status transitions to `qualifying` and `status_changed_at` is updated.
- [ ] AC-004.2: Given the state machine, when a transition is attempted that violates the defined rules, then the API returns `INVALID_TRANSITION` error (400) and the opportunity remains unchanged.
- [ ] AC-004.3: Given an opportunity transitions to `bid`, when `max_bid_locked` is not provided or is <= 0, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-004.4: Given an opportunity transitions to `won`, when `final_price` is not provided or is <= 0, then the API returns `MISSING_FIELD` error (400).
- [ ] AC-004.5: Given any status transition, then an `operator_actions` record with `action_type='status_change'` is created with `from_status`, `to_status`, and `payload`.
- [ ] AC-004.6: Given a transition to `bid`, then an MVC event of type `decision_made` with `decision='BID'` must be emitted BEFORE the status change. If event emission fails, the transition is blocked.
- [ ] AC-004.7: Given a transition to `rejected`, then an MVC event of type `decision_made` with `decision='PASS'` must be emitted BEFORE the status change. If event emission fails, the transition is blocked.
- [ ] AC-004.8: Given the bottom action bar on the detail page, when the opportunity is in a given status, then only contextually valid actions are shown per the state machine. *(Ref: UX Lead, Interaction Pattern 1)*

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
- BR-059: The state machine does NOT allow `inbox` -> `bid` directly. The minimum path to bid is `inbox` -> `qualifying` -> `inspect` -> `bid` (3 transitions). See OQ-008 for the PM decision on whether to add a fast-track path.

**Out of Scope:**

- Automated bidding (system always recommends, operator decides per Product Principle #5)
- Undo/revert of status transitions
- Bulk status advancement (only batch reject and batch archive are supported)
- Shortcut transitions (inbox -> bid) pending PM decision (OQ-008)

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
- BR-060: Watch triggers are checked via cron every 5 minutes. An alert may fire up to 5 minutes after the trigger condition is met. The default 4-hour `hours_before` threshold provides sufficient buffer for this latency. *(Ref: Technical Lead R8)*

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
- [ ] AC-006.4: Given the rejection modal on mobile, when the operator opens it, then a streamlined single-interaction flow is presented: multi-select reason codes from the decision taxonomy (#188), with the legacy single-select dropdown available but not required as a separate step. *(Revised per Target Customer feedback)*
- [ ] AC-006.5: Given the rejection is confirmed, then an MVC event of type `decision_made` with `decision='PASS'` and `decision_reason` (array of reason codes) is logged.
- [ ] AC-006.6: Given the operator rejects from the `inspect` status, when the opportunity was analyzed with a `BID` recommendation, then the `analyst_verdict` is included in the decision event payload (for disagreement tracking).

**Business Rules:**

- BR-018: Valid rejection reasons (legacy API field): `too_far`, `too_expensive`, `wrong_category`, `poor_condition`, `missing_info`, `other`.
- BR-019: The decision reason taxonomy (#188) includes 13 codes across 8 categories: `price_too_high`, `price_no_margin`, `condition_major`, `condition_unknown`, `location_too_far`, `location_restricted`, `timing_ending`, `timing_pickup`, `title_issues`, `category_mismatch`, `competition_concern`, `market_soft`, `other`.
- BR-020: Rejection tuning events feed the scoring algorithm. The `buy_box_score` at time of rejection, combined with the reason code, provides a training signal for false-positive reduction.
- BR-021: If the operator's rejection disagrees with an AI `BID` recommendation, this is tracked as a false positive for the success metric "False positive rate <= 30%".
- BR-061: The reject modal must be completable in 2 taps on mobile: (1) select a reason code, (2) confirm rejection. The "other" code requiring a note is the only exception. *(Triggered by: Target Customer feedback: "One tap, one reason code, done.")*

**Out of Scope:**

- Automatic un-rejection or re-evaluation of previously rejected opportunities
- Rejection reason analytics dashboard (Phase 1)

---

### US-007: Batch Operations

**Title:** Operator batch-rejects or batch-archives multiple opportunities

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to reject or archive multiple opportunities at once so that I can efficiently clear low-quality items from my pipeline without reviewing each individually.

**Acceptance Criteria:**

- [ ] AC-007.1: Given the operator selects multiple opportunities for batch reject, when a valid `rejection_reason` is provided at the batch level, then all selected opportunities transition to `rejected` status with the same reason applied to each.
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
- BR-062: Batch reject applies a single `rejection_reason` (and optional `rejection_note`) to all items in the batch. Per-item reason codes are not supported. This is confirmed by the API design: `rejection_reason` is a top-level field on the batch request body, not nested per item. *(Confirmed by codebase: `opportunities.ts` line 873)*

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
- [ ] AC-008.7: Given auto-rejection from a hard gate failure, when the system creates a tuning_events record, then the `event_type` must be `'rejection'` (not `'status_change'`). See EC-013 for the current bug. *(Added Round 2)*

**Business Rules:**

- BR-026: Hard gate failures that trigger auto-rejection: title status is `salvage` or `missing` (confirmed/verified, not 'unverified').
- BR-027: Operator inputs use a deep merge strategy: submitting `{ title: { vin: { value: "1HGCM..." } } }` does NOT erase previously saved `titleStatus`.
- BR-028: Auto-rejection from hard gate failures creates both an `operator_actions` record (status_change) and a `tuning_events` record with `auto_rejected: true`.
- BR-029: The gated economics system applies a 20% haircut to max bid when gates are NOT cleared (bid readiness = `NOT_BID_READY`), giving the operator a decision: verify and use full max bid, or accept the haircut.
- BR-063: The Kill Switch Banner for hard gate failures must NOT auto-redirect the operator away from the detail page. The operator must be able to see the reason, understand it, and optionally override if the gate condition is incorrect (e.g., listing erroneously states "salvage" when the title is actually rebuilt). *(Triggered by: Target Customer: "Don't redirect me. Let me see it.")*

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
- [ ] AC-009.5: Given a `won` transition, when the operator is prompted for `final_price`, then the input mechanism must validate for positive numeric values (no currency symbols, no commas, no negative values). See OQ-010 regarding the `prompt()` dialog concern. *(Added Round 2)*

**Business Rules:**

- BR-030: `final_price` must be positive (> 0) for a `won` transition.
- BR-031: The `outcomes` table exists in schema but has no UI in Phase 0. This is identified as a P1 remaining gap.
- BR-032: Realized margin is calculated as: `(net_profit / acquisition_cost) * 100` where acquisition_cost follows the canonical formula: `Bid + Buyer Premium + Transport + Immediate Repairs`.
- BR-033: The MVP success metric for won deals is >= 2 acquisitions per month from the DFG pipeline, with >= 25% average realized margin.

**Out of Scope:**

- Full P&L entry per deal (Phase 1, per ADR-003)
- Automated outcome tracking via auction platform API
- Profit/loss dashboard visualization
- Dashboard total profit display (Target Customer requested; deferred to P1 with outcome tracking UI)

---

### US-010: Monitor Scout Pipeline Health

**Title:** Operator knows when the data pipeline fails or produces stale data

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to know when the scout scraping pipeline has failed or is producing stale data so that I can trust that I am seeing all available opportunities and not missing deals.

**Acceptance Criteria:**

- [ ] AC-010.1: Given the stats endpoint, then `last_scout_run` returns the timestamp of the most recent successful scout run (currently returns null -- identified as TODO, P0 gap per revised priority).
- [ ] AC-010.2: Given opportunities exist where `auction_ends_at` is in the past and status is still in an active state, then the "ending soon" filters correctly exclude expired auctions (using `datetime(auction_ends_at) > datetime('now')`).
- [ ] AC-010.3: Given the Scout pipeline runs on a 15-minute cron, when 95% of scheduled runs complete successfully (per MVP success metric), then the operator can trust data freshness.

**Business Rules:**

- BR-034: Scout uptime target is >= 95% of scheduled runs completing successfully.
- BR-035: Scout failure alerting is identified as a P0 gap (revised from P1 per Target Customer feedback). The operator currently discovers stale data by observation, not by proactive alerting. The Target Customer stated: "If the scout goes down Friday night, I don't find out until Monday when I notice the inbox is suspiciously empty." *(Priority revised in Round 2)*
- BR-036: IronPlanet capture rate is currently ~17% (vs Sierra at higher rates). This is a known P1 gap that affects deal flow completeness. The Target Customer stated this is unacceptable and may undermine trust in the system. *(Ref: Target Customer: "That's worse than not having the tool at all.")*

**Out of Scope:**

- Real-time pipeline monitoring dashboard
- Automatic retry of failed scout runs from the operator console
- Scout failure push notifications (still requires ADR-002 notification channel decision, but the alerting mechanism itself is P0)

---

### US-011: Staleness Detection and Re-Analysis

**Title:** Operator is informed when an opportunity's analysis is stale and can refresh it

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want the system to detect when an opportunity's data or analysis is stale so that I can re-analyze before making a decision on potentially outdated information.

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
- [ ] AC-012.5: Given the Attention Required list, when the operator taps the inline "Pass" action on an item, then the action is completed with a single tap (no confirmation modal for inline quick actions). The rejection uses `rejection_reason='other'` as default. *(Added Round 2 per UX Lead observation)*

**Business Rules:**

- BR-040: Strike zone is the primary triage mechanism. These are the highest-value items requiring immediate operator attention.
- BR-041: `verification_needed` reflects opportunities with unverified or missing operator inputs across four critical fields: titleStatus, titleInHand, lienStatus, odometerMiles. Dashboard label should communicate this clearly (see OQ-011). *(Ref: Target Customer: "'Verification Needed' doesn't tell me anything.")*
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

| ID | Rule | Source |
|----|------|--------|
| BR-008 | Profit = Net Proceeds - Acquisition Cost. Margin % = (Profit / Acquisition Cost) * 100. | CLAUDE.md, canonical money math |
| BR-009 | Sierra Auction buyer premium uses `SIERRA_FEE_SCHEDULE` from `@dfg/money-math` (tiered: flat fees, percent fees, caps). | `calculation-spine.ts` line 106-108 |
| BR-010 | `max_bid_low` = AI max bid * 0.9; `max_bid_high` = AI max bid * 1.0. | `opportunities.ts` line 1558-1561 |
| BR-029 | Gated economics: 20% haircut on max bid when gates NOT cleared (`NOT_BID_READY`). | `calculation-spine.ts` line 279 |
| BR-030 | `final_price` must be positive (> 0) for `won` transitions. | `opportunities.ts` line 810-813 |
| BR-032 | Realized margin = (net_profit / acquisition_cost) * 100. Listing fees are SELLING COSTS ONLY, never included in acquisition cost. | CLAUDE.md |

### Category Rules

| ID | Rule | Source |
|----|------|--------|
| BR-043 | Trailers (default): min_profit=$600, min_margin=40%, max_acquisition=$6,000, target_days_to_sell=14, max_distance=100mi. | `category-config.ts` |
| BR-044 | Fleet Trucks: min_profit=$1,500, min_margin=20%, max_acquisition=$15,000, target_days_to_sell=21, max_distance=150mi. | `category-config.ts` |
| BR-045 | Power Tools: min_profit=$40, min_margin=30%, max_acquisition=$500, target_days_to_sell=7, max_distance=50mi. | `category-config.ts` |
| BR-046 | Category detection falls through: explicit category_id match > vehicle keyword match > vehicle make/model title match > default trailer. | `category-config.ts` detectCategoryType() |

### Workflow Rules

| ID | Rule | Source |
|----|------|--------|
| BR-012 | State machine transitions are enforced server-side. Invalid transitions return 400. | `@dfg/types` STATE_TRANSITIONS |
| BR-013 | Every status change creates an `operator_actions` record AND an MVC event. | `opportunities.ts` |
| BR-014 | `watch` -> `qualifying` backward transition is allowed. | `@dfg/types` STATE_TRANSITIONS |
| BR-022 | Batch operations: reject and archive only, max 50 items, sequential (not atomic). | `opportunities.ts` batchOperation() |
| BR-026 | Hard gate auto-rejection: title `salvage` or `missing` (verified). | `opportunities.ts` updateOperatorInputs() |
| BR-047 | Optimistic locking on analysis runs: `updated_at` mismatch returns 409 Conflict and cleans up orphaned records. | `opportunities.ts` line 1611-1665 |
| BR-059 | State machine does not allow `inbox` -> `bid`. Minimum path is 3 transitions. | `@dfg/types` STATE_TRANSITIONS, see OQ-008 |
| BR-062 | Batch reject uses a single `rejection_reason` for all items. | `opportunities.ts` line 873 |
| BR-063 | Kill Switch Banner must not auto-redirect away from detail page. | Target Customer feedback |

### Scoring and Analysis Rules

| ID | Rule | Source |
|----|------|--------|
| BR-003 | Score bands: high >= 70, medium 40-69, low < 40. | `opportunities.ts` line 209-217 |
| BR-048 | AI verdict mapping: STRONG_BUY/BUY -> BID (if gates clear) or WATCH (if not); MARGINAL -> WATCH; PASS -> PASS. | `opportunities.ts` line 1529-1546 |
| BR-049 | Gate-based fallback: if AI unavailable, allCriticalCleared -> BID, criticalOpen <= 2 -> WATCH, else NEEDS_INFO. | `opportunities.ts` line 1540-1546 |
| BR-050 | Bid readiness: `DO_NOT_BID` for PASS economics, confirmed deal breakers, or salvage/missing title. `NOT_BID_READY` for missing auction end time or unverified title/mileage. `BID_READY` when economics work and all gates cleared. | `calculation-spine.ts` evaluateBidReadiness() |
| BR-051 | Confidence breakdown has 4 dimensions: price, title, condition, timing. Each scored independently. Overall score 0-5. | `calculation-spine.ts` evaluateConfidenceBreakdown() |

### Alert Rules

| ID | Rule | Source |
|----|------|--------|
| BR-052 | Auction ending alerts: < 4 hours = critical, < 24 hours = high, < 48 hours = medium. | `alerts.ts` line 49-101 |
| BR-053 | Stale qualifying alert fires after 24 hours in qualifying status. Severity upgrades to high after 48 hours. | `alerts.ts` line 106-124 |
| BR-054 | Bid threshold alert fires when current_bid >= 90% of max_bid_locked. | `alerts.ts` line 127-148 |
| BR-055 | Alert dismissals are per-key, stored in `operator_actions`. Dismissing an alert does not prevent future alerts of different keys. | `alerts.ts` |

### UX/Mobile Rules

| ID | Rule | Source |
|----|------|--------|
| BR-061 | Reject modal completable in 2 taps on mobile (select reason, confirm). | Target Customer |
| BR-064 | Photo lightbox does not support swipe gesture between photos. Current behavior: tap thumbnail to open, tap to dismiss. Swipe is a P2 UX enhancement. | Target Customer, UX Lead |

### Data Integrity Rules

| ID | Rule | Source |
|----|------|--------|
| BR-056 | All SQL queries must use `.bind()` parameterization. No template literal interpolation in SQL. | CLAUDE.md |
| BR-057 | R2 snapshots are immutable. New data creates a new key; existing keys are never overwritten. | CLAUDE.md |
| BR-058 | MVC events are immutable. Once emitted, events cannot be modified or deleted. | Product Principle #6 |

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

**Risk:** Medium. Operator has less information for decision-making. The Next Action Card should degrade gracefully when AI analysis is unavailable. *(Ref: UX Lead Interaction Pattern 3)*

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

**Expected Behavior:** The scout run partially succeeds. Sierra listings are ingested normally. IronPlanet listings are missed. Currently there is no proactive alerting for this (P0 gap per BR-035). The operator would notice reduced deal flow from IronPlanet by observing fewer opportunities from that source.

**Risk:** High. This is an active issue (IronPlanet capture rate is ~17%, per PM contribution). The Target Customer rates this as a make-or-break concern.

### EC-011: Photo Array Format Inconsistency

**Scenario:** The `photos` field on an opportunity is stored as a JSON string in D1 but the frontend expects an array.

**Expected Behavior:** The frontend handles this with a defensive parse: if `photos` is a string, it attempts `JSON.parse()`; if that fails, it falls back to an empty array. The backend always calls `parseJsonSafe(row.photos) || []`.

**Risk:** Low. Both client and server handle the inconsistency.

### EC-012: Analysis Run with Zero Bid Amount

**Scenario:** An opportunity has `current_bid = 0` or null when analysis is triggered.

**Expected Behavior:** The `total_all_in` calculation sets to `0 * 1.15 = 0` (or handles null). In `buildCalculationSpine`, if `bidAmount = 0`, `buyerPremium = 0`, margins are `0`, and `totalAllIn = transport + repairs + otherFees`. The AI analysis may still produce a max bid recommendation based on estimated value.

**Risk:** Medium. Zero bid is valid for auctions that haven't started. The calculation spine handles it, but the UI should clarify that numbers are based on a $0 starting bid.

### EC-013: tuning_events CHECK Constraint Rejects 'status_change' Event Type (BUG)

**Scenario:** An opportunity triggers auto-rejection via hard gate failure (e.g., salvage title confirmed). The code at `opportunities.ts` line 1278 attempts to insert a `tuning_events` record with `event_type: 'status_change'`.

**Expected Behavior (CURRENT -- BROKEN):** The INSERT fails because the D1 `tuning_events` table CHECK constraint (migration 0001, line 158-160) only allows: `'rejection', 'win', 'loss', 'score_override', 'time_in_stage'`. The value `'status_change'` is not in this list. Depending on D1 error handling, this either (a) throws an error that may be swallowed by a try/catch, causing the auto-rejection tuning signal to be silently lost, or (b) causes the entire auto-rejection flow to fail.

**Expected Behavior (CORRECT):** The auto-rejection tuning event should use `event_type: 'rejection'` (which is an allowed value and semantically correct -- the auto-rejection IS a rejection). Alternatively, the CHECK constraint should be updated via migration to include `'status_change'`.

**Risk:** P0. This is a data integrity bug that silently loses tuning signals for auto-rejections, undermining the algorithm improvement feedback loop (BR-020). *(Promoted from OQ-002 in Round 1)*

**Resolution:** Fix the code to use `event_type: 'rejection'` with `auto_rejected: true` in `signal_data` (preferred, no migration needed), OR add migration to expand CHECK constraint. The former is simpler and semantically cleaner.

### EC-014: Dashboard Quick-Pass Creates Invalid Rejection

**Scenario:** The operator uses the inline "Pass" action on the Attention Required dashboard list. This action rejects the opportunity with `rejection_reason='other'` as default.

**Expected Behavior (POTENTIAL ISSUE):** If the quick-pass path sends `rejection_reason='other'` without a `rejection_note`, the backend validation at line 888-889 will reject it with 400: `'rejection_note required when reason is other'`. The quick-pass action would silently fail.

**Expected Behavior (CORRECT):** Either (a) the quick-pass should use a different default reason (e.g., `'missing_info'`), or (b) the quick-pass should bypass the `'other' requires note` validation, or (c) the UX should prompt for a note. Option (a) is simplest.

**Risk:** Medium. Needs verification of the actual frontend implementation of the quick-pass action. If it sends `rejection_reason='other'`, it will fail on every attempt. *(Triggered by: UX Lead Concern #2)*

---

## Open Questions

| ID | Question | Impact | Suggested Resolution |
|----|----------|--------|---------------------|
| OQ-001 | **CRITICAL:** The `applyVerdictThresholds` function uses OR logic: meeting EITHER `min_profit` OR `min_margin` triggers BUY verdict. Verified at `category-config.ts` line 258. This means a trailer deal with $600 profit but only 5% margin receives a BUY recommendation. Per Product Principle #1 (Numbers must be right) and Product Principle #3 (Conservative over optimistic), this appears incorrect. | Critical -- affects recommendation accuracy. A 5% margin on a $12,000 acquisition with $600 profit could easily become a loss after unexpected costs. | Recommend AND logic for BUY threshold (must meet BOTH profit AND margin), OR logic for WATCH (meet either). This aligns with the conservative philosophy. Requires PM decision and backtest on historical data before changing. |
| OQ-002 | ~~RESOLVED~~ Promoted to EC-013 (confirmed bug). The `tuning_events` CHECK constraint does not include `'status_change'`, but the code inserts it. | P0 -- see EC-013 | Fix code to use `event_type: 'rejection'` with `auto_rejected: true` in signal_data. |
| OQ-003 | The stats endpoint `last_scout_run` and `last_ingest` are both `null` (TODO). Without these, the operator cannot verify pipeline health from the dashboard. What is the timeline for implementation? | High -- relates to Scout failure alerting (revised to P0 gap per Target Customer) | Implement as part of P0 scout reliability work. |
| OQ-004 | The `outcomes` table exists in schema but has no API endpoints or UI. ADR-003 recommends simple win/loss with final price for MVP. Is this sufficient to validate the success metric "Realized margin >= 25%"? | High -- cannot validate core success metric without outcome data | `final_price` on won deals is necessary but not sufficient. Need at minimum `sold_price` to calculate profit. Target Customer says outcome tracking in a spreadsheet is acceptable for MVP. Recommend deferring outcomes UI to P1 as planned. |
| OQ-005 | What happens when the operator's location changes? The `max_distance_miles` category config and `distance_miles` on opportunities are static. Does re-analysis update distance? | Low for MVP (single operator, fixed location) | Defer to Phase 1 when per-user location preferences are implemented. |
| OQ-006 | The `attention` filter includes analysis_stale items (last_analyzed_at > 7 days ago). Should items that have NEVER been analyzed (`last_analyzed_at IS NULL`) also appear in the attention count? Currently `analysisStale` filter includes them, but `attention` does not. | Medium -- missed items in attention view | Recommend aligning the attention filter to also include never-analyzed items. The `analysisStale` filter correctly includes NULL with `(last_analyzed_at IS NULL OR ...)` but `attention` only checks `last_analyzed_at IS NOT NULL AND ...`. |
| OQ-007 | The bid entry UI uses `prompt()` (browser native dialog) for entering max bid amount and final price. This is functional but does not validate input format. What if the operator enters "$1,500" or "1500.50"? | Medium -- data integrity risk | See OQ-010 for expanded analysis. |
| OQ-008 | **NEW:** Should the state machine allow a fast-track path from `inbox` directly to `bid` (or at least `inbox` -> `inspect` -> `bid`)? The Target Customer explicitly requested this: "I have to go inbox -> qualifying -> inspect before I can set a bid. That's three status changes for something I already know I want." The current state machine requires `inbox -> qualifying -> inspect -> bid`. | High -- affects operator efficiency on time-sensitive auctions. The PM Product Principle #2 (Speed is competitive advantage) supports shorter paths. Product Principle #5 (Operator decides, system recommends) supports letting the operator skip stages. | Options: (A) Add `inbox -> inspect` transition (reduces to 2 steps: inbox -> inspect -> bid). (B) Add `inbox -> bid` transition (1 step, but bypasses all gates and evaluation). (C) Keep current and document that the workflow enforces discipline. Recommend option (A) as a compromise: it preserves the inspect gate (operator must consciously confirm readiness to bid) while removing the qualifying step for obvious deals. Requires `@dfg/types` and backend changes. PM decision required. |
| OQ-009 | **NEW:** Should the analysis tab default to "Summary" instead of "Report"? The UX Lead observed that the most actionable information (max bid, margin, verdict reasoning) is on the "Summary" and "Investor" tabs, but the default is "Report" (raw AI text). The Next Action Card partially mitigates this, but detailed reasoning requires tab navigation. | Low-Medium -- affects time-to-decision during deep evaluation | The Target Customer's 3-second decision target is primarily served by the Next Action Card (which is above the tabs). Changing the default tab is a low-risk improvement. Recommend changing to "Summary" as default. |
| OQ-010 | **NEW (expanded from OQ-007):** The `window.prompt()` dialog used for entering `max_bid_locked` (Set Bid) and `final_price` (Won) provides no input validation, no currency formatting, no confirmation step, and inconsistent behavior across iOS Safari versions. For a system where Product Principle #1 is "Numbers must be right" and these are the two most consequential financial inputs in the entire workflow, this is a design risk. | High -- a mistyped bid amount has direct financial consequences. The UX Lead and Target Customer both flagged this. | Replace with a custom modal component that: (1) enforces numeric input, (2) strips currency formatting ($ , .), (3) shows a confirmation step ("You are setting max bid to $X,XXX. Confirm?"), (4) validates positive values > 0. Classify as P1 pre-beta blocker. Accept for P0 founder use with awareness. |
| OQ-011 | **NEW:** Should the "Verification Needed" dashboard label be renamed? The Target Customer said: "Verify what? That label doesn't tell me anything. If it means 'this opportunity has open critical gates,' then say 'Needs Info' or 'Check This.'" | Low -- cosmetic label change | Recommend renaming to "Needs Info" or "Missing Details" to better communicate the action required. Simple frontend text change. |

---

## Traceability Matrix

### User Stories to Features

| User Story | Feature | API Endpoint(s) | DB Tables | UI Screen(s) (Ref: UX Lead IA) |
|------------|---------|-----------------|-----------|-------------------------------|
| US-001 | Inbox review, filtering, pagination | GET /api/opportunities, GET /api/opportunities/stats | opportunities | Dashboard (`/`), Opportunities List (`/opportunities`), Filters (`/opportunities/filters`) |
| US-002 | Opportunity detail view | GET /api/opportunities/:id | opportunities, analysis_runs, operator_actions, sources | Opportunity Detail (`/opportunities/[id]`) |
| US-003 | AI analysis on demand | POST /api/opportunities/:id/analyze | analysis_runs, opportunities | Opportunity Detail: Analyze button, TabbedAnalysis, NextActionCard |
| US-004 | Workflow state machine | PATCH /api/opportunities/:id, POST /api/opportunities/:id/actions, POST /api/events | opportunities, operator_actions, mvc_events | Opportunity Detail: Fixed bottom action bar |
| US-005 | Watch system | PATCH /api/opportunities/:id (to watch), POST /api/triggers/check | opportunities, operator_actions | Opportunity Detail: Watch action, Dashboard: Watching count |
| US-006 | Structured rejection | PATCH /api/opportunities/:id (to rejected) | opportunities, operator_actions, tuning_events, mvc_events | Opportunity Detail: Reject modal |
| US-007 | Batch operations | POST /api/opportunities/batch | opportunities, operator_actions, tuning_events | Opportunities List: Batch action UI |
| US-008 | Operator inputs / gate clearance | PATCH /api/opportunities/:id/inputs | opportunities, operator_actions | Opportunity Detail: Title Info card, Gates Display card, Kill Switch Banner |
| US-009 | Outcome tracking | PATCH /api/opportunities/:id (to won/lost) | opportunities, outcomes (Phase 1) | Opportunity Detail: Won/Lost buttons |
| US-010 | Pipeline health monitoring | GET /api/opportunities/stats | sources, scout_runs | Dashboard: Stats, Sources (`/sources`) |
| US-011 | Staleness detection | GET /api/opportunities (staleness filters), GET /api/opportunities/:id | opportunities, analysis_runs | Opportunity Detail: Staleness Banner, Dashboard: Attention Required |
| US-012 | Dashboard attention summary | GET /api/opportunities/stats, GET /api/dashboard/attention | opportunities | Dashboard: Attention Required list, Quick Stats grid, Ending Soon list |

### User Stories to Success Metrics

| User Story | Success Metric | Target | Measurement |
|------------|---------------|--------|-------------|
| US-001 | Opportunities surfaced per day | >= 15 qualified | Count of non-rejected/archived opportunities created today |
| US-003, US-006 | Analysis accuracy (operator agreement) | >= 70% BID recs result in operator bid/watch | MVC events: decision_made where analyst_verdict=BID |
| US-003, US-006 | False positive rate | <= 30% of score > 80 get rejected | Rejection rate of high-score opportunities |
| US-004, US-012 | Operator response time | Median < 4 hours inbox to qualifying/rejected | status_changed_at delta |
| US-010 | Scout uptime | >= 95% runs succeed | scout_runs success rate |
| US-003 | Analysis latency | p95 < 45 seconds | listing.created_at to opportunity.last_analyzed_at |
| US-009 | Won deals per month | >= 2 acquisitions | Opportunities with status=won |
| US-009 | Realized margin | >= 25% average | outcomes table net_profit / acquisition_cost (P1), spreadsheet tracking (P0) |

### User Stories to Business Rules

| User Story | Business Rules |
|------------|---------------|
| US-001 | BR-001, BR-002, BR-003 |
| US-002 | BR-004, BR-005, BR-006 |
| US-003 | BR-007, BR-008, BR-009, BR-010, BR-011, BR-047, BR-048, BR-049 |
| US-004 | BR-012, BR-013, BR-014, BR-059 |
| US-005 | BR-015, BR-016, BR-017, BR-060 |
| US-006 | BR-018, BR-019, BR-020, BR-021, BR-061 |
| US-007 | BR-022, BR-023, BR-024, BR-025, BR-062 |
| US-008 | BR-026, BR-027, BR-028, BR-029, BR-063 |
| US-009 | BR-030, BR-031, BR-032, BR-033 |
| US-010 | BR-034, BR-035, BR-036 |
| US-011 | BR-037, BR-038, BR-039 |
| US-012 | BR-040, BR-041, BR-042 |

### User Stories to Kill Criteria

| Kill Criterion | Related User Stories | Detection Method |
|---------------|---------------------|-----------------|
| Zero profitable acquisitions in 90 days | US-009 | Query: `SELECT COUNT(*) FROM opportunities WHERE status='won' AND created_at > datetime('now', '-90 days')` |
| Sustained negative margins < 10% | US-009 | Requires outcomes data (P1 gap); use spreadsheet for P0 |
| Operator stops using the tool (< 3 logins/week for 4 weeks) | US-001, US-004 | Auth session tracking (currently hardcoded auth -- no tracking). Accept for P0; must resolve before Phase 1. |
| Scout data staleness > 50% expired on first view | US-010 | Compare `auction_ends_at` to `status_changed_at` for first transition out of inbox |
| Analysis disagreement > 60% over 60 days | US-003, US-006 | MVC events: `decision_made` where analyst_verdict=BID but operator decision=PASS |

### User Stories to Technical Risks (Ref: Technical Lead)

| User Story | Technical Risks |
|------------|----------------|
| US-003 | R2 (Analyst timeout under Claude API load), R1 (D1 concurrent write -- optimistic lock handles analysis path) |
| US-004 | R1 (D1 concurrent write -- PATCH endpoint lacks optimistic lock; accept for single-operator MVP) |
| US-005 | R8 (Watch trigger latency -- up to 5 min late; acceptable with 4-hour default threshold) |
| US-010 | R6 (Auction data freshness -- up to 15 min stale from scout cron interval) |
| US-001, US-002 | R5 (No rate limiting -- accept for MVP with single operator) |

---

## Appendix A: MVP Phase 0 Gaps Identified (Revised Priorities)

The following gaps were identified through codebase analysis and cross-role review. Priorities have been revised based on Target Customer feedback and Technical Lead risk assessment.

| Gap | Priority | User Story | Impact | Triggered By |
|-----|----------|-----------|--------|-------------|
| `tuning_events` CHECK constraint rejects `'status_change'` inserts (EC-013) | **P0** | US-008 | Auto-rejection tuning signals silently lost; undermines algorithm feedback loop | Self-identified R1, confirmed R2 |
| Scout failure alerting absent | **P0** (revised from P1) | US-010 | Operator discovers stale data by observation only. Target Customer: "#1 gap" | Target Customer |
| `last_scout_run` returns null on stats | **P0** | US-010 | Cannot monitor pipeline health from dashboard | Self-identified R1 |
| IronPlanet capture rate ~17% | P1 | US-010 | Missing ~83% of IronPlanet listings. Target Customer: "worse than not having the tool at all" | PM, Target Customer |
| Outcome tracking has no UI | P1 | US-009 | Cannot validate realized margin success metric in-app (spreadsheet acceptable for P0) | PM |
| `applyVerdictThresholds` uses OR logic (OQ-001) | P1 | US-003 | BUY recommendations on low-margin deals; undermines conservative philosophy | Self-identified R1, confirmed R2 |
| Bid entry uses browser `prompt()` | P1 (pre-beta blocker) | US-004, US-009 | No input validation for most consequential financial inputs | UX Lead, Target Customer |
| Dashboard quick-pass may fail on 'other' reason validation (EC-014) | P1 | US-012 | Inline reject action may silently fail | UX Lead |
| Auth is hardcoded | P0 (security, pre-beta blocker) | N/A | No session tracking for kill criteria; API key exposure risk | PM, Competitor Analyst |
| No frontend tests | P2 | All UI stories | UI regressions undetected | Technical Lead |
| Checkbox touch targets below 44px on Filters page | P2 | US-001 | iOS Safari touch target violation | UX Lead |

---

## Appendix B: Cross-Role Reference Index

This index maps concerns raised by other roles to the business analysis artifacts that address them.

| Role | Concern | Addressed In |
|------|---------|-------------|
| Target Customer | Reject flow too heavy ("one tap, one reason code, done") | BR-061, US-006 revised AC-006.4 |
| Target Customer | Cannot jump from inbox to bid (3 transitions minimum) | BR-059, OQ-008 |
| Target Customer | Scout failure alerting should be P0 | BR-035 (revised priority), Gaps table |
| Target Customer | IronPlanet capture rate unacceptable | BR-036, EC-010 |
| Target Customer | "Verification Needed" label unclear | OQ-011 |
| Target Customer | Photo swipe gesture missing | BR-064 |
| Target Customer | Kill Switch Banner should not auto-redirect | BR-063 |
| Target Customer | Batch reject with single reason for all items | BR-062 (confirmed existing behavior) |
| UX Lead | Default analysis tab should be Summary, not Report | OQ-009, AC-002.6 |
| UX Lead | `prompt()` for financial inputs is a design risk | OQ-010 |
| UX Lead | Dashboard quick-pass uses "other" reason with no note | EC-014 |
| UX Lead | No undo for destructive actions | Out of scope for MVP; accept risk for founder use |
| UX Lead | Checkbox touch targets below 44px | Gaps table (P2) |
| Technical Lead | Performance budgets as testable criteria | AC-001.6, AC-002.7, AC-003.10 |
| Technical Lead | Watch trigger latency (5-min cron) | BR-060 |
| Technical Lead | D1 concurrent write risks | Traceability: Technical Risks table |
| Technical Lead | No optimistic lock on PATCH endpoint | Accept for single-operator MVP per Tech Lead R1 recommendation |
| Competitor Analyst | Alert speed gap (15-min cron vs. sub-minute competitors) | Out of scope for MVP; accept. Scraping interval is adequate for auction timescales. |
| Competitor Analyst | Native app UX advantage | Out of scope; DFG is a web app on iOS Safari (CLAUDE.md constraint) |
| Competitor Analyst | Shallow moat / replicable technology | Not a BA concern; noted for PM strategic awareness |
| PM | ADR-003 outcome tracking depth | US-009, OQ-004 |
| PM | Kill criteria detection methods | Traceability: Kill Criteria table |

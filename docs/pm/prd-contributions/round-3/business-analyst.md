# Business Analyst Contribution -- PRD Review Round 3 (Final)

**Author:** Business Analyst
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Final after 3 rounds
**Ground Truth:** Codebase at `dfg-console` repo (commit `a4979fe`), CLAUDE.md, all Round 1 and Round 2 contributions from all 6 roles

---

## Changes from Round 2

1. **Resolved OQ-001 (verdict threshold OR logic) -- promoted to confirmed ADR-006.** All six roles converged on this in Round 2. The PM took a position: BUY requires AND logic (both min_profit AND min_margin met). The Target Customer called it non-negotiable. The Technical Lead listed it as ADR-007 with Option A recommended. This is no longer an open question. Moved from Open Questions to a confirmed business rule (BR-065) and updated US-003 acceptance criteria accordingly. The rule is: BUY requires BOTH thresholds met, WATCH requires EITHER, PASS when neither. *(Triggered by: PM ADR-006, Target Customer #2 priority, Technical Lead ADR-007)*

2. **Resolved OQ-009 (default analysis tab) -- changed to Summary.** The UX Lead changed the default tab from Report to Summary in their Round 2 revision (Change #9). The Target Customer confirmed: "I want to open an opportunity and know in 3 seconds what I should do." The most actionable data (max bid, margin, profit, verdict reasoning) lives on the Summary tab. Updated AC-002.6 to specify Summary as the default. This is no longer an open question. *(Triggered by: UX Lead Change #9, Target Customer)*

3. **Resolved OQ-010 (browser `prompt()` for financial inputs) -- classified as P1 pre-beta blocker, accepted for P0.** The PM, UX Lead, Technical Lead, and Target Customer all flagged this. The UX Lead specified custom modal patterns (Pattern 8: Financial Input Modals) with numeric validation, currency formatting, and confirmation steps. The Target Customer wants this as P0 but accepted that it works for a single financially literate operator today. The PM classified it as Phase 1. Consensus: accept for P0 founder use with full awareness of the risk, require replacement before any external user touches the system. Removed from Open Questions; documented as a confirmed gap with timeline. *(Triggered by: UX Lead Change #2/Pattern 8, PM Phase 1 list, Target Customer #3 priority)*

4. **Resolved OQ-011 ("Verification Needed" label) -- renamed to "Needs Info."** The UX Lead renamed the label to "Needs Info" with subtitle "Missing title, lien, or mileage data" (Change #6). The Target Customer approved the intent but suggested "Needs Title Info" or "Missing Details" as alternatives. Updated BR-041 to reference the new label. The API filter parameter `verification_needed` remains unchanged; this is a UI-only change. *(Triggered by: UX Lead Change #6, Target Customer)*

5. **Revised EC-013 resolution based on Technical Lead's migration plan.** The Technical Lead wrote migration 0008, which rebuilds the `tuning_events` table with `'status_change'` added to the CHECK constraint. My Round 2 recommendation was to fix the code to use `event_type: 'rejection'` instead. The Technical Lead's approach (expand the constraint) is also valid and has the advantage of being a more honest event type label for status-change events that are not pure rejections. Either fix works. Updated EC-013 to reflect both options with a recommendation to implement whichever ships first. *(Triggered by: Technical Lead migration 0008)*

6. **Added EC-015 for the UX Lead's "Inspect shortcut" auto-advance behavior.** The UX Lead proposed that tapping "Inspect" from `inbox` status auto-advances through `qualifying` to `inspect` in a single server round-trip (two sequential PATCH calls). This creates a new edge case: if the first PATCH (inbox -> qualifying) succeeds but the second (qualifying -> inspect) fails, the opportunity is left in `qualifying` status without the operator's explicit intent. This needs error handling specification. *(Triggered by: UX Lead Change #8)*

7. **Revised the gaps table to reflect cross-role priority convergence.** Round 2 had some priority disagreements between roles. Round 3 reflects the final consensus: scout failure alerting is P0 (unanimous), verdict threshold fix is P0 (PM decided), `tuning_events` CHECK fix is P0 (Technical Lead wrote migration), IronPlanet capture rate is P0 per PM (fix or disable), `prompt()` replacement is P1 pre-beta blocker (consensus). *(Triggered by: all roles)*

8. **Added BR-065 through BR-068 for newly confirmed rules from cross-role convergence.** BR-065 formalizes the AND-logic verdict threshold. BR-066 formalizes the gate-only fallback visual indicator requested by the Target Customer. BR-067 formalizes the Inspect shortcut behavior from inbox. BR-068 formalizes the Results footer bar data source. *(Triggered by: PM ADR-006, Target Customer, UX Lead Changes #8/#10)*

9. **Closed OQ-008 (inbox-to-bid shortcut) as deferred.** The Target Customer retracted the request for direct inbox-to-bid after understanding the state machine constraints and MVC event requirements. The UX Lead proposed the "Inspect shortcut" as a compromise (inbox -> qualifying -> inspect in one user action). The PM listed "direct inbox-to-bid transition" as explicitly NOT in Phase 0. This is resolved for MVP scope. *(Triggered by: Target Customer Change #4, UX Lead Change #8, PM Phase 0 exclusions)*

10. **Incorporated the PM's `sold_price` field addition into US-009 and the traceability matrix.** The PM's ADR-003 revision adds `sold_price` to the opportunities table, enabling minimum viable outcome measurement. Updated US-009 acceptance criteria and the success metrics traceability to reflect this. *(Triggered by: PM ADR-003 revision)*

---

## MVP User Stories

### US-001: Review New Opportunities

**Title:** Operator reviews newly ingested auction opportunities

**Persona:** Scott (Solo Operator, Founder)

**Narrative:** As an operator, I want to see all newly surfaced auction opportunities in a prioritized inbox so that I can quickly identify which items deserve further evaluation before their auctions close.

**Acceptance Criteria:**

- [ ] AC-001.1: Given the operator opens the dashboard, when new opportunities have been ingested in the last 24 hours, then opportunities with status `inbox` are displayed sorted by `auction_ends_at ASC` (soonest-ending first, NULLs last).
- [ ] AC-001.2: Given an opportunity is in `inbox` status, when it has a `buy_box_score >= 70` and `last_analyzed_at IS NOT NULL` and auction ends within 48 hours or was created within last 12 hours, then it appears in the Strike Zone count on the stats endpoint.
- [ ] AC-001.3: Given the opportunity list is loaded, when the operator views it on iOS Safari, then each opportunity card displays: title, current bid (formatted as USD), auction end time (relative), distance in miles, buy_box_score, primary image thumbnail, and a "Last updated X min ago" label (amber when data is older than 15 minutes). All interactive elements meet 44x44px minimum touch targets. *(Ref: UX Lead, CLAUDE.md iOS patterns, UX Lead Change #3)*
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
- [ ] AC-002.3: Given the opportunity has photos, when the operator taps a photo thumbnail, then a full-screen lightbox appears with swipe-left/right navigation between photos. Tapping outside the lightbox or pressing Escape closes it. *(Revised per UX Lead Change #4)*
- [ ] AC-002.4: Given the opportunity has `source_url`, when the operator taps "View Listing", then the original auction listing opens in a new browser tab.
- [ ] AC-002.5: Given the opportunity has active alerts, when the detail page loads, then alerts are displayed sorted by severity (critical > high > medium > low) with dismiss buttons.
- [ ] AC-002.6: Given the tabbed analysis interface, when the operator views it, then the default tab is **Summary** (not Report), showing max bid range, retail estimate, expected profit, margin percentage, and all-in acquisition cost breakdown. The most actionable information (verdict, max bid, margin) is immediately visible without requiring tab navigation. *(Resolved: UX Lead Change #9, Target Customer confirmation)*
- [ ] AC-002.7: Given the detail page, then the API response completes in < 300ms at p95. *(Ref: Technical Lead NFR)*
- [ ] AC-002.8: Given the detail page header, then a "Last updated X min ago" label is displayed, turning amber when data is older than 15 minutes. *(Added per UX Lead Change #3)*

**Business Rules:**

- BR-004: The `source_defaults` object must return `buyer_premium_pct` and `pickup_days` from the `sources` table for the opportunity's source.
- BR-005: If `source_url` is null, the "View Listing" link must not be rendered; a "No link" label is shown instead.
- BR-006: Alert dismissals are stored in `operator_actions` with `action_type='alert_dismiss'` and are keyed per `alert_key` to prevent re-display.

**Out of Scope:**

- Offline caching of opportunity details (Phase 1 PWA)
- Score breakdown visualization by dimension (ADR-005, open)
- Pinch-to-zoom on photos (UX Lead: not in MVP)

---

### US-003: Run AI Analysis on Demand

**Title:** Operator triggers Claude-powered analysis for an opportunity

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to trigger an AI-powered analysis on any opportunity so that I get a dual-lens evaluation (investor + buyer perspective) with max bid recommendation, repair estimates, and deal readiness assessment.

**Acceptance Criteria:**

- [ ] AC-003.1: Given the operator taps the "Analyze" button, when the API call to `POST /api/opportunities/:id/analyze` succeeds, then an `analysis_runs` record is created with `recommendation` (BID/WATCH/PASS/NEEDS_INFO), `derived_json`, `gates_json`, and `ai_analysis_json` persisted.
- [ ] AC-003.2: Given the analyst worker returns an `investor_lens.verdict` of `STRONG_BUY` or `BUY`, when all critical gates are cleared AND both the category's `min_profit` AND `min_margin` thresholds are met (BR-065), then the analysis run recommendation is set to `BID`. *(Revised per ADR-006: AND logic for BUY)*
- [ ] AC-003.3: Given the analyst worker returns `STRONG_BUY` or `BUY`, when critical gates are NOT cleared, then the recommendation is `WATCH` (not `BID`), ensuring gate compliance.
- [ ] AC-003.4: Given the analyst worker returns `MARGINAL`, then the recommendation is `WATCH` regardless of gate status.
- [ ] AC-003.5: Given the analyst worker returns `PASS`, then the recommendation is `PASS` regardless of gate status.
- [ ] AC-003.6: Given the analyst worker is unavailable or times out (25-second timeout), then the analysis completes with `aiAnalysisResult = null` and a gate-based fallback recommendation is used. The UI displays a visible indicator distinguishing "AI-powered" analysis from "Gates only (AI unavailable)" analysis (BR-066). *(Revised per Target Customer: "I need to know what I'm looking at")*
- [ ] AC-003.7: Given a previous analysis run exists, when a new analysis is run, then a `delta` object is returned showing the change in recommendation and max bid from the previous run.
- [ ] AC-003.8: Given concurrent modifications occur, when the optimistic lock check fails (`updated_at` mismatch), then a 409 Conflict is returned and the orphaned `analysis_runs` record is cleaned up.
- [ ] AC-003.9: Given an analysis is triggered, when it completes successfully, then `last_analyzed_at` and `last_operator_review_at` are both updated on the opportunity (clears STALE badge).
- [ ] AC-003.10: Given an analysis is triggered, then the full analysis (including AI call) completes in < 30s at p95. Without AI, it completes in < 500ms at p95. End-to-end pipeline (listing to scored opportunity) completes in < 45s at p95. *(Ref: Technical Lead NFR -- clarified two-tier target)*

**Business Rules:**

- BR-007: Analysis runs are versioned and immutable. Each run creates a new `analysis_runs` row; previous runs are never modified.
- BR-008: The calculation spine uses the canonical money math: `Profit = Net Proceeds - Acquisition Cost`, `Margin % = (Profit / Acquisition Cost) * 100`. This is non-negotiable per CLAUDE.md.
- BR-009: For Sierra Auction source, buyer premium must use the canonical `SIERRA_FEE_SCHEDULE` from `@dfg/money-math` (tiered schedule with flat fees, percent fees, and caps).
- BR-010: `max_bid_low` is calculated as `investor_lens.max_bid * 0.9` (90% of AI max bid) and `max_bid_high` is `investor_lens.max_bid` (100%).
- BR-011: AI analysis p95 latency target is < 45 seconds from listing to scored opportunity.
- BR-065: **Verdict threshold logic uses AND for BUY, OR for WATCH.** `applyVerdictThresholds` must require BOTH `min_profit` AND `min_margin` to be met for a BUY verdict. Meeting EITHER (but not both) triggers WATCH. Meeting neither triggers PASS. This replaces the previous OR logic that allowed a deal with $600 profit but 5% margin to receive a BUY recommendation. *(Confirmed: PM ADR-006, Target Customer non-negotiable, Technical Lead ADR-007 Option A)* **Requires backtest against historical opportunities before deployment.**
- BR-066: **Gate-only fallback must be visually distinguishable.** When analysis completes without AI (timeout, unavailability), the UI must display a visible indicator (e.g., "Analysis: Gates only -- AI unavailable") so the operator knows the recommendation was not AI-evaluated. *(Confirmed: Target Customer: "If I'm looking at a recommendation and it was generated without the AI, I need a visible indicator.")*

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
- [ ] AC-004.8: Given the bottom action bar on the detail page, when the opportunity is in a given status, then only contextually valid actions are shown per the state machine. For `inbox` status, an "Inspect" shortcut button is available alongside Qualify/Watch/Reject (BR-067). *(Revised per UX Lead Change #8)*

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
- BR-059: The state machine does NOT allow `inbox` -> `bid` directly. The minimum path to bid is `inbox` -> `qualifying` -> `inspect` -> `bid` (3 transitions). This is a deliberate constraint enforcing disciplined evaluation per Product Principle #3 (conservative over optimistic).
- BR-067: **Inspect shortcut from inbox.** The UI provides an "Inspect" button on `inbox` status items that auto-advances through `qualifying` to `inspect` via two sequential server-side PATCH calls in a single user action. This reduces the operator's tap count from 3 to 2 for urgent items. The shortcut does NOT bypass the state machine -- both transitions are executed in sequence with full audit records. If the first transition succeeds but the second fails, the opportunity remains in `qualifying` status and the UI displays an error. *(Confirmed: UX Lead Change #8, Target Customer Change #4 retraction of inbox-to-bid request)*

**Out of Scope:**

- Automated bidding (system always recommends, operator decides per Product Principle #5)
- Undo/revert of status transitions (UX Lead tracked for Phase 1)
- Bulk status advancement (only batch reject and batch archive are supported)
- Direct inbox-to-bid transition (deferred per PM, Target Customer retracted request)

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
- [ ] AC-006.4: Given the rejection modal on mobile, when the operator opens it, then a streamlined grid of 6 common reason codes is presented (too_far, too_expensive, wrong_category, poor_condition, missing_info, other) with 44px+ tap targets. An expandable "More reasons" toggle reveals the full 13-code decision taxonomy. The legacy single-select dropdown is removed. *(Revised per Target Customer, UX Lead Change #1, PM ADR-007)*
- [ ] AC-006.5: Given the rejection is confirmed, then an MVC event of type `decision_made` with `decision='PASS'` and `decision_reason` (array of reason codes) is logged.
- [ ] AC-006.6: Given the operator rejects from the `inspect` status, when the opportunity was analyzed with a `BID` recommendation, then the `analyst_verdict` is included in the decision event payload (for disagreement tracking).

**Business Rules:**

- BR-018: Valid rejection reasons (legacy API field): `too_far`, `too_expensive`, `wrong_category`, `poor_condition`, `missing_info`, `other`.
- BR-019: The decision reason taxonomy (#188) includes 13 codes across 8 categories: `price_too_high`, `price_no_margin`, `condition_major`, `condition_unknown`, `location_too_far`, `location_restricted`, `timing_ending`, `timing_pickup`, `title_issues`, `category_mismatch`, `competition_concern`, `market_soft`, `other`.
- BR-020: Rejection tuning events feed the scoring algorithm. The `buy_box_score` at time of rejection, combined with the reason code, provides a training signal for false-positive reduction.
- BR-021: If the operator's rejection disagrees with an AI `BID` recommendation, this is tracked as a false positive for the success metric "False positive rate <= 30%".
- BR-061: The reject modal must be completable in 2 taps on mobile: (1) select a reason code, (2) confirm rejection. The "other" code requiring a note is the only exception. The legacy single-select dropdown is removed; the multi-select taxonomy grid is the sole rejection reason mechanism. Backend mapping from taxonomy codes to the legacy `rejection_reason` field is handled server-side. *(Confirmed: Target Customer "one tap, one reason code, done," UX Lead Change #1, PM ADR-007)*

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
- [ ] AC-008.6: Given the verification needed filter, when an opportunity has `operator_inputs_json IS NULL` or any of `titleStatus`, `titleInHand`, `lienStatus`, or `odometerMiles` has `verificationLevel='unverified'` or is NULL, then the opportunity appears in the "Needs Info" count (UI label revised from "Verification Needed"). *(Revised per UX Lead Change #6)*
- [ ] AC-008.7: Given auto-rejection from a hard gate failure, when the system creates a tuning_events record, then the `event_type` must be `'rejection'` (not `'status_change'`). Alternatively, if migration 0008 is deployed first, `'status_change'` is acceptable. See EC-013 for the current bug and resolution options.

**Business Rules:**

- BR-026: Hard gate failures that trigger auto-rejection: title status is `salvage` or `missing` (confirmed/verified, not 'unverified').
- BR-027: Operator inputs use a deep merge strategy: submitting `{ title: { vin: { value: "1HGCM..." } } }` does NOT erase previously saved `titleStatus`.
- BR-028: Auto-rejection from hard gate failures creates both an `operator_actions` record (status_change) and a `tuning_events` record with `auto_rejected: true`.
- BR-029: The gated economics system applies a 20% haircut to max bid when gates are NOT cleared (bid readiness = `NOT_BID_READY`), giving the operator a decision: verify and use full max bid, or accept the haircut.
- BR-063: The Kill Switch Banner for hard gate failures must NOT auto-redirect the operator away from the detail page. The banner shows the disqualification reason inline, provides a "Confirmed -- reject this opportunity" button and a "This info may be wrong -- edit inputs" link. The operator stays on the page. *(Confirmed: Target Customer, UX Lead Change #7)*

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
- [ ] AC-009.5: Given a `won` transition, when the operator is prompted for `final_price`, then the input mechanism must validate for positive numeric values (no currency symbols, no commas, no negative values). For MVP, browser `prompt()` is accepted for founder use. For Phase 1, the custom financial input modal (UX Lead Pattern 8) is required.
- [ ] AC-009.6: Given a `sold_price` field exists on the opportunity (per PM ADR-003 revision), when the operator records a sale price, then minimum viable realized margin can be computed as `(sold_price - acquisition_cost) / acquisition_cost * 100` where `acquisition_cost = final_price * (1 + buyer_premium_pct/100) + estimated_transport + estimated_repairs`. *(Added per PM ADR-003)*

**Business Rules:**

- BR-030: `final_price` must be positive (> 0) for a `won` transition.
- BR-031: The `outcomes` table exists in schema but has no UI in Phase 0. This is identified as a P1 remaining gap. Schema ownership is being moved from dfg-scout to dfg-api per Technical Lead ADR-006.
- BR-032: Realized margin is calculated as: `(net_profit / acquisition_cost) * 100` where acquisition_cost follows the canonical formula: `Bid + Buyer Premium + Transport + Immediate Repairs`. Listing fees are SELLING COSTS ONLY, never included in acquisition cost.
- BR-033: The MVP success metric for won deals is >= 2 acquisitions per month from the DFG pipeline, with >= 25% average realized margin.

**Out of Scope:**

- Full P&L entry per deal (Phase 1, per ADR-003)
- Automated outcome tracking via auction platform API
- Profit/loss dashboard visualization
- Dashboard total profit display (deferred to P1 with outcome tracking UI; interim Results footer bar uses `SUM(final_price)` for won deals per BR-068)

---

### US-010: Monitor Scout Pipeline Health

**Title:** Operator knows when the data pipeline fails or produces stale data

**Persona:** Scott (Solo Operator)

**Narrative:** As an operator, I want to know when the scout scraping pipeline has failed or is producing stale data so that I can trust that I am seeing all available opportunities and not missing deals.

**Acceptance Criteria:**

- [ ] AC-010.1: Given the stats endpoint, then `last_scout_run` returns the timestamp of the most recent successful scout run (currently returns null -- P0 gap, must implement).
- [ ] AC-010.2: Given opportunities exist where `auction_ends_at` is in the past and status is still in an active state, then the "ending soon" filters correctly exclude expired auctions (using `datetime(auction_ends_at) > datetime('now')`).
- [ ] AC-010.3: Given the Scout pipeline runs on a 15-minute cron, when 95% of scheduled runs complete successfully (per MVP success metric), then the operator can trust data freshness.
- [ ] AC-010.4: Given the dashboard, when the last successful scout run is older than 30 minutes, then a red warning banner is displayed: "Scout has not run since [time]. Deal flow may be stale." *(Added per Target Customer, Technical Lead observability NFR)*

**Business Rules:**

- BR-034: Scout uptime target is >= 95% of scheduled runs completing successfully.
- BR-035: Scout failure alerting is a **P0 gap** (unanimous across all 6 roles). The minimum viable implementation for Phase 0 is: (a) populate `last_scout_run` on the stats endpoint, and (b) display a visual warning on the dashboard when the last successful run is older than 30 minutes. Push notification for scout failures (SMS/webhook) is Phase 1 per PM ADR-002 Part A, though the PM classified ADR-002 Part A as P0 -- the in-app banner is the minimum; outbound notification is the stretch goal.
- BR-036: IronPlanet capture rate is currently ~17% (vs Sierra at higher rates). The PM has elevated this to P0: either fix the adapter to >= 80% capture rate or disable the source and remove it from the Sources page. Showing a source as "active" when it captures 17% is deceptive. *(Ref: PM Change #2, Target Customer Change #6, Competitor Analyst Uncomfortable Truth #3)*

**Out of Scope:**

- Real-time pipeline monitoring dashboard
- Automatic retry of failed scout runs from the operator console
- Scout failure push notifications (Phase 1, ADR-002 Part A)

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

- [ ] AC-012.1: Given the stats endpoint, then the response includes: `by_status` (all 9 statuses), `strike_zone` count, `verification_needed` count (UI label: "Needs Info"), `ending_soon.within_24h`, `ending_soon.within_48h`, `new_today`, `stale_qualifying.over_24h`, `stale_qualifying.over_48h`, `watch_alerts_fired`, and `needs_attention`.
- [ ] AC-012.2: Given strike zone criteria, then an opportunity qualifies when: status is `inbox` or `qualifying`, score >= 70, analysis exists (`last_analyzed_at IS NOT NULL`), and either auction ends within 48 hours or was created within last 12 hours.
- [ ] AC-012.3: Given needs_attention count, then it equals `watch_alerts_fired + stale_qualifying.over_24h`.
- [ ] AC-012.4: Given the dashboard on iOS Safari, then all counts are visible without horizontal scrolling and tap targets for drill-down are >= 44x44px.
- [ ] AC-012.5: Given the Attention Required list, when the operator taps the inline "Pass" action on an item, then the action uses a non-"other" default reason code to avoid the `rejection_note` validation requirement. Recommended default: `missing_info`. *(Revised per EC-014 resolution)*
- [ ] AC-012.6: Given the dashboard Results footer bar, then it displays the count of won opportunities and the sum of `final_price` for all won opportunities. *(Added per UX Lead Change #10, BR-068)*

**Business Rules:**

- BR-040: Strike zone is the primary triage mechanism. These are the highest-value items requiring immediate operator attention.
- BR-041: "Needs Info" (renamed from "Verification Needed") reflects opportunities with unverified or missing operator inputs across four critical fields: titleStatus, titleInHand, lienStatus, odometerMiles. The API filter parameter remains `verification_needed`; only the UI label changes. *(Revised per UX Lead Change #6)*
- BR-042: The operator response time success metric targets median < 4 hours from inbox to qualifying/rejected.
- BR-068: **Results footer bar data source.** The dashboard Results footer bar displays `COUNT(*)` and `SUM(final_price)` from opportunities where `status = 'won'`. This is not realized profit -- it is total acquisition value. Full P&L visibility requires the `sold_price` field (PM ADR-003) and is Phase 1. *(Added per UX Lead Change #10, Target Customer request)*

**Out of Scope:**

- Historical trend charts for dashboard metrics
- Customizable dashboard layout
- Full P&L Results display (Phase 1, requires outcomes tracking)

---

## Acceptance Criteria Summary

All acceptance criteria above are designed to be binary pass/fail. Each criterion references a specific API behavior, data condition, or UI state that can be verified through automated testing or manual inspection. No criterion requires subjective judgment. Round 3 adds 5 new acceptance criteria (AC-002.8, AC-003.2 revision, AC-009.6, AC-010.4, AC-012.6) and revises 6 existing criteria to reflect cross-role convergence.

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
| BR-065 | **Verdict thresholds use AND for BUY.** Both `min_profit` AND `min_margin` must be met for BUY. EITHER triggers WATCH. Neither triggers PASS. Requires backtest before deployment. | PM ADR-006, Target Customer, Technical Lead ADR-007 |

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
| BR-059 | State machine does not allow `inbox` -> `bid`. Minimum path is 3 transitions. This is by design. | `@dfg/types` STATE_TRANSITIONS |
| BR-062 | Batch reject uses a single `rejection_reason` for all items. | `opportunities.ts` line 873 |
| BR-063 | Kill Switch Banner must not auto-redirect away from detail page. | Target Customer, UX Lead Change #7 |
| BR-067 | Inspect shortcut from inbox: two sequential PATCH calls (inbox->qualifying, qualifying->inspect) in one user action. Both create full audit records. Failure on second call leaves opportunity in qualifying. | UX Lead Change #8 |

### Scoring and Analysis Rules

| ID | Rule | Source |
|----|------|--------|
| BR-003 | Score bands: high >= 70, medium 40-69, low < 40. | `opportunities.ts` line 209-217 |
| BR-048 | AI verdict mapping: STRONG_BUY/BUY -> BID (if gates clear AND both thresholds met per BR-065) or WATCH; MARGINAL -> WATCH; PASS -> PASS. *(Revised per BR-065)* | `opportunities.ts` line 1529-1546 |
| BR-049 | Gate-based fallback: if AI unavailable, allCriticalCleared -> BID, criticalOpen <= 2 -> WATCH, else NEEDS_INFO. | `opportunities.ts` line 1540-1546 |
| BR-050 | Bid readiness: `DO_NOT_BID` for PASS economics, confirmed deal breakers, or salvage/missing title. `NOT_BID_READY` for missing auction end time or unverified title/mileage. `BID_READY` when economics work and all gates cleared. | `calculation-spine.ts` evaluateBidReadiness() |
| BR-051 | Confidence breakdown has 4 dimensions: price, title, condition, timing. Each scored independently. Overall score 0-5. | `calculation-spine.ts` evaluateConfidenceBreakdown() |
| BR-066 | Gate-only fallback analysis must be visually distinguishable from AI-powered analysis in the UI. | Target Customer |

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
| BR-061 | Reject modal completable in 2 taps on mobile (select reason, confirm). Legacy dropdown removed. Multi-select taxonomy grid is sole mechanism. | Target Customer, UX Lead Change #1, PM ADR-007 |
| BR-064 | Photo lightbox supports swipe gesture between photos (left/right). UX Lead specified touch event handlers with `touch-action: pan-y`. | Target Customer, UX Lead Change #4 |

### Dashboard Rules

| ID | Rule | Source |
|----|------|--------|
| BR-068 | Results footer bar shows won count and `SUM(final_price)` for won opportunities. This is acquisition value, not profit. | UX Lead Change #10, Target Customer |

### Data Integrity Rules

| ID | Rule | Source |
|----|------|--------|
| BR-056 | All SQL queries must use `.bind()` parameterization. No template literal interpolation in SQL. | CLAUDE.md |
| BR-057 | R2 snapshots are immutable. New data creates a new key; existing keys are never overwritten. | CLAUDE.md |
| BR-058 | MVC events are immutable. Once emitted, events cannot be modified or deleted. | Product Principle #7 |

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

**Expected Behavior:** Analysis completes with `aiAnalysisResult = null`. Gate-based fallback recommendation is used. `max_bid_low` and `max_bid_high` remain at their existing values (which may be null if never analyzed). The UI displays the opportunity without max bid values and shows the gate-based recommendation with a visible "Gates only (AI unavailable)" indicator per BR-066. The Next Action Card degrades gracefully when AI analysis is unavailable. *(Revised per Target Customer, UX Lead)*

**Risk:** Medium. Operator has less information for decision-making.

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

**Expected Behavior:** The scout run partially succeeds. Sierra listings are ingested normally. IronPlanet listings are missed. The dashboard scout health banner (AC-010.4) will display a warning if no successful run has occurred in 30 minutes. Depending on the PM's decision to fix or disable the IronPlanet adapter, this may be an expected state.

**Risk:** High. This is an active issue (IronPlanet capture rate is ~17%). The PM has elevated to P0: fix or disable.

### EC-011: Photo Array Format Inconsistency

**Scenario:** The `photos` field on an opportunity is stored as a JSON string in D1 but the frontend expects an array.

**Expected Behavior:** The frontend handles this with a defensive parse: if `photos` is a string, it attempts `JSON.parse()`; if that fails, it falls back to an empty array. The backend always calls `parseJsonSafe(row.photos) || []`.

**Risk:** Low. Both client and server handle the inconsistency.

### EC-012: Analysis Run with Zero Bid Amount

**Scenario:** An opportunity has `current_bid = 0` or null when analysis is triggered.

**Expected Behavior:** The `total_all_in` calculation sets to `0 * 1.15 = 0` (or handles null). In `buildCalculationSpine`, if `bidAmount = 0`, `buyerPremium = 0`, margins are `0`, and `totalAllIn = transport + repairs + otherFees`. The AI analysis may still produce a max bid recommendation based on estimated value.

**Risk:** Medium. Zero bid is valid for auctions that have not started. The calculation spine handles it, but the UI should clarify that numbers are based on a $0 starting bid.

### EC-013: tuning_events CHECK Constraint Rejects 'status_change' Event Type (BUG)

**Scenario:** An opportunity triggers auto-rejection via hard gate failure (e.g., salvage title confirmed). The code at `opportunities.ts` line 1278 attempts to insert a `tuning_events` record with `event_type: 'status_change'`.

**Expected Behavior (CURRENT -- BROKEN):** The INSERT fails because the D1 `tuning_events` table CHECK constraint (migration 0001, line 158-160) only allows: `'rejection', 'win', 'loss', 'score_override', 'time_in_stage'`. The value `'status_change'` is not in this list. Depending on D1 error handling, this either (a) throws an error that may be swallowed by a try/catch, causing the auto-rejection tuning signal to be silently lost, or (b) causes the entire auto-rejection flow to fail.

**Resolution Options (both valid):**
- **Option A (code fix, no migration):** Change the code to use `event_type: 'rejection'` with `auto_rejected: true` in `signal_data`. Semantically correct -- auto-rejection IS a rejection.
- **Option B (migration fix):** Deploy Technical Lead's migration 0008, which rebuilds `tuning_events` with `'status_change'` added to the CHECK constraint. More honest labeling but requires migration.

**Recommendation:** Implement whichever ships first. Both resolve the silent data loss. Option A is simpler and can be deployed immediately. Option B is part of a broader migration that also adds the `listing_id` UNIQUE constraint (also important).

**Risk:** P0. This is a data integrity bug that silently loses tuning signals for auto-rejections. *(Confirmed by all technical roles)*

### EC-014: Dashboard Quick-Pass Creates Invalid Rejection (RESOLVED)

**Scenario:** The operator uses the inline "Pass" action on the Attention Required dashboard list. This action rejects the opportunity with `rejection_reason='other'` as default.

**Expected Behavior (ISSUE):** If the quick-pass path sends `rejection_reason='other'` without a `rejection_note`, the backend validation at line 888-889 rejects it with 400: `'rejection_note required when reason is other'`. The quick-pass action fails silently.

**Resolution:** Change the quick-pass default reason from `'other'` to `'missing_info'` (or another non-"other" reason code that does not require a note). This avoids the validation failure while still providing a meaningful tuning signal.

**Risk:** Medium. Requires frontend change. The Target Customer also suggested a 5-second undo toast as an alternative safety mechanism, which is a UX Lead decision.

### EC-015: Inspect Shortcut Partial Failure (NEW)

**Scenario:** The operator taps the "Inspect" shortcut from `inbox` status. The UI sends two sequential PATCH calls: inbox -> qualifying, then qualifying -> inspect. The first succeeds, but the second fails (e.g., network error, server error, unexpected state).

**Expected Behavior:** The opportunity is left in `qualifying` status. The first transition's audit records (operator_actions, MVC events) are persisted. The UI displays an error indicating the second transition failed and the opportunity is now in `qualifying` status. The operator can manually advance to `inspect` or take another action.

**Risk:** Low. The state machine remains consistent. The operator has a valid opportunity in `qualifying` with full audit trail. The UX should be clear that a partial advance occurred.

---

## Open Questions

| ID | Question | Impact | Status |
|----|----------|--------|--------|
| OQ-001 | ~~Verdict threshold OR vs AND logic~~ | ~~Critical~~ | **RESOLVED (Round 3).** PM decided AND logic for BUY (ADR-006). Formalized as BR-065. Requires backtest before deployment. |
| OQ-002 | ~~tuning_events CHECK constraint~~ | ~~P0~~ | **RESOLVED (Round 2).** Promoted to EC-013 (confirmed bug). Technical Lead wrote migration 0008. |
| OQ-003 | The stats endpoint `last_scout_run` and `last_ingest` are both `null` (TODO). Without these, the operator cannot verify pipeline health from the dashboard. What is the timeline for implementation? | P0 | **PARTIALLY RESOLVED.** All roles agree this is P0. Technical Lead added observability NFRs. Implementation timeline not yet committed. |
| OQ-004 | The `outcomes` table exists in schema but has no API endpoints or UI. Is `final_price` alone sufficient to validate the "realized margin >= 25%" success metric? | High | **RESOLVED (Round 3).** PM ADR-003 adds `sold_price` field to opportunities table. Combined with `final_price` and source defaults, minimum viable margin can be computed. Full outcomes UI is Phase 1. |
| OQ-005 | What happens when the operator's location changes? The `max_distance_miles` category config and `distance_miles` on opportunities are static. Does re-analysis update distance? | Low for MVP | **DEFERRED.** Single operator, fixed location for Phase 0. Per-user location preferences are Phase 1. |
| OQ-006 | The `attention` filter includes analysis_stale items (last_analyzed_at > 7 days ago). Should items that have NEVER been analyzed (`last_analyzed_at IS NULL`) also appear in the attention count? | Medium | **OPEN.** The `analysisStale` filter correctly includes NULL with `(last_analyzed_at IS NULL OR ...)` but `attention` only checks `last_analyzed_at IS NOT NULL AND ...`. Recommend aligning. |
| OQ-007 | ~~Bid entry uses browser `prompt()`~~ | ~~Medium~~ | **RESOLVED (Round 3).** Accepted for P0 founder use. UX Lead specified custom modal (Pattern 8) for Phase 1. Classified as P1 pre-beta blocker. See OQ-010 for full analysis. |
| OQ-008 | ~~Should the state machine allow inbox-to-bid shortcut?~~ | ~~High~~ | **RESOLVED (Round 3).** Target Customer retracted request. UX Lead proposed Inspect shortcut (BR-067) as compromise. Direct inbox-to-bid is NOT in Phase 0. |
| OQ-009 | ~~Default analysis tab should be Summary~~ | ~~Low-Medium~~ | **RESOLVED (Round 3).** UX Lead changed default to Summary. |
| OQ-010 | ~~`prompt()` for financial inputs~~ | ~~High~~ | **RESOLVED (Round 3).** P1 pre-beta blocker. Accepted for P0 with risk awareness. See UX Lead Pattern 8 for replacement spec. |
| OQ-011 | ~~"Verification Needed" label rename~~ | ~~Low~~ | **RESOLVED (Round 3).** Renamed to "Needs Info" per UX Lead Change #6. |

---

## Traceability Matrix

### User Stories to Features

| User Story | Feature | API Endpoint(s) | DB Tables | UI Screen(s) (Ref: UX Lead IA) |
|------------|---------|-----------------|-----------|-------------------------------|
| US-001 | Inbox review, filtering, pagination | GET /api/opportunities, GET /api/opportunities/stats | opportunities | Dashboard (`/`), Opportunities List (`/opportunities`), Filters (`/opportunities/filters`) |
| US-002 | Opportunity detail view | GET /api/opportunities/:id | opportunities, analysis_runs, operator_actions, sources | Opportunity Detail (`/opportunities/[id]`) |
| US-003 | AI analysis on demand | POST /api/opportunities/:id/analyze | analysis_runs, opportunities | Opportunity Detail: Analyze button, TabbedAnalysis (default: Summary), NextActionCard |
| US-004 | Workflow state machine | PATCH /api/opportunities/:id, POST /api/opportunities/:id/actions, POST /api/events | opportunities, operator_actions, mvc_events | Opportunity Detail: Fixed bottom action bar (with Inspect shortcut for inbox) |
| US-005 | Watch system | PATCH /api/opportunities/:id (to watch), POST /api/triggers/check | opportunities, operator_actions | Opportunity Detail: Watch action, Dashboard: Watching count |
| US-006 | Structured rejection | PATCH /api/opportunities/:id (to rejected) | opportunities, operator_actions, tuning_events, mvc_events | Opportunity Detail: Reject modal (streamlined 6-code grid + expandable taxonomy) |
| US-007 | Batch operations | POST /api/opportunities/batch | opportunities, operator_actions, tuning_events | Opportunities List: Batch action UI |
| US-008 | Operator inputs / gate clearance | PATCH /api/opportunities/:id/inputs | opportunities, operator_actions | Opportunity Detail: Title Info card, Gates Display card, Kill Switch Banner (inline, no redirect) |
| US-009 | Outcome tracking | PATCH /api/opportunities/:id (to won/lost) | opportunities, outcomes (Phase 1) | Opportunity Detail: Won/Lost buttons, Financial input modal (Phase 1) |
| US-010 | Pipeline health monitoring | GET /api/opportunities/stats | sources, scout_runs | Dashboard: Stats, Scout health banner, Sources (`/sources`) |
| US-011 | Staleness detection | GET /api/opportunities (staleness filters), GET /api/opportunities/:id | opportunities, analysis_runs | Opportunity Detail: Staleness Banner, Dashboard: Attention Required |
| US-012 | Dashboard attention summary | GET /api/opportunities/stats, GET /api/dashboard/attention | opportunities | Dashboard: Attention Required list, Quick Stats grid, Ending Soon list, Results footer bar |

### User Stories to Success Metrics

| User Story | Success Metric | Target | Measurement |
|------------|---------------|--------|-------------|
| US-001 | Opportunities surfaced per day | >= 15 qualified | Count of non-rejected/archived opportunities created today |
| US-003, US-006 | Analysis accuracy (operator agreement) | >= 70% BID recs result in operator bid/watch | MVC events: decision_made where analyst_verdict=BID |
| US-003, US-006 | False positive rate | <= 30% of score > 80 get rejected | Rejection rate of high-score opportunities |
| US-004, US-012 | Operator response time | Median < 4 hours inbox to qualifying/rejected | status_changed_at delta |
| US-010 | Scout uptime | >= 95% runs succeed | scout_runs success rate |
| US-010 | Scout failure detection latency | < 4 hours from failure to operator awareness | Time between last successful scout run and operator notification (PM new metric) |
| US-003 | Analysis latency | p95 < 45 seconds (end-to-end), < 30s (API call) | listing.created_at to opportunity.last_analyzed_at |
| US-009 | Won deals per month | >= 2 acquisitions | Opportunities with status=won |
| US-009 | Realized margin | >= 25% average | `(sold_price - acquisition_cost) / acquisition_cost * 100` using `final_price` + `sold_price` fields (PM ADR-003) |

### User Stories to Business Rules

| User Story | Business Rules |
|------------|---------------|
| US-001 | BR-001, BR-002, BR-003 |
| US-002 | BR-004, BR-005, BR-006 |
| US-003 | BR-007, BR-008, BR-009, BR-010, BR-011, BR-047, BR-048, BR-049, BR-065, BR-066 |
| US-004 | BR-012, BR-013, BR-014, BR-059, BR-067 |
| US-005 | BR-015, BR-016, BR-017, BR-060 |
| US-006 | BR-018, BR-019, BR-020, BR-021, BR-061 |
| US-007 | BR-022, BR-023, BR-024, BR-025, BR-062 |
| US-008 | BR-026, BR-027, BR-028, BR-029, BR-063 |
| US-009 | BR-030, BR-031, BR-032, BR-033 |
| US-010 | BR-034, BR-035, BR-036 |
| US-011 | BR-037, BR-038, BR-039 |
| US-012 | BR-040, BR-041, BR-042, BR-068 |

### User Stories to Kill Criteria

| Kill Criterion | Related User Stories | Detection Method | Measurability Status |
|---------------|---------------------|-----------------|---------------------|
| Zero profitable acquisitions in 90 days | US-009 | `SELECT COUNT(*) FROM opportunities WHERE status='won' AND created_at > datetime('now', '-90 days')` | Measurable now |
| Sustained negative margins < 10% | US-009 | `(sold_price - acquisition_cost) / acquisition_cost * 100` using final_price + sold_price | Measurable after `sold_price` field added (PM ADR-003) |
| Operator abandonment | US-001, US-004 | `SELECT COUNT(*) FROM operator_actions WHERE created_at > datetime('now', '-7 days')` -- activity-based, not login-based (hardcoded auth has no session tracking) | Measurable now via operator_actions (PM revision) |
| Scout data staleness > 50% expired on first view | US-010 | Compare `auction_ends_at` to first `operator_actions` timestamp per opportunity | Measurable now |
| Analysis disagreement > 60% over 60 days | US-003, US-006 | MVC events: `decision_made` where analyst_verdict=BID but operator decision=PASS | Measurable now |
| Scout failure goes undetected > 4 hours (NEW) | US-010 | Time between last successful scout run and operator notification | Measurable after scout failure alerting implemented (P0) |

### User Stories to Technical Risks (Ref: Technical Lead)

| User Story | Technical Risks |
|------------|----------------|
| US-003 | R2 (Analyst timeout under Claude API load), R1 (D1 concurrent write -- optimistic lock handles analysis path), R11 (tuning_events CHECK constraint -- P0 fix) |
| US-004 | R1 (D1 concurrent write -- PATCH endpoint lacks optimistic lock; accept for single-operator MVP), R9 (prompt() for bid entry -- P1 pre-beta blocker) |
| US-005 | R8 (Watch trigger latency -- up to 5 min late; acceptable with 4-hour default threshold) |
| US-009 | R9 (prompt() for won entry -- P1 pre-beta blocker) |
| US-010 | R6 (Auction data freshness -- up to 15 min stale from scout cron interval), R10 (Platform access revocation -- IronPlanet/RB Global risk) |
| US-001, US-002 | R5 (No rate limiting -- accept for MVP with single operator) |

---

## MVP Phase 0 Gaps (Final Prioritization)

The following gaps were identified through codebase analysis and three rounds of cross-role review. Priorities reflect final consensus across all 6 roles.

| Gap | Priority | User Story | Impact | Status |
|-----|----------|-----------|--------|--------|
| `tuning_events` CHECK constraint rejects `'status_change'` inserts (EC-013) | **P0** | US-008 | Auto-rejection tuning signals silently lost | Technical Lead wrote migration 0008. Either migration or code fix resolves. |
| Scout failure alerting absent | **P0** | US-010 | Operator discovers stale data by observation only | Unanimous across all roles. Minimum: in-app banner when last run > 30 min. |
| `last_scout_run` returns null on stats | **P0** | US-010 | Cannot monitor pipeline health from dashboard | Must implement to enable scout health banner. |
| Verdict threshold uses OR logic (OQ-001 / BR-065) | **P0** | US-003 | BUY recommendations on low-margin deals | PM decided AND logic (ADR-006). Requires backtest + code change. |
| IronPlanet capture rate ~17% -- fix or disable | **P0** | US-010 | Deceptive "active" source at 17% capture | PM: fix to >= 80% or disable source and remove from Sources page. |
| Auth on analyst endpoints (Issue #123) | **P0** | N/A (security) | API bill exposure from unauthenticated analyst calls | PM/Technical Lead: verify ANALYST_SERVICE_SECRET enforcement. |
| Add `sold_price` field to opportunities | **P1** | US-009 | Cannot validate realized margin success metric in-app | PM ADR-003: simple migration, minimal effort. |
| Bid/Won entry uses browser `prompt()` | **P1** (pre-beta blocker) | US-004, US-009 | No input validation for most consequential financial inputs | UX Lead Pattern 8 specifies replacement. Required before Phase 1. |
| Dashboard quick-pass uses 'other' reason (EC-014) | **P1** | US-012 | Inline reject action fails backend validation | Change default reason to `missing_info` or similar. |
| Outcome tracking has no UI | **P1** | US-009 | Cannot track P&L in-app (spreadsheet acceptable for P0) | PM: Phase 1 feature. |
| Reject flow dual-select (legacy + taxonomy) | **P1** | US-006 | Unnecessary complexity, operator confusion | PM ADR-007: remove legacy dropdown. Phase 1 or opportunistic. |
| Auth is hardcoded | **P1** (pre-beta blocker) | N/A (security) | No session tracking for kill criteria | PM: Clerk + Stripe for Phase 1. |
| `attention` filter excludes never-analyzed items (OQ-006) | **P2** | US-011, US-012 | Items that have never been analyzed are missed in attention count | Align `attention` filter to include `last_analyzed_at IS NULL`. |
| No frontend tests | **P2** | All UI stories | UI regressions undetected | Technical Lead: accept for founder-only use. |
| Checkbox touch targets below 44px on Filters page | **P2** | US-001 | iOS Safari touch target violation | Label wrapper provides mitigation. |
| 3 failing scout tests | **P2** | US-010 | Tech debt | Technical Lead: fix before adding more tests. |

---

## Cross-Role Reference Index (Final)

This index maps concerns raised by other roles across all 3 rounds to the business analysis artifacts that address them.

| Role | Concern | Addressed In | Resolution Status |
|------|---------|-------------|------------------|
| Target Customer | Reject flow too heavy | BR-061, US-006 AC-006.4, PM ADR-007 | Resolved: multi-select grid only, legacy dropdown removed |
| Target Customer | Cannot jump from inbox to bid | BR-059, BR-067, US-004 AC-004.8 | Resolved: Inspect shortcut compromise; direct inbox-to-bid deferred |
| Target Customer | Scout failure alerting should be P0 | BR-035, US-010 AC-010.4 | Resolved: P0 (unanimous), in-app banner specified |
| Target Customer | IronPlanet capture rate unacceptable | BR-036, EC-010 | Resolved: PM elevated to P0 (fix or disable) |
| Target Customer | "Verification Needed" label unclear | BR-041 revised | Resolved: renamed "Needs Info" (UX Lead) |
| Target Customer | Photo swipe gesture missing | BR-064, US-002 AC-002.3 | Resolved: UX Lead specified swipe lightbox |
| Target Customer | Kill Switch Banner should not auto-redirect | BR-063, US-008 | Resolved: inline banner, no redirect (UX Lead) |
| Target Customer | Batch reject with single reason for all items | BR-062 | Confirmed: existing behavior, documented |
| Target Customer | Verdict threshold OR logic produces bad recs | BR-065, PM ADR-006 | Resolved: AND logic confirmed |
| Target Customer | `prompt()` for financial inputs | US-009 AC-009.5 | Resolved: P1 pre-beta blocker, accepted for P0 |
| Target Customer | Gate-only fallback should be visually distinct | BR-066, US-003 AC-003.6 | Resolved: visible indicator required |
| Target Customer | Wants profit visibility on dashboard | BR-068, US-012 AC-012.6 | Resolved: Results footer bar with won count + value |
| UX Lead | Default analysis tab should be Summary | US-002 AC-002.6 | Resolved: Summary is default |
| UX Lead | `prompt()` for financial inputs is a design risk | US-009 AC-009.5, gaps table | Resolved: P1 pre-beta blocker |
| UX Lead | Dashboard quick-pass uses "other" reason with no note | EC-014, US-012 AC-012.5 | Resolved: change default to non-"other" reason |
| UX Lead | No undo for destructive actions | Out of scope | Deferred: accept risk for founder use |
| UX Lead | Checkbox touch targets below 44px | Gaps table (P2) | Tracked: label wrapper mitigates |
| UX Lead | "Last updated" timestamp needed | US-001 AC-001.3, US-002 AC-002.8 | Resolved: added to cards and detail header |
| UX Lead | Inspect shortcut from inbox | BR-067, US-004 AC-004.8, EC-015 | Resolved: two-step auto-advance with error handling |
| UX Lead | Results footer bar for won deals | BR-068, US-012 AC-012.6 | Resolved: added to dashboard IA |
| Technical Lead | Performance budgets as testable criteria | AC-001.6, AC-002.7, AC-003.10 | Resolved: embedded in acceptance criteria |
| Technical Lead | Watch trigger latency (5-min cron) | BR-060 | Documented: acceptable with 4-hour default |
| Technical Lead | D1 concurrent write risks | Technical Risks table | Documented: accept for single-operator MVP |
| Technical Lead | No optimistic lock on PATCH endpoint | Technical Risks table | Documented: accept for MVP, add before Phase 1 |
| Technical Lead | tuning_events CHECK constraint (migration 0008) | EC-013 | Resolved: migration written, P0 |
| Technical Lead | listing_id UNIQUE constraint (migration 0008) | Ingest behavior change documented | Resolved: migration written |
| Technical Lead | Two-tier analysis latency target | US-003 AC-003.10, BR-011 | Resolved: 30s API + 45s end-to-end |
| Technical Lead | D1 binding name inconsistency | Noted in architecture context | Informational: not a bug |
| Technical Lead | Outcomes table schema ownership (ADR-006) | US-009 BR-031 | Resolved: Option C for MVP, Option A for Phase 1 |
| Competitor Analyst | Alert speed gap (15-min cron) | Out of scope for MVP | Accepted: auction timescales make 15-min adequate |
| Competitor Analyst | Native app UX advantage | Out of scope (CLAUDE.md: web app on iOS Safari) | Accepted: deliberate architectural choice |
| Competitor Analyst | Shallow moat / replicable technology | Noted for PM strategic awareness | Accepted: moat is operational knowledge + business rules |
| Competitor Analyst | Swoopa Dealers convergence | Noted for PM strategic awareness | Accepted: DFG's niche (trailers/equipment, auction platforms) remains distinct for now |
| Competitor Analyst | Platform access revocation risk | Technical Lead R10, BR-036 | Documented: adapter architecture isolates risk; diversify sources in Phase 1 |
| PM | ADR-003 outcome tracking depth | US-009, BR-031, AC-009.6 | Resolved: add `sold_price` field for minimum viable outcome tracking |
| PM | ADR-006 verdict threshold logic | BR-065 | Resolved: AND logic confirmed |
| PM | ADR-007 reject flow simplification | BR-061, US-006 AC-006.4 | Resolved: remove legacy dropdown, use taxonomy grid |
| PM | Kill criteria detection methods | Kill Criteria table (revised) | Resolved: activity-based measurement instead of login-based |
| PM | Scout failure detection latency metric | Success Metrics table (added) | Added: < 4 hours, measurable after alerting implemented |

---

## Unresolved Issues

| ID | Issue | Impact | Owner | Notes |
|----|-------|--------|-------|-------|
| UI-001 | OQ-006: The `attention` filter does not include opportunities that have NEVER been analyzed (`last_analyzed_at IS NULL`). The `analysisStale` filter includes them, but `attention` does not. This means a new opportunity that sits in qualifying for 24+ hours without ever being analyzed will show in `analysisStale` but not in `attention`. | Medium -- missed items in the highest-priority dashboard view | Engineering (API) | Recommend aligning `attention` to include `last_analyzed_at IS NULL` items. Simple SQL change. No business rule conflict. |
| UI-002 | The Inspect shortcut (BR-067) executes two sequential server calls. There is no specification for what happens if the user navigates away mid-sequence (e.g., taps back during the 2-step transition). Should the UI block navigation during the auto-advance? | Low -- edge case for a fast operation | Engineering (Frontend) | Recommend disabling the back button / navigation during the auto-advance sequence and showing a loading state. |
| UI-003 | The PM and Target Customer disagree on the priority of scout failure push notification (outbound SMS/webhook). The PM lists ADR-002 Part A as P0 (outbound notification within 15 minutes of failure). The Target Customer says the in-app banner is sufficient for P0 and push can wait for Phase 1. The Technical Lead's observability NFRs only cover the in-app indicator. | Medium -- the in-app banner only works if the operator opens the app. If the scout fails on a Friday evening and the operator does not open the app until Monday, the in-app banner does not help. | PM (decision needed) | The PM should clarify whether P0 scope includes outbound notification or only the in-app banner. The Target Customer's "red banner on dashboard" request is the minimum. The PM's "notification within 15 minutes" implies outbound. These are different implementation scopes. |
| UI-004 | The Results footer bar (BR-068) shows `SUM(final_price)` for won deals, which is total acquisition cost, not profit. The Target Customer asked for "Total Profit: $X,XXX" which requires `sold_price` data that does not exist yet. There is a risk the operator misinterprets the "total won value" number as profit. | Low -- the operator understands the difference, but the label must be unambiguous | Engineering (Frontend) | The label must say "Total Won Value" or "Total Acquisitions" -- not "Total Profit." The UX Lead's spec says "Won count and total won value" which is correct. Verify the frontend label matches. |
| UI-005 | The backtest requirement for BR-065 (AND-logic verdict thresholds) has no owner or timeline. The PM, Target Customer, and Technical Lead all agree the change should happen, but all three also say it requires backtesting against historical data before deployment. Who runs the backtest, on what dataset, and what is the pass criterion? | High -- this is a P0 item that cannot deploy without the backtest | PM + Engineering | Recommend: (1) query all historical `analysis_runs` where recommendation was BID, (2) recompute recommendation using AND logic, (3) identify deals that would have been downgraded from BID to WATCH, (4) check if any of those were won deals with positive outcomes. If fewer than 10% of historically won deals would have been missed, the change is safe. |

# UX Lead Contribution -- PRD Review Round 3 (Final)

**Author:** UX Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Final after 3 rounds

---

## Changes from Round 2

1. **Elevated financial input modal from Phase 1 to MVP scope and finalized the specification.** Round 2 specified the custom modal but the PM's Phase 0 remaining work table still listed "Replace browser `prompt()` for bid/won entry" as Phase 1. The Target Customer escalated this in Round 2: "This should be P0 for MVP, not Phase 1." The Business Analyst added OQ-010 documenting the data integrity risk. The Technical Lead added R9 tracking the concern. All six roles now agree this is a money-math-correctness issue (PM Principle #1), not a cosmetic UX issue. Final position: the financial input modal specification in this document is authoritative for MVP implementation. The PM's Phase 0 table should be updated to include this item. If the PM maintains Phase 1 classification, this document records the unanimous cross-role recommendation to override that classification.

2. **Elevated photo lightbox swipe to MVP scope.** Round 2 documented swipe as a UX improvement (Change #4). The Target Customer reiterated the request in Round 2: "I want swipe left-right to move between photos, same as any image viewer." The Business Analyst classified this as P2 (BR-064). The Technical Lead noted this is a UX change with no architecture impact. The implementation is lightweight (touch event handlers for horizontal swipe, CSS `touch-action: pan-y`). Given the Target Customer's emphasis and the minimal technical cost, this is reclassified from Phase 1 to MVP. If engineering bandwidth is constrained, swipe is the first item to defer -- but the specification is complete and ready for implementation.

3. **Added gate-only analysis indicator per Target Customer Round 2 feedback.** The Target Customer raised a new concern in Round 2: "If I am looking at a recommendation and it was generated without the AI (gate-only), I need a visible indicator. Do not show me a recommendation and let me think Claude evaluated it when it did not." The Technical Lead documented the 25-second analyst timeout with gate-only fallback (AC-003.6). The Business Analyst's BR-049 specifies the gate-based fallback logic. Revision: the Next Action Card now includes an "Analysis source" label -- "AI-powered analysis" (default) or "Estimate only -- AI unavailable" (when `aiAnalysisResult` is null on the analysis run). The latter uses an amber badge to distinguish it from a full AI evaluation.

4. **Revised dashboard quick-pass to use `missing_info` default instead of `other`.** Round 2 flagged the quick-pass action using `rejection_reason='other'` with no note, which would fail backend validation (EC-014). The Target Customer amplified: "If I accidentally tap Pass on a good deal, it is gone with the worst possible reason code." Three options were considered: (a) change default reason, (b) bypass validation, (c) add undo toast. Final decision: change the default reason to `missing_info` (which does not require a note) AND add a 5-second undo toast. The undo toast appears at the bottom of the Attention Required list ("Rejected [title]. Undo?") and reverses the rejection if tapped within 5 seconds. After 5 seconds, the toast auto-dismisses and the rejection is final. This satisfies both the speed requirement (one tap, no modal) and the safety requirement (reversible for 5 seconds).

5. **Added scout health banner to dashboard IA.** Round 2 documented the notification gap but did not add a concrete UI element to the dashboard IA. All six roles agreed scout failure alerting is P0. The Target Customer specified the exact requirement: "if the scout has not run successfully in the last 30 minutes, show a red banner on the dashboard." The Technical Lead noted `last_scout_run` on the stats endpoint is currently null (TODO). Revision: the dashboard IA now includes a Scout Health Banner as the topmost element, above Attention Required. It renders in two states: (a) hidden when the last successful scout run is within 30 minutes, (b) red full-width banner with text "Scout has not run since [relative time]. Deal flow may be stale." and a "Details" link to the Sources page. This requires the stats endpoint to return a valid `last_scout_run` timestamp -- the Technical Lead's P0 work item.

6. **Consolidated the reject flow specification to remove all ambiguity.** The PM's ADR-007 asked whether the reject flow should use the legacy dropdown, multi-select taxonomy, or simplified single-select. The Target Customer's Round 2 position clarified: "show me the multi-select grid only. Map the selected codes to the legacy field automatically on the backend." Round 2 UX spec described a "streamlined 6-code grid with expandable full taxonomy." Final specification: the reject modal shows a single-select grid of 6 primary reason codes (too_far, too_expensive, wrong_category, poor_condition, missing_info, other). The legacy dropdown is removed from the UI entirely. The selected code maps to the `rejection_reason` API field directly. The expandable "More reasons" section is removed for MVP to keep the modal at its simplest. The 13-code decision taxonomy (BR-019) is a Phase 1 enhancement for tuning granularity. For MVP, the 6 existing codes provide sufficient signal for the tuning algorithm (BR-020) while meeting the Target Customer's "one tap, one reason code, done" requirement.

7. **Removed the "Inspect" shortcut button from inbox action bar.** Round 2 (Change #8) added an "Inspect" button to the inbox action bar that would auto-advance through qualifying to inspect in a single server round-trip. On reflection, this creates two problems: (a) it performs two state transitions atomically, which conflicts with the Business Analyst's audit trail requirement (AC-004.5: each transition creates an operator_actions record) and the MVC event requirements (AC-004.6, AC-004.7), and (b) the Target Customer retracted the inbox-to-bid request in Round 2 and instead asked for the qualifying-to-inspect transition to be prominent when analysis exists. Revised: the inbox action bar returns to Qualify (primary), Watch (secondary), Reject (danger). No shortcut button. Instead, when an opportunity in `qualifying` status already has an analysis with a BID or WATCH recommendation, the action bar highlights "Inspect" as the primary CTA with a green emphasis color, making the fast path visually obvious without violating the state machine.

8. **Finalized the Results footer bar data source.** Round 2 (Change #10) specified the Results footer bar shows "Won count and total won value (uses `final_price` sum)." The PM's ADR-003 revision adds a `sold_price` field. For MVP, the footer uses `final_price` only (purchase price of won deals), since `sold_price` may not be populated yet. The label is revised from "Total Profit" (which the Target Customer requested but cannot be computed without `sold_price`) to "Won: N deals / $X,XXX total" where the dollar amount is `SUM(final_price)`. This avoids implying profit when it is actually showing acquisition spend. When `sold_price` is available (Phase 1), the footer upgrades to show actual profit.

9. **Added `prefers-reduced-motion` guard to specification.** Round 2 Accessibility section listed this as Gap #5 but did not include it in the interaction pattern specifications. Final position: all CSS animations in the MVP (loading spinners, menu slide-in, modal slide-up, undo toast fade) must be wrapped in a `prefers-reduced-motion` guard that reduces or eliminates motion. This is a one-line CSS addition per animation and has no UX cost for the primary operator.

---

## Target User Personas

### Persona 1: Scott -- The Founder-Operator

Scott is the sole operator of DFG and the only user today. He runs a trailer and equipment flipping business out of the Phoenix metro area. His day starts early -- checking auction listings from his phone while drinking coffee, then driving to inspect assets, then placing bids from the truck cab between lot visits. He does not sit at a desk for extended periods. His phone (iPhone, Safari) is his primary tool.

Scott's frustrations center on information overload and time pressure. Before DFG, he spent hours manually checking auction sites, opening dozens of tabs, and doing back-of-napkin math on margins. He missed good deals because he did not see them in time. He bought bad deals because he rushed the math under auction pressure. He wants a system that does the homework for him so he can focus on the judgment calls: Is this asset worth my time? Can I make money on it? What should I pay?

Scott is financially literate. He understands buyer premiums, transport costs, repair estimates, and resale margins. He does not need these concepts explained to him -- he needs them calculated correctly and presented clearly. He has zero tolerance for incorrect numbers. A wrong margin calculation does not just look bad; it costs him real money. He has strong opinions about what constitutes a good deal (minimum $600 profit, 40% margin, under $6,000 acquisition cost, within 100 miles for trailers) and these are already encoded in the system's category defaults.

His workflow is interrupt-driven. He checks the console several times a day in 2-3 minute bursts. He needs to understand the state of his pipeline instantly: What needs my attention right now? What is ending soon? What is new? He triages quickly -- most opportunities get rejected within seconds of reading the title and seeing the price. The ones that survive get deeper analysis. He rarely uses desktop unless he is doing end-of-day review.

Scott does not care about infrastructure features (MVC event logging, tuning events). He cares about the core loop: find deals, evaluate them, decide, and move on. Feature additions that do not serve this loop are clutter. He explicitly rejects complexity: "Don't add features I didn't ask for." The Competitor Analyst's finding that native app competitors (Swoopa, DealScout) deliver sub-minute alerts via push notifications is relevant here -- Scott's unmet need is knowing when the scout fails without having to open the app. For MVP, an in-app banner is sufficient; push notifications are Phase 1.

**Goals:** See what needs action immediately. Make fast, confident bid/pass decisions. Never miss a high-value opportunity. Never buy a bad deal because the math was wrong. Know when the system is broken before it costs him a deal.

**Frustrations:** Stale data (checking a listing only to find it ended yesterday). False positives (high scores on items he would never buy). Slow page loads on mobile. Having to scroll past irrelevant information to reach the decision-critical data. Too many form fields when rejecting obvious garbage. Being redirected away from a page he was reading. Not knowing whether a recommendation came from AI analysis or gate-only fallback.

### Persona 2: Future Beta Tester (Phase 1, referenced for forward compatibility only)

While not an MVP user, the Phase 1 private beta (3-5 users) is the next milestone. These users will be similar to Scott: solo operators in physical asset arbitrage, mobile-first, financially experienced, time-constrained. They will have different geographic locations (not Phoenix), different category preferences, and different risk tolerances. The Competitor Analyst's pricing benchmarks ($47-352/mo for Swoopa, $5/mo for Flipify) suggest these users will compare DFG's $149/mo price against tools with native apps and push notifications. DFG must justify the premium through analysis quality and workflow value, not alert speed or platform coverage.

The MVP architecture should not hard-code assumptions that will break when these users arrive (e.g., Phoenix-specific market data in UI labels, hardcoded filter defaults) -- but the UX should be optimized exclusively for Scott's workflow today.

---

## User Journey

The MVP user journey has two primary flows: the Daily Triage Loop and the Deep Evaluation Flow. Both are designed for the interrupt-driven, mobile-first usage pattern described in the persona.

### Flow 1: Daily Triage Loop (2-3 minutes, multiple times per day)

**Step 1: Open Console (Dashboard)**
Scott opens the app from his iPhone home screen. The Dashboard loads and immediately shows:
- Scout Health Banner (topmost element): hidden when scout is healthy (last successful run within 30 minutes); red full-width banner with "Scout has not run since [relative time]. Deal flow may be stale." and "Details" link to Sources page when scout is unhealthy. This is the first thing the operator sees to establish trust in data freshness.
- Attention Required list (priority-sorted items that need action, with inline quick actions for pass/watch/re-analyze)
- Quick Stats grid (Inbox count, Strike Zone count, Needs Info count, Qualifying count, Watching count, Bidding count)
- Ending Soon list (items with countdown timers, sorted by urgency)
- Pipeline Overview (counts by status with tap-to-filter)
- New Today indicator (deep-linked to filtered list)
- Results footer bar (Won count and total acquisition spend from won opportunities -- "Won: N deals / $X,XXX total" using `SUM(final_price)`)

This screen answers the question: "What needs my attention right now?"

Note: The "Needs Info" card (previously "Verification Needed") shows the count of opportunities missing title, lien, or mileage data, with that subtitle visible on the card. This label change addresses the operator's confusion about what "verification" means.

**Step 2: Triage Inbox (Opportunities List, status=inbox)**
Scott taps the Inbox card on the dashboard. The Opportunities List loads filtered to inbox status. Each opportunity card shows -- in signal-first order -- urgency indicators (alerts, ending soon, staleness), status badge, title, price, time remaining, distance, and a "Last updated X min ago" label (amber when older than 15 minutes). Cards are visually differentiated by score (green tint for high-score items) and urgency (left border for alerts or urgent signals).

For each item, Scott makes a snap decision: tap to investigate, or mentally skip. The list loads 50 items at a time. Active filter chips show at the top; the mobile toolbar provides quick access to Buy Box toggle and the full-page filter screen.

Filter chips on mobile are consolidated: "Needs Refresh" (combines stale, analysis_stale, and decision_stale conditions) and "Ending Soon" replace the five separate staleness-related toggles. The full filter page retains the granular API-backed filters for power use, but the quick-access chips prioritize the operator's mental model of "current vs. needs fresh look."

**Step 3: Quick Reject or Advance**
For most inbox items, Scott opens the detail page, scans the Next Action Card (verdict + reasoning + max bid + analysis source indicator), glances at the photos, and either rejects (tap Reject in the bottom action bar, select one reason code from the 6-code grid) or advances to qualifying (tap Qualify). This takes 10-30 seconds per item.

For the rare high-value item, Scott enters the Deep Evaluation Flow.

**Step 4: Return to Dashboard**
After triaging, Scott returns to the dashboard (back button or navigation) to confirm counts have changed. He checks if any Ending Soon items need immediate attention. The Scout Health Banner confirms the pipeline is still running.

### Flow 2: Deep Evaluation Flow (3-10 minutes per opportunity)

**Step 1: Opportunity Detail (from list or dashboard)**
Scott navigates to an opportunity detail page. The page loads with the opportunity's current state: status badge, source label, "Last updated X min ago" timestamp in the header, and -- if analysis has been run -- the Next Action Card prominently displayed at the top.

**Step 2: Review AI Analysis**
If no analysis exists, Scott taps "Analyze" in the header. Analysis runs (p95 under 45 seconds, per Technical Lead performance budget) and populates the tabbed analysis interface. The default tab is **Summary** (not Report), showing:
- Summary tab (default): Max bid range, retail estimate, expected profit, margin percentage, all-in acquisition cost breakdown
- Report tab: Full AI-generated report text with original listing link
- Condition tab: Graded condition assessment with red flags separated into Core Risks vs Optional Issues
- Investor tab: Investment breakdown, repair plan, verdict reasoning with price range scenarios, deal killers, inspection priorities
- Buyer tab: Target buyer profiles, demand level, price range, seasonal factors, selling points

The Next Action Card above the tabs shows the verdict-derived next action (Bid/Inspect/Pass) in large text with color coding, "Why" reasoning bullets, walk triggers (top 3 inspection priorities), the max bid (with note if 20% haircut is applied due to uncleared gates), and an analysis source indicator:
- "AI-powered analysis" (default, when `aiAnalysisResult` is present on the analysis run) -- no special badge, this is the expected state
- "Estimate only -- AI unavailable" (when `aiAnalysisResult` is null) -- amber badge, signaling that the recommendation is gate-derived, not AI-evaluated

This card is the single most important element on the page (Target Customer: "I want to open an opportunity and know in 3 seconds what I should do").

**Step 3: Review Photos**
The photo strip shows horizontal-scrolling 96x96 thumbnails. Tapping a thumbnail opens the full-screen lightbox. Within the lightbox, the operator can swipe left/right to navigate between photos. Tap anywhere outside the photo to dismiss. Keyboard users can press Escape to close or use left/right arrow keys to navigate.

**Step 4: Verify Title Information (Operator Inputs)**
For items Scott is serious about, he fills in the Title Info form: title status, title in hand, lien status, VIN, odometer. Each field has a source selector (listing, auctioneer call, in person, VIN report, seller) and a verification level (unverified, operator attested, documented, third party confirmed). Saving triggers gate computation.

If a hard gate failure is detected (e.g., salvage title confirmed), the Kill Switch Banner appears inline on the detail page. It shows the disqualification reason, a "Confirmed -- reject this opportunity" button, and a "This info may be wrong -- edit inputs" link. There is no auto-redirect. The operator stays on the page and makes the call.

**Step 5: Check Gates (Bid Readiness)**
The Gates Display card shows which critical and confidence gates have passed, failed, or remain unknown. All critical gates must pass before the system marks the opportunity as `BID_READY`. Gates update automatically when title inputs are saved. The 20% haircut on max bid when gates are NOT cleared (BR-029) is displayed as a note on the Pricing card: "Max bid reduced by 20% -- verify title and mileage to unlock full bid range."

**Step 6: Decision**
With analysis reviewed, photos checked, title verified, and gates assessed, Scott makes a decision:
- **Bid:** Tap "Set Bid." A modal slides up with: a numeric input field (pre-populated with the system's `max_bid_high` value), `inputmode="decimal"` for the iOS numeric keyboard, currency formatting preview below the input (e.g., "$2,150.00"), a clear "This is the maximum you will pay, all costs included" label, positive-value validation, and Confirm/Cancel buttons. Both buttons are 44px minimum height. On confirm, status moves to `bid` and `max_bid_locked` is set.
- **Watch:** Tap "Watch", configure trigger conditions (ending_soon with hours-before setting, time_window with specific datetime, or manual). Status moves to `watch`.
- **Reject:** Tap "Reject." The reject modal slides up showing a single-select grid of 6 reason codes (too far, too expensive, wrong category, poor condition, missing info, other) with large 44px+ tap targets. Selecting "other" requires a note. Confirm/Cancel at the bottom. Confirm is disabled until a code is selected and (if "other") a note is non-empty.
- **Won:** Tap "Won." A modal slides up with a numeric input field for the final price (same validation pattern as Set Bid -- `inputmode="decimal"`, currency formatting preview, positive-value validation), and Confirm/Cancel. Status moves to `won` with `final_price` set.
- **Lost:** Tap "Lost." A confirmation dialog asks "Mark as lost?" with Confirm/Cancel. Status moves to `lost`.

The action bar at the bottom of the detail page shows only the contextually relevant actions for the current status:
- `inbox`: Qualify (primary), Watch (secondary), Reject (danger)
- `qualifying`: Inspect (primary -- highlighted green when analysis exists with BID/WATCH recommendation), Watch (secondary), Reject (danger)
- `watch`: Inspect (primary), Qualify (secondary), Reject (danger)
- `inspect`: Set Bid (primary), Reject (danger)
- `bid`: Won (primary), Lost (danger)
- `won`/`lost`/`rejected`: Archive (secondary)

**Step 7: Staleness Loop**
If Scott changes operator inputs after running analysis, a Staleness Banner appears indicating the analysis is outdated. He can re-analyze with one tap. If he does not visit an opportunity for too long, staleness indicators appear on the Attention Required list and on the opportunity card in the list view.

---

## Information Architecture

### Screen Inventory

The MVP has 7 screens. Navigation is a sidebar on desktop (w-64, persistent) and a hamburger slide-over menu on mobile (fixed header h-14, slide-in panel w-72 from left).

#### 1. Login (`/login`)
- DFG Console branding (logo icon, title, "Internal Use Only" tagline)
- Email + password form (hardcoded credentials, prototype-grade)
- Error alert for invalid credentials
- No registration flow (founder-only)

#### 2. Dashboard (`/`)
- **Scout Health Banner (topmost):** Hidden when last successful scout run is within 30 minutes. Red full-width banner when unhealthy: "Scout has not run since [relative time]. Deal flow may be stale." with "Details" link to Sources page. Requires stats endpoint to return valid `last_scout_run` timestamp. Uses `position: sticky` at top of content area (not `position: fixed`) per CLAUDE.md guidance.
- **Attention Required card:** Priority-sorted list of items needing operator action, with rank badges (top 3 highlighted in red), reason chips (Decision Needed, Ending Soon, Stale, Re-analyze), inline quick actions (re-analyze, touch/mark reviewed, pass, watch), current bid and time remaining. Tappable rows link to detail. "View all" link when truncated. Pass action uses `rejection_reason='missing_info'` as default (not `'other'`) with a 5-second undo toast: "Rejected [title]. Undo?" at the bottom of the list. Undo reverses the rejection. After 5 seconds, the toast auto-dismisses and the rejection is final.
- **Quick Stats grid:** 2-column grid of tappable cards linking to filtered opportunity lists. Cards: Inbox (blue), Strike Zone (orange), Needs Info (purple, subtitle: "Missing title, lien, or mileage data"), Qualifying (amber), Watching (blue), Bidding (green). Counts update on refresh. Cards highlight with colored border when count > 0.
- **Ending Soon list:** Items with countdown timers sorted by auction end time, linking to detail pages.
- **Pipeline Overview card:** All 9 statuses with counts, each row links to filtered list.
- **New Today indicator:** Count of new opportunities today, links to filtered list.
- **Results footer bar:** "Won: N deals / $X,XXX total" where the dollar amount is `SUM(final_price) WHERE status='won'`. Each links to filtered list. This shows acquisition spend, not profit -- profit requires `sold_price` which is Phase 1 (ref: ADR-003). Uses `position: sticky` at bottom of content area.
- **Desktop header:** "Dashboard" title, refresh button. Mobile header provided by Navigation component.

#### 3. Opportunities List (`/opportunities`)
- **Desktop header:** Title with result count, refresh button, Buy Box quick toggle, Filters button with active count badge. Below: active filter chips row with dismiss buttons and "Clear all" (shown when 2+ filters active).
- **Mobile toolbar:** Result count, refresh, Buy Box toggle (icon only), Filters button (links to full-page filter screen).
- **Mobile active filter chips:** Dismissible chip row. Consolidated filter chips: "Needs Refresh" (combines stale + analysis_stale + decision_stale), "Ending Soon", "Strike Zone", "New Today", "Needs Info", "Attention Required".
- **Desktop filter panel:** Inline dropdown selectors (Status, Score Band, Ending Within) + toggle chips (Needs Refresh, Needs Info, Ending Soon, Attention, Strike Zone, New Today).
- **Opportunity cards list:** Signal-first cards with: thumbnail (64x64), urgency signal row (Alert/Decide Now/Ending Soon/Stale/Re-analyze badges + status badge), title with external link button, compact price/time/distance row with source label, "Last updated X min ago" label (amber when >15 min stale). Cards tinted by score band. Left border indicates alerts (red) or urgent signals (orange). Tapping navigates to detail.
- **Batch mode:** Long-press (mobile) or checkbox column (desktop) activates multi-select. Batch action toolbar appears at bottom: "Reject (N)" button. Tapping opens a single reason code selector (same 6-code grid as the detail page reject modal) that applies to all selected items. Max 50 per batch (ref: BR-023).
- **Empty state:** "No opportunities found" with clear filters button if filters are active.
- **Loading state:** Centered spinner (with `prefers-reduced-motion` guard).

#### 4. Filters (Mobile Full-Page) (`/opportunities/filters`)
- **Header:** Back button, "Filters" title, "Clear" text button.
- **Dropdown selects:** Status (all 9 statuses), Score (High/Medium/Low), Ending (24h/48h/7d).
- **Toggle section "Quick Filters":** Needs Refresh, Needs Info, Ending Soon.
- **Toggle section "Views":** Attention Required, Strike Zone, New Today.
- **Fixed bottom button:** "Apply Filters" (full-width primary button with safe area padding via `pb-safe`).

#### 5. Opportunity Detail (`/opportunities/[id]`)
- **Header:** Desktop: back button + title + "Last updated X min ago" label + Analyze button + View Listing link. Mobile: back button in Navigation, title in Navigation, Analyze button and View Listing link in header row below Navigation, "Last updated" label in header row.
- **Alerts bar:** Red background bar showing active alerts with severity badge, title, message, and dismiss button. Only visible when alerts exist.
- **Next Action Card:** Prominent card showing verdict-derived next action (Bid/Inspect/Pass) in large text with color coding (green/yellow/red). "Why" section with up to 3 bullet points. "Walk Triggers" section with top 3 inspection priorities. Max Bid display (with note if 20% haircut is applied due to uncleared gates). Analysis source indicator: no badge for AI-powered analysis; amber "Estimate only -- AI unavailable" badge when `aiAnalysisResult` is null (gate-only fallback per BR-049). Staleness warning if analysis is old. Empty dashed-border placeholder when no analysis exists.
- **Staleness Banner:** Yellow banner when analysis is outdated (due to operator input changes or time), with "Re-analyze" button.
- **Kill Switch Banner:** Red banner for hard deal-breaker conditions detected from operator inputs. Shows disqualification reason inline. Two actions: "Confirmed -- reject this opportunity" (completes rejection) and "This info may be wrong -- edit inputs" (scrolls to Title Info form). No auto-redirect.
- **Analysis Error card:** Red-bordered card shown when analysis API call fails. No automatic retry -- operator must re-trigger.
- **Tabbed Analysis:** 5-tab horizontal scrolling tab bar (Summary, Report, Condition, Investor, Buyer). Default tab: Summary. Each tab has distinct content as described in User Journey Flow 2, Step 2.
- **Photo strip:** Horizontal scrolling row of 96x96 thumbnail buttons. Tapping opens full-screen lightbox overlay with swipe navigation between photos. Tap outside photo or press Escape to dismiss. Left/right swipe or arrow keys to navigate.
- **Status + Score card:** Current status badge, source label, buy_box_score with score band indicator.
- **Bid Readiness (Gates Display) card:** Critical gates section (title status, title in hand, lien status, mileage) and Confidence gates section (VIN). Each gate shows pass/fail/unknown icon with reason text. Summary banner (green if all critical passed, red if not) with pass count. If not BID_READY, note: "Max bid reduced by 20% until gates clear."
- **Title Info card:** Operator input form with 5 fields (Title Status, Title In Hand, Lien Status, Odometer, VIN). Each field has source selector and verification level dropdown. "Unsaved" badge when dirty. Save button (disabled when clean).
- **Required Exit Calculator:** Shows minimum sale price needed to break even based on current all-in cost. Uses canonical money math (ref: CLAUDE.md).
- **Pricing card:** Current bid, suggested max bid range (low/high), operator's locked max bid (if set), estimated fees with buyer premium breakdown.
- **Timing card:** Auction end (relative + absolute time, red if ending soon), distance in miles, pickup deadline if available.
- **Description card:** Full listing description (pre-wrapped text).
- **Analysis Summary card:** Scout-level analysis summary text with "Analyzed X ago" timestamp.
- **History card:** Most recent 10 actions with type, status transition, and relative timestamp.
- **Decision History card:** MVC event audit trail showing BID/PASS decisions with score context and relative timestamps.
- **Fixed bottom action bar:** Contextual action buttons based on current status (see User Journey Flow 2, Step 6 for full mapping). All buttons have 44px minimum height for iOS touch targets. `pb-safe` applied for safe area inset.
- **Set Bid Modal:** Slides up from bottom. Numeric input field with `inputmode="decimal"` pre-populated with `max_bid_high`. Currency formatting preview below input (e.g., "$2,150.00"). "Maximum all-in cost" label. Positive value validation (rejects zero, negative, non-numeric, values with currency symbols or commas -- strip formatting before validation). Confirm + Cancel buttons. 44px minimum button height. `pb-safe` on modal container.
- **Won Modal:** Same pattern as Set Bid Modal for final price entry. Label reads "Final purchase price."
- **Reject Modal:** Slides up from bottom. Single-select grid of 6 reason codes (too_far, too_expensive, wrong_category, poor_condition, missing_info, other) with large tap targets (min 44x44px each). "Other" requires notes textarea. Cancel + "Confirm Rejection" buttons. Confirm disabled until a code is selected and (if "other") note is non-empty. No legacy dropdown. No expandable taxonomy section. The 6 codes map directly to the `rejection_reason` API field.
- **Photo Lightbox:** Fixed full-screen overlay with 90% black background. Image displayed at max dimensions with `object-contain`. Swipe left/right to navigate between photos (using `touchstart`/`touchmove`/`touchend` event handlers with `touch-action: pan-y` on the container). Photo counter "3 of 12" shown at top. Tap outside image to dismiss. Escape key to dismiss. Arrow keys to navigate. `prefers-reduced-motion` guard on transition animations.

#### 6. Sources (`/sources`)
- **Header:** Desktop: "Sources" title + "Run Scout" button. Mobile: full-width "Run Scout Now" button below navigation.
- **Trigger message card:** Blue-bordered feedback card shown after triggering scout run.
- **Active Sources section:** Section header with count. Source cards showing: enabled indicator (green checkmark), display name, buyer premium percentage, pickup days, last run relative time, external link to source website.
- **Disabled Sources section:** Same layout with gray styling.
- **Info card:** Explanatory text about what sources are and how scout runs work.

#### 7. Settings (`/settings`)
- **Auction Sources card:** List of sources with display name, buyer premium, pickup days, last run time, and enabled/disabled toggle button.
- **API Configuration card:** API URL (from env), auth status indicator.
- **About card:** Version number, environment.

### Navigation Structure

**Primary navigation items (4):**
1. Dashboard (`/`) -- LayoutDashboard icon
2. Opportunities (`/opportunities`) -- Search icon
3. Sources (`/sources`) -- Database icon
4. Settings (`/settings`) -- Settings icon

**Navigation behavior:**
- Desktop: Persistent left sidebar (w-64), sticky to viewport, logo at top, nav items mid, version footer at bottom.
- Mobile: Fixed top header (h-14) with hamburger/back button (left), logo or page title (center), placeholder right slot (w-10). Hamburger opens a slide-over panel (w-72) from left with backdrop, same nav items in larger touch targets (py-3), close button, version footer with safe area padding.
- Detail pages: Mobile header shows back arrow instead of hamburger, page title instead of logo.
- Route changes auto-close mobile menu. Escape key closes menu. Body scroll locked when menu is open.
- All menu animations guarded by `prefers-reduced-motion`.

---

## Interaction Patterns

### Pattern 1: Status Transitions (Opportunity Lifecycle)

The opportunity lifecycle is a directed graph with 9 states. The UI enforces valid transitions by showing only contextually appropriate action buttons.

**State machine** (from Technical Lead, ref: BR-012):
```
inbox --> qualifying --> inspect --> bid --> won
  |           |            |          |
  +--> watch <-+            |          +--> lost
  |                         |
  +--> rejected <-----------+
         |
         +--> archived <-- won, lost
```

**Transition triggers:**
- Button tap in fixed bottom action bar (all status changes)
- Custom modal with validated numeric input for Set Bid (`max_bid_locked`) and Won (`final_price`). These modals include `inputmode="decimal"` for iOS numeric keyboard, currency formatting preview, positive-value validation, and confirmation step.

**Loading states:**
- Action buttons show disabled state while updating (`updating` or `emittingEvent` flags).
- Button text does not change during status updates.

**Error handling:**
- Status update failures should display a brief error toast above the action bar (currently logged to console only -- identified as a gap for remediation).
- MVC event emission failures block status transitions to `bid` and `rejected` (event must succeed before state change proceeds). Event error banner appears fixed above the bottom action bar with dismiss button.

**Optimistic updates:**
- Status changes wait for server response before updating local state (not optimistic). This is the correct pattern for financial actions.
- Attention Required list uses optimistic updates for inline actions (pass, watch, re-analyze, touch) with rollback on failure and 5-second undo toast for pass actions.

### Pattern 2: Filtering and Search

**Desktop filtering:** Inline panel with dropdown selects and toggle chips. Filter state encoded in URL query parameters. Changes apply immediately on selection. Active filters shown as dismissible chips below header.

**Mobile filtering:** Separate full-page screen (`/opportunities/filters`). Local state is built up in the filter page; changes apply only when "Apply Filters" is tapped. This prevents jank from repeated API calls while the user is configuring filters. Filter state round-trips through URL query parameters.

**Consolidated filter chips (mobile):** Five staleness-related API filters are consolidated into two user-facing chips: "Needs Refresh" (maps to `stale=true` OR `analysis_stale=true` OR `decision_stale=true`) and "Ending Soon" (maps to `ending_soon=true`). The full-page filter screen retains individual toggles for power users who want granular control.

**Filter persistence:** Filters are URL-parameter based. Navigating away clears them. Filter state survives back-button navigation because it is in the URL.

**Empty state:** When no results match filters, centered message with "Clear filters" button.

### Pattern 3: AI Analysis Trigger and Display

**Trigger:** "Analyze" button in opportunity detail header. Shows sparkles icon when idle, spinning refresh icon when analyzing.

**Progress:** No progress bar or intermediate states. Button becomes disabled during analysis. Analysis typically completes in under 45 seconds (Technical Lead: p95 target < 30s for Claude API + overhead, with 25s timeout).

**Result display:** Analysis populates the tabbed analysis interface (default tab: Summary) and the Next Action Card simultaneously. The Next Action Card includes an analysis source indicator: no special badge for AI-powered analysis; amber "Estimate only -- AI unavailable" badge when the analysis run has `aiAnalysisResult = null` (gate-only fallback). Analysis timestamp is tracked for staleness detection.

**Re-analysis:** Triggered from Staleness Banner ("Re-analyze" button) or from Attention Required list inline CTA. Rate-limited to one re-analysis per 30 seconds per opportunity in the Attention Required list.

**Error display:** Red-bordered card with alert icon and error message text. No automatic retry. User must manually re-trigger. Per Technical Lead ADR, if analyst times out, gate-based fallback recommendation is used and the UI shows the gate-derived result with the "Estimate only" indicator rather than an error state.

### Pattern 4: Operator Input Save Cycle

**Form behavior:** Title Info form fields are pre-populated from server state. Changes set a local `isDirty` flag that triggers an "Unsaved" badge on the card header. Each field change also marks the form dirty.

**Save:** "Save Title Info" button (disabled when clean, shows loading spinner when saving). Save sends PATCH request. On success, page data is refreshed (gates recomputed, staleness rechecked).

**Hard gate failure:** If save triggers auto-rejection (hard gate like salvage title), the Kill Switch Banner appears inline. No auto-redirect. The operator reads the reason, and either confirms the rejection or corrects the inputs.

**Staleness cascade:** Saving operator inputs while an analysis exists marks the analysis as stale, triggering the Staleness Banner.

### Pattern 5: Photo Viewing

**Thumbnail strip:** Horizontal scrolling row of 96x96 thumbnail buttons. Uses native `<img>` tags (not Next.js Image component) to avoid optimization issues with external CDN URLs. Lazy loading enabled.

**Lightbox:** Fixed full-screen overlay with 90% black background. Image displayed at max dimensions with `object-contain`. Swipe left/right to navigate between photos using touch event handlers (`touchstart`, `touchmove`, `touchend`). Horizontal swipe threshold: 50px minimum displacement with horizontal movement exceeding vertical movement. The container uses `touch-action: pan-y` to allow vertical scroll passthrough while capturing horizontal swipes. Photo counter displayed at top ("3 of 12"). Tap anywhere outside the photo to dismiss. Keyboard: Escape to close, left/right arrow keys to navigate. Transition animations between photos guarded by `prefers-reduced-motion`. No pinch-zoom for MVP.

### Pattern 6: Attention-Driven Dashboard

**Priority sorting:** Attention Required list is server-sorted by priority. Top 3 items get red rank badges, items 4-5 get amber badges, remaining get gray.

**Inline actions:** Quick action buttons appear on the right side of each attention item. On mobile, always visible. On desktop, revealed on hover. Actions: Re-analyze (for analysis-stale items), Touch/mark reviewed (for decision-stale items), Pass (always available), Watch (always available). Each action has its own loading spinner and error state.

**Pass action behavior:** Tapping Pass immediately rejects the opportunity with `rejection_reason='missing_info'` (not `'other'`, which would require a note and fail backend validation). A 5-second undo toast appears at the bottom of the Attention Required list: "Rejected [opportunity title]. Undo?" Tapping "Undo" reverses the rejection by transitioning the opportunity back to its previous status. After 5 seconds, the toast auto-dismisses and the rejection is final. This provides one-tap speed with a safety net for accidental taps.

**Optimistic removal:** Successful Pass or Watch actions immediately remove the item from the list and decrement the counter. Re-analyze and Touch update the item's tags in-place and remove the item if no tags remain.

**Chip navigation:** Tapping a reason chip (Decision Needed, Ending Soon, Stale, Re-analyze) navigates to the Opportunities List filtered by that attribute.

### Pattern 7: Batch Reject

**Activation:** On mobile, long-press on an opportunity card enters batch selection mode. On desktop, a checkbox column appears on the left side of each card.

**Selection:** Tap/click to toggle selection. Selection count shown in the batch toolbar. "Select all on page" option available.

**Action:** Batch toolbar at bottom shows "Reject (N)" button. Tapping opens a single-select reason code grid (same 6-code layout as the detail page reject modal). Single reason code applies to all selected items. "Other" requires a note. Confirm/Cancel. Max 50 items per batch (BR-023). Partial success is expected (BR-024) -- a results summary shows success/failure counts.

### Pattern 8: Financial Input Modals

**Shared pattern for Set Bid and Won flows:**
- Modal slides up from bottom of screen (bottom-sheet pattern, natural for iOS)
- Large numeric input field with `inputmode="decimal"` for iOS numeric keyboard
- Pre-populated: Set Bid uses `max_bid_high`; Won uses empty (operator enters actual purchase price)
- Currency formatting preview below the input (e.g., "$2,150.00") -- updates as the operator types
- Input sanitization: strip `$`, `,`, and whitespace before validation
- Clear label explaining what the number means ("Maximum all-in bid including all fees" for Set Bid; "Final purchase price" for Won)
- Positive value validation (rejects zero, negative, non-numeric, empty)
- Confirm button (disabled until valid input) and Cancel button
- Both buttons are 44px minimum height, full-width on mobile
- `pb-safe` applied to modal container for safe area inset
- Confirm triggers the status transition via API
- All animations guarded by `prefers-reduced-motion`

### Pattern 9: Undo Toast

**Trigger:** Inline dashboard Pass action, and potentially other single-tap destructive actions in future phases.

**Behavior:**
- Toast appears at the bottom of the current content area (above the safe area, below the last list item)
- Content: "Rejected [truncated title]. Undo?" with "Undo" as a tappable text button
- Duration: 5 seconds, auto-dismisses
- Tap "Undo": reverses the rejection, restores the item to its previous status, item reappears in the Attention Required list
- Implementation note: the rejection API call fires immediately on tap. The "undo" calls the API to transition the opportunity back (e.g., `rejected -> archived` is not valid, so the undo must be implemented as a server-side revert within the 5-second window, or the rejection must be delayed by 5 seconds client-side before sending to the API). The simpler approach for MVP: delay the API call by 5 seconds. If the operator taps Undo within that window, the call is cancelled. If the timer expires, the call fires. This means the optimistic removal is truly optimistic -- the item disappears immediately but the server state does not change for 5 seconds.

---

## Platform-Specific Design Constraints

### iOS Safari (Primary Platform)

The following constraints are derived from CLAUDE.md and verified against the codebase.

**Viewport handling:**
- All pages use `min-h-screen` instead of `h-screen` to avoid iOS Safari's dynamic viewport height issues (URL bar show/hide changes available height).
- Horizontal overflow is explicitly prevented with `max-w-[100vw] overflow-x-hidden` on both the page container and the main content area.

**Layout pattern (from CLAUDE.md):**
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
- The mobile navigation header uses `position: fixed` (top: 0, left: 0, right: 0, z-index: 50). A spacer `div` (h-14) immediately follows to prevent content from being hidden behind it.
- The opportunity detail bottom action bar uses `position: fixed` (bottom: 0) with `pb-safe` for safe area inset padding (home indicator on notch iPhones). Content area has `pb-24` to prevent content from being hidden behind this bar.
- The codebase avoids `-webkit-transform: translateZ(0)` on body or ancestor elements, as this breaks `position: fixed` in iOS Safari.
- `position: sticky` is preferred over `position: fixed` for elements that should scroll within the page flow (Scout Health Banner, Results footer bar, desktop headers).
- Financial input modals and reject modal use bottom-sheet positioning (`position: fixed`, bottom: 0) with `pb-safe`.

**Safe area insets:**
- `pb-safe` class is applied to fixed bottom elements (action bar, mobile menu footer, filter page apply button, financial input modals, reject modal) to respect the home indicator area on modern iPhones.

**Touch targets:**
- All interactive elements must meet 44x44px minimum touch target size. This includes:
  - Action buttons in the fixed bottom bar
  - Reason code tiles in the reject modal (single-select grid)
  - Confirm/Cancel buttons in financial input modals
  - Navigation menu items (py-3)
  - Opportunity cards in list view (full-width tap target)
  - Filter toggle chips
  - Photo thumbnails (96x96, exceeds minimum)
  - Undo toast "Undo" button
  - Scout Health Banner "Details" link

**Scroll behavior:**
- Body scroll is locked (`overflow: hidden`) when the mobile menu is open, preventing background scroll-through.
- Horizontal photo strip uses native `overflow-x-auto` scrolling.
- Tab bar in analysis interface uses `overflow-x-auto` for horizontal scrolling.
- Lightbox swipe uses touch event handlers with `touch-action: pan-y` on the container to allow vertical scroll passthrough while capturing horizontal swipes.

**Known iOS Safari gaps in current implementation:**
1. Checkbox touch targets in the Filters page (`h-5 w-5` = 20x20px) are below the 44px minimum. Mitigation: the `<label>` wrapper provides a larger tap target.
2. No pull-to-refresh mechanism exists. The operator must tap the refresh button in the header.
3. No offline support or service worker caching. If the operator loses connectivity, the app shows errors rather than cached data.

**PWA considerations (Phase 1 forward-planning only, not MVP scope):**
The Competitor Analyst documented that all direct competitors (Swoopa, Flipify, DealScout) are native iOS/Android apps with push notifications. DFG's web app on iOS Safari has a structural disadvantage for alert delivery. For Phase 1 evaluation: (a) Add Web App Manifest for home screen installation, (b) Evaluate Web Push API support on iOS Safari (available since iOS 16.4), (c) Consider service worker for basic offline caching of the dashboard and last-viewed opportunities. These are not MVP features -- they are noted here for forward compatibility.

### Desktop (Secondary Platform)

- Navigation is a persistent sidebar (w-64) that stays fixed on screen.
- Pages use responsive breakpoints (`md:`) to switch between mobile and desktop layouts.
- Hover states are available (`.group-hover:` for attention list inline actions, card hover effects).
- Filter panel is inline on desktop (toggleable dropdown) vs. separate page on mobile.
- Desktop header shows page titles and action buttons that are hidden on mobile (provided by Navigation component instead).

---

## Accessibility Requirements

### WCAG 2.1 Compliance Target: Level AA

Given that this is an internal tool used by a single operator today, with a 3-5 user private beta planned for Phase 1, the accessibility posture should be Level AA compliance as a target, with immediate focus on the areas that have the highest functional impact.

### Current State Assessment

**Strengths (already in the codebase):**
- `aria-label` attributes on icon-only buttons (back button, menu open/close, go back)
- Semantic HTML structure: `<nav>`, `<header>`, `<main>`, `<footer>` elements used correctly
- `<label>` elements properly associated with form inputs via `htmlFor` in Login, and wrapper `<label>` elements in Filters
- Keyboard handler for Escape key to close mobile menu
- Color is not the sole indicator of meaning -- icons accompany all status badges and urgency signals
- Focus rings (`focus:ring-2 focus:ring-blue-500`) on form inputs
- Decision History emojis use `role="img"` with `aria-label` (good practice)

**Gaps (should be addressed before private beta):**

1. **Color contrast:** Several color combinations may not meet 4.5:1 contrast ratio for normal text (WCAG 1.4.3). Specific concerns:
   - `text-gray-400` on white backgrounds (placeholder text, secondary labels)
   - `text-gray-500` on `bg-gray-50` backgrounds (filter chip area, info cards)
   - Score tint backgrounds (`bg-green-50/50`) with text could reduce effective contrast

2. **Focus management:** When modals open (reject modal, photo lightbox, financial input modals), focus is not explicitly trapped inside the modal. Keyboard users can tab behind the modal overlay. The photo lightbox should support Escape to close and arrow keys to navigate (specified in this document, not yet implemented).

3. **Screen reader support:**
   - Attention Required rank badges convey priority visually but only have a `title` attribute, not `aria-label`
   - Photo lightbox has `alt="Full size"` which is not descriptive. Individual thumbnails have `alt="Photo {n}"` which is minimally acceptable.
   - The "Last updated X min ago" label should include `aria-live="polite"` if it auto-refreshes
   - The analysis source indicator ("Estimate only -- AI unavailable") should use `role="status"` with `aria-live="polite"`

4. **Keyboard navigation:**
   - Opportunity cards are `<div>` elements with `onClick` handlers, not `<button>` or `<a>` elements. They are not focusable via keyboard. This is the most significant keyboard accessibility gap.
   - Photo lightbox overlay uses `onClick` on the backdrop `div` -- not keyboard accessible without Escape key handler.
   - Inline CTA buttons in the Attention Required list are proper `<button>` elements (good).

5. **Motion and animation:**
   - Loading spinners use CSS `animate-spin`. No `prefers-reduced-motion` media query check.
   - Menu slide-in animation is not guarded by `prefers-reduced-motion`.
   - Modal slide-up animations are not guarded.
   - **MVP requirement:** All animations must include `@media (prefers-reduced-motion: reduce)` guard that either disables the animation entirely or reduces it to an opacity fade.

6. **Touch target sizes (WCAG 2.5.5 -- AAA, but functionally important for iOS):**
   - External link buttons on opportunity cards (`p-0.5` = ~18px) are below 44px minimum.
   - Inline CTA buttons in Attention Required list (`p-1.5` = ~30px) are below 44px.
   - Filter chip dismiss buttons may be below 44px depending on content length.

### Recommended Remediation Priority

**MVP (Phase 0) -- minimal accessibility hygiene:**
1. Add `prefers-reduced-motion` guard to all CSS animations (loading spinners, menu slide-in, modal slide-up, undo toast). This is a one-line CSS addition per animation and costs nothing.
2. Ensure all new UI elements introduced by this PRD (financial input modals, reject modal, undo toast, scout health banner, analysis source indicator) use semantic HTML and include appropriate `aria-label` attributes.

**Before private beta (Phase 1) -- functional accessibility:**
1. Make opportunity cards focusable and keyboard-activatable (`<a>` wrapping the card, or `tabIndex={0}` with `onKeyDown`)
2. Trap focus inside all modals (reject modal, photo lightbox, financial input modals); add Escape key handler for lightbox
3. Increase touch targets on external link buttons and inline CTA buttons to 44px minimum
4. Audit and fix color contrast ratios to meet 4.5:1 minimum

**Acceptable for MVP (founder-only use):**
- Current accessibility state is functional for a sighted, touch-capable sole operator
- Screen reader support gaps are not blocking for MVP
- The above items should be tracked and addressed before any additional users access the system

---

## Cross-Role References

This section documents where this UX contribution intersects with findings from other roles.

| Role | Finding | UX Impact | Resolution |
|------|---------|-----------|------------|
| Product Manager | Principle #1: Numbers must be right | Financial input modals must validate numeric input before submission | Custom modals with validation replace `prompt()` (Change #1) |
| Product Manager | Principle #4: Mobile-first, iOS Safari always | Every interaction pattern specifies mobile behavior first | All patterns documented mobile-first |
| Product Manager | Principle #5: Operator decides, system recommends | Kill Switch Banner must not auto-reject without operator confirmation | Banner shows reason inline, operator confirms |
| Product Manager | ADR-002 Part A: Scout failure alerting is P0 | Dashboard must show pipeline health status | Scout Health Banner added to dashboard IA (Change #5) |
| Product Manager | ADR-003: Add `sold_price` field for outcome tracking | Results footer bar must not imply profit when only acquisition spend is available | Footer revised to "Won: N deals / $X,XXX total" using `final_price` only (Change #8) |
| Product Manager | ADR-007: Reject flow simplification | Reject modal must resolve the dual-select ambiguity | Single-select 6-code grid, no legacy dropdown, no expandable taxonomy (Change #6) |
| Technical Lead | R6: Data freshness (up to 15 min stale) | "Last updated" timestamp on cards and detail header | Documented in IA |
| Technical Lead | R9: Browser `prompt()` for financial inputs | Financial input modals with validation specified | Pattern 8 (Change #1) |
| Technical Lead | 25-second analyst timeout with gate-only fallback | UI must distinguish AI-powered analysis from gate-only fallback | Analysis source indicator on Next Action Card (Change #3) |
| Technical Lead | Performance: LCP < 2.5s, INP < 200ms on iOS Safari | Dashboard and list views must be lightweight | Noted in Platform Constraints |
| Business Analyst | US-007: Batch reject with single reason code | Batch reject UX specifies single reason code for all selected items | Pattern 7 |
| Business Analyst | OQ-010: `prompt()` for financial inputs | Replaced with validated modal | Pattern 8 (Change #1) |
| Business Analyst | BR-029: 20% haircut when gates not cleared | Gates Display card and Pricing card both note the haircut | Documented in IA |
| Business Analyst | BR-049: Gate-based fallback when AI unavailable | Next Action Card shows "Estimate only" indicator | Change #3 |
| Business Analyst | EC-014: Dashboard quick-pass with `other` reason fails validation | Quick-pass uses `missing_info` default + 5-second undo toast | Change #4, Pattern 9 |
| Target Customer | Simplify reject flow | Single-select 6-code grid, no expandable section | Change #6 |
| Target Customer | Photo swipe navigation | Lightbox supports swipe between photos | Pattern 5 |
| Target Customer | Fewer staleness concepts | Two user-facing filter chips replace five | Documented in Pattern 2 |
| Target Customer | "Verification Needed" label confusion | Relabeled to "Needs Info" with subtitle | Documented in IA |
| Target Customer | Wants profit visibility on dashboard | Results footer bar with Won count and total acquisition spend | Change #8 |
| Target Customer | Wants scout health indicator | Scout Health Banner at top of dashboard | Change #5 |
| Target Customer | Wants to know when analysis is gate-only | Analysis source indicator on Next Action Card | Change #3 |
| Target Customer | Wants real input modal for financial entries | Financial input modal with validation and confirmation | Change #1, Pattern 8 |
| Target Customer | "Inspect" shortcut from inbox | Removed; replaced with highlighted Inspect CTA on qualifying when analysis exists | Change #7 |
| Target Customer | Dashboard pass action too aggressive | Changed to `missing_info` default with 5-second undo toast | Change #4 |
| Competitor Analyst | Native app competitors have push notification advantage | Documented PWA considerations for Phase 1 | Platform Constraints |
| Competitor Analyst | Swoopa Dealers converging on valuations | UX must make analysis depth and workflow discipline tangible proof points | Next Action Card with analysis source indicator, gate enforcement, structured workflow |
| Competitor Analyst | DFG's premium pricing requires premium proof | Analysis quality and workflow discipline are the UX proof points | Summary tab default, Next Action Card prominence, gate-enforced bid readiness |

---

## Unresolved Issues

1. **PM Phase 0 classification of financial input modal.** This document classifies the `prompt()` replacement as MVP scope based on unanimous cross-role agreement (PM Principle #1, Target Customer explicit request, BA OQ-010, TL R9). The PM's Round 2 Phase 0 remaining work table still lists it as "Phase 1 -- UX Lead Concern #1; functional for single operator today." This contradiction must be resolved by the PM. This UX contribution recommends MVP inclusion. If the PM overrides, the risk of a financial input error on a real bid should be explicitly accepted and documented.

2. **Undo toast implementation approach for dashboard quick-pass.** Two implementation strategies exist: (a) delay the API call by 5 seconds client-side and cancel if undo is tapped, or (b) fire the API call immediately and reverse it on undo. Option (a) is simpler and avoids the complexity of server-side reversal, but means the server state is temporarily inconsistent with the UI state for up to 5 seconds. Option (b) requires a server-side endpoint or workaround to reverse a rejection (which may not be a valid state machine transition -- `rejected` can only go to `archived` per BR-012). The Technical Lead should determine which approach is feasible. If neither is clean, the alternative is to require a one-tap confirmation for dashboard Pass (a small modal with just "Reject?" and Confirm/Cancel), which the Target Customer would accept as a fallback.

3. **Dashboard "Results" footer data accuracy.** The Results footer bar shows `SUM(final_price)` for won deals, which represents total acquisition spend, not profit. The Target Customer asked for "Total Profit" but computing profit requires `sold_price` (Phase 1). There is a risk the operator misinterprets the number. The label "Won: N deals / $X,XXX total" is designed to avoid this confusion, but it shows money spent rather than money earned, which may not provide the motivational signal the Target Customer wanted. If this proves confusing in practice, the footer should be hidden until `sold_price` data enables actual profit display.

4. **Photo lightbox swipe gesture scope.** This document classifies swipe as MVP scope based on Target Customer emphasis and minimal technical cost. The Business Analyst classifies it as P2 (BR-064). The PM did not include it in Phase 0 remaining work. If engineering bandwidth forces a cut, swipe should be the first item deferred -- the lightbox still functions without it (tap to open each photo individually). But the specification is complete and implementation-ready.

5. **Attention Required list: quick-pass default reason code.** This document specifies `missing_info` as the default because it does not require a note and is a reasonably neutral code. However, `missing_info` may be semantically inaccurate for opportunities that have complete information but are simply not worth pursuing. A dedicated `quick_pass` reason code would be more accurate for tuning purposes but requires a schema change (expanding the CHECK constraint on `rejection_reason`). For MVP, `missing_info` is acceptable. For Phase 1, the Technical Lead and Business Analyst should evaluate whether a `quick_pass` code would improve tuning signal quality.

6. **Analysis source indicator when analysis has never been run.** The Next Action Card shows a dashed-border placeholder when no analysis exists. This is distinct from the "Estimate only" indicator (which appears when analysis was attempted but AI was unavailable). However, an operator unfamiliar with the system might not understand the difference between "never analyzed" and "analyzed without AI." For MVP with a single operator, this is acceptable. For Phase 1, the empty state should include explanatory text: "Tap Analyze to get AI-powered evaluation."

# UX Lead Contribution -- PRD Review Round 2

**Author:** UX Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Revised after cross-role review

---

## Changes from Round 1

1. **Simplified the reject flow to prioritize single-tap speed.** Round 1 documented both the legacy single-select dropdown and the multi-select reason code grid as coexisting in the reject modal. The Target Customer explicitly said: "One tap, one reason code, done. Stop making me fill out forms." The Business Analyst documented the full 13-code, 8-category taxonomy (BR-019) and expects at least one code selected. Revision: the reject modal defaults to a streamlined single-selection grid of the 6 most common reason codes, with an expandable "More reasons" toggle for the full taxonomy. The legacy dropdown is removed. This satisfies the BA's data requirement (at least one code) while respecting the operator's demand for speed. *(Triggered by: Target Customer, Business Analyst)*

2. **Replaced browser `prompt()` for financial inputs with explicit modal specification.** Round 1 flagged this as an "Open UX Concern." The PM's Product Principle #1 ("Numbers must be right") and the BA's identification of this as a P2 gap (OQ-007) both reinforce that the most consequential dollar amounts in the system -- max bid and final price -- cannot rely on an unvalidated browser dialog. The Technical Lead confirmed there is no input validation on `prompt()`. Revision: the Set Bid and Won flows now specify a custom numeric input modal with currency formatting, positive-value validation, and a confirmation step. This is promoted from "future iteration" to MVP scope because financial accuracy is non-negotiable. *(Triggered by: Product Manager, Business Analyst, Technical Lead)*

3. **Added explicit "last updated" timestamp to opportunity cards and detail header.** The Technical Lead identified Risk R6 (auction data freshness -- up to 15 minutes stale) and recommended displaying "last updated" prominently. The Target Customer listed stale data as a primary frustration. Revision: opportunity cards in the list view and the detail page header now show a "Last updated X min ago" label. When data is older than 15 minutes, this label turns amber as a visual warning. *(Triggered by: Technical Lead, Target Customer)*

4. **Revised photo lightbox to include swipe gesture navigation.** The Target Customer explicitly requested swipe-through photo viewing: "I want to flip through photos like I'm on Craigslist. Tap to open, swipe left-right, tap to close." Round 1 documented "No swipe between photos" as the current state. Revision: the lightbox specification now includes left/right swipe navigation between photos, matching the operator's mental model. This is achievable with CSS touch-action and JS touch event handlers without a heavy library. *(Triggered by: Target Customer)*

5. **Reframed staleness filters from five types to two operator-facing concepts.** The Target Customer said: "For me, there's really only two states: this is current and this needs a fresh look." Round 1 documented five distinct staleness-related filters (stale, analysis_stale, decision_stale, ending_soon, attention). The underlying API filters remain (the BA's user stories depend on them), but the IA revision consolidates these into two user-facing filter chips: "Needs Refresh" (combines stale + analysis_stale + decision_stale) and "Ending Soon" (unchanged). The "Attention Required" concept on the dashboard remains as the union of all urgency signals, which aligns with the BA's US-012. *(Triggered by: Target Customer, Business Analyst)*

6. **Added "Verification Needed" label clarification.** The Target Customer was confused by the term "Verification Needed" on the dashboard: "Verify what? That label doesn't tell me anything." Revision: the dashboard card is relabeled "Needs Info" with a subtitle "Missing title, lien, or mileage data" to match operator vocabulary. The API filter parameter `verification_needed` is unchanged; only the UI label changes. *(Triggered by: Target Customer)*

7. **Removed auto-redirect after hard gate rejection.** The Target Customer specifically objected to the Kill Switch Banner behavior: "Don't redirect me. Let me see it, let me understand why, and give me an override." Round 1 documented auto-redirect to dashboard. Revision: the Kill Switch Banner shows the disqualification reason inline, stays on the detail page, and provides an "I understand, this is correct" confirmation button that completes the rejection, plus a "This information may be wrong" link that opens the Title Info form for correction. No automatic redirect. *(Triggered by: Target Customer)*

8. **Added explicit forward-compatibility note for inbox-to-bid shortcut.** The Target Customer wants to skip workflow steps: "The ability to jump from inbox directly to bid would save me a lot of taps." The Technical Lead's state machine (BR-012) does not allow inbox -> bid. The BA's US-004 enforces the defined transitions. This is a state machine design decision, not a UX override. Revision: added a note in the User Journey acknowledging this friction, documenting it as a candidate for a future "fast track" feature that would require a state machine change, not a UI workaround. For MVP, the action bar for `inbox` status adds an "Inspect" button alongside Qualify/Watch/Reject to allow inbox -> qualifying -> inspect in fewer taps by auto-advancing through intermediate states. *(Triggered by: Target Customer, Technical Lead, Business Analyst)*

9. **Revised analysis tab default to "Summary" instead of "Report."** Round 1 raised this as UX Concern #4. The Target Customer confirmed: "I want to open an opportunity and know in 3 seconds what I should do." The Next Action Card already surfaces the top-level verdict, but when the operator scrolls to the analysis section, the default tab should show the max bid, margin, and profit numbers -- not the raw AI report text. Revision: default analysis tab changed from "Report" to "Summary." *(Triggered by: Target Customer)*

10. **Added profit visibility to dashboard per Target Customer request.** The Target Customer asked for "even just a single number at the bottom of the dashboard that says Total Profit: $X,XXX." The BA confirmed the outcomes table schema exists but has no UI (P1 gap). Revision: added a minimal "Results" footer bar to the dashboard IA that shows Won count and total final_price sum from won opportunities. Full P&L remains Phase 1, but showing the aggregate of what the operator has won provides the motivational signal the customer requested. This uses data already available on the `opportunities` table (`final_price` on won deals). *(Triggered by: Target Customer, Business Analyst)*

11. **Cross-referenced Competitor Analyst findings on native app advantage.** The Competitor Analyst documented that Swoopa, Flipify, and DealScout are all native iOS/Android apps with push notifications. DFG is a web app on iOS Safari. Revision: added a note to Platform-Specific Design Constraints acknowledging the structural disadvantage and documenting the PWA considerations that should be evaluated for Phase 1 (home screen icon, Web Push API, service worker caching). For MVP, the focus remains on making Safari performance excellent rather than attempting native parity. *(Triggered by: Competitor Analyst)*

12. **Aligned batch reject specification with Target Customer expectation.** The Target Customer wants batch reject with "a single reason code applied to all." The BA's US-007 (AC-007.1) confirms this is the designed behavior. Round 1 did not explicitly describe the batch reject UX in the IA. Revision: added batch reject flow to the Interaction Patterns section, specifying that a single reason code selection applies to all selected items. *(Triggered by: Target Customer, Business Analyst)*

---

## Target User Personas

### Persona 1: Scott -- The Founder-Operator

Scott is the sole operator of DFG and the only user today. He runs a trailer and equipment flipping business out of the Phoenix metro area. His day starts early -- checking auction listings from his phone while drinking coffee, then driving to inspect assets, then placing bids from the truck cab between lot visits. He does not sit at a desk for extended periods. His phone (iPhone, Safari) is his primary tool.

Scott's frustrations center on information overload and time pressure. Before DFG, he spent hours manually checking auction sites, opening dozens of tabs, and doing back-of-napkin math on margins. He missed good deals because he did not see them in time. He bought bad deals because he rushed the math under auction pressure. He wants a system that does the homework for him so he can focus on the judgment calls: Is this asset worth my time? Can I make money on it? What should I pay?

Scott is financially literate. He understands buyer premiums, transport costs, repair estimates, and resale margins. He does not need these concepts explained to him -- he needs them calculated correctly and presented clearly. He has zero tolerance for incorrect numbers. A wrong margin calculation does not just look bad; it costs him real money. He has strong opinions about what constitutes a good deal (minimum $600 profit, 40% margin, under $6,000 acquisition cost, within 100 miles for trailers) and these are already encoded in the system's category defaults.

His workflow is interrupt-driven. He checks the console several times a day in 2-3 minute bursts. He needs to understand the state of his pipeline instantly: What needs my attention right now? What is ending soon? What is new? He triages quickly -- most opportunities get rejected within seconds of reading the title and seeing the price. The ones that survive get deeper analysis. He rarely uses desktop unless he is doing end-of-day review.

Scott does not care about infrastructure features (MVC event logging, tuning events). He cares about the core loop: find deals, evaluate them, decide, and move on. Feature additions that do not serve this loop are clutter. He explicitly rejects complexity: "Don't add features I didn't ask for." The Competitor Analyst's finding that native app competitors (Swoopa, DealScout) deliver sub-minute alerts via push notifications is relevant here -- Scott's #1 unmet need is knowing when the scout fails without having to open the app. In-app-only alerting does not serve his workflow.

**Goals:** See what needs action immediately. Make fast, confident bid/pass decisions. Never miss a high-value opportunity. Never buy a bad deal because the math was wrong. Know when the system is broken before it costs him a deal.

**Frustrations:** Stale data (checking a listing only to find it ended yesterday). False positives (high scores on items he would never buy). Slow page loads on mobile. Having to scroll past irrelevant information to reach the decision-critical data. Too many form fields when rejecting obvious garbage. Being redirected away from a page he was reading.

### Persona 2: Future Beta Tester (Phase 1, referenced for forward compatibility only)

While not an MVP user, the Phase 1 private beta (3-5 users) is the next milestone. These users will be similar to Scott: solo operators in physical asset arbitrage, mobile-first, financially experienced, time-constrained. They will have different geographic locations (not Phoenix), different category preferences, and different risk tolerances. The Competitor Analyst's pricing benchmarks ($47-352/mo for Swoopa, $5/mo for Flipify) suggest these users will compare DFG's $149/mo price against tools with native apps and push notifications. DFG must justify the premium through analysis quality and workflow value, not alert speed or platform coverage.

The MVP architecture should not hard-code assumptions that will break when these users arrive (e.g., Phoenix-specific market data in UI labels, hardcoded filter defaults) -- but the UX should be optimized exclusively for Scott's workflow today.

---

## User Journey

The MVP user journey has two primary flows: the Daily Triage Loop and the Deep Evaluation Flow. Both are designed for the interrupt-driven, mobile-first usage pattern described in the persona.

### Flow 1: Daily Triage Loop (2-3 minutes, multiple times per day)

**Step 1: Open Console (Dashboard)**
Scott opens the app from his iPhone home screen. The Dashboard loads and immediately shows:
- Attention Required list at the top (priority-sorted items that need action, with inline quick actions for pass/watch/re-analyze)
- Quick Stats grid (Inbox count, Strike Zone count, Needs Info count, Qualifying count, Watching count, Bidding count)
- Ending Soon list (items with countdown timers, sorted by urgency)
- Pipeline Overview (counts by status with tap-to-filter)
- New Today indicator (deep-linked to filtered list)
- Results footer bar (Won count, total won value -- uses `final_price` sum from won opportunities)

This screen answers the question: "What needs my attention right now?"

Note: The "Needs Info" card (previously "Verification Needed") shows the count of opportunities missing title, lien, or mileage data, with that subtitle visible on the card. This label change addresses the operator's confusion about what "verification" means (see Change #6).

**Step 2: Triage Inbox (Opportunities List, status=inbox)**
Scott taps the Inbox card on the dashboard. The Opportunities List loads filtered to inbox status. Each opportunity card shows -- in signal-first order -- urgency indicators (alerts, ending soon, staleness), status badge, title, price, time remaining, distance, and a "Last updated X min ago" label (amber when older than 15 minutes). Cards are visually differentiated by score (green tint for high-score items) and urgency (left border for alerts or urgent signals).

For each item, Scott makes a snap decision: tap to investigate, or mentally skip. The list loads 50 items at a time. Active filter chips show at the top; the mobile toolbar provides quick access to Buy Box toggle and the full-page filter screen.

Filter chips on mobile are consolidated: "Needs Refresh" (combines stale, analysis_stale, and decision_stale conditions) and "Ending Soon" replace the five separate staleness-related toggles. The full filter page retains the granular API-backed filters for power use, but the quick-access chips prioritize the operator's mental model of "current vs. needs fresh look."

**Step 3: Quick Reject or Advance**
For most inbox items, Scott opens the detail page, scans the Next Action Card (verdict + reasoning + max bid), glances at the photos, and either rejects (tap Reject in the bottom action bar, select one reason code from the streamlined 6-code grid) or advances to qualifying (tap Qualify). This takes 10-30 seconds per item.

For the rare high-value item, Scott enters the Deep Evaluation Flow.

**Step 4: Return to Dashboard**
After triaging, Scott returns to the dashboard (back button or navigation) to confirm counts have changed. He checks if any Ending Soon items need immediate attention.

**Note on workflow shortcuts:** The Target Customer wants to jump from inbox directly to bid on obvious winners. The state machine (BR-012) does not permit inbox -> bid. For MVP, the `inbox` action bar includes an "Inspect" shortcut alongside Qualify/Watch/Reject. Tapping "Inspect" auto-advances through qualifying to inspect in a single server round-trip (PATCH with status=qualifying, then immediate PATCH with status=inspect). This reduces the step count from 3 taps to 2 for urgent items. A true "fast track" feature (inbox -> bid in one step) requires a state machine revision and is deferred to a future phase.

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

The Next Action Card above the tabs shows the verdict (BID/INSPECT/PASS) in large text with color coding, "Why" reasoning bullets, walk triggers (top 3 inspection priorities), and the max bid. This card is the single most important element on the page (Target Customer: "I want to open an opportunity and know in 3 seconds what I should do").

**Step 3: Review Photos**
The photo strip shows horizontal-scrolling 96x96 thumbnails. Tapping a thumbnail opens the full-screen lightbox. Within the lightbox, the operator can swipe left/right to navigate between photos. Tap anywhere outside the photo to dismiss. Keyboard users can press Escape to close or use left/right arrow keys to navigate.

**Step 4: Verify Title Information (Operator Inputs)**
For items Scott is serious about, he fills in the Title Info form: title status, title in hand, lien status, VIN, odometer. Each field has a source selector (listing, auctioneer call, in person, VIN report, seller) and a verification level (unverified, operator attested, documented, third party confirmed). Saving triggers gate computation.

If a hard gate failure is detected (e.g., salvage title confirmed), the Kill Switch Banner appears inline on the detail page. It shows the disqualification reason, a "Confirmed -- reject this opportunity" button, and a "This info may be wrong -- edit inputs" link. There is no auto-redirect. The operator stays on the page and makes the call. (See Change #7.)

**Step 5: Check Gates (Bid Readiness)**
The Gates Display card shows which critical and confidence gates have passed, failed, or remain unknown. All critical gates must pass before the system marks the opportunity as `BID_READY`. Gates update automatically when title inputs are saved. The 20% haircut on max bid when gates are NOT cleared (BR-029) is displayed as a note on the Pricing card: "Max bid reduced by 20% -- verify title and mileage to unlock full bid range."

**Step 6: Decision**
With analysis reviewed, photos checked, title verified, and gates assessed, Scott makes a decision:
- **Bid:** Tap "Set Bid." A modal slides up with: a numeric input field (pre-populated with the system's `max_bid_high` value), currency formatting preview, a clear "This is the maximum you will pay, all costs included" label, and Confirm/Cancel buttons. The input validates that the value is positive and numeric. On confirm, status moves to `bid` and `max_bid_locked` is set. (See Change #2.)
- **Watch:** Tap "Watch", configure trigger conditions (ending_soon with hours-before setting, time_window with specific datetime, or manual). Status moves to `watch`.
- **Reject:** Tap "Reject." The reject modal slides up showing a grid of 6 common reason codes (too far, too expensive, wrong category, poor condition, missing info, other) with large 44px+ tap targets. An expandable "More reasons" toggle reveals the full 13-code taxonomy for detailed tagging. Selecting "other" requires a note. Confirm/Cancel at the bottom. (See Change #1.)
- **Won:** Tap "Won." A modal slides up with a numeric input field for the final price (same validation as Set Bid), currency formatting, and Confirm/Cancel. Status moves to `won` with `final_price` set.
- **Lost:** Tap "Lost." A confirmation dialog asks "Mark as lost?" with Confirm/Cancel. Status moves to `lost`.

The action bar at the bottom of the detail page shows only the contextually relevant actions for the current status:
- `inbox`: Qualify (primary), Inspect (secondary shortcut), Watch (secondary), Reject (danger)
- `qualifying`: Inspect (primary), Watch (secondary), Reject (danger)
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
- **Attention Required card:** Priority-sorted list of items needing operator action, with rank badges (top 3 highlighted in red), reason chips (Decision Needed, Ending Soon, Stale, Re-analyze), inline quick actions (re-analyze, touch/mark reviewed, pass, watch), current bid and time remaining. Tappable rows link to detail. "View all" link when truncated.
- **Quick Stats grid:** 2-column grid of tappable cards linking to filtered opportunity lists. Cards: Inbox (blue), Strike Zone (orange), Needs Info (purple, subtitle: "Missing title, lien, or mileage data"), Qualifying (amber), Watching (blue), Bidding (green). Counts update on refresh. Cards highlight with colored border when count > 0.
- **Ending Soon list:** Items with countdown timers sorted by auction end time, linking to detail pages.
- **Pipeline Overview card:** All 9 statuses with counts, each row links to filtered list.
- **New Today indicator:** Count of new opportunities today, links to filtered list.
- **Results footer bar:** Won count and total won value (`SUM(final_price) WHERE status='won'`). Each links to filtered list. This is a minimal version of outcome visibility -- full P&L tracking is Phase 1 (ref: ADR-003, BA US-009).
- **Desktop header:** "Dashboard" title, refresh button. Mobile header provided by Navigation component.

#### 3. Opportunities List (`/opportunities`)
- **Desktop header:** Title with result count, refresh button, Buy Box quick toggle, Filters button with active count badge. Below: active filter chips row with dismiss buttons and "Clear all" (shown when 2+ filters active).
- **Mobile toolbar:** Result count, refresh, Buy Box toggle (icon only), Filters button (links to full-page filter screen).
- **Mobile active filter chips:** Dismissible chip row. Consolidated filter chips: "Needs Refresh" (combines stale + analysis_stale + decision_stale), "Ending Soon", "Strike Zone", "New Today", "Needs Info" (replaces "Verification Needed"), "Attention Required".
- **Desktop filter panel:** Inline dropdown selectors (Status, Score Band, Ending Within) + toggle chips (Needs Refresh, Needs Info, Ending Soon, Attention, Strike Zone, New Today).
- **Opportunity cards list:** Signal-first cards with: thumbnail (64x64), urgency signal row (Alert/Decide Now/Ending Soon/Stale/Re-analyze badges + status badge), title with external link button, compact price/time/distance row with source label, "Last updated X min ago" label (amber when >15 min stale). Cards tinted by score band. Left border indicates alerts (red) or urgent signals (orange). Tapping navigates to detail.
- **Batch mode:** Long-press (mobile) or checkbox column (desktop) activates multi-select. Batch action toolbar appears at bottom: "Reject (N)" button. Tapping opens a single reason code selector that applies to all selected items. Max 50 per batch (ref: BR-023).
- **Empty state:** "No opportunities found" with clear filters button if filters are active.
- **Loading state:** Centered spinner.

#### 4. Filters (Mobile Full-Page) (`/opportunities/filters`)
- **Header:** Back button, "Filters" title, "Clear" text button.
- **Dropdown selects:** Status (all 9 statuses), Score (High/Medium/Low), Ending (24h/48h/7d).
- **Toggle section "Quick Filters":** Needs Refresh, Needs Info, Ending Soon.
- **Toggle section "Views":** Attention Required, Strike Zone, New Today.
- **Fixed bottom button:** "Apply Filters" (full-width primary button with safe area padding via `pb-safe`).

#### 5. Opportunity Detail (`/opportunities/[id]`)
- **Header:** Desktop: back button + title + "Last updated X min ago" label + Analyze button + View Listing link. Mobile: back button in Navigation, title in Navigation, Analyze button and View Listing link in header row below Navigation, "Last updated" label in header row.
- **Alerts bar:** Red background bar showing active alerts with severity badge, title, message, and dismiss button. Only visible when alerts exist.
- **Next Action Card:** Prominent card showing verdict-derived next action (Bid/Inspect/Pass) in large text with color coding (green/yellow/red). "Why" section with up to 3 bullet points. "Walk Triggers" section with top 3 inspection priorities. Max Bid display (with note if 20% haircut is applied due to uncleared gates). Staleness warning if analysis is old. Empty dashed-border placeholder when no analysis exists.
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
- **Set Bid Modal:** Slides up from bottom. Numeric input field pre-populated with `max_bid_high`. Currency formatting preview. "Maximum all-in cost" label. Positive value validation. Confirm + Cancel buttons. 44px minimum button height.
- **Won Modal:** Same pattern as Set Bid Modal for final price entry.
- **Reject Modal:** Slides up from bottom. Grid of 6 common reason codes (too_far, too_expensive, wrong_category, poor_condition, missing_info, other) with large tap targets (min 44x44px each). Expandable "More reasons" section reveals full 13-code taxonomy. "Other" requires notes textarea. Cancel + "Confirm Rejection" buttons. Confirm disabled until at least one code selected and (if "other") note is non-empty.
- **Photo Lightbox:** Fixed full-screen overlay with 90% black background. Image displayed at max dimensions with `object-contain`. Swipe left/right to navigate between photos. Photo counter "3 of 12" shown at top. Tap outside image to dismiss. Escape key to dismiss. Arrow keys to navigate.

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
- Custom modal with validated numeric input for Set Bid (`max_bid_locked`) and Won (`final_price`). These replace the previous `prompt()` dialogs and include currency formatting, positive-value validation, and confirmation step.

**Loading states:**
- Action buttons show disabled state while updating (`updating` or `emittingEvent` flags).
- Button text does not change during status updates.

**Error handling:**
- Status update failures should display a brief error toast above the action bar (currently logged to console only -- identified as a gap for remediation).
- MVC event emission failures block status transitions to `bid` and `rejected` (event must succeed before state change proceeds). Event error banner appears fixed above the bottom action bar with dismiss button.

**Optimistic updates:**
- Status changes wait for server response before updating local state (not optimistic). This is the correct pattern for financial actions.
- Attention Required list uses optimistic updates for inline actions (pass, watch, re-analyze, touch) with rollback on failure.

### Pattern 2: Filtering and Search

**Desktop filtering:** Inline panel with dropdown selects and toggle chips. Filter state encoded in URL query parameters. Changes apply immediately on selection. Active filters shown as dismissible chips below header.

**Mobile filtering:** Separate full-page screen (`/opportunities/filters`). Local state is built up in the filter page; changes apply only when "Apply Filters" is tapped. This prevents jank from repeated API calls while the user is configuring filters. Filter state round-trips through URL query parameters.

**Consolidated filter chips (mobile):** Five staleness-related API filters are consolidated into two user-facing chips: "Needs Refresh" (maps to `stale=true` OR `analysis_stale=true` OR `decision_stale=true`) and "Ending Soon" (maps to `ending_soon=true`). The full-page filter screen retains individual toggles for power users who want granular control.

**Filter persistence:** Filters are URL-parameter based. Navigating away clears them. Filter state survives back-button navigation because it is in the URL.

**Empty state:** When no results match filters, centered message with "Clear filters" button.

### Pattern 3: AI Analysis Trigger and Display

**Trigger:** "Analyze" button in opportunity detail header. Shows sparkles icon when idle, spinning refresh icon when analyzing.

**Progress:** No progress bar or intermediate states. Button becomes disabled during analysis. Analysis typically completes in under 45 seconds (Technical Lead: p95 target < 30s for Claude API + overhead, with 25s timeout).

**Result display:** Analysis populates the tabbed analysis interface (default tab: Summary) and the Next Action Card simultaneously. Analysis timestamp is tracked for staleness detection.

**Re-analysis:** Triggered from Staleness Banner ("Re-analyze" button) or from Attention Required list inline CTA. Rate-limited to one re-analysis per 30 seconds per opportunity in the Attention Required list.

**Error display:** Red-bordered card with alert icon and error message text. No automatic retry. User must manually re-trigger. Per Technical Lead ADR, if analyst times out, gate-based fallback recommendation is used and the UI shows the gate-derived result without an error state.

### Pattern 4: Operator Input Save Cycle

**Form behavior:** Title Info form fields are pre-populated from server state. Changes set a local `isDirty` flag that triggers an "Unsaved" badge on the card header. Each field change also marks the form dirty.

**Save:** "Save Title Info" button (disabled when clean, shows loading spinner when saving). Save sends PATCH request. On success, page data is refreshed (gates recomputed, staleness rechecked).

**Hard gate failure:** If save triggers auto-rejection (hard gate like salvage title), the Kill Switch Banner appears inline (see Change #7). No auto-redirect. The operator reads the reason, and either confirms the rejection or corrects the inputs.

**Staleness cascade:** Saving operator inputs while an analysis exists marks the analysis as stale, triggering the Staleness Banner.

### Pattern 5: Photo Viewing

**Thumbnail strip:** Horizontal scrolling row of 96x96 thumbnail buttons. Uses native `<img>` tags (not Next.js Image component) to avoid optimization issues with external CDN URLs. Lazy loading enabled.

**Lightbox:** Fixed full-screen overlay with 90% black background. Image displayed at max dimensions with `object-contain`. Swipe left/right to navigate between photos (using touch event handlers). Photo counter displayed at top ("3 of 12"). Tap anywhere outside the photo to dismiss. Keyboard: Escape to close, left/right arrow keys to navigate. No pinch-zoom for MVP.

### Pattern 6: Attention-Driven Dashboard

**Priority sorting:** Attention Required list is server-sorted by priority. Top 3 items get red rank badges, items 4-5 get amber badges, remaining get gray.

**Inline actions:** Quick action buttons appear on the right side of each attention item. On mobile, always visible. On desktop, revealed on hover. Actions: Re-analyze (for analysis-stale items), Touch/mark reviewed (for decision-stale items), Pass (always available), Watch (always available). Each action has its own loading spinner and error state.

**Optimistic removal:** Successful Pass or Watch actions immediately remove the item from the list and decrement the counter. Re-analyze and Touch update the item's tags in-place and remove the item if no tags remain.

**Chip navigation:** Tapping a reason chip (Decision Needed, Ending Soon, Stale, Re-analyze) navigates to the Opportunities List filtered by that attribute.

### Pattern 7: Batch Reject

**Activation:** On mobile, long-press on an opportunity card enters batch selection mode. On desktop, a checkbox column appears on the left side of each card.

**Selection:** Tap/click to toggle selection. Selection count shown in the batch toolbar. "Select all on page" option available.

**Action:** Batch toolbar at bottom shows "Reject (N)" button. Tapping opens a streamlined reason code selector (same 6-code grid as the detail page reject modal). Single reason code applies to all selected items. "Other" requires a note. Confirm/Cancel. Max 50 items per batch (BR-023). Partial success is expected (BR-024) -- a results summary shows success/failure counts.

### Pattern 8: Financial Input Modals

**Shared pattern for Set Bid and Won flows:**
- Modal slides up from bottom of screen (bottom-sheet pattern, natural for iOS)
- Large numeric input field with `inputmode="decimal"` for iOS numeric keyboard
- Currency formatting preview below the input (e.g., "$2,150.00")
- Clear label explaining what the number means ("Maximum all-in bid including all fees" for Set Bid; "Final purchase price" for Won)
- Positive value validation (rejects zero, negative, non-numeric)
- Confirm button (disabled until valid input) and Cancel button
- Both buttons are 44px minimum height, full-width on mobile
- Confirm triggers the status transition via API

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
- `position: sticky` is preferred over `position: fixed` for elements that should scroll out of view (desktop headers, results footer).

**Safe area insets:**
- `pb-safe` class is applied to fixed bottom elements (action bar, mobile menu footer, filter page apply button, financial input modals) to respect the home indicator area on modern iPhones.

**Touch targets:**
- All interactive elements must meet 44x44px minimum touch target size. This includes:
  - Action buttons in the fixed bottom bar
  - Reason code tiles in the reject modal
  - Confirm/Cancel buttons in financial input modals
  - Navigation menu items (py-3)
  - Opportunity cards in list view (full-width tap target)
  - Filter toggle chips
  - Photo thumbnails (96x96, exceeds minimum)

**Scroll behavior:**
- Body scroll is locked (`overflow: hidden`) when the mobile menu is open, preventing background scroll-through.
- Horizontal photo strip uses native `overflow-x-auto` scrolling.
- Tab bar in analysis interface uses `overflow-x-auto` for horizontal scrolling.
- Lightbox swipe uses touch event handlers (`touchstart`, `touchmove`, `touchend`) with `touch-action: pan-y` on the container to allow vertical scroll passthrough while capturing horizontal swipes.

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

2. **Focus management:** When modals open (reject modal, photo lightbox, financial input modals), focus is not explicitly trapped inside the modal. Keyboard users can tab behind the modal overlay. The photo lightbox should support Escape to close and arrow keys to navigate (specified in this revision, not yet implemented).

3. **Screen reader support:**
   - Attention Required rank badges convey priority visually but only have a `title` attribute, not `aria-label`
   - Photo lightbox has `alt="Full size"` which is not descriptive. Individual thumbnails have `alt="Photo {n}"` which is minimally acceptable.
   - The "Last updated X min ago" label should include `aria-live="polite"` if it auto-refreshes

4. **Keyboard navigation:**
   - Opportunity cards are `<div>` elements with `onClick` handlers, not `<button>` or `<a>` elements. They are not focusable via keyboard. This is the most significant keyboard accessibility gap.
   - Photo lightbox overlay uses `onClick` on the backdrop `div` -- not keyboard accessible without Escape key handler.
   - Inline CTA buttons in the Attention Required list are proper `<button>` elements (good).

5. **Motion and animation:**
   - Loading spinners use CSS `animate-spin`. No `prefers-reduced-motion` media query check.
   - Menu slide-in animation is not guarded by `prefers-reduced-motion`.

6. **Touch target sizes (WCAG 2.5.5 -- AAA, but functionally important for iOS):**
   - External link buttons on opportunity cards (`p-0.5` = ~18px) are below 44px minimum.
   - Inline CTA buttons in Attention Required list (`p-1.5` = ~30px) are below 44px.
   - Filter chip dismiss buttons may be below 44px depending on content length.

### Recommended Remediation Priority

**Before private beta (Phase 1):**
1. Make opportunity cards focusable and keyboard-activatable (`<a>` wrapping the card, or `tabIndex={0}` with `onKeyDown`)
2. Trap focus inside all modals (reject modal, photo lightbox, financial input modals); add Escape key handler for lightbox
3. Increase touch targets on external link buttons and inline CTA buttons to 44px minimum
4. Add `prefers-reduced-motion` guard to all CSS animations
5. Audit and fix color contrast ratios to meet 4.5:1 minimum

**Acceptable for MVP (founder-only use):**
- Current accessibility state is functional for a sighted, touch-capable sole operator
- Screen reader support gaps are not blocking for MVP
- The above items should be tracked and addressed before any additional users access the system

---

## Cross-Role References

This section documents where this UX contribution intersects with findings from other roles.

| Role | Finding | UX Impact | Resolution |
|------|---------|-----------|------------|
| Product Manager | Principle #1: Numbers must be right | Financial input modals must validate numeric input before submission | Custom modals with validation replace `prompt()` (Change #2) |
| Product Manager | Principle #4: Mobile-first, iOS Safari always | Every interaction pattern specifies mobile behavior first | All patterns documented mobile-first |
| Product Manager | Principle #5: Operator decides, system recommends | Kill Switch Banner must not auto-reject without operator confirmation | Banner shows reason inline, operator confirms (Change #7) |
| Technical Lead | R6: Data freshness (up to 15 min stale) | "Last updated" timestamp on cards and detail header | Added to IA (Change #3) |
| Technical Lead | Performance: LCP < 2.5s, INP < 200ms on iOS Safari | Dashboard and list views must be lightweight; no heavy client-side computation | Noted in Platform Constraints |
| Technical Lead | 25-second analyst timeout with fallback | UI must handle both AI result and gate-only fallback gracefully | Next Action Card shows gate-based result when AI is unavailable |
| Business Analyst | US-007: Batch reject with single reason code | Batch reject UX specifies single reason code for all selected items | Added Pattern 7 (Change #12) |
| Business Analyst | OQ-007: `prompt()` for financial inputs | Replaced with validated modal | Change #2 |
| Business Analyst | BR-029: 20% haircut when gates not cleared | Gates Display card and Pricing card both note the haircut | Added to IA, Opportunity Detail |
| Target Customer | Simplify reject flow | Streamlined 6-code grid with expandable full taxonomy | Change #1 |
| Target Customer | Photo swipe navigation | Lightbox supports swipe between photos | Change #4 |
| Target Customer | Fewer staleness concepts | Two user-facing filter chips replace five | Change #5 |
| Target Customer | "Verification Needed" label confusion | Relabeled to "Needs Info" with subtitle | Change #6 |
| Target Customer | Wants profit visibility on dashboard | Results footer bar with Won count and total value | Change #10 |
| Target Customer | Wants inbox-to-bid shortcut | Inspect button added to inbox action bar; true shortcut deferred | Change #8 |
| Competitor Analyst | Native app competitors have push notification advantage | Documented PWA considerations for Phase 1 | Change #11 |
| Competitor Analyst | DFG's premium pricing requires premium proof | UX must make analysis quality and workflow discipline tangible | Next Action Card and Summary tab are the proof points |

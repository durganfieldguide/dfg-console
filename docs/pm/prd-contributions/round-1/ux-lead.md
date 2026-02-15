# UX Lead Contribution -- PRD Review Round 1

**Author:** UX Lead
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Ground Truth:** Codebase at `dfg-console` repo, CLAUDE.md, DFG API reference, database schema, and live UI audit

---

## Target User Personas

### Persona 1: Scott -- The Founder-Operator

Scott is the sole operator of DFG and the only user today. He runs a trailer and equipment flipping business out of the Phoenix metro area. His day starts early -- checking auction listings from his phone while drinking coffee, then driving to inspect assets, then placing bids from the truck cab between lot visits. He does not sit at a desk for extended periods. His phone (iPhone, Safari) is his primary tool.

Scott's frustrations center on information overload and time pressure. Before DFG, he spent hours manually checking auction sites, opening dozens of tabs, and doing back-of-napkin math on margins. He missed good deals because he did not see them in time. He bought bad deals because he rushed the math under auction pressure. He wants a system that does the homework for him so he can focus on the judgment calls: Is this asset worth my time? Can I make money on it? What should I pay?

Scott is financially literate. He understands buyer premiums, transport costs, repair estimates, and resale margins. He does not need these concepts explained to him -- he needs them calculated correctly and presented clearly. He has zero tolerance for incorrect numbers. A wrong margin calculation does not just look bad; it costs him real money. He has strong opinions about what constitutes a good deal (minimum $600 profit, 40% margin, under $6,000 acquisition cost, within 100 miles) and these are already encoded in the system's category defaults.

His workflow is interrupt-driven. He checks the console several times a day in 2-3 minute bursts. He needs to understand the state of his pipeline instantly: What needs my attention right now? What is ending soon? What is new? He triages quickly -- most opportunities get rejected within seconds of reading the title and seeing the price. The ones that survive get deeper analysis. He rarely uses desktop unless he is doing end-of-day review.

**Goals:** See what needs action immediately. Make fast, confident bid/pass decisions. Never miss a high-value opportunity. Never buy a bad deal because the math was wrong.

**Frustrations:** Stale data (checking a listing only to find it ended yesterday). False positives (high scores on items he would never buy). Slow page loads on mobile. Having to scroll past irrelevant information to reach the decision-critical data.

### Persona 2: Future Beta Tester (Phase 1, referenced for forward compatibility only)

While not an MVP user, the Phase 1 private beta (3-5 users) is the next milestone. These users will be similar to Scott: solo operators in physical asset arbitrage, mobile-first, financially experienced, time-constrained. They will have different geographic locations (not Phoenix), different category preferences, and different risk tolerances. The MVP architecture should not hard-code assumptions that will break when these users arrive -- but the UX should be optimized exclusively for Scott's workflow today.

---

## User Journey

The MVP user journey has two primary flows: the Daily Triage Loop and the Deep Evaluation Flow. Both are designed for the interrupt-driven, mobile-first usage pattern described in the persona.

### Flow 1: Daily Triage Loop (2-3 minutes, multiple times per day)

**Step 1: Open Console (Dashboard)**
Scott opens the app from his iPhone home screen. The Dashboard loads and immediately shows:

- Attention Required list at the top (priority-sorted items that need action, with inline quick actions for pass/watch/re-analyze)
- Quick Stats grid (Inbox count, Strike Zone count, Verification Needed count, Qualifying count, Watching count, Bidding count)
- Ending Soon list (items with countdown timers, sorted by urgency)
- Pipeline Overview (counts by status with tap-to-filter)
- New Today indicator (deep-linked to filtered list)

This screen answers the question: "What needs my attention right now?"

**Step 2: Triage Inbox (Opportunities List, status=inbox)**
Scott taps the Inbox card on the dashboard. The Opportunities List loads filtered to inbox status. Each opportunity card shows -- in signal-first order -- urgency indicators (alerts, ending soon, staleness), status badge, title, price, time remaining, and distance. Cards are visually differentiated by score (green tint for high-score items) and urgency (left border for alerts or urgent signals).

For each item, Scott makes a snap decision: tap to investigate, or mentally skip. The list loads 50 items at a time. Active filter chips show at the top; the mobile toolbar provides quick access to Buy Box toggle and the full-page filter screen.

**Step 3: Quick Reject or Advance**
For most inbox items, Scott opens the detail page, scans the Next Action Card (verdict + reasoning + max bid), glances at the photos, and either rejects (tap Reject in the bottom action bar, select reason codes) or advances to qualifying (tap Qualify). This takes 10-30 seconds per item.

For the rare high-value item, Scott enters the Deep Evaluation Flow.

**Step 4: Return to Dashboard**
After triaging, Scott returns to the dashboard (back button or navigation) to confirm counts have changed. He checks if any Ending Soon items need immediate attention.

### Flow 2: Deep Evaluation Flow (3-10 minutes per opportunity)

**Step 1: Opportunity Detail (from list or dashboard)**
Scott navigates to an opportunity detail page. The page loads with the opportunity's current state: status badge, source label, and -- if analysis has been run -- the Next Action Card prominently displayed at the top.

**Step 2: Review AI Analysis**
If no analysis exists, Scott taps "Analyze" in the header. Analysis runs (p95 under 45 seconds) and populates the tabbed analysis interface:

- Report tab: Full AI-generated report with original listing link
- Summary tab: Quick numbers (max bid, retail estimate, expected profit, margin)
- Condition tab: Graded condition assessment with red flags separated into Core Risks vs Optional Issues
- Investor tab: Investment breakdown, repair plan, verdict reasoning with price range scenarios, deal killers, inspection priorities
- Buyer tab: Target buyer profiles, demand level, price range, seasonal factors, selling points

**Step 3: Verify Title Information (Operator Inputs)**
For items Scott is serious about, he fills in the Title Info form: title status, title in hand, lien status, VIN, odometer. Each field has a source selector (listing, auctioneer call, in person, VIN report, seller) and a verification level (unverified, operator attested, documented, third party confirmed). Saving triggers gate computation.

**Step 4: Check Gates (Bid Readiness)**
The Gates Display card shows which critical and confidence gates have passed, failed, or remain unknown. All critical gates must pass before bidding. Gates update automatically when title inputs are saved. The Kill Switch Banner appears if a hard deal-breaker condition is detected (e.g., parts-only title, active lien).

**Step 5: Decision**
With analysis reviewed, title verified, and gates checked, Scott makes a decision:

- **Bid:** Tap "Set Bid", enter maximum bid amount. Status moves to `bid`.
- **Watch:** Tap "Watch", set trigger conditions. Status moves to `watch`.
- **Reject:** Tap "Reject", select reason codes (multi-select from 13 options across 8 categories), optionally add a note. Status moves to `rejected`.

The action bar at the bottom of the detail page shows only the contextually relevant actions for the current status (inbox shows Qualify/Watch/Reject, qualifying shows Inspect/Watch/Reject, etc.).

**Step 6: Staleness Loop**
If Scott changes operator inputs after running analysis, a Staleness Banner appears indicating the analysis is outdated. He can re-analyze with one tap. If he does not visit an opportunity for too long, staleness indicators appear on the Attention Required list and on the opportunity card in the list view.

---

## Information Architecture

### Screen Inventory

The MVP has 7 screens. Navigation is a sidebar on desktop (64px-wide, persistent) and a hamburger slide-over menu on mobile (fixed header with logo/title, slide-in panel from left).

#### 1. Login (`/login`)

- DFG Console branding (logo icon, title, "Internal Use Only" tagline)
- Email + password form (hardcoded credentials, prototype-grade)
- Error alert for invalid credentials
- No registration flow (founder-only)

#### 2. Dashboard (`/`)

- **Attention Required card:** Priority-sorted list of items needing operator action, with rank badges (top 3 highlighted in red), reason chips (Decision Needed, Ending Soon, Stale, Re-analyze), inline quick actions (re-analyze, touch/mark reviewed, pass, watch), current bid and time remaining. Tappable rows link to detail. "View all" link when truncated.
- **Quick Stats grid:** 2-column grid of tappable cards linking to filtered opportunity lists. Cards: Inbox (blue), Strike Zone (orange), Verify (purple), Qualifying (amber), Watching (blue), Bidding (green). Counts update on refresh. Cards highlight with colored border when count > 0.
- **Ending Soon list:** Items with countdown timers sorted by auction end time, linking to detail pages.
- **Pipeline Overview card:** All statuses with counts, each row links to filtered list.
- **New Today indicator:** Count of new opportunities today, links to filtered list.
- **Results Summary footer:** Sticky bottom bar with Won/Lost/Rejected counts, each linking to filtered list.
- **Desktop header:** "Dashboard" title, refresh button. Mobile header provided by Navigation component.

#### 3. Opportunities List (`/opportunities`)

- **Desktop header:** Title with result count, refresh button, Buy Box quick toggle, Filters button with active count badge. Below: active filter chips row with dismiss buttons and "Clear all" (shown when 2+ filters active).
- **Mobile toolbar:** Result count, refresh, Buy Box toggle (icon only), Filters button (links to full-page filter screen).
- **Mobile active filter chips:** Same dismiss-able chip row as desktop.
- **Desktop filter panel:** Inline dropdown selectors (Status, Score Band, Ending Within) + toggle chips (Stale, Re-analyze, Verification, Ending Soon, Attention, Strike Zone, New Today).
- **Opportunity cards list:** Signal-first cards with: thumbnail (64x64), urgency signal row (Alert/Decide Now/Ending Soon/Stale/Re-analyze badges + status badge), title with external link button, compact price/time/distance row with source label. Cards tinted by score band. Left border indicates alerts (red) or urgent signals (orange). Tapping navigates to detail.
- **Empty state:** "No opportunities found" with clear filters button if filters are active.
- **Loading state:** Centered spinner.

#### 4. Filters (Mobile Full-Page) (`/opportunities/filters`)

- **Header:** Back button, "Filters" title, "Clear" text button.
- **Dropdown selects:** Status (all statuses), Score (High/Medium/Low), Ending (24h/48h/7d).
- **Checkbox toggles section 1:** Stale, Re-analyze, Verification Needed.
- **Checkbox toggles section 2:** Ending Soon, Attention Required, Strike Zone, New Today.
- **Fixed bottom button:** "Apply Filters" (full-width primary button with safe area padding).

#### 5. Opportunity Detail (`/opportunities/[id]`)

- **Header:** Desktop: back button + title + Analyze button + View Listing link. Mobile: back button in Navigation, title in Navigation, Analyze button and View Listing link in header row.
- **Alerts bar:** Red background bar showing active alerts with severity badge, title, message, and dismiss button. Only visible when alerts exist.
- **Next Action Card:** Prominent card showing verdict-derived next action (Bid/Inspect/Pass) in large text with color coding (green/yellow/red). "Why" section with up to 3 bullet points. "Walk Triggers" section with top 3 inspection priorities. Max Bid display. Staleness warning if analysis is old. Empty dashed-border placeholder when no analysis exists.
- **Staleness Banner:** Yellow banner when analysis is outdated (due to operator input changes or time), with "Re-analyze" button.
- **Kill Switch Banner:** Red banner for hard deal-breaker conditions detected from operator inputs.
- **Analysis Error card:** Red-bordered card shown when analysis API call fails.
- **Tabbed Analysis:** 5-tab horizontal scrolling tab bar (Report, Summary, Condition, Investor, Buyer). Each tab has distinct content as described in User Journey Step 2.
- **Photo strip:** Horizontal scrolling row of 96x96 thumbnail buttons. Tapping opens full-screen lightbox overlay (tap anywhere to dismiss).
- **Status + Score card:** Current status badge, source label.
- **Bid Readiness (Gates Display) card:** Critical gates section (title status, title in hand, lien status, mileage) and Confidence gates section (VIN). Each gate shows pass/fail/unknown icon with reason text. Summary banner (green if all critical passed, red if not) with pass count.
- **Title Info card:** Operator input form with 5 fields (Title Status, Title In Hand, Lien Status, Odometer, VIN). Each field has source selector and verification level dropdown. "Unsaved" badge when dirty. Save button (disabled when clean).
- **Required Exit Calculator:** Shows minimum sale price needed to break even based on current all-in cost.
- **Pricing card:** Current bid, suggested max bid range, operator's locked max bid, estimated fees.
- **Timing card:** Auction end (relative + absolute time, red if ending soon), distance in miles.
- **Description card:** Full listing description (pre-wrapped text).
- **Analysis Summary card:** Scout-level analysis summary text with "Analyzed X ago" timestamp.
- **History card:** Most recent 10 actions with type, status transition, and relative timestamp.
- **Decision History card:** MVC event audit trail showing BID/PASS decisions with score context and relative timestamps.
- **Fixed bottom action bar:** Contextual action buttons based on current status:
  - `inbox`: Qualify (primary), Watch (secondary), Reject (danger)
  - `qualifying`: Inspect (primary), Watch (secondary), Reject (danger)
  - `watch`: Inspect (primary), Qualify (secondary), Reject (danger)
  - `inspect`: Set Bid (primary, prompts for amount), Reject (danger)
  - `bid`: Won (primary, prompts for final price), Lost (danger)
  - `won`/`lost`/`rejected`: Archive (secondary)
- **Reject Modal:** Full-screen overlay with: legacy single-select reason dropdown, multi-select reason code grid (13 codes, 8 categories), conditional notes textarea (required when "other" selected), Cancel + Confirm Rejection buttons.
- **Photo Lightbox:** Full-screen dark overlay showing selected photo at maximum resolution, tap to dismiss.

#### 6. Sources (`/sources`)

- **Header:** Desktop: "Sources" title + "Run Scout" button. Mobile: full-width "Run Scout Now" button below navigation.
- **Trigger message card:** Blue-bordered feedback card shown after triggering scout run.
- **Active Sources section:** Section header with count. Source cards showing: enabled indicator (green checkmark), display name, buyer premium percentage, pickup days, last run relative time, external link to source website.
- **Disabled Sources section:** Same layout with gray styling.
- **Info card:** Explanatory text about what sources are and how scout runs work.

#### 7. Settings (`/settings`)

- **Auction Sources card:** List of sources with display name, buyer premium, pickup days, last run time, and enabled/disabled toggle button.
- **API Configuration card:** API URL (from env), auth status indicator.
- **About card:** Version number (0.1.0), environment (NODE_ENV).

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

**State machine:**

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
- `prompt()` dialog for numeric input on Set Bid (max_bid_locked) and Won (final_price). Note: these use browser-native `prompt()`, not custom modals.

**Loading states:**

- Action buttons show disabled state while updating (`updating` or `emittingEvent` flags).
- Button text does not change during status updates (no "Loading..." text on status buttons).

**Error handling:**

- Status update failures logged to console; no user-facing error toast or retry mechanism currently exists.
- MVC event emission failures block status transitions to `bid` and `rejected` (event must succeed before state change proceeds). Event error banner appears fixed above the bottom action bar with dismiss button.

**Optimistic updates:**

- Status changes wait for server response before updating local state (not optimistic).
- Attention Required list uses optimistic updates for inline actions (pass, watch, re-analyze, touch) with rollback on failure.

### Pattern 2: Filtering and Search

**Desktop filtering:** Inline panel with dropdown selects and toggle chips. Filter state encoded in URL query parameters. Changes apply immediately on selection (no "Apply" button). Active filters shown as dismissible chips below header.

**Mobile filtering:** Separate full-page screen (`/opportunities/filters`). Local state is built up in the filter page; changes apply only when "Apply Filters" is tapped. This prevents jank from repeated API calls while the user is configuring filters. Filter state round-trips through URL query parameters.

**Filter persistence:** Filters are URL-parameter based, not persisted to localStorage or server. Navigating away and returning clears filters. Filter state survives back-button navigation because it is encoded in the URL.

**Empty state:** When no results match filters, centered message with "Clear filters" button.

### Pattern 3: AI Analysis Trigger and Display

**Trigger:** "Analyze" button in opportunity detail header. Shows sparkles icon when idle, spinning refresh icon when analyzing.

**Progress:** No progress bar or intermediate states. Button becomes disabled during analysis. Analysis typically completes in under 45 seconds.

**Result display:** Analysis populates the tabbed analysis interface and the Next Action Card simultaneously. Analysis timestamp is tracked for staleness detection.

**Re-analysis:** Triggered from Staleness Banner ("Re-analyze" button) or from Attention Required list inline CTA. Rate-limited to one re-analysis per 30 seconds per opportunity in the Attention Required list.

**Error display:** Red-bordered card with alert icon and error message text. No automatic retry. User must manually re-trigger.

### Pattern 4: Operator Input Save Cycle

**Form behavior:** Title Info form fields are pre-populated from server state. Changes set a local `isDirty` flag that triggers an "Unsaved" badge on the card header. Each field change also marks the form dirty.

**Save:** "Save Title Info" button (disabled when clean, shows loading spinner when saving). Save sends PATCH request. On success, page data is refreshed (gates recomputed, staleness rechecked). On auto-rejection (hard gate failure like parts-only title), an alert dialog explains the disqualification and redirects to dashboard.

**Staleness cascade:** Saving operator inputs while an analysis exists marks the analysis as stale, triggering the Staleness Banner to appear.

### Pattern 5: Photo Viewing

**Thumbnail strip:** Horizontal scrolling row of 96x96 thumbnail buttons. Uses native `<img>` tags (not Next.js Image component) to avoid optimization issues with external CDN URLs. Lazy loading enabled.

**Lightbox:** Fixed full-screen overlay with 90% black background. Single image displayed at max dimensions with `object-contain`. Tap anywhere (including the image) to dismiss. No swipe between photos. No zoom.

### Pattern 6: Attention-Driven Dashboard

**Priority sorting:** Attention Required list is server-sorted by priority. Top 3 items get red rank badges, items 4-5 get amber badges, remaining get gray.

**Inline actions:** Quick action buttons appear on the right side of each attention item. On mobile, always visible. On desktop, revealed on hover. Actions: Re-analyze (for analysis-stale items), Touch/mark reviewed (for decision-stale items), Pass (always available), Watch (always available). Each action has its own loading spinner and error state.

**Optimistic removal:** Successful Pass or Watch actions immediately remove the item from the list and decrement the counter. Re-analyze and Touch update the item's tags in-place and remove the item if no tags remain.

**Chip navigation:** Tapping a reason chip (Decision Needed, Ending Soon, Stale, Re-analyze) navigates to the Opportunities List filtered by that attribute.

---

## Platform-Specific Design Constraints

### iOS Safari (Primary Platform)

The following constraints are derived from CLAUDE.md and verified against the codebase.

**Viewport handling:**

- All pages use `min-h-screen` instead of `h-screen` to avoid iOS Safari's dynamic viewport height issues (URL bar show/hide changes available height).
- Horizontal overflow is explicitly prevented with `max-w-[100vw] overflow-x-hidden` on both the page container and the main content area. This addresses a known iOS Safari issue where content can escape the viewport horizontally.

**Fixed positioning:**

- The mobile navigation header uses `position: fixed` (top: 0, left: 0, right: 0, z-index: 50). A spacer `div` (h-14) immediately follows to prevent content from being hidden behind it.
- The opportunity detail bottom action bar uses `position: fixed` (bottom: 0) with `pb-safe` for safe area inset padding (home indicator on notch iPhones). Content area has `pb-24` to prevent content from being hidden behind this bar.
- The codebase avoids `-webkit-transform: translateZ(0)` on body or ancestor elements, as this breaks `position: fixed` in iOS Safari.
- `position: sticky` is preferred over `position: fixed` for elements that should scroll out of view (desktop headers, results footer).

**Safe area insets:**

- `pb-safe` class is applied to fixed bottom elements (action bar, mobile menu footer, filter page apply button) to respect the home indicator area on modern iPhones.

**Touch targets:**

- All interactive elements must meet 44x44px minimum touch target size. Current implementation uses: `p-2` padding on icon buttons (32px icon + 8px padding = ~48px), `py-3` on mobile nav items, `h-5 w-5` checkboxes (which may be below the 44px minimum -- see Gaps below).

**Scroll behavior:**

- Body scroll is locked (`overflow: hidden`) when the mobile menu is open, preventing background scroll-through.
- Horizontal photo strip uses native `overflow-x-auto` scrolling.
- Tab bar in analysis interface uses `overflow-x-auto` with `-webkit-overflow-scrolling: touch` implicitly (default behavior in modern iOS Safari).

**Known iOS Safari gaps in current implementation:**

1. Checkbox touch targets in the Filters page (`h-5 w-5` = 20x20px) are below the 44px minimum. The `<label>` wrapper provides a larger tap target, but the visual checkbox itself is small.
2. The `prompt()` dialogs used for Set Bid and Won amounts are functional on iOS Safari but provide a poor experience (no number formatting, no input validation, no way to cancel on some iOS versions). These should be replaced with custom modals in a future iteration.
3. No pull-to-refresh mechanism exists. The operator must tap the refresh button in the header.
4. No offline support or service worker caching. If the operator loses connectivity (common when driving between lots), the app shows errors rather than cached data.

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

**Gaps (should be addressed before private beta):**

1. **Color contrast:** Several color combinations in the light theme may not meet 4.5:1 contrast ratio for normal text (WCAG 1.4.3). Specific concerns:
   - `text-gray-400` on white backgrounds (used for placeholder text, secondary labels)
   - `text-gray-500` on `bg-gray-50` backgrounds (filter chip area, info cards)
   - Score tint backgrounds (`bg-green-50/50`) with text could reduce effective contrast

2. **Focus management:** When modals open (reject modal, photo lightbox), focus is not explicitly trapped inside the modal. Keyboard users can tab behind the modal overlay. The photo lightbox can only be dismissed by click -- no keyboard shortcut (Escape) to close it.

3. **Screen reader support:**
   - The Attention Required list rank badges convey priority visually but only have a `title` attribute, not `aria-label`.
   - Status badge color coding is supplemented with text labels (good), but the reason chips in opportunity cards rely on small icons that may not have sufficient `aria-label` text.
   - Photo lightbox has `alt="Full size"` which is not descriptive. Individual thumbnails have `alt="Photo {n}"` which is minimally acceptable.
   - Decision History emojis use `role="img"` with `aria-label` (good practice).

4. **Keyboard navigation:**
   - Opportunity cards are `<div>` elements with `onClick` handlers, not `<button>` or `<a>` elements. They are not focusable via keyboard and do not respond to Enter/Space key activation. This is a significant keyboard accessibility gap.
   - The photo lightbox overlay uses `onClick` on the backdrop `div` -- not keyboard accessible.
   - Inline CTA buttons in the Attention Required list are proper `<button>` elements (good).

5. **Motion and animation:**
   - Loading spinners use CSS `animate-spin`. No `prefers-reduced-motion` media query check is applied to disable these animations for users who have motion sensitivity.
   - Menu slide-in animation is not explicitly guarded by `prefers-reduced-motion`.

6. **Touch target sizes (WCAG 2.5.5 -- AAA, but functionally important):**
   - External link buttons on opportunity cards (`p-0.5` = ~18px) are well below the 44px minimum.
   - Inline CTA buttons in Attention Required list (`p-1.5` = ~30px) are below 44px.
   - Filter chip dismiss buttons and toggle chips may be below 44px depending on content length.

### Recommended Remediation Priority

**Before private beta (Phase 1):**

1. Make opportunity cards focusable and keyboard-activatable (`<button>` or `tabIndex={0}` with `onKeyDown`)
2. Trap focus inside modals (reject modal, photo lightbox); add Escape key handler for lightbox
3. Increase touch targets on external link buttons and inline CTA buttons to 44px minimum
4. Add `prefers-reduced-motion` guard to all CSS animations
5. Audit and fix color contrast ratios to meet 4.5:1 minimum

**Acceptable for MVP (founder-only use):**

- Current accessibility state is functional for a sighted, mouse/touch-capable sole operator
- Screen reader support gaps are not blocking for MVP
- The above items should be tracked and addressed before any additional users access the system

---

## Open UX Concerns for PM Discussion

### Concern 1: Browser `prompt()` for Financial Inputs

The Set Bid and Won flows use `window.prompt()` to capture dollar amounts. This is fragile: no input validation, no currency formatting, no confirmation step, and inconsistent behavior across iOS Safari versions. For a system where "numbers must be right" is principle #1, entering the most consequential number in the entire workflow (the amount of real money to commit) via a browser prompt dialog is a design risk. Recommendation: Replace with a custom modal component that includes input validation, currency formatting preview, and a confirmation step before Phase 1.

### Concern 2: No Undo for Destructive Actions

Rejecting an opportunity is a one-tap destructive action (after reason selection). There is no undo mechanism, no "rejected" items recoverable from the opportunity list (they can be found via status filter, but there is no prominent undo affordance). The Pass action from the dashboard Attention Required list is even more destructive -- it rejects with a default "other" reason and no confirmation step. Recommendation: Add a brief undo toast (5 seconds) after rejection and dashboard quick-pass actions.

### Concern 3: Notification Gap

Currently, the operator must actively open the console to see new opportunities and alerts. Per ADR-002 in the PM contribution, the notification channel is an open decision. From a UX perspective, the Ending Soon and Strike Zone alerts are meaningless if the operator does not see them until after the auction has ended. This is the single largest UX gap in the MVP -- the system can identify time-sensitive opportunities but has no way to push that information to the operator.

### Concern 4: Analysis Tab Discoverability

The tabbed analysis interface defaults to the "Report" tab, which shows a raw text report. The most actionable information (max bid, margin, verdict reasoning) is on the "Summary" and "Investor" tabs. New users (and possibly Scott in a hurry) may not scroll the tab bar to find these tabs. The Next Action Card above the tabs partially mitigates this by surfacing the verdict and max bid, but the detailed reasoning requires tab navigation. Consider whether the default tab should be "Summary" instead of "Report".

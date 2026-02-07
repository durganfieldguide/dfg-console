# Target Customer Contribution -- PRD Review Round 3 (Final)

**Author:** Target Customer (Scott -- Founder/Operator)
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Final after 3 rounds

---

## Changes from Round 2

1. **Accepted the PM's decision to defer `prompt()` replacement to Phase 1.** In Round 2, I argued this should be P0. The PM's contradiction resolution table says: "The Target Customer is a financially literate single user who enters correct numbers. The risk increases with beta users." That is fair. I have been using `prompt()` for months without entering a wrong number. The risk is real but it is a risk for other people, not for me today. I accept P1 pre-beta blocker. I still want it done before anyone else touches this system. *(Triggered by: PM contradiction resolution)*

2. **Dropped my push for a third auction source in MVP.** In Round 2, I listed "a third auction source as insurance" in my top priorities. The PM explicitly placed new source adapters in the "NOT in Phase 0" list and said "fix what you have before adding more." The Technical Lead confirmed GovPlanet is seeded but disabled. The Competitor Analyst made the stronger case: IronPlanet at 17% is the actual problem, and adding a third source before fixing the second one just gives me three things to worry about instead of two. I agree. Fix IronPlanet or disable it. GovPlanet is Phase 1. *(Triggered by: PM phased plan, Competitor Analyst uncomfortable truth #3)*

3. **Aligned my priority list with the PM's remaining Phase 0 work table.** In Round 2, my priorities were a mix of P0 and P1 items presented as equally urgent. The PM's table is clearer: five P0 items (scout alerting, IronPlanet fix/disable, analyst endpoint auth, verdict AND logic, tuning_events CHECK fix), then P1 items. I am adopting that structure because it is more honest about what actually needs to happen before anything else. *(Triggered by: PM phased plan)*

4. **Acknowledged the Business Analyst's EC-014 (dashboard quick-pass failure) as something I have probably hit.** The Business Analyst identified that the inline "Pass" action on the Attention Required list sends `rejection_reason='other'` without a note, which the backend rejects because `'other' requires a note`. I have noticed that Pass from the dashboard sometimes does nothing. I assumed it was a network glitch. It is probably this bug. The Business Analyst's recommended fix is simple: use `'missing_info'` as the default reason instead of `'other'`. I agree. *(Triggered by: Business Analyst EC-014)*

5. **Revised my position on the IronPlanet "fix or disable" question.** In Round 2, I said "fix the capture rate." After reading the PM's framing ("Either fix adapter to >= 80% capture rate or disable source and remove from Sources page. 17% capture with 'active' status is deceptive") and the Competitor Analyst's point about Ritchie Bros potentially restricting access, I now lean toward disable. A source that shows as active but captures 17% is worse than no source. If the adapter cannot be fixed to >= 80% within the current sprint, disable it. I would rather see an honest "1 source active" than a misleading "2 sources active." *(Triggered by: PM remaining Phase 0 work table, Competitor Analyst uncomfortable truth #3)*

6. **Accepted the UX Lead's two-concept staleness model as the right simplification.** In Round 2, I said "two states: current and needs a fresh look." The UX Lead delivered exactly that: "Needs Refresh" (combines stale + analysis_stale + decision_stale) and "Ending Soon." The five underlying API filters still exist for the code to use, but I only see two chips on my phone. That is what I asked for. *(Triggered by: UX Lead change #5)*

7. **Validated the UX Lead's financial input modal specification against my actual workflow.** The UX Lead specified: modal slides up from bottom, numeric input with `inputmode="decimal"` for iOS keyboard, currency formatting preview, positive-value validation, confirm/cancel buttons. That is exactly what I need. Pre-populating with `max_bid_high` is a good default. The label "Maximum all-in bid including all fees" is clear. I have one addition: the modal should also show the current bid so I can see the spread between what it is now and what I am willing to pay. *(Triggered by: UX Lead Pattern 8)*

8. **Removed the request for a "Total Profit" number on the dashboard from my P0 priorities.** In Round 2, I asked for "even just a single number -- Total Profit: $X,XXX." The UX Lead responded with a Results footer bar showing Won count and total `final_price` sum. The PM correctly classified full outcome tracking as P1. I realize now that `final_price` is what I paid, not my profit -- showing it as "Total Profit" would be misleading. I would need `sold_price` to calculate actual profit, and that field does not exist yet (PM ADR-003). The Won count and total final_price as a "Results" bar is fine for now. It tells me how much capital I have deployed, which is useful even without the profit number. *(Triggered by: UX Lead change #10, PM ADR-003)*

---

## Who I Am

I am Scott. I buy undervalued physical assets at auction -- trailers, trucks, equipment, power tools -- and flip them for profit. I am a one-person operation. My day starts with checking auction listings on my phone over coffee, then driving to pickups or lot inspections, listing things on Facebook Marketplace from the truck, answering buyer messages, and checking auctions again before bed. I do not sit at a desk. I do not have a team. Every dollar I deploy on a bad acquisition is a dollar I cannot use on the next good one.

The hardest part of this job is not selling -- it is finding. Finding the deal before someone else does, knowing the real value before I bid, and not getting burned by hidden problems the listing did not mention. I can manually process maybe 20-30 listings a day. There are thousands going through Sierra and IronPlanet every week. I am leaving money on the table every day because I physically cannot look at everything.

---

## My Current Pain

Before DFG, I open three browser tabs on my phone. Sierra Auction. IronPlanet. Sometimes GovPlanet. I scroll. I squint at photos on a 6-inch screen. I see something promising -- a 2019 enclosed cargo trailer, current bid $1,800 -- and I open a new tab, search Facebook Marketplace for comps in Phoenix. I look at what they sold for. I open another tab, Google the model for known problems. I try to estimate buyer premium, haul cost, tire replacement. I do this math in my head or in the Notes app. Then I decide: bid or skip.

That entire process takes 10-15 minutes per listing. Most of them are garbage. Too far, too expensive, wrong category, salvage title buried in paragraph four. I spend 80% of my time rejecting things and 20% actually evaluating deals. It is exhausting and slow.

The worst part is the ones I miss. I see a listing the day after it ended -- a utility trailer that went for $900 that I could have flipped for $2,200 -- and I want to throw my phone. I did not miss it because I am bad at this. I missed it because I was busy evaluating the five listings before it.

---

## First Reactions (Final)

**What excites me:**

The fact that DFG already exists and I am already using it. The scout running every 15 minutes means I am not manually refreshing auction pages. That alone saves me an hour a day. The AI analysis giving me BID/WATCH/PASS with actual numbers -- max bid, estimated profit, margin -- that is the core of what I need. I was doing all of that in my head before, and I was getting it wrong sometimes. Having the system show me the math takes the emotion out of bidding, which is where I used to lose money.

The Strike Zone concept on the dashboard -- high-value opportunities ready for action -- that is exactly how my brain works. I do not want to see everything. I want to see the three things I should act on right now.

The UX Lead's description of the Daily Triage Loop nailed my actual workflow. Open dashboard, check attention items, blow through inbox, deep-dive on one or two things, done. That 2-3 minute burst, multiple times a day -- that is exactly it. The fact that someone documented my actual behavior and the UI is built around it gives me confidence.

The Competitor Analyst confirmed what I suspected: no one else does what DFG does. Swoopa Dealers is getting closer with instant valuations and margin clarity, but it is vehicles-only and marketplace-only. DFG's conservative financial modeling with acquisition cost breakdown, the dual-lens AI analysis, and the gated workflow -- that combination does not exist anywhere else. The 58 business rules the Business Analyst documented are not just spec artifacts. They are the encoded version of how I think about deals. That is the moat.

**What no longer confuses me:**

The reject modal. In Round 1, I was confused by the dual-layer system. In Round 2, I understood why both existed but wanted simplification. The UX Lead's Round 2 revision nails it: a streamlined grid of 6 common reason codes with an expandable "More reasons" toggle for the full taxonomy. The legacy dropdown is gone. One interaction, one reason code, done. The Business Analyst's data requirements are met (at least one code selected, feeds tuning events). My speed requirement is met (2 taps: select reason, confirm).

The "Verification Needed" label. The UX Lead renamed it to "Needs Info" with a subtitle "Missing title, lien, or mileage data." Now it tells me what to do, not what internal data state it represents. Simple fix, big clarity improvement.

The staleness system. Five API filters collapsed into two user-facing chips: "Needs Refresh" and "Ending Soon." The engineering complexity stays under the hood. I see what matters.

**What still scares me:**

The verdict threshold OR logic (OQ-001) is confirmed as a real bug. The Business Analyst verified it at `category-config.ts` line 258: `if (profit >= thresholds.buy.min_profit || margin >= thresholds.buy.min_margin)`. That OR means a trailer with $600 profit but 5% margin gets a BUY recommendation. The PM escalated it to P0. The Technical Lead added it as ADR-007 recommending AND logic. Everyone agrees this is wrong. It needs to be fixed before I trust another recommendation. A 5% margin trailer could easily become a loss after one unexpected repair.

The scout failure blind spot. Three rounds of review and every single role has flagged this. The PM elevated it to P0. The Technical Lead added observability requirements. The Business Analyst documented it as a gap. The UX Lead called it the single largest UX gap. The Competitor Analyst pointed out that every competitor has push notifications while DFG has none. And yet as of today, if the scout goes down at 10pm on a Friday, I will not know until I open the app on Saturday morning and notice the inbox looks thin. The PM's implementation path is clear: populate `last_scout_run` on the stats endpoint, show a red banner on the dashboard if the last successful run is older than 30 minutes. That is the minimum. For Phase 1, add a webhook notification (Pushover, ntfy.sh, Twilio SMS -- I do not care which one). But the in-app banner is the P0 fix.

Swoopa Dealers. The Competitor Analyst elevated this to MEDIUM-HIGH threat in Round 2. They launched in January 2026 with instant valuations, comps, and margin clarity for vehicle dealers. They are on marketplaces, not auctions, and vehicles, not trailers. But the direction is clear: they are moving from "alerts" to "analysis." If they expand into auction platforms or equipment categories, they will have native apps, push notifications, a larger user base, and money behind them. DFG's defense is the domain-specific financial modeling and the gated workflow. Those are genuinely hard to replicate. But only if they work correctly -- which brings me back to the verdict threshold bug.

---

## Feature Reactions (Final)

### Scout Pipeline (every 15 min) -- YES, the backbone

Without the scout, there is no product. The 15-minute interval is fine for auction listings -- auctions move on hours and days, not minutes. The Competitor Analyst confirmed that sub-minute alerts matter for marketplace listings (someone else buys the couch while you are driving there) but not for auctions with defined end times.

What I need from the scout in Phase 0 is one thing: visibility into whether it is running. The PM, Technical Lead, Business Analyst, UX Lead, Competitor Analyst, and I have all flagged this across three rounds. It is the most unanimously identified issue in this entire review. Red banner on the dashboard if the scout has not run in 30+ minutes. That is the P0 fix.

### AI Analysis (Claude dual-lens) -- YES, the killer feature

The Competitor Analyst confirmed no one else does this. Swoopa Dealers has comps-based valuations. Rouse has ML on 75,000+ equipment models. Neither one runs a full investor-lens plus buyer-lens evaluation with category-specific prompts, repair estimates, walk triggers, and conservative financial modeling using the canonical money math. That is DFG's core value.

The verdict threshold AND logic fix (OQ-001, ADR-006/007) is P0. BID requires BOTH min profit AND min margin met. WATCH requires either one. PASS when neither. The PM agreed. The Technical Lead agreed. The Business Analyst confirmed the code. This is not a debate -- it is a fix.

The Technical Lead's note about gate-only fallback when Claude times out is important. The UX Lead addressed this by showing the gate-based result in the Next Action Card without an error state. That is the right approach. I would add: if analysis ran without AI (gate-only mode), the analysis timestamp or a small label should indicate it. I do not need a big warning -- just something that tells me "this recommendation was generated without the full AI analysis." The Business Analyst's AC-003.6 documents this fallback path.

### Category Tiers (Trailers, Vehicles, Power Tools) -- YES

The Business Analyst documented the exact thresholds (BR-043 through BR-045) and they match my actual numbers. Trailers: $600 min profit, 40% margin, $6K max acquisition, 100mi max distance. The Technical Lead confirmed adding a new category requires a code deploy. That is fine.

### Opportunity Workflow -- YES, with understanding

I retracted my inbox-to-bid shortcut request in Round 2 after understanding the state machine constraints. The Technical Lead documented this as a "deliberate constraint, not a gap." The PM's Principle #3 (conservative over optimistic) supports it -- the workflow exists to prevent impulsive bidding. I accept that.

The UX Lead's compromise is smart: the `inbox` action bar includes an "Inspect" shortcut that auto-advances through qualifying to inspect in a single round-trip. That reduces the minimum path to bid from 3 taps to 2 for items I am already confident about. The Business Analyst's OQ-008 documents this as a deferred decision for a true fast-track feature. I am satisfied with the compromise for MVP.

The `watch -> qualifying` backward transition (BR-014) is important and I use it. Sometimes I watch something, the price drops, and I want to re-evaluate from scratch. The system supports this.

### Batch Operations -- YES

Batch reject with a single reason code applied to all items (BR-062). Partial success when individual items fail (BR-024). Max 50 per batch (BR-023). The Business Analyst confirmed this is exactly how it works today. No changes needed.

### Dashboard -- YES, my home screen

The UX Lead's final dashboard specification is right. Attention Required at the top with inline quick actions. Quick Stats grid with tappable cards. Ending Soon list. Pipeline Overview. New Today. Results footer bar (Won count + total final_price sum).

The label changes matter: "Needs Info" instead of "Verification Needed." The subtitle "Missing title, lien, or mileage data" tells me exactly what is missing.

The quick-pass bug (EC-014) needs to be fixed. If the inline Pass action sends `rejection_reason='other'` without a note, the backend rejects it silently. Use `'missing_info'` as the default. It is a one-line fix.

I am dropping my Round 2 request for a "Total Profit" number. The UX Lead correctly pointed out that `final_price` is what I paid, not my profit. Showing it as profit would be misleading. The Results footer bar with Won count and total deployment is the right MVP solution.

### Staleness Detection -- YES, simplified

Two user-facing concepts: "Needs Refresh" and "Ending Soon." Five API filters underneath. The UX Lead delivered exactly what I asked for in Round 1. No further notes.

### Gates System -- YES, no auto-redirect

The UX Lead removed the auto-redirect in Change #7. Kill Switch Banner shows the disqualification reason inline, two buttons: "Confirmed -- reject this opportunity" and "This info may be wrong -- edit inputs." I stay on the page. I make the call. That is exactly what I wanted.

The 20% haircut on max bid when gates are not cleared (BR-029) is a good mechanism. The UX Lead shows it as a note on the Pricing card: "Max bid reduced by 20% -- verify title and mileage to unlock full bid range." That communicates the tradeoff clearly.

### Operator Inputs -- YES

Deep merge (BR-027), source selectors, verification levels. The UX Lead's Title Info card specification is thorough. No changes.

### Photo Gallery -- IMPROVED

The UX Lead added swipe gesture navigation in Change #4. Swipe left-right to navigate between photos in the lightbox. Photo counter ("3 of 12") at the top. Tap outside to dismiss. This is how I expect photo viewing to work on my phone. The Business Analyst classified this as P2 (BR-064). I would prefer P1 but I can live with tap-per-photo for a while longer.

### Financial Input Modals -- DEFERRED TO P1, ACCEPTED

The UX Lead specified custom modals with numeric input, currency formatting, positive-value validation, and confirmation. The PM deferred this to Phase 1 as a pre-beta blocker. I accept this. I have been using `prompt()` without problems. But it must be done before any other operator uses the system.

One addition to the UX Lead's spec: when the Set Bid modal slides up, show the current bid alongside the input field. I want to see "Current bid: $1,800" next to my max bid input so I can gauge the spread.

### MVC Event Logging -- STILL DO NOT CARE for MVP

My position has not changed across three rounds. The Business Analyst documented it thoroughly. The Technical Lead confirmed events are immutable and versioned. The PM's Principle #7 (audit everything) keeps it in the codebase. Fine. But do not spend another minute making the Decision History card prettier or the event system fancier. This is infrastructure that I benefit from indirectly through better future recommendations. It is not something I interact with.

---

## What I Need to See (Final, Prioritized)

These are the items that must happen for me to trust DFG as my primary deal-finding tool. They are organized into the same priority tiers the PM uses.

### P0 -- Must fix now, before anything else

1. **Scout health indicator on the dashboard.** A red banner if the scout has not run successfully in the last 30 minutes. Populate `last_scout_run` on the stats endpoint (currently returns null). This is the minimum viable alerting. Every role across three rounds of review has identified this as critical. No more discussion -- build it.

2. **Fix the verdict threshold logic to use AND for BID (OQ-001, ADR-006/007).** Confirmed bug at `category-config.ts` line 258. BID requires BOTH profit AND margin thresholds met. WATCH requires either one. PASS when neither. A 5% margin trailer should never get a BUY recommendation. The PM, Technical Lead, Business Analyst, and I all agree. Backtest against historical data before deploying.

3. **Fix the tuning_events CHECK constraint (EC-013).** The Business Analyst confirmed: auto-rejection inserts `event_type='status_change'` which the CHECK constraint does not allow. Silent data loss on every auto-rejection. Fix the code to use `event_type='rejection'` with `auto_rejected: true` in signal_data. No migration needed.

4. **IronPlanet: fix to >= 80% capture or disable.** If the adapter cannot achieve 80% capture within the current sprint, disable the source and remove it from the Sources page. A source that shows as "active" at 17% capture is deceptive. I would rather have one honest source than two where one is broken. The PM, Competitor Analyst, and I agree.

5. **Auth on analyst endpoints (Issue #123).** The Technical Lead confirmed this needs verification. If someone stumbles onto the analyst endpoint, they run up my Claude API bill. Lock it down.

### P1 -- Must fix before private beta

6. **Replace `prompt()` with financial input modals.** Numeric input, currency formatting, validation, confirmation step. The most consequential dollar amounts in the system deserve better than a browser dialog. Pre-beta blocker.

7. **Scout failure push notification.** Pushover, ntfy.sh, Twilio SMS -- I do not care which. If the scout fails, text me. The in-app banner (P0) covers when I am looking at the app. The push notification covers when I am not.

8. **GovPlanet adapter.** Third source. Insurance against IronPlanet going to zero. Only after existing sources are reliable.

9. **Simplify the reject flow.** The UX Lead's 6-code grid with expandable full taxonomy. Remove the legacy dropdown. Map selected codes to the legacy field on the backend. The Business Analyst's BR-061 says completable in 2 taps. That is the target.

10. **Fix the dashboard quick-pass bug (EC-014).** Change the default rejection reason from `'other'` to `'missing_info'`. One-line fix.

### The numbers must always be right

This is not a priority item -- it is a permanent constraint. The canonical money math is the foundation of every recommendation:

- **Acquisition Cost** = Bid + Buyer Premium + Transport + Immediate Repairs
- **Net Proceeds** = Sale Price - Listing Fees - Payment Processing
- **Profit** = Net Proceeds - Acquisition Cost
- **Margin %** = (Profit / Acquisition Cost) * 100

Listing fees are selling costs only. Never included in acquisition cost. Never double-counted. The Business Analyst documented this in BR-008, BR-009, BR-010, BR-029, BR-032. The Technical Lead documented it in the Money Math Validation Checklist. The PM made it Principle #1. Every role references it. Never break it.

---

## Make-or-Break Concerns (Final)

**I will stop using DFG if:**

- The scout goes down and I miss deals without knowing. This has been the #1 identified issue across three rounds and six roles. If I cannot trust that the system is watching, I have to go back to watching manually, which makes the tool worthless. The P0 fix (in-app banner) prevents the worst case. The P1 fix (push notification) makes it reliable.

- The AI analysis gives me a BID recommendation on something I would never buy. The OR-logic threshold issue means this could already be happening. If a 5% margin trailer gets recommended as BID, I lose trust in every recommendation. Fix the thresholds.

- The money math breaks. If I bid based on a number the system gave me and the profit calculation was wrong, I am done. I will go back to my spreadsheet. This is why the canonical formulas exist and why every role referenced them.

- The app gets slow or breaks on my phone. The UX Lead documented the iOS Safari constraints (min-h-screen, fixed positioning rules, safe area insets, 44px touch targets). Follow those rules. When I tap an opportunity, I want to see the Next Action Card within 1 second. The Technical Lead's performance budgets (LCP < 2.5s, INP < 200ms) are the enforcement mechanism.

- Features get added that I did not ask for and they clutter the interface. The Competitor Analyst's advice is right: the moat is not more features -- it is making the existing features flawless. The PM's phasing is correct -- stay in Phase 0 until it is rock solid.

**I will NOT stop using DFG because of:**

- Only one (or one and a half) auction sources. If IronPlanet gets disabled, I still have Sierra. Sierra is where most of my deals come from anyway. Fix the coverage when you can, but do not let it delay the P0 fixes.

- The auth being basic. I am the only user. Fix it before anyone else touches this, but do not let it slow down things that help me make money today.

- Missing outcome tracking UI. I track P&L in a spreadsheet. The Results footer bar with Won count and total final_price is enough for MVP.

- No push notifications for new opportunities. Push for scout failures is P1. Push for "hey, new high-score listing" is Phase 1. I check the app multiple times a day already.

- Accessibility gaps. The UX Lead documented real issues (keyboard navigation, focus trapping, color contrast). These matter for Phase 1 beta users. They do not affect me today.

- No photo swipe gesture. I want it. I can live without it. It is not blocking any decision I make.

---

## Willingness to Pay (Final)

Before DFG, I spent 2-3 hours a day manually scanning auctions and doing back-of-napkin valuations. DFG cuts that to 20-30 minutes of reviewing pre-scored opportunities. That is roughly 2 hours saved per day.

If I am making an average of $1,200 profit per deal and doing 2-3 deals per month, DFG helps me both find more deals (higher volume) and avoid bad ones (fewer losses). The system paying for itself is not a question -- it already has.

I would pay $300/month without blinking if the analysis is reliable and the scout does not miss things. The price sensitivity is not about the dollar amount -- it is about whether the tool actually works. A free tool that gives me bad recommendations is worse than a $500/month tool that is consistently right.

The Competitor Analyst showed Swoopa Dealers at $47-145/month for vehicles with instant valuations and comps. DFG's $149/month target sits at Swoopa Dealers' top tier. The difference: DFG gives me conservative financial modeling with explicit acquisition cost breakdown, a gated workflow that prevents bad buys, and category-specific analysis. Swoopa Dealers gives me comps and margin clarity. For my workflow, DFG is worth more. For a vehicle dealer who just needs fast comps, Swoopa Dealers is probably the better deal.

For Phase 1 beta users, $149/month is reasonable if the tool pays for itself within the first deal. At min profit $600, one good deal covers four months of subscription. The Competitor Analyst is right that a free trial would help conversion. A 14-day trial, time-limited not feature-limited, makes sense for Phase 1.

---

## Summary: What Matters Most (MVP, final after three rounds)

1. **Scout health indicator on the dashboard (P0).** Red banner if the scout has not run in 30+ minutes. Populate `last_scout_run` on stats endpoint. Every role agrees. Build it.
2. **Fix verdict threshold logic to AND for BID (P0).** Both profit AND margin must clear. Confirmed bug. Backtest, then deploy.
3. **Fix tuning_events CHECK constraint bug (P0).** Use `event_type='rejection'` with `auto_rejected: true`. No migration needed.
4. **IronPlanet: fix to 80%+ or disable (P0).** Do not show a broken source as active.
5. **Auth on analyst endpoints (P0).** Lock down Issue #123.
6. **Keep the numbers right (always).** Canonical money math is non-negotiable. Never break it.
7. **Keep it fast on iOS Safari (always).** Test every feature on a phone first. Follow the documented constraints. LCP < 2.5s, INP < 200ms.
8. **Do not add features I did not ask for (always).** The moat is not more features. It is making the existing features flawless.

---

## Unresolved Issues

These are genuine disagreements I have after reading all three rounds of contributions from all six roles. I am not raising these to relitigate -- I am documenting where I think the panel got it wrong or left something unresolved.

1. **The PM deferred `prompt()` replacement to Phase 1. I accepted it, but I think it is a mistake.** The PM's Principle #1 is "Numbers must be right." The PM's Principle #1 justification explicitly says: "This principle extends to input mechanisms: the UX Lead's Concern #1 (browser prompt() for entering bid amounts) is a numbers-must-be-right issue, not just a UX issue." And yet the resolution says "defer to Phase 1." If your own principle says input mechanisms for financial data are a Principle #1 concern, and then you defer fixing the input mechanism, that is a contradiction. I accepted it because the risk is low for a single operator who knows what he is doing. But it is still a contradiction.

2. **Nobody resolved the "gate-only mode" visibility question definitively.** I asked for a visible indicator when analysis was generated without AI (gate-only fallback from AC-003.6). The Technical Lead acknowledged the fallback exists. The UX Lead said the Next Action Card shows the gate-based result "without an error state." But "without an error state" is not the same as "with a clear indication of what happened." If I see a PASS recommendation, I want to know whether Claude evaluated it and said PASS, or the gates alone produced PASS because Claude timed out. Those are different levels of confidence. The PM did not take a position. The Business Analyst did not add an acceptance criterion for it. This is an open gap.

3. **The PM's kill criterion for "operator abandonment" cannot be measured and nobody has a plan to fix it.** The Business Analyst flagged this: hardcoded auth means no session tracking. The PM revised the kill criterion to use `operator_actions` table activity counts instead of login tracking, which is a reasonable workaround. But the underlying problem remains -- without real auth, we cannot measure several success metrics that the PM defines as important. This is fine for Phase 0 since I am the only user, but it should be called out as a known gap, not swept under the rug with a workaround metric.

4. **The Competitor Analyst raised Swoopa Dealers to MEDIUM-HIGH threat but the PM's risk table still does not include competitive convergence.** The PM's business risks (B1-B7) include scraping fragility, market shifts, and shallow moat, but do not specifically address the scenario where Swoopa Dealers expands from vehicles to equipment and from marketplaces to auctions. The Competitor Analyst's uncomfortable truth #1 says "DFG's window to establish the analysis-plus-workflow moat is narrowing." That deserves a line in the risk table with a mitigation strategy, not just an acknowledgment in the competitor analysis.

5. **The auto-advance "Inspect" shortcut from inbox has no acceptance criteria or business rule.** The UX Lead described it in Change #8 and the User Journey: tapping "Inspect" from inbox auto-advances through qualifying to inspect in a single server round-trip. The Business Analyst did not add this to US-004's acceptance criteria. The Technical Lead did not confirm this is feasible as a single round-trip (it requires two sequential PATCH calls: inbox -> qualifying, then qualifying -> inspect). If it fails halfway, I have an opportunity stuck in qualifying when I expected it in inspect. This needs an acceptance criterion and an edge case definition before someone builds it.

6. **The "backtest before deploying" requirement for the verdict threshold fix has no definition of what "backtest" means.** The PM, Technical Lead, and I all say to backtest the AND logic change against historical data. But nobody defined what a backtest looks like for this system. How many historical opportunities? What counts as a "false negative" (AND logic recommending WATCH on something I actually bid on)? What is the acceptable false negative rate? Without these definitions, "backtest" is a hand-wave, not a process. Someone needs to define the test criteria before the fix ships.

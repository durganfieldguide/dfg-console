# Target Customer Contribution -- PRD Review Round 2

**Author:** Target Customer (Scott -- Founder/Operator)
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only
**Status:** Revised after cross-role review

---

## Changes from Round 1

1. **Upgraded scout failure alerting from "my opinion" to "everyone agrees."** The PM listed it as P1. The Business Analyst flagged that `last_scout_run` returns null (US-010, AC-010.1). The Technical Lead confirmed there is no push mechanism at all (no WebSocket, no real-time push). The UX Lead called the notification gap "the single largest UX gap in the MVP." I said it was P0 in Round 1 and I am saying it louder now: every single role on this panel identified this as a critical problem. **Stop calling it P1. It is P0.** *(Triggered by: PM, Business Analyst, Technical Lead, UX Lead)*

2. **Softened my position on the reject modal complexity.** The Business Analyst's user stories (US-006) made me understand why the dual-layer rejection system exists -- the legacy `rejection_reason` is the quick server-side field, and the 13-code decision taxonomy feeds the tuning algorithm. The UX Lead showed that the multi-select reason codes are in a grid, not a form. I still think it is one tap too many, but I now understand the data value. My revised ask: default to the multi-select grid and hide the legacy dropdown. Do not make me pick both. *(Triggered by: Business Analyst, UX Lead)*

3. **Added a new concern about `prompt()` for bid entry.** I did not call this out in Round 1 because I am used to it. The UX Lead flagged that the Set Bid and Won flows use `window.prompt()` -- a browser dialog with no validation, no formatting, no confirmation. The Business Analyst flagged the same thing (OQ-007). When the PM says "numbers must be right" is Principle #1, entering the most consequential dollar amount of the entire workflow through a bare browser prompt is negligent. I have fat-fingered numbers on my phone before. This needs a real input modal. *(Triggered by: UX Lead, Business Analyst)*

4. **Acknowledged that the inbox-to-bid shortcut I asked for conflicts with the state machine.** The Technical Lead's state machine documentation shows that `inbox` can only go to `qualifying`, `watch`, `rejected`, or `archived`. There is no `inbox -> bid` path, and adding one would skip the MVC event requirements documented in the Business Analyst's US-004 (AC-004.6). I still want fewer taps to get from "I see this" to "I am bidding on this," but I retract the request for a direct inbox-to-bid jump. Instead, I want the transition from qualifying to inspect to happen with a single tap when an analysis already exists. *(Triggered by: Technical Lead, Business Analyst)*

5. **Raised urgency on the OQ-001 threshold logic issue.** The Business Analyst identified that `applyVerdictThresholds` uses OR logic -- meaning a deal with $600 profit but only 5% margin gets a BUY recommendation. That is a bad deal. I do not want BID recommendations on 5% margin trailers. This is the kind of thing that makes me stop trusting the system. This needs AND logic for BID: both profit AND margin must clear the threshold. *(Triggered by: Business Analyst)*

6. **Added nuance to my IronPlanet complaint after reading the Competitor Analyst.** The Competitor Analyst pointed out that Ritchie Bros (who owns IronPlanet) could restrict scraping access entirely. That makes me less focused on "fix the capture rate" and more focused on "have a fallback." If IronPlanet is going to be unreliable by nature, then adding GovPlanet or GovDeals as a third source is actually more important than perfecting IronPlanet. *(Triggered by: Competitor Analyst)*

7. **Validated my pricing instinct after seeing competitive benchmarks.** The Competitor Analyst showed that Swoopa charges $47-352/month and covers 7+ marketplaces. DFG covers 2 (one at 17%). At $149/month, I need to feel like the analysis quality and workflow justify a 3x premium over Swoopa's entry price. Right now they do, because no other tool does the profit math for me. But if the numbers ever go wrong, the value prop collapses immediately. *(Triggered by: Competitor Analyst)*

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

## First Reactions

**What excites me:**

The fact that DFG already exists and I am already using it. The scout running every 15 minutes means I am not manually refreshing auction pages. That alone saves me an hour a day. The AI analysis giving me BID/WATCH/PASS with actual numbers -- max bid, estimated profit, margin -- that is the core of what I need. I was doing all of that in my head before, and I was getting it wrong sometimes. Having the system show me the math takes the emotion out of bidding, which is where I used to lose money.

The Strike Zone concept on the dashboard -- high-value opportunities ready for action -- that is exactly how my brain works. I do not want to see everything. I want to see the three things I should act on right now.

The UX Lead's description of the Daily Triage Loop nailed my actual workflow. Open dashboard, check attention items, blow through inbox, deep-dive on one or two things, done. That 2-3 minute burst, multiple times a day -- that is exactly it. The fact that someone documented my actual behavior and the UI is built around it gives me confidence.

**What confuses me (revised):**

The reject modal still has both a legacy single-select dropdown and a multi-select reason code grid. After reading the Business Analyst's work, I understand why both exist -- the legacy field is the database column, and the 13-code taxonomy feeds the scoring algorithm. But the UX Lead did not propose removing the duplication, and the PM did not flag it as a simplification target. My ask is clear: show me the multi-select grid only. Map the selected codes to the legacy field automatically on the backend. Do not make me interact with both.

"Verification Needed" on the dashboard still does not mean anything to me at a glance. The Business Analyst's BR-041 defines it precisely (unverified or missing titleStatus, titleInHand, lienStatus, odometerMiles), which is helpful for the engineers but not for me as a label. Call it "Needs Title Info" or "Missing Details." Tell me what to do, not what state the data is in.

**What scares me (revised):**

The IronPlanet capture rate at 17% still scares me. But after reading the Competitor Analyst's note that Ritchie Bros owns IronPlanet and could restrict access entirely, I have shifted my worry. The scarier long-term problem is not "fix IronPlanet scraping" but "what happens when a platform blocks us." The PM listed GovPlanet as the next source (ADR-004). I agree. Get a third source working so that if IronPlanet goes to zero, I still have two feeds.

The Technical Lead confirmed there is no request queuing for analyst calls and the 25-second timeout means analysis can silently fail under Claude API load. The Business Analyst's AC-003.6 says the system falls back to "gate-only mode" when the AI is unavailable. That is fine as a fallback, but I need to know it happened. If I am looking at a recommendation and it was generated without the AI (gate-only), I need a visible indicator. Do not show me a recommendation and let me think Claude evaluated it when it did not.

The Business Analyst's OQ-001 is the thing that should scare everyone. If the verdict threshold logic uses OR instead of AND, then a trailer with $600 profit but 5% margin gets a BUY recommendation. I would never buy that deal. Five percent margin means one unexpected cost wipes out the entire profit. If this is how the system works right now, it is recommending deals I would reject, and that erodes my trust in every recommendation.

---

## Feature Reactions

### Scout Pipeline (every 15 min) -- YES, absolutely

This is the backbone. Without this, there is no product. The 15-minute interval is fine. My concern from Round 1 stands and is now unanimous across roles: I have no idea when the scout fails. The PM says P1. The Business Analyst says `last_scout_run` returns null. The Technical Lead says there is no push mechanism. The UX Lead says the notification gap is the single largest UX issue. I am glad everyone agrees. Now fix it.

For MVP, I do not need a fancy alerting system. I need one thing: if the scout has not run successfully in the last 30 minutes, show a red banner on the dashboard that says "Scout has not run since [time]. Deal flow may be stale." That is it. That is the P0 fix. Push notifications can come in Phase 1.

### AI Analysis (Claude dual-lens) -- YES, this is the killer feature

The Competitor Analyst confirmed what I already knew: no one else does this. Swoopa has a "price compare." That is not analysis. DFG runs a full investor-lens plus buyer-lens evaluation with category-specific prompts, repair estimates, and conservative financial modeling. That is why I use this tool.

But the Business Analyst found the OR-vs-AND threshold issue (OQ-001), and that undermines the whole thing. Fix the verdict thresholds to use AND logic for BID (must clear BOTH min profit AND min margin). Use OR logic for WATCH (either one triggers a watch recommendation). PASS stays as-is. This is non-negotiable for me. I will not trust a system that recommends buying 5% margin deals.

The Technical Lead's point about gate-only fallback (when Claude times out) is important. Add a visual indicator -- something like "Analysis: AI-powered" vs. "Analysis: Gates only (AI unavailable)" -- so I know what I am looking at.

### Category Tiers (Trailers, Vehicles, Power Tools) -- YES

The Business Analyst documented the exact thresholds (BR-043 through BR-045) and they match my actual numbers. Trailers: $600 min profit, 40% margin, $6K max acquisition, 100mi max distance. That is correct. The Technical Lead confirmed that adding a new category requires a code deploy (insert row + add prompt file + deploy), which is fine at the rate I add categories.

### Opportunity Workflow -- REVISED YES

In Round 1, I asked for a direct inbox-to-bid shortcut. After reading the Technical Lead's state machine documentation and the Business Analyst's MVC event requirements (AC-004.6: decision_made event must fire BEFORE transition to bid), I understand why that shortcut does not exist. The audit trail matters for algorithm tuning, and skipping steps means skipping data collection.

What I still want: when an opportunity is in `qualifying` and already has an analysis with a BID recommendation and all critical gates are clear, the Inspect button should be prominent and the transition from qualifying to inspect should take one tap. Do not make me scroll past four sections to find the action bar. The UX Lead described the fixed bottom action bar, which is good, but on the detail page for a qualifying item with analysis, the primary CTA should be front and center.

The Technical Lead also noted that `watch -> qualifying` is a valid backward transition (BR-014). That is important. Sometimes I watch something, the price drops, and I want to re-evaluate. The system supports this and I use it.

### Batch Operations -- YES, critically important

I asked in Round 1 for batch reject with a single reason code applied to all. The Business Analyst confirmed in US-007 (AC-007.1) that this is how it works: "all selected opportunities transition to rejected status with the same reason." Good. That is what I need.

One addition: the Business Analyst's AC-007.3 says that if an opportunity in the batch cannot transition (wrong state), it fails individually but the rest continue. That is the right behavior. I do not want one bad ID to block the whole batch.

### Dashboard -- YES, this is my home screen (revised)

The dashboard layout is right. The UX Lead's description of the Attention Required card with inline quick actions (re-analyze, touch, pass, watch) is exactly what I want. I can triage right from the dashboard without opening each detail page.

The UX Lead flagged a concern I should amplify: the Pass action from the dashboard Attention Required list "rejects with a default 'other' reason and no confirmation step." That is too aggressive. If I accidentally tap Pass on a good deal, it is gone with the worst possible reason code ("other" tells the algorithm nothing). Either add a one-tap undo (the UX Lead suggested a 5-second undo toast) or require the reason code selection even from the dashboard. I would prefer the undo toast -- faster is better.

I still want a profit number on the dashboard. "Total Profit: $X,XXX" from won deals. The PM says outcomes tracking is P1 (ADR-003, Option B for MVP: simple win/loss with final price). The Business Analyst says the outcomes table exists but has no UI (Gap identified, P1). Fine, but even just summing `final_price - max_bid_locked` for won deals and showing it as an estimate would give me a signal. It does not have to be perfect.

### Staleness Detection -- YES, simplified

I said in Round 1: do not over-design this. The Business Analyst documented five different staleness concepts (is_stale, is_analysis_stale, is_decision_stale, is_ending_soon, needs_attention). The UX Lead translated these into visual indicators (orange borders, banners, reason chips). That is fine for the code, but in the UI, I still want two states: "this is current" and "this needs a fresh look." The reason chips on the Attention Required list can explain why, but do not make me understand the taxonomy of staleness types to use the app.

### Gates System -- YES, with the override I asked for

I said in Round 1: the Kill Switch Banner that auto-redirects me to the dashboard is bad. Let me see it, understand why, and override. The UX Lead documented the Kill Switch Banner as a "red banner for hard deal-breaker conditions detected from operator inputs." The Business Analyst confirmed in AC-008.2 that entering `titleStatus='salvage'` with a verified level triggers auto-rejection.

I want to be specific: auto-rejection from hard gates is fine. But the redirect is the problem. When the system auto-rejects, show me the red banner, tell me why, and leave me on the detail page. Give me a button that says "I disagree -- undo rejection." Let me re-examine the listing before I get bounced off the page. Sometimes the listing said "salvage" and the auctioneer confirmed it is actually "rebuilt." That happens.

### Operator Inputs -- YES, essential

The UX Lead's documentation of the Title Info form with source selectors and verification levels is thorough. The deep merge behavior (BR-027) is correct -- I do not want to lose previously saved data when I update one field.

The 20% haircut on max bid when gates are not cleared (BR-029) is a smart mechanism. It tells me: "You can still bid, but we are reducing the max bid because we cannot verify title/condition." That respects my autonomy while protecting me from over-bidding on unverified assets.

### Photo Gallery -- YES, needs swipe

I said this in Round 1 and the UX Lead confirmed the gap: "No swipe between photos. No zoom." The lightbox is tap-to-open, tap-to-close. That is not how I look at photos on my phone. I want swipe left-right to move between photos, same as any image viewer. This is a nice-to-have for MVP, but it matters when I am evaluating condition from photos on my phone at a lot.

### Browser `prompt()` for Financial Inputs -- NEW CONCERN, must fix

I did not call this out in Round 1 because I have been living with it. But the UX Lead and Business Analyst both flagged it, and they are right. The Set Bid flow and the Won flow use `window.prompt()` to capture dollar amounts. No validation, no formatting, no confirmation step. On iOS Safari, the prompt dialog is small and the keyboard covers half the screen.

The PM says "numbers must be right" is Principle #1. The money I am committing when I set a max bid is the most consequential number in the entire system. Entering it through a browser prompt is not acceptable. Build a modal with a number input, currency formatting, and a "Confirm: Set max bid to $X,XXX" button. This should be P0 for MVP, not Phase 1.

### MVC Event Logging -- STILL DON'T CARE for MVP

My position has not changed. The Business Analyst documented the event system thoroughly (US-003 through US-006), and I understand its importance for algorithm tuning. The Technical Lead confirmed events are immutable and versioned. Great. But this is infrastructure, not a feature I interact with. The Decision History card on the detail page can stay, but do not spend another minute making it prettier.

---

## What I Need to See

To feel confident using DFG as my primary deal-finding tool and stop manually checking auction sites:

1. **Scout health indicator on the dashboard.** A red banner if the scout has not run in 30+ minutes. This is the minimum viable alerting. No push notification infrastructure needed for MVP -- just an in-app indicator I can see when I open the dashboard. This is P0.

2. **Fix the verdict threshold logic to use AND for BID.** OQ-001 from the Business Analyst. If a deal meets profit threshold but not margin threshold, it should be WATCH, not BID. I will not trust a system that recommends buying low-margin deals.

3. **A real input modal for Set Bid and Won.** Kill `window.prompt()`. Give me a number input with validation and a confirmation step. This is where real money gets committed.

4. **A third auction source as insurance.** IronPlanet at 17% is unreliable. The Competitor Analyst pointed out the platform risk. Get GovPlanet or GovDeals online so I have fallback coverage.

5. **The numbers must stay right.** The canonical money math is the foundation. Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs. Net Proceeds = Sale Price - Listing Fees - Payment Processing. Profit = Net Proceeds - Acquisition Cost. Margin % = (Profit / Acquisition Cost) * 100. Listing fees are selling costs only. Never included in acquisition cost. Never double-counted. Every role on this panel references this formula. Never break it.

6. **Speed on iOS Safari.** The app is usable today. Keep it that way. The UX Lead documented the iOS Safari constraints (min-h-screen, fixed positioning rules, safe area insets, 44px touch targets). Follow those rules. When I tap an opportunity, I want to see the Next Action Card within 1 second.

---

## Make-or-Break Concerns

**I will stop using DFG if:**

- The scout goes down and I miss deals without knowing. Every role flagged this. The PM, the Technical Lead, the Business Analyst, and the UX Lead all identified the notification gap as critical. This is the single highest-priority fix. If I cannot trust that the system is watching, I have to go back to watching manually, which makes the tool worthless.

- The AI analysis gives me a BID recommendation on something I would never buy. The OR-logic threshold issue (OQ-001) means this could already be happening. If a 5% margin trailer gets recommended as BID, I lose trust in every recommendation. Fix the thresholds. Conservative is better than aggressive. The PM stated the principle correctly: "A missed good deal is recoverable; a bad acquisition is cash destroyed."

- The money math breaks. If I bid based on a number the system gave me and the profit calculation was wrong, I am done. I will go back to my spreadsheet. This is why the canonical formulas exist and why every role referenced them.

- The app gets slow or breaks on my phone. The UX Lead documented known iOS Safari issues (checkbox touch targets below 44px, prompt dialogs, no pull-to-refresh). These are livable today. What is not livable is if new features make the app sluggish. Every feature decision should be tested on a phone first.

- Features get added that I did not ask for and they clutter the interface. The Competitor Analyst was honest: the market is small, the moat is shallow, and competitors are converging on AI. The response to that is not to add more features. The response is to make the core features flawless. The PM's phasing is correct -- stay in Phase 0 until it is rock solid.

**I will NOT stop using DFG because of:**

- The auth being basic. The Technical Lead documented the hardcoded credentials and the PM has Clerk planned for Phase 1. Fine. I am the only user. Fix it before anyone else touches this, but do not let it slow down things that help me make money today.

- Missing outcome tracking UI. I track P&L in a spreadsheet. It would be nice in the app. It is not why I open DFG. The PM correctly identified this as P1.

- Only two (or even one and a half) auction sources. The Competitor Analyst compared DFG to Swoopa's 7+ platforms. That comparison does not bother me. Swoopa covers consumer marketplaces. I need Sierra Auction and ideally one or two more government/equipment sources. Quality of analysis matters more than breadth of coverage.

- Accessibility gaps. The UX Lead documented real issues (keyboard navigation, focus trapping, color contrast). These matter for Phase 1 beta users. They do not affect me today. I am a sighted, touch-capable operator using my phone. Fix these before anyone else uses the app.

---

## Willingness to Pay

This is a tool I built for myself, so "willingness to pay" is really about the value of my time and the quality of my decisions.

Before DFG, I spent 2-3 hours a day manually scanning auctions and doing back-of-napkin valuations. DFG cuts that to 20-30 minutes of reviewing pre-scored opportunities. That is roughly 2 hours saved per day.

If I am making an average of $1,200 profit per deal and doing 2-3 deals per month, DFG helps me both find more deals (higher volume) and avoid bad ones (fewer losses). The system paying for itself is not a question -- it already has.

The Competitor Analyst's pricing benchmarks are helpful. Swoopa at $47-352/month with 7+ platforms and native apps. Flipify at $5/month for basic marketplace alerts. Rouse at $200-500+/month for enterprise equipment valuation. DFG's $149/month target sits right in the middle.

Here is how I think about it: I would pay $300/month without blinking if the analysis is reliable and the scout does not miss things. The price sensitivity is not about the dollar amount -- it is about whether the tool actually works. A free tool that gives me bad recommendations is worse than a $500/month tool that is consistently right.

The Competitor Analyst made a point that stung: "DFG's moat is shallow." The scraping, the LLM calls, the scoring -- all replicable. What is not easily replicable is the category-specific domain knowledge (how buyer premiums work on Sierra, what a rebuilt title means for resale, which trailer models hold value). That knowledge lives in my head and in the system's prompts. As long as the analysis feels like it was written by someone who actually flips trailers (because it was trained on my knowledge), the tool is worth the price.

For other operators joining the private beta, $149/month is reasonable if the tool pays for itself within the first deal. At min profit $600, one good deal covers four months of subscription. The Competitor Analyst is right that a free trial or demo would help conversion. But the harder pitch is not price -- it is trust. New users need to see that the recommendations are consistently accurate before they will rely on a tool to make decisions they used to make themselves.

---

## Summary: What Matters Most (MVP, revised after cross-role review)

1. **Scout health indicator on the dashboard.** Red banner if the scout has not run in 30+ minutes. Every role agrees this is critical. Make it P0.
2. **Fix verdict threshold logic (OQ-001).** BID requires BOTH profit AND margin thresholds met. OR logic produces bad recommendations.
3. **Replace `prompt()` with a real bid entry modal.** Validated number input with confirmation step. The most important number in the system deserves better than a browser dialog.
4. **Keep the numbers right.** Canonical money math is non-negotiable. Every role references it. Never break it.
5. **Simplify the reject flow.** Show the multi-select reason code grid. Hide the legacy dropdown. Map it on the backend.
6. **Add a third auction source.** IronPlanet is unreliable and at platform risk. GovPlanet or GovDeals as insurance.
7. **Keep it fast on iOS Safari.** Test every feature on a phone first. Follow the documented iOS Safari constraints.
8. **Do not add features I did not ask for.** The Competitor Analyst said the moat is shallow. The response is not more features -- it is making the existing features flawless.

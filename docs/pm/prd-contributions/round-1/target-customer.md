# Target Customer Contribution -- PRD Review Round 1

**Author:** Target Customer (Scott -- Founder/Operator)
**Date:** 2026-02-06
**Scope:** MVP / Phase 0 only

---

## Who I Am

I'm Scott. I buy undervalued physical assets at auction -- trailers, trucks, equipment, power tools -- and flip them for profit. I'm a one-person operation. My day looks like this: I wake up, check auction sites on my phone while I'm having coffee, drive to a pickup or a lot inspection, list something on Facebook Marketplace from the truck, answer buyer messages, and then maybe check auctions again before bed. I don't sit at a desk. I don't have a team. Every dollar I deploy on a bad acquisition is a dollar I can't use on the next good one.

The hardest part of this job isn't selling -- it's _finding_. Finding the deal before someone else does, knowing the real value before I bid, and not getting burned by a trailer with a hidden bent axle or a truck with a salvage title that the listing conveniently omitted. I can process maybe 20-30 listings a day manually. There are thousands going through Sierra and IronPlanet every week. I'm leaving money on the table every single day because I physically cannot look at everything.

---

## My Current Pain

Before DFG, here's what I was doing, and honestly some days still do when things break:

I open three browser tabs on my phone. Sierra Auction. IronPlanet. Sometimes GovPlanet if I have time. I scroll. I squint at photos on a 6-inch screen. I see a trailer that looks promising -- a 2019 enclosed cargo, current bid $1,800. I open a new tab, search Facebook Marketplace for comparable trailers in Phoenix. I look at what they sold for. I open another tab, Google the model to see if there are known problems. I try to estimate what the buyer's premium will be, what it'll cost me to haul it, whether I need to replace tires. I do this math in my head or on the Notes app. Then I decide: bid or skip.

**That entire process takes me 10-15 minutes per listing.** And most of them are garbage. Too far, too expensive, wrong category, salvage title buried in paragraph four of the description. So I spend 80% of my time rejecting things and 20% actually evaluating deals. It's exhausting and it's slow.

The worst part is the ones I miss. I'll see a listing the day after it ended -- a utility trailer that went for $900 that I could have flipped for $2,200 -- and I want to throw my phone. **I didn't miss it because I'm bad at this. I missed it because I was busy evaluating the five listings before it.**

---

## First Reactions

**What excites me:**

The fact that this thing already exists and I'm already using it -- that says something. The scout running every 15 minutes means I'm not manually refreshing auction pages anymore. That alone saves me an hour a day. The AI analysis giving me a BID/WATCH/PASS recommendation with actual numbers -- max bid, estimated profit, margin -- that's the core of what I need. I was doing all of that in my head before, and I know I was getting it wrong sometimes. Having the system show me the math takes the emotion out of bidding, which is where I used to lose money.

The "Strike Zone" concept on the dashboard -- high-value opportunities ready for action -- that's exactly how my brain works. I don't want to see everything. **I want to see the three things I should act on right now.**

**What confuses me:**

The reject modal has both a "Primary Reason" dropdown AND a multi-select reason code panel. Why do I need to pick the same thing twice? When I'm rejecting the 15th trailer of the morning, I don't want to fill out a form. I want to tap "too far" and move on. The decision reason taxonomy with 13 codes and 8 categories sounds like something designed for a data scientist, not for me standing in a parking lot.

Also -- "Verification Needed" on the dashboard. Verify what? That label doesn't tell me anything. If it means "this opportunity has open critical gates," then say "Needs Info" or "Check This." Verification sounds like I'm confirming my email address.

**What scares me:**

The IronPlanet capture rate is 17%. That means I'm missing 83% of the listings from my second-biggest source. If I'm relying on DFG to be my eyes and it's blind in one eye, I'm going to miss deals and not even know I'm missing them. **That's worse than not having the tool at all**, because at least when I was doing it manually, I knew what I was seeing. Now I think I'm covered and I'm not.

The hardcoded auth also makes me nervous for a different reason -- not because someone's going to steal my data (who cares about my trailer leads), but because it means if someone stumbles onto the analyst endpoint, they could run up my Claude API bill. That's real money.

---

## Feature Reactions

### Scout Pipeline (Scraping every 15 min) -- YES, absolutely

This is the backbone. Without this, there's no product. The 15-minute interval feels right. Auctions don't change minute-to-minute, but I don't want to find out about a new listing 6 hours after it appeared. My one concern: **I have no idea when the scout fails.** The PRD says "Scout failure alerting" is a P1 gap. That should be P0. If the scout goes down Friday night, I don't find out until Monday when I notice the inbox is suspiciously empty. That's a lost weekend of deal flow. I need a text message or something when the scraper breaks. Not an email I'll check next week.

### AI Analysis (Claude-powered dual-lens) -- YES, this is the killer feature

The dual-lens approach -- operator perspective plus buyer perspective -- that's smart. When I evaluate a deal, I think about two things: "Can I buy this cheaply enough?" and "Can I sell this quickly enough?" Having the AI think about both sides is exactly right.

The Next Action Card showing BID/INSPECT/PASS with reasons and walk triggers -- that's the single most important screen in the app. **I want to open an opportunity and know in 3 seconds what I should do.** The walk triggers are especially good. "If the frame is bent, walk away" -- that's exactly what I'd tell an employee if I had one.

Max bid as a single all-in number is crucial. I don't want to see "bid up to $2,100 but remember to factor in 15% buyer premium plus $200 transport..." -- I want to see "$2,680 max, all costs included." The system does this and that's correct.

### Category Tiers (Trailers, Vehicles, Power Tools) -- YES, makes sense

Different asset classes need different thresholds. A $40 profit on a power tool is a good flip. A $40 profit on a trailer means I wasted my Saturday. The fact that each category has its own prompts, market comps, and profit thresholds shows someone (me) actually thought about this. The buy box defaults -- min profit $600, min margin 40%, max acquisition $6,000 for trailers -- those are my actual numbers.

### Opportunity Workflow (inbox -> qualifying -> watch -> inspect -> bid -> won/lost) -- MOSTLY YES

The workflow makes sense conceptually. In practice, I skip steps constantly. Something comes in, I look at it, I either bid or reject. I rarely go inbox -> qualifying -> watch -> inspect -> bid in that exact order. Sometimes I see a listing ending in 4 hours with a current bid of $800 and I know immediately I want it -- I don't need to "qualify" it first.

**The ability to jump from inbox directly to bid would save me a lot of taps.** On the detail page, when I'm in "inbox" status, I see Qualify/Watch/Reject buttons. There's no "Set Bid" button. I have to go inbox -> qualifying -> inspect before I can set a bid. That's three status changes for something I already know I want. On a time-sensitive auction, those extra steps cost me.

### Batch Operations (Reject, Archive) -- YES, critically important

When the scout dumps 30 new listings into my inbox overnight, I need to blow through the garbage fast. Batch reject is essential. I do use this. What I'd want that I don't see described: **batch reject with a single reason code applied to all.** Right now it sounds like I'd have to individually tag each rejection, which defeats the purpose of batching.

### Dashboard (Attention Required, Ending Soon, Stats) -- YES, this is my home screen

The dashboard layout is good. Attention Required at the top tells me what needs me right now. Ending Soon tells me what's about to expire. The stat cards (Inbox count, Strike Zone count, Qualifying count) let me know how full my pipeline is.

One thing I want that's missing: **how much money I've made.** Won deals, total profit, average margin. I know the outcomes table schema exists but there's no UI for it. The PRD calls this a P1 gap and recommends a "simple win/loss P&L" for MVP. I agree, but I'd push it harder -- even just a single number at the bottom of the dashboard that says "Total Profit: $X,XXX" would make me feel like this system is actually working. Right now I track that in a spreadsheet.

### Staleness Detection -- YES, but don't over-design it

If I got an analysis 10 days ago and the bid has gone up $800 since then, I need to know the analysis is stale. The orange border on the Next Action Card is the right approach. Simple, visible, not annoying. The "Re-analyze" button is good.

What I don't want: five different types of staleness filters (stale, analysis_stale, decision_stale, ending_soon, attention). That's too many concepts. I can see them all listed in the filter panel. For me, there's really only two states: "this is current" and "this needs a fresh look." Simplify.

### Gates System (Critical/Confidence gates) -- CAUTIOUSLY YES

The concept of auto-rejecting opportunities that have deal-breaker conditions (salvage title, parts only, over 200K miles) is good. It saves me from even seeing garbage. But the "hard gate" system needs to be conservative about what it auto-rejects. If it kills a deal I would have bought, I'll never trust it again. **The flag action (needs review) is safer than the reject action (auto-reject) for anything borderline.**

The Kill Switch Banner on the detail page -- "this opportunity has been auto-rejected due to disqualifying conditions" with a redirect to dashboard -- that worries me. Don't redirect me. Let me see it, let me understand why, and give me an override. Sometimes a "salvage title" in the listing is wrong. Sometimes it's actually a rebuilt title and the deal is fine. I need to be able to override the gate.

### Operator Inputs (Title status, VIN, condition, overrides) -- YES, essential

This is how I feed my on-the-ground knowledge back into the system. I show up to inspect a trailer, I see the tires are shot, I enter that. The system re-analyzes with my input and gives me an updated max bid that accounts for $400 in new tires. That loop -- ground truth in, updated analysis out -- is where the real value is.

### MVC Event Logging (Audit trail) -- DON'T CARE for MVP

Be honest: I don't look at the Decision History section on the opportunity detail page. It's there, it logs things, fine. But it's not something I'm checking when I'm deciding whether to bid on a trailer. This is infrastructure for future algorithm tuning, not a feature for me today. It's fine that it exists, but don't spend another minute on it for MVP.

### Photo Gallery -- YES, but make it better

The horizontal scroll strip of 24x24 thumbnails works, but I wish I could swipe through photos full-screen without having to tap each one individually. When I'm evaluating a trailer, I want to flip through photos like I'm on Craigslist. Tap to open, swipe left-right, tap to close. The lightbox exists but there's no swipe gesture.

---

## What I Need to See

To feel confident using DFG as my primary deal-finding tool (and stop manually checking auction sites), I need:

1. **Scout reliability I can trust.** If the scout fails, I need to know immediately. Not the next time I open the app and wonder why my inbox is empty. A text message, a push notification, something. This is the #1 gap.

2. **IronPlanet capture rate above 80%.** At 17%, I'm blind on that platform. Fix this or remove it from the sources page so I don't think I'm covered when I'm not.

3. **The numbers need to keep being right.** The money math in this system is correct today -- acquisition cost, net proceeds, profit, margin. It's conservative, it accounts for buyer premium, transport, repairs. If this ever breaks -- if I bid based on a number the system gave me and the profit calculation was wrong -- I'm done. I'll go back to my spreadsheet.

4. **Speed on mobile.** The app is usable today on iOS Safari. Keep it that way. Don't add desktop features that break mobile. Don't add animations or transitions that make the page feel sluggish. When I tap an opportunity, I want to see the Next Action Card within 1 second.

---

## Make-or-Break Concerns

**I will stop using DFG if:**

- The scout goes down and I miss deals without knowing. Trust is everything. If I can't trust that the system is watching, I have to go back to watching manually, which means the tool is worthless.

- The AI analysis gives me a BID recommendation on something that turns out to be garbage more than once or twice. False positives destroy confidence. I'd rather the system be too conservative (more PASS recommendations) than too aggressive (bad BID recommendations). The PRD says this: "A missed good deal is recoverable; a bad acquisition is cash destroyed." That's exactly right.

- The app gets slow or breaks on my phone. I use this in the field, on cellular data, often with one hand. If I have to pinch-zoom or scroll horizontally to see the action buttons, I'm out.

- Features keep getting added that I don't need and they clutter the interface. I don't need a "daily email digest." I don't need "team/organization support." I don't need a "custom scoring algorithm." I need the core loop to work flawlessly: scout finds deals, analyst evaluates them, I review and decide on my phone.

**I will NOT stop using DFG because of:**

- The auth being basic. I'm the only user right now. Hardcoded login is fine for me. Fix it before you invite anyone else, but don't let it slow down features that help me make money.

- Missing outcome tracking UI. I track my P&L in a spreadsheet. It'd be nice in the app, but it's not why I open DFG. I open DFG to find and evaluate deals. Tracking results is a separate workflow.

- Only two auction sources. Sierra and IronPlanet (even at 17%) cover most of what I'm looking at. GovPlanet would be nice but it's not urgent for me. Fix what you have before adding more.

---

## Willingness to Pay

This is a tool I built for myself, so "willingness to pay" is really about the value of my time. Before DFG, I was spending 2-3 hours a day manually scanning auctions and doing back-of-napkin valuations. DFG cuts that to 20-30 minutes of reviewing pre-scored opportunities. That's roughly 2 hours saved per day.

If I'm making an average of $1,200 profit per deal and I'm doing 2-3 deals per month, DFG helps me both find more deals (higher volume) and avoid bad ones (fewer losses). The system paying for itself isn't a question -- it already has.

The PRD mentions $149/month for private beta users. For a tool that saves me 2 hours a day and directly generates revenue, $149 is nothing. I'd pay $300/month without blinking if the analysis is reliable and the scout doesn't miss things. The price sensitivity here isn't about the dollar amount -- it's about whether the tool actually works. A free tool that gives me bad recommendations is worse than a $500/month tool that's consistently right.

For other operators who might be smaller or just getting started, $149/month is reasonable if the tool pays for itself within the first deal. At min profit $600, one good deal covers four months of subscription. That's an easy pitch. The harder pitch is convincing them to trust a robot to evaluate deals they used to evaluate themselves. That takes accuracy first, marketing second.

---

## Summary: What Matters Most to Me (MVP Only)

1. **Fix the scout reliability and alerting.** I need to know when it breaks. This is P0.
2. **Fix IronPlanet capture rate.** 17% is unacceptable for a source I'm supposedly monitoring.
3. **Keep the numbers right.** The money math is the foundation. Never break it.
4. **Simplify the reject flow.** One tap, one reason code, done. Stop making me fill out forms.
5. **Keep it fast on iOS Safari.** Every feature decision should be tested on a phone first.
6. **Don't add features I didn't ask for.** The core loop works. Polish it, harden it, make it reliable. That's the MVP.

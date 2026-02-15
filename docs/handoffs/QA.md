# QA Team Handoff

**Updated:** 2026-01-07
**Author:** PM Team (for QA Team consumption)

---

## Mission

Verify that shipped features work correctly and meet acceptance criteria. Protect data credibility—the thing users trust most.

---

## Current State

**App URL:** https://app.durganfieldguide.com/

**What's testable:**

- Dashboard with opportunity counts
- Opportunity list with filters (status, source, ending soon, attention required)
- Opportunity detail view with analysis display
- Status transitions (inbox → qualifying → watch → bid → won/lost)
- Mobile navigation (hamburger menu, filter bar)
- Photo display from R2

**Known limitations:**

- No push notifications (must refresh to see alerts)
- Sources page linked but doesn't exist yet (404 expected)
- Auth is hardcoded (credentials provided by Captain)

---

## This Session's Focus

**Status:** Awaiting Dev completion of Sprint N+8

**When issues arrive with `status:qa` + `needs:qa`:**

1. Open the linked PR or issue
2. Test each acceptance criterion listed
3. For each AC:
   - Pass → note it
   - Fail → document steps to reproduce, screenshot, expected vs actual
4. When complete:
   - All pass → Comment "✅ QA PASS - ready to merge", change label to `status:verified`
   - Any fail → File bug issue, comment "❌ QA FAIL - see #[bug number]", add `needs:dev`

**Specific items to test:** None currently queued. Check GitHub for `status:qa` label.

---

## What Works

**Testing approach:**

- Fresh browser session for each test (avoid cached state)
- Mobile viewport testing (hamburger menu, filter bar scroll)
- Check numbers match across views (data credibility)
- Screenshot each AC verification

**Bug filing:**

- Use GitHub issue with Bug template
- Include: steps to reproduce, expected vs actual, screenshot
- Link to parent story if applicable
- Add `type:bug`, `status:triage` labels

---

## Watch Out For

- **Numbers must match everywhere** — Same profit in list view, detail view, analysis section
- **Fee handling** — Listing fees should only appear in selling costs, not acquisition
- **iOS Safari quirks** — Test on actual device if possible
- **Stale data** — Analysis can be older than listing; check timestamps
- **Empty states** — What happens with zero opportunities? Zero photos?

---

## Report Back

When session ends, report to Captain:

- Issues tested (pass/fail for each)
- Bugs filed (issue numbers)
- Blockers encountered
- Anything unclear in acceptance criteria

PM will capture this in the next handoff.

---

## Quick Reference

**GitHub search for QA work:**

```
is:open label:"status:qa" label:"needs:qa"
```

**Bug template labels:**

```
type:bug, status:triage, prio:P1, needs:pm
```

**Relay (if needed):**

- URL: `https://dfg-relay.automation-ab6.workers.dev/directive`
- Token: `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f`

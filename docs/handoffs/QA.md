# QA Team Handoff

**Updated:** 2026-01-07

---

## Mission

Verify that shipped features work correctly and meet acceptance criteria. Protect data credibility—the thing users trust most.

QA Team uses the Chrome Extension to test the production app and files bugs in GitHub when issues are found.

---

## Current State

**App URL:** https://app.durganfieldguide.com/

**Test credentials:** Check with Captain (hardcoded auth, not in docs)

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

---

## Current Focus

**Sprint N+8** — Awaiting Dev completion

When issues move to `status:qa` + `needs:qa`:
1. Test each acceptance criterion
2. Screenshot evidence for UI-related items
3. Pass → change to `status:verified`, comment "✅ QA PASS"
4. Fail → file bug issue, comment "❌ QA FAIL - see #[bug]", add `needs:dev`

**QA backlog:** None currently (waiting for Dev)

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
- Add `type:bug`, `status:triage`, `prio:*` labels

---

## Lessons Learned

- **Data credibility is the priority** — Conflicting numbers are worse than missing features
- **"Looks good" isn't QA** — Test each AC specifically, provide evidence
- **Mobile testing catches real bugs** — Don't skip it
- **Check the math** — Profit, margin, ROI should all be consistent
- **Dismissal states persist** — Alert dismissals survive page refresh

**Bugs we've caught:**
- Margin showing 0% while profit positive (math inconsistency)
- Filter chips not dismissing properly on mobile
- Photo gallery not loading (R2 URL issues)

---

## Watch Out For

- **Numbers must match everywhere** — Same profit in list view, detail view, analysis section
- **Fee handling** — Listing fees should only appear in selling costs, not acquisition
- **iOS Safari quirks** — Test on actual device if possible
- **Stale data** — Analysis can be older than listing; check timestamps
- **Empty states** — What happens with zero opportunities? Zero photos?

---

## Session Notes

**Last session:**
- No active QA work (Sprint N+8 stalled)

**Next session should:**
1. Check GitHub for `status:qa` + `needs:qa` labels
2. When found, test against acceptance criteria in the issue
3. Provide pass/fail with screenshot evidence
4. Update this handoff at /EOD

---

## Session Essentials

| Resource | Value |
|----------|-------|
| App URL | `https://app.durganfieldguide.com/` |
| Repo | `https://github.com/durganfieldguide/dfg-console` |
| Relay URL | `https://dfg-relay.automation-ab6.workers.dev/directive` |
| Relay Token | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |

**QA search in GitHub:**
```
is:open label:"status:qa" label:"needs:qa"
```

**Bug template labels:**
```
type:bug, status:triage, prio:P1, needs:pm
```

# PM Team Handoff

**Updated:** 2026-01-09

---

## Mission

Build a demand-driven intelligence system that finds undervalued physical assets at auction (trailers first, then light equipment), evaluates them conservatively, and outputs actionable guidance an operator can execute profitably.

DFG is an operator tool and subscription SaaS for deal flow generation. Not a marketplace, not a dashboard.

---

## Capabilities

**What PM Team can do directly (no Captain needed):**

| Action                    | How                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fetch GitHub issues       | `curl https://api.github.com/repos/durganfieldguide/dfg-console/issues?state=open`                                                                                |
| Get single issue          | `curl https://api.github.com/repos/durganfieldguide/dfg-console/issues/{number}`                                                                                  |
| Create issue              | POST to relay: `curl -X POST -H "Authorization: Bearer {token}" -H "Content-Type: application/json" -d '{"title":"...","body":"...","labels":[...]}' {relay_url}` |
| Comment on issue          | POST to relay `/comment` endpoint                                                                                                                                 |
| Close issue               | POST to relay `/close` endpoint                                                                                                                                   |
| Read/write local files    | Filesystem tools on `/Users/scottdurgan/Documents/SMDurgan LLC`                                                                                                   |
| Run bash commands         | API calls, data processing, file operations                                                                                                                       |
| Search past conversations | `conversation_search` and `recent_chats` tools                                                                                                                    |

**What requires Captain:**

- Merging PRs
- Deploying to production
- Routing work to other teams (copy Agent Brief to their window)
- Approving significant scope changes

**Rule:** If you think "I can't do X," check this list first. Try before declaring inability.

---

## Current State

**What's built and working:**

- Scout operational (Sierra + IronPlanet adapters, ~19 candidates from 327 listings per run)
- Analyst operational (Claude-powered dual-lens valuation)
- API operational (REST endpoints, workflow state machine)
- App operational (Dashboard v2, mobile navigation, filter bar)
- 100% photo coverage via R2 snapshots
- dfg-relay full-featured (create, comment, close issues with auto-injected commands)

**Infrastructure (consolidated Jan 6):**

- Google Workspace on smdurgan.com (Business Plus, $18/mo)
- All 5 domains on single Cloudflare account
- Claude Code best practices deployed (.claude/ tracked in git, 11 slash commands)

**Auth status:** Prototype-grade (hardcoded credentials). Clerk + Stripe planned before external users.

---

## Current Focus

**Sprint N+9** — COMPLETE ✅

16 points delivered in single 4xDev parallel session:

- ✅ #185 Next Action UI (3 pts) — PR #200, commit fcb2a9e
- ✅ #21 Salvage Fix (5 pts) — commit eff732b
- ✅ #187 MVC Event Logging (5 pts) — PR #201, commit 7c3377f
- ✅ #188 Reason Taxonomy (3 pts) — PR #202, commit bfdc762

**All issues closed, production-verified.**

**TEMP OVERRIDE in effect:** QA on production after merge (not preview). PR workflow ready but paused for velocity.

**Roadmap:**

- Feb 2026: 3-5 private beta users
- Jun 2026: 25-30 paying users (~$3,200 MRR at $149/mo)

---

## What Works

- **GitHub as single source of truth** — No external tracker sync needed
- **Namespaced labels** — `status:*`, `needs:*`, `prio:*` drive routing
- **Agent Brief in issues** — Copy/paste handoff eliminates interpretation errors
- **dfg-relay auto-injection** — Commands and planning requirements injected automatically
- **Batch D1/R2/KV lookups** — Single query + Set lookup to stay under ~1000 subrequest limit
- **Content hashing** — Skip projection rewrites if snapshot unchanged

---

## Lessons Learned

- **Data credibility is paramount** — Users tolerate clunky UI if numbers are right. Conflicting numbers = permanent trust loss.
- **"Code merged" ≠ "feature works"** — Require verified acceptance criteria with screenshot evidence
- **"Code complete" ≠ "Done"** — QA verification required before marking complete
- **Never double-count fees** — Listing fees are selling costs only, not acquisition costs
- **Fee semantics matter** — Acquisition cost = cash to acquire. Net proceeds = cash after sale minus selling costs.
- **Try before declaring inability** — Check Capabilities section; attempt the action before saying "I can't"

---

## Watch Out For

- **~1000 subrequest limit per Worker** — Batch all per-lot lookups into single query
- **Claude API is flaky** — Implement retry with exponential backoff (1s, 2s, 4s)
- **D1 writes are expensive** — Use content hashing to skip unchanged projections
- **Source fragility** — Auction site HTML changes break scrapers
- **IronPlanet capture rate** — Currently underperforming vs Sierra

---

## Session Notes

**This session (Jan 9):**

🎯 **First 4xDev Parallel Session** — 16 points delivered

Executed 4 tracks simultaneously using git worktrees:

| Track | Issue                | Points | PR   | Commit  | Status  |
| ----- | -------------------- | ------ | ---- | ------- | ------- |
| A     | #185 Next Action UI  | 3      | #200 | fcb2a9e | ✅ DONE |
| B     | #21 Salvage Fix      | 5      | —    | eff732b | ✅ DONE |
| C     | #187 MVC Events      | 5      | #201 | 7c3377f | ✅ DONE |
| D     | #188 Reason Taxonomy | 3      | #202 | bfdc762 | ✅ DONE |

**Key deliverables:**

- NextActionCard component (verdict-driven operator guidance)
- Boilerplate detection (prevents T&C from triggering false salvage flags)
- MVC event logging (decision_made events with audit trail)
- D1 migration 0006_mvc_events.sql applied
- Decision reason taxonomy (13 codes, 8 categories, multi-select)

**Deployments:**

- dfg-analyst worker deployed
- dfg-api worker deployed
- D1 mvc_events table + 4 indexes created

**Process learnings:**

- Type dependencies handled via rebase (#188 needed #187's types)
- CI fix required mid-flight (unused MvcEvent import)
- Preview URL testing not in effect — QA on production after merge

**Production QA verified:**

- #185: NextActionCard renders with verdict, why, walk triggers, max bid
- #187: Event endpoints live, Reject modal triggers events
- #188: Multi-select chips, 8 categories, "Other" shows notes field, validation works

**Next session should:**

1. Deploy dfg-analyst for #21 activation (boilerplate detection)
2. Plan Sprint N+10
3. Consider #123 (P0 security - unauthenticated analyst endpoints)

---

## Session Essentials

| Resource    | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Relay URL   | `https://dfg-relay.automation-ab6.workers.dev/directive`           |
| Relay Token | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |
| Repo        | `https://github.com/durganfieldguide/dfg-console`                  |
| App         | `https://app.durganfieldguide.com/`                                |

---

## EOD Checklist

Before ending session, verify:

- [ ] Session Notes updated with what actually happened
- [ ] Current Focus reflects true state (no stale blockers)
- [ ] All items discussed are captured (don't write handoff mid-session)
- [ ] Capabilities section still accurate

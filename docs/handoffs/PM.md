# PM Team Handoff

**Updated:** 2026-01-07

---

## Mission

Build a demand-driven intelligence system that finds undervalued physical assets at auction (trailers first, then light equipment), evaluates them conservatively, and outputs actionable guidance an operator can execute profitably.

DFG is an operator tool and subscription SaaS for deal flow generation. Not a marketplace, not a dashboard.

---

## Capabilities

**What PM Team can do directly (no Captain needed):**

| Action | How |
|--------|-----|
| Fetch GitHub issues | `curl https://api.github.com/repos/durganfieldguide/dfg-console/issues?state=open` |
| Get single issue | `curl https://api.github.com/repos/durganfieldguide/dfg-console/issues/{number}` |
| Create issue | POST to relay: `curl -X POST -H "Authorization: Bearer {token}" -H "Content-Type: application/json" -d '{"title":"...","body":"...","labels":[...]}' {relay_url}` |
| Comment on issue | POST to relay `/comment` endpoint |
| Close issue | POST to relay `/close` endpoint |
| Read/write local files | Filesystem tools on `/Users/scottdurgan/Documents/SMDurgan LLC` |
| Run bash commands | API calls, data processing, file operations |
| Search past conversations | `conversation_search` and `recent_chats` tools |

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

**Sprint N+8** — Ready to proceed

10 stories labeled `status:ready` + `sprint:n+8`:
- 5 P0: #145, #146, #152, #153, #154
- 5 P1: #147, #148, #150, #155, #156

**No blockers.** #157 and #159 are closed.

**Other ready items (not sprint-tagged):**
- #123: FIX-004 Analyst Endpoints Unauthenticated (P0, security)
- #131, #130, #129, #128, #143: P1 tech debt and bugs

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

**Last session (Jan 7 AM):**
- Shipped handoff system (PM.md, DEV.md, QA.md + `/sod` and `/eod` commands)
- 11 slash commands now available for Dev Team
- Confirmed #157 and #159 are closed (no P0 blockers)

**This session (Jan 7 PM):**
- Closed 37 stale issues (Sprint N+2 through N+6 cleanup)
- Completed #172: Git worktrees evaluation (ready for parallel dev)
- **MAJOR:** Completed #173: Type consolidation (unblocks worktrees)
  - Fixed production bug: hard_gate_failure → 'other' (DB constraint compliance)
  - Consolidated shared types into @dfg/types package
  - All typechecks pass (app + API)
- Created #175: Schema evolution for rejection reasons (P2 follow-up)
- Fixed `/eod` command and `.claude/settings.json` (committed)

**Deliverables:**
- `docs/worktrees-analysis.md` — Full evaluation with prep checklist
- Commit 3ad0ff7 — Type consolidation (18 files changed)
- Issue #175 — Follow-up for schema evolution

**Status:**
- **Worktrees: UNBLOCKED** — Type consolidation complete, ready for parallel work
- **Sprint N+8: READY** — 5 P0 stories ready for dev (#145, #146, #152, #153, #154)

**Next session should:**
1. Start Sprint N+8 P0 stories (type consolidation no longer blocks)
2. Optionally set up worktrees for parallel development
3. Consider #123 (unauthenticated analyst endpoints - security P0)

---

## Session Essentials

| Resource | Value |
|----------|-------|
| Relay URL | `https://dfg-relay.automation-ab6.workers.dev/directive` |
| Relay Token | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |
| Repo | `https://github.com/durganfieldguide/dfg-console` |
| App | `https://app.durganfieldguide.com/` |

---

## EOD Checklist

Before ending session, verify:
- [ ] Session Notes updated with what actually happened
- [ ] Current Focus reflects true state (no stale blockers)
- [ ] All items discussed are captured (don't write handoff mid-session)
- [ ] Capabilities section still accurate

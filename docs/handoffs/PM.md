# PM Team Handoff

**Updated:** 2026-01-07

---

## Mission

Build a demand-driven intelligence system that finds undervalued physical assets at auction (trailers first, then light equipment), evaluates them conservatively, and outputs actionable guidance an operator can execute profitably.

DFG is an operator tool and subscription SaaS for deal flow generation. Not a marketplace, not a dashboard.

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
- Claude Code best practices deployed (.claude/ tracked in git, 9 slash commands)

**Auth status:** Prototype-grade (hardcoded credentials). Clerk + Stripe planned before external users.

---

## Current Focus

**Sprint N+8** — Stalled, needs restart

Open P0 blockers:
- #157 (needs triage)
- #159 (needs triage)

Next priorities after blockers clear:
- PRE-006: CI Gating
- CRIT-001: Secure Debug Endpoints
- Clerk + Stripe integration

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
- **SSO-only services require support intervention** — Can't change email without contacting provider

---

## Watch Out For

- **~1000 subrequest limit per Worker** — Batch all per-lot lookups into single query
- **Claude API is flaky** — Implement retry with exponential backoff (1s, 2s, 4s)
- **D1 writes are expensive** — Use content hashing to skip unchanged projections
- **Source fragility** — Auction site HTML changes break scrapers
- **IronPlanet capture rate** — Currently underperforming vs Sierra

---

## Session Notes

**Last session (Jan 6):**
- Shipped Claude Code best practices (CLAUDE.md files, 9 slash commands, Bash(*) allowlist)
- Completed dfg-relay enhancements (#164-168)
- Consolidated Google Workspace, Cloudflare, Google Cloud infrastructure
- Deleted redundant accounts, saving $144/yr
- Identified 3 blockers (Make.com, Claude Max SSO, GitHub username hold)

**Next session should:**
1. Confirm blockers are resolved or deprioritized
2. Triage #157 and #159 to restart Sprint N+8
3. Route cleared issues to Dev Team
4. Address handoff system cleanup (in progress this session)

---

## Session Essentials

| Resource | Value |
|----------|-------|
| Relay URL | `https://dfg-relay.automation-ab6.workers.dev/directive` |
| Relay Token | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |
| Repo | `https://github.com/durganfieldguide/dfg-console` |
| App | `https://app.durganfieldguide.com/` |

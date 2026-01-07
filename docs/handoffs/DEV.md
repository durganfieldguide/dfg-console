# Dev Team Handoff

**Updated:** 2026-01-07

---

## Mission

Build and maintain the DFG platform: a system that scouts auction listings, analyzes them for profitability, and surfaces actionable candidates to operators.

The Dev Team implements features, fixes bugs, and maintains code quality. GitHub Issues are the source of truth for all work.

---

## Current State

**System Architecture:**
```
dfg-app (Vercel/Next.js) → dfg-api (Worker) → dfg-scout (Worker) + dfg-analyst (Worker)
                                    ↓
                              D1 + R2 + KV
```

**Repository:** `https://github.com/durganfieldguide/dfg-console`

**Workers:**
- `dfg-scout` — Auction monitoring, classification, photo capture (cron: */15)
- `dfg-api` — Operator console API, workflow engine (cron: */5)
- `dfg-analyst` — Claude-powered valuation
- `dfg-relay` — GitHub issue management

**Packages:**
- `@dfg/money-math` — Canonical financial calculations

**Current capabilities:**
- Sierra + IronPlanet adapters operational
- Three-gate classification (price → negative keywords → positive keywords)
- Dual-lens analysis (operator + buyer perspective)
- Full CRUD workflow (inbox → qualifying → watch → bid → won/lost)
- 100% photo coverage via R2

---

## Current Focus

**Sprint N+8** — Stalled on P0 blockers

Check GitHub for:
- `status:ready` + `needs:dev` — Ready for development
- `status:in-progress` — Should have your label if you're working it
- `prio:P0` — Drop everything

**Key issues:**
- #157, #159 — P0 blockers (need triage from PM)

**When blockers clear:**
- PRE-006: CI Gating
- CRIT-001: Secure Debug Endpoints

---

## What Works

**Patterns to follow:**
- Use `@dfg/money-math` for all financial calculations—never hand-roll
- Batch D1/R2/KV lookups into single query + Set lookup (subrequest limit)
- Content hash before D1 writes to skip unchanged rows
- Retry Claude API with exponential backoff (1s, 2s, 4s)
- Apply `status:in-progress` label when starting work

**Claude Code setup:**
- Root `CLAUDE.md` + child files in each worker
- 9 slash commands available (`/build-all`, `/test-all`, `/deploy-worker`, etc.)
- `Bash(*)` allowlisted—no permission prompts
- `.claude/` tracked in git

**Commit discipline:**
- Small atomic commits
- Never mix: renaming + logic changes + architecture changes
- Format: `type(scope): description` (e.g., `feat(scout): add GovPlanet adapter`)

---

## Lessons Learned

- **Subrequest limit is real** — ~1000 per Worker invocation. One query that loops = death.
- **D1 writes are expensive** — Hash-check before rewriting projections
- **Never double-count fees** — Listing fees are selling costs only
- **"Code complete" ≠ "Done"** — QA must verify before status:done
- **Debug endpoints need auth** — CRIT-001 exists because they didn't
- **Type safety in D1 queries** — D1 returns `unknown`, cast carefully

**Bugs we've fixed (don't recreate):**
- Margin showing 0% while profit showed positive number
- Listing fees counted in both acquisition and selling costs
- Photos not hydrating due to per-lot queries hitting subrequest limit

---

## Watch Out For

- **IronPlanet capture rate** — Currently ~17%, needs investigation
- **Scout has 3 failing tests** — Known debt, don't add more
- **Hardcoded auth in dfg-app** — Works but is tech debt
- **No frontend tests** — Be careful with UI changes
- **Source HTML changes** — Scrapers are fragile, Sierra especially

**Worker constraints:**
- ~1000 subrequest limit
- 128MB memory limit
- 30s CPU time limit (50ms wall clock for cron)
- No persistent state between invocations

---

## Session Notes

**Last session (Jan 6):**
- Shipped Claude Code best practices (CLAUDE.md, slash commands)
- Completed dfg-relay enhancements (#164-168)
- Config now tracked in git

**Next session should:**
1. Check for `status:ready` + `needs:dev` issues
2. Apply `status:in-progress` when starting work
3. Run `/build-all` and `/test-all` before committing
4. Update this handoff at /EOD

---

## Session Essentials

| Resource | Value |
|----------|-------|
| Relay URL | `https://dfg-relay.automation-ab6.workers.dev/directive` |
| Relay Token | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |
| Repo | `https://github.com/durganfieldguide/dfg-console` |
| App | `https://app.durganfieldguide.com/` |

**Local dev:**
```bash
cd workers/dfg-scout && wrangler dev  # :8787
cd workers/dfg-api && wrangler dev    # :8788
cd apps/dfg-app && npm run dev        # :3000
```

**Deploy:**
```bash
cd workers/dfg-scout && wrangler deploy --env production
cd workers/dfg-api && wrangler deploy --env production
```

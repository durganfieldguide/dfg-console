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
- 11 slash commands available (`/build-all`, `/test-all`, `/deploy-worker`, `/sod`, `/eod`, etc.)
- `Bash(*)` allowlisted—no permission prompts
- `.claude/` tracked in git

**Troubleshooting Claude Code permissions:**

If you're getting permission prompts for bash commands:
1. Check `.claude/settings.local.json` (untracked file)
2. If it exists, delete it: `rm .claude/settings.local.json`
3. Restart Claude Code

**Why this happens:** When you click "Yes, and don't ask again for X", Claude Code adds granular patterns to the local file (e.g., `Bash(wc:*)`). These can override the shared `Bash(*)` wildcard and cause unexpected prompts.

**Solution:** Periodically delete `.claude/settings.local.json` and rely on the shared settings in `.claude/settings.json`.

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
- **Type duplication kills parallel work** — Same types defined in 4 places (app, API, @dfg/types, workers). Consolidate to shared package before using git worktrees.

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
- **`.claude/settings.local.json` overrides** — Untracked file can override shared `Bash(*)` with granular patterns. Delete it if getting permission prompts.

**Worker constraints:**
- ~1000 subrequest limit
- 128MB memory limit
- 30s CPU time limit (50ms wall clock for cron)
- No persistent state between invocations

---

## Session Notes

**Last session (Jan 7):**
- Ran `/sod` - successfully tested new slash command
- Evaluated git worktrees for parallel development (#172)
- Created comprehensive worktrees analysis: `docs/worktrees-analysis.md`
- **Key finding:** Type consolidation required before worktrees (same types in 4 places)
- Created #173: Type consolidation task (prerequisite for parallel work)
- Fixed Claude Code permissions issue in `.claude/settings.local.json`
- Updated DEV.md with troubleshooting guide for permission prompts
- Closed 37 stale issues (Sprint N+2 through N+6)
- Updated PM handoff with capabilities and EOD checklist

**Deliverables:**
- `docs/worktrees-analysis.md` - Full evaluation with prep checklist
- Issue #172 - Completed, routed to Dev
- Issue #173 - Created, ready for implementation

**Status:**
- 6 P0 issues ready for development (Sprint N+8: #145, #146, #152, #153, #154)
- 1 P0 security issue (#123 - unauthenticated analyst endpoints)
- Type consolidation (#173) - prerequisite for worktrees (2-3 hours)

**Next session should:**
1. **Option A:** Execute type consolidation (#173) to unblock parallel worktrees
2. **Option B:** Start Sprint N+8 P0 issues (single-stream work)
3. **Option C:** Tackle security issue #123 (unauthenticated endpoints)

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

# Dev Team Handoff

**Updated:** 2026-01-08

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
- `@dfg/types` — Shared TypeScript types (consolidated Jan 7)

**Current capabilities:**
- Sierra + IronPlanet adapters operational
- Three-gate classification (price → negative keywords → positive keywords)
- Dual-lens analysis (operator + buyer perspective)
- Full CRUD workflow (inbox → qualifying → watch → bid → won/lost)
- 100% photo coverage via R2

---

## Current Focus

**Sprint N+8** — Ready to proceed (blockers cleared)

Check GitHub for:
- `status:ready` + `needs:dev` — Ready for development
- `status:in-progress` — Should have your label if you're working it
- `prio:P0` — Drop everything

**Sprint N+8 Progress:**
- ✅ #152 - Single Source of Truth for Exit Pricing (awaiting QA retry)
- ✅ #153 - Remove Score Vanity Metric (merged)
- ✅ #179 - Label update support for dfg-relay (P2, merged)
- ✅ #180 - Fixed Buyer tab $0 pricing regression
- 🔄 Remaining P0: #145, #146, #154
- 🔒 #123 - P0 security (unauthenticated analyst endpoints)

**Branch protection:** Active on main - all changes require PR + green CI

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

**PR workflow (branch protection enabled):**
- Create feature branch: `git checkout -b feature/issue-123`
- Push and create PR via `gh pr create`
- Wait for CI checks (DFG App, Scout, API must pass)
- Merge with `gh pr merge --squash --auto`
- Update issue labels via dfg-relay `/labels` endpoint

---

## Lessons Learned

- **Subrequest limit is real** — ~1000 per Worker invocation. One query that loops = death.
- **D1 writes are expensive** — Hash-check before rewriting projections
- **Never double-count fees** — Listing fees are selling costs only
- **"Code complete" ≠ "Done"** — QA must verify before status:done
- **Debug endpoints need auth** — CRIT-001 exists because they didn't
- **Type safety in D1 queries** — D1 returns `unknown`, cast carefully
- **Type duplication kills parallel work** — Resolved: Shared types now in @dfg/types package
- **DB schema is authoritative** — TypeScript types must align with DB CHECK constraints, not vice versa

**Bugs we've fixed (don't recreate):**
- Margin showing 0% while profit showed positive number
- Listing fees counted in both acquisition and selling costs
- Photos not hydrating due to per-lot queries hitting subrequest limit
- Code writing 'hard_gate_failure' violates DB CHECK constraint (fixed: use 'other')
- Analyst storing formatted string instead of PriceRange object (#180)
- Vercel build failing due to gitignored @dfg/types dist folder
- CI failing due to @dfg/types not built before app typecheck

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

**New capability - dfg-relay `/labels` endpoint:**
- Programmatically update issue labels via POST
- Enables workflow transitions without GitHub UI
- Example: `{"issue": 152, "add": ["status:qa"], "remove": ["status:in-progress"]}`
- Auth via RELAY_TOKEN (same as other endpoints)

---

## Session Notes

**Last session (Jan 8):**
- **P0 OUTAGE RECOVERY:** Fixed production build broken by type consolidation
  - Added prebuild step to build @dfg/types before Next.js build
  - Fixed CI workflow to build types before app typecheck
  - Commits: 4c66824, 5dc1c44, f61e734
  - Production restored in ~30 minutes

- **Sprint N+8 Stories (3/5 P0 completed):**
  - ✅ #152 - Single Source of Truth for Exit Pricing
    - Frontend now uses phoenix_resale_range as single pricing source
    - Removed fallback heuristics (retail_est * 0.85/1.0/1.1)
    - Buyer and Investor tabs use identical data
    - Commit: 65cd802
    - Status: Awaiting QA retry (needs re-analysis for corrected data)

  - ✅ #180 - Fixed Buyer tab $0 regression (blocker for #152)
    - Root cause: Analyst storing formatted string "$2,300-$4,400" instead of PriceRange object
    - Fixed: Changed line 2187 to store phoenixRangeObj instead of phoenixRangeDisplay
    - Deployed dfg-analyst worker
    - Commit: 7f72dc9
    - Unblocks #152 QA verification

  - ✅ #153 - Remove Score Vanity Metric
    - Removed score badges from OpportunityCard, detail page, attention list
    - Verdict is now only decision metric (no cognitive dissonance)
    - PR #181 merged via squash (branch protection working)
    - Commit: aa6733e

- **Infrastructure (P2):**
  - ✅ #179 - Label update support for dfg-relay
    - New POST /labels endpoint for programmatic label management
    - Enables workflow state transitions via API
    - Successfully tested on #152, #179, #180
    - Commit: 08da297

**Deliverables:**
- 4 issues completed: #152 (QA pending), #153, #179, #180
- 7 commits pushed to main
- 1 PR merged (#181)
- 2 workers deployed (dfg-analyst, dfg-relay)
- CI pipeline fixed and verified working
- Branch protection validated

**Key decisions:**
- Use phoenix_resale_range object as single source for all exit pricing (#152)
- Remove all score displays from operator UI (#153)
- Branch protection workflow: feature branch → PR → CI → squash merge
- Existing opportunities need re-analysis to get corrected pricing data

**Gotchas discovered:**
- Analyst was storing formatted string instead of PriceRange object (line 2187)
- Vercel needs prebuild step to compile @dfg/types (gitignored dist folder)
- CI needs explicit type build step before app typecheck

**Status:**
- **Sprint N+8: 3/5 P0 complete** ✅
- **Remaining P0:** #145, #146, #154
- **Blockers:** None
- **CI/CD:** All green, branch protection working

**Next session should:**
1. Verify #152 QA passes (operator needs to re-analyze to get corrected data)
2. Continue Sprint N+8: #145 (Core Risk tagging), #146 (Buyer Impact), #154 (Default view)
3. Consider #123 (P0 security - unauthenticated analyst endpoints)

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

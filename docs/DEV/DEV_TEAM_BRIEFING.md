# DFG Dev Team Briefing — Claude Code

**Date:** January 5, 2026  
**Tool:** Claude Code (VS Code Terminal)  
**Repo:** durganfieldguide/dfg-console

---

## Project Context

**Mission:** Build a demand-driven intelligence system that finds undervalued physical assets at auction, evaluates them conservatively, and outputs actionable guidance for profitable execution.

**Stack:**
- Frontend: Next.js 14 + Tailwind (Vercel) — `apps/dfg-app`
- API: Cloudflare Worker — `workers/dfg-api`
- Scout: Cloudflare Worker — `workers/dfg-scout`
- Analyst: Cloudflare Worker — `workers/dfg-analyst`
- Data: D1 (SQLite) + R2 (objects) + KV (cache)
- Types: `packages/dfg-types`

---

## Current State (Sprint N+7)

### Just Completed (Sprint N+6)
- ✅ Phase 1: Hotfixes (filter UI, navigation, mobile layout)
- ✅ Phase 2: Security (debug endpoints removed, CORS fixed, SQL parameterized)
- ✅ Phase 3: Debt (sierra naming, FilterChips, @dfg/types, TypeScript fixes)
- ✅ #137: dfg-analyst TypeScript errors (15 → 0)

### Current Sprint (N+7): Money Math
| # | Issue | Priority |
|---|-------|----------|
| **#124** | dfg-money-math canonical module | P0 |
| **#125** | Sierra tier premium bug | P0 |
| **#126** | Buyer premium semantic mismatch | P0 |
| **#127** | Fee math uses sale price | P0 |

---

## Critical Math Rules (Doctrine)

```
Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
Net Proceeds = Sale Price − Listing Fees − Payment Processing
Profit = Net Proceeds − Acquisition Cost
Margin % = (Profit / Acquisition Cost) × 100   // NOT sale price!
```

**Sierra Fee Schedule (verified):**
- $0–$2,500: $75 flat
- $2,501–$5,000: 3% of bid
- $5,001+: 3% with $150 cap

---

## Dev Workflow

### Before Starting Any Issue

```bash
# 1. Pull latest
git checkout main && git pull

# 2. Create branch
git checkout -b fix/issue-number-short-description

# 3. Apply status label (via GitHub)
# Label: status:in-progress
```

### During Development

```bash
# Run these frequently
npm run typecheck          # Must pass
npm run lint               # Must pass
npm run test               # Must pass
npm run build              # Must pass
```

### Before PR

```bash
# Full check
npm run typecheck && npm run lint && npm run test && npm run build

# Commit
git add -A
git commit -m "fix(component): description (#issue)"
git push -u origin HEAD
```

### PR Template Checklist

- [ ] Summary of changes
- [ ] How to test
- [ ] Screenshots (for UI changes)
- [ ] Acceptance criteria addressed
- [ ] CI passing

---

## Key Constraints

### Cloudflare Workers
- ~1000 subrequest limit per invocation
- Batch all D1/R2/KV lookups
- Retry Claude API with backoff (1s, 2s, 4s)

### Fee Handling (CRITICAL)
- **Never double-count fees**
- Listing fees are SELLING costs only
- Acquisition cost = cash to acquire (bid + buyer premium + transport)
- Net proceeds = cash received (sale price − selling fees)

### Mobile/iOS
- Use `dvh` not `vh` for viewport height
- `flex-col` on containers to prevent cutoff
- `-webkit-transform` breaks `position:fixed` — use Portal
- Safe area insets for notch devices

---

## GitHub Issue Workflow

### Labels (Exclusive Status)
- `status:ready` → Available for pickup
- `status:in-progress` → You're working on it
- `status:review` → PR open, self-reviewing
- `status:qa` → Ready for QA verification

### When Picking Up Issue
1. Apply `status:in-progress` label
2. Read Agent Brief section in issue
3. Create branch
4. Implement
5. Change to `status:qa` when PR ready

---

## Commands Reference

```bash
# Development
npm run dev                         # Start all dev servers
cd apps/dfg-app && npm run dev      # Just frontend
cd workers/dfg-api && npm run dev   # Just API

# Validation
npm run typecheck                   # TypeScript check
npm run lint                        # ESLint
npm run test                        # Vitest

# Build
npm run build                       # Build all

# Workspace filtering
npm run typecheck --workspace=workers/dfg-analyst
npm run test --workspace=apps/dfg-app
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude |
| `AGENTS.md` | Codex review instructions |
| `TEAM_WORKFLOW_v1.2.md` | Process documentation |
| `workers/dfg-analyst/src/analysis.ts` | Analysis logic |
| `workers/dfg-analyst/src/calculation-spine.ts` | Fee calculations |
| `packages/dfg-types/` | Shared TypeScript types |

---

## Current Task

**#124: Create packages/dfg-money-math canonical module**

This is the foundation for fixing #125, #126, #127.

Read CLAUDE.md for full project context.

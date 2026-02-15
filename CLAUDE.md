# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DFG (Durgan Field Guide) is an operator tool for identifying undervalued physical assets at auction and producing conservative flip guidance. The frontend is a Next.js 14 app; the backend consists of Cloudflare Workers.

## Repository Structure

```
dfg/
├── apps/dfg-app/          # Next.js 14 operator console (React, TypeScript, Tailwind)
├── workers/
│   ├── dfg-api/           # Cloudflare Worker - REST API for opportunities
│   ├── dfg-scout/         # Cloudflare Worker - auction scraping/pipeline
│   ├── dfg-analyst/       # Cloudflare Worker - AI analysis engine
│   └── dfg-relay/         # Cloudflare Worker - GitHub issue integration
├── packages/dfg-types/    # Shared TypeScript types
└── docs/                  # Documentation and specs
```

## Build Commands

```bash
# Install all dependencies (from repo root)
npm install

# Frontend (dfg-app)
cd apps/dfg-app
npm run dev              # Start dev server (localhost:3000) with Turbo
npm run build            # Production build
npm run type-check       # TypeScript check
npm run lint             # ESLint

# Workers (each worker directory)
cd workers/dfg-api       # or dfg-scout, dfg-analyst, dfg-relay
npx wrangler dev         # Local dev server
npx wrangler deploy      # Deploy to Cloudflare
npx tsc --noEmit         # TypeScript check

# Worker-specific commands
cd workers/dfg-api
npm run test             # Run vitest tests
npm run test:watch       # Run vitest in watch mode
npm run db:migrate       # Run D1 migrations (remote)
npm run db:migrate:local # Run D1 migrations (local)

cd workers/dfg-scout
npm run dev              # Includes --test-scheduled flag
npm run test             # Run vitest tests

cd workers/dfg-analyst
npm run test             # Run acquisition tests (tsx)
npm run test:full        # Run full test suite

# Shared types package
cd packages/dfg-types
npm run build            # Build with tsup
npm run typecheck        # TypeScript check
```

## Architecture

**Data Flow:** Scout (scraping) → D1 (listings) → API (CRUD) → D1 (opportunities) → Analyst (AI evaluation)

**Tech Stack:**

- Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, NextAuth.js
- Backend: Cloudflare Workers with Hono router
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2 (photos, snapshots)
- AI: Claude API (Anthropic)

**Category System:** Analyst has three category tiers with different prompts, market comps, and profit thresholds:

- Power Tools: `prompts-power-tools.ts`, `analysis-power-tools.ts`
- Vehicles: `prompts-vehicles.ts`, `analysis-vehicles.ts`
- Trailers (default): `prompts.ts`, `analysis.ts`, `phoenix-market-data.ts`

## Canonical Money Math (Non-negotiable)

Use these exact definitions everywhere:

- **Acquisition Cost** = Bid + Buyer Premium + Transport + Immediate Repairs
- **Net Proceeds** = Sale Price − Listing Fees − Payment Processing
- **Profit** = Net Proceeds − Acquisition Cost
- **Margin %** = (Profit / Acquisition Cost) \* 100

Listing fees are SELLING COSTS ONLY. Never include in acquisition cost. Never double-count.

## iOS Safari / Mobile Patterns

DFG operators primarily use the app on iOS Safari. All UI changes must follow:

**Layout:**

- Use `flex flex-col md:flex-row` for page containers
- Navigation renders a fixed mobile header (h-14) - add spacer div on mobile
- Use `min-h-screen` instead of `h-screen` to avoid viewport issues

**Fixed/Sticky Elements:**

- Prefer `position: sticky` over `position: fixed`
- Never use `-webkit-transform: translateZ(0)` on body/ancestors (breaks fixed positioning)
- For bottom-fixed elements, use `pb-safe` class for safe area inset

**Touch:** Minimum 44x44px tap targets

**Example Page Layout:**

```tsx
<div className="flex flex-col md:flex-row min-h-screen w-full">
  <Navigation />
  <main className="flex-1 min-w-0">
    <div className="h-14 md:hidden" />
    <div className="p-4">{children}</div>
  </main>
</div>
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (no CSS modules)
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes
- SQL queries must use `.bind()` parameterization (no template literals)

## CI Pipeline

All PRs must pass:

1. DFG App - lint, type-check, build
2. DFG API Worker - type-check, tests
3. DFG Scout Worker - type-check, tests

Run locally before pushing: `npm run lint && npm run type-check`

## Security Checklist

- No `Access-Control-Allow-Origin: *` in production
- No exposed /debug/_ or /test/_ endpoints without auth
- Server-only secrets never reach Next.js client bundles
- R2 snapshots must be immutable (new key per snapshot)

## Slash Commands

This repo has Claude Code slash commands for workflow automation. Run these from the CLI.

| Command                     | When to Use             | What It Does                                         |
| --------------------------- | ----------------------- | ---------------------------------------------------- |
| `/sod`                      | Start of session        | Reads handoff, shows ready work, orients you         |
| `/handoff <issue#>`         | PR ready for QA         | Posts handoff comment, updates labels to `status:qa` |
| `/question <issue#> <text>` | Blocked on requirements | Posts question, adds `needs:pm` label                |
| `/merge <issue#>`           | After `status:verified` | Merges PR, closes issue, updates to `status:done`    |
| `/eod`                      | End of session          | Prompts for summary, updates handoff file            |

### Workflow Triggers

```
Start session     → /sod
Hit a blocker     → /question 123 What should X do when Y?
PR ready          → /handoff 123
QA passed         → /merge 123  (only after status:verified)
End session       → /eod
```

### QA Grade Labels

When PM creates an issue, they assign a QA grade. This determines verification requirements:

| Label        | Meaning    | Verification                       |
| ------------ | ---------- | ---------------------------------- |
| `qa-grade:0` | CI-only    | Automated - no human review needed |
| `qa-grade:1` | API/data   | Scriptable checks                  |
| `qa-grade:2` | Functional | Requires app interaction           |
| `qa-grade:3` | Visual/UX  | Requires human judgment            |
| `qa-grade:4` | Security   | Requires specialist review         |

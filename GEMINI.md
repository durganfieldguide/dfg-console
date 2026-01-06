# DFG (Durgan Field Guide) — Project Context for Code Review

## Mission
Demand-driven intelligence system that finds undervalued physical assets at auction, evaluates them conservatively, and outputs actionable guidance for profitable execution.

## Architecture

```
DFG App (Vercel/Next.js) → DFG API (CF Worker) → Scout/Analyst (CF Workers) → D1/R2/KV
```

### Workers
| Worker | Responsibility |
|--------|----------------|
| dfg-scout | Source scanning, snapshots, candidate classification |
| dfg-api | REST endpoints for DFG App |
| dfg-analyst | Claude-powered valuation and analysis |

### Data Layer
- **D1:** Indices, projections, current state
- **R2:** Immutable snapshots (HTML, images, JSON)
- **KV:** Cache, session data

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types without explicit justification
- Prefer explicit return types on exported functions

### Naming
- Workers: `dfg-{name}`
- Packages: `@dfg/{name}`
- Source adapters: `{source}.adapter.ts`

### Financial Calculations
- **CRITICAL:** All money math must use `@dfg/money-math` package
- Never double-count fees (listing fees are selling costs only)
- Margin = profit / acquisitionCost (NOT sale price)
- Buyer premium: normalize >1 as whole-number %, ≤1 as decimal

### Error Handling
- Workers: Retry with exponential backoff (1s, 2s, 4s) for Claude API
- Graceful degradation over catastrophic failure
- Log errors with context, not just stack traces

## Constraints
- ~1000 subrequest limit per Cloudflare Worker — batch lookups
- D1 writes are expensive — hash-check before rewriting
- All times UTC internally, display in operator's local time

## Security Requirements
- No exposed debug endpoints without auth
- Analyst endpoints must validate requests
- Prototype auth (hardcoded) to be replaced with Clerk before beta

## Current Focus (Sprint N+7)
- Money math correctness (P0)
- Fee calculation consistency
- Data credibility: conflicting numbers = permanent trust loss

## Review Priorities
1. **Math correctness** — Any financial calculation deserves scrutiny
2. **Security** — Exposed endpoints, auth gaps, data leakage
3. **Type safety** — `any` types, missing null checks
4. **Error handling** — Silent failures, missing retries
5. **Naming consistency** — Legacy names vs `dfg-*` convention

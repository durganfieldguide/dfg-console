# Durgan Field Guide (DFG) — Codex Instructions

DFG is an operator tool and subscription SaaS for identifying undervalued physical assets and producing conservative, explainable flip guidance. It is not a marketplace and must not inflate confidence.

## Review guidelines

### P0 blockers (must flag; do not approve)
- Money-math correctness regressions anywhere (UI, API, analyst, exports).
- Any double-counting or semantic drift between: buyer premium, listing fees, processing fees, transport, repairs.
- Conflicting numbers shown to operators for the same concept (two sources of truth).
- Exposed debug endpoints without auth/allowlist, hardcoded creds/secrets, permissive CORS, or leaking env vars to client bundles.
- Public access to immutable snapshots (R2) without signing/expiry when sensitive.

### Canonical money math (non-negotiable)
Use these exact definitions everywhere:
- Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
- Net Proceeds = Sale Price − Listing Fees − Payment Processing
- Profit = Net Proceeds − Acquisition Cost
- Margin % = (Profit / Acquisition Cost) * 100

Rules:
- Listing fees are SELLING COSTS ONLY. Never included in acquisition cost. Never double-count.
- If any of these values are computed in multiple layers, call out drift risk and recommend a single canonical calculation module.

### Data credibility (trust > cleverness)
- If the operator can see two different values for the same thing (current bid, max bid, fee totals, profit, margin), treat as P0.
- Prefer “single displayed truth”: one canonical source and one computation path.
- If a value is derived, it must be labeled as derived and consistent with the stored inputs.

### Staleness & action gating (operator safety)
If analysis depends on any of these and they change, analysis must be marked stale and actions gated:
- currentBid / pricing inputs
- title/operator inputs (condition, location assumptions, etc.)
- fee rates or premium logic
- snapshot identity (lot/listing changes)

When stale or CRITICAL gates are open:
- “Bid/Proceed” actions must be disabled (or require explicit re-analyze).
- UI must clearly show last analyzed timestamp and the inputs used.

### Degrade gracefully
- If category/identity cannot be identified with confidence, verdict must be PASS (do not proceed to analysis; do not present fabricated precision).
- Unknowns increase risk penalties; do not “smooth over” missing data.

### Cloudflare Workers / data layer discipline
- Avoid high fan-out patterns; batch lookups. Be mindful of subrequest limits.
- R2 snapshots must be immutable (new key per snapshot; never overwrite truth).
- D1 writes must be idempotent; avoid expensive rewrites and duplicate rows.
- Retries must use backoff; avoid retry storms.

### Security basics
- Never commit secrets. Prefer runtime env vars.
- Ensure server-only secrets never reach Next.js client bundles.
- Restrict debug endpoints and internal admin routes behind auth + allowlist.

## What a good Codex review looks like (output format)
1) PR intent summary (3 bullets)
2) Blockers (P0) — each with:
   - Location (file path + symbol)
   - Problem (precise)
   - Why it matters (cash / credibility / security)
   - Minimal fix
   - Verification (exact test or manual QA)
3) High priority (P1) — same format
4) Nice-to-have (P2) — same format
5) Required tests / QA checklist

## Verification expectations for changes
- If money math is touched: require deterministic unit tests with fixed inputs that assert profit + margin exactly.
- If staleness/gating is touched: require a manual QA checklist proving gating works (stale banner, re-analyze, last analyzed).
- If scout/classification is touched: require parsing/classification tests that pin expected outputs.
- If security surface is touched: require explicit reasoning and a test or proof path (route protection, auth middleware, signed URLs, etc.).

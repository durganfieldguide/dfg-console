# DFG Team Workflow v1.2

**Updated:** January 5, 2026

---

## Team Structure

| Team | Tool | Primary Responsibility |
|------|------|------------------------|
| Dev Team | Claude Code (VS Code Terminal) | Implementation, PRs, technical decisions |
| QA Team | Claude Chrome Extension | Verification, bug filing, test evidence |
| PM Team | Claude Desktop | Requirements, prioritization, release decisions |
| Captain | Human | Routing, approvals, final decisions |

### Tool Details

**Dev Team — Claude Code**
- Native file system access
- Direct git operations
- Can run tests, typecheck, build
- GitHub App integration (@claude mentions)

**QA Team — Claude Extension**
- Browser-based verification
- Screenshot capture
- Preview URL testing

**PM Team — Claude Desktop**
- Strategic planning
- Issue creation via dfg-relay
- Requirements and specifications

**Captain — Command Center**
- Claude Web for coordination (optional)
- GitHub for routing and approvals
- Final merge authority

---

## Repository Structure

```
dfg-console/
├── apps/
│   └── dfg-app/              # Next.js frontend (Vercel)
├── workers/
│   ├── dfg-api/              # REST API (Cloudflare Worker)
│   ├── dfg-scout/            # Source scanning (Cloudflare Worker)
│   └── dfg-analyst/          # Claude-powered analysis (Cloudflare Worker)
├── packages/
│   ├── dfg-types/            # Shared TypeScript types
│   └── dfg-money-math/       # Canonical fee calculations
└── docs/
    ├── DEV/                  # Developer documentation
    ├── PM/                   # PM specifications
    └── QA/                   # QA reports
```

---

## Commands Reference

The repo uses **npm workspaces** (not pnpm).

### Development
```bash
npm install                    # Install all dependencies
npm run dev                    # Start all dev servers
cd apps/dfg-app && npm run dev # Just frontend
cd workers/dfg-api && npm run dev # Just API
```

### Validation
```bash
npm run typecheck              # TypeScript check (must pass)
npm run lint                   # ESLint (must pass)
npm run test                   # Vitest (must pass)
```

### Build
```bash
npm run build                  # Build all packages
```

### Filtering by Workspace
```bash
npm run typecheck --workspace=workers/dfg-analyst
npm run test --workspace=apps/dfg-app
```

---

## Issue Workflow

### Labels (Exclusive Status)
- `status:ready` — Available for pickup
- `status:in-progress` — Being worked on
- `status:review` — PR open, self-reviewing
- `status:qa` — Ready for QA verification
- `status:done` — Verified and closed

### Picking Up an Issue
1. Find issue with `status:ready` label
2. Apply `status:in-progress` label
3. Create branch: `fix/issue-number-description` or `feat/issue-number-description`
4. Implement changes
5. Run validation: `npm run typecheck && npm run test`
6. Commit and push
7. Create PR
8. Change label to `status:qa`

---

## PR Requirements

Before creating a PR:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes (for significant changes)

PR description should include:
- Summary of changes
- How to test
- Screenshots (for UI changes)
- Closes #issue-number

---

## Critical Rules

### Code Quality
- No `@ts-ignore` or `any` casts
- All SQL must use parameterized queries (`.bind()`)
- Server secrets must never reach client bundles

### Money Math (Doctrine)
- Acquisition Cost = Bid + Buyer Premium + Transport + Repairs
- Net Proceeds = Sale Price - Listing Fees - Processing
- Profit = Net Proceeds - Acquisition Cost
- **Margin % = (Profit / Acquisition Cost) × 100** (NOT sale price!)

### Mobile/iOS
- Use `min-h-screen` not `h-screen`
- Use `flex-col` on containers
- Minimum 44px tap targets

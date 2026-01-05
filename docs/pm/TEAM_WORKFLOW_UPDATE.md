# TEAM_WORKFLOW_v1.2.md — Updates for Tool Migration

**Updated:** January 5, 2026

---

## Replace: Team Structure Section

```markdown
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
```

---

## Replace: Commands Reference (if exists)

```markdown
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
```

---

## Add: Repository Structure (if not present)

```markdown
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
│   └── dfg-money-math/       # Canonical fee calculations (planned)
└── docs/
    ├── DEV/                  # Developer documentation
    ├── PM/                   # PM specifications
    └── qa/                   # QA reports
```
```

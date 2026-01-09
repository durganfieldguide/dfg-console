# DFG Claude Code Configuration

This directory contains Claude Code configuration files for the DFG monorepo.

## Structure

```
claude-code-config/
├── deploy.sh                    # Deployment script
├── CLAUDE.md                    # Root context (monorepo overview)
├── .claude/
│   ├── settings.json            # Tool allowlist and auto-approve
│   └── commands/                # Custom slash commands (8)
│       ├── build-all.md
│       ├── check-money-math.md
│       ├── deploy-worker.md
│       ├── ios-check.md
│       ├── migrate-db.md
│       ├── security-audit.md
│       └── test-all.md
├── .mcp.json                    # MCP server configuration
├── apps/
│   └── dfg-app/
│       └── CLAUDE.md            # Frontend-specific context
└── workers/
    ├── dfg-scout/
    │   └── CLAUDE.md            # Scout worker context
    ├── dfg-analyst/
    │   └── CLAUDE.md            # Analyst worker context
    └── dfg-api/
        └── CLAUDE.md            # API worker context
```

## Deployment

Run from the dfg repo root:

```bash
./claude-code-config/deploy.sh
```

This will deploy:
- `CLAUDE.md` → repo root
- `.claude/settings.json` → repo root
- `.claude/commands/*.md` → repo root
- `.mcp.json` → repo root
- `CLAUDE.md` → `apps/dfg-app/`
- `CLAUDE.md` → `workers/dfg-scout/`
- `CLAUDE.md` → `workers/dfg-analyst/`
- `CLAUDE.md` → `workers/dfg-api/`

## Commit Changes

After deployment:

```bash
git add CLAUDE.md .claude/ .mcp.json apps/dfg-app/CLAUDE.md workers/*/CLAUDE.md
git commit -m "chore: add Claude Code configuration"
git push
```

## Clean Up

After committing, optionally remove this directory:

```bash
rm -rf claude-code-config/
```

## Custom Commands

Eight slash commands will be available in Claude Code:

- `/build-all` - Build and type-check all packages
- `/check-money-math` - Verify canonical money math formulas
- `/deploy-worker` - Deploy a worker to Cloudflare
- `/dfg-review` - Comprehensive code review (existing)
- `/ios-check` - Check iOS Safari compatibility
- `/migrate-db` - Run D1 database migrations
- `/security-audit` - Security audit on recent changes
- `/test-all` - Run all test suites

## MCP Configuration

The `.mcp.json` configures the Cloudflare MCP server. Set these environment variables:

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

Get your API token from: https://dash.cloudflare.com/profile/api-tokens

## File Versioning

The following files are committed to git:
- `CLAUDE.md` (root and subdirectories)
- `.mcp.json`

The `.claude/` directory is gitignored (local preferences only).

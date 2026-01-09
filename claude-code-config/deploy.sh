#!/bin/bash
# DFG Monorepo — Claude Code Configuration Deployment
# Run this from the dfg/ monorepo root

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== DFG Claude Code Config Deployment (Monorepo) ==="
echo ""

# Check we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ Error: Run this from the dfg/ monorepo root (where .git is)"
    exit 1
fi

# Root config
echo "📁 Deploying root config..."
cp "$SCRIPT_DIR/CLAUDE.md" ./CLAUDE.md
echo "   ✓ CLAUDE.md (root)"

mkdir -p .claude/commands
cp "$SCRIPT_DIR/.claude/commands/"*.md .claude/commands/
echo "   ✓ .claude/commands/"

cp "$SCRIPT_DIR/.claude/settings.json" .claude/settings.json
echo "   ✓ .claude/settings.json"

cp "$SCRIPT_DIR/.mcp.json" .mcp.json
echo "   ✓ .mcp.json"
echo ""

# App
if [ -d "apps/dfg-app" ]; then
    echo "📁 Deploying apps/dfg-app/..."
    cp "$SCRIPT_DIR/apps/dfg-app/CLAUDE.md" apps/dfg-app/CLAUDE.md
    echo "   ✓ apps/dfg-app/CLAUDE.md"
else
    echo "⚠️  apps/dfg-app/ not found — skipping"
fi
echo ""

# Workers
for worker in dfg-scout dfg-analyst dfg-api dfg-relay; do
    if [ -d "workers/$worker" ]; then
        echo "📁 Deploying workers/$worker/..."
        cp "$SCRIPT_DIR/workers/$worker/CLAUDE.md" "workers/$worker/CLAUDE.md"
        echo "   ✓ workers/$worker/CLAUDE.md"
    else
        echo "⚠️  workers/$worker/ not found — skipping"
    fi
done
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Files deployed:"
echo "  CLAUDE.md                      — Root context"
echo "  .claude/settings.json          — Tool allowlist"
echo "  .claude/commands/              — Custom slash commands"
echo "  .mcp.json                      — Cloudflare MCP"
echo "  apps/dfg-app/CLAUDE.md         — App context"
echo "  workers/dfg-scout/CLAUDE.md    — Scout context"
echo "  workers/dfg-analyst/CLAUDE.md  — Analyst context"
echo "  workers/dfg-api/CLAUDE.md      — API context"
echo "  workers/dfg-relay/CLAUDE.md    — Relay context"
echo ""
echo "Next steps:"
echo "  git add CLAUDE.md .claude/ .mcp.json apps/dfg-app/CLAUDE.md workers/*/CLAUDE.md"
echo "  git commit -m 'chore: add Claude Code configuration'"
echo "  git push"

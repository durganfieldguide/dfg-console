#!/bin/bash
# eod-universal.sh - End of Day for Claude Code
# Auto-generates handoff from work artifacts and ends session

set -e

# ============================================================================
# DETECT REPOSITORY AND VENTURE
# ============================================================================

REPO=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github\.com[:\/]([^\/]+\/[^\/]+)(\.git)?$/\1/')

if [ -z "$REPO" ]; then
  echo "❌ Not in a git repository"
  exit 1
fi

ORG=$(echo "$REPO" | cut -d'/' -f1)
case "$ORG" in
  durganfieldguide) VENTURE="dfg" ;;
  siliconcrane) VENTURE="sc" ;;
  venturecrane) VENTURE="vc" ;;
  *)
    echo "❌ Unknown venture for org: $ORG"
    exit 1
    ;;
esac

# ============================================================================
# CHECK CRANE_CONTEXT_KEY
# ============================================================================

if [ -z "$CRANE_CONTEXT_KEY" ]; then
  echo "❌ CRANE_CONTEXT_KEY not set"
  echo ""
  echo "Export the key:"
  echo "  export CRANE_CONTEXT_KEY=\"your-key-here\""
  exit 1
fi

# ============================================================================
# DETECT CLIENT AND FIND ACTIVE SESSION
# ============================================================================

CLIENT="universal-cli"
if [ -n "$GEMINI_CLI_VERSION" ]; then
  CLIENT="gemini-cli"
elif [ -n "$CLAUDE_CLI_VERSION" ]; then
  CLIENT="claude-cli"
elif [ -n "$CODEX_CLI_VERSION" ]; then
  CLIENT="codex-cli"
fi
AGENT_PREFIX="$CLIENT-$(hostname)"

ACTIVE_SESSIONS=$(curl -sS "https://crane-context.automation-ab6.workers.dev/active?agent=$AGENT_PREFIX&venture=$VENTURE&repo=$REPO" \
  -H "X-Relay-Key: $CRANE_CONTEXT_KEY")

SESSION_ID=$(echo "$ACTIVE_SESSIONS" | jq -r --arg agent "$AGENT_PREFIX" \
  '.sessions[] | select(.agent | startswith($agent)) | .id' | head -1)

if [ -z "$SESSION_ID" ]; then
  echo "❌ No active session found for this agent"
  echo ""
  echo "Run /sod first to start a session"
  exit 1
fi

SESSION=$(echo "$ACTIVE_SESSIONS" | jq --arg id "$SESSION_ID" '.sessions[] | select(.id == $id)')
TRACK=$(echo "$SESSION" | jq -r '.track // empty')

echo -e "\033[0;36m## 🌙 End of Day\033[0m"
echo ""
echo -e "\033[0;34mRepository:\033[0m $REPO"
echo -e "\033[0;34mVenture:\033[0m $VENTURE"
if [ -n "$TRACK" ]; then
  echo -e "\033[0;34mTrack:\033[0m $TRACK"
fi
echo -e "\033[0;34mSession:\033[0m $SESSION_ID"
echo ""

# ============================================================================
# AUTO-GENERATE HANDOFF FROM WORK ARTIFACTS
# ============================================================================

SESSION_START=$(echo "$SESSION" | jq -r '.started_at')

echo -e "\033[0;36m### 📊 Analyzing Session Activity\033[0m"
echo ""
echo "Session started: $SESSION_START"
echo ""

# Git Commits
echo "Querying git commits..."
GIT_COMMITS=$(git log --since="$SESSION_START" --format="%h %s" --no-merges 2>/dev/null || echo "")
COMMIT_COUNT=$(echo "$GIT_COMMITS" | grep -c . || echo "0")
echo "Found $COMMIT_COUNT commits"
echo ""

# GitHub Issues
if command -v gh &> /dev/null; then
  echo "Querying GitHub issues..."
  ISSUES_CREATED=$(gh issue list --repo "$REPO" --author @me --state all --json number,title,createdAt --jq ".[] | select(.createdAt > \"$SESSION_START\") | \"#\(.number): \(.title)\"" 2>/dev/null || echo "")
  ISSUES_CLOSED=$(gh issue list --repo "$REPO" --state closed --json number,title,closedAt --jq ".[] | select(.closedAt > \"$SESSION_START\") | \"#\(.number): \(.title)\"" 2>/dev/null || echo "")
  ISSUE_CREATED_COUNT=$(echo "$ISSUES_CREATED" | grep -c . || echo "0")
  ISSUE_CLOSED_COUNT=$(echo "$ISSUES_CLOSED" | grep -c . || echo "0")
  echo "Found $ISSUE_CREATED_COUNT issues created, $ISSUE_CLOSED_COUNT closed"
  echo ""
else
  ISSUES_CREATED=""
  ISSUES_CLOSED=""
fi

# GitHub PRs
if command -v gh &> /dev/null; then
  echo "Querying GitHub PRs..."
  PRS_CREATED=$(gh pr list --repo "$REPO" --author @me --state all --json number,title,createdAt --jq ".[] | select(.createdAt > \"$SESSION_START\") | \"#\(.number): \(.title)\"" 2>/dev/null || echo "")
  PRS_MERGED=$(gh pr list --repo "$REPO" --state merged --json number,title,mergedAt --jq ".[] | select(.mergedAt > \"$SESSION_START\") | \"#\(.number): \(.title)\"" 2>/dev/null || echo "")
  PR_CREATED_COUNT=$(echo "$PRS_CREATED" | grep -c . || echo "0")
  PR_MERGED_COUNT=$(echo "$PRS_MERGED" | grep -c . || echo "0")
  echo "Found $PR_CREATED_COUNT PRs created, $PR_MERGED_COUNT merged"
  echo ""
else
  PRS_CREATED=""
  PRS_MERGED=""
fi

# TodoWrite Data
TODO_FILE=".claude/.todos"
TODOS_COMPLETED=""
TODOS_IN_PROGRESS=""

if [ -f "$TODO_FILE" ]; then
  echo "Reading TodoWrite data..."
  TODOS_COMPLETED=$(jq -r '.[] | select(.status == "completed") | "- " + .content' "$TODO_FILE" 2>/dev/null || echo "")
  TODOS_IN_PROGRESS=$(jq -r '.[] | select(.status == "in_progress") | "- " + .content' "$TODO_FILE" 2>/dev/null || echo "")
  COMPLETED_COUNT=$(echo "$TODOS_COMPLETED" | grep -c . || echo "0")
  IN_PROGRESS_COUNT=$(echo "$TODOS_IN_PROGRESS" | grep -c . || echo "0")
  echo "Found $COMPLETED_COUNT completed todos, $IN_PROGRESS_COUNT in progress"
  echo ""
fi

# Current Branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")

# ============================================================================
# BUILD HANDOFF CONTENT
# ============================================================================

echo -e "\033[0;36m### 📝 Generated Handoff\033[0m"
echo ""

# Accomplished
ACCOMPLISHED=""

if [ -n "$GIT_COMMITS" ]; then
  ACCOMPLISHED="${ACCOMPLISHED}Git commits:\n${GIT_COMMITS}\n\n"
fi

if [ -n "$ISSUES_CLOSED" ]; then
  ACCOMPLISHED="${ACCOMPLISHED}Issues closed:\n${ISSUES_CLOSED}\n\n"
fi

if [ -n "$PRS_MERGED" ]; then
  ACCOMPLISHED="${ACCOMPLISHED}PRs merged:\n${PRS_MERGED}\n\n"
fi

if [ -n "$TODOS_COMPLETED" ]; then
  ACCOMPLISHED="${ACCOMPLISHED}Tasks completed:\n${TODOS_COMPLETED}\n\n"
fi

if [ -z "$ACCOMPLISHED" ]; then
  ACCOMPLISHED="No tracked accomplishments (no commits, closed issues, or completed todos)"
fi

# In Progress
IN_PROGRESS=""

if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  IN_PROGRESS="${IN_PROGRESS}Current branch: ${CURRENT_BRANCH}\n\n"
fi

if [ -n "$PRS_CREATED" ]; then
  IN_PROGRESS="${IN_PROGRESS}Open PRs:\n${PRS_CREATED}\n\n"
fi

if [ -n "$ISSUES_CREATED" ]; then
  IN_PROGRESS="${IN_PROGRESS}Issues created:\n${ISSUES_CREATED}\n\n"
fi

if [ -n "$TODOS_IN_PROGRESS" ]; then
  IN_PROGRESS="${IN_PROGRESS}Tasks in progress:\n${TODOS_IN_PROGRESS}\n\n"
fi

if [ -z "$IN_PROGRESS" ]; then
  IN_PROGRESS="No tracked work in progress"
fi

BLOCKED="None detected"

echo "Accomplished:"
echo -e "$ACCOMPLISHED" | sed 's/^/  /'
echo ""
echo "In Progress:"
echo -e "$IN_PROGRESS" | sed 's/^/  /'
echo ""
echo "Blocked:"
echo "  $BLOCKED"
echo ""

# Auto-determine status
STATUS_LABEL="in-progress"
if [ -z "$GIT_COMMITS" ] && [ -z "$ISSUES_CREATED" ] && [ -z "$PRS_CREATED" ] && [ -z "$TODOS_IN_PROGRESS" ]; then
  STATUS_LABEL="done"
fi

echo "Status: $STATUS_LABEL"
echo ""

# Build summary
SUMMARY=$(cat <<EOF
Session completed for $REPO (Track $TRACK)

Accomplished:
$(echo -e "$ACCOMPLISHED")

In Progress:
$(echo -e "$IN_PROGRESS")

Blocked:
$BLOCKED
EOF
)

# Build payload
PAYLOAD=$(jq -n \
  --arg accomplished "$ACCOMPLISHED" \
  --arg in_progress "$IN_PROGRESS" \
  --arg blocked "$BLOCKED" \
  '{
    accomplished: $accomplished,
    in_progress: $in_progress,
    blocked: $blocked,
    next_steps: "Continue from where left off"
  }')

# ============================================================================
# CALL CONTEXT WORKER /eod
# ============================================================================

REQUEST_BODY=$(jq -n \
  --arg session_id "$SESSION_ID" \
  --arg summary "$SUMMARY" \
  --argjson payload "$PAYLOAD" \
  --arg status_label "$STATUS_LABEL" \
  '{
    session_id: $session_id,
    summary: $summary,
    payload: $payload,
    status_label: $status_label,
    end_reason: "manual"
  }')

RESPONSE=$(curl -sS "https://crane-context.automation-ab6.workers.dev/eod" \
  -H "X-Relay-Key: $CRANE_CONTEXT_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "$REQUEST_BODY")

ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
  echo "❌ Failed to end session"
  echo ""
  echo "Error: $ERROR"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

# ============================================================================
# DISPLAY RESULTS
# ============================================================================

HANDOFF_ID=$(echo "$RESPONSE" | jq -r '.handoff_id')
ENDED_AT=$(echo "$RESPONSE" | jq -r '.ended_at')

echo -e "\033[0;32m✅ Session ended successfully\033[0m"
echo ""
echo "Handoff ID: $HANDOFF_ID"
echo "Ended at: $ENDED_AT"
echo ""

# ============================================================================
# CLEAN UP
# ============================================================================

SESSION_CACHE="/tmp/crane-session-$VENTURE-$REPO"
rm -f "$SESSION_CACHE"
echo "🧹 Local session cache cleared"
echo ""

# ============================================================================
# NEXT STEPS
# ============================================================================

echo "---"
echo ""
echo "Your handoff has been stored in Context Worker."
echo ""
echo "Next session:"
echo "  1. Run /sod to start a new session"
echo "  2. The handoff will be available in 'last_handoff'"
echo ""
echo "Good work today! 👋"

# Team Handoffs

Each team maintains ONE handoff file. This is institutional memory—not a log, not an audit trail. It's everything you need to pick up where you left off without losing momentum or direction.

---

## Files

| Team | File | Tool |
|------|------|------|
| PM | `PM.md` | Claude Web |
| Dev | `DEV.md` | Claude Code |
| QA | `QA.md` | Claude Extension |

---

## Commands

| Command | Meaning |
|---------|---------|
| `/SOD` | Start of Day — Read your handoff, orient, report ready |
| `/EOD` | End of Day — Update your handoff, confirm done |

---

## What Goes in a Handoff

| Section | Purpose | Update Frequency |
|---------|---------|------------------|
| **Mission** | Why this project exists | Rarely |
| **Current State** | What's built and working | Weekly |
| **Current Focus** | Active sprint/issues | Daily |
| **What Works** | Validated patterns and approaches | When learned |
| **Lessons Learned** | Solved problems, mistakes made | When learned |
| **Watch Out For** | Gotchas, fragile areas | When discovered |
| **Session Notes** | Last session → next session handoff | Every /EOD |

---

## Rules

1. **One file per team** — No dated copies, no duplicates
2. **Overwrite, don't accumulate** — Git history is the archive
3. **Read before working** — /SOD means read first
4. **Update before stopping** — /EOD means write before done

---

## Session Essentials

Every team needs these. Copy-paste friendly.

| Resource | Value |
|----------|-------|
| **Relay URL** | `https://dfg-relay.automation-ab6.workers.dev/directive` |
| **Relay Token** | `056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f` |
| **Repo** | `https://github.com/durganfieldguide/dfg-console` |
| **App** | `https://app.durganfieldguide.com/` |
| **Workflow Doc** | `/docs/process/TEAM_WORKFLOW_v1.2.md` |

### Relay Usage

```bash
# Create issue
curl -X POST https://dfg-relay.automation-ab6.workers.dev/directive \
  -H "Authorization: Bearer 056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f" \
  -H "Content-Type: application/json" \
  -d '{"title": "Issue title", "body": "Issue body", "labels": ["type:bug", "prio:P1"]}'

# Comment on issue
curl -X POST https://dfg-relay.automation-ab6.workers.dev/comment \
  -H "Authorization: Bearer 056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f" \
  -H "Content-Type: application/json" \
  -d '{"issue": 123, "body": "Comment text"}'

# Close issue
curl -X POST https://dfg-relay.automation-ab6.workers.dev/close \
  -H "Authorization: Bearer 056b6f9859f5f315c704e9cebfd1bc88f3e1c0a74b904460a2de96ec9bceac2f" \
  -H "Content-Type: application/json" \
  -d '{"issue": 123, "comment": "Optional closing comment"}'
```

---

## GitHub Label Quick Reference

### Status (exclusive)
`status:triage` → `status:ready` → `status:in-progress` → `status:review` → `status:qa` → `status:verified` → `status:done`

### Routing (additive)
`needs:pm`, `needs:dev`, `needs:qa`

### Priority
`prio:P0` (drop everything), `prio:P1`, `prio:P2`, `prio:P3`

---

*This file is reference documentation. Do not overwrite.*

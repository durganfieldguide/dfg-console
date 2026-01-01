# PM Handoff - January 1, 2026

**Status:** Sprint N Complete, Sprint N+1 Ready
**GitHub:** https://github.com/durganfieldguide/dfg-console

---

## Sprint N Status

### Completed (22 pts)
All Sprint N stories delivered and deployed.

### Blocking QA (4 pts)
Two P0 bugs fixed, awaiting QA re-test:

| Issue | Title | Status |
|-------|-------|--------|
| [#1](https://github.com/durganfieldguide/dfg-console/issues/1) | BUG-001: Stale badges not visible | CODE COMPLETE - needs QA |
| [#2](https://github.com/durganfieldguide/dfg-console/issues/2) | BUG-002: Chip navigation broken | CODE COMPLETE - needs QA |

**Action:** QA team to re-test acceptance criteria in issues #1 and #2.

---

## Immediate Actions Required

### P0: Configure Sentry DSN
| Issue | Owner | Action |
|-------|-------|--------|
| [#8](https://github.com/durganfieldguide/dfg-console/issues/8) | PM | Provide SENTRY_DSN value from Sentry project settings |

Sentry integration is deployed but non-functional without the DSN secret.

### P0: Security - Secure Debug Endpoints
| Issue | Owner | Action |
|-------|-------|--------|
| [#10](https://github.com/durganfieldguide/dfg-console/issues/10) | Dev | Add auth to dfg-scout debug endpoints before next deploy |

Debug endpoints are publicly accessible - security risk.

---

## Sprint N+1 Backlog (Ready)

### Stories (15 pts)
| Issue | Title | Pts | Status |
|-------|-------|-----|--------|
| [#3](https://github.com/durganfieldguide/dfg-console/issues/3) | Story 2b: Inline CTAs | 5 | READY |
| [#4](https://github.com/durganfieldguide/dfg-console/issues/4) | Story 2c: View All filter | 2 | READY |
| [#5](https://github.com/durganfieldguide/dfg-console/issues/5) | Story 3: Ending Soon section | 8 | READY |

### Tech Debt (6 pts)
| Issue | Title | Pts | Status |
|-------|-------|-----|--------|
| [#6](https://github.com/durganfieldguide/dfg-console/issues/6) | TECH-1: Claude API retry | 2 | READY |
| [#7](https://github.com/durganfieldguide/dfg-console/issues/7) | TECH-2: Fix scout tests | 2 | READY |
| [#9](https://github.com/durganfieldguide/dfg-console/issues/9) | PRE-006: CI Gating | 2 | READY |

### Recommended Sprint Composition (19 pts)
Based on Sprint N velocity (22 pts), recommend pulling:
- All 3 stories (15 pts)
- TECH-2: Fix scout tests (2 pts) - prevents compounding bugs
- TECH-1: Claude API retry (2 pts) - improves reliability

---

## GitHub Workflow

All work now tracked in GitHub Issues:
- **View all issues:** https://github.com/durganfieldguide/dfg-console/issues
- **Sprint N:** Filter by `sprint:n` label
- **Sprint N+1:** Filter by `sprint:n+1` label
- **Blockers:** Filter by `prio:P0` label

### Label Reference
| Category | Labels |
|----------|--------|
| Type | `type:story`, `type:bug`, `type:tech-debt` |
| Priority | `prio:P0` (blocker), `prio:P1`, `prio:P2` |
| Status | `status:ready`, `status:in-progress`, `status:qa`, `status:done` |
| Needs | `needs:pm`, `needs:dev`, `needs:qa` |

---

## Questions for PM

1. **Story 2b (Inline CTAs):** What actions should CTAs trigger?
   - Quick reject?
   - Set watch?
   - Archive?

2. **Story 3 (Ending Soon):** Should this be separate from Attention Required or integrated?

3. **Sprint capacity:** Comfortable with 19 pts given 22 pt velocity last sprint?

---

## Next Steps

1. [ ] QA: Re-test BUG-001 and BUG-002
2. [ ] PM: Provide SENTRY_DSN for issue #8
3. [ ] Dev: Fix CRIT-001 (issue #10) before next deploy
4. [ ] PM: Answer clarifying questions above
5. [ ] PM: Confirm Sprint N+1 composition
6. [ ] All: Use GitHub Issues for all tracking going forward

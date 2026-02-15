Perform a comprehensive code review of recent changes in the DFG codebase. Focus on patterns learned from project history.

## 1. Data Credibility (CRITICAL)

- [ ] Numbers consistent everywhere they appear (no conflicting displays)
- [ ] Fee handling correct: acquisition cost vs selling cost never mixed
- [ ] Profit/margin calculations use same formula throughout
- [ ] No hand-wavy pricing claims - show inputs/outputs
- [ ] Math is conservative by default

## 2. Cloudflare Workers Constraints

- [ ] Batch D1/R2/KV lookups (respect ~1000 subrequest limit)
- [ ] D1 writes use hash-check to skip unchanged data
- [ ] Claude API calls have retry with exponential backoff (1s, 2s, 4s)
- [ ] R2 snapshots are immutable (never overwrite raw truth)
- [ ] KV used only for cache/session data

## 3. Mobile-First & iOS Safari

- [ ] Works at 375px viewport
- [ ] No hover-only interactions (touch must work)
- [ ] Bottom nav/sticky elements use safe-area-inset
- [ ] 100vh avoided (use dvh or alternative)
- [ ] Touch targets ≥44px
- [ ] Horizontal scroll is intentional and obvious (not accidental overflow)

## 4. TypeScript & React Patterns

- [ ] Proper TypeScript types (no `any` without justification)
- [ ] Error boundaries for component failures
- [ ] Loading states for async operations
- [ ] Null/undefined handled explicitly
- [ ] React hooks follow rules (deps arrays correct)

## 5. Error Handling

- [ ] API errors surface user-friendly messages
- [ ] Network failures degrade gracefully
- [ ] Source adapters failing don't crash whole system
- [ ] Validation errors clear and actionable

## 6. Security

- [ ] No secrets in client code
- [ ] Auth checks on all protected routes
- [ ] Input sanitization on user data
- [ ] Debug endpoints not exposed in production

## 7. Performance

- [ ] No N+1 query patterns
- [ ] Images optimized/lazy-loaded
- [ ] Bundle size impact considered
- [ ] Database queries indexed appropriately

## 8. Accessibility

- [ ] Semantic HTML elements used
- [ ] ARIA labels on interactive elements
- [ ] Color contrast sufficient
- [ ] Keyboard navigation works

## 9. Code Organization

- [ ] Single responsibility (one reason to change)
- [ ] No mixed refactors (naming + logic + architecture separate)
- [ ] Adapters modular (one source breaking ≠ system broken)
- [ ] Small atomic commits preferred

## 10. Documentation

- [ ] Complex logic has inline comments
- [ ] API changes reflected in types
- [ ] CLAUDE.md updated with new patterns
- [ ] Breaking changes noted

## Output Format

After review, provide:

### Summary

One paragraph: overall assessment and risk level (LOW/MEDIUM/HIGH)

### Issues Found

| Severity                 | File            | Issue       | Recommendation |
| ------------------------ | --------------- | ----------- | -------------- |
| CRITICAL/HIGH/MEDIUM/LOW | path/to/file.ts | Description | Fix            |

### Patterns to Add to CLAUDE.md

List any new patterns discovered that should be documented.

### Verdict

- [ ] APPROVED - Ship it
- [ ] APPROVED WITH NOTES - Ship with minor fixes
- [ ] CHANGES REQUESTED - Fix before merge
- [ ] BLOCKED - Critical issues must resolve

Review the most recent commits/changes. If no specific files provided, check `git diff main~5..HEAD` or recent PR files.

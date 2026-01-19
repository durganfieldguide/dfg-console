---
description: Run a migration with scratchpad tracking
---

Run migration: $ARGUMENTS

## Steps

1. **Analyze scope**
   - Identify all files/items that need migration
   - Estimate total count
   - Identify dependencies and ordering constraints

2. **Create checklist file**
   ```bash
   touch MIGRATION_PROGRESS.md
   ```
   
   Write all items to migrate as a checkbox list:
   ```markdown
   # Migration: $ARGUMENTS
   
   ## Progress
   - [ ] item1.ts
   - [ ] item2.ts
   - [ ] item3.ts
   
   ## Blocked Items
   (move items here if blocked, with reason)
   
   ## Notes
   (capture decisions and edge cases)
   ```

3. **Process each item**
   - Pick first unchecked item
   - Make the required changes
   - Verify changes work (typecheck, tests, manual)
   - Check off item in `MIGRATION_PROGRESS.md`
   - Commit with reference to item:
     ```bash
     git commit -m "migrate: convert item1.ts to new pattern"
     ```

4. **Handle blockers**
   - If blocked, move item to "Blocked Items" section with reason
   - Continue to next item
   - Return to blocked items at end

5. **Final verification**
   ```bash
   npm run typecheck
   npm run test
   npm run build
   ```
   - Review all changes holistically
   - Check for missed items

6. **Clean up**
   - Delete `MIGRATION_PROGRESS.md` (or commit it for audit trail)
   - Create summary commit or PR description

## DFG Constraints

- **Batch D1/R2/KV lookups** (~1000 subrequest limit)
- **Conservative math** with ranges (low/base/high)
- **Never double-count fees** — listing fees are selling costs only
- **iOS Safari compatibility** for UI changes

## When to Use

- ES module conversions
- Type safety migrations
- API pattern updates
- Schema changes across multiple files
- Any 10+ file change that benefits from tracking

## Tips

- Commit frequently — easier to revert individual items
- Keep checklist visible — prevents losing track mid-migration
- Use "think hard" before starting to plan the approach
- If migration is 50+ items, consider batching into multiple PRs

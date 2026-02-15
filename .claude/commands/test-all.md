---
description: Run all test suites across the monorepo
---

Run all available tests in the DFG monorepo:

1. **dfg-api tests:**

   ```bash
   cd workers/dfg-api && npm run test
   ```

2. **dfg-scout tests:**

   ```bash
   cd workers/dfg-scout && npm run test
   ```

3. **dfg-analyst tests:**

   ```bash
   cd workers/dfg-analyst && npm run test:full
   ```

4. **dfg-app tests** (if available):
   ```bash
   cd apps/dfg-app && npm run test
   ```

Report:

- Total tests run
- Pass/fail count for each package
- Any failing tests with details
- Overall status (all pass / some failures)

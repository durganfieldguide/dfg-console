---
description: Build and type-check all packages (app + workers)
---

Build and type-check the entire DFG monorepo:

1. Run `npm run build` in `apps/dfg-app/`
2. Run `npx tsc --noEmit` in each worker directory:
   - `workers/dfg-api/`
   - `workers/dfg-scout/`
   - `workers/dfg-analyst/`
   - `workers/dfg-relay/`
3. Report any build errors or type errors found
4. If all builds succeed, confirm ready for deployment

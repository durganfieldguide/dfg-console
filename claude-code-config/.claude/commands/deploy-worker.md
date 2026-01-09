---
description: Deploy a specific worker to Cloudflare
---

Deploy a DFG worker to Cloudflare:

1. Ask which worker to deploy (dfg-api, dfg-scout, dfg-analyst, or dfg-relay)
2. Run type check: `npx tsc --noEmit` in the worker directory
3. If type check passes, run tests if available: `npm run test`
4. If tests pass, deploy: `npx wrangler deploy`
5. Tail logs to verify deployment: `npx wrangler tail --format pretty` (first 10 lines)
6. Report deployment status and any errors

---
description: Run D1 database migrations
---

Run D1 database migrations for dfg-api:

1. Ask if this is for local or remote database
2. Show pending migrations: `ls workers/dfg-api/migrations/`
3. Run appropriate migration command:
   - **Local:** `cd workers/dfg-api && npm run db:migrate:local`
   - **Remote:** `cd workers/dfg-api && npm run db:migrate`
4. Verify migration success
5. Report any errors or confirm successful migration

**Warning:** Remote migrations affect production data. Confirm before running.

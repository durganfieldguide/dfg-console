---
description: Run security audit on recent changes
---

Perform a security audit on recent changes:

**Check for:**

1. **SQL Injection:**
   - All D1 queries using `.bind()` parameterization?
   - No template literals in SQL queries?

2. **CORS Configuration:**
   - No `Access-Control-Allow-Origin: *` in production?
   - Proper origin validation?

3. **Debug Endpoints:**
   - No exposed `/debug/*` or `/test/*` without auth?

4. **Secrets:**
   - No API keys, tokens, or credentials in code?
   - Server-only secrets not in Next.js client bundles?

5. **R2 Immutability:**
   - R2 snapshots using unique keys?
   - No overwriting existing snapshots?

6. **Input Validation:**
   - All user input validated at API boundaries?
   - No direct object access without auth checks?

Review the specified files or recent git diff and report any security concerns.

---
description: Verify money math calculations are using canonical formulas
---

Review money math calculations across the codebase to ensure they follow canonical DFG formulas:

**Canonical Money Math:**
- Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
- Net Proceeds = Sale Price − Listing Fees − Payment Processing
- Profit = Net Proceeds − Acquisition Cost
- Margin % = (Profit / Acquisition Cost) * 100

**Critical Rule:** Listing fees are SELLING COSTS ONLY. Never include in acquisition cost.

1. Search for calculation logic in:
   - `workers/dfg-analyst/` (analysis engine)
   - `apps/dfg-app/` (display logic)
   - `packages/dfg-types/` (shared types)

2. Check for violations:
   - Listing fees in acquisition cost
   - Incorrect margin formula (using sale price instead of acquisition cost)
   - Missing components in acquisition cost

3. Report any deviations from canonical formulas
4. Suggest corrections if needed

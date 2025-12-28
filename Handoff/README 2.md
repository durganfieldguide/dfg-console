# DFG Sprint 1: Data Credibility

**Goal:** Ship trust. Fix the numbers before polishing the UI.

---

## Quick Start

```bash
# Copy files to your project
cp -r src/domain/* your-project/src/domain/
cp -r src/config/* your-project/src/config/

# Install test runner (if not present)
npm install -D vitest

# Run tests
npx vitest run src/domain/calc.test.ts

# Watch mode during development
npx vitest src/domain/calc.test.ts
```

---

## What's Included

```
dfg-sprint1/
├── src/
│   ├── domain/
│   │   ├── types.ts       # TypeScript types (single source of truth)
│   │   ├── calc.ts        # Pure calculation functions
│   │   └── calc.test.ts   # Unit tests (41 test cases)
│   └── config/
│       └── defaults.ts    # Default assumptions + profiles
├── docs/
│   ├── SPRINT1_ISSUES.md  # GitHub issues with DoD checklists
│   └── FIELD_AUDIT.md     # UI label → data source mapping
└── README.md              # This file
```

---

## Architecture

### Data Flow

```
ListingSnapshot + Assumptions
         ↓
    calc.ts (pure functions)
         ↓
    DerivedNumbers
         ↓
    AnalysisEnvelope (with trace)
         ↓
    UI (reads from derived paths only)
```

### Key Principle

**Every number displayed in the UI must:**
1. Come from `AnalysisEnvelope.derived.*`
2. Be computed by a function in `calc.ts`
3. Have a trace entry explaining its source
4. Have a defined fallback for missing inputs

### Critical: Selling Costs Are NOT Acquisition Costs

**`CostBreakdown.totalAllIn`** = cash needed to acquire and prep the item (bid + premium + tax + fees + transport + storage + repairs + detailing + contingency).

**Selling costs** (listing fees, payment fees) are deducted from sale price in `ScenarioResult`, NOT included in `totalAllIn`.

```
Profit = (SalePrice - SellingCosts) - TotalAllIn
       = NetProceeds - TotalAllIn
```

This prevents the double-count bug where listing fees were subtracted twice.

### What calc.ts Does

| Function | Purpose |
|----------|---------|
| `computeCostsAtBid(bid, assumptions)` | Compute acquisition + prep costs |
| `computeScenarioResult(costs, scenario, assumptions)` | Compute profit/ROI/margin |
| `deriveMaxBidFromTargetRoi(expectedPrice, assumptions)` | Compute suggested max bid |

### What calc.ts Does NOT Do

- **Confidence scoring** — Depends on evidence quality (photos, comps, title verification). Compute in a separate module (e.g., `src/domain/confidence.ts`).
- **Gate computation** — Depends on listing + evidence + derived numbers. Compute in a separate module (e.g., `src/domain/gates.ts`).
- **UI formatting** — Use the utility functions (`formatPct`, `formatMoney`) but keep presentation logic in components.

### Scope Boundary (Important)

**`calc.ts` is strictly: deterministic money math + bid derivation.**

| Concept | Where It Lives | Why |
|---------|---------------|-----|
| Cost breakdown | `calc.ts` → `computeCostsAtBid()` | Pure math on assumptions |
| Profit/ROI/margin | `calc.ts` → `computeScenarioResult()` | Pure math on costs + scenario |
| Max bid derivation | `calc.ts` → `deriveMaxBidFromTargetRoi()` | Pure math solving for target ROI |
| Confidence | `confidence.ts` (future) | Depends on evidence quality, not math |
| Gates | `gates.ts` (future) | Depends on listing state + evidence + derived |

**Do NOT add confidence or gate logic to `calc.ts`.** Keep it pure and testable.

---

## Integration Guide

### Step 1: Replace Ad-Hoc Calculations

Find all places in your codebase that compute:
- Buyer premium
- Tax
- Total investment
- Profit
- ROI / Margin
- Max bid

Replace with calls to `calc.ts` functions.

**Before (bad):**
```typescript
// In some UI component
const premium = bid * 0.15;
const profit = salePrice - (bid + premium + tax + ...);
```

**After (good):**
```typescript
import { computeCostsAtBid, computeScenarioResult } from '@/domain/calc';

const costs = computeCostsAtBid(bid, assumptions);
const result = computeScenarioResult(costs, { price: salePrice }, assumptions);
// Use result.profit, result.roiOnCostPct, etc.
```

### Step 2: Wire Up Assumptions

Load assumptions from config, allow operator overrides:

```typescript
import { DEFAULT_ASSUMPTIONS } from '@/config/defaults';

// In your analysis pipeline
const assumptions = {
  ...DEFAULT_ASSUMPTIONS,
  ...operatorOverrides,  // from DB or settings
};

const envelope: AnalysisEnvelope = {
  listing,
  assumptions,
  derived: computeDerived(listing, assumptions),
  gates: computeGates(listing, derived),
  // ...
};
```

### Step 3: Build the Trace

As you compute each number, record its source:

```typescript
const trace: Record<string, TraceEntry> = {};

const suggestedMaxBid = deriveMaxBidFromTargetRoi(expectedPrice, assumptions);
trace['derived.bid.suggestedMaxBid'] = {
  source: 'deriveMaxBidFromTargetRoi',
  formula: `Target ${assumptions.bidStrategy.targetRoiPct * 100}% ROI at $${expectedPrice}`,
};

const costs = computeCostsAtBid(suggestedMaxBid, assumptions);
trace['derived.costsAtEffectiveMaxBid.totalAllIn'] = {
  source: 'computeCostsAtBid',
  formula: `sum(bid, premium, tax, fees, transport, repairs, contingency)`,
};
```

### Step 4: Update UI Components

Read from `derived.*` paths, not raw calculations:

```tsx
// In your component
function ProfitDisplay({ analysis }: { analysis: AnalysisEnvelope }) {
  const { expected } = analysis.derived.scenarios;
  
  if (!expected) {
    return <span className="text-muted">Unknown (no comps)</span>;
  }
  
  return (
    <div>
      <span>{formatMoney(expected.profit)}</span>
      <span className="text-sm text-muted">
        ({formatPct(expected.roiOnCostPct)} ROI)
      </span>
    </div>
  );
}
```

---

## Testing

### Run All Tests

```bash
npx vitest run src/domain/calc.test.ts
```

### Test Categories

| Category | What It Tests |
|----------|---------------|
| `computeCostsAtBid` | Cost breakdown accuracy |
| `computeScenarioResult` | Profit/ROI/margin consistency |
| `listingFees handling` | No double-counting (regression) |
| `deriveMaxBidFromTargetRoi` | Max bid achieves target ROI |
| `determinism` | Same inputs → same outputs |
| `utilities` | formatPct, formatMoney, helpers |

### Adding Tests

When you fix a bug:
1. Add a test that would have caught it
2. Run the test to confirm it fails without the fix
3. Apply the fix
4. Verify the test passes

---

## Default Assumptions

Located in `src/config/defaults.ts`:

| Category | Field | Default | Notes |
|----------|-------|---------|-------|
| Auction | buyerPremiumPct | 15% | Sierra standard |
| Auction | salesTaxPct | 8.6% | Arizona |
| Auction | flatFees | $75 | Doc + gate fees |
| Acquisition | transportCost | $150 | Self-pickup |
| Acquisition | contingencyPct | 10% | Buffer for unknowns |
| Reconditioning | estimatedRepairs | $200 | Conservative baseline |
| Bid Strategy | targetRoiPct | 20% | Minimum acceptable ROI |

**Profiles** are pre-configured assumption sets for common scenarios:
- `premium` — Higher margin, longer hold
- `velocity` — Quick flip, lower margin
- `shipped` — Remote pickup with hauler
- `fixer` — Higher repair budget

---

## Sprint 1 Issues

See `docs/SPRINT1_ISSUES.md` for:
- 5 GitHub issues with acceptance criteria
- Definition of Done checklists
- Test cases for each issue

### Priority Order

1. **Fix margin/ROI contradictions** — Most visible trust issue
2. **Eliminate fake price ranges** — Second most visible
3. **Single assumptions object + trace** — Foundation for everything
4. **Uncertainty states** — Stop lying about unknown data
5. **Remove raw markdown** — Easy win, removes jank

---

## Field Audit

See `docs/FIELD_AUDIT.md` for:
- Complete mapping of UI labels to payload paths
- Formula documentation
- Fallback behavior
- Anti-patterns to avoid

---

## Common Issues

### "Numbers don't match"

1. Check Field Audit table — are both reading from same path?
2. Check trace — does it show the formula used?
3. Check assumptions — are they the same for both calculations?

### "Margin shows 0% but profit is positive"

This is the bug we're fixing. Ensure:
- Margin reads from `derived.scenarios.expected.marginOnSalePct`
- Profit reads from `derived.scenarios.expected.profit`
- Both come from same `computeScenarioResult()` call

### "Max bid seems too low/high"

Check:
- `targetRoiPct` in assumptions (default 20%)
- `expectedSalePrice` being used
- Any overrides (`absoluteMaxBid`, `minProfitDollars`)

Run manual calculation:
```typescript
const maxBid = deriveMaxBidFromTargetRoi(expectedPrice, assumptions);
const costs = computeCostsAtBid(maxBid, assumptions);
const result = computeScenarioResult(costs, { price: expectedPrice }, assumptions);
console.log('ROI:', result.roiOnCostPct); // Should be ~0.20
```

---

## Next Steps (Post-Sprint 1)

Once data credibility is solid:

1. **Sprint 2: Workflow**
   - Decision Header above fold
   - Dashboard work queue
   - Opportunity card upgrades
   - Notes/attachments

2. **Sprint 3: Scale**
   - Bulk actions (if volume proves need)
   - Assumptions editor
   - PDF export

3. **Future**
   - Confidence model (based on evidence quality)
   - Gates module
   - Market demand data (when comps available)

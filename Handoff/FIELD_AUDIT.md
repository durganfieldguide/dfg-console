# Field Audit Table

Every number displayed in the UI must trace to exactly one source. This table is the authoritative mapping.

## How to Use

1. Before adding a new number to the UI, add it to this table first
2. When debugging "where did this number come from?", check this table
3. When numbers don't match, verify both are reading from the same path

---

## Bid & Pricing

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| Current Bid | `listing.currentBid` | From listing snapshot | "No bids" |
| Suggested Max Bid | `derived.bid.suggestedMaxBid` | `deriveMaxBidFromTargetRoi(expected.salePrice, assumptions)` | Hide if no expected scenario |
| Operator Max Bid | `derived.bid.operatorMaxBid` | User override, nullable | — |
| Effective Max Bid | `derived.bid.effectiveMaxBid` | `operatorMaxBid ?? suggestedMaxBid` | Hide if neither exists |
| Retail Estimate | `derived.retailEstimate` | `= scenarios.expected.salePrice` | Hide if no expected scenario |

## Cost Breakdown (at Effective Max Bid)

**Note:** `totalAllIn` is acquisition + prep costs only. It does NOT include selling costs (listing fees, payment fees). Selling costs are deducted from sale price in `ScenarioResult`.

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| Total Investment | `derived.costsAtEffectiveMaxBid.totalAllIn` | `computeCostsAtBid(effectiveMaxBid, assumptions)` — excludes selling costs | Hide if no effectiveMaxBid |
| Buyer Premium | `derived.costsAtEffectiveMaxBid.buyerPremium` | `bid * assumptions.auction.buyerPremiumPct` | — |
| Sales Tax | `derived.costsAtEffectiveMaxBid.tax` | `(bid + premium?) * assumptions.auction.salesTaxPct` | — |
| Flat Fees | `derived.costsAtEffectiveMaxBid.flatFees` | `assumptions.auction.flatFees` | — |
| Transport | `derived.costsAtEffectiveMaxBid.transport` | `assumptions.acquisition.transportCost` | — |
| Storage | `derived.costsAtEffectiveMaxBid.storage` | `storagePerDay * expectedHoldDays` | — |
| Repairs | `derived.costsAtEffectiveMaxBid.repairs` | `assumptions.reconditioning.estimatedRepairs` | — |
| Detailing | `derived.costsAtEffectiveMaxBid.detailing` | `assumptions.reconditioning.detailing` | — |
| Contingency | `derived.costsAtEffectiveMaxBid.contingency` | `contingencyBasis * contingencyPct` | — |

## Scenario Results (Expected)

**Important:** Selling costs (listing fees, payment fees) are computed in `computeScenarioResult()`, NOT in `computeCostsAtBid()`. This prevents double-counting.

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| Sale Price | `derived.scenarios.expected.salePrice` | From analysis | "Unknown (no comps)" |
| Listing Fees | `derived.scenarios.expected.listingFees` | From `assumptions.disposition.listingFees` | — |
| Payment Fees | `derived.scenarios.expected.paymentFees` | `salePrice * assumptions.disposition.paymentFeesPct` | — |
| Selling Costs | `derived.scenarios.expected.sellingCosts` | `listingFees + paymentFees` | — |
| Net Proceeds | `derived.scenarios.expected.netProceeds` | `salePrice - sellingCosts` | "—" if no scenario |
| Expected Profit | `derived.scenarios.expected.profit` | `netProceeds - totalAllIn` (selling costs NOT in totalAllIn) | "Unknown" if inputs missing |
| ROI | `derived.scenarios.expected.roiOnCostPct` | `profit / totalAllIn` | "—" if totalAllIn=0 |
| Margin | `derived.scenarios.expected.marginOnSalePct` | `profit / salePrice` | "—" if salePrice=0 |

## Price Range (Multi-Scenario)

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| Quick Price | `derived.scenarios.quick.salePrice` | Lower bound | Hide if <2 scenarios |
| Expected Price | `derived.scenarios.expected.salePrice` | Midpoint | Required for analysis |
| Premium Price | `derived.scenarios.premium.salePrice` | Upper bound | Hide if <2 scenarios |
| Price Range | Computed from scenarios | Only if ≥2 distinct scenarios | "Single-point estimate" |

**Range Display Rules:**
- Only show range if `quick < expected < premium` (all distinct)
- If all identical: show "Single-point estimate (low confidence)"
- If ordering violated: show only expected with warning

## Gates & Readiness

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| Gate Count | `gates.filter(g => g.status === 'open').length` | Count of open gates | 0 |
| Bid Readiness | Computed | `clearedGates / totalGates` | — |
| Critical Gates | `gates.filter(g => g.severity === 'critical' && g.status === 'open')` | Blockers | — |

## Listing Metadata

| UI Label | Payload Path | Formula / Notes | Fallback |
|----------|--------------|-----------------|----------|
| End Time | `listing.endTime` | ISO 8601 string | "End time unknown" |
| End Time Countdown | Computed | `endTime - now` | "—" |
| Location | `listing.location` | From listing | "Location unknown" |
| Photo Count | `listing.photoCount` | Integer | 0 |
| Title Status | `listing.titleStatus` | clean/salvage/rebuilt/unknown | "Unknown" |
| Odometer | `listing.odometerMiles` | Miles | "Unknown" |

## Confidence States

Every numeric field should have an associated confidence. Default display rules:

| Confidence | Number Display | Indicator |
|------------|----------------|-----------|
| High | Show value | None |
| Medium | Show value | Light badge |
| Low | Show value | "Low confidence" label |
| Unknown | "—" | Show reason |

## Anti-Patterns (Don't Do This)

| ❌ Wrong | ✅ Right |
|----------|----------|
| Compute margin in UI component | Read `derived.scenarios.expected.marginOnSalePct` |
| Show "0%" for unknown margin | Show "—" with "Missing sale price" |
| Display range when all prices equal | Show "Single-point estimate" |
| Mark condition "Good" with 1 photo | Show "Unverified" or "Low confidence" |
| Show precise profit without comps | Show "Unknown (no comps)" |

---

## Trace Entry Format

Each entry in `AnalysisEnvelope.trace` should follow this structure:

```typescript
trace: {
  "derived.bid.suggestedMaxBid": {
    source: "deriveMaxBidFromTargetRoi",
    formula: "Solve bid where ROI = profit/totalAllIn >= 20%",
    notes: "Expected price: $7,670"
  },
  "derived.scenarios.expected.profit": {
    source: "computeScenarioResult",
    formula: "netProceeds - totalAllIn = 4,900 - 3,127 = 1,773"
  }
}
```

## Adding New Fields

Before displaying any new number in the UI:

1. Add row to this table with:
   - UI label
   - Payload path (where in `AnalysisEnvelope`)
   - Formula/computation
   - Fallback behavior for missing data

2. Ensure the number is computed in `calc.ts` (not ad-hoc in UI)

3. Add trace entry in analysis pipeline

4. Add test case in `calc.test.ts`

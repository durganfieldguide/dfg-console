# Sprint 1 GitHub Issues

Copy each section below as a separate GitHub issue.

---

## Issue 1: Fix margin/ROI contradictions (P0)

**Labels:** `P0`, `data-credibility`, `Sprint-1`

### Problem
UI shows margin of 0% while profit is $1,637. This is a trust-killer.

### Root Cause
Margin/ROI computed inconsistently or from different data sources than profit.

### Solution
All scenario results must derive from the shared `calc.ts` module.

### Acceptance Criteria
- [ ] All `ScenarioResult` values come from `computeScenarioResult()`
- [ ] UI label "Margin" displays `marginOnSalePct` (profit / salePrice)
- [ ] UI label "ROI" displays `roiOnCostPct` (profit / totalAllIn)
- [ ] If either denominator is 0 or inputs missing: display "—" with reason
- [ ] No "0%" defaults for unknown values

### Test Cases
- [ ] Positive profit → positive margin AND positive ROI
- [ ] Negative profit → negative margin AND negative ROI
- [ ] Missing sale price → margin shows "—"
- [ ] Missing totalAllIn → ROI shows "—"
- [ ] Run `calc.test.ts` passes all "scenario math is internally consistent" tests

### Definition of Done
- [ ] All tests pass
- [ ] Manual QA: pick 5 opportunities, verify margin/ROI/profit are mathematically consistent
- [ ] No `0%` displayed anywhere when profit is non-zero

---

## Issue 2: Eliminate fake price ranges (P0)

**Labels:** `P0`, `data-credibility`, `Sprint-1`

### Problem
Buyer tab shows Quick/Expected/Premium all equal ($7,670), making the "range" meaningless.

### Root Cause
Analysis returns identical values for all scenarios, but UI still renders as a range.

### Solution
Only display range when meaningful data exists.

### Acceptance Criteria
- [ ] Range only displayed if ≥2 distinct scenarios exist
- [ ] If all scenarios identical → render as "Single-point estimate" with `confidence: low/unknown`
- [ ] Enforce ordering: `quick.price ≤ expected.price ≤ premium.price`
- [ ] If ordering violated → suppress range, show only expected with warning

### Test Cases
- [ ] Only expected scenario → no range shown
- [ ] All three present and distinct → range shown
- [ ] All three identical → "Single-point estimate (no comps)" displayed
- [ ] quick > expected → range suppressed, warning shown

### Definition of Done
- [ ] No fake ranges visible in UI
- [ ] Manual QA: verify 5 opportunities with different scenario configurations render correctly

---

## Issue 3: Single assumptions object + required trace (P0)

**Labels:** `P0`, `data-credibility`, `Sprint-1`

### Problem
Numbers computed in multiple places with inconsistent logic.

### Root Cause
No single source of truth for assumptions or calculations.

### Solution
- All analysis uses `Assumptions` type from `types.ts`
- All numbers computed via `calc.ts` functions
- Trace map required in `AnalysisEnvelope`

### Acceptance Criteria
- [ ] `AnalysisEnvelope.assumptions` is populated and persisted
- [ ] `AnalysisEnvelope.trace` is required (not optional)
- [ ] Top 10 displayed numbers have trace entries
- [ ] All cost fields derive from `computeCostsAtBid()`
- [ ] All scenario fields derive from `computeScenarioResult()`
- [ ] No ad-hoc calculations in UI components

### Required Trace Entries (minimum)
```
- derived.bid.suggestedMaxBid
- derived.costsAtEffectiveMaxBid.totalAllIn
- derived.costsAtEffectiveMaxBid.buyerPremium
- derived.costsAtEffectiveMaxBid.tax
- derived.scenarios.expected.profit
- derived.scenarios.expected.roiOnCostPct
- derived.scenarios.expected.marginOnSalePct
- derived.scenarios.expected.netProceeds
- derived.retailEstimate
- gates.length (count of open gates)
```

### Test Cases
- [ ] Snapshot test: same listing + same assumptions → identical derived
- [ ] Changing `buyerPremiumPct` changes only dependent numbers
- [ ] Render same opportunity twice → identical numbers (no drift)

### Definition of Done
- [ ] `calc.test.ts` "determinism" tests all pass
- [ ] Can inspect any opportunity and see trace for key numbers
- [ ] No number displayed without a trace entry

---

## Issue 4: Uncertainty states (P0)

**Labels:** `P0`, `data-credibility`, `Sprint-1`

### Problem
UI shows precise numbers even when underlying data is missing or unreliable.

### Root Cause
No concept of confidence/uncertainty in the data model.

### Solution
- Every metric carries a confidence state
- Missing inputs produce "Unknown" outputs
- Don't show precise numbers for low-confidence data

### Acceptance Criteria
- [ ] `ConfidenceState` type used for all displayed metrics
- [ ] Missing comps → scenario `confidence: unknown/low`, range hidden
- [ ] Missing end time → show "End time unknown" (not blank)
- [ ] Missing title status → show "Title unknown" (not "Clean")
- [ ] Only 1 photo → condition coverage "Low", don't mark systems "Good"
- [ ] Buyer "Market Demand" section hidden until backed by real data

### Confidence Display Rules
| Confidence | Display |
|------------|---------|
| High | Show value |
| Medium | Show value with subtle indicator |
| Low | Show value with "Low confidence" label |
| Unknown | Show "—" with reason |

### Test Cases
- [ ] Missing comps → scenario confidence = unknown
- [ ] 1 photo → evidence coverage = low
- [ ] No end time → UI shows "End time unknown"
- [ ] No title status → UI shows "Title: Unknown"

### Definition of Done
- [ ] No precise numbers shown when inputs are missing
- [ ] Manual QA: verify 5 opportunities with incomplete data show appropriate uncertainty states

---

## Issue 5: Remove raw markdown in Report (P0)

**Labels:** `P0`, `ux`, `Sprint-1`

### Problem
Report tab renders raw markdown tokens (##, **, ---) instead of formatted text.

### Root Cause
No markdown renderer implemented.

### Solution
Either render markdown properly OR replace with structured sections.

### Option A: Render Markdown
- [ ] Use `react-markdown` or similar
- [ ] Apply consistent typography styles
- [ ] Support headings, lists, bold, links

### Option B: Structured Sections (Recommended)
- [ ] Replace Report tab with structured cards:
  - Summary (recommendation + top 3 reasons)
  - Economics (quick/expected/premium if available)
  - Gates (open/cleared checklist)
  - Next Steps (actionable items)
- [ ] Add "Export" action: Copy summary / Share link

### Acceptance Criteria
- [ ] No visible markdown tokens in any analysis view
- [ ] Report content is readable and properly formatted
- [ ] Export functionality exists (at minimum: copy to clipboard)

### Test Cases
- [ ] Any analysis with report → no `##`, `**`, `---` visible
- [ ] Headings render as headings
- [ ] Lists render as lists
- [ ] Links are clickable

### Definition of Done
- [ ] Manual QA: view 10 analyses, zero raw markdown visible
- [ ] Export button works (copies clean text)

---

## Sprint 1 Completion Criteria

All of the following must be true:

1. [ ] All 5 issues closed
2. [ ] All unit tests pass (`npm test`)
3. [ ] Manual QA checklist completed (10 opportunities verified)
4. [ ] No contradicting numbers visible in any opportunity
5. [ ] No fake precision for missing data
6. [ ] No raw markdown visible

## QA Checklist Template

For each opportunity:
- [ ] Profit, ROI, and Margin are mathematically consistent
- [ ] Price range makes sense (or is hidden if not)
- [ ] Max bid is explainable (targets stated ROI)
- [ ] Missing data shows "Unknown" not fake values
- [ ] Report is readable (no markdown tokens)

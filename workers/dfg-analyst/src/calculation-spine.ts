/**
 * CALCULATION SPINE - Single Source of Truth for All Numbers
 *
 * Every number displayed across tabs/reports MUST derive from this object.
 * No more mismatched totals between Summary, Investor Lens, and Full Report.
 */

import {
  calculateBuyerPremium,
  SIERRA_FEE_SCHEDULE,
  type FeeSchedule as MoneyMathFeeSchedule,
} from '@dfg/money-math'

export interface CalculationAssumptions {
  // Fee assumptions
  buyer_premium_pct: number // e.g., 0.15 or tiered (Sierra)
  buyer_premium_amount: number // Actual dollar amount for this bid
  sales_tax_pct: number // e.g., 0.0725

  // Cost assumptions
  transport_estimate: number // Default or quoted
  repairs_basis: 'observed' | 'estimated' | 'unknown'
  repairs_total: number

  // Market assumptions
  holding_days_expected: number // Default 14
  market_data_source: string // 'phoenix_comps' | 'category_heuristic'
}

export interface CalculationSpine {
  // INPUT: The bid we're calculating for
  bid_amount: number

  // ACQUISITION COSTS (all derived from bid)
  buyer_premium: number
  sales_tax: number
  subtotal_acquisition: number // bid + premium + tax

  // POST-ACQUISITION COSTS
  transport: number
  repairs: number
  other_fees: number

  // TOTALS
  total_all_in: number // subtotal_acquisition + transport + repairs + other

  // MARKET VALUES (from comps/heuristics)
  quick_sale_price: number // 7-day fire sale
  market_rate_price: number // 14-21 day expected
  premium_price: number // 30+ day premium buyer

  // MARGINS (all derived from total_all_in)
  quick_sale_profit: number
  quick_sale_margin: number
  expected_profit: number
  expected_margin: number
  premium_profit: number
  premium_margin: number

  // META
  assumptions: CalculationAssumptions
}

/**
 * Build calculation spine from inputs - SINGLE SOURCE OF TRUTH
 *
 * @param args.source - Listing source (e.g., 'sierra'). When 'sierra', uses canonical
 *                      SIERRA_FEE_SCHEDULE from @dfg/money-math for correct tiered premiums.
 */
export function buildCalculationSpine(args: {
  bidAmount: number
  feeSchedule: {
    buyer_premium:
      | number
      | { tiers: Array<{ max_bid: number; premium: number }>; above_threshold_percent?: number }
    sales_tax_percent: number
  }
  transport: number
  repairs: number
  repairsBasis: 'observed' | 'estimated' | 'unknown'
  otherFees?: number
  marketPrices: {
    quick_sale: number
    market_rate: number
    premium: number
  }
  marketSource?: string
  /** Listing source - 'sierra' uses canonical fee schedule from @dfg/money-math */
  source?: string
}): CalculationSpine {
  const {
    bidAmount,
    feeSchedule,
    transport,
    repairs,
    repairsBasis,
    otherFees = 0,
    marketPrices,
    marketSource = 'phoenix_comps',
    source,
  } = args

  // Calculate buyer premium using @dfg/money-math for Sierra (canonical source of truth)
  let buyerPremiumPct: number
  let buyerPremium: number

  if (source === 'sierra') {
    // Use canonical Sierra fee schedule from @dfg/money-math
    // This correctly handles flat fees, percent fees, and caps
    buyerPremium = calculateBuyerPremium(bidAmount, SIERRA_FEE_SCHEDULE)
    // Calculate effective percentage for assumptions tracking
    buyerPremiumPct = bidAmount > 0 ? buyerPremium / bidAmount : 0
  } else if (typeof feeSchedule.buyer_premium === 'number') {
    // Simple percentage-based premium
    buyerPremiumPct = feeSchedule.buyer_premium
    buyerPremium = bidAmount * buyerPremiumPct
  } else {
    // Legacy tiered schedule (non-Sierra) - treat tier.premium as percentage
    // TODO: Migrate other sources to @dfg/money-math fee schedules
    const tieredSchedule = feeSchedule.buyer_premium
    const applicableTier = tieredSchedule.tiers.find((t) => bidAmount <= t.max_bid)
    if (applicableTier) {
      buyerPremiumPct = applicableTier.premium
    } else if (tieredSchedule.above_threshold_percent) {
      buyerPremiumPct = tieredSchedule.above_threshold_percent
    } else {
      buyerPremiumPct = tieredSchedule.tiers[tieredSchedule.tiers.length - 1]?.premium || 0.12
    }
    buyerPremium = bidAmount * buyerPremiumPct
  }

  // Sales tax
  const salesTaxPct = feeSchedule.sales_tax_percent || 0.0725
  const salesTax = (bidAmount + buyerPremium) * salesTaxPct

  // Subtotal acquisition
  const subtotalAcquisition = bidAmount + buyerPremium + salesTax

  // Total all-in
  const totalAllIn = subtotalAcquisition + transport + repairs + otherFees

  // Profits and margins
  // FIX #127: Margin = profit / acquisitionCost (NOT sale price)
  // This measures ROI on capital invested, per DFG doctrine
  const quickSaleProfit = marketPrices.quick_sale - totalAllIn
  const quickSaleMargin = totalAllIn > 0 ? quickSaleProfit / totalAllIn : 0

  const expectedProfit = marketPrices.market_rate - totalAllIn
  const expectedMargin = totalAllIn > 0 ? expectedProfit / totalAllIn : 0

  const premiumProfit = marketPrices.premium - totalAllIn
  const premiumMargin = totalAllIn > 0 ? premiumProfit / totalAllIn : 0

  return {
    bid_amount: bidAmount,
    buyer_premium: Math.round(buyerPremium),
    sales_tax: Math.round(salesTax),
    subtotal_acquisition: Math.round(subtotalAcquisition),
    transport,
    repairs,
    other_fees: otherFees,
    total_all_in: Math.round(totalAllIn),
    quick_sale_price: marketPrices.quick_sale,
    market_rate_price: marketPrices.market_rate,
    premium_price: marketPrices.premium,
    quick_sale_profit: Math.round(quickSaleProfit),
    quick_sale_margin: quickSaleMargin,
    expected_profit: Math.round(expectedProfit),
    expected_margin: expectedMargin,
    premium_profit: Math.round(premiumProfit),
    premium_margin: premiumMargin,
    assumptions: {
      buyer_premium_pct: buyerPremiumPct,
      buyer_premium_amount: Math.round(buyerPremium),
      sales_tax_pct: salesTaxPct,
      transport_estimate: transport,
      repairs_basis: repairsBasis,
      repairs_total: repairs,
      holding_days_expected: 14,
      market_data_source: marketSource,
    },
  }
}

/**
 * Bid Readiness Status
 * Answers: "Can I act on this now?"
 */
export type BidReadiness = 'BID_READY' | 'NOT_BID_READY' | 'DO_NOT_BID'

// Blocker with declared impact on deal economics
export interface BlockerWithImpact {
  issue: string // What's missing/wrong
  impact: string // How it affects the deal
  action: string // What clears it
}

export interface BidReadinessResult {
  status: BidReadiness
  reason: string
  blockers: string[] // Legacy: simple string list for backward compat
  blockers_with_impact: BlockerWithImpact[] // New: structured with impact declarations
}

/**
 * Gated Economics - What happens if gates don't clear
 *
 * When NOT_BID_READY, the user has two options:
 * 1. Clear the gates → use verified economics (full max bid)
 * 2. Don't clear gates → use gated economics (haircutted max bid)
 *
 * This gives the user a real decision: "Is it worth $X to verify?"
 */
export interface GatedEconomics {
  // Verified scenario (gates cleared)
  verified: {
    max_bid: number
    total_all_in: number
    expected_profit: number
    expected_margin: number
  }
  // Gated scenario (gates NOT cleared) - 20% haircut
  gated: {
    max_bid: number // verified max bid × 0.80
    total_all_in: number
    expected_profit: number
    expected_margin: number
    haircut_pct: number // 0.20
    haircut_reason: string // e.g. "Title unverified"
  }
  // Whether gated applies
  is_gated: boolean
  // What clears the gate (actionable)
  clear_with: string[]
}

export function buildGatedEconomics(args: {
  verifiedSpine: CalculationSpine
  bidReadiness: BidReadinessResult
  feeSchedule: {
    buyer_premium:
      | number
      | { tiers: Array<{ max_bid: number; premium: number }>; above_threshold_percent?: number }
    sales_tax_percent: number
  }
  transport: number
  repairs: number
  marketPrices: {
    quick_sale: number
    market_rate: number
    premium: number
  }
  /** Listing source - passed through to buildCalculationSpine for correct fee calculation */
  source?: string
}): GatedEconomics {
  const { verifiedSpine, bidReadiness, feeSchedule, transport, repairs, marketPrices, source } =
    args

  const isGated = bidReadiness.status === 'NOT_BID_READY'

  // Build verified scenario from existing spine
  const verified = {
    max_bid: verifiedSpine.bid_amount,
    total_all_in: verifiedSpine.total_all_in,
    expected_profit: verifiedSpine.expected_profit,
    expected_margin: verifiedSpine.expected_margin,
  }

  // If not gated, gated scenario equals verified
  if (!isGated) {
    return {
      verified,
      gated: {
        ...verified,
        haircut_pct: 0,
        haircut_reason: 'N/A - all gates cleared',
      },
      is_gated: false,
      clear_with: [],
    }
  }

  // Calculate gated scenario with 20% haircut
  const haircutPct = 0.2
  const gatedMaxBid = Math.round(verifiedSpine.bid_amount * (1 - haircutPct))

  // Recalculate economics at gated max bid
  const gatedSpine = buildCalculationSpine({
    bidAmount: gatedMaxBid,
    feeSchedule,
    transport,
    repairs,
    repairsBasis: 'estimated',
    marketPrices,
    source,
  })

  // Build haircut reason from blockers
  const haircutReason = bidReadiness.blockers.slice(0, 2).join(' + ') || 'Unverified information'

  // Build clearance actions from blockers_with_impact
  const clearWith = bidReadiness.blockers_with_impact.map((b) => b.action)

  return {
    verified,
    gated: {
      max_bid: gatedMaxBid,
      total_all_in: gatedSpine.total_all_in,
      expected_profit: gatedSpine.expected_profit,
      expected_margin: gatedSpine.expected_margin,
      haircut_pct: haircutPct,
      haircut_reason: haircutReason,
    },
    is_gated: true,
    clear_with: clearWith,
  }
}

export function evaluateBidReadiness(args: {
  hasAuctionEndTime: boolean
  hasTitleStatus: boolean
  titleStatus: string | null
  economicsVerdict: 'BUY' | 'MARGINAL' | 'PASS'
  hasConfirmedDealBreakers: boolean
  infoGapsCount: number
  criticalInfoGaps: string[] // title_unknown, mileage_unknown, etc.
}): BidReadinessResult {
  const {
    hasAuctionEndTime,
    hasTitleStatus,
    titleStatus,
    economicsVerdict,
    hasConfirmedDealBreakers,
    infoGapsCount,
    criticalInfoGaps,
  } = args

  const blockers: string[] = []
  const blockers_with_impact: BlockerWithImpact[] = []

  // DO NOT BID conditions - these are hard stops, not gates
  if (economicsVerdict === 'PASS') {
    return {
      status: 'DO_NOT_BID',
      reason: 'Economics do not support this deal',
      blockers: ['Economics fail'],
      blockers_with_impact: [
        {
          issue: 'Economics fail',
          impact: 'Verdict forced to PASS regardless of other factors',
          action: 'Wait for price to drop significantly',
        },
      ],
    }
  }

  if (hasConfirmedDealBreakers) {
    return {
      status: 'DO_NOT_BID',
      reason: 'Confirmed deal breaker present',
      blockers: ['Confirmed deal breaker'],
      blockers_with_impact: [
        {
          issue: 'Confirmed deal breaker',
          impact: 'Verdict forced to PASS — do not bid',
          action: 'None — move on to other opportunities',
        },
      ],
    }
  }

  if (titleStatus === 'salvage' || titleStatus === 'missing') {
    return {
      status: 'DO_NOT_BID',
      reason: `Title status: ${titleStatus}`,
      blockers: [`Title ${titleStatus}`],
      blockers_with_impact: [
        {
          issue: `Title is ${titleStatus}`,
          impact: 'Verdict forced to PASS — cannot resell cleanly',
          action: 'None — salvage/missing title kills the deal',
        },
      ],
    }
  }

  // NOT BID READY conditions - these are gates that affect bid strategy
  if (!hasAuctionEndTime) {
    blockers.push('Auction end time unknown')
    blockers_with_impact.push({
      issue: 'Auction end time unknown',
      impact: 'Cannot time your bid — risk of missing or overbidding',
      action: 'Check listing page for end time before bidding',
    })
  }

  if (criticalInfoGaps.includes('title_unknown')) {
    blockers.push('Title status not verified')
    blockers_with_impact.push({
      issue: 'Title status not verified',
      impact: 'Haircut max bid by 20% OR treat as PASS if not cleared',
      action: 'Verify clean title with seller or auction house',
    })
  }

  if (criticalInfoGaps.includes('mileage_unknown')) {
    blockers.push('Mileage unknown')
    blockers_with_impact.push({
      issue: 'Mileage unknown',
      impact: 'Sale range widened ±15% — profit estimate less reliable',
      action: 'Get odometer reading or VIN history report',
    })
  }

  if (blockers.length > 0) {
    return {
      status: 'NOT_BID_READY',
      reason: `${blockers.length} gate${blockers.length > 1 ? 's' : ''} must be cleared`,
      blockers,
      blockers_with_impact,
    }
  }

  // BID READY
  return {
    status: 'BID_READY',
    reason: 'Economics work and all gates cleared',
    blockers: [],
    blockers_with_impact: [],
  }
}

/**
 * Confidence Breakdown (4 meters instead of 1 blob)
 * Each dimension declares its impact on deal economics.
 */
export interface ConfidenceDimension {
  level: 'high' | 'medium' | 'low' | 'unknown'
  reason: string
  impact: string | null // How this affects the numbers (null if high confidence)
}

export interface ConfidenceBreakdown {
  price: ConfidenceDimension
  title: ConfidenceDimension
  condition: ConfidenceDimension
  timing: ConfidenceDimension
  overall: { level: 'high' | 'medium' | 'low' | 'unknown'; score: number }
}

export function evaluateConfidenceBreakdown(args: {
  priceVerified: boolean
  priceKind: string
  titleStatus: string | null
  photoCount: number
  hasConditionDetails: boolean
  mechanicalKnown: boolean
  hasAuctionEndTime: boolean
}): ConfidenceBreakdown {
  const {
    priceVerified,
    priceKind,
    titleStatus,
    photoCount,
    hasConditionDetails,
    mechanicalKnown,
    hasAuctionEndTime,
  } = args

  // Price confidence
  // Note: "starting bid" is normal auction mechanics, not a data gap.
  // We know the current price; it may go higher, but that's expected.
  let priceLevel: 'high' | 'medium' | 'low' | 'unknown'
  let priceReason: string
  let priceImpact: string | null = null
  if (priceVerified && priceKind === 'current_bid') {
    priceLevel = 'high'
    priceReason = 'Verified current bid'
  } else if (priceKind === 'starting_bid') {
    // Starting bid is acceptable - this is how auctions work
    priceLevel = 'high'
    priceReason = 'Starting bid (expect competition)'
  } else if (priceKind === 'buy_now') {
    priceLevel = 'high'
    priceReason = 'Fixed buy-now price'
  } else {
    priceLevel = 'unknown'
    priceReason = 'Price source unclear'
    priceImpact = 'Cannot calculate max bid accurately — verify price before bidding'
  }

  // Title confidence
  let titleLevel: 'high' | 'medium' | 'low' | 'unknown'
  let titleReason: string
  let titleImpact: string | null = null
  if (titleStatus === 'clean') {
    titleLevel = 'high'
    titleReason = 'Clean title confirmed'
  } else if (titleStatus === 'on_file' || titleStatus === 'unknown' || !titleStatus) {
    titleLevel = 'unknown'
    titleReason = 'Title status not verified'
    titleImpact = 'Haircut max bid by 20% OR treat as PASS if not cleared'
  } else if (titleStatus === 'salvage') {
    titleLevel = 'low'
    titleReason = 'Salvage title'
    titleImpact = 'Verdict forced to PASS — cannot resell cleanly'
  } else {
    titleLevel = 'medium'
    titleReason = `Title: ${titleStatus}`
    titleImpact = 'Verify title status — may affect resale value'
  }

  // Condition confidence
  let conditionLevel: 'high' | 'medium' | 'low' | 'unknown'
  let conditionReason: string
  let conditionImpact: string | null = null
  if (photoCount >= 8 && hasConditionDetails && mechanicalKnown) {
    conditionLevel = 'high'
    conditionReason = 'Good photo coverage + mechanical status known'
  } else if (photoCount >= 4 && hasConditionDetails) {
    conditionLevel = 'medium'
    conditionReason = `${photoCount} photos, some details unverified`
    conditionImpact = 'Repair estimate may be off by ±$200-500'
  } else if (photoCount >= 2) {
    conditionLevel = 'low'
    conditionReason = `Only ${photoCount} photos available`
    conditionImpact = 'Sale range widened ±10% — hidden repairs likely'
  } else {
    conditionLevel = 'unknown'
    conditionReason = 'Insufficient visual evidence'
    conditionImpact = 'Cannot estimate repairs — bid conservatively or get more photos'
  }

  // Timing confidence
  let timingLevel: 'high' | 'medium' | 'low' | 'unknown'
  let timingReason: string
  let timingImpact: string | null = null
  if (hasAuctionEndTime) {
    timingLevel = 'high'
    timingReason = 'Auction end time known'
  } else {
    timingLevel = 'unknown'
    timingReason = 'Auction end time missing'
    timingImpact = 'Cannot time bid — risk of missing or overbidding'
  }

  // Overall score (0-5)
  const levelScores = { high: 5, medium: 3, low: 1, unknown: 0 }
  const avgScore =
    (levelScores[priceLevel] +
      levelScores[titleLevel] +
      levelScores[conditionLevel] +
      levelScores[timingLevel]) /
    4

  let overallLevel: 'high' | 'medium' | 'low' | 'unknown'
  if (avgScore >= 4) overallLevel = 'high'
  else if (avgScore >= 2.5) overallLevel = 'medium'
  else if (avgScore >= 1) overallLevel = 'low'
  else overallLevel = 'unknown'

  return {
    price: { level: priceLevel, reason: priceReason, impact: priceImpact },
    title: { level: titleLevel, reason: titleReason, impact: titleImpact },
    condition: { level: conditionLevel, reason: conditionReason, impact: conditionImpact },
    timing: { level: timingLevel, reason: timingReason, impact: timingImpact },
    overall: { level: overallLevel, score: Math.round(avgScore * 10) / 10 },
  }
}

/**
 * Condition Score with Coverage Penalty
 * Score = (known-condition score) × (coverage penalty)
 */
export interface ConditionScoreWithCoverage {
  raw_score: number | null // 1-5 if we can assess
  coverage_count: number // How many of 5 categories verified
  coverage_total: number // Always 5
  penalized_score: number | null // raw_score × (coverage/5)
  display: string // "3.2/5 (2/5 verified)" or "Insufficient Data"
  confidence_label: 'high' | 'medium' | 'low' | 'insufficient'
}

export function evaluateConditionScore(condition: {
  exterior?: string | null
  interior?: string | null
  mechanical?: string | null
  tires?: string | null
  frame?: string | null
  photos_analyzed?: number
}): ConditionScoreWithCoverage {
  const fields = ['exterior', 'interior', 'mechanical', 'tires', 'frame'] as const

  let knownCount = 0
  let totalScore = 0

  const gradeToScore: Record<string, number> = {
    excellent: 5,
    good: 4,
    fair: 3,
    poor: 2,
    bad: 1,
    functional: 4,
    needs_work: 2,
    unknown: 0,
    not_visible: 0,
  }

  for (const field of fields) {
    const value = condition[field]
    if (value && value !== 'unknown' && value !== 'not_visible') {
      const score = gradeToScore[value.toLowerCase()] || 0
      if (score > 0) {
        knownCount++
        totalScore += score
      }
    }
  }

  const coverageTotal = 5

  // Insufficient data
  if (knownCount < 2 || (condition.photos_analyzed ?? 0) < 3) {
    return {
      raw_score: null,
      coverage_count: knownCount,
      coverage_total: coverageTotal,
      penalized_score: null,
      display: 'Insufficient Data',
      confidence_label: 'insufficient',
    }
  }

  const rawScore = totalScore / knownCount
  const coveragePenalty = knownCount / coverageTotal
  const penalizedScore = rawScore * coveragePenalty

  // Confidence based on coverage
  let confidenceLabel: 'high' | 'medium' | 'low' | 'insufficient'
  if (knownCount >= 4) confidenceLabel = 'high'
  else if (knownCount >= 3) confidenceLabel = 'medium'
  else confidenceLabel = 'low'

  return {
    raw_score: Math.round(rawScore * 10) / 10,
    coverage_count: knownCount,
    coverage_total: coverageTotal,
    penalized_score: Math.round(penalizedScore * 10) / 10,
    display: `${penalizedScore.toFixed(1)}/5 (${knownCount}/${coverageTotal} verified)`,
    confidence_label: confidenceLabel,
  }
}

// ============================================
// UNIFIED CONFIDENCE AGGREGATOR
// ============================================
// Single source of truth for overall deal confidence.
// Eliminates contradictions between subsystem confidence and overall confidence.
//
// TRUTH TABLE:
// - Base confidence: starts at 5 (perfect)
// - Penalties (additive):
//   - Hard gap (title unknown, auction end unknown): -2 each, max -4
//   - Evidence coverage < 50%: -1
//   - Evidence coverage < 25%: -2 (replaces -1)
//   - Title not 'clean': -1
//   - Mechanical unknown: -1
//   - Photo count < 4: -1
//   - Market demand 'niche' or 'low': -0.5 (affects time, minor impact)
//
// Score mapping:
//   5.0-4.5: HIGH confidence
//   4.4-3.0: MEDIUM confidence
//   2.9-1.5: LOW confidence
//   <1.5: INSUFFICIENT - cannot make decision

export interface UnifiedConfidence {
  score: number // 0-5
  level: 'high' | 'medium' | 'low' | 'insufficient'
  penalties: ConfidencePenalty[] // What reduced the score
  primary_gap: string | null // The biggest single issue
  summary: string // Human-readable summary
  consistent_with_subsystems: boolean // Sanity check flag
}

export interface ConfidencePenalty {
  source: string // Where the penalty came from
  amount: number // How much it reduces score (positive number)
  reason: string // Why this matters
  fixable: boolean // Can this be resolved pre-bid?
}

export function buildUnifiedConfidence(args: {
  // From ConfidenceBreakdown (4 meters)
  priceLevel: 'high' | 'medium' | 'low' | 'unknown'
  titleLevel: 'high' | 'medium' | 'low' | 'unknown'
  conditionLevel: 'high' | 'medium' | 'low' | 'unknown'
  timingLevel: 'high' | 'medium' | 'low' | 'unknown'

  // From evidence ledger
  evidenceCoverage: {
    verified_claims: number
    total_claims: number
    inferred_only: number
  }

  // From condition assessment
  titleStatus: string | null
  mechanicalKnown: boolean
  photoCount: number

  // From market demand
  demandLevel: 'high' | 'moderate' | 'low' | 'niche'

  // Hard blockers
  hasHardBlockers: boolean // deal breakers, salvage title, etc.
}): UnifiedConfidence {
  const {
    priceLevel,
    titleLevel,
    conditionLevel,
    timingLevel,
    evidenceCoverage,
    titleStatus,
    mechanicalKnown,
    photoCount,
    demandLevel,
    hasHardBlockers,
  } = args

  // Start with perfect score
  let score = 5.0
  const penalties: ConfidencePenalty[] = []

  // Hard blockers are instant disqualification
  if (hasHardBlockers) {
    return {
      score: 0,
      level: 'insufficient',
      penalties: [
        {
          source: 'hard_blocker',
          amount: 5,
          reason: 'Deal breaker present - verdict forced to PASS',
          fixable: false,
        },
      ],
      primary_gap: 'Deal breaker present',
      summary: 'Cannot proceed - deal breaker present',
      consistent_with_subsystems: true,
    }
  }

  // === HARD GAPS (most severe) ===

  // Title unknown = -2
  if (titleLevel === 'unknown' || !titleStatus || titleStatus === 'unknown') {
    const penalty = 2.0
    score -= penalty
    penalties.push({
      source: 'title_unknown',
      amount: penalty,
      reason: 'Cannot verify resale value without title status',
      fixable: true,
    })
  }

  // Auction timing unknown = -2
  if (timingLevel === 'unknown') {
    const penalty = 2.0
    score -= penalty
    penalties.push({
      source: 'timing_unknown',
      amount: penalty,
      reason: 'Cannot time bid without auction end',
      fixable: true,
    })
  }

  // === EVIDENCE COVERAGE ===

  const coverageRatio =
    evidenceCoverage.total_claims > 0
      ? evidenceCoverage.verified_claims / evidenceCoverage.total_claims
      : 0

  if (coverageRatio < 0.25) {
    const penalty = 2.0
    score -= penalty
    penalties.push({
      source: 'evidence_coverage_critical',
      amount: penalty,
      reason: `Only ${Math.round(coverageRatio * 100)}% of claims verified - most is inference`,
      fixable: true,
    })
  } else if (coverageRatio < 0.5) {
    const penalty = 1.0
    score -= penalty
    penalties.push({
      source: 'evidence_coverage_low',
      amount: penalty,
      reason: `Only ${Math.round(coverageRatio * 100)}% of claims verified`,
      fixable: true,
    })
  }

  // === CONDITION GAPS ===

  // Title not clean = -1 (if known but not clean)
  if (titleStatus && titleStatus !== 'unknown' && titleStatus !== 'clean') {
    const penalty = 1.0
    score -= penalty
    penalties.push({
      source: 'title_not_clean',
      amount: penalty,
      reason: `Title is '${titleStatus}' - may limit buyer pool`,
      fixable: false,
    })
  }

  // Mechanical unknown = -1
  if (!mechanicalKnown) {
    const penalty = 1.0
    score -= penalty
    penalties.push({
      source: 'mechanical_unknown',
      amount: penalty,
      reason: 'Mechanical status not verified - repair estimate uncertain',
      fixable: true,
    })
  }

  // Photo count < 4 = -1
  if (photoCount < 4) {
    const penalty = 1.0
    score -= penalty
    penalties.push({
      source: 'low_photo_count',
      amount: penalty,
      reason: `Only ${photoCount} photos - hidden issues possible`,
      fixable: true,
    })
  }

  // === MARKET DEMAND (minor impact on time-to-sell, not core confidence) ===

  if (demandLevel === 'niche' || demandLevel === 'low') {
    const penalty = 0.5
    score -= penalty
    penalties.push({
      source: 'market_demand',
      amount: penalty,
      reason: `${demandLevel === 'niche' ? 'Niche market' : 'Low demand'} - may take longer to sell`,
      fixable: false,
    })
  }

  // Clamp score
  score = Math.max(0, Math.min(5, score))

  // Determine level
  let level: 'high' | 'medium' | 'low' | 'insufficient'
  if (score >= 4.5) level = 'high'
  else if (score >= 3.0) level = 'medium'
  else if (score >= 1.5) level = 'low'
  else level = 'insufficient'

  // Find primary gap
  const sortedPenalties = [...penalties].sort((a, b) => b.amount - a.amount)
  const primaryGap = sortedPenalties.length > 0 ? sortedPenalties[0].reason : null

  // Build summary
  let summary: string
  if (level === 'high') {
    summary = 'High confidence in deal economics'
  } else if (level === 'medium') {
    const fixableCount = penalties.filter((p) => p.fixable).length
    if (fixableCount > 0) {
      summary = `Medium confidence - ${fixableCount} fixable gap${fixableCount > 1 ? 's' : ''}`
    } else {
      summary = 'Medium confidence - some uncertainty baked in'
    }
  } else if (level === 'low') {
    summary = `Low confidence: ${primaryGap || 'multiple gaps'}`
  } else {
    summary = `Insufficient data to assess - ${primaryGap || 'too many gaps'}`
  }

  // Consistency check: ensure level matches subsystem levels
  // If overall is "high" but price/title/condition/timing have "unknown", flag inconsistency
  const subsystemLevels = [priceLevel, titleLevel, conditionLevel, timingLevel]
  const unknownCount = subsystemLevels.filter((l) => l === 'unknown').length
  const lowCount = subsystemLevels.filter((l) => l === 'low').length

  let consistent = true
  if (level === 'high' && (unknownCount > 0 || lowCount > 1)) {
    consistent = false
  }
  if (level === 'medium' && unknownCount >= 2) {
    consistent = false
  }

  return {
    score: Math.round(score * 10) / 10,
    level,
    penalties,
    primary_gap: primaryGap,
    summary,
    consistent_with_subsystems: consistent,
  }
}

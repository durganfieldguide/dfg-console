/**
 * DFG Deal Calculation Module
 * 
 * Pure functions for deterministic money math.
 * Same inputs → same outputs. No side effects.
 * 
 * OUT OF SCOPE (computed elsewhere):
 * - Confidence (depends on evidence quality)
 * - Gates (depends on listing + evidence + derived)
 * 
 * ROUNDING POLICY: Whole dollars. Change roundMoney() once if needed.
 */

import type {
  Money,
  Assumptions,
  CostBreakdown,
  SaleScenario,
  ScenarioResult,
} from "./types";

// ============================================================================
// COST COMPUTATION
// ============================================================================

/**
 * Compute acquisition + prep costs at a given bid.
 * 
 * Includes: auction costs (premium, tax, fees), transport, storage,
 *           repairs, detailing, contingency buffer.
 * 
 * Excludes: selling costs (listing fees, payment fees) — those are
 *           computed in computeScenarioResult since they depend on sale price.
 */
export function computeCostsAtBid(bid: Money, a: Assumptions): CostBreakdown {
  const buyerPremium = roundMoney(bid * a.auction.buyerPremiumPct);

  const taxableBase = a.auction.taxAppliesToPremium
    ? bid + buyerPremium
    : bid;
  const tax = roundMoney(taxableBase * a.auction.salesTaxPct);

  const flatFees = roundMoney(a.auction.flatFees);

  const transport = roundMoney(a.acquisition.transportCost);
  const storage = roundMoney(
    a.acquisition.storagePerDay * a.acquisition.expectedHoldDays
  );

  const repairs = roundMoney(a.reconditioning.estimatedRepairs);
  const detailing = roundMoney(a.reconditioning.detailing);

  const subtotalBeforeContingency =
    bid +
    buyerPremium +
    tax +
    flatFees +
    transport +
    storage +
    repairs +
    detailing;

  // Contingency basis: either on non-auction costs only, or all-in
  const nonAuctionBasis = transport + storage + repairs + detailing;
  const contingencyBasis =
    a.acquisition.contingencyBasis === "allIn"
      ? subtotalBeforeContingency
      : nonAuctionBasis;

  const contingency = roundMoney(contingencyBasis * a.acquisition.contingencyPct);
  const totalAllIn = roundMoney(subtotalBeforeContingency + contingency);

  return {
    bid,
    buyerPremium,
    tax,
    flatFees,
    transport,
    storage,
    repairs,
    detailing,
    contingency,
    totalAllIn,
  };
}

// ============================================================================
// SCENARIO COMPUTATION
// ============================================================================

/**
 * Compute profit/ROI/margin for a given sale scenario.
 * 
 * Selling costs (listing fees, payment fees) are deducted here,
 * not in computeCostsAtBid — they're costs of selling, not acquiring.
 */
export function computeScenarioResult(
  costs: CostBreakdown,
  scenario: SaleScenario,
  a: Assumptions
): ScenarioResult {
  const salePrice = roundMoney(scenario.price);

  const listingFees = roundMoney(a.disposition.listingFees);
  const paymentFees = roundMoney(salePrice * a.disposition.paymentFeesPct);
  const sellingCosts = roundMoney(listingFees + paymentFees);

  const netProceeds = roundMoney(salePrice - sellingCosts);
  const profit = roundMoney(netProceeds - costs.totalAllIn);

  const roiOnCostPct = safePct(profit, costs.totalAllIn);
  const marginOnSalePct = safePct(profit, salePrice);

  return {
    salePrice,
    listingFees,
    paymentFees,
    sellingCosts,
    netProceeds,
    profit,
    roiOnCostPct,
    marginOnSalePct,
  };
}

// ============================================================================
// MAX BID DERIVATION
// ============================================================================

/**
 * Derive max bid from target ROI using the expected sale price.
 * 
 * Math explanation:
 * 
 *   ROI = profit / totalAllIn >= targetRoi
 *   profit = netProceeds - totalAllIn
 *   netProceeds = salePrice - sellingCosts
 *   
 *   totalAllIn(bid) is approximately linear: aCoeff * bid + bConst
 *   
 *   Solving for bid:
 *   bid <= (netProceeds / (1 + targetRoi) - bConst) / aCoeff
 * 
 * Additional constraints:
 * - absoluteMaxBid: hard ceiling
 * - minProfitDollars: floor on profit
 */
export function deriveMaxBidFromTargetRoi(
  expectedSalePrice: Money,
  a: Assumptions
): Money {
  const target = a.bidStrategy.targetRoiPct;

  // Net proceeds from sale (independent of bid)
  const listingFees = a.disposition.listingFees;
  const paymentFees = expectedSalePrice * a.disposition.paymentFeesPct;
  const netProceeds = expectedSalePrice - listingFees - paymentFees;

  // Build coefficients for totalAllIn(bid) = aCoeff * bid + bConst
  const bp = a.auction.buyerPremiumPct;
  const tx = a.auction.salesTaxPct;

  // Tax factor depends on whether tax applies to premium
  const taxFactor = a.auction.taxAppliesToPremium ? tx * (1 + bp) : tx;
  const auctionCoeff = 1 + bp + taxFactor;

  // Non-bid constants
  const transport = a.acquisition.transportCost;
  const storage = a.acquisition.storagePerDay * a.acquisition.expectedHoldDays;
  const repairs = a.reconditioning.estimatedRepairs;
  const detailing = a.reconditioning.detailing;
  const flatFees = a.auction.flatFees;

  const baseConst = flatFees + transport + storage + repairs + detailing;

  // Apply contingency to coefficients
  const contingencyPct = a.acquisition.contingencyPct;

  let aCoeff = auctionCoeff;
  let bConst = baseConst;

  if (a.acquisition.contingencyBasis === "allIn") {
    // Contingency applies to everything including bid-linked costs
    aCoeff = aCoeff * (1 + contingencyPct);
    bConst = bConst * (1 + contingencyPct);
  } else {
    // Contingency applies only to non-auction basis
    const nonAuctionBasis = transport + storage + repairs + detailing;
    bConst = bConst + nonAuctionBasis * contingencyPct;
  }

  // Solve for max bid at target ROI
  const denom = (1 + target) * aCoeff;
  const numer = netProceeds - (1 + target) * bConst;

  let maxBid = numer / denom;

  // Apply minProfitDollars constraint if set
  if (a.bidStrategy.minProfitDollars != null) {
    // Require: netProceeds - totalAllIn >= minProfit
    // totalAllIn = aCoeff * bid + bConst
    // bid <= (netProceeds - bConst - minProfit) / aCoeff
    const cap =
      (netProceeds - bConst - a.bidStrategy.minProfitDollars) / aCoeff;
    maxBid = Math.min(maxBid, cap);
  }

  // Clamp to valid range
  if (!Number.isFinite(maxBid)) maxBid = 0;
  maxBid = Math.max(0, maxBid);

  // Apply absolute ceiling if set
  if (a.bidStrategy.absoluteMaxBid != null) {
    maxBid = Math.min(maxBid, a.bidStrategy.absoluteMaxBid);
  }

  return roundMoney(maxBid);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safe percentage calculation. Returns NaN if denominator is 0 or invalid.
 */
function safePct(num: number, denom: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(denom) || denom === 0) {
    return NaN;
  }
  return num / denom;
}

/**
 * Single rounding policy for all money values.
 * Change here once if you need cents instead of whole dollars.
 */
function roundMoney(x: number): number {
  return Math.round(x);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Format ROI/margin for display. Returns "—" for invalid values.
 */
export function formatPct(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format money for display.
 */
export function formatMoney(value: Money | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString()}`;
}

/**
 * Check if a scenario result represents a profitable deal.
 */
export function isProfitable(result: ScenarioResult): boolean {
  return Number.isFinite(result.profit) && result.profit > 0;
}

/**
 * Check if ROI meets or exceeds target.
 */
export function meetsTargetRoi(result: ScenarioResult, targetRoi: number): boolean {
  return Number.isFinite(result.roiOnCostPct) && result.roiOnCostPct >= targetRoi;
}

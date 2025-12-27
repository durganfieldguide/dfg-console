/**
 * DFG App - Required Exit Price Calculation
 *
 * Computes the sale price needed to achieve target ROI given a buy-in amount.
 * This is the "negotiation weapon" - answers "what would $X buy-in require?"
 *
 * Location: src/domain/requiredExit.ts
 *
 * IMPORTANT: This is a pure function. Do not store results; compute on demand.
 */

// =============================================================================
// Types
// =============================================================================

export interface RequiredExitParams {
  /** Total acquisition cost (bid + fees + transport + reconditioning) */
  totalAllIn: number;

  /** Target ROI as decimal (0.20 = 20%) */
  targetRoiPct: number;

  /** Fixed listing/marketplace fees */
  listingFees: number;

  /** Payment processing fee as decimal (0.03 = 3%) */
  paymentFeesPct: number;
}

export interface RequiredExitResult {
  /** Sale price needed to hit target ROI */
  requiredSalePrice: number;

  /** Net proceeds after selling costs */
  requiredNetProceeds: number;

  /** Expected profit at this sale price */
  expectedProfit: number;

  /** Breakdown for UI display */
  breakdown: {
    totalAllIn: number;
    targetRoiPct: number;
    targetRoiPctDisplay: string;
    listingFees: number;
    paymentFees: number;
    paymentFeesPctDisplay: string;
  };
}

// =============================================================================
// Main Calculation
// =============================================================================

/**
 * Compute the required exit (sale) price to achieve target ROI.
 *
 * Formula derivation:
 *   Profit = NetProceeds - TotalAllIn
 *   NetProceeds = SalePrice - ListingFees - PaymentFees
 *   PaymentFees = SalePrice * PaymentFeesPct
 *
 *   For target ROI:
 *   RequiredProfit = TotalAllIn * TargetRoiPct
 *   RequiredNetProceeds = TotalAllIn + RequiredProfit = TotalAllIn * (1 + TargetRoiPct)
 *
 *   Solving for SalePrice:
 *   SalePrice - ListingFees - (SalePrice * PaymentFeesPct) = RequiredNetProceeds
 *   SalePrice * (1 - PaymentFeesPct) = RequiredNetProceeds + ListingFees
 *   SalePrice = (RequiredNetProceeds + ListingFees) / (1 - PaymentFeesPct)
 */
export function computeRequiredExitPrice(
  params: RequiredExitParams
): RequiredExitResult {
  const { totalAllIn, targetRoiPct, listingFees, paymentFeesPct } = params;

  // Validate inputs
  if (totalAllIn <= 0) {
    throw new Error('totalAllIn must be positive');
  }
  if (targetRoiPct < 0) {
    throw new Error('targetRoiPct cannot be negative');
  }
  if (listingFees < 0) {
    throw new Error('listingFees cannot be negative');
  }
  if (paymentFeesPct < 0 || paymentFeesPct >= 1) {
    throw new Error('paymentFeesPct must be between 0 and 1 (exclusive)');
  }

  // Required net proceeds to hit target ROI
  const requiredNetProceeds = totalAllIn * (1 + targetRoiPct);

  // Solve for sale price
  const requiredSalePrice =
    (requiredNetProceeds + listingFees) / (1 - paymentFeesPct);

  // Compute actual payment fees at this sale price
  const paymentFees = requiredSalePrice * paymentFeesPct;

  // Expected profit (should equal totalAllIn * targetRoiPct)
  const expectedProfit = requiredSalePrice - listingFees - paymentFees - totalAllIn;

  return {
    requiredSalePrice: roundCurrency(requiredSalePrice),
    requiredNetProceeds: roundCurrency(requiredNetProceeds),
    expectedProfit: roundCurrency(expectedProfit),
    breakdown: {
      totalAllIn: roundCurrency(totalAllIn),
      targetRoiPct,
      targetRoiPctDisplay: `${(targetRoiPct * 100).toFixed(0)}%`,
      listingFees: roundCurrency(listingFees),
      paymentFees: roundCurrency(paymentFees),
      paymentFeesPctDisplay: `${(paymentFeesPct * 100).toFixed(1)}%`,
    },
  };
}

/**
 * Round to nearest cent (2 decimal places).
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Format required exit for UI display.
 * Returns copy like: "At $3,500 all-in, you need ~$4,485 exit to hit 20% ROI"
 */
export function formatRequiredExitMessage(params: RequiredExitParams): string {
  const result = computeRequiredExitPrice(params);
  const allIn = params.totalAllIn.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const exit = result.requiredSalePrice.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const roi = result.breakdown.targetRoiPctDisplay;

  return `At ${allIn} all-in, you need ~${exit} exit to hit ${roi} ROI`;
}

/**
 * Fee schedule tier definition.
 * Used to define buyer premium tiers for auction sources.
 */
export interface FeeScheduleTier {
  /** Minimum bid amount (inclusive) */
  minBid: number;
  /** Maximum bid amount (inclusive, use Infinity for uncapped) */
  maxBid: number;
  /** Fee calculation type */
  feeType: 'flat' | 'percent';
  /** Fee amount: dollars if flat, decimal if percent (0.03 = 3%) */
  amount: number;
  /** Optional maximum fee cap in dollars */
  cap?: number;
}

/**
 * Complete fee schedule for an auction source.
 */
export interface FeeSchedule {
  /** Source identifier (e.g., 'sierra', 'rbid') */
  source: string;
  /** Ordered tiers (evaluated in order, first match wins) */
  tiers: FeeScheduleTier[];
}

/**
 * Input for acquisition cost calculation.
 */
export interface AcquisitionInput {
  /** Winning bid amount */
  bid: number;
  /** Buyer premium (calculated from fee schedule) */
  buyerPremium: number;
  /** Transport/shipping cost */
  transport: number;
  /** Immediate repairs needed before resale */
  immediateRepairs: number;
}

/**
 * Input for net proceeds calculation.
 */
export interface ProceedsInput {
  /** Expected or actual sale price */
  salePrice: number;
  /** Listing/marketplace fees (e.g., eBay, Facebook) */
  listingFees: number;
  /** Payment processing fees (e.g., PayPal, Stripe) */
  paymentProcessing: number;
}

/**
 * Complete deal analysis result.
 */
export interface DealAnalysis {
  /** Total cost to acquire the asset */
  acquisitionCost: number;
  /** Net cash received after selling fees */
  netProceeds: number;
  /** Profit = Net Proceeds - Acquisition Cost */
  profit: number;
  /** Margin = (Profit / Acquisition Cost) * 100 */
  marginPercent: number;
}

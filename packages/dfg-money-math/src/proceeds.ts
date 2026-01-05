import type { ProceedsInput } from './types';

/**
 * Calculate net proceeds from a sale.
 *
 * Net Proceeds = Sale Price - Listing Fees - Payment Processing
 *
 * @param input - The proceeds input values
 * @returns Net proceeds in dollars
 */
export function calculateNetProceeds(input: ProceedsInput): number {
  const { salePrice, listingFees, paymentProcessing } = input;

  if (salePrice < 0 || listingFees < 0 || paymentProcessing < 0) {
    throw new Error('All input values must be non-negative');
  }

  const netProceeds = salePrice - listingFees - paymentProcessing;

  // Round to 2 decimal places
  return Math.round(netProceeds * 100) / 100;
}

/**
 * Calculate listing fees as a percentage of sale price.
 * Common marketplace fee calculation.
 *
 * @param salePrice - The sale price
 * @param feePercent - Fee as decimal (0.10 = 10%)
 * @returns Listing fee in dollars
 */
export function calculateListingFee(salePrice: number, feePercent: number): number {
  if (salePrice < 0 || feePercent < 0) {
    throw new Error('Values must be non-negative');
  }

  const fee = salePrice * feePercent;
  return Math.round(fee * 100) / 100;
}

/**
 * Calculate payment processing fees.
 * Standard model: percentage + fixed fee (e.g., 2.9% + $0.30)
 *
 * @param salePrice - The sale price
 * @param percent - Percentage as decimal (0.029 = 2.9%)
 * @param fixedFee - Fixed fee per transaction in dollars
 * @returns Processing fee in dollars
 */
export function calculateProcessingFee(
  salePrice: number,
  percent: number,
  fixedFee: number = 0
): number {
  if (salePrice < 0 || percent < 0 || fixedFee < 0) {
    throw new Error('Values must be non-negative');
  }

  const fee = salePrice * percent + fixedFee;
  return Math.round(fee * 100) / 100;
}

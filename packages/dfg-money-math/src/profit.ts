import type { DealAnalysis, AcquisitionInput, ProceedsInput } from './types'
import { calculateAcquisitionCost } from './acquisition'
import { calculateNetProceeds } from './proceeds'

/**
 * Calculate profit from a deal.
 *
 * Profit = Net Proceeds - Acquisition Cost
 *
 * @param netProceeds - Cash received after selling fees
 * @param acquisitionCost - Total cost to acquire the asset
 * @returns Profit in dollars (can be negative)
 */
export function calculateProfit(netProceeds: number, acquisitionCost: number): number {
  const profit = netProceeds - acquisitionCost
  return Math.round(profit * 100) / 100
}

/**
 * Calculate margin percentage.
 *
 * CRITICAL: Margin % = (Profit / Acquisition Cost) × 100
 *
 * This uses ACQUISITION COST as the denominator, NOT sale price.
 * This measures return on investment (ROI).
 *
 * @param profit - Profit in dollars
 * @param acquisitionCost - Total acquisition cost
 * @returns Margin as percentage (e.g., 20 for 20%)
 */
export function calculateMarginPercent(profit: number, acquisitionCost: number): number {
  if (acquisitionCost <= 0) {
    throw new Error('Acquisition cost must be positive')
  }

  const margin = (profit / acquisitionCost) * 100

  // Round to 2 decimal places
  return Math.round(margin * 100) / 100
}

/**
 * Perform complete deal analysis.
 *
 * @param acquisition - Acquisition cost inputs
 * @param proceeds - Sale proceeds inputs
 * @returns Complete deal analysis with all metrics
 */
export function analyzeDeal(acquisition: AcquisitionInput, proceeds: ProceedsInput): DealAnalysis {
  const acquisitionCost = calculateAcquisitionCost(acquisition)
  const netProceeds = calculateNetProceeds(proceeds)
  const profit = calculateProfit(netProceeds, acquisitionCost)
  const marginPercent = calculateMarginPercent(profit, acquisitionCost)

  return {
    acquisitionCost,
    netProceeds,
    profit,
    marginPercent,
  }
}

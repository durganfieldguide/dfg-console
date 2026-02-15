import type { AcquisitionInput, FeeSchedule, FeeScheduleTier } from './types'

/**
 * Calculate buyer premium from a fee schedule.
 *
 * @param bid - The winning bid amount
 * @param schedule - The fee schedule to use
 * @returns The buyer premium in dollars
 */
export function calculateBuyerPremium(bid: number, schedule: FeeSchedule): number {
  if (bid < 0) {
    throw new Error('Bid amount cannot be negative')
  }

  const tier = findTier(bid, schedule.tiers)
  if (!tier) {
    throw new Error(`No fee tier found for bid amount: ${bid}`)
  }

  return calculateTierFee(bid, tier)
}

/**
 * Find the applicable fee tier for a given bid.
 */
function findTier(bid: number, tiers: FeeScheduleTier[]): FeeScheduleTier | undefined {
  return tiers.find((tier) => bid >= tier.minBid && bid <= tier.maxBid)
}

/**
 * Calculate the fee for a specific tier.
 */
function calculateTierFee(bid: number, tier: FeeScheduleTier): number {
  let fee: number

  if (tier.feeType === 'flat') {
    fee = tier.amount
  } else {
    // percent: amount is decimal (0.03 = 3%) or whole number (3 = 3%)
    const feePercent = tier.amount > 1 ? tier.amount / 100 : tier.amount
    fee = bid * feePercent
  }

  // Apply cap if specified
  if (tier.cap !== undefined && fee > tier.cap) {
    fee = tier.cap
  }

  // Round to 2 decimal places
  return Math.round(fee * 100) / 100
}

/**
 * Calculate total acquisition cost.
 *
 * Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
 *
 * @param input - The acquisition input values
 * @returns Total acquisition cost in dollars
 */
export function calculateAcquisitionCost(input: AcquisitionInput): number {
  const { bid, buyerPremium, transport, immediateRepairs } = input

  if (bid < 0 || buyerPremium < 0 || transport < 0 || immediateRepairs < 0) {
    throw new Error('All input values must be non-negative')
  }

  const total = bid + buyerPremium + transport + immediateRepairs

  // Round to 2 decimal places
  return Math.round(total * 100) / 100
}

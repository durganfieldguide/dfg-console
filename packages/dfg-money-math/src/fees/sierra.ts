import type { FeeSchedule } from '../types';

/**
 * Sierra Auction buyer premium fee schedule.
 *
 * Verified tiers:
 * - $0–$2,500: $75 flat fee
 * - $2,501–$5,000: 3% of bid
 * - $5,001+: 3% of bid with $150 cap
 */
export const SIERRA_FEE_SCHEDULE: FeeSchedule = {
  source: 'sierra',
  tiers: [
    {
      minBid: 0,
      maxBid: 2500,
      feeType: 'flat',
      amount: 75,
    },
    {
      minBid: 2501,
      maxBid: 5000,
      feeType: 'percent',
      amount: 0.03, // 3%
    },
    {
      minBid: 5001,
      maxBid: Infinity,
      feeType: 'percent',
      amount: 0.03, // 3%
      cap: 150,
    },
  ],
};

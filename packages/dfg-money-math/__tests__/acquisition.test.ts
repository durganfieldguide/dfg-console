import { describe, it, expect } from 'vitest';
import { calculateBuyerPremium } from '../src/acquisition';
import type { FeeSchedule } from '../src/types';

const TEST_SCHEDULE: FeeSchedule = {
  source: 'test',
  tiers: [
    {
      minBid: 0,
      maxBid: 1000,
      feeType: 'percent',
      amount: 10, // 10% as a whole number
    },
    {
      minBid: 1001,
      maxBid: 5000,
      feeType: 'percent',
      amount: 0.08, // 8% as a decimal
    },
    {
      minBid: 5001,
      maxBid: Infinity,
      feeType: 'flat',
      amount: 500,
    },
  ],
};

describe('calculateBuyerPremium with normalization', () => {
  it('should calculate premium correctly with a whole number percentage', () => {
    const premium = calculateBuyerPremium(500, TEST_SCHEDULE);
    expect(premium).toBe(50); // 10% of 500
  });

  it('should calculate premium correctly with a decimal percentage', () => {
    const premium = calculateBuyerPremium(2000, TEST_SCHEDULE);
    expect(premium).toBe(160); // 8% of 2000
  });

  it('should calculate premium correctly for a flat fee tier', () => {
    const premium = calculateBuyerPremium(6000, TEST_SCHEDULE);
    expect(premium).toBe(500);
  });

  it('should handle tier boundaries correctly', () => {
    const premium1 = calculateBuyerPremium(1000, TEST_SCHEDULE);
    expect(premium1).toBe(100); // 10% of 1000

    const premium2 = calculateBuyerPremium(1001, TEST_SCHEDULE);
    expect(premium2).toBe(80.08); // 8% of 1001
  });
});

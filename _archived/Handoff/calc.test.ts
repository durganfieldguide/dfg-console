/**
 * DFG Calc Module Tests
 * 
 * Run with: npx vitest run src/domain/calc.test.ts
 * Watch mode: npx vitest src/domain/calc.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  computeCostsAtBid,
  computeScenarioResult,
  deriveMaxBidFromTargetRoi,
  formatPct,
  formatMoney,
  isProfitable,
  meetsTargetRoi,
} from "./calc";
import type { Assumptions } from "./types";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Default assumptions for testing.
 * Matches typical Sierra/AZ scenario.
 */
const DEFAULT_ASSUMPTIONS: Assumptions = {
  currency: "USD",
  auction: {
    buyerPremiumPct: 0.15,
    salesTaxPct: 0.086,
    flatFees: 75,
    taxAppliesToPremium: true,
  },
  acquisition: {
    transportCost: 150,
    storagePerDay: 0,
    expectedHoldDays: 14,
    contingencyPct: 0.1,
    contingencyBasis: "nonAuction",
  },
  reconditioning: {
    estimatedRepairs: 200,
    detailing: 50,
  },
  disposition: {
    listingFees: 0,
    paymentFeesPct: 0,
  },
  bidStrategy: {
    targetRoiPct: 0.2,
  },
};

// Shorthand
const A = DEFAULT_ASSUMPTIONS;

// ============================================================================
// computeCostsAtBid TESTS
// ============================================================================

describe("computeCostsAtBid", () => {
  it("is deterministic: same inputs → same outputs", () => {
    const costs1 = computeCostsAtBid(2200, A);
    const costs2 = computeCostsAtBid(2200, A);
    expect(costs1).toEqual(costs2);
  });

  it("totalAllIn is greater than bid (includes fees and costs)", () => {
    const costs = computeCostsAtBid(2200, A);
    expect(costs.totalAllIn).toBeGreaterThan(2200);
  });

  it("computes buyer premium correctly", () => {
    const costs = computeCostsAtBid(2000, A);
    expect(costs.buyerPremium).toBe(Math.round(2000 * 0.15)); // 300
  });

  it("computes tax on bid + premium when taxAppliesToPremium is true", () => {
    const costs = computeCostsAtBid(2000, A);
    const expectedTax = Math.round((2000 + 300) * 0.086); // 198
    expect(costs.tax).toBe(expectedTax);
  });

  it("computes tax on bid only when taxAppliesToPremium is false", () => {
    const noTaxOnPremium: Assumptions = {
      ...A,
      auction: { ...A.auction, taxAppliesToPremium: false },
    };
    const costs = computeCostsAtBid(2000, noTaxOnPremium);
    const expectedTax = Math.round(2000 * 0.086); // 172
    expect(costs.tax).toBe(expectedTax);
  });

  it("includes flat fees", () => {
    const costs = computeCostsAtBid(2000, A);
    expect(costs.flatFees).toBe(75);
  });

  it("includes transport and storage", () => {
    const withStorage: Assumptions = {
      ...A,
      acquisition: { ...A.acquisition, storagePerDay: 10, expectedHoldDays: 7 },
    };
    const costs = computeCostsAtBid(2000, withStorage);
    expect(costs.transport).toBe(150);
    expect(costs.storage).toBe(70);
  });

  it("includes repairs and detailing", () => {
    const costs = computeCostsAtBid(2000, A);
    expect(costs.repairs).toBe(200);
    expect(costs.detailing).toBe(50);
  });

  it("computes contingency on nonAuction basis by default", () => {
    const costs = computeCostsAtBid(2000, A);
    // nonAuction = transport + storage + repairs + detailing = 150 + 0 + 200 + 50 = 400
    // contingency = 400 * 0.10 = 40
    expect(costs.contingency).toBe(40);
  });

  it("computes contingency on allIn basis when configured", () => {
    const allInContingency: Assumptions = {
      ...A,
      acquisition: { ...A.acquisition, contingencyBasis: "allIn" },
    };
    const costs = computeCostsAtBid(2000, allInContingency);
    // subtotal before contingency is everything
    // contingency = subtotal * 0.10
    expect(costs.contingency).toBeGreaterThan(40); // much higher than nonAuction
  });

  it("handles zero bid", () => {
    const costs = computeCostsAtBid(0, A);
    expect(costs.bid).toBe(0);
    expect(costs.buyerPremium).toBe(0);
    expect(costs.tax).toBe(0);
    // Should still have fixed costs
    expect(costs.totalAllIn).toBeGreaterThan(0);
  });
});

// ============================================================================
// computeScenarioResult TESTS
// ============================================================================

describe("computeScenarioResult", () => {
  it("profit = netProceeds - totalAllIn", () => {
    const costs = computeCostsAtBid(2200, A);
    const s = computeScenarioResult(costs, { price: 4600 }, A);

    expect(s.profit).toBe(s.netProceeds - costs.totalAllIn);
  });

  it("netProceeds = salePrice - sellingCosts", () => {
    const withFees: Assumptions = {
      ...A,
      disposition: { listingFees: 50, paymentFeesPct: 0.03 },
    };
    const costs = computeCostsAtBid(2000, withFees);
    const s = computeScenarioResult(costs, { price: 5000 }, withFees);

    expect(s.sellingCosts).toBe(s.listingFees + s.paymentFees);
    expect(s.netProceeds).toBe(s.salePrice - s.sellingCosts);
  });

  it("ROI and margin have same sign as profit", () => {
    const costs = computeCostsAtBid(2200, A);
    const s = computeScenarioResult(costs, { price: 4600 }, A);

    expect(Math.sign(s.profit)).toBe(Math.sign(s.roiOnCostPct));
    expect(Math.sign(s.profit)).toBe(Math.sign(s.marginOnSalePct));
  });

  it("ROI = profit / totalAllIn", () => {
    const costs = computeCostsAtBid(2200, A);
    const s = computeScenarioResult(costs, { price: 4600 }, A);

    const expectedRoi = s.profit / costs.totalAllIn;
    expect(s.roiOnCostPct).toBeCloseTo(expectedRoi, 10);
  });

  it("margin = profit / salePrice", () => {
    const costs = computeCostsAtBid(2200, A);
    const s = computeScenarioResult(costs, { price: 4600 }, A);

    const expectedMargin = s.profit / s.salePrice;
    expect(s.marginOnSalePct).toBeCloseTo(expectedMargin, 10);
  });

  it("handles negative profit (loss)", () => {
    const costs = computeCostsAtBid(5000, A); // high bid
    const s = computeScenarioResult(costs, { price: 4000 }, A); // low sale

    expect(s.profit).toBeLessThan(0);
    expect(s.roiOnCostPct).toBeLessThan(0);
    expect(s.marginOnSalePct).toBeLessThan(0);
  });

  it("handles zero sale price gracefully", () => {
    const costs = computeCostsAtBid(2000, A);
    const s = computeScenarioResult(costs, { price: 0 }, A);

    expect(s.salePrice).toBe(0);
    expect(s.netProceeds).toBe(0);
    expect(s.profit).toBeLessThan(0);
    expect(Number.isNaN(s.marginOnSalePct)).toBe(true); // divide by zero
  });
});

// ============================================================================
// LISTING FEES DOUBLE-COUNT REGRESSION TEST
// ============================================================================

describe("listingFees handling (regression)", () => {
  it("listingFees are NOT included in totalAllIn (acquisition costs)", () => {
    const withFees: Assumptions = {
      ...A,
      disposition: { listingFees: 100, paymentFeesPct: 0 },
    };

    const costsWithFees = computeCostsAtBid(2000, withFees);
    const costsNoFees = computeCostsAtBid(2000, A);

    // totalAllIn should be identical regardless of listing fees
    expect(costsWithFees.totalAllIn).toBe(costsNoFees.totalAllIn);
  });

  it("listingFees ARE deducted in scenario result (selling costs)", () => {
    const withFees: Assumptions = {
      ...A,
      disposition: { listingFees: 100, paymentFeesPct: 0 },
    };

    const costs = computeCostsAtBid(2000, withFees);
    const s = computeScenarioResult(costs, { price: 5000 }, withFees);

    expect(s.listingFees).toBe(100);
    expect(s.netProceeds).toBe(4900); // 5000 - 100
    expect(s.profit).toBe(s.netProceeds - costs.totalAllIn);
  });

  it("listingFees are not double-counted (profit calculation is correct)", () => {
    const withFees: Assumptions = {
      ...A,
      disposition: { listingFees: 100, paymentFeesPct: 0 },
    };

    const costs = computeCostsAtBid(2000, withFees);
    const s = computeScenarioResult(costs, { price: 5000 }, withFees);

    // Manual calculation:
    // netProceeds = 5000 - 100 = 4900
    // profit = 4900 - totalAllIn
    // If listing fees were double-counted, profit would be 100 less
    const manualProfit = 4900 - costs.totalAllIn;
    expect(s.profit).toBe(manualProfit);
  });
});

// ============================================================================
// deriveMaxBidFromTargetRoi TESTS
// ============================================================================

describe("deriveMaxBidFromTargetRoi", () => {
  it("returns a bid that achieves target ROI (within rounding tolerance)", () => {
    const expectedPrice = 7670;
    const maxBid = deriveMaxBidFromTargetRoi(expectedPrice, A);

    const costs = computeCostsAtBid(maxBid, A);
    const s = computeScenarioResult(costs, { price: expectedPrice }, A);

    // Should achieve at least target ROI minus rounding slack
    expect(s.roiOnCostPct).toBeGreaterThanOrEqual(0.2 - 0.01);
  });

  it("obeys absoluteMaxBid ceiling", () => {
    const withCeiling: Assumptions = {
      ...A,
      bidStrategy: { targetRoiPct: 0.2, absoluteMaxBid: 1000 },
    };

    const maxBid = deriveMaxBidFromTargetRoi(7670, withCeiling);
    expect(maxBid).toBeLessThanOrEqual(1000);
  });

  it("obeys minProfitDollars floor", () => {
    const withMinProfit: Assumptions = {
      ...A,
      bidStrategy: { targetRoiPct: 0.2, minProfitDollars: 2000 },
    };

    const maxBid = deriveMaxBidFromTargetRoi(5000, withMinProfit);
    const costs = computeCostsAtBid(maxBid, withMinProfit);
    const s = computeScenarioResult(costs, { price: 5000 }, withMinProfit);

    // Profit should be at least minProfitDollars (accounting for rounding)
    expect(s.profit).toBeGreaterThanOrEqual(2000 - 1);
  });

  it("returns 0 for impossible scenarios (price too low)", () => {
    const maxBid = deriveMaxBidFromTargetRoi(100, A); // way too low
    expect(maxBid).toBe(0);
  });

  it("handles selling costs in calculation", () => {
    const withSellingCosts: Assumptions = {
      ...A,
      disposition: { listingFees: 100, paymentFeesPct: 0.03 },
    };

    const maxBid = deriveMaxBidFromTargetRoi(7670, withSellingCosts);
    const costs = computeCostsAtBid(maxBid, withSellingCosts);
    const s = computeScenarioResult(costs, { price: 7670 }, withSellingCosts);

    // Should still achieve target ROI after selling costs
    expect(s.roiOnCostPct).toBeGreaterThanOrEqual(0.2 - 0.01);
  });

  it("works with allIn contingency basis", () => {
    const allIn: Assumptions = {
      ...A,
      acquisition: { ...A.acquisition, contingencyBasis: "allIn" },
    };

    const maxBid = deriveMaxBidFromTargetRoi(7670, allIn);
    const costs = computeCostsAtBid(maxBid, allIn);
    const s = computeScenarioResult(costs, { price: 7670 }, allIn);

    expect(s.roiOnCostPct).toBeGreaterThanOrEqual(0.2 - 0.01);
  });
});

// ============================================================================
// DETERMINISM TESTS
// ============================================================================

describe("determinism", () => {
  it("same opportunity rendered twice produces identical outputs", () => {
    const bid = deriveMaxBidFromTargetRoi(7670, A);

    const run = () => {
      const costs = computeCostsAtBid(bid, A);
      const s = computeScenarioResult(costs, { price: 7670 }, A);
      return { bid, costs, s };
    };

    const result1 = run();
    const result2 = run();

    expect(result1).toEqual(result2);
  });

  it("changing one assumption changes only dependent numbers", () => {
    const costs1 = computeCostsAtBid(2000, A);

    const higherPremium: Assumptions = {
      ...A,
      auction: { ...A.auction, buyerPremiumPct: 0.18 },
    };
    const costs2 = computeCostsAtBid(2000, higherPremium);

    // Bid should be same
    expect(costs1.bid).toBe(costs2.bid);

    // Premium should be different
    expect(costs2.buyerPremium).toBeGreaterThan(costs1.buyerPremium);

    // Tax should be different (if tax applies to premium)
    expect(costs2.tax).toBeGreaterThan(costs1.tax);

    // Fixed costs should be same
    expect(costs1.transport).toBe(costs2.transport);
    expect(costs1.repairs).toBe(costs2.repairs);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("formatPct", () => {
  it("formats positive percentages", () => {
    expect(formatPct(0.25)).toBe("25.0%");
    expect(formatPct(0.255, 1)).toBe("25.5%");
  });

  it("formats negative percentages", () => {
    expect(formatPct(-0.1)).toBe("-10.0%");
  });

  it("returns — for NaN", () => {
    expect(formatPct(NaN)).toBe("—");
  });

  it("returns — for Infinity", () => {
    expect(formatPct(Infinity)).toBe("—");
  });
});

describe("formatMoney", () => {
  it("formats positive amounts", () => {
    expect(formatMoney(1234)).toBe("$1,234");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("returns — for undefined", () => {
    expect(formatMoney(undefined)).toBe("—");
  });

  it("returns — for NaN", () => {
    expect(formatMoney(NaN)).toBe("—");
  });
});

describe("isProfitable", () => {
  it("returns true for positive profit", () => {
    const costs = computeCostsAtBid(2000, A);
    const s = computeScenarioResult(costs, { price: 5000 }, A);
    expect(isProfitable(s)).toBe(true);
  });

  it("returns false for negative profit", () => {
    const costs = computeCostsAtBid(5000, A);
    const s = computeScenarioResult(costs, { price: 4000 }, A);
    expect(isProfitable(s)).toBe(false);
  });

  it("returns false for zero profit", () => {
    // Find break-even point
    const costs = computeCostsAtBid(2000, A);
    const s = computeScenarioResult(costs, { price: costs.totalAllIn }, A);
    expect(isProfitable(s)).toBe(false);
  });
});

describe("meetsTargetRoi", () => {
  it("returns true when ROI meets target", () => {
    const maxBid = deriveMaxBidFromTargetRoi(7670, A);
    const costs = computeCostsAtBid(maxBid, A);
    const s = computeScenarioResult(costs, { price: 7670 }, A);
    expect(meetsTargetRoi(s, 0.2)).toBe(true);
  });

  it("returns false when ROI below target", () => {
    const costs = computeCostsAtBid(5000, A);
    const s = computeScenarioResult(costs, { price: 5500 }, A);
    expect(meetsTargetRoi(s, 0.2)).toBe(false);
  });
});

/**
 * DFG Default Assumptions
 * 
 * These are the baseline assumptions for deal analysis.
 * Store in DB/KV for operator-adjustable defaults.
 * 
 * Current values tuned for:
 * - Sierra Auctions
 * - Arizona market (8.6% tax)
 * - Self-pickup within ~100 miles
 * - FBMP/CL cash sales
 */

import type { Assumptions } from "../domain/types";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  currency: "USD",

  auction: {
    // Sierra standard buyer premium
    buyerPremiumPct: 0.15,

    // Arizona state + county (adjust per jurisdiction)
    salesTaxPct: 0.086,

    // Doc fees, gate fees, etc.
    flatFees: 75,

    // Sierra charges tax on bid + premium
    taxAppliesToPremium: true,
  },

  acquisition: {
    // Self-pickup default (gas + time value)
    transportCost: 150,

    // Usually 0 unless using storage yard
    storagePerDay: 0,

    // Conservative hold time for FBMP flip
    expectedHoldDays: 14,

    // 10% buffer for unknowns (repairs, issues discovered)
    contingencyPct: 0.10,

    // Apply contingency only to non-auction costs
    // (auction costs are fixed once you win)
    contingencyBasis: "nonAuction",
  },

  reconditioning: {
    // Conservative baseline for minor repairs
    // Adjust up for specific lots based on condition
    estimatedRepairs: 200,

    // Basic cleaning/presentation
    detailing: 50,
  },

  disposition: {
    // FBMP is free; set higher if using paid listings
    listingFees: 0,

    // Cash/Zelle = 0%; credit card = 0.03
    paymentFeesPct: 0,
  },

  bidStrategy: {
    // 20% ROI target
    targetRoiPct: 0.20,

    // Optional hard ceiling (uncomment to set)
    // absoluteMaxBid: 5000,

    // Optional minimum profit floor (uncomment to set)
    // minProfitDollars: 500,
  },
};

/**
 * Assumptions profiles for different scenarios.
 * Operator can switch between these.
 */
export const ASSUMPTION_PROFILES: Record<string, Partial<Assumptions>> = {
  // Higher-margin, slower sales
  premium: {
    bidStrategy: {
      targetRoiPct: 0.30,
      minProfitDollars: 1000,
    },
    acquisition: {
      ...DEFAULT_ASSUMPTIONS.acquisition,
      expectedHoldDays: 30,
    },
  },

  // Quick flip, lower margin
  velocity: {
    bidStrategy: {
      targetRoiPct: 0.15,
    },
    acquisition: {
      ...DEFAULT_ASSUMPTIONS.acquisition,
      expectedHoldDays: 7,
    },
  },

  // Remote pickup (shipper/hauler)
  shipped: {
    acquisition: {
      ...DEFAULT_ASSUMPTIONS.acquisition,
      transportCost: 500,
    },
  },

  // Higher repair budget
  fixer: {
    reconditioning: {
      estimatedRepairs: 500,
      detailing: 100,
    },
    acquisition: {
      ...DEFAULT_ASSUMPTIONS.acquisition,
      contingencyPct: 0.15,
    },
  },
};

/**
 * Merge base assumptions with a profile.
 */
export function applyProfile(
  base: Assumptions,
  profileName: keyof typeof ASSUMPTION_PROFILES
): Assumptions {
  const profile = ASSUMPTION_PROFILES[profileName];
  if (!profile) return base;

  return {
    ...base,
    ...profile,
    auction: { ...base.auction, ...profile.auction },
    acquisition: { ...base.acquisition, ...profile.acquisition },
    reconditioning: { ...base.reconditioning, ...profile.reconditioning },
    disposition: { ...base.disposition, ...profile.disposition },
    bidStrategy: { ...base.bidStrategy, ...profile.bidStrategy },
  };
}

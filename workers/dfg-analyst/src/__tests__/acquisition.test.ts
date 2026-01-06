import assert from "node:assert";
import { calculateAcquisitionForBid } from "../analysis";
import { SIERRA_FEES } from "../phoenix-market-data";
import { normalizeListingForAnalysis } from "../worker";
import { buildCalculationSpine } from "../calculation-spine";
import type { ListingData } from "../types";

function makeBaseListing(): ListingData {
  return {
    source: "sierra", // #100: standardized source name
    listing_url: "https://example.com/listing/123",
    title: "Test Sierra Listing",
    description: "Test description",
    photos: [],
    current_bid: 0,
    fee_schedule: SIERRA_FEES,
    location: { city: "Phoenix", state: "AZ" }
  };
}

// ============================================
// ISSUE #125: Sierra Tiered Premium Bug Fix
// ============================================
// Acceptance Criteria:
// - $1,600 bid with Sierra tier → buyer premium = $75 (not $478,400)
// - $3,000 bid with Sierra → buyer premium = $90 (3% of bid)
// - $10,000 bid with Sierra → buyer premium = $150 (capped)
//
// SIERRA FEE TRUTH (from @dfg/money-math):
// - $0-$2,500: $75 flat
// - $2,501-$5,000: 3% of bid
// - $5,001+: 3% with $150 cap

// Test A: Tier 1 - Flat fee ($0-$2,500)
// $1,600 bid should get $75 flat premium (NOT $478,400 or $299)
{
  const listing = makeBaseListing();
  const acq = calculateAcquisitionForBid(listing, 1600, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 75, "Tier 1: $1,600 bid should have $75 flat premium");
  assert.strictEqual(acq.premium_method, "tier", "Premium method should be 'tier'");
  console.log(`✓ Tier 1: $1,600 bid → $${acq.buyer_premium} premium (expected $75)`);
}

// Test B: Tier 2 - Percent fee ($2,501-$5,000)
// $3,000 bid should get 3% = $90 premium
{
  const listing = makeBaseListing();
  const acq = calculateAcquisitionForBid(listing, 3000, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 90, "Tier 2: $3,000 bid should have $90 premium (3%)");
  console.log(`✓ Tier 2: $3,000 bid → $${acq.buyer_premium} premium (expected $90)`);
}

// Test C: Tier 3 - Percent fee with cap ($5,001+)
// $10,000 bid should get 3% = $300, but capped at $150
{
  const listing = makeBaseListing();
  const acq = calculateAcquisitionForBid(listing, 10000, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 150, "Tier 3: $10,000 bid should have $150 premium (3% capped)");
  console.log(`✓ Tier 3: $10,000 bid → $${acq.buyer_premium} premium (expected $150 capped)`);
}

// Test D: buildCalculationSpine also uses correct Sierra fees
{
  const spine = buildCalculationSpine({
    bidAmount: 1600,
    feeSchedule: SIERRA_FEES,
    transport: 0,
    repairs: 0,
    repairsBasis: 'estimated',
    marketPrices: { quick_sale: 2000, market_rate: 2500, premium: 3000 },
    source: 'sierra'
  });
  assert.strictEqual(spine.buyer_premium, 75, "buildCalculationSpine: $1,600 bid should have $75 premium");
  console.log(`✓ buildCalculationSpine: $1,600 bid → $${spine.buyer_premium} premium`);
}

// Test E: Sierra injection works (backward compatibility)
{
  const listing: ListingData = {
    ...makeBaseListing(),
    fee_schedule: undefined
  };
  normalizeListingForAnalysis(listing);
  const acq = calculateAcquisitionForBid(listing, 1600, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 75, "Injected Sierra fees should yield $75 premium at $1,600 bid");
  console.log(`✓ Sierra injection: $1,600 bid → $${acq.buyer_premium} premium`);
}

console.log("\n✅ All Sierra tier premium tests passed (issue #125)");

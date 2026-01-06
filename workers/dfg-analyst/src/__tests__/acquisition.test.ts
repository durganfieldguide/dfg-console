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

// ============================================
// ISSUE #126: Buyer Premium Semantic Mismatch Fix
// ============================================
// Acceptance Criteria:
// - buyerPremium: 0.15 + bid: $1,000 → $150 premium (not $0.15)
// - buyerPremium: 15 + bid: $1,000 → $150 premium (whole-number tolerance)
// - Method returns "percent" not "flat"

// Test F: Decimal percentage format (0.15 = 15%)
// $1,000 bid with 0.15 (15%) premium → $150 (NOT $0.15)
{
  const listing: ListingData = {
    source: "ironplanet", // Non-Sierra source using simple percentage
    listing_url: "https://example.com/listing/456",
    title: "Test IronPlanet Listing",
    description: "Test description",
    photos: [],
    current_bid: 0,
    fee_schedule: { buyer_premium: 0.15, sales_tax_percent: 0.086 },
    location: { city: "Phoenix", state: "AZ" }
  };
  const acq = calculateAcquisitionForBid(listing, 1000, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 150, "#126: 0.15 decimal → $150 premium on $1,000 bid (not $0.15)");
  assert.strictEqual(acq.premium_method, "percent", "Method should be 'percent' not 'flat'");
  console.log(`✓ #126 Decimal format: 0.15 on $1,000 bid → $${acq.buyer_premium} premium (expected $150)`);
}

// Test G: Whole-number percentage format (15 = 15%)
// $1,000 bid with 15 (15%) premium → $150
{
  const listing: ListingData = {
    source: "rbid", // Another non-Sierra source
    listing_url: "https://example.com/listing/789",
    title: "Test RBid Listing",
    description: "Test description",
    photos: [],
    current_bid: 0,
    fee_schedule: { buyer_premium: 15, sales_tax_percent: 0.086 },
    location: { city: "Phoenix", state: "AZ" }
  };
  const acq = calculateAcquisitionForBid(listing, 1000, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 150, "#126: 15 whole-number → $150 premium on $1,000 bid");
  assert.strictEqual(acq.premium_method, "percent", "Method should be 'percent'");
  console.log(`✓ #126 Whole-number format: 15 on $1,000 bid → $${acq.buyer_premium} premium (expected $150)`);
}

// Test H: Edge case - 12% premium
{
  const listing: ListingData = {
    source: "govplanet",
    listing_url: "https://example.com/listing/abc",
    title: "Test GovPlanet Listing",
    description: "Test description",
    photos: [],
    current_bid: 0,
    fee_schedule: { buyer_premium: 0.12, sales_tax_percent: 0.086 },
    location: { city: "Phoenix", state: "AZ" }
  };
  const acq = calculateAcquisitionForBid(listing, 5000, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 600, "#126: 0.12 (12%) on $5,000 bid → $600 premium");
  console.log(`✓ #126 Edge case: 0.12 on $5,000 bid → $${acq.buyer_premium} premium (expected $600)`);
}

console.log("\n✅ All buyer premium semantic tests passed (issue #126)");

// ============================================
// ISSUE #127: Margin Denominator Fix
// ============================================
// Acceptance Criteria:
// - margin = profit / acquisitionCost (NOT sale price)
// - Example: $1,000 acquisition, $1,200 sale, $200 profit → 20% margin (not 16.7%)

// Test I: Margin uses acquisition cost as denominator
// Verify the formula: margin = profit / acquisitionCost (NOT profit / salePrice)
{
  const spine = buildCalculationSpine({
    bidAmount: 1000,
    feeSchedule: { buyer_premium: 0.10, sales_tax_percent: 0.05 },
    transport: 100,
    repairs: 200,
    repairsBasis: 'estimated',
    marketPrices: { quick_sale: 1800, market_rate: 2000, premium: 2500 }
  });

  // Calculate expected values:
  // premium = 1000 * 0.10 = 100
  // tax = (1000 + 100) * 0.05 = 55
  // subtotal = 1000 + 100 + 55 = 1155
  // total_all_in = 1155 + 100 + 200 = 1455

  // For market_rate = 2000:
  // profit = 2000 - 1455 = 545
  // CORRECT margin = 545 / 1455 = 0.3746 (37.5%)
  // WRONG margin = 545 / 2000 = 0.2725 (27.3%)

  const profit = spine.expected_profit;
  const acquisitionCost = spine.total_all_in;
  const salePrice = spine.market_rate_price;

  const correctMargin = profit / acquisitionCost;
  const wrongMargin = profit / salePrice;

  // Verify margin uses acquisition cost, not sale price
  assert.ok(
    Math.abs(spine.expected_margin - correctMargin) < 0.001,
    `#127: Margin should be profit/acquisition (${correctMargin.toFixed(3)}), got ${spine.expected_margin.toFixed(3)}`
  );
  assert.ok(
    Math.abs(spine.expected_margin - wrongMargin) > 0.05,
    `#127: Margin should NOT be profit/sale (${wrongMargin.toFixed(3)})`
  );

  console.log(`✓ #127: $${profit} profit on $${acquisitionCost} acquisition → ${(spine.expected_margin * 100).toFixed(1)}% margin`);
  console.log(`  (Wrong formula would give ${(wrongMargin * 100).toFixed(1)}%)`);
}

// Test J: All three margin scenarios use correct denominator
{
  const spine = buildCalculationSpine({
    bidAmount: 800,
    feeSchedule: { buyer_premium: 0.10, sales_tax_percent: 0.05 },
    transport: 50,
    repairs: 100,
    repairsBasis: 'estimated',
    marketPrices: { quick_sale: 1200, market_rate: 1500, premium: 2000 }
  });

  // premium = 80, tax = 44, subtotal = 924, total = 924 + 50 + 100 = 1074
  const acquisitionCost = spine.total_all_in;

  // Verify each margin is profit / acquisitionCost
  const quickCorrect = spine.quick_sale_profit / acquisitionCost;
  const expectedCorrect = spine.expected_profit / acquisitionCost;
  const premiumCorrect = spine.premium_profit / acquisitionCost;

  assert.ok(Math.abs(spine.quick_sale_margin - quickCorrect) < 0.001,
    `Quick margin: expected ${quickCorrect.toFixed(3)}, got ${spine.quick_sale_margin.toFixed(3)}`);
  assert.ok(Math.abs(spine.expected_margin - expectedCorrect) < 0.001,
    `Expected margin: expected ${expectedCorrect.toFixed(3)}, got ${spine.expected_margin.toFixed(3)}`);
  assert.ok(Math.abs(spine.premium_margin - premiumCorrect) < 0.001,
    `Premium margin: expected ${premiumCorrect.toFixed(3)}, got ${spine.premium_margin.toFixed(3)}`);

  console.log(`✓ #127: All margins use acquisition cost denominator`);
  console.log(`  Quick=${(spine.quick_sale_margin * 100).toFixed(0)}%, Expected=${(spine.expected_margin * 100).toFixed(0)}%, Premium=${(spine.premium_margin * 100).toFixed(0)}%`);
}

console.log("\n✅ All margin denominator tests passed (issue #127)");

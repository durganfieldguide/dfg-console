import assert from "node:assert";
import { calculateAcquisitionForBid } from "../analysis";
import { SIERRA_FEES } from "../phoenix-market-data";
import { normalizeListingForAnalysis } from "../worker";
import type { ListingData } from "../types";

function makeBaseListing(): ListingData {
  return {
    source: "sierra_auction",
    listing_url: "https://example.com/listing/123",
    title: "Test Sierra Listing",
    description: "Test description",
    photos: [],
    current_bid: 0,
    fee_schedule: SIERRA_FEES,
    location: { city: "Phoenix", state: "AZ" }
  };
}

// Test A: Tier premium selection
{
  const listing = makeBaseListing();
  const acq = calculateAcquisitionForBid(listing, 1700, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 299, "Tiered premium for $1700 bid should be 299");
  assert.strictEqual(acq.premium_method, "tier");
  assert.deepStrictEqual(acq.matched_tier, { max_bid: 1999.99, premium: 299 });
}

// Test B: Sierra injection works
{
  const listing: ListingData = {
    ...makeBaseListing(),
    fee_schedule: undefined
  };
  normalizeListingForAnalysis(listing);
  const acq = calculateAcquisitionForBid(listing, 1700, { payment_method: "cash", debug: true });
  assert.strictEqual(acq.buyer_premium, 299, "Injected Sierra fees should yield 299 premium at $1700 bid");
  assert.strictEqual(acq.premium_method, "tier");
}

console.log("acquisition tier tests passed");

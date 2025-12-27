import assert from "node:assert";
import { calculateAcquisitionForBid, calculateProfitScenarios } from "./src/analysis";
import type { ListingData } from "./src/types";

const listing: ListingData = {
  source: "sierra_auction",
  listing_url: "https://example.com/listing/123",
  title: "Test Trailer",
  description: "Test description",
  photos: [],
  current_bid: 0,
  fee_schedule: {
    buyer_premium: 0.12, // percent-like premium
    sales_tax_percent: 0.086
  },
  location: { city: "Phoenix", state: "AZ" },
  ends_at: new Date().toISOString()
};

const marketRate = 8000;
const repairTotal = 750;
const assumedBid = 4000;

const acq = calculateAcquisitionForBid(listing, assumedBid, { payment_method: "cash" });
assert(acq.total_acquisition > 0, "acquisition should be greater than zero when bid > 0");

const scenarios = calculateProfitScenarios(
  { quick_sale: 6500, market_rate: marketRate, premium: 9000 },
  acq.total_acquisition + repairTotal
);

// Gross profit should not approximate market_rate when bid is zero; ensure investment is applied.
assert(
  scenarios.expected.gross_profit < marketRate * 0.9,
  "expected gross profit should account for acquisition + repairs (not near market rate)"
);

console.log("Scenario bid smoke test passed.");

/**
 * DFG Deal Analysis Types
 * 
 * Single source of truth for all analysis-related types.
 * Every derived value in the UI must trace back to these structures.
 */

export type Money = number;
export type Currency = "USD";

// ============================================================================
// ASSUMPTIONS (Inputs)
// ============================================================================

export interface AuctionAssumptions {
  buyerPremiumPct: number;       // e.g., 0.15 (15%)
  salesTaxPct: number;           // e.g., 0.086 (8.6% AZ)
  flatFees: Money;               // docs, gate fees, etc.
  taxAppliesToPremium: boolean;  // true = tax on (bid + premium)
}

export interface AcquisitionAssumptions {
  transportCost: Money;
  storagePerDay: Money;
  expectedHoldDays: number;
  contingencyPct: number;        // e.g., 0.10 (10% buffer)
  contingencyBasis: "nonAuction" | "allIn";
}

export interface ReconditioningAssumptions {
  estimatedRepairs: Money;
  detailing: Money;
}

export interface DispositionAssumptions {
  listingFees: Money;            // selling cost (FBMP boost, etc.)
  paymentFeesPct: number;        // e.g., 0.03 for credit card
}

export interface BidStrategyAssumptions {
  targetRoiPct: number;          // e.g., 0.20 (20% target ROI)
  absoluteMaxBid?: Money;        // hard ceiling
  minProfitDollars?: Money;      // minimum acceptable profit
}

export interface Assumptions {
  currency: Currency;
  auction: AuctionAssumptions;
  acquisition: AcquisitionAssumptions;
  reconditioning: ReconditioningAssumptions;
  disposition: DispositionAssumptions;
  bidStrategy: BidStrategyAssumptions;
}

// ============================================================================
// LISTING SNAPSHOT (Source data)
// ============================================================================

export interface ListingSnapshot {
  id: string;
  source: "sierra";
  title: string;
  category: "vehicle" | "trailer" | "equipment" | "unknown";

  currentBid?: Money;
  endTime?: string;              // ISO 8601
  location?: string;

  photoCount?: number;
  titleStatus?: "clean" | "salvage" | "rebuilt" | "unknown";
  odometerMiles?: number;

  vin?: string;
  url?: string;
}

// ============================================================================
// DERIVED NUMBERS (Outputs)
// ============================================================================

/**
 * Acquisition + prep costs at a given bid.
 *
 * IMPORTANT: Does NOT include selling costs (listingFees, paymentFees).
 * Selling costs are computed in ScenarioResult since they depend on sale price.
 * This separation prevents double-counting.
 */
export interface CostBreakdown {
  bid: Money;
  buyerPremium: Money;
  tax: Money;
  flatFees: Money;

  transport: Money;
  storage: Money;

  repairs: Money;
  detailing: Money;

  contingency: Money;

  totalAllIn: Money;             // sum of above (excludes selling costs)
}

export interface SaleScenario {
  price: Money;
  expectedDaysToSell?: number;
  notes?: string;
}

export interface ScenarioResult {
  salePrice: Money;

  listingFees: Money;
  paymentFees: Money;
  sellingCosts: Money;           // listingFees + paymentFees

  netProceeds: Money;            // salePrice - sellingCosts
  profit: Money;                 // netProceeds - totalAllIn

  roiOnCostPct: number;          // profit / totalAllIn
  marginOnSalePct: number;       // profit / salePrice
}

export interface BidDerived {
  currentBid?: Money;
  suggestedMaxBid: Money;        // computed via deriveMaxBidFromTargetRoi
  operatorMaxBid?: Money;        // user override
  effectiveMaxBid: Money;        // operatorMaxBid ?? suggestedMaxBid
}

export interface DerivedNumbers {
  bid: BidDerived;

  costsAtEffectiveMaxBid: CostBreakdown;
  costsAtCurrentBid?: CostBreakdown;

  scenarios: {
    quick?: ScenarioResult;
    expected?: ScenarioResult;
    premium?: ScenarioResult;
  };

  retailEstimate?: Money;        // = scenarios.expected.salePrice
}

// ============================================================================
// CONFIDENCE & GATES
// ============================================================================

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface ConfidenceState {
  level: ConfidenceLevel;
  basis?: string[];              // reasons for high/medium/low
  reason?: string;               // reason for unknown
}

export interface GateAction {
  type: "call" | "open_url" | "add_note" | "upload_photo" | "manual";
  label: string;
  payload?: string;              // phone, URL, etc.
}

export interface Gate {
  id: string;
  severity: "critical" | "confidence";
  status: "open" | "cleared";
  label: string;
  whyItMatters: string;
  howToClear: string;
  action?: GateAction;
}

// ============================================================================
// ANALYSIS ENVELOPE (Full output)
// ============================================================================

export interface TraceEntry {
  source: string;
  formula?: string;
  notes?: string;
}

export interface AnalysisEnvelope {
  listing: ListingSnapshot;
  assumptions: Assumptions;
  derived: DerivedNumbers;

  gates: Gate[];

  recommendation: "buy" | "watch" | "pass";
  recommendationReasonTop3: string[];

  confidence: ConfidenceState;

  // Required audit trail
  trace: Record<string, TraceEntry>;

  // Metadata
  analyzedAt: string;            // ISO 8601
  version: string;               // schema version
}

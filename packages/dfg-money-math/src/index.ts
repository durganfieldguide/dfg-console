/**
 * @dfg/money-math
 *
 * Canonical money math calculations for DFG.
 *
 * DOCTRINE (non-negotiable):
 * - Acquisition Cost = Bid + Buyer Premium + Transport + Immediate Repairs
 * - Net Proceeds = Sale Price - Listing Fees - Payment Processing
 * - Profit = Net Proceeds - Acquisition Cost
 * - Margin % = (Profit / Acquisition Cost) × 100  ← NOT sale price!
 */

// Types
export type {
  FeeScheduleTier,
  FeeSchedule,
  AcquisitionInput,
  ProceedsInput,
  DealAnalysis,
} from './types';

// Acquisition calculations
export {
  calculateBuyerPremium,
  calculateAcquisitionCost,
} from './acquisition';

// Proceeds calculations
export {
  calculateNetProceeds,
  calculateListingFee,
  calculateProcessingFee,
} from './proceeds';

// Profit and margin calculations
export {
  calculateProfit,
  calculateMarginPercent,
  analyzeDeal,
} from './profit';

// Fee schedules
export { SIERRA_FEE_SCHEDULE } from './fees/sierra';

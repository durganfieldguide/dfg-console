/**
 * Core type definitions for DFG API.
 * Based on Technical Specification v1.2
 */

// =============================================================================
// OPPORTUNITY STATUS & STATE MACHINE
// =============================================================================

export type OpportunityStatus =
  | 'inbox'       // Unprocessed, new from scout
  | 'qualifying'  // Quick evaluation in progress
  | 'watch'       // Waiting for trigger condition
  | 'inspect'     // Worth physical inspection
  | 'bid'         // Max bid set, countdown active
  | 'won'         // Auction won
  | 'lost'        // Auction lost
  | 'rejected'    // Explicitly rejected with reason
  | 'archived';   // Removed from active pipeline

export type RejectionReason =
  | 'category_mismatch'
  | 'documentation_risk'
  | 'condition_critical'
  | 'low_demand'
  | 'transport_kills_margin'
  | 'price_blown'
  | 'duplicate'
  | 'other';

// Allowed transitions from each status
export const STATE_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  inbox: ['qualifying', 'watch', 'rejected', 'archived'],
  qualifying: ['watch', 'inspect', 'rejected', 'archived'],
  watch: ['qualifying', 'inspect', 'rejected', 'archived'],
  inspect: ['bid', 'rejected', 'archived'],
  bid: ['won', 'lost', 'rejected', 'archived'],
  won: ['archived'],
  lost: ['archived'],
  rejected: ['archived'],
  archived: [],
};

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

// =============================================================================
// WATCH SYSTEM
// =============================================================================

export type WatchTrigger = 'ending_soon' | 'time_window' | 'manual';

export interface WatchThreshold {
  hours_before?: number;      // For ending_soon (default: 4)
  remind_at?: string;         // For time_window/manual (ISO datetime)
  price_ceiling?: number;     // Universal condition (optional)
}

// =============================================================================
// ALERTS (Computed, not stored)
// =============================================================================

export type AlertType = 'watch_fired' | 'ending_soon' | 'stale_qualifying' | 'price_alert';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  type: AlertType;
  key: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  created_at: string;
  opportunity_id: string;
  metadata?: Record<string, unknown>;
}

export interface ComputedAlert {
  alert_key: string;
  alert_type: AlertType;
  opportunity_id: string;
  title: string;
  message: string;
  fired_at: string;
  opportunity_summary: {
    title: string;
    current_price: number | null;
    auction_ends_at: string | null;
    status: string;
  };
}

// =============================================================================
// OBSERVED FACTS (Operator augmentation)
// =============================================================================

export interface UniversalFacts {
  documentation_status?: 'verified' | 'partial' | 'missing' | 'unknown';
  condition_grade?: 'excellent' | 'good' | 'fair' | 'poor' | 'parts_only';
  reserve_status?: 'met' | 'not_met' | 'no_reserve' | 'unknown';
  buyer_premium_pct?: number;
  pickup_deadline?: string;
  operator_notes?: string;
}

export interface TrailerFacts {
  axle_count?: number;
  brake_type?: 'electric' | 'surge' | 'none' | 'unknown';
  deck_condition?: 'good' | 'fair' | 'poor' | 'unknown';
  tire_condition?: 'good' | 'fair' | 'replace' | 'unknown';
}

export interface CategoryFacts {
  trailer?: TrailerFacts;
}

export interface ObservedFacts {
  universal: UniversalFacts;
  category?: CategoryFacts;
}

// =============================================================================
// OPERATOR ACTIONS
// =============================================================================

export type ActionType =
  // Operator actions
  | 'status_change'
  | 'augmentation'
  | 'note'
  | 'max_bid_set'
  | 'watch_set'
  | 'batch_reject'
  | 'batch_archive'
  | 're_analyze'       // Sprint 1.5: Re-analyze with operator inputs
  // System actions
  | 'alert_fired'
  | 'alert_dismiss';

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

export interface OpportunityRow {
  id: string;
  source: string;
  source_lot_id: string;
  listing_id: string | null;
  source_url: string;
  category_id: string | null;
  status: OpportunityStatus;
  status_changed_at: string;
  rejection_reason: string | null;
  rejection_note: string | null;
  title: string;
  description: string | null;
  location: string | null;
  distance_miles: number | null;
  current_bid: number | null;
  buy_now_price: number | null;
  reserve_status: string;
  estimated_fees: number | null;
  auction_ends_at: string | null;
  pickup_deadline: string | null;
  buy_box_score: number;
  score_breakdown: string | null;
  unknown_count: number;
  max_bid_low: number | null;
  max_bid_high: number | null;
  analysis_summary: string | null;
  last_analyzed_at: string | null;
  observed_facts: string;
  watch_cycle: number;
  watch_until: string | null;
  watch_trigger: string | null;
  watch_threshold: string | null;
  watch_fired_at: string | null;
  max_bid_locked: number | null;
  bid_strategy: string | null;
  final_price: number | null;
  outcome_notes: string | null;
  r2_snapshot_key: string | null;
  photos: string | null;
  primary_image_url: string | null;
  created_at: string;
  updated_at: string;
  // Sprint 1.5: Operator inputs & analysis runs
  operator_inputs_json: string | null;
  current_analysis_run_id: string | null;
}

export interface OperatorActionRow {
  id: string;
  opportunity_id: string;
  action_type: ActionType;
  from_status: string | null;
  to_status: string | null;
  alert_key: string | null;
  payload: string | null;
  created_at: string;
}

export interface SourceRow {
  id: string;
  name: string;
  status: string;
  last_successful_run: string | null;
  last_error: string | null;
  primary_categories: string | null;
  default_buyer_premium_pct: number;
  default_pickup_days: number;
  config: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface UpdateOpportunityRequest {
  status?: OpportunityStatus;
  rejection_reason?: RejectionReason;
  rejection_note?: string;
  watch_trigger?: WatchTrigger;
  watch_threshold?: WatchThreshold;
  max_bid_locked?: number;
  bid_strategy?: 'last_minute' | 'early' | 'manual';
  final_price?: number;
  observed_facts?: ObservedFacts;
  outcome_notes?: string;
}

export interface BatchRequest {
  opportunity_ids: string[];
  action: 'reject' | 'archive';
  rejection_reason?: RejectionReason;
  rejection_note?: string;
}

export interface BatchResult {
  processed: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

// =============================================================================
// SPRINT 1.5: OPERATOR INPUTS & ANALYSIS RUNS
// =============================================================================

/**
 * Verification level for operator-captured data.
 * Prevents "checkbox theater" where operators mark verified without evidence.
 */
export type VerificationLevel =
  | 'unverified'              // Default; just entered, no confirmation
  | 'operator_attested'       // Operator asserts this is correct (verbal, visual)
  | 'documented'              // Photo, screenshot, or document attached
  | 'third_party_confirmed';  // VIN report, title search, official record

/**
 * How the operator obtained this information.
 */
export type InputSource =
  | 'listing'          // Copied from auction listing
  | 'auctioneer_call'  // Phone/text with auctioneer
  | 'in_person'        // Physical inspection
  | 'vin_report'       // Carfax, AutoCheck, NMVTIS
  | 'seller'           // Direct from seller/consignor
  | 'other';

/**
 * Tri-state for fields where yes/no/unknown are all meaningful.
 * Never use `boolean | null` for these.
 */
export type TriState = 'yes' | 'no' | 'unknown';

/**
 * Every operator-captured value is wrapped with metadata for auditability.
 */
export interface OperatorField<T> {
  value: T;
  source: InputSource;
  verificationLevel: VerificationLevel;
  capturedAt: string;    // ISO 8601 timestamp
  notes?: string;        // Optional context
}

/**
 * Title status categories.
 */
export type TitleStatus =
  | 'clean'
  | 'salvage'
  | 'rebuilt'
  | 'bonded'
  | 'parts_only'
  | 'unknown';

/**
 * Lien status categories.
 */
export type LienStatus = 'none' | 'lien_present' | 'unknown';

/**
 * Title inputs v1 - the 5 highest-leverage fields.
 */
export interface TitleInputsV1 {
  titleStatus?: OperatorField<TitleStatus>;
  titleInHand?: OperatorField<TriState>;
  lienStatus?: OperatorField<LienStatus>;
  vin?: OperatorField<string>;
  odometerMiles?: OperatorField<number>;
}

/**
 * Operator-set overrides that affect deal math.
 */
export interface OperatorOverrides {
  maxBidOverride?: OperatorField<number>;
  confirmedPrice?: OperatorField<number>;
}

/**
 * Top-level container for all operator inputs.
 * Stored as `operator_inputs_json` on opportunities table.
 */
export interface OperatorInputs {
  title?: TitleInputsV1;
  overrides?: OperatorOverrides;
}

// =============================================================================
// GATE TYPES
// =============================================================================

export type GateSeverity = 'CRITICAL' | 'CONFIDENCE';
export type GateStatus = 'open' | 'cleared';

export interface Gate {
  id: string;
  label: string;
  severity: GateSeverity;
  status: GateStatus;
  clearedBy?: string;
  blocksAction: boolean;
}

export interface ComputedGates {
  gates: Gate[];
  criticalOpen: number;
  confidenceOpen: number;
  allCriticalCleared: boolean;
  bidActionEnabled: boolean;
}

// =============================================================================
// ANALYSIS RUN (Retained Snapshot)
// =============================================================================

export type AnalysisRecommendation = 'BID' | 'WATCH' | 'PASS' | 'NEEDS_INFO';

export interface AnalysisRun {
  id: string;
  opportunityId: string;
  createdAt: string;

  // Snapshot inputs (frozen at analysis time)
  listingSnapshotHash: string;
  assumptionsJson: string;
  operatorInputsJson: string | null;

  // Computed outputs
  derivedJson: string;
  gatesJson: string;
  recommendation: AnalysisRecommendation;
  traceJson: string;

  // Metadata
  modelMeta?: {
    calcVersion: string;
    gatesVersion: string;
  };
}

export interface AnalysisRunRow {
  id: string;
  opportunity_id: string;
  created_at: string;
  listing_snapshot_hash: string;
  assumptions_json: string;
  operator_inputs_json: string | null;
  derived_json: string;
  gates_json: string;
  recommendation: string;
  trace_json: string;
  calc_version: string | null;
  gates_version: string | null;
}

// =============================================================================
// STALENESS DETECTION
// =============================================================================

export type StalenessReason =
  | { type: 'listing_bid_changed'; from: number; to: number }
  | { type: 'listing_end_time_changed'; from: string; to: string }
  | { type: 'listing_photos_changed'; from: number; to: number }
  | { type: 'operator_input_changed'; field: string; from: unknown; to: unknown }
  | { type: 'assumptions_version_changed'; from: string; to: string };

export interface StalenessCheck {
  isStale: boolean;
  reasons: StalenessReason[];
}

// =============================================================================
// LISTING FACTS (for gate computation)
// =============================================================================

export interface ListingFacts {
  currentBid?: number;
  endTime?: string;
  vin?: string;
  odometerMiles?: number;
  titleStatus?: string;
  photoCount?: number;
}

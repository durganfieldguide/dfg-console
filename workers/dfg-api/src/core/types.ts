/**
 * Core type definitions for DFG API.
 * Based on Technical Specification v1.2
 *
 * Shared types imported from @dfg/types package.
 * Worker-specific types defined here (OpportunityRow, database schemas, etc.).
 */

import type {
  OpportunityStatus,
  RejectionReason,
  DecisionReasonCode,
  WatchTrigger,
  WatchThreshold,
  Alert,
  AlertType,
  AlertSeverity,
  UniversalFacts,
  TrailerFacts,
  CategoryFacts,
  ObservedFacts,
  VerificationLevel,
  InputSource,
  TriState,
  OperatorField,
  TitleStatus,
  LienStatus,
  TitleInputsV1,
  OperatorOverrides,
  OperatorInputs,
  GateSeverity,
  GateStatus,
  Gate,
  ComputedGates,
  AnalysisRecommendation,
} from '@dfg/types'

import { STATE_TRANSITIONS, canTransition } from '@dfg/types'

// Re-export shared types for convenience
export type {
  OpportunityStatus,
  RejectionReason,
  WatchTrigger,
  WatchThreshold,
  Alert,
  AlertType,
  AlertSeverity,
  UniversalFacts,
  TrailerFacts,
  CategoryFacts,
  ObservedFacts,
  VerificationLevel,
  InputSource,
  TriState,
  OperatorField,
  TitleStatus,
  LienStatus,
  TitleInputsV1,
  OperatorOverrides,
  OperatorInputs,
  GateSeverity,
  GateStatus,
  Gate,
  ComputedGates,
  AnalysisRecommendation,
}

export { STATE_TRANSITIONS, canTransition }

// =============================================================================
// ALERTS (Worker-specific computed types)
// =============================================================================

export interface ComputedAlert {
  alert_key: string
  alert_type: AlertType
  opportunity_id: string
  title: string
  message: string
  fired_at: string
  opportunity_summary: {
    title: string
    current_price: number | null
    auction_ends_at: string | null
    status: string
  }
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
  | 're_analyze' // Sprint 1.5: Re-analyze with operator inputs
  // System actions
  | 'alert_fired'
  | 'alert_dismiss'

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

export interface OpportunityRow {
  id: string
  source: string
  source_lot_id: string
  listing_id: string | null
  source_url: string
  category_id: string | null
  status: OpportunityStatus
  status_changed_at: string
  rejection_reason: string | null
  rejection_note: string | null
  title: string
  description: string | null
  location: string | null
  distance_miles: number | null
  current_bid: number | null
  buy_now_price: number | null
  reserve_status: string
  estimated_fees: number | null
  auction_ends_at: string | null
  pickup_deadline: string | null
  buy_box_score: number
  score_breakdown: string | null
  unknown_count: number
  max_bid_low: number | null
  max_bid_high: number | null
  analysis_summary: string | null
  last_analyzed_at: string | null
  observed_facts: string
  watch_cycle: number
  watch_until: string | null
  watch_trigger: string | null
  watch_threshold: string | null
  watch_fired_at: string | null
  max_bid_locked: number | null
  bid_strategy: string | null
  final_price: number | null
  outcome_notes: string | null
  r2_snapshot_key: string | null
  photos: string | null
  primary_image_url: string | null
  created_at: string
  updated_at: string
  // Sprint 1.5: Operator inputs & analysis runs
  operator_inputs_json: string | null
  current_analysis_run_id: string | null
  // Migration 0004: Staleness tracking
  last_operator_review_at: string | null
  exit_price: number | null
}

export interface OperatorActionRow {
  id: string
  opportunity_id: string
  action_type: ActionType
  from_status: string | null
  to_status: string | null
  alert_key: string | null
  payload: string | null
  created_at: string
}

export interface SourceRow {
  id: string
  name: string
  status: string
  last_successful_run: string | null
  last_error: string | null
  primary_categories: string | null
  default_buyer_premium_pct: number
  default_pickup_days: number
  config: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface UpdateOpportunityRequest {
  status?: OpportunityStatus
  rejection_reason?: RejectionReason
  rejection_note?: string
  reason_codes?: DecisionReasonCode[] // #188: Multi-select reason codes for PASS decisions
  watch_trigger?: WatchTrigger
  watch_threshold?: WatchThreshold
  max_bid_locked?: number
  bid_strategy?: 'last_minute' | 'early' | 'manual'
  final_price?: number
  observed_facts?: ObservedFacts
  outcome_notes?: string
}

export interface BatchRequest {
  opportunity_ids: string[]
  action: 'reject' | 'archive'
  rejection_reason?: RejectionReason
  rejection_note?: string
}

export interface BatchResult {
  processed: number
  failed: number
  results: Array<{ id: string; success: boolean; error?: string }>
}

// =============================================================================
// ANALYSIS RUN (Retained Snapshot)
// =============================================================================

export interface AnalysisRun {
  id: string
  opportunityId: string
  createdAt: string

  // Snapshot inputs (frozen at analysis time)
  listingSnapshotHash: string
  assumptionsJson: string
  operatorInputsJson: string | null

  // Computed outputs
  derivedJson: string
  gatesJson: string
  recommendation: AnalysisRecommendation
  traceJson: string

  // Metadata
  modelMeta?: {
    calcVersion: string
    gatesVersion: string
  }
}

export interface AnalysisRunRow {
  id: string
  opportunity_id: string
  created_at: string
  listing_snapshot_hash: string
  assumptions_json: string
  operator_inputs_json: string | null
  derived_json: string
  gates_json: string
  recommendation: string
  trace_json: string
  calc_version: string | null
  gates_version: string | null
  // Sprint N+3 (#54): AI analysis result from dfg-analyst
  ai_analysis_json: string | null
}

// =============================================================================
// STALENESS DETECTION
// =============================================================================

export type StalenessReason =
  | { type: 'listing_bid_changed'; from: number; to: number }
  | { type: 'listing_end_time_changed'; from: string; to: string }
  | { type: 'listing_photos_changed'; from: number; to: number }
  | { type: 'operator_input_changed'; field: string; from: unknown; to: unknown }
  | { type: 'assumptions_version_changed'; from: string; to: string }

export interface StalenessCheck {
  isStale: boolean
  reasons: StalenessReason[]
}

// =============================================================================
// LISTING FACTS (for gate computation)
// =============================================================================

export interface ListingFacts {
  currentBid?: number
  endTime?: string
  vin?: string
  odometerMiles?: number
  titleStatus?: string
  photoCount?: number
}

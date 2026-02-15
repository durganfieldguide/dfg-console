/**
 * Frontend-specific types for DFG App.
 * Base types imported from @dfg/types (shared package).
 */

import type {
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
  Source,
  SourceDefaults,
  DashboardStats,
  ApiResponse,
  ApiError,
  ListResponse,
} from '@dfg/types'

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
  Source,
  SourceDefaults,
  DashboardStats,
  ApiResponse,
  ApiError,
  ListResponse,
}

// =============================================================================
// FRONTEND-SPECIFIC API RESPONSE TYPES
// =============================================================================

export interface OpportunitySummary {
  id: string
  source: string
  source_lot_id: string
  status: OpportunityStatus
  category_id: string | null
  title: string
  current_bid: number | null
  auction_ends_at: string | null
  buy_box_score: number
  distance_miles: number | null
  primary_image_url: string | null
  unknown_count: number
  status_changed_at: string
  watch_fired_at: string | null
  has_active_alert: boolean
  source_url?: string // Optional - may be included in list responses
  // Sprint N+1: Staleness fields
  is_stale?: boolean
  is_decision_stale?: boolean
  is_ending_soon?: boolean
  is_analysis_stale?: boolean
  stale_days?: number
}

export interface OpportunityDetail extends OpportunitySummary {
  source_url: string
  listing_id: string | null
  description: string | null
  location: string | null
  buy_now_price: number | null
  reserve_status: string
  estimated_fees: number | null
  pickup_deadline: string | null
  score_breakdown: Record<string, number> | null
  max_bid_low: number | null
  max_bid_high: number | null
  analysis_summary: string | null
  last_analyzed_at: string | null
  observed_facts: ObservedFacts
  watch_cycle: number
  watch_until: string | null
  watch_trigger: WatchTrigger | null
  watch_threshold: WatchThreshold | null
  max_bid_locked: number | null
  bid_strategy: string | null
  final_price: number | null
  outcome_notes: string | null
  photos: string[]
  rejection_reason: RejectionReason | null
  rejection_note: string | null
  created_at: string
  updated_at: string
  source_defaults: SourceDefaults | null
  actions: OperatorAction[]
  alerts: Alert[]
}

export interface OperatorAction {
  id: string
  action_type: string
  from_status: string | null
  to_status: string | null
  alert_key: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

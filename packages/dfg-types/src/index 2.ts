/**
 * Shared types for DFG monorepo.
 * Used by dfg-app (frontend), dfg-api, dfg-scout, and dfg-analyst workers.
 *
 * @packageDocumentation
 */

// =============================================================================
// OPPORTUNITY STATUS & STATE MACHINE
// =============================================================================

export type OpportunityStatus =
  | 'inbox' // Unprocessed, new from scout
  | 'qualifying' // Quick evaluation in progress
  | 'watch' // Waiting for trigger condition
  | 'inspect' // Worth physical inspection
  | 'bid' // Max bid set, countdown active
  | 'won' // Auction won
  | 'lost' // Auction lost
  | 'rejected' // Explicitly rejected with reason
  | 'archived' // Removed from active pipeline

export type RejectionReason =
  | 'too_far'
  | 'too_expensive'
  | 'wrong_category'
  | 'poor_condition'
  | 'missing_info'
  | 'category_mismatch'
  | 'documentation_risk'
  | 'condition_critical'
  | 'low_demand'
  | 'transport_kills_margin'
  | 'price_blown'
  | 'duplicate'
  | 'hard_gate_failure'
  | 'other'

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
}

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false
}

// =============================================================================
// WATCH SYSTEM
// =============================================================================

export type WatchTrigger = 'ending_soon' | 'time_window' | 'manual'

export interface WatchThreshold {
  hours_before?: number // For ending_soon (default: 4)
  remind_at?: string // For time_window/manual (ISO datetime)
  price_ceiling?: number // Universal condition (optional)
}

// =============================================================================
// ALERTS
// =============================================================================

export type AlertType = 'watch_fired' | 'ending_soon' | 'stale_qualifying' | 'price_alert'

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Alert {
  type: AlertType
  key: string
  title: string
  message: string
  severity: AlertSeverity
  created_at: string
  opportunity_id: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// OBSERVED FACTS (Operator augmentation)
// =============================================================================

export interface UniversalFacts {
  documentation_status?: 'verified' | 'partial' | 'missing' | 'unknown'
  condition_grade?: 'excellent' | 'good' | 'fair' | 'poor' | 'parts_only'
  reserve_status?: 'met' | 'not_met' | 'no_reserve' | 'unknown'
  buyer_premium_pct?: number
  pickup_deadline?: string
  operator_notes?: string
}

export interface TrailerFacts {
  axle_count?: number
  brake_type?: 'electric' | 'surge' | 'none' | 'unknown'
  deck_condition?: 'good' | 'fair' | 'poor' | 'unknown'
  tire_condition?: 'good' | 'fair' | 'replace' | 'unknown'
}

export interface CategoryFacts {
  trailer?: TrailerFacts
}

export interface ObservedFacts {
  universal: UniversalFacts
  category?: CategoryFacts
}

// =============================================================================
// SOURCE
// =============================================================================

export interface Source {
  id: string
  name: string
  display_name: string
  enabled: boolean
  base_url: string
  default_buyer_premium_pct: number
  default_pickup_days: number
  last_run_at: string | null
}

export interface SourceDefaults {
  buyer_premium_pct: number
  pickup_days: number
}

// =============================================================================
// OPERATOR INPUTS (Sprint 1.5)
// =============================================================================

export type VerificationLevel =
  | 'unverified'
  | 'operator_attested'
  | 'documented'
  | 'third_party_confirmed'

export type InputSource =
  | 'listing'
  | 'auctioneer_call'
  | 'in_person'
  | 'vin_report'
  | 'seller'
  | 'other'

export type TriState = 'yes' | 'no' | 'unknown'

export interface OperatorField<T> {
  value: T
  source: InputSource
  verificationLevel: VerificationLevel
  capturedAt: string
  notes?: string
}

export type TitleStatus = 'clean' | 'salvage' | 'rebuilt' | 'bonded' | 'parts_only' | 'unknown'

export type LienStatus = 'none' | 'lien_present' | 'unknown'

export interface TitleInputsV1 {
  titleStatus?: OperatorField<TitleStatus>
  titleInHand?: OperatorField<TriState>
  lienStatus?: OperatorField<LienStatus>
  vin?: OperatorField<string>
  odometerMiles?: OperatorField<number>
}

export interface OperatorOverrides {
  maxBidOverride?: OperatorField<number>
  confirmedPrice?: OperatorField<number>
}

export interface OperatorInputs {
  title?: TitleInputsV1
  overrides?: OperatorOverrides
}

// =============================================================================
// GATES
// =============================================================================

export type GateSeverity = 'CRITICAL' | 'CONFIDENCE'
export type GateStatus = 'open' | 'cleared'

export interface Gate {
  id: string
  label: string
  severity: GateSeverity
  status: GateStatus
  clearedBy?: string
  blocksAction: boolean
}

export interface ComputedGates {
  gates: Gate[]
  criticalOpen: number
  confidenceOpen: number
  allCriticalCleared: boolean
  bidActionEnabled: boolean
}

// =============================================================================
// ANALYSIS
// =============================================================================

export type AnalysisRecommendation = 'BID' | 'WATCH' | 'PASS' | 'NEEDS_INFO'

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface ListResponse<T> {
  data: {
    opportunities?: T[]
    sources?: T[]
    total: number
  }
  meta: {
    limit: number
    offset: number
  }
}

// =============================================================================
// DASHBOARD
// =============================================================================

export interface DashboardStats {
  by_status: Record<OpportunityStatus, number>
  strike_zone: number
  verification_needed: number
  ending_soon: {
    within_24h: number
    within_48h: number
  }
  new_today: number
  stale_qualifying: {
    over_24h: number
    over_48h: number
  }
  watch_alerts_fired: number
  needs_attention: number
  active_alerts: number
  last_scout_run: string | null
  last_ingest: string | null
}

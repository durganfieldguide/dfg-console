/**
 * Shared types for DFG App frontend.
 * Mirrors the API types from dfg-api worker.
 */

export type OpportunityStatus =
  | 'inbox'
  | 'qualifying'
  | 'watch'
  | 'inspect'
  | 'bid'
  | 'won'
  | 'lost'
  | 'rejected'
  | 'archived';

export type RejectionReason =
  | 'too_far'
  | 'too_expensive'
  | 'wrong_category'
  | 'poor_condition'
  | 'missing_info'
  | 'other';

export type WatchTrigger = 'ending_soon' | 'time_window' | 'manual';

export type AlertType = 'watch_fired' | 'ending_soon' | 'stale_qualifying' | 'price_alert';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WatchThreshold {
  hours_before?: number;
  remind_at?: string;
  price_ceiling?: number;
}

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

export interface OpportunitySummary {
  id: string;
  source: string;
  source_lot_id: string;
  status: OpportunityStatus;
  category_id: string | null;
  title: string;
  current_bid: number | null;
  auction_ends_at: string | null;
  buy_box_score: number;
  distance_miles: number | null;
  primary_image_url: string | null;
  unknown_count: number;
  status_changed_at: string;
  watch_fired_at: string | null;
  has_active_alert: boolean;
  source_url?: string; // Optional - may be included in list responses
  // Sprint N+1: Staleness fields
  is_stale?: boolean;
  is_decision_stale?: boolean;
  is_ending_soon?: boolean;
  is_analysis_stale?: boolean;
  stale_days?: number;
}

export interface OpportunityDetail extends OpportunitySummary {
  source_url: string;
  listing_id: string | null;
  description: string | null;
  location: string | null;
  buy_now_price: number | null;
  reserve_status: string;
  estimated_fees: number | null;
  pickup_deadline: string | null;
  score_breakdown: Record<string, number> | null;
  max_bid_low: number | null;
  max_bid_high: number | null;
  analysis_summary: string | null;
  last_analyzed_at: string | null;
  observed_facts: ObservedFacts;
  watch_cycle: number;
  watch_until: string | null;
  watch_trigger: WatchTrigger | null;
  watch_threshold: WatchThreshold | null;
  max_bid_locked: number | null;
  bid_strategy: string | null;
  final_price: number | null;
  outcome_notes: string | null;
  photos: string[];
  rejection_reason: RejectionReason | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  source_defaults: SourceDefaults | null;
  actions: OperatorAction[];
  alerts: Alert[];
}

export interface SourceDefaults {
  buyer_premium_pct: number;
  pickup_days: number;
}

export interface OperatorAction {
  id: string;
  action_type: string;
  from_status: string | null;
  to_status: string | null;
  alert_key: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

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

export interface Source {
  id: string;
  name: string;
  display_name: string;
  enabled: boolean;
  base_url: string;
  default_buyer_premium_pct: number;
  default_pickup_days: number;
  last_run_at: string | null;
}

export interface DashboardStats {
  by_status: Record<OpportunityStatus, number>;
  strike_zone: number;  // Sprint N+3: High-value inbox items ready for action
  verification_needed: number;  // Sprint N+3: Opportunities with open critical gates
  ending_soon: {
    within_24h: number;
    within_48h: number;
  };
  new_today: number;
  stale_qualifying: {
    over_24h: number;
    over_48h: number;
  };
  watch_alerts_fired: number;
  needs_attention: number;
  active_alerts: number;
  last_scout_run: string | null;
  last_ingest: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface ListResponse<T> {
  data: {
    opportunities?: T[];
    sources?: T[];
    total: number;
  };
  meta: {
    limit: number;
    offset: number;
  };
}

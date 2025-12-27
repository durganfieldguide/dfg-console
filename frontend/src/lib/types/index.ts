// ============================================
// API Types - Durgan Field Guide
// ============================================

// Sources - matches backend dfg-scout/dfg-analyst
export type AuctionSource = 'sierra_auction' | 'ironplanet' | 'fb_marketplace' | 'craigslist' | 'offerup';

// Categories - matches backend category_defs and source_category_map
export type CategoryId =
  | 'buy_box'
  | 'fleet_trucks'
  | 'welders'
  | 'air_compressors'
  | 'generators'
  | 'power_tools'
  | 'tool_storage'
  | 'TRAILER_UTILITY'
  | 'GENERATOR_PORTABLE'
  | 'WELDER_PRO'
  | 'vehicles'
  | 'vehicle'
  | 'suv'
  | 'car'
  | 'truck'
  | 'cars_trucks';

// Listing Status
export type ListingStatus = 'candidate' | 'rejected' | 'analyzed' | 'purchased' | 'passed';

// Verdict Types
// Internal verdicts (backend): STRONG_BUY | BUY | MARGINAL | PASS
// Display verdicts (API response): BUY | WATCH | PASS
//
// Hard definitions (do not soften):
// BUY = bid up to max bid if gates clear. This is a real number.
// WATCH = needs more info or price drop. Do not bid yet.
// PASS = do not spend time. Not "maybe later."
export type Verdict = 'BUY' | 'WATCH' | 'PASS';

// ============================================
// Scout API Types
// ============================================

export interface ScoutRunResponse {
  success: boolean;
  run_id: string;
  duration_ms: number;
  candidates: number;
  fetched: number;
  rejected: number;
  source: AuctionSource;
  timestamp?: string;
}

export interface ScoutRun {
  run_id: string;
  source: AuctionSource;
  started_at: string;
  completed_at: string | null;
  total_candidates: number;
  total_fetched: number;
  total_rejected: number;
  synced_count: number;
  pending_count: number;
  status: 'running' | 'completed' | 'failed';
  duration_ms?: number;
}

export interface StatsResponse {
  recent_runs: ScoutRun[];
  total_candidates: number;
  sources: AuctionSource[];
  total_analyzed?: number;
  total_purchased?: number;
  total_rejected?: number;
  database?: {
    total_listings?: number;
    total_candidates?: number;
    total_rejected?: number;
    total_analyzed?: number;
    total_purchased?: number;
  };
}

export interface SyncBatchResponse {
  success: boolean;
  synced: number;
  remaining: number;
  run_id: string;
  source: AuctionSource;
  listings?: Listing[];
}

// ============================================
// Listing Types
// ============================================

export interface Listing {
  id: string;
  source: AuctionSource;
  source_id: string;
  url: string;
  title: string;
  description?: string;
  current_bid: number;
  category_id: CategoryId;
  buy_box_score: number;
  status: ListingStatus;
  image_url?: string;
  photos?: string[];
  auction_end_at: string | null;
  location?: {
    city: string;
    state: string;
    distance_miles?: number;
  };
  created_at: string;
  updated_at: string;
  run_id?: string;
}

// ============================================
// Photo Pipeline Metrics
// ============================================

export interface PhotoMetrics {
  available: number;        // Total photos the listing has (from source)
  availability_known: boolean; // True if photo_count came from source
  received: number;         // URLs received in API request
  selected: number;         // Chosen for analysis (capped at 10)
  analyzed_ok: number;      // Successfully processed
  analyzed_failed: number;  // Failed to fetch/process
  selected_indices?: number[]; // Which photos we analyzed
}

// ============================================
// Gate Results
// ============================================

export interface GateResult {
  name: string;
  triggered: boolean;
  reason?: string;
}

// ============================================
// Analyst API Types
// ============================================

export interface AnalyzeRequest {
  source: AuctionSource;
  listing_url: string;
  lot_id: string;
  category_id: CategoryId;
  title: string;
  description?: string;
  photos?: string[];
  current_bid: number;
  fee_schedule: {
    buyer_premium: number;
    sales_tax_percent: number;
  };
  location?: {
    city: string;
    state: string;
    distance_miles?: number;
  };
}

export interface AnalysisResult {
  id?: string;
  listing_id: string;
  analysis_timestamp: string;
  asset_summary: {
    title: string;
    year_make_model?: string;
    source: AuctionSource;
    current_bid: number;
    lot_id?: string;
  };
  report_fields: {
    verdict: Verdict;
    max_bid_mid: number;
    max_bid_worst: number;
    max_bid_best: number;
    retail_est: number;
    expected_profit: number;
    expected_margin: number;
    confidence: number; // 1-5
  };
  report_markdown: string;
  condition?: {
    overall_grade?: string;
    known_issues?: string[];
    inspection_priorities?: string[];
    red_flags?: string[];
  };
  investor_lens?: {
    repair_plan?: string;
    repair_cost_estimate?: number;
    market_comps?: string[];
    deal_killers?: string[];
    exit_strategy?: string;
  };
  buyer_lens?: {
    perceived_value?: string;
    objections?: string[];
    listing_strategy?: string;
    target_buyer?: string;
  };
}

// ============================================
// Opportunity Dashboard Types
// ============================================

// Listing with joined analysis data for dashboard display
export interface ListingWithAnalysis extends Listing {
  analysis?: AnalysisResult;
}

// Opportunity action states derived from ListingStatus + verdict
export type OpportunityState =
  | 'needs_analysis'  // status='candidate', no analysis
  | 'ready_to_act'    // status='analyzed', verdict='BUY', confidence>=3
  | 'under_review'    // status='analyzed', verdict='WATCH'
  | 'passed'          // status='analyzed', verdict='PASS' or status='passed'
  | 'rejected'        // status='rejected'
  | 'purchased';      // status='purchased'

// Enhanced stats response for opportunity-centric dashboard
export interface OpportunityStats {
  // Counts by action state
  needs_analysis: number;      // status='candidate', no analysis
  ready_to_act: number;        // status='analyzed', verdict='BUY', confidence>=3
  under_review: number;        // status='analyzed', verdict='WATCH'
  ending_soon: number;         // auction_end_at < 24 hours from now

  // Items for dashboard sections
  top_candidates: Listing[];           // Top 5 by score, needs analysis
  actionable: ListingWithAnalysis[];   // BUY verdicts, sorted by margin
  marginals: ListingWithAnalysis[];    // WATCH verdicts
  ending_soon_items: ListingWithAnalysis[]; // Ending within 24h, any status
}

// Combined dashboard response
export interface DashboardStatsResponse extends StatsResponse {
  opportunities: OpportunityStats;
}

// ============================================
// UI State Types
// ============================================

export interface FilterState {
  source?: AuctionSource;
  category?: CategoryId;
  minPrice?: number;
  maxPrice?: number;
  minScore?: number;
  status?: ListingStatus;
  searchQuery?: string;
}

export interface SortState {
  field: keyof Listing | 'score';
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ============================================
// Settings Types
// ============================================

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  enabledSources: AuctionSource[];
  defaultPageSize: number;
  autoRefreshInterval: number; // seconds, 0 = disabled
  notifications: {
    emailOnNewDeals: boolean;
    emailOnAnalysisComplete: boolean;
  };
}

export interface Category {
  id: CategoryId;
  name: string;
  description?: string;
  enabled: boolean;
  criteria?: Record<string, unknown>;
}

// ============================================
// Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  created_at: string;
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

// ============================================
// Helper Types
// ============================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

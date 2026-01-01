/**
 * API client for communicating with dfg-api worker.
 *
 * All requests go through the Next.js API proxy (/api/*)
 * which adds the auth token server-side.
 */

import type {
  OpportunitySummary,
  OpportunityDetail,
  DashboardStats,
  Source,
  ApiResponse,
  ListResponse,
  OpportunityStatus,
  RejectionReason,
  WatchTrigger,
  WatchThreshold,
  ObservedFacts,
} from '@/types';
import type { OperatorInputs } from '@/components/features/title-inputs';
import type { ComputedGates } from '@/components/features/gates-display';
import type { StalenessReason } from '@/components/features/staleness-banner';

/**
 * Fetch from the local Next.js API proxy.
 * The proxy adds authorization and forwards to dfg-api.
 */
async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Use local proxy - token is added server-side
  const url = `/api${path.replace(/^\/api/, '')}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// OPPORTUNITIES
// =============================================================================

export interface ListOpportunitiesParams {
  status?: OpportunityStatus | OpportunityStatus[];
  ending_within?: '24h' | '48h' | '7d';
  score_band?: 'high' | 'medium' | 'low';
  category_id?: string;
  needs_attention?: boolean;
  stale_qualifying?: boolean;
  // Sprint N+1: Staleness filters
  stale?: boolean;
  analysis_stale?: boolean;
  decision_stale?: boolean;
  ending_soon?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function listOpportunities(
  params: ListOpportunitiesParams = {}
): Promise<{ opportunities: OpportunitySummary[]; total: number }> {
  const searchParams = new URLSearchParams();

  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status.join(',') : params.status;
    searchParams.set('status', statuses);
  }
  if (params.ending_within) searchParams.set('ending_within', params.ending_within);
  if (params.score_band) searchParams.set('score_band', params.score_band);
  if (params.category_id) searchParams.set('category_id', params.category_id);
  if (params.needs_attention) searchParams.set('needs_attention', 'true');
  if (params.stale_qualifying) searchParams.set('stale_qualifying', 'true');
  // Sprint N+1: Staleness filters
  if (params.stale) searchParams.set('stale', 'true');
  if (params.analysis_stale) searchParams.set('analysis_stale', 'true');
  if (params.decision_stale) searchParams.set('decision_stale', 'true');
  if (params.ending_soon) searchParams.set('ending_soon', 'true');
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);

  const query = searchParams.toString();
  const path = `/api/opportunities${query ? `?${query}` : ''}`;

  const response = await fetchApi<ListResponse<OpportunitySummary>>(path);
  return {
    opportunities: response.data.opportunities || [],
    total: response.data.total,
  };
}

// Helper to safely parse opportunity data from API
function parseOpportunityData(data: OpportunityDetail): OpportunityDetail {
  // Parse photos if it's a JSON string (database returns it as string)
  if (typeof data.photos === 'string') {
    try {
      data.photos = JSON.parse(data.photos);
    } catch {
      data.photos = [];
    }
  }

  // Ensure photos is always an array
  if (!Array.isArray(data.photos)) {
    data.photos = [];
  }

  // Ensure alerts is always an array
  if (!Array.isArray(data.alerts)) {
    data.alerts = [];
  }

  // Ensure actions is always an array
  if (!Array.isArray(data.actions)) {
    data.actions = [];
  }

  return data;
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const response = await fetchApi<ApiResponse<OpportunityDetail>>(
    `/api/opportunities/${encodeURIComponent(id)}`
  );
  return parseOpportunityData(response.data);
}

export interface UpdateOpportunityParams {
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

export async function updateOpportunity(
  id: string,
  params: UpdateOpportunityParams
): Promise<OpportunityDetail> {
  const response = await fetchApi<ApiResponse<OpportunityDetail>>(
    `/api/opportunities/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  );
  return parseOpportunityData(response.data);
}

export interface BatchOperationParams {
  opportunity_ids: string[];
  action: 'reject' | 'archive';
  rejection_reason?: RejectionReason;
  rejection_note?: string;
}

export async function batchOperation(
  params: BatchOperationParams
): Promise<{ processed: number; failed: number }> {
  const response = await fetchApi<ApiResponse<{ processed: number; failed: number }>>(
    '/api/opportunities/batch',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  return response.data;
}

export async function dismissAlert(
  opportunityId: string,
  alertKey: string
): Promise<void> {
  await fetchApi(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/alerts/dismiss`,
    {
      method: 'POST',
      body: JSON.stringify({ alert_key: alertKey }),
    }
  );
}

export async function createNote(
  opportunityId: string,
  note: string
): Promise<void> {
  await fetchApi(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/actions`,
    {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'note',
        payload: { note },
      }),
    }
  );
}

// =============================================================================
// STATS
// =============================================================================

export async function getStats(): Promise<DashboardStats> {
  const response = await fetchApi<ApiResponse<DashboardStats>>(
    '/api/opportunities/stats'
  );
  return response.data;
}

// =============================================================================
// ATTENTION REQUIRED
// =============================================================================

export type ReasonChip = 'DECISION_STALE' | 'ENDING_SOON' | 'STALE' | 'ANALYSIS_STALE';

export interface AttentionItem {
  id: string;
  title: string;
  source: string;
  status: OpportunityStatus;
  max_bid_locked: number | null;
  auction_ends_at: string | null;
  status_changed_at: string;
  last_operator_review_at: string | null;
  is_stale: boolean;
  is_decision_stale: boolean;
  is_ending_soon: boolean;
  is_analysis_stale: boolean;
  reason_tags: ReasonChip[];
}

export interface AttentionRequiredResponse {
  items: AttentionItem[];
  total_count: number;
}

/**
 * Fetch items that need operator attention, sorted by priority.
 */
export async function getAttentionRequired(limit = 10): Promise<AttentionRequiredResponse> {
  const response = await fetchApi<AttentionRequiredResponse>(
    `/api/dashboard/attention?limit=${limit}`
  );
  return response;
}

/**
 * Touch an opportunity to record operator review (updates last_operator_review_at).
 */
export async function touchOpportunity(opportunityId: string): Promise<void> {
  await fetchApi(`/api/opportunities/${encodeURIComponent(opportunityId)}/touch`, {
    method: 'POST',
  });
}

// =============================================================================
// SOURCES
// =============================================================================

export async function listSources(): Promise<Source[]> {
  const response = await fetchApi<ApiResponse<{ sources: Source[] }>>(
    '/api/sources'
  );
  return response.data.sources;
}

export async function updateSource(
  id: string,
  params: Partial<Pick<Source, 'enabled' | 'display_name' | 'default_buyer_premium_pct' | 'default_pickup_days'>>
): Promise<Source> {
  const response = await fetchApi<ApiResponse<Source>>(
    `/api/sources/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  );
  return response.data;
}

// =============================================================================
// INGEST
// =============================================================================

export async function syncFromScout(): Promise<{ created: number; updated: number; skipped: number }> {
  const response = await fetchApi<ApiResponse<{ created: number; updated: number; skipped: number }>>(
    '/api/ingest/sync',
    { method: 'POST' }
  );
  return response.data;
}

// =============================================================================
// TRIGGERS
// =============================================================================

export async function triggerScoutRun(): Promise<{ triggered: boolean; message: string }> {
  const response = await fetchApi<ApiResponse<{ triggered: boolean; message: string }>>(
    '/api/scout/run',
    { method: 'POST' }
  );
  return response.data;
}

// =============================================================================
// ANALYSIS
// =============================================================================

// Full analysis result from dfg-analyst worker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AnalysisResult {
  // The full formatted report in markdown
  report_markdown: string;
  report_summary?: string;

  // Report fields - the primary source for display values (matches old frontend)
  report_fields: {
    verdict: 'BUY' | 'WATCH' | 'PASS';
    max_bid_mid: number;
    max_bid_worst: number;
    max_bid_best: number;
    retail_est: number;
    wholesale_floor?: number;
    expected_profit: number;
    expected_margin: number;
    confidence: number; // 1-5
  };

  // Asset summary
  asset_summary?: {
    title: string;
    source: string;
    current_bid: number;
  };

  // Condition assessment
  condition?: {
    overall_grade: string;
    summary: string;
    red_flags: Array<{
      category: string;
      severity: string;
      description: string;
    }>;
    tires?: {
      condition: string;
      estimated_remaining_life: string;
    };
  };

  // Calculation spine - additional detail (optional, report_fields is primary)
  calculation_spine?: {
    acquisition_cost: number;
    repair_cost: number;
    total_investment: number;
    resale_low: number;
    resale_high: number;
    profit_at_low: number;
    profit_at_high: number;
    max_bid: number;
    margin_percent: number;
  };

  // Bid readiness assessment
  bid_readiness?: {
    status: 'BID-READY' | 'NOT BID-READY' | 'DO NOT BID';
    gates_passed: string[];
    gates_failed: string[];
    blocking_issues: string[];
  };

  // Gated economics
  gated_economics?: {
    verified_scenario: {
      max_bid: number;
      profit: number;
      margin: number;
    };
    haircutted_scenario: {
      max_bid: number;
      profit: number;
      margin: number;
      haircut_reason: string;
    };
  };

  // Unified confidence
  unified_confidence?: {
    overall: number;
    grade: string;
    penalties: Array<{
      reason: string;
      impact: number;
    }>;
  };

  // Condition score
  condition_score?: {
    score: number;
    grade: string;
    coverage_penalty: number;
  };

  // Risk assessment
  risk_assessment?: {
    observed_risks: Array<{ description: string; severity: string }>;
    unverified_risks: Array<{ description: string; severity: string }>;
    info_gaps: string[];
    overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };

  // Risk banner
  risk_banner?: {
    headline: string;
    color: string;
  };

  // Pre-bid checklist
  pre_bid_checklist?: Array<{
    item: string;
    status: 'PASS' | 'FAIL' | 'UNKNOWN';
    note?: string;
  }>;

  // Investor lens
  investor_lens?: {
    verdict: string;
    verdict_reasoning: string;
    max_bid: number | null;
    profit_at_max: number | null;
    repair_estimate: number | null;
    phoenix_resale_range: {
      low: number;
      high: number;
    };
    repair_plan: Array<{
      item: string;
      cost: number;
      priority: string;
    }>;
    deal_killers: string[];
    inspection_priorities: string[];
  };

  // Buyer lens
  buyer_lens?: {
    fair_market_value_low: number;
    fair_market_value_high: number;
    buyer_appeal_score: number;
    target_buyer_profile: string;
  };

  // Justifications
  investor_lens_justification?: string;
  buyer_lens_justification?: string;

  // Arbitrage opportunity
  arbitrage?: {
    perception_gap: number;
    buyer_sees_value: number;
    investor_total_cost: number;
  };

  // Execution playbook
  execution_playbook?: {
    next_steps: string[];
    inspection_checklist: string[];
    exit_strategy: string;
  };

  // Market demand
  market_demand?: {
    level: string;
    reasoning: string;
  };

  // Metadata
  metadata?: {
    analysis_duration_ms: number;
    total_tokens: number;
    model_versions: {
      condition: string;
      reasoning: string;
    };
  };
}

export async function analyzeOpportunity(
  opportunity: OpportunityDetail,
  operatorInputs?: OperatorInputs | null
): Promise<AnalysisResult> {
  // Build the ListingData payload for the analyst
  const listingData = {
    source: opportunity.source,
    listing_url: opportunity.source_url,
    lot_id: opportunity.source_lot_id,
    category_id: opportunity.category_id,
    title: opportunity.title,
    description: opportunity.description || '',
    photos: opportunity.photos || [],
    current_bid: opportunity.current_bid || 0,
    buy_now_price: opportunity.buy_now_price,
    location: {
      city: opportunity.location?.split(',')[0]?.trim() || 'Unknown',
      state: opportunity.location?.split(',')[1]?.trim() || 'Unknown',
      distance_miles: opportunity.distance_miles,
    },
    ends_at: opportunity.auction_ends_at,
    fee_schedule: opportunity.source_defaults ? {
      buyer_premium: opportunity.source_defaults.buyer_premium_pct / 100,
      sales_tax_percent: 0.0825, // Default AZ sales tax
    } : undefined,
    // Sprint 1.5: Include operator inputs for the analyst
    operator_inputs: operatorInputs ? {
      title_status: operatorInputs.title?.titleStatus?.value,
      title_in_hand: operatorInputs.title?.titleInHand?.value,
      lien_status: operatorInputs.title?.lienStatus?.value,
      vin: operatorInputs.title?.vin?.value,
      odometer_miles: operatorInputs.title?.odometerMiles?.value,
      // Include verification levels so analyst knows confidence
      title_status_verified: operatorInputs.title?.titleStatus?.verificationLevel !== 'unverified',
      odometer_verified: operatorInputs.title?.odometerMiles?.verificationLevel !== 'unverified',
    } : undefined,
  };

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(listingData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Analysis failed: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// SPRINT 1.5 - OPERATOR INPUTS & ANALYSIS RETENTION
// =============================================================================

export interface AnalysisRunSummary {
  id: string;
  createdAt: string;
  recommendation: 'BID' | 'WATCH' | 'PASS' | 'NEEDS_INFO';
  gatesSummary: string;
  allCriticalPassed: boolean;
}

export interface OpportunityWithAnalysis extends OpportunityDetail {
  operatorInputs?: OperatorInputs | null;
  gates?: ComputedGates | null;
  currentAnalysisRun?: AnalysisRunSummary | null;
  inputsChangedSinceAnalysis?: boolean;
}

/**
 * Update operator inputs for an opportunity
 */
export async function updateOperatorInputs(
  opportunityId: string,
  inputs: OperatorInputs
): Promise<OpportunityWithAnalysis> {
  const response = await fetchApi<ApiResponse<OpportunityWithAnalysis>>(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/inputs`,
    {
      method: 'PATCH',
      body: JSON.stringify(inputs),
    }
  );
  return parseOpportunityData(response.data) as OpportunityWithAnalysis;
}

/**
 * Trigger a new analysis run for an opportunity
 */
export async function triggerAnalysis(
  opportunityId: string
): Promise<{ analysisRun: AnalysisRunSummary; opportunity: OpportunityWithAnalysis }> {
  const response = await fetchApi<ApiResponse<{
    analysisRun: AnalysisRunSummary;
    opportunity: OpportunityWithAnalysis;
  }>>(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/analyze`,
    {
      method: 'POST',
    }
  );
  return {
    analysisRun: response.data.analysisRun,
    opportunity: parseOpportunityData(response.data.opportunity) as OpportunityWithAnalysis,
  };
}

/**
 * Check if an opportunity's analysis is stale
 */
export function checkStaleness(opportunity: OpportunityWithAnalysis): {
  isStale: boolean;
  reasons: StalenessReason[];
} {
  const reasons: StalenessReason[] = [];

  // If no analysis run exists, not stale (just needs initial analysis)
  if (!opportunity.currentAnalysisRun) {
    return { isStale: false, reasons: [] };
  }

  // If inputs changed since analysis, it's stale
  if (opportunity.inputsChangedSinceAnalysis) {
    reasons.push({
      type: 'operator_input_changed',
      field: 'inputs',
      from: null,
      to: 'updated',
    });
  }

  return {
    isStale: reasons.length > 0,
    reasons,
  };
}

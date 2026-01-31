/**
 * Opportunities route handlers.
 * Handles CRUD operations for opportunities with state machine enforcement.
 */

import type { Env } from '../core/env';
import type {
  OpportunityRow,
  OpportunityStatus,
  UpdateOpportunityRequest,
  BatchRequest,
  OperatorInputs,
  AnalysisRunRow,
  ListingFacts,
} from '../core/types';
import { canTransition } from '../core/types';
import { computeGates, checkHardGateFailures, formatAutoRejectMessage } from '../domain/gates';
import { computeListingSnapshotHash, checkStaleness, type AnalysisRunSnapshot } from '../domain/staleness';
import {
  json,
  jsonError,
  ErrorCodes,
  parseJsonBody,
  getQueryParam,
  getQueryParamInt,
  getQueryParamBool,
} from '../core/http';
import {
  generateId,
  nowISO,
  hoursSince,
  subtractHours,
  isFuture,
  parseJsonSafe,
} from '../lib/utils';
import { computeAlertsForOpportunity } from './alerts';

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

/**
 * Error thrown when the analyst worker fails to process a request.
 * Used to distinguish analyst-specific failures from other errors.
 */
class AnalystWorkerError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'AnalystWorkerError';
  }
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function handleOpportunities(
  request: Request,
  env: Env,
  url: URL,
  path: string,
  method: string
): Promise<Response> {
  // GET /api/opportunities/stats
  if (path === '/api/opportunities/stats' && method === 'GET') {
    return getStats(env);
  }

  // POST /api/opportunities/batch
  if (path === '/api/opportunities/batch' && method === 'POST') {
    return batchOperation(request, env);
  }

  // GET /api/opportunities
  if (path === '/api/opportunities' && method === 'GET') {
    return listOpportunities(env, url);
  }

  // Routes with :id parameter
  const idMatch = path.match(/^\/api\/opportunities\/([^/]+)$/);
  if (idMatch) {
    const id = decodeURIComponent(idMatch[1]);

    if (method === 'GET') {
      return getOpportunity(env, id);
    }
    if (method === 'PATCH') {
      return updateOpportunity(request, env, id);
    }
  }

  // POST /api/opportunities/:id/actions
  const actionsMatch = path.match(/^\/api\/opportunities\/([^/]+)\/actions$/);
  if (actionsMatch && method === 'POST') {
    const id = decodeURIComponent(actionsMatch[1]);
    return createAction(request, env, id);
  }

  // PATCH /api/opportunities/:id/inputs - Update operator inputs
  const inputsMatch = path.match(/^\/api\/opportunities\/([^/]+)\/inputs$/);
  if (inputsMatch && method === 'PATCH') {
    const id = decodeURIComponent(inputsMatch[1]);
    return updateOperatorInputs(request, env, id);
  }

  // POST /api/opportunities/:id/analyze - Create new analysis run
  const analyzeMatch = path.match(/^\/api\/opportunities\/([^/]+)\/analyze$/);
  if (analyzeMatch && method === 'POST') {
    const id = decodeURIComponent(analyzeMatch[1]);
    return analyzeOpportunity(request, env, id);
  }

  return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404);
}

// =============================================================================
// LIST OPPORTUNITIES
// =============================================================================

async function listOpportunities(env: Env, url: URL): Promise<Response> {
  const status = getQueryParam(url, 'status');
  const endingWithin = getQueryParam(url, 'ending_within');
  const scoreBand = getQueryParam(url, 'score_band');
  const categoryId = getQueryParam(url, 'category_id');
  // Note: has_active_alert filter is TODO for v2
  const needsAttention = getQueryParamBool(url, 'needs_attention');
  const staleQualifying = getQueryParamBool(url, 'stale_qualifying');
  // Sprint N+1: Combined attention filter (matches dashboard Attention Required)
  const attention = getQueryParamBool(url, 'attention');
  // Sprint N+1: New staleness filters
  const stale = getQueryParamBool(url, 'stale');
  const analysisStale = getQueryParamBool(url, 'analysis_stale');
  const decisionStale = getQueryParamBool(url, 'decision_stale');
  const endingSoon = getQueryParamBool(url, 'ending_soon');
  // Sprint N+3: Strike Zone filter (high-value inbox items ready for action)
  const strikeZone = getQueryParamBool(url, 'strike_zone');
  // Sprint N+3: Verification Needed filter (opportunities with open critical gates)
  const verificationNeeded = getQueryParamBool(url, 'verification_needed');
  // Sprint N+4: New today filter (#71)
  const newToday = getQueryParamBool(url, 'new_today');
  const limit = Math.min(getQueryParamInt(url, 'limit', 50), 100);
  const offset = getQueryParamInt(url, 'offset', 0);
  const sort = getQueryParam(url, 'sort') || 'auction_ends_at';
  const order = getQueryParam(url, 'order') || 'asc';

  // Staleness thresholds (matching dashboard/attention endpoint)
  const STALE_THRESHOLD_DAYS = 3;
  const ANALYSIS_STALE_DAYS = 7;

  let query = `
    SELECT
      id, source, source_lot_id, status, category_id, title,
      current_bid, auction_ends_at, buy_box_score, distance_miles,
      primary_image_url, unknown_count, status_changed_at, watch_fired_at,
      watch_cycle, last_operator_review_at, last_analyzed_at,

      -- Compute staleness flags
      CASE WHEN status NOT IN ('rejected', 'archived', 'won', 'lost')
           AND julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > ?
        THEN 1 ELSE 0 END as is_stale,

      CASE WHEN status IN ('bid', 'watch')
           AND auction_ends_at IS NOT NULL
           AND julianday(auction_ends_at) - julianday('now') <= 1
           AND julianday(auction_ends_at) - julianday('now') > 0
        THEN 1 ELSE 0 END as is_decision_stale,

      CASE WHEN auction_ends_at IS NOT NULL
           AND julianday(auction_ends_at) - julianday('now') <= 2
           AND julianday(auction_ends_at) - julianday('now') > 0
        THEN 1 ELSE 0 END as is_ending_soon,

      CASE WHEN status NOT IN ('rejected', 'archived', 'won', 'lost')
           AND last_analyzed_at IS NOT NULL
           AND julianday('now') - julianday(last_analyzed_at) > ?
        THEN 1 ELSE 0 END as is_analysis_stale,

      -- Compute stale_days for display
      CASE WHEN status NOT IN ('rejected', 'archived', 'won', 'lost')
        THEN CAST(julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) AS INTEGER)
        ELSE 0 END as stale_days

    FROM opportunities
    WHERE 1=1
  `;
  const params: (string | number)[] = [STALE_THRESHOLD_DAYS, ANALYSIS_STALE_DAYS];

  // Status filter (comma-separated)
  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    const placeholders = statuses.map(() => '?').join(', ');
    query += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  // Ending within filter (#99: parameterized)
  if (endingWithin) {
    const hoursMap: Record<string, number> = { '24h': 24, '48h': 48, '7d': 168 };
    const hours = hoursMap[endingWithin];
    if (hours) {
      query += ` AND auction_ends_at IS NOT NULL`;
      query += ` AND datetime(auction_ends_at) > datetime('now')`;
      query += ` AND julianday(auction_ends_at) - julianday('now') <= ?`;
      params.push(hours / 24); // Convert hours to days for julianday comparison
    }
  }

  // Score band filter
  if (scoreBand) {
    if (scoreBand === 'high') {
      query += ` AND buy_box_score >= 70`;
    } else if (scoreBand === 'medium') {
      query += ` AND buy_box_score >= 40 AND buy_box_score < 70`;
    } else if (scoreBand === 'low') {
      query += ` AND buy_box_score < 40`;
    }
  }

  // Category filter
  if (categoryId) {
    query += ` AND category_id = ?`;
    params.push(categoryId);
  }

  // Stale qualifying filter
  if (staleQualifying === true) {
    query += ` AND status = 'qualifying'`;
    query += ` AND datetime(status_changed_at) < datetime('now', '-24 hours')`;
  }

  // Needs attention filter (watch fired OR stale qualifying)
  if (needsAttention === true) {
    query += ` AND (
      (status = 'watch' AND watch_fired_at IS NOT NULL)
      OR (status = 'qualifying' AND datetime(status_changed_at) < datetime('now', '-24 hours'))
    )`;
  }

  // TODO: has_active_alert filter requires checking dismissals - implement in v2

  // Sprint N+1: Staleness filters (#99: parameterized)
  if (stale === true) {
    query += ` AND status NOT IN ('rejected', 'archived', 'won', 'lost')`;
    query += ` AND julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > ?`;
    params.push(STALE_THRESHOLD_DAYS);
  }

  if (analysisStale === true) {
    query += ` AND status NOT IN ('rejected', 'archived', 'won', 'lost')`;
    // Include items never analyzed OR analyzed more than ANALYSIS_STALE_DAYS ago (#76 fix, #99: parameterized)
    query += ` AND (last_analyzed_at IS NULL OR julianday('now') - julianday(last_analyzed_at) > ?)`;
    params.push(ANALYSIS_STALE_DAYS);
  }

  if (decisionStale === true) {
    query += ` AND status IN ('bid', 'watch')`;
    query += ` AND auction_ends_at IS NOT NULL`;
    query += ` AND julianday(auction_ends_at) - julianday('now') <= 1`;
    query += ` AND julianday(auction_ends_at) - julianday('now') > 0`;
  }

  if (endingSoon === true) {
    query += ` AND auction_ends_at IS NOT NULL`;
    query += ` AND julianday(auction_ends_at) - julianday('now') <= 2`;
    query += ` AND julianday(auction_ends_at) - julianday('now') > 0`;
  }

  // Combined attention filter (matches dashboard /api/dashboard/attention logic)
  // Returns all items needing operator attention: stale, decision stale, ending soon, or analysis stale
  // (#99: parameterized)
  if (attention === true) {
    query += ` AND status NOT IN ('rejected', 'archived', 'won', 'lost')`;
    query += ` AND (
      -- Stale: no activity for STALE_THRESHOLD_DAYS
      julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > ?
      -- Decision stale: bid/watch ending within 24h without recent review
      OR (status IN ('bid', 'watch')
          AND auction_ends_at IS NOT NULL
          AND julianday(auction_ends_at) - julianday('now') <= 1
          AND julianday(auction_ends_at) - julianday('now') > 0)
      -- Ending soon: any auction ending within 48h
      OR (auction_ends_at IS NOT NULL
          AND julianday(auction_ends_at) - julianday('now') <= 2
          AND julianday(auction_ends_at) - julianday('now') > 0)
      -- Analysis stale: needs re-analysis
      OR (last_analyzed_at IS NOT NULL
          AND julianday('now') - julianday(last_analyzed_at) > ?)
    )`;
    params.push(STALE_THRESHOLD_DAYS, ANALYSIS_STALE_DAYS);
  }

  // Strike Zone filter: High-value inbox items ready for immediate action
  // Criteria: inbox/qualifying, high score (70+), analyzed, ending soon OR fresh
  if (strikeZone === true) {
    query += ` AND status IN ('inbox', 'qualifying')`;
    query += ` AND buy_box_score >= 70`;
    query += ` AND last_analyzed_at IS NOT NULL`;
    query += ` AND (
      -- Ending within 48 hours
      (auction_ends_at IS NOT NULL
       AND datetime(auction_ends_at) > datetime('now')
       AND datetime(auction_ends_at) <= datetime('now', '+48 hours'))
      -- OR created within last 12 hours (fresh opportunity)
      OR datetime(created_at) > datetime('now', '-12 hours')
    )`;
  }

  // Verification Needed filter: Opportunities with open critical gates needing operator input
  // These are analyzed opportunities where critical gates are still blocking bid action
  if (verificationNeeded === true) {
    query += ` AND status IN ('inbox', 'qualifying', 'watch', 'inspect')`;
    query += ` AND last_analyzed_at IS NOT NULL`;
    // Check for missing or incomplete operator inputs on critical gates
    // We look for opportunities that have been analyzed but still have:
    // - No operator_inputs_json OR
    // - Missing title status verification OR
    // - Missing title in hand verification OR
    // - Missing lien status verification OR
    // - Missing odometer verification
    query += ` AND (
      operator_inputs_json IS NULL
      OR json_extract(operator_inputs_json, '$.title.titleStatus.value') IS NULL
      OR json_extract(operator_inputs_json, '$.title.titleStatus.verificationLevel') = 'unverified'
      OR json_extract(operator_inputs_json, '$.title.titleInHand.value') IS NULL
      OR json_extract(operator_inputs_json, '$.title.titleInHand.verificationLevel') = 'unverified'
      OR json_extract(operator_inputs_json, '$.title.lienStatus.value') IS NULL
      OR json_extract(operator_inputs_json, '$.title.lienStatus.verificationLevel') = 'unverified'
      OR json_extract(operator_inputs_json, '$.title.odometerMiles.value') IS NULL
      OR json_extract(operator_inputs_json, '$.title.odometerMiles.verificationLevel') = 'unverified'
    )`;
  }

  // Sprint N+4: New today filter - created within last 24 hours (#71)
  if (newToday === true) {
    query += ` AND datetime(created_at) > datetime('now', '-24 hours')`;
  }

  // Sorting
  const allowedSorts = ['auction_ends_at', 'buy_box_score', 'created_at', 'updated_at', 'status_changed_at'];
  const sortField = allowedSorts.includes(sort) ? sort : 'auction_ends_at';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  // Handle NULL auction_ends_at (put at end for ASC, start for DESC)
  if (sortField === 'auction_ends_at') {
    query += ` ORDER BY CASE WHEN auction_ends_at IS NULL THEN 1 ELSE 0 END, ${sortField} ${sortOrder}`;
  } else {
    query += ` ORDER BY ${sortField} ${sortOrder}`;
  }

  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  // Execute query
  const result = await env.DB.prepare(query).bind(...params).all();

  // Get total count (without pagination)
  let countQuery = `SELECT COUNT(*) as count FROM opportunities WHERE 1=1`;
  const countParams: (string | number)[] = [];

  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    const placeholders = statuses.map(() => '?').join(', ');
    countQuery += ` AND status IN (${placeholders})`;
    countParams.push(...statuses);
  }
  if (categoryId) {
    countQuery += ` AND category_id = ?`;
    countParams.push(categoryId);
  }
  if (staleQualifying === true) {
    countQuery += ` AND status = 'qualifying'`;
    countQuery += ` AND datetime(status_changed_at) < datetime('now', '-24 hours')`;
  }
  if (needsAttention === true) {
    countQuery += ` AND (
      (status = 'watch' AND watch_fired_at IS NOT NULL)
      OR (status = 'qualifying' AND datetime(status_changed_at) < datetime('now', '-24 hours'))
    )`;
  }

  // Sprint N+1: Staleness filters for count query (#99: parameterized)
  if (stale === true) {
    countQuery += ` AND status NOT IN ('rejected', 'archived', 'won', 'lost')`;
    countQuery += ` AND julianday('now') - julianday(COALESCE(last_operator_review_at, status_changed_at)) > ?`;
    countParams.push(STALE_THRESHOLD_DAYS);
  }
  if (analysisStale === true) {
    countQuery += ` AND status NOT IN ('rejected', 'archived', 'won', 'lost')`;
    // Include items never analyzed OR analyzed more than ANALYSIS_STALE_DAYS ago (#76 fix, #99: parameterized)
    countQuery += ` AND (last_analyzed_at IS NULL OR julianday('now') - julianday(last_analyzed_at) > ?)`;
    countParams.push(ANALYSIS_STALE_DAYS);
  }
  if (decisionStale === true) {
    countQuery += ` AND status IN ('bid', 'watch')`;
    countQuery += ` AND auction_ends_at IS NOT NULL`;
    countQuery += ` AND julianday(auction_ends_at) - julianday('now') <= 1`;
    countQuery += ` AND julianday(auction_ends_at) - julianday('now') > 0`;
  }
  if (endingSoon === true) {
    countQuery += ` AND auction_ends_at IS NOT NULL`;
    countQuery += ` AND julianday(auction_ends_at) - julianday('now') <= 2`;
    countQuery += ` AND julianday(auction_ends_at) - julianday('now') > 0`;
  }
  // Sprint N+4: New today filter for count query (#71)
  if (newToday === true) {
    countQuery += ` AND datetime(created_at) > datetime('now', '-24 hours')`;
  }

  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
  const total = (countResult as { count: number } | null)?.count || 0;

  // Transform rows - include computed staleness fields
  interface OpportunityRowWithStaleness extends OpportunityRow {
    is_stale: number;
    is_decision_stale: number;
    is_ending_soon: number;
    is_analysis_stale: number;
    stale_days: number;
  }

  const opportunities = (result.results || []).map((row) => {
    const r = row as unknown as OpportunityRowWithStaleness;
    return {
      id: r.id,
      source: r.source,
      source_lot_id: r.source_lot_id,
      status: r.status,
      category_id: r.category_id,
      title: r.title,
      current_bid: r.current_bid,
      auction_ends_at: r.auction_ends_at,
      buy_box_score: r.buy_box_score,
      distance_miles: r.distance_miles,
      primary_image_url: r.primary_image_url,
      unknown_count: r.unknown_count,
      status_changed_at: r.status_changed_at,
      watch_fired_at: r.watch_fired_at,
      // TODO: Compute has_active_alert based on dismissals
      has_active_alert: r.watch_fired_at !== null,
      // Sprint N+1: Staleness fields
      is_stale: r.is_stale === 1,
      is_decision_stale: r.is_decision_stale === 1,
      is_ending_soon: r.is_ending_soon === 1,
      is_analysis_stale: r.is_analysis_stale === 1,
      stale_days: r.stale_days || 0,
    };
  });

  return json({
    data: { opportunities, total },
    meta: { limit, offset },
  });
}

// =============================================================================
// GET SINGLE OPPORTUNITY
// =============================================================================

async function getOpportunity(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(`
    SELECT * FROM opportunities WHERE id = ?
  `).bind(id).first() as OpportunityRow | null;

  if (!row) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  // Get source defaults
  const source = await env.DB.prepare(`
    SELECT * FROM sources WHERE id = ?
  `).bind(row.source).first();

  // Get actions history
  const actionsResult = await env.DB.prepare(`
    SELECT * FROM operator_actions
    WHERE opportunity_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(id).all();

  const actions = (actionsResult.results || []).map((a: Record<string, unknown>) => ({
    id: a.id,
    action_type: a.action_type,
    from_status: a.from_status,
    to_status: a.to_status,
    alert_key: a.alert_key,
    payload: parseJsonSafe(a.payload as string),
    created_at: a.created_at,
  }));

  // Compute alerts for this opportunity
  const alerts = await computeAlertsForOpportunity(env, row);

  // Sprint 1.5: Parse operator inputs
  const operatorInputs = parseJsonSafe<OperatorInputs>(row.operator_inputs_json);

  // Sprint 1.5: Get current analysis run
  let currentAnalysisRun = null;
  if (row.current_analysis_run_id) {
    const analysisRow = await env.DB.prepare(`
      SELECT * FROM analysis_runs WHERE id = ?
    `).bind(row.current_analysis_run_id).first() as AnalysisRunRow | null;

    if (analysisRow) {
      currentAnalysisRun = {
        id: analysisRow.id,
        opportunityId: analysisRow.opportunity_id,
        createdAt: analysisRow.created_at,
        listingSnapshotHash: analysisRow.listing_snapshot_hash,
        recommendation: analysisRow.recommendation,
        derived: parseJsonSafe(analysisRow.derived_json),
        gates: parseJsonSafe(analysisRow.gates_json),
        modelMeta: analysisRow.calc_version ? {
          calcVersion: analysisRow.calc_version,
          gatesVersion: analysisRow.gates_version,
        } : null,
        // Sprint N+3 (#54): Include persisted AI analysis
        aiAnalysis: parseJsonSafe(analysisRow.ai_analysis_json),
      };
    }
  }

  // Sprint 1.5: Compute current listing facts for gates
  const listingFacts: ListingFacts = {
    currentBid: row.current_bid ?? undefined,
    endTime: row.auction_ends_at ?? undefined,
    photoCount: (parseJsonSafe<string[]>(row.photos) || []).length,
  };

  // Sprint 1.5: Compute live gates from current data
  const computedGates = computeGates(listingFacts, operatorInputs);

  // Sprint 1.5: Check staleness if we have an analysis run
  let stalenessCheck = null;
  if (currentAnalysisRun) {
    const snapshot: AnalysisRunSnapshot = {
      listingSnapshotHash: currentAnalysisRun.listingSnapshotHash,
      assumptionsJson: '{}', // TODO: Get from analysis run
      operatorInputsJson: row.operator_inputs_json,
      listing: {
        currentBid: row.current_bid ?? undefined,
        endTime: row.auction_ends_at ?? undefined,
        photoCount: listingFacts.photoCount,
      },
    };
    stalenessCheck = checkStaleness(
      listingFacts,
      operatorInputs,
      { version: '1.0' }, // TODO: Get current assumptions version
      snapshot
    );
  }

  // Build response
  const opportunity = {
    id: row.id,
    source: row.source,
    source_lot_id: row.source_lot_id,
    source_url: row.source_url,
    listing_id: row.listing_id,
    status: row.status,
    status_changed_at: row.status_changed_at,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    location: row.location,
    distance_miles: row.distance_miles,
    current_bid: row.current_bid,
    buy_now_price: row.buy_now_price,
    reserve_status: row.reserve_status,
    estimated_fees: row.estimated_fees,
    auction_ends_at: row.auction_ends_at,
    pickup_deadline: row.pickup_deadline,
    buy_box_score: row.buy_box_score,
    score_breakdown: parseJsonSafe(row.score_breakdown),
    unknown_count: row.unknown_count,
    max_bid_low: row.max_bid_low,
    max_bid_high: row.max_bid_high,
    analysis_summary: row.analysis_summary,
    last_analyzed_at: row.last_analyzed_at,
    observed_facts: parseJsonSafe(row.observed_facts) || { universal: {}, category: {} },
    watch_cycle: row.watch_cycle,
    watch_until: row.watch_until,
    watch_trigger: row.watch_trigger,
    watch_threshold: parseJsonSafe(row.watch_threshold),
    watch_fired_at: row.watch_fired_at,
    max_bid_locked: row.max_bid_locked,
    bid_strategy: row.bid_strategy,
    final_price: row.final_price,
    outcome_notes: row.outcome_notes,
    r2_snapshot_key: row.r2_snapshot_key,
    photos: parseJsonSafe(row.photos) || [],
    primary_image_url: row.primary_image_url,
    rejection_reason: row.rejection_reason,
    rejection_note: row.rejection_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_defaults: source
      ? {
          buyer_premium_pct: (source as { default_buyer_premium_pct: number }).default_buyer_premium_pct,
          pickup_days: (source as { default_pickup_days: number }).default_pickup_days,
        }
      : null,
    actions,
    alerts,
    // Sprint 1.5 additions
    operatorInputs,
    currentAnalysisRun,
    gates: computedGates,
    inputsChangedSinceAnalysis: stalenessCheck?.isStale ?? false,
    analysisStaleReason: stalenessCheck?.isStale
      ? stalenessCheck.reasons.map(r => r.type).join(', ')
      : null,
  };

  return json({ data: opportunity });
}

// =============================================================================
// UPDATE OPPORTUNITY (State Machine)
// =============================================================================

async function updateOpportunity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await parseJsonBody<UpdateOpportunityRequest>(request);
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400);
  }

  // Get current opportunity
  const current = await env.DB.prepare(`
    SELECT * FROM opportunities WHERE id = ?
  `).bind(id).first() as OpportunityRow | null;

  if (!current) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  const now = nowISO();
  const updates: string[] = [];
  const updateParams: (string | number | null)[] = [];

  // Status transition
  if (body.status && body.status !== current.status) {
    const from = current.status;
    const to = body.status;

    // Validate transition
    if (!canTransition(from, to)) {
      return jsonError(
        ErrorCodes.INVALID_TRANSITION,
        `Cannot transition from ${from} to ${to}`,
        400
      );
    }

    // Validate required fields for specific transitions
    const validation = validateTransition(to, body, current);
    if (!validation.valid) {
      return jsonError(ErrorCodes.MISSING_FIELD, validation.error!, 400);
    }

    updates.push('status = ?', 'status_changed_at = ?');
    updateParams.push(to, now);

    // Handle rejection
    if (to === 'rejected') {
      updates.push('rejection_reason = ?', 'rejection_note = ?');
      updateParams.push(body.rejection_reason!, body.rejection_note || null);

      // Create tuning event
      await createTuningEvent(env, {
        event_type: 'rejection',
        opportunity_id: id,
        source: current.source,
        category_id: current.category_id,
        signal_data: {
          reason_code: body.rejection_reason,
          note: body.rejection_note,
          buy_box_score: current.buy_box_score,
          time_in_pipeline_hours: hoursSince(current.created_at),
        },
      });
    }

    // Handle watch
    if (to === 'watch') {
      const watchResult = handleWatchTransition(body, current);
      if (!watchResult.valid) {
        return jsonError(ErrorCodes.INVALID_VALUE, watchResult.error!, 400);
      }
      updates.push(
        'watch_cycle = watch_cycle + 1',
        'watch_until = ?',
        'watch_trigger = ?',
        'watch_threshold = ?',
        'watch_fired_at = NULL'
      );
      updateParams.push(
        watchResult.watchUntil!,
        body.watch_trigger!,
        JSON.stringify(body.watch_threshold!)
      );
    }

    // Handle bid
    if (to === 'bid') {
      updates.push('max_bid_locked = ?', 'bid_strategy = ?');
      updateParams.push(body.max_bid_locked!, body.bid_strategy || 'manual');
    }

    // Handle won
    if (to === 'won') {
      updates.push('final_price = ?');
      updateParams.push(body.final_price!);
    }

    // Clear watch fields when leaving watch
    if (from === 'watch' && to !== 'watch') {
      updates.push(
        'watch_until = NULL',
        'watch_trigger = NULL',
        'watch_threshold = NULL',
        'watch_fired_at = NULL'
      );
    }

    // Log status change action
    await createOperatorAction(env, {
      opportunity_id: id,
      action_type: 'status_change',
      from_status: from,
      to_status: to,
      payload: body,
    });
  }

  // Update observed_facts (can happen without status change)
  if (body.observed_facts) {
    updates.push('observed_facts = ?');
    updateParams.push(JSON.stringify(body.observed_facts));

    await createOperatorAction(env, {
      opportunity_id: id,
      action_type: 'augmentation',
      payload: body.observed_facts,
    });
  }

  // Update outcome_notes
  if (body.outcome_notes !== undefined) {
    updates.push('outcome_notes = ?');
    updateParams.push(body.outcome_notes);
  }

  // Apply updates
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    updateParams.push(now);
    updateParams.push(id);

    const setClause = updates.join(', ');
    await env.DB.prepare(`
      UPDATE opportunities SET ${setClause} WHERE id = ?
    `).bind(...updateParams).run();
  }

  // Return updated opportunity
  return getOpportunity(env, id);
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

function validateTransition(
  to: OpportunityStatus,
  data: UpdateOpportunityRequest,
  _current: OpportunityRow
): { valid: boolean; error?: string } {
  switch (to) {
    case 'rejected':
      if (!data.rejection_reason) {
        return { valid: false, error: 'rejection_reason required' };
      }
      if (data.rejection_reason === 'other' && !data.rejection_note) {
        return { valid: false, error: 'rejection_note required when reason is other' };
      }
      return { valid: true };

    case 'watch':
      if (!data.watch_trigger) {
        return { valid: false, error: 'watch_trigger required' };
      }
      if (!data.watch_threshold) {
        return { valid: false, error: 'watch_threshold required' };
      }
      return { valid: true };

    case 'bid':
      if (!data.max_bid_locked || data.max_bid_locked <= 0) {
        return { valid: false, error: 'max_bid_locked must be positive' };
      }
      return { valid: true };

    case 'won':
      if (!data.final_price || data.final_price <= 0) {
        return { valid: false, error: 'final_price must be positive' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

function handleWatchTransition(
  data: UpdateOpportunityRequest,
  current: OpportunityRow
): { valid: boolean; error?: string; watchUntil?: string } {
  const trigger = data.watch_trigger!;
  const threshold = data.watch_threshold!;

  // Validate and compute watch_until
  switch (trigger) {
    case 'ending_soon': {
      if (!current.auction_ends_at) {
        return { valid: false, error: 'ending_soon requires auction end time' };
      }
      if (!isFuture(current.auction_ends_at)) {
        return { valid: false, error: 'auction has already ended' };
      }
      const hours = threshold.hours_before ?? 4;
      const watchUntil = subtractHours(current.auction_ends_at, hours);
      if (!isFuture(watchUntil)) {
        return {
          valid: false,
          error: `auction ends in less than ${hours} hours; use a shorter window`,
        };
      }
      return { valid: true, watchUntil };
    }

    case 'time_window':
    case 'manual': {
      if (!threshold.remind_at) {
        return { valid: false, error: 'remind_at is required' };
      }
      if (!isFuture(threshold.remind_at)) {
        return { valid: false, error: 'remind_at must be in the future' };
      }
      return { valid: true, watchUntil: threshold.remind_at };
    }

    default:
      return { valid: false, error: `invalid watch_trigger: ${trigger}` };
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

async function batchOperation(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<BatchRequest>(request);
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400);
  }

  const { opportunity_ids, action, rejection_reason, rejection_note } = body;

  // Validate batch size
  if (!opportunity_ids || opportunity_ids.length === 0) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'opportunity_ids required', 400);
  }
  if (opportunity_ids.length > 50) {
    return jsonError(ErrorCodes.BATCH_TOO_LARGE, 'Max 50 items per batch', 400);
  }

  // Validate rejection params
  if (action === 'reject') {
    if (!rejection_reason) {
      return jsonError(ErrorCodes.MISSING_FIELD, 'rejection_reason required', 400);
    }
    if (rejection_reason === 'other' && !rejection_note) {
      return jsonError(ErrorCodes.MISSING_FIELD, 'rejection_note required when reason is other', 400);
    }
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  const now = nowISO();
  const targetStatus = action === 'reject' ? 'rejected' : 'archived';

  for (const id of opportunity_ids) {
    try {
      const opp = await env.DB.prepare(`
        SELECT id, status, source, category_id, buy_box_score, created_at
        FROM opportunities WHERE id = ?
      `).bind(id).first() as OpportunityRow | null;

      if (!opp) {
        results.push({ id, success: false, error: 'NOT_FOUND' });
        continue;
      }

      if (!canTransition(opp.status, targetStatus)) {
        results.push({ id, success: false, error: 'INVALID_TRANSITION' });
        continue;
      }

      if (action === 'reject') {
        await env.DB.prepare(`
          UPDATE opportunities
          SET status = 'rejected',
              rejection_reason = ?,
              rejection_note = ?,
              status_changed_at = ?,
              updated_at = ?
          WHERE id = ?
        `).bind(rejection_reason!, rejection_note || null, now, now, id).run();

        // Create tuning event
        await createTuningEvent(env, {
          event_type: 'rejection',
          opportunity_id: id,
          source: opp.source,
          category_id: opp.category_id,
          signal_data: {
            reason_code: rejection_reason,
            batch: true,
            buy_box_score: opp.buy_box_score,
          },
        });
      } else {
        await env.DB.prepare(`
          UPDATE opportunities
          SET status = 'archived',
              status_changed_at = ?,
              updated_at = ?
          WHERE id = ?
        `).bind(now, now, id).run();
      }

      // Log action
      await createOperatorAction(env, {
        opportunity_id: id,
        action_type: action === 'reject' ? 'batch_reject' : 'batch_archive',
        from_status: opp.status,
        to_status: targetStatus,
        payload: { batch_size: opportunity_ids.length },
      });

      results.push({ id, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ id, success: false, error: message });
    }
  }

  return json({
    data: {
      processed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
  });
}

// =============================================================================
// CREATE ACTION
// =============================================================================

async function createAction(
  request: Request,
  env: Env,
  opportunityId: string
): Promise<Response> {
  const body = await parseJsonBody<{ action_type: string; payload: object }>(request);
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400);
  }

  // Verify opportunity exists
  const opp = await env.DB.prepare(`
    SELECT id FROM opportunities WHERE id = ?
  `).bind(opportunityId).first();

  if (!opp) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  const action = await createOperatorAction(env, {
    opportunity_id: opportunityId,
    action_type: body.action_type as any,
    payload: body.payload,
  });

  return json({ data: action });
}

// =============================================================================
// STATS
// =============================================================================

async function getStats(env: Env): Promise<Response> {
  // Status counts
  const statusResult = await env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM opportunities GROUP BY status
  `).all();

  const byStatus: Record<string, number> = {
    inbox: 0,
    qualifying: 0,
    watch: 0,
    inspect: 0,
    bid: 0,
    won: 0,
    lost: 0,
    rejected: 0,
    archived: 0,
  };

  for (const row of statusResult.results || []) {
    const r = row as { status: string; count: number };
    byStatus[r.status] = r.count;
  }

  // Ending soon counts
  const ending24h = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status IN ('inbox', 'qualifying', 'watch', 'inspect', 'bid')
    AND auction_ends_at IS NOT NULL
    AND datetime(auction_ends_at) > datetime('now')
    AND datetime(auction_ends_at) <= datetime('now', '+24 hours')
  `).first() as { count: number } | null;

  const ending48h = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status IN ('inbox', 'qualifying', 'watch', 'inspect', 'bid')
    AND auction_ends_at IS NOT NULL
    AND datetime(auction_ends_at) > datetime('now')
    AND datetime(auction_ends_at) <= datetime('now', '+48 hours')
  `).first() as { count: number } | null;

  // New today
  const newToday = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE datetime(created_at) > datetime('now', '-24 hours')
  `).first() as { count: number } | null;

  // Stale qualifying
  const staleOver24h = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status = 'qualifying'
    AND datetime(status_changed_at) < datetime('now', '-24 hours')
  `).first() as { count: number } | null;

  const staleOver48h = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status = 'qualifying'
    AND datetime(status_changed_at) < datetime('now', '-48 hours')
  `).first() as { count: number } | null;

  // Watch alerts fired
  const watchFired = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status = 'watch' AND watch_fired_at IS NOT NULL
  `).first() as { count: number } | null;

  // Needs attention (watch fired + stale qualifying)
  const needsAttention = (watchFired?.count || 0) + (staleOver24h?.count || 0);

  // Strike Zone: High-value inbox items ready for immediate action
  // Criteria: inbox/qualifying, high score (70+), analyzed, ending soon OR fresh
  const strikeZone = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status IN ('inbox', 'qualifying')
      AND buy_box_score >= 70
      AND last_analyzed_at IS NOT NULL
      AND (
        -- Ending within 48 hours
        (auction_ends_at IS NOT NULL
         AND datetime(auction_ends_at) > datetime('now')
         AND datetime(auction_ends_at) <= datetime('now', '+48 hours'))
        -- OR created within last 12 hours (fresh opportunity)
        OR datetime(created_at) > datetime('now', '-12 hours')
      )
  `).first() as { count: number } | null;

  // Verification Needed: Opportunities with open critical gates needing operator input
  const verificationNeeded = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM opportunities
    WHERE status IN ('inbox', 'qualifying', 'watch', 'inspect')
      AND last_analyzed_at IS NOT NULL
      AND (
        operator_inputs_json IS NULL
        OR json_extract(operator_inputs_json, '$.title.titleStatus.value') IS NULL
        OR json_extract(operator_inputs_json, '$.title.titleStatus.verificationLevel') = 'unverified'
        OR json_extract(operator_inputs_json, '$.title.titleInHand.value') IS NULL
        OR json_extract(operator_inputs_json, '$.title.titleInHand.verificationLevel') = 'unverified'
        OR json_extract(operator_inputs_json, '$.title.lienStatus.value') IS NULL
        OR json_extract(operator_inputs_json, '$.title.lienStatus.verificationLevel') = 'unverified'
        OR json_extract(operator_inputs_json, '$.title.odometerMiles.value') IS NULL
        OR json_extract(operator_inputs_json, '$.title.odometerMiles.verificationLevel') = 'unverified'
      )
  `).first() as { count: number } | null;

  return json({
    data: {
      by_status: byStatus,
      strike_zone: strikeZone?.count || 0,
      verification_needed: verificationNeeded?.count || 0,
      ending_soon: {
        within_24h: ending24h?.count || 0,
        within_48h: ending48h?.count || 0,
      },
      new_today: newToday?.count || 0,
      stale_qualifying: {
        over_24h: staleOver24h?.count || 0,
        over_48h: staleOver48h?.count || 0,
      },
      watch_alerts_fired: watchFired?.count || 0,
      needs_attention: needsAttention,
      active_alerts: needsAttention, // TODO: Include ending_soon alerts
      last_scout_run: null, // TODO: Get from sources table
      last_ingest: null, // TODO: Track in metadata
    },
    meta: {
      timestamp: nowISO(),
    },
  });
}

// =============================================================================
// HELPER: Create operator action
// =============================================================================

interface CreateActionParams {
  opportunity_id: string;
  action_type: string;
  from_status?: string | null;
  to_status?: string | null;
  alert_key?: string | null;
  payload?: object;
}

async function createOperatorAction(
  env: Env,
  params: CreateActionParams
): Promise<{ id: string; action_type: string; created_at: string }> {
  const id = generateId();
  const now = nowISO();

  await env.DB.prepare(`
    INSERT INTO operator_actions (id, opportunity_id, action_type, from_status, to_status, alert_key, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.opportunity_id,
    params.action_type,
    params.from_status || null,
    params.to_status || null,
    params.alert_key || null,
    params.payload ? JSON.stringify(params.payload) : null,
    now
  ).run();

  return { id, action_type: params.action_type, created_at: now };
}

// =============================================================================
// HELPER: Create tuning event
// =============================================================================

interface CreateTuningEventParams {
  event_type: string;
  opportunity_id?: string | null;
  source?: string | null;
  category_id?: string | null;
  signal_data: object;
}

async function createTuningEvent(
  env: Env,
  params: CreateTuningEventParams
): Promise<void> {
  const id = generateId();
  const now = nowISO();

  await env.DB.prepare(`
    INSERT INTO tuning_events (id, event_type, opportunity_id, source, category_id, signal_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.event_type,
    params.opportunity_id || null,
    params.source || null,
    params.category_id || null,
    JSON.stringify(params.signal_data),
    now
  ).run();
}

// =============================================================================
// SPRINT 1.5: UPDATE OPERATOR INPUTS
// =============================================================================

async function updateOperatorInputs(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await parseJsonBody<OperatorInputs>(request);
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400);
  }

  // Get current opportunity
  const current = await env.DB.prepare(`
    SELECT id, status, operator_inputs_json, current_analysis_run_id FROM opportunities WHERE id = ?
  `).bind(id).first() as Pick<OpportunityRow, 'id' | 'status' | 'operator_inputs_json' | 'current_analysis_run_id'> | null;

  if (!current) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  // Merge with existing inputs (deep merge for title/overrides)
  const existingInputs = parseJsonSafe<OperatorInputs>(current.operator_inputs_json) || {};
  const mergedInputs: OperatorInputs = {
    title: { ...existingInputs.title, ...body.title },
    overrides: { ...existingInputs.overrides, ...body.overrides },
  };

  const now = nowISO();

  // ==========================================================================
  // SPRINT N+3: Check for hard gate failures (auto-rejection)
  // ==========================================================================
  const hardGateFailures = checkHardGateFailures(mergedInputs);
  let autoRejected = false;

  if (hardGateFailures.length > 0) {
    // Only auto-reject if not already in a terminal state
    const terminalStatuses: OpportunityStatus[] = ['won', 'lost', 'rejected', 'archived'];
    if (!terminalStatuses.includes(current.status as OpportunityStatus)) {
      const rejectionNote = formatAutoRejectMessage(hardGateFailures);

      // Update to rejected status with 'other' reason (auto-reject due to hard gate failures)
      await env.DB.prepare(`
        UPDATE opportunities
        SET status = 'rejected',
            status_changed_at = ?,
            rejection_reason = 'other',
            rejection_note = ?,
            operator_inputs_json = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(now, rejectionNote, JSON.stringify(mergedInputs), now, id).run();

      // Log status change action
      await createOperatorAction(env, {
        opportunity_id: id,
        action_type: 'status_change',
        from_status: current.status,
        to_status: 'rejected',
        payload: {
          auto_rejected: true,
          reason: 'hard_gate_failure',
          failures: hardGateFailures,
        },
      });

      // Create tuning event for ML feedback
      await createTuningEvent(env, {
        event_type: 'status_change',
        opportunity_id: id,
        signal_data: {
          from_status: current.status,
          to_status: 'rejected',
          rejection_reason: 'other', // Auto-reject due to hard gate failures
          auto_rejected: true,
          hard_gate_failures: hardGateFailures,
        },
      });

      autoRejected = true;
    }
  }

  // If not auto-rejected, just update operator inputs normally
  if (!autoRejected) {
    await env.DB.prepare(`
      UPDATE opportunities
      SET operator_inputs_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(mergedInputs), now, id).run();
  }

  // Log the augmentation action
  await createOperatorAction(env, {
    opportunity_id: id,
    action_type: 'augmentation',
    payload: { type: 'operator_inputs', inputs: body },
  });

  // Check if inputs changed since last analysis
  let inputsChangedSinceAnalysis = false;
  if (current.current_analysis_run_id) {
    // If there's an existing analysis, inputs have changed
    inputsChangedSinceAnalysis = true;
  }

  return json({
    success: true,
    operatorInputs: mergedInputs,
    inputsChangedSinceAnalysis,
    autoRejected,
    hardGateFailures: autoRejected ? hardGateFailures : undefined,
  });
}

// =============================================================================
// SPRINT 1.5: ANALYZE OPPORTUNITY
// Sprint N+3 (#54): Unified analysis flow - calls dfg-analyst and persists result
// =============================================================================

interface AnalyzeRequest {
  // Optional: pass assumptions to use
  assumptions?: Record<string, unknown>;
  // Optional: skip AI analysis (for quick gate-only refresh)
  skipAiAnalysis?: boolean;
}

// AI Analysis result type (subset of DualLensReport from dfg-analyst)
interface AiAnalysisResult {
  investor_lens?: {
    verdict: string;
    max_bid: number;
    verdict_reasoning: string;
    phoenix_resale_range?: { quick_sale: number; market_rate: number; premium: number };
    repair_plan?: { items: Array<{ item: string; cost: number }>; grand_total: number };
    deal_killers?: string[];
    inspection_priorities?: string[];
  };
  buyer_lens?: {
    perceived_value_range?: { low: number; high: number };
    buyer_confidence?: string;
  };
  condition?: {
    overall_grade?: string;
    assessment_confidence?: string;
    red_flags?: Array<{ category: string; severity: string; description: string }>;
    tires?: { condition: string; estimated_remaining_life: string };
  };
  asset_summary?: {
    title: string;
    source: string;
    current_bid: number;
  };
  next_steps?: {
    if_bidding?: string[];
    if_won?: string[];
    listing_prep?: string[];
  };
  analysis_timestamp?: string;
  total_tokens_used?: number;
}

/**
 * Call dfg-analyst worker for AI analysis
 * @throws {AnalystWorkerError} When the analyst worker fails or times out
 */
async function callAnalystWorker(
  env: Env,
  listingData: Record<string, unknown>
): Promise<AiAnalysisResult> {
  console.log('[callAnalystWorker] Starting AI analysis, ANALYST binding:', !!env.ANALYST, 'ANALYST_URL:', env.ANALYST_URL);

  // Use service binding if available (production), otherwise use URL
  let response: Response;

  // Set up 25 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    if (env.ANALYST) {
      // Service binding - direct worker-to-worker call
      console.log('[callAnalystWorker] Using ANALYST service binding');
      response = await env.ANALYST.fetch('https://dfg-analyst/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData),
        signal: controller.signal,
      });
      console.log('[callAnalystWorker] Service binding response status:', response.status);
    } else if (env.ANALYST_URL) {
      // Fallback to URL (development)
      console.log('[callAnalystWorker] Using ANALYST_URL fallback:', env.ANALYST_URL);
      response = await fetch(`${env.ANALYST_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData),
        signal: controller.signal,
      });
    } else {
      console.log('[callAnalystWorker] No ANALYST binding or ANALYST_URL configured');
      throw new AnalystWorkerError('No ANALYST binding or ANALYST_URL configured');
    }
  } catch (error) {
    if (error instanceof AnalystWorkerError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[callAnalystWorker] Request timed out after 25 seconds');
      throw new AnalystWorkerError('Analyst worker request timed out after 25 seconds');
    }
    console.error('[callAnalystWorker] Failed to call analyst worker:', error);
    throw new AnalystWorkerError(`Failed to call analyst worker: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[callAnalystWorker] Analyst worker error:', response.status, errorText);
    throw new AnalystWorkerError(`Analyst returned ${response.status}: ${errorText}`, response.status);
  }

  const result = await response.json() as AiAnalysisResult;
  console.log('[callAnalystWorker] AI analysis successful, verdict:', result?.investor_lens?.verdict);
  return result;
}

async function analyzeOpportunity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await parseJsonBody<AnalyzeRequest>(request);

  // Get current opportunity
  const row = await env.DB.prepare(`
    SELECT * FROM opportunities WHERE id = ?
  `).bind(id).first() as OpportunityRow | null;

  if (!row) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  // Capture original updated_at for optimistic locking (#237)
  const originalUpdatedAt = row.updated_at;

  const now = nowISO();
  const analysisRunId = generateId();

  // Parse operator inputs
  const operatorInputs = parseJsonSafe<OperatorInputs>(row.operator_inputs_json);

  // Build listing facts for gate computation
  const photos = parseJsonSafe<string[]>(row.photos) || [];
  const listingFacts: ListingFacts = {
    currentBid: row.current_bid ?? undefined,
    endTime: row.auction_ends_at ?? undefined,
    photoCount: photos.length,
  };

  // Compute listing snapshot hash
  const listingSnapshotHash = computeListingSnapshotHash(listingFacts);

  // Compute gates
  const gates = computeGates(listingFacts, operatorInputs);

  // ==========================================================================
  // Call dfg-analyst for AI analysis (unless skipAiAnalysis is set)
  // ==========================================================================
  let aiAnalysisResult: AiAnalysisResult | null = null;

  if (!body?.skipAiAnalysis) {
    // Build listing data for analyst
    const listingData = {
      source: row.source,
      listing_url: row.source_url,
      lot_id: row.source_lot_id,
      category_id: row.category_id,
      title: row.title,
      description: row.description || '',
      photos: photos,
      current_bid: row.current_bid || 0,
      buy_now_price: row.buy_now_price,
      location: {
        city: row.location?.split(',')[0]?.trim() || 'Unknown',
        state: row.location?.split(',')[1]?.trim() || 'Unknown',
        distance_miles: row.distance_miles,
      },
      ends_at: row.auction_ends_at,
      // Include operator inputs for the analyst
      operator_inputs: operatorInputs ? {
        title_status: operatorInputs.title?.titleStatus?.value,
        title_in_hand: operatorInputs.title?.titleInHand?.value,
        lien_status: operatorInputs.title?.lienStatus?.value,
        vin: operatorInputs.title?.vin?.value,
        odometer_miles: operatorInputs.title?.odometerMiles?.value,
        title_status_verified: operatorInputs.title?.titleStatus?.verificationLevel !== 'unverified',
        odometer_verified: operatorInputs.title?.odometerMiles?.verificationLevel !== 'unverified',
      } : undefined,
    };

    try {
      aiAnalysisResult = await callAnalystWorker(env, listingData);
    } catch (error) {
      if (error instanceof AnalystWorkerError) {
        console.error('[analyzeOpportunity] AI analysis failed:', error.message);
        // Continue without AI analysis - aiAnalysisResult stays null
      } else {
        throw error; // Re-throw unexpected errors
      }
    }
  }

  // ==========================================================================
  // Determine recommendation (prefer AI verdict, fall back to gate-based)
  // ==========================================================================
  let recommendation: 'BID' | 'WATCH' | 'PASS' | 'NEEDS_INFO' = 'NEEDS_INFO';

  if (aiAnalysisResult?.investor_lens?.verdict) {
    // Map AI verdict to our recommendation format
    const aiVerdict = aiAnalysisResult.investor_lens.verdict;
    if (aiVerdict === 'STRONG_BUY' || aiVerdict === 'BUY') {
      recommendation = gates.allCriticalCleared ? 'BID' : 'WATCH';
    } else if (aiVerdict === 'MARGINAL') {
      recommendation = 'WATCH';
    } else if (aiVerdict === 'PASS') {
      recommendation = 'PASS';
    }
  } else {
    // Fall back to gate-based recommendation
    if (gates.allCriticalCleared) {
      recommendation = 'BID';
    } else if (gates.criticalOpen <= 2) {
      recommendation = 'WATCH';
    }
  }

  // Default assumptions (TODO: Get from config/env)
  const assumptions = body?.assumptions || {
    version: '1.0',
    targetRoiPct: 0.20,
    listingFees: 150,
    paymentFeesPct: 0.03,
  };

  // Build derived values (prefer AI values, fall back to existing)
  const derived = {
    maxBidLow: aiAnalysisResult?.investor_lens?.max_bid
      ? Math.round(aiAnalysisResult.investor_lens.max_bid * 0.9)
      : row.max_bid_low,
    maxBidHigh: aiAnalysisResult?.investor_lens?.max_bid || row.max_bid_high,
    totalAllIn: row.current_bid ? row.current_bid * 1.15 : null,
    analysisTimestamp: now,
    // Include key AI-derived values for quick access
    aiVerdict: aiAnalysisResult?.investor_lens?.verdict || null,
    aiMaxBid: aiAnalysisResult?.investor_lens?.max_bid || null,
    repairEstimate: aiAnalysisResult?.investor_lens?.repair_plan?.grand_total || null,
    conditionGrade: aiAnalysisResult?.condition?.overall_grade || null,
  };

  // Build trace
  const trace = {
    gates: gates.gates.map(g => ({
      id: g.id,
      status: g.status,
      clearedBy: g.clearedBy,
    })),
    inputSnapshot: {
      listingFacts,
      operatorInputs,
    },
    assumptions,
    aiAnalysisSuccess: aiAnalysisResult !== null,
  };

  // Insert analysis run and update opportunity atomically using D1 batch
  // This ensures both operations succeed or fail together
  const insertStatement = env.DB.prepare(`
    INSERT INTO analysis_runs (
      id, opportunity_id, created_at,
      listing_snapshot_hash, assumptions_json, operator_inputs_json,
      derived_json, gates_json, recommendation, trace_json,
      calc_version, gates_version, ai_analysis_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    analysisRunId,
    id,
    now,
    listingSnapshotHash,
    JSON.stringify(assumptions),
    row.operator_inputs_json,
    JSON.stringify(derived),
    JSON.stringify(gates),
    recommendation,
    JSON.stringify(trace),
    '1.0', // calc_version
    '1.0', // gates_version
    aiAnalysisResult ? JSON.stringify(aiAnalysisResult) : null,
  );

  // Build UPDATE statement with optimistic lock check (#237)
  // The WHERE clause includes updated_at = originalUpdatedAt to detect concurrent modifications
  // Also update last_operator_review_at to clear STALE badge (analysis = operator review)
  const updateStatement = aiAnalysisResult?.investor_lens?.max_bid
    ? env.DB.prepare(`
        UPDATE opportunities
        SET current_analysis_run_id = ?,
            last_analyzed_at = ?,
            last_operator_review_at = ?,
            updated_at = ?,
            max_bid_low = ?,
            max_bid_high = ?
        WHERE id = ? AND updated_at = ?
      `).bind(
        analysisRunId,
        now,
        now,
        now,
        derived.maxBidLow,
        derived.maxBidHigh,
        id,
        originalUpdatedAt
      )
    : env.DB.prepare(`
        UPDATE opportunities
        SET current_analysis_run_id = ?,
            last_analyzed_at = ?,
            last_operator_review_at = ?,
            updated_at = ?
        WHERE id = ? AND updated_at = ?
      `).bind(analysisRunId, now, now, now, id, originalUpdatedAt);

  // Execute both statements atomically
  try {
    const batchResults = await env.DB.batch([insertStatement, updateStatement]);

    // Verify both operations succeeded
    for (const result of batchResults) {
      if (!result.success) {
        console.error('[analyzeOpportunity] Batch operation failed:', result);
        return jsonError(ErrorCodes.INTERNAL_ERROR, 'Failed to persist analysis', 500);
      }
    }

    // Check if the UPDATE affected any rows (optimistic lock check) (#237)
    const updateResult = batchResults[1];
    if (updateResult.meta.changes === 0) {
      // The opportunity was modified by another request - delete the orphaned analysis_runs record
      await env.DB.prepare(`DELETE FROM analysis_runs WHERE id = ?`).bind(analysisRunId).run();
      return jsonError(
        ErrorCodes.CONFLICT,
        'Opportunity was modified by another request. Please try again.',
        409
      );
    }
  } catch (error) {
    console.error('[analyzeOpportunity] DB error:', error);
    return jsonError(ErrorCodes.INTERNAL_ERROR, 'Database error during analysis', 500);
  }

  // Log the re-analyze action
  await createOperatorAction(env, {
    opportunity_id: id,
    action_type: 're_analyze',
    payload: {
      analysisRunId,
      recommendation,
      aiAnalysisSuccess: aiAnalysisResult !== null,
      aiVerdict: aiAnalysisResult?.investor_lens?.verdict || null,
    },
  });

  // Get previous analysis for delta computation (if exists)
  let delta = null;
  if (row.current_analysis_run_id) {
    const prevRun = await env.DB.prepare(`
      SELECT recommendation, derived_json FROM analysis_runs WHERE id = ?
    `).bind(row.current_analysis_run_id).first() as { recommendation: string; derived_json: string } | null;

    if (prevRun) {
      const prevDerived = parseJsonSafe<typeof derived>(prevRun.derived_json);
      delta = {
        recommendation: {
          from: prevRun.recommendation,
          to: recommendation,
        },
        maxBid: prevDerived?.maxBidHigh !== derived.maxBidHigh ? {
          from: prevDerived?.maxBidHigh,
          to: derived.maxBidHigh,
        } : null,
      };
    }
  }

  return json({
    analysisRun: {
      id: analysisRunId,
      opportunityId: id,
      createdAt: now,
      listingSnapshotHash,
      recommendation,
      derived,
      gates,
      // Include AI analysis for immediate display (also persisted in DB)
      aiAnalysis: aiAnalysisResult,
    },
    delta,
  });
}

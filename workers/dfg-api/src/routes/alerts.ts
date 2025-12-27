/**
 * Alerts computation module.
 * Alerts are computed (not stored) based on opportunity state.
 * Dismissals are stored in operator_actions with action_type='alert_dismiss'.
 * Uses latest-per-key semantics for dismissal lookups.
 */

import type { Env } from '../core/env';
import type { OpportunityRow, Alert, WatchThreshold } from '../core/types';
import { isFuture, hoursSince, parseJsonSafe, generateId, nowISO } from '../lib/utils';
import { json, jsonError, ErrorCodes, parseJsonBody } from '../core/http';

// =============================================================================
// COMPUTE ALERTS FOR OPPORTUNITY
// =============================================================================

/**
 * Compute all active alerts for a given opportunity.
 * An alert is active if:
 *  1. The condition is met (e.g., watch fired, auction ending soon)
 *  2. It has not been dismissed for this specific state (using watch_cycle for watch alerts)
 */
export async function computeAlertsForOpportunity(
  env: Env,
  opp: OpportunityRow
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Get all dismissals for this opportunity from operator_actions
  const dismissedKeys = await getDismissedAlertKeys(env, opp.id);

  // 1. Watch Fired Alert
  if (opp.status === 'watch' && opp.watch_fired_at) {
    const alertKey = `watch_fired:${opp.watch_cycle}`;
    if (!dismissedKeys.has(alertKey)) {
      alerts.push({
        type: 'watch_fired',
        key: alertKey,
        title: 'Watch Triggered',
        message: getWatchFiredMessage(opp),
        severity: 'high',
        created_at: opp.watch_fired_at,
        opportunity_id: opp.id,
      });
    }
  }

  // 2. Auction Ending Soon Alerts
  if (opp.auction_ends_at && isFuture(opp.auction_ends_at)) {
    const hoursRemaining = getHoursUntil(opp.auction_ends_at);
    const activeStatuses = ['inbox', 'qualifying', 'watch', 'inspect', 'bid'];

    if (activeStatuses.includes(opp.status)) {
      // Critical: Ending in < 4 hours
      if (hoursRemaining < 4) {
        const alertKey = `ending_critical:${opp.auction_ends_at}`;
        if (!dismissedKeys.has(alertKey)) {
          alerts.push({
            type: 'ending_soon',
            key: alertKey,
            title: 'Auction Ending Soon',
            message: `Ends in ${formatTimeRemaining(hoursRemaining)}`,
            severity: 'critical',
            created_at: opp.auction_ends_at,
            opportunity_id: opp.id,
            metadata: { hours_remaining: hoursRemaining },
          });
        }
      }
      // High: Ending in < 24 hours
      else if (hoursRemaining < 24) {
        const alertKey = `ending_24h:${opp.auction_ends_at}`;
        if (!dismissedKeys.has(alertKey)) {
          alerts.push({
            type: 'ending_soon',
            key: alertKey,
            title: 'Auction Ending Today',
            message: `Ends in ${formatTimeRemaining(hoursRemaining)}`,
            severity: 'high',
            created_at: opp.auction_ends_at,
            opportunity_id: opp.id,
            metadata: { hours_remaining: hoursRemaining },
          });
        }
      }
      // Medium: Ending in < 48 hours
      else if (hoursRemaining < 48) {
        const alertKey = `ending_48h:${opp.auction_ends_at}`;
        if (!dismissedKeys.has(alertKey)) {
          alerts.push({
            type: 'ending_soon',
            key: alertKey,
            title: 'Auction Ending Tomorrow',
            message: `Ends in ${formatTimeRemaining(hoursRemaining)}`,
            severity: 'medium',
            created_at: opp.auction_ends_at,
            opportunity_id: opp.id,
            metadata: { hours_remaining: hoursRemaining },
          });
        }
      }
    }
  }

  // 3. Stale Qualifying Alert
  if (opp.status === 'qualifying' && opp.status_changed_at) {
    const hoursInQualifying = hoursSince(opp.status_changed_at);

    if (hoursInQualifying > 24) {
      const alertKey = `stale_qualifying:${opp.status_changed_at}`;
      if (!dismissedKeys.has(alertKey)) {
        alerts.push({
          type: 'stale_qualifying',
          key: alertKey,
          title: 'Needs Decision',
          message: `In qualifying for ${Math.round(hoursInQualifying)} hours`,
          severity: hoursInQualifying > 48 ? 'high' : 'medium',
          created_at: opp.status_changed_at,
          opportunity_id: opp.id,
          metadata: { hours_in_qualifying: hoursInQualifying },
        });
      }
    }
  }

  // 4. Price Alert (bid approaching threshold)
  if (opp.status === 'bid' && opp.max_bid_locked && opp.current_bid) {
    const threshold = 0.9; // 90% of max bid
    if (opp.current_bid >= opp.max_bid_locked * threshold) {
      const alertKey = `bid_threshold:${opp.max_bid_locked}`;
      if (!dismissedKeys.has(alertKey)) {
        alerts.push({
          type: 'price_alert',
          key: alertKey,
          title: 'Bid Near Maximum',
          message: `Current bid $${opp.current_bid.toLocaleString()} is ${Math.round((opp.current_bid / opp.max_bid_locked) * 100)}% of your max`,
          severity: 'high',
          created_at: opp.updated_at,
          opportunity_id: opp.id,
          metadata: {
            current_bid: opp.current_bid,
            max_bid: opp.max_bid_locked,
            percentage: Math.round((opp.current_bid / opp.max_bid_locked) * 100),
          },
        });
      }
    }
  }

  // Sort by severity (critical > high > medium > low)
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// =============================================================================
// DISMISS ALERT (via operator_actions)
// =============================================================================

/**
 * Record a dismissal for an alert in operator_actions.
 * Single source of truth - no separate alert_dismissals table.
 */
export async function dismissAlert(
  env: Env,
  opportunityId: string,
  alertKey: string
): Promise<void> {
  const id = generateId();
  const now = nowISO();

  await env.DB.prepare(`
    INSERT INTO operator_actions (id, opportunity_id, action_type, alert_key, created_at)
    VALUES (?, ?, 'alert_dismiss', ?, ?)
  `).bind(id, opportunityId, alertKey, now).run();
}

// =============================================================================
// GET DISMISSED ALERT KEYS
// =============================================================================

/**
 * Get all dismissed alert keys for an opportunity.
 * Uses latest-per-key semantics from operator_actions.
 */
async function getDismissedAlertKeys(env: Env, opportunityId: string): Promise<Set<string>> {
  const result = await env.DB.prepare(`
    SELECT DISTINCT alert_key
    FROM operator_actions
    WHERE opportunity_id = ?
    AND action_type = 'alert_dismiss'
    AND alert_key IS NOT NULL
  `).bind(opportunityId).all();

  const keys = new Set<string>();
  for (const row of result.results || []) {
    const key = (row as Record<string, unknown>).alert_key as string;
    if (key) keys.add(key);
  }
  return keys;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getWatchFiredMessage(opp: OpportunityRow): string {
  const trigger = opp.watch_trigger;
  const threshold = parseJsonSafe(opp.watch_threshold) as WatchThreshold | null;

  switch (trigger) {
    case 'ending_soon':
      return `Auction ending in ${threshold?.hours_before || 4} hours`;
    case 'time_window':
    case 'manual':
      return 'Your watch reminder has triggered';
    default:
      return 'Watch condition met';
  }
}

function getHoursUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, (target - now) / (1000 * 60 * 60));
}

function formatTimeRemaining(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * POST /api/opportunities/:id/alerts/dismiss
 * Dismiss a specific alert for an opportunity.
 */
export async function handleDismissAlert(
  request: Request,
  env: Env,
  opportunityId: string
): Promise<Response> {
  const body = await parseJsonBody<{ alert_key: string }>(request);
  if (!body || !body.alert_key) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'alert_key required', 400);
  }

  // Verify opportunity exists
  const opp = await env.DB.prepare(`
    SELECT id FROM opportunities WHERE id = ?
  `).bind(opportunityId).first();

  if (!opp) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  await dismissAlert(env, opportunityId, body.alert_key);

  return json({ data: { success: true, dismissed: body.alert_key } });
}

/**
 * POST /api/alerts/dismiss
 * Spec-compliant endpoint for dismissing alerts.
 */
export async function handleAlertsDismiss(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<{ opportunity_id: string; alert_key: string }>(request);
  if (!body || !body.opportunity_id || !body.alert_key) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'opportunity_id and alert_key required', 400);
  }

  // Verify opportunity exists
  const opp = await env.DB.prepare(`
    SELECT id FROM opportunities WHERE id = ?
  `).bind(body.opportunity_id).first();

  if (!opp) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  await dismissAlert(env, body.opportunity_id, body.alert_key);

  return json({ data: { success: true, dismissed: body.alert_key } });
}

/**
 * POST /api/alerts/dismiss/batch
 * Spec-compliant endpoint for batch dismissing alerts.
 */
export async function handleAlertsDismissBatch(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<{ dismissals: Array<{ opportunity_id: string; alert_key: string }> }>(request);
  if (!body || !body.dismissals || !Array.isArray(body.dismissals)) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'dismissals array required', 400);
  }

  if (body.dismissals.length > 50) {
    return jsonError(ErrorCodes.BATCH_TOO_LARGE, 'Max 50 dismissals per batch', 400);
  }

  const results: Array<{ opportunity_id: string; alert_key: string; success: boolean; error?: string }> = [];

  for (const dismissal of body.dismissals) {
    if (!dismissal.opportunity_id || !dismissal.alert_key) {
      results.push({
        opportunity_id: dismissal.opportunity_id || '',
        alert_key: dismissal.alert_key || '',
        success: false,
        error: 'Missing opportunity_id or alert_key',
      });
      continue;
    }

    try {
      await dismissAlert(env, dismissal.opportunity_id, dismissal.alert_key);
      results.push({
        opportunity_id: dismissal.opportunity_id,
        alert_key: dismissal.alert_key,
        success: true,
      });
    } catch (error) {
      results.push({
        opportunity_id: dismissal.opportunity_id,
        alert_key: dismissal.alert_key,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

/**
 * Main router for /api/alerts/* endpoints
 */
export async function handleAlerts(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response> {
  // POST /api/alerts/dismiss
  if (path === '/api/alerts/dismiss' && method === 'POST') {
    return handleAlertsDismiss(request, env);
  }

  // POST /api/alerts/dismiss/batch
  if (path === '/api/alerts/dismiss/batch' && method === 'POST') {
    return handleAlertsDismissBatch(request, env);
  }

  return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404);
}

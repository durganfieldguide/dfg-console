/**
 * DFG API Worker
 *
 * Operator console API for processing auction opportunities.
 * Reads from dfg-scout's listings table, manages opportunities lifecycle.
 *
 * @version 1.0.0
 */

import type { Env } from './core/env';
import { json, jsonError, authorize, ErrorCodes } from './core/http';

// Route handlers
import { handleOpportunities } from './routes/opportunities';
import { handleDismissAlert, handleAlerts } from './routes/alerts';
import { handleSources } from './routes/sources';
import { handleIngestRoute } from './routes/ingest';

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, ''); // Remove trailing slash
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check (public)
    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok', service: 'dfg-api', env: env.ENVIRONMENT });
    }

    // All other endpoints require auth
    if (!authorize(request, env)) {
      return jsonError(ErrorCodes.UNAUTHORIZED, 'Missing or invalid authorization', 401);
    }

    try {
      // Route: /api/opportunities/*
      if (path.startsWith('/api/opportunities')) {
        // Special case: dismiss alert
        const dismissMatch = path.match(/^\/api\/opportunities\/([^/]+)\/alerts\/dismiss$/);
        if (dismissMatch && method === 'POST') {
          const opportunityId = decodeURIComponent(dismissMatch[1]);
          return handleDismissAlert(request, env, opportunityId);
        }

        return handleOpportunities(request, env, url, path, method);
      }

      // Route: /api/alerts/* (spec-compliant alert endpoints)
      if (path.startsWith('/api/alerts')) {
        return handleAlerts(request, env, path, method);
      }

      // Route: /api/sources/*
      if (path.startsWith('/api/sources')) {
        return handleSources(request, env, path, method);
      }

      // Route: /api/ingest/*
      if (path.startsWith('/api/ingest')) {
        return handleIngestRoute(request, env, path, method);
      }

      // Route: /api/triggers/check (watch trigger evaluation)
      if (path === '/api/triggers/check' && method === 'POST') {
        return handleWatchTriggers(env);
      }

      // Route: /api/scout/run (trigger scout via Make.com or service binding)
      if (path === '/api/scout/run' && method === 'POST') {
        return handleScoutRun(request, env);
      }

      // 404
      return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404);

    } catch (error) {
      console.error('[dfg-api] Unhandled error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return jsonError(ErrorCodes.INTERNAL_ERROR, message, 500);
    }
  },

  /**
   * Scheduled handler for cron-triggered tasks.
   * Currently runs watch trigger checks every 5 minutes.
   */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(checkWatchTriggersScheduled(env));
  },
};

// =============================================================================
// WATCH TRIGGER EVALUATION
// =============================================================================

/**
 * Check all opportunities in 'watch' status and fire alerts
 * when their watch conditions are met.
 *
 * Uses conditional UPDATE to ensure idempotency - only fires if
 * watch_fired_at is still NULL (prevents duplicate firing from
 * concurrent cron + webhook triggers).
 */
async function handleWatchTriggers(env: Env): Promise<Response> {
  const now = new Date().toISOString();

  // Find all watch opportunities that have passed their watch_until time
  const result = await env.DB.prepare(`
    SELECT id, watch_until, watch_trigger, watch_threshold, watch_cycle
    FROM opportunities
    WHERE status = 'watch'
    AND watch_until IS NOT NULL
    AND watch_fired_at IS NULL
    AND datetime(watch_until) <= datetime(?)
  `).bind(now).all();

  const opportunities = result.results || [];
  let firedCount = 0;

  for (const opp of opportunities) {
    const row = opp as { id: string; watch_until: string };

    // Idempotent update: only fires if watch_fired_at is still NULL
    const updateResult = await env.DB.prepare(`
      UPDATE opportunities
      SET watch_fired_at = ?, updated_at = ?
      WHERE id = ?
      AND watch_fired_at IS NULL
    `).bind(now, now, row.id).run();

    // Only count if we actually updated the row
    if (updateResult.meta?.changes && updateResult.meta.changes > 0) {
      firedCount++;
    }
  }

  return json({
    data: {
      checked: opportunities.length,
      fired: firedCount,
      timestamp: now,
    },
  });
}

// =============================================================================
// SCHEDULED HANDLER (Cron)
// =============================================================================

/**
 * Scheduled handler for automatic watch trigger checking.
 * Runs every 5 minutes in production via cron.
 *
 * Uses conditional UPDATE to ensure idempotency - only fires if
 * watch_fired_at is still NULL (prevents duplicate firing from
 * concurrent cron + webhook triggers).
 */
async function checkWatchTriggersScheduled(env: Env): Promise<void> {
  const now = new Date().toISOString();
  console.log(`[dfg-api] Scheduled watch trigger check at ${now}`);

  // Find all watch opportunities that have passed their watch_until time
  const result = await env.DB.prepare(`
    SELECT id, watch_until, watch_trigger, watch_threshold, watch_cycle
    FROM opportunities
    WHERE status = 'watch'
    AND watch_until IS NOT NULL
    AND watch_fired_at IS NULL
    AND datetime(watch_until) <= datetime(?)
  `).bind(now).all();

  const opportunities = result.results || [];
  let firedCount = 0;

  for (const opp of opportunities) {
    const row = opp as { id: string; watch_until: string };

    // Idempotent update: only fires if watch_fired_at is still NULL
    const updateResult = await env.DB.prepare(`
      UPDATE opportunities
      SET watch_fired_at = ?, updated_at = ?
      WHERE id = ?
      AND watch_fired_at IS NULL
    `).bind(now, now, row.id).run();

    // Only count and log if we actually updated the row
    if (updateResult.meta?.changes && updateResult.meta.changes > 0) {
      firedCount++;
      console.log(`[dfg-api] Watch fired for opportunity: ${row.id}`);
    }
  }

  console.log(`[dfg-api] Watch trigger check complete: ${firedCount} fired out of ${opportunities.length} checked`);
}

// =============================================================================
// SCOUT RUN TRIGGER
// =============================================================================

interface ScoutRunRequest {
  source?: string; // Optional: specific source to run
  dryRun?: boolean;
}

/**
 * Trigger a scout run via Make.com webhook or direct service binding.
 * Supports both Make.com integration and direct worker-to-worker calls.
 */
async function handleScoutRun(request: Request, env: Env): Promise<Response> {
  let body: ScoutRunRequest = {};
  try {
    body = await request.json() as ScoutRunRequest;
  } catch {
    // Empty body is fine
  }

  const { source, dryRun = false } = body;

  // Strategy 1: Direct service binding (worker-to-worker, preferred in production)
  if (env.SCOUT) {
    console.log('[dfg-api] Triggering scout via service binding');
    try {
      const scoutUrl = new URL('https://dfg-scout.internal/ops/run');
      if (dryRun) scoutUrl.searchParams.set('dryRun', 'true');
      if (source) scoutUrl.searchParams.set('source', source);

      const scoutResponse = await env.SCOUT.fetch(scoutUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.OPS_TOKEN}`,
        },
      });

      const result = await scoutResponse.json();

      return json({
        data: {
          triggered: true,
          method: 'service_binding',
          source: source || 'all',
          dryRun,
          result,
        },
      });
    } catch (error) {
      console.error('[dfg-api] Scout service binding failed:', error);
      // Fall through to webhook
    }
  }

  // Strategy 2: Make.com webhook (for external orchestration)
  if (env.MAKE_WEBHOOK_URL) {
    console.log('[dfg-api] Triggering scout via Make.com webhook');
    try {
      const webhookResponse = await fetch(env.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'run_scout',
          source: source || 'all',
          dryRun,
          triggered_at: new Date().toISOString(),
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook returned ${webhookResponse.status}`);
      }

      return json({
        data: {
          triggered: true,
          method: 'make_webhook',
          source: source || 'all',
          dryRun,
          message: 'Scout run triggered via Make.com',
        },
      });
    } catch (error) {
      console.error('[dfg-api] Make.com webhook failed:', error);
      return jsonError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to trigger scout run via Make.com',
        500
      );
    }
  }

  // No trigger method available
  return json({
    data: {
      triggered: false,
      message: 'No scout trigger configured. Set MAKE_WEBHOOK_URL or add SCOUT service binding.',
    },
  });
}

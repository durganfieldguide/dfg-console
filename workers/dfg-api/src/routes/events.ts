/**
 * MVC Events route handlers (#187).
 * Handles event storage and retrieval with idempotency support.
 */

import type { Env } from '../core/env';
import { json, jsonError, ErrorCodes, parseJsonBody, getQueryParam } from '../core/http';
import { generateId, nowISO, parseJsonSafe } from '../lib/utils';
import type { MvcEvent, MvcEventType, MvcEventPayload } from '@dfg/types';

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function handleEvents(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response> {
  // POST /api/events
  if (path === '/api/events' && method === 'POST') {
    return createEvent(request, env);
  }

  // GET /api/events?opportunity_id={id}
  if (path === '/api/events' && method === 'GET') {
    return listEvents(request, env);
  }

  return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404);
}

// =============================================================================
// CREATE EVENT (with idempotency)
// =============================================================================

interface CreateEventRequest {
  opportunity_id: string;
  event_type: MvcEventType;
  payload: MvcEventPayload;
  emitted_at?: string;  // Optional: client can provide timestamp
}

async function createEvent(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<CreateEventRequest>(request);
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400);
  }

  // Validate required fields
  if (!body.opportunity_id) {
    return jsonError(ErrorCodes.MISSING_FIELD, 'opportunity_id required', 400);
  }
  if (!body.event_type) {
    return jsonError(ErrorCodes.MISSING_FIELD, 'event_type required', 400);
  }
  if (!body.payload) {
    return jsonError(ErrorCodes.MISSING_FIELD, 'payload required', 400);
  }

  // Validate event_type
  const validTypes: MvcEventType[] = ['decision_made', 'bid_submitted', 'bid_result', 'sale_result'];
  if (!validTypes.includes(body.event_type)) {
    return jsonError(ErrorCodes.INVALID_VALUE, `Invalid event_type: ${body.event_type}`, 400);
  }

  // Verify opportunity exists
  const opp = await env.DB.prepare(`
    SELECT id FROM opportunities WHERE id = ?
  `).bind(body.opportunity_id).first();

  if (!opp) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Opportunity not found', 404);
  }

  // Get next sequence number for this opportunity (idempotency support)
  const maxSeqResult = await env.DB.prepare(`
    SELECT MAX(sequence_number) as max_seq
    FROM mvc_events
    WHERE opportunity_id = ?
  `).bind(body.opportunity_id).first<{ max_seq: number | null }>();

  const nextSequence = (maxSeqResult?.max_seq ?? 0) + 1;
  const idempotencyKey = `${body.opportunity_id}:${nextSequence}`;

  // Check if event already exists (idempotency)
  const existing = await env.DB.prepare(`
    SELECT id, payload, emitted_at, created_at
    FROM mvc_events
    WHERE idempotency_key = ?
  `).bind(idempotencyKey).first();

  if (existing) {
    // Idempotent: return existing event
    return json({
      data: {
        id: (existing as any).id,
        opportunity_id: body.opportunity_id,
        event_type: body.event_type,
        idempotency_key: idempotencyKey,
        sequence_number: nextSequence,
        payload: parseJsonSafe((existing as any).payload),
        schema_version: '1.0',
        emitted_at: (existing as any).emitted_at,
        created_at: (existing as any).created_at,
        idempotent: true,
      },
    });
  }

  // Create new event
  const now = nowISO();
  const id = generateId();
  const emittedAt = body.emitted_at || now;

  await env.DB.prepare(`
    INSERT INTO mvc_events (
      id, opportunity_id, event_type, idempotency_key,
      sequence_number, payload, schema_version, emitted_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.opportunity_id,
    body.event_type,
    idempotencyKey,
    nextSequence,
    JSON.stringify(body.payload),
    '1.0',
    emittedAt,
    now
  ).run();

  return json({
    data: {
      id,
      opportunity_id: body.opportunity_id,
      event_type: body.event_type,
      idempotency_key: idempotencyKey,
      sequence_number: nextSequence,
      payload: body.payload,
      schema_version: '1.0',
      emitted_at: emittedAt,
      created_at: now,
      idempotent: false,
    },
  }, 201);
}

// =============================================================================
// LIST EVENTS
// =============================================================================

async function listEvents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const opportunityId = getQueryParam(url, 'opportunity_id');

  if (!opportunityId) {
    return jsonError(ErrorCodes.MISSING_FIELD, 'opportunity_id query param required', 400);
  }

  // Fetch events for opportunity
  const result = await env.DB.prepare(`
    SELECT
      id, opportunity_id, event_type, idempotency_key,
      sequence_number, payload, schema_version, emitted_at, created_at
    FROM mvc_events
    WHERE opportunity_id = ?
    ORDER BY sequence_number ASC
  `).bind(opportunityId).all();

  const events = (result.results || []).map((row: any) => ({
    id: row.id,
    opportunity_id: row.opportunity_id,
    event_type: row.event_type,
    idempotency_key: row.idempotency_key,
    sequence_number: row.sequence_number,
    payload: parseJsonSafe(row.payload),
    schema_version: row.schema_version,
    emitted_at: row.emitted_at,
    created_at: row.created_at,
  }));

  return json({
    data: { events },
  });
}

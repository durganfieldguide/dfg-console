/**
 * Sources route handlers.
 * Manages auction source configurations.
 */

import type { Env } from '../core/env'
import { json, jsonError, ErrorCodes, parseJsonBody } from '../core/http'
import { nowISO } from '../lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface SourceRow {
  id: string
  name: string
  display_name: string
  enabled: number | boolean // SQLite stores as 0/1
  base_url: string
  default_buyer_premium_pct: number
  default_pickup_days: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

interface UpdateSourceRequest {
  enabled?: boolean
  display_name?: string
  default_buyer_premium_pct?: number
  default_pickup_days?: number
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function handleSources(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response> {
  // GET /api/sources
  if (path === '/api/sources' && method === 'GET') {
    return listSources(env)
  }

  // Routes with :id parameter
  const idMatch = path.match(/^\/api\/sources\/([^/]+)$/)
  if (idMatch) {
    const id = decodeURIComponent(idMatch[1])

    if (method === 'GET') {
      return getSource(env, id)
    }
    if (method === 'PATCH') {
      return updateSource(request, env, id)
    }
  }

  return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404)
}

// =============================================================================
// LIST SOURCES
// =============================================================================

async function listSources(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `
    SELECT
      id, name, display_name, enabled, base_url,
      default_buyer_premium_pct, default_pickup_days,
      last_run_at, created_at, updated_at
    FROM sources
    ORDER BY name ASC
  `
  ).all()

  const sources = (result.results || []).map((row) => {
    const r = row as unknown as SourceRow
    return {
      id: r.id,
      name: r.name,
      display_name: r.display_name,
      enabled: Boolean(r.enabled),
      base_url: r.base_url,
      default_buyer_premium_pct: r.default_buyer_premium_pct,
      default_pickup_days: r.default_pickup_days,
      last_run_at: r.last_run_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  })

  return json({ data: { sources } })
}

// =============================================================================
// GET SINGLE SOURCE
// =============================================================================

async function getSource(env: Env, id: string): Promise<Response> {
  const row = (await env.DB.prepare(
    `
    SELECT * FROM sources WHERE id = ?
  `
  )
    .bind(id)
    .first()) as unknown as SourceRow | null

  if (!row) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Source not found', 404)
  }

  return json({
    data: {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      enabled: Boolean(row.enabled),
      base_url: row.base_url,
      default_buyer_premium_pct: row.default_buyer_premium_pct,
      default_pickup_days: row.default_pickup_days,
      last_run_at: row.last_run_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  })
}

// =============================================================================
// UPDATE SOURCE
// =============================================================================

async function updateSource(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseJsonBody<UpdateSourceRequest>(request)
  if (!body) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'Invalid JSON body', 400)
  }

  // Verify source exists
  const existing = await env.DB.prepare(
    `
    SELECT id FROM sources WHERE id = ?
  `
  )
    .bind(id)
    .first()

  if (!existing) {
    return jsonError(ErrorCodes.NOT_FOUND, 'Source not found', 404)
  }

  const now = nowISO()
  const updates: string[] = []
  const params: (string | number | boolean)[] = []

  if (body.enabled !== undefined) {
    updates.push('enabled = ?')
    params.push(body.enabled ? 1 : 0)
  }

  if (body.display_name !== undefined) {
    updates.push('display_name = ?')
    params.push(body.display_name)
  }

  if (body.default_buyer_premium_pct !== undefined) {
    if (body.default_buyer_premium_pct < 0 || body.default_buyer_premium_pct > 100) {
      return jsonError(ErrorCodes.INVALID_VALUE, 'buyer_premium_pct must be 0-100', 400)
    }
    updates.push('default_buyer_premium_pct = ?')
    params.push(body.default_buyer_premium_pct)
  }

  if (body.default_pickup_days !== undefined) {
    if (body.default_pickup_days < 0) {
      return jsonError(ErrorCodes.INVALID_VALUE, 'pickup_days must be non-negative', 400)
    }
    updates.push('default_pickup_days = ?')
    params.push(body.default_pickup_days)
  }

  if (updates.length === 0) {
    return getSource(env, id)
  }

  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)

  const setClause = updates.join(', ')
  await env.DB.prepare(
    `
    UPDATE sources SET ${setClause} WHERE id = ?
  `
  )
    .bind(...params)
    .run()

  return getSource(env, id)
}

// =============================================================================
// SEED DEFAULT SOURCES (HELPER)
// =============================================================================

/**
 * Ensure default sources exist in the database.
 * Called during initialization or migration.
 */
export async function seedDefaultSources(env: Env): Promise<void> {
  const now = nowISO()

  const defaultSources = [
    {
      id: 'sierra', // Standardized source name (#100)
      name: 'sierra',
      display_name: 'Sierra Auctions',
      base_url: 'https://sierraauction.com',
      default_buyer_premium_pct: 15,
      default_pickup_days: 5,
    },
    {
      id: 'ironplanet',
      name: 'ironplanet',
      display_name: 'IronPlanet',
      base_url: 'https://www.ironplanet.com',
      default_buyer_premium_pct: 12,
      default_pickup_days: 7,
    },
    {
      id: 'govplanet',
      name: 'govplanet',
      display_name: 'GovPlanet',
      base_url: 'https://www.govplanet.com',
      default_buyer_premium_pct: 10,
      default_pickup_days: 10,
    },
  ]

  for (const source of defaultSources) {
    await env.DB.prepare(
      `
      INSERT INTO sources (id, name, display_name, enabled, base_url, default_buyer_premium_pct, default_pickup_days, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `
    )
      .bind(
        source.id,
        source.name,
        source.display_name,
        source.base_url,
        source.default_buyer_premium_pct,
        source.default_pickup_days,
        now,
        now
      )
      .run()
  }
}

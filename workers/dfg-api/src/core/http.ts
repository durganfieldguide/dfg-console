/**
 * HTTP utilities for dfg-api worker.
 */

import type { Env } from './env'

// =============================================================================
// CORS CONFIGURATION (#98)
// =============================================================================

const ALLOWED_ORIGINS = [
  'https://app.durganfieldguide.com',
  'https://durganfieldguide.com',
  'http://localhost:3000',
]

export function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }
  // Default to prod origin for non-browser requests
  return ALLOWED_ORIGINS[0]
}

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// =============================================================================
// JSON RESPONSE HELPERS
// =============================================================================

// Store request for CORS - uses thread-local pattern
let currentRequest: Request | null = null
export function setCurrentRequest(request: Request) {
  currentRequest = request
}

export function json<T>(data: T, status = 200): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...corsHeaders(currentRequest || new Request('https://app.durganfieldguide.com')),
  }
  return new Response(JSON.stringify(data), { status, headers })
}

export function jsonError(code: string, message: string, status = 400, details?: object): Response {
  return json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    status
  )
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_VALUE: 'INVALID_VALUE',
  BATCH_TOO_LARGE: 'BATCH_TOO_LARGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const

// =============================================================================
// AUTHORIZATION
// =============================================================================

export function authorize(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return false

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) return false

  return token === env.OPS_TOKEN
}

// =============================================================================
// REQUEST PARSING
// =============================================================================

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export function getQueryParam(url: URL, key: string): string | null {
  return url.searchParams.get(key)
}

export function getQueryParamInt(url: URL, key: string, defaultValue: number): number {
  const value = url.searchParams.get(key)
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export function getQueryParamBool(url: URL, key: string): boolean | null {
  const value = url.searchParams.get(key)
  if (value === null) return null
  return value === 'true' || value === '1'
}

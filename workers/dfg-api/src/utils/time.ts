/**
 * Timestamp parsing and formatting utilities.
 * Handles TEXT (ISO string) timestamps from D1 database.
 */

import * as Sentry from '@sentry/cloudflare'

/**
 * Parse a TEXT timestamp (ISO string) to milliseconds since epoch.
 * Returns null for invalid or missing timestamps.
 * Logs a Sentry breadcrumb on parse failure for debugging.
 */
export function parseTimestamp(value: string | null): number | null {
  if (!value || value === '') return null

  const parsed = new Date(value).getTime()
  if (isNaN(parsed)) {
    Sentry.addBreadcrumb({
      category: 'timestamp',
      message: `Invalid timestamp: "${value}"`,
      level: 'warning',
    })
    console.warn(`[parseTimestamp] Invalid timestamp: "${value}"`)
    return null
  }
  return parsed
}

/**
 * Format time remaining until a deadline as a human-readable string.
 * Examples: "Ends in 4h", "Ends in 1d 8h", "Ends in 5 days", "Ended"
 */
export function formatTimeRemaining(endsAt: string | null): string {
  const endsAtMs = parseTimestamp(endsAt)
  if (!endsAtMs) return 'No end date'

  const diffMs = endsAtMs - Date.now()
  if (diffMs <= 0) return 'Ended'

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 24) return `Ends in ${hours}h`
  if (hours < 48) return `Ends in ${Math.floor(hours / 24)}d ${hours % 24}h`
  return `Ends in ${Math.floor(hours / 24)} days`
}

/**
 * Format how long an item has been stale.
 * Examples: "Stale 7 days", "Stale 14 days"
 */
export function formatStaleDuration(statusChangedAt: string): string {
  const changedAtMs = parseTimestamp(statusChangedAt)
  if (!changedAtMs) return 'Stale'

  const diffDays = Math.floor((Date.now() - changedAtMs) / (1000 * 60 * 60 * 24))
  return `Stale ${diffDays} days`
}

/**
 * Check if a timestamp is older than a threshold in days.
 */
export function isOlderThanDays(timestamp: string | null, days: number): boolean {
  const ts = parseTimestamp(timestamp)
  if (!ts) return false

  const thresholdMs = days * 24 * 60 * 60 * 1000
  return Date.now() - ts > thresholdMs
}

/**
 * Check if a timestamp is within a threshold from now.
 */
export function isWithinHours(timestamp: string | null, hours: number): boolean {
  const ts = parseTimestamp(timestamp)
  if (!ts) return false

  const diffMs = ts - Date.now()
  const thresholdMs = hours * 60 * 60 * 1000
  return diffMs > 0 && diffMs <= thresholdMs
}

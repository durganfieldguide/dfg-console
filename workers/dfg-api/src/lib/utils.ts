/**
 * Utility functions for dfg-api.
 */

/**
 * Generate a UUID v4.
 * Uses crypto.randomUUID() which is available in Workers runtime.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp as ISO 8601 UTC string.
 * Always use this for consistency across all timestamp fields.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Calculate hours since a given ISO timestamp.
 */
export function hoursSince(isoTimestamp: string): number {
  const then = Date.parse(isoTimestamp);
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60);
}

/**
 * Check if an ISO timestamp is in the past.
 */
export function isPast(isoTimestamp: string): boolean {
  return Date.parse(isoTimestamp) < Date.now();
}

/**
 * Check if an ISO timestamp is in the future.
 */
export function isFuture(isoTimestamp: string): boolean {
  return Date.parse(isoTimestamp) > Date.now();
}

/**
 * Add hours to a timestamp (DST-safe using epoch milliseconds).
 */
export function addHours(isoTimestamp: string, hours: number): string {
  const ms = Date.parse(isoTimestamp) + hours * 3600_000;
  return new Date(ms).toISOString();
}

/**
 * Subtract hours from a timestamp (DST-safe using epoch milliseconds).
 */
export function subtractHours(isoTimestamp: string, hours: number): string {
  const ms = Date.parse(isoTimestamp) - hours * 3600_000;
  return new Date(ms).toISOString();
}

/**
 * Get current price from opportunity (fallback chain).
 * current_bid → buy_now_price → null
 */
export function getCurrentPrice(
  currentBid: number | null,
  buyNowPrice: number | null
): number | null {
  if (currentBid !== null && currentBid !== undefined) {
    return currentBid;
  }
  if (buyNowPrice !== null && buyNowPrice !== undefined) {
    return buyNowPrice;
  }
  return null;
}

/**
 * Parse JSON safely, returning null on failure.
 */
export function parseJsonSafe<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

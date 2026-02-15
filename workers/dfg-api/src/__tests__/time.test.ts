/**
 * Time Utility Tests
 *
 * Tests for timestamp parsing and formatting utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTimestamp,
  formatTimeRemaining,
  formatStaleDuration,
  isOlderThanDays,
  isWithinHours,
} from '../utils/time'

// Mock Sentry to avoid import issues in tests
vi.mock('@sentry/cloudflare', () => ({
  addBreadcrumb: vi.fn(),
}))

// =============================================================================
// parseTimestamp Tests
// =============================================================================

describe('parseTimestamp', () => {
  it('returns null for null input', () => {
    expect(parseTimestamp(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseTimestamp('')).toBeNull()
  })

  it('parses valid ISO timestamp', () => {
    const isoString = '2025-01-15T12:00:00.000Z'
    const result = parseTimestamp(isoString)
    expect(result).toBe(new Date(isoString).getTime())
  })

  it('returns null for invalid timestamp', () => {
    expect(parseTimestamp('not-a-date')).toBeNull()
  })

  it('handles D1 datetime format', () => {
    // D1 returns timestamps like "2025-01-15 12:00:00"
    const d1Format = '2025-01-15 12:00:00'
    const result = parseTimestamp(d1Format)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
  })
})

// =============================================================================
// formatTimeRemaining Tests
// =============================================================================

describe('formatTimeRemaining', () => {
  beforeEach(() => {
    // Mock Date.now() to a fixed time for predictable tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "No end date" for null', () => {
    expect(formatTimeRemaining(null)).toBe('No end date')
  })

  it('returns "Ended" for past dates', () => {
    expect(formatTimeRemaining('2025-01-14T12:00:00.000Z')).toBe('Ended')
  })

  it('formats hours correctly for <24h', () => {
    // 4 hours from now
    expect(formatTimeRemaining('2025-01-15T16:00:00.000Z')).toBe('Ends in 4h')
  })

  it('formats days and hours for 24-48h', () => {
    // 32 hours from now (1 day + 8 hours)
    expect(formatTimeRemaining('2025-01-16T20:00:00.000Z')).toBe('Ends in 1d 8h')
  })

  it('formats days for >48h', () => {
    // 5 days from now
    expect(formatTimeRemaining('2025-01-20T12:00:00.000Z')).toBe('Ends in 5 days')
  })
})

// =============================================================================
// formatStaleDuration Tests
// =============================================================================

describe('formatStaleDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Stale" for invalid timestamp', () => {
    expect(formatStaleDuration('invalid')).toBe('Stale')
  })

  it('formats correct number of stale days', () => {
    // 7 days ago
    expect(formatStaleDuration('2025-01-08T12:00:00.000Z')).toBe('Stale 7 days')
  })

  it('returns 0 days for recent timestamps', () => {
    // Same day
    expect(formatStaleDuration('2025-01-15T10:00:00.000Z')).toBe('Stale 0 days')
  })
})

// =============================================================================
// isOlderThanDays Tests
// =============================================================================

describe('isOlderThanDays', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for null timestamp', () => {
    expect(isOlderThanDays(null, 7)).toBe(false)
  })

  it('returns true for timestamp older than threshold', () => {
    // 10 days ago, threshold is 7 days
    expect(isOlderThanDays('2025-01-05T12:00:00.000Z', 7)).toBe(true)
  })

  it('returns false for timestamp newer than threshold', () => {
    // 5 days ago, threshold is 7 days
    expect(isOlderThanDays('2025-01-10T12:00:00.000Z', 7)).toBe(false)
  })

  it('returns false for timestamp exactly at threshold', () => {
    // Exactly 7 days ago - should not be "older than" 7 days
    expect(isOlderThanDays('2025-01-08T12:00:00.000Z', 7)).toBe(false)
  })
})

// =============================================================================
// isWithinHours Tests
// =============================================================================

describe('isWithinHours', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for null timestamp', () => {
    expect(isWithinHours(null, 48)).toBe(false)
  })

  it('returns false for past timestamps', () => {
    expect(isWithinHours('2025-01-14T12:00:00.000Z', 48)).toBe(false)
  })

  it('returns true for timestamp within window', () => {
    // 24 hours from now, window is 48 hours
    expect(isWithinHours('2025-01-16T12:00:00.000Z', 48)).toBe(true)
  })

  it('returns false for timestamp beyond window', () => {
    // 72 hours from now, window is 48 hours
    expect(isWithinHours('2025-01-18T12:00:00.000Z', 48)).toBe(false)
  })

  it('returns true for timestamp at edge of window', () => {
    // Almost exactly 48 hours (47.9)
    expect(isWithinHours('2025-01-17T11:54:00.000Z', 48)).toBe(true)
  })
})

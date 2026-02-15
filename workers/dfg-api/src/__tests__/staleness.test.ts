/**
 * Staleness Logic Tests
 *
 * Tests for the staleness computation utilities used by the Attention Required feature.
 * These tests verify the reason chip logic, priority ordering, and flag computation.
 */

import { describe, it, expect } from 'vitest'
import {
  computeReasonTags,
  CHIP_PRIORITY,
  isTerminalStatus,
  TERMINAL_STATUSES,
  DEFAULT_STALE_THRESHOLD_DAYS,
  DEFAULT_ENDING_SOON_HOURS,
  type StalenessFlags,
} from '../utils/staleness'

// =============================================================================
// computeReasonTags Tests (8 test cases)
// =============================================================================

describe('computeReasonTags', () => {
  it('returns empty array when no flags are set', () => {
    const flags: StalenessFlags = {
      is_stale: false,
      is_decision_stale: false,
      is_ending_soon: false,
      is_analysis_stale: false,
    }
    expect(computeReasonTags(flags)).toEqual([])
  })

  it('returns STALE when only is_stale is true', () => {
    const flags: StalenessFlags = {
      is_stale: true,
      is_decision_stale: false,
      is_ending_soon: false,
      is_analysis_stale: false,
    }
    expect(computeReasonTags(flags)).toEqual(['STALE'])
  })

  it('returns DECISION_STALE when only is_decision_stale is true', () => {
    const flags: StalenessFlags = {
      is_stale: false,
      is_decision_stale: true,
      is_ending_soon: false,
      is_analysis_stale: false,
    }
    expect(computeReasonTags(flags)).toEqual(['DECISION_STALE'])
  })

  it('returns ENDING_SOON when only is_ending_soon is true', () => {
    const flags: StalenessFlags = {
      is_stale: false,
      is_decision_stale: false,
      is_ending_soon: true,
      is_analysis_stale: false,
    }
    expect(computeReasonTags(flags)).toEqual(['ENDING_SOON'])
  })

  it('returns ANALYSIS_STALE when only is_analysis_stale is true', () => {
    const flags: StalenessFlags = {
      is_stale: false,
      is_decision_stale: false,
      is_ending_soon: false,
      is_analysis_stale: true,
    }
    expect(computeReasonTags(flags)).toEqual(['ANALYSIS_STALE'])
  })

  it('excludes ENDING_SOON when DECISION_STALE is present', () => {
    const flags: StalenessFlags = {
      is_stale: false,
      is_decision_stale: true,
      is_ending_soon: true, // Should be excluded
      is_analysis_stale: false,
    }
    const result = computeReasonTags(flags)
    expect(result).toContain('DECISION_STALE')
    expect(result).not.toContain('ENDING_SOON')
  })

  it('returns multiple tags sorted by priority', () => {
    const flags: StalenessFlags = {
      is_stale: true,
      is_decision_stale: true,
      is_ending_soon: false,
      is_analysis_stale: true,
    }
    const result = computeReasonTags(flags)
    expect(result).toEqual(['DECISION_STALE', 'STALE', 'ANALYSIS_STALE'])
  })

  it('returns all applicable tags with correct priority order', () => {
    // When all flags are true, ENDING_SOON should be excluded (DECISION_STALE present)
    const flags: StalenessFlags = {
      is_stale: true,
      is_decision_stale: true,
      is_ending_soon: true,
      is_analysis_stale: true,
    }
    const result = computeReasonTags(flags)
    expect(result).toEqual(['DECISION_STALE', 'STALE', 'ANALYSIS_STALE'])
  })
})

// =============================================================================
// CHIP_PRIORITY Tests (2 test cases)
// =============================================================================

describe('CHIP_PRIORITY', () => {
  it('has DECISION_STALE as highest priority (lowest number)', () => {
    const priorities = Object.values(CHIP_PRIORITY)
    const minPriority = Math.min(...priorities)
    expect(CHIP_PRIORITY.DECISION_STALE).toBe(minPriority)
  })

  it('maintains correct priority order', () => {
    expect(CHIP_PRIORITY.DECISION_STALE).toBeLessThan(CHIP_PRIORITY.ENDING_SOON)
    expect(CHIP_PRIORITY.ENDING_SOON).toBeLessThan(CHIP_PRIORITY.STALE)
    expect(CHIP_PRIORITY.STALE).toBeLessThan(CHIP_PRIORITY.ANALYSIS_STALE)
  })
})

// =============================================================================
// Terminal Status Tests (4 test cases)
// =============================================================================

describe('isTerminalStatus', () => {
  it('returns true for rejected status', () => {
    expect(isTerminalStatus('rejected')).toBe(true)
  })

  it('returns true for all terminal statuses', () => {
    TERMINAL_STATUSES.forEach((status) => {
      expect(isTerminalStatus(status)).toBe(true)
    })
  })

  it('returns false for inbox status', () => {
    expect(isTerminalStatus('inbox')).toBe(false)
  })

  it('returns false for non-terminal workflow statuses', () => {
    const nonTerminalStatuses = ['inbox', 'qualifying', 'watch', 'inspect', 'bid']
    nonTerminalStatuses.forEach((status) => {
      expect(isTerminalStatus(status)).toBe(false)
    })
  })
})

// =============================================================================
// Default Constants Tests (3 test cases)
// =============================================================================

describe('Default Constants', () => {
  it('has sensible default stale threshold', () => {
    expect(DEFAULT_STALE_THRESHOLD_DAYS).toBe(7)
    expect(DEFAULT_STALE_THRESHOLD_DAYS).toBeGreaterThan(0)
    expect(DEFAULT_STALE_THRESHOLD_DAYS).toBeLessThanOrEqual(30)
  })

  it('has sensible ending soon threshold', () => {
    expect(DEFAULT_ENDING_SOON_HOURS).toBe(48)
    expect(DEFAULT_ENDING_SOON_HOURS).toBeGreaterThan(0)
  })

  it('TERMINAL_STATUSES includes expected values', () => {
    expect(TERMINAL_STATUSES).toContain('rejected')
    expect(TERMINAL_STATUSES).toContain('archived')
    expect(TERMINAL_STATUSES).toContain('won')
    expect(TERMINAL_STATUSES).toContain('lost')
    expect(TERMINAL_STATUSES.length).toBe(4)
  })
})

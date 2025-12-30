/**
 * Staleness computation utilities.
 * Reason chips and priority ordering for operator attention.
 */

export type ReasonChip = 'DECISION_STALE' | 'ENDING_SOON' | 'STALE' | 'ANALYSIS_STALE';

/**
 * Priority order for reason chips.
 * Lower number = higher priority (shows first in lists).
 */
export const CHIP_PRIORITY: Record<ReasonChip, number> = {
  DECISION_STALE: 1,
  ENDING_SOON: 2,
  STALE: 3,
  ANALYSIS_STALE: 4,
};

/**
 * Staleness flags computed by SQL and enriched in response.
 */
export interface StalenessFlags {
  is_stale: boolean;
  is_decision_stale: boolean;
  is_ending_soon: boolean;
  is_analysis_stale: boolean;
}

/**
 * Compute reason tags from staleness flags.
 * Returns chips sorted by priority (highest priority first).
 *
 * Note: ENDING_SOON is excluded when DECISION_STALE is present
 * to avoid redundant chips (decision stale implies ending soon).
 */
export function computeReasonTags(opp: StalenessFlags): ReasonChip[] {
  const tags: ReasonChip[] = [];

  if (opp.is_decision_stale) tags.push('DECISION_STALE');
  if (opp.is_ending_soon && !opp.is_decision_stale) tags.push('ENDING_SOON');
  if (opp.is_stale) tags.push('STALE');
  if (opp.is_analysis_stale) tags.push('ANALYSIS_STALE');

  return tags.sort((a, b) => CHIP_PRIORITY[a] - CHIP_PRIORITY[b]);
}

/**
 * Terminal statuses that are excluded from staleness computation.
 * Items in these statuses don't need operator attention.
 */
export const TERMINAL_STATUSES = ['rejected', 'archived', 'won', 'lost'] as const;

/**
 * Check if a status is terminal (doesn't need attention).
 */
export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Default staleness thresholds (can be overridden via env vars).
 */
export const DEFAULT_STALE_THRESHOLD_DAYS = 7;
export const DEFAULT_ANALYSIS_STALE_THRESHOLD_DAYS = 7;
export const DEFAULT_REVIEW_WINDOW_HOURS = 24;
export const DEFAULT_ENDING_SOON_HOURS = 48;

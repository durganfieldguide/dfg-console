/**
 * DFG App - Staleness Detection
 *
 * Determines if the current analysis is stale by comparing current state
 * vs. values frozen in the analysis_run snapshot.
 *
 * Location: src/domain/staleness.ts
 */

import type {
  ListingFacts,
  OperatorInputs,
  StalenessCheck,
  StalenessReason,
} from '../core/types';

// =============================================================================
// Types
// =============================================================================

export interface Assumptions {
  version: string;
  [key: string]: unknown;
}

export interface AnalysisRunSnapshot {
  listingSnapshotHash: string;
  assumptionsJson: string;
  operatorInputsJson: string | null;
  // Parsed snapshot values for comparison
  listing?: {
    currentBid?: number;
    endTime?: string;
    photoCount?: number;
  };
  assumptions?: Assumptions;
  operatorInputs?: OperatorInputs | null;
}

// =============================================================================
// Hash Computation
// =============================================================================

/**
 * Compute a hash of listing fields that affect analysis.
 * Used to quickly detect listing changes.
 */
export function computeListingSnapshotHash(listing: ListingFacts): string {
  const relevantFields = {
    currentBid: listing.currentBid,
    endTime: listing.endTime,
    photoCount: listing.photoCount,
    vin: listing.vin,
    odometerMiles: listing.odometerMiles,
    titleStatus: listing.titleStatus,
  };
  // Simple hash: JSON stringify and create a basic checksum
  const json = JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
  return simpleHash(json);
}

/**
 * Simple hash function for comparison purposes.
 * Not cryptographically secure - just for change detection.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

// =============================================================================
// Staleness Check
// =============================================================================

/**
 * Check if the current state differs from the analysis snapshot.
 *
 * Returns a StalenessCheck with reasons for any detected changes.
 */
export function checkStaleness(
  currentListing: ListingFacts,
  currentInputs: OperatorInputs | null,
  currentAssumptions: Assumptions,
  analysisSnapshot: AnalysisRunSnapshot
): StalenessCheck {
  const reasons: StalenessReason[] = [];

  // Parse snapshot data
  const snapshotListing = analysisSnapshot.listing;
  const snapshotAssumptions = analysisSnapshot.assumptions ||
    (analysisSnapshot.assumptionsJson ? JSON.parse(analysisSnapshot.assumptionsJson) : null);
  const snapshotInputs = analysisSnapshot.operatorInputs ||
    (analysisSnapshot.operatorInputsJson ? JSON.parse(analysisSnapshot.operatorInputsJson) : null);

  // 1. Check listing bid changes
  if (snapshotListing?.currentBid !== undefined &&
      currentListing.currentBid !== undefined &&
      snapshotListing.currentBid !== currentListing.currentBid) {
    reasons.push({
      type: 'listing_bid_changed',
      from: snapshotListing.currentBid,
      to: currentListing.currentBid,
    });
  }

  // 2. Check listing end time changes
  if (snapshotListing?.endTime !== undefined &&
      currentListing.endTime !== undefined &&
      snapshotListing.endTime !== currentListing.endTime) {
    reasons.push({
      type: 'listing_end_time_changed',
      from: snapshotListing.endTime,
      to: currentListing.endTime,
    });
  }

  // 3. Check photo count changes
  if (snapshotListing?.photoCount !== undefined &&
      currentListing.photoCount !== undefined &&
      snapshotListing.photoCount !== currentListing.photoCount) {
    reasons.push({
      type: 'listing_photos_changed',
      from: snapshotListing.photoCount,
      to: currentListing.photoCount,
    });
  }

  // 4. Check assumptions version changes
  if (snapshotAssumptions?.version !== undefined &&
      currentAssumptions.version !== snapshotAssumptions.version) {
    reasons.push({
      type: 'assumptions_version_changed',
      from: snapshotAssumptions.version,
      to: currentAssumptions.version,
    });
  }

  // 5. Check operator input changes (title fields)
  const titleFields: (keyof NonNullable<OperatorInputs['title']>)[] = [
    'titleStatus',
    'titleInHand',
    'lienStatus',
    'vin',
    'odometerMiles',
  ];

  for (const field of titleFields) {
    const currentValue = currentInputs?.title?.[field]?.value;
    const snapshotValue = snapshotInputs?.title?.[field]?.value;

    if (currentValue !== snapshotValue) {
      // Only report if at least one side has a value
      if (currentValue !== undefined || snapshotValue !== undefined) {
        reasons.push({
          type: 'operator_input_changed',
          field,
          from: snapshotValue,
          to: currentValue,
        });
      }
    }
  }

  // 6. Check override changes
  const overrideFields: (keyof NonNullable<OperatorInputs['overrides']>)[] = [
    'maxBidOverride',
    'confirmedPrice',
  ];

  for (const field of overrideFields) {
    const currentValue = currentInputs?.overrides?.[field]?.value;
    const snapshotValue = snapshotInputs?.overrides?.[field]?.value;

    if (currentValue !== snapshotValue) {
      if (currentValue !== undefined || snapshotValue !== undefined) {
        reasons.push({
          type: 'operator_input_changed',
          field,
          from: snapshotValue,
          to: currentValue,
        });
      }
    }
  }

  return {
    isStale: reasons.length > 0,
    reasons,
  };
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format staleness reason for banner display.
 */
export function formatStalenessReason(reason: StalenessReason): string {
  switch (reason.type) {
    case 'listing_bid_changed':
      return `Bid $${reason.from}→$${reason.to}`;
    case 'listing_end_time_changed':
      return 'End time changed';
    case 'listing_photos_changed':
      return `Photos ${reason.from}→${reason.to}`;
    case 'operator_input_changed':
      return formatFieldChange(reason.field);
    case 'assumptions_version_changed':
      return 'Settings updated';
  }
}

function formatFieldChange(field: string): string {
  const labels: Record<string, string> = {
    titleStatus: 'Title',
    titleInHand: 'Title in hand',
    lienStatus: 'Lien status',
    vin: 'VIN',
    odometerMiles: 'Mileage',
    maxBidOverride: 'Max bid',
    confirmedPrice: 'Confirmed price',
  };
  return `${labels[field] || field} updated`;
}

/**
 * Format staleness for banner copy.
 */
export function formatStalenessBanner(check: StalenessCheck): string {
  if (!check.isStale) return '';

  if (check.reasons.length === 1) {
    return `Stale: ${formatStalenessReason(check.reasons[0])}`;
  }

  if (check.reasons.length <= 3) {
    return `Stale: ${check.reasons.length} changes`;
  }

  return 'Stale: Multiple changes';
}

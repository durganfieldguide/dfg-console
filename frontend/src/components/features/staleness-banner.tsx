'use client';

import * as React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export type StalenessReason =
  | { type: 'listing_bid_changed'; from: number; to: number }
  | { type: 'listing_end_time_changed'; from: string; to: string }
  | { type: 'listing_photos_changed'; from: number; to: number }
  | { type: 'operator_input_changed'; field: string; from: unknown; to: unknown }
  | { type: 'assumptions_version_changed'; from: string; to: string };

export interface StalenessCheck {
  isStale: boolean;
  reasons: StalenessReason[];
}

// =============================================================================
// Format Helpers
// =============================================================================

function formatReason(reason: StalenessReason): string {
  switch (reason.type) {
    case 'listing_bid_changed':
      return `Bid $${reason.from} → $${reason.to}`;
    case 'listing_end_time_changed':
      return 'End time changed';
    case 'listing_photos_changed':
      return `Photos ${reason.from} → ${reason.to}`;
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

// =============================================================================
// Main Component
// =============================================================================

interface StalenessBannerProps {
  isStale: boolean;
  reasons?: StalenessReason[];
  analysisTimestamp?: string;
  onReAnalyze: () => void;
  isReAnalyzing?: boolean;
  className?: string;
}

export function StalenessBanner({
  isStale,
  reasons = [],
  analysisTimestamp,
  onReAnalyze,
  isReAnalyzing,
  className,
}: StalenessBannerProps) {
  if (!isStale) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 rounded-lg border-l-4 border-yellow-500 ${className || ''}`}
      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Analysis is stale
          </p>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {reasons.length === 1 ? (
              <span>{formatReason(reasons[0])}</span>
            ) : reasons.length <= 3 ? (
              <span>{reasons.map(formatReason).join(' • ')}</span>
            ) : (
              <span>{reasons.length} changes since last analysis</span>
            )}
          </div>
          {analysisTimestamp && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Last analyzed: {new Date(analysisTimestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={onReAnalyze}
        loading={isReAnalyzing}
        variant="warning"
        size="sm"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Re-Analyze
      </Button>
    </div>
  );
}

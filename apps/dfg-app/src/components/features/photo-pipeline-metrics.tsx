'use client';

import * as React from 'react';
import {
  Image,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhotoMetrics {
  available: number;
  availability_known: boolean;
  received: number;
  selected: number;
  analyzed_ok: number;
  analyzed_failed: number;
  selected_indices?: number[];
}

interface PhotoPipelineMetricsProps {
  metrics?: PhotoMetrics;
  className?: string;
}

/**
 * Displays photo pipeline metrics in a compact, informative format.
 * Shows: available · selected · analyzed · failed
 *
 * Answers two key questions:
 * 1. Did the seller provide enough photos?
 * 2. Did DFG successfully analyze them?
 */
export function PhotoPipelineMetrics({ metrics, className }: PhotoPipelineMetricsProps) {
  if (!metrics) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Image className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500">Photo metrics not available</span>
      </div>
    );
  }

  const {
    available,
    availability_known,
    selected,
    analyzed_ok,
    analyzed_failed,
  } = metrics;

  // Determine status for color coding
  const hasFetchFailures = analyzed_failed > 0;
  const hasLimitedPhotos = availability_known && available < 4;
  const hasUnknownCount = !availability_known;
  const analysisSuccess = analyzed_ok >= 4;

  // Status color and icon
  let statusColor = 'text-gray-600 dark:text-gray-400';
  let StatusIcon = Image;
  let bgColor = 'bg-gray-50 dark:bg-gray-800/50';
  let borderColor = 'border-gray-200 dark:border-gray-700';

  if (hasFetchFailures) {
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    StatusIcon = AlertTriangle;
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
    borderColor = 'border-yellow-200 dark:border-yellow-800';
  } else if (hasLimitedPhotos) {
    statusColor = 'text-orange-600 dark:text-orange-400';
    StatusIcon = AlertTriangle;
    bgColor = 'bg-orange-50 dark:bg-orange-900/20';
    borderColor = 'border-orange-200 dark:border-orange-800';
  } else if (hasUnknownCount) {
    statusColor = 'text-gray-500 dark:text-gray-400';
    StatusIcon = HelpCircle;
  } else if (analysisSuccess) {
    statusColor = 'text-green-600 dark:text-green-400';
    StatusIcon = CheckCircle;
    bgColor = 'bg-green-50 dark:bg-green-900/20';
    borderColor = 'border-green-200 dark:border-green-800';
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border text-sm',
        bgColor,
        borderColor,
        className
      )}
    >
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className={cn('h-4 w-4', statusColor)} />
        <span className="font-medium">Photo Analysis</span>
      </div>

      {/* Compact metrics line */}
      <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
        {/* Available */}
        <span className="flex items-center gap-1">
          <span className={cn(
            hasLimitedPhotos ? 'text-orange-600 dark:text-orange-400 font-bold' :
            hasUnknownCount ? 'text-gray-500' : ''
          )}>
            {availability_known ? available : '?'}
          </span>
          <span className="text-gray-500">available</span>
        </span>

        <span className="text-gray-300">·</span>

        {/* Selected */}
        <span className="flex items-center gap-1">
          <span>{selected}</span>
          <span className="text-gray-500">selected</span>
        </span>

        <span className="text-gray-300">·</span>

        {/* Analyzed OK */}
        <span className="flex items-center gap-1">
          <span className={cn(
            analyzed_ok >= 4 ? 'text-green-600 dark:text-green-400' :
            analyzed_ok > 0 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          )}>
            {analyzed_ok}
          </span>
          <span className="text-gray-500">analyzed</span>
        </span>

        {/* Failed (only if > 0) */}
        {analyzed_failed > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-bold">
                {analyzed_failed}
              </span>
              <span className="text-gray-500">failed</span>
            </span>
          </>
        )}
      </div>

      {/* Status messages */}
      <div className="mt-2 text-xs space-y-1">
        {hasLimitedPhotos && (
          <p className="text-orange-600 dark:text-orange-400">
            Seller only provided {available} photo{available !== 1 ? 's' : ''} (need 4+ for full assessment)
          </p>
        )}
        {hasUnknownCount && (
          <p className="text-gray-500">
            Photo count unknown (legacy data or missing field)
          </p>
        )}
        {hasFetchFailures && !hasLimitedPhotos && (
          <p className="text-yellow-600 dark:text-yellow-400">
            Failed to fetch {analyzed_failed} of {selected} photos (possible hotlink blocking)
          </p>
        )}
        {analysisSuccess && !hasFetchFailures && !hasLimitedPhotos && !hasUnknownCount && (
          <p className="text-green-600 dark:text-green-400">
            Full photo coverage achieved
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline version for use in tables or cards
 */
export function PhotoPipelineMetricsCompact({ metrics, className }: PhotoPipelineMetricsProps) {
  if (!metrics) {
    return (
      <span className={cn('text-xs text-gray-400', className)}>
        No metrics
      </span>
    );
  }

  const { available, availability_known, analyzed_ok, analyzed_failed } = metrics;

  return (
    <span className={cn('text-xs font-mono flex items-center gap-1', className)}>
      <Image className="h-3 w-3 text-gray-400" />
      <span>
        {availability_known ? available : '?'} avail
      </span>
      <span className="text-gray-300">·</span>
      <span className={analyzed_ok >= 4 ? 'text-green-600' : 'text-yellow-600'}>
        {analyzed_ok}
      </span>
      <span className="text-gray-500">ok</span>
      {analyzed_failed > 0 && (
        <>
          <span className="text-gray-300">·</span>
          <span className="text-red-600">{analyzed_failed}</span>
          <span className="text-gray-500">fail</span>
        </>
      )}
    </span>
  );
}

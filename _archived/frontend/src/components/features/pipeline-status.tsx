'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ChevronDownIcon, ChevronUpIcon, PlayIcon } from '@heroicons/react/24/outline';
import { formatTimeAgo } from '@/lib/utils/format';
import type { AuctionSource, ScoutRun } from '@/lib/types';

interface PipelineStatusProps {
  sources: AuctionSource[];
  recentRuns: ScoutRun[];
  selectedSource: AuctionSource;
  onSourceChange: (source: AuctionSource) => void;
  onRunScout: () => void;
  isRunning?: boolean;
  className?: string;
}

const sourceLabels: Record<AuctionSource, string> = {
  sierra_auction: 'Sierra Auction',
  ironplanet: 'IronPlanet',
  fb_marketplace: 'FB Marketplace',
  craigslist: 'Craigslist',
  offerup: 'OfferUp',
};

const sourceStatus: Record<AuctionSource, 'active' | 'coming_soon' | 'disabled'> = {
  sierra_auction: 'active',
  ironplanet: 'active',
  fb_marketplace: 'coming_soon',
  craigslist: 'coming_soon',
  offerup: 'coming_soon',
};

export function PipelineStatus({
  sources,
  recentRuns,
  selectedSource,
  onSourceChange,
  onRunScout,
  isRunning,
  className,
}: PipelineStatusProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const lastRun = recentRuns[0];

  const sourceOptions = sources.map((s) => ({
    value: s,
    label: sourceLabels[s] || s,
    disabled: sourceStatus[s] !== 'active',
  }));

  // Only show active sources in the summary
  const activeSources = sources.filter((s) => sourceStatus[s] === 'active');
  const comingSoonSources = sources.filter((s) => sourceStatus[s] === 'coming_soon');

  return (
    <div
      className={cn('rounded-lg border', className)}
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
    >
      {/* Header - always visible */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Pipeline Health</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <span>Sources:</span>
              {activeSources.map((s) => (
                <Badge key={s} variant="success" className="text-xs">
                  {sourceLabels[s]}
                </Badge>
              ))}
              {comingSoonSources.length > 0 && (
                <span className="text-xs">
                  + {comingSoonSources.length} coming soon
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRun && (
              <span className="hidden sm:inline text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Last run: {formatTimeAgo(lastRun.started_at)}
                {lastRun.total_candidates > 0 && (
                  <span className="ml-1">({lastRun.total_candidates} found)</span>
                )}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Select
                value={selectedSource}
                onChange={(e) => onSourceChange(e.target.value as AuctionSource)}
                options={sourceOptions}
                className="w-36 text-sm"
              />
              <Button
                size="sm"
                onClick={onRunScout}
                loading={isRunning}
              >
                <PlayIcon className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Run Scout</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content - recent runs */}
      {isExpanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>
              Recent Runs
            </h4>
            {recentRuns.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No runs yet. Click &quot;Run Scout&quot; to start.
              </p>
            ) : (
              <div className="space-y-2">
                {recentRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.run_id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800/50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={run.source as keyof typeof Badge} className="text-xs">
                        {sourceLabels[run.source] || run.source}
                      </Badge>
                      <span style={{ color: 'var(--muted-foreground)' }}>
                        {formatTimeAgo(run.started_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono">
                        {run.total_candidates} candidates
                      </span>
                      <Badge
                        variant={
                          run.status === 'completed'
                            ? 'success'
                            : run.status === 'running'
                            ? 'warning'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {run.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

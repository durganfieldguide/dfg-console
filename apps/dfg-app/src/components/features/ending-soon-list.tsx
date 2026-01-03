'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  RefreshCw,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import { listOpportunities } from '@/lib/api';
import type { OpportunitySummary, OpportunityStatus } from '@/types';

/**
 * Calculate time remaining and urgency level.
 */
function getTimeRemaining(endDateStr: string): {
  text: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  hoursRemaining: number;
} {
  const now = new Date();
  const endDate = new Date(endDateStr);
  const diffMs = endDate.getTime() - now.getTime();

  // Already ended
  if (diffMs <= 0) {
    return { text: 'Ended', urgency: 'critical', hoursRemaining: 0 };
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  // Format the time remaining
  let text: string;
  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    text = `${mins}m`;
  } else if (diffHours < 24) {
    const hrs = Math.floor(diffHours);
    const mins = Math.floor((diffHours - hrs) * 60);
    text = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  } else {
    const days = Math.floor(diffDays);
    const hrs = Math.floor((diffDays - days) * 24);
    text = hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
  }

  // Determine urgency level
  let urgency: 'critical' | 'high' | 'medium' | 'low';
  if (diffHours < 24) {
    urgency = 'critical'; // Red - less than 24 hours
  } else if (diffDays <= 3) {
    urgency = 'high'; // Orange - 1-3 days
  } else {
    urgency = 'medium'; // Yellow - 4-7 days
  }

  return { text, urgency, hoursRemaining: diffHours };
}

/**
 * Get urgency color classes
 */
function getUrgencyColors(urgency: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (urgency) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

interface EndingSoonItemProps {
  item: OpportunitySummary;
}

function EndingSoonItem({ item }: EndingSoonItemProps) {
  const timeInfo = item.auction_ends_at
    ? getTimeRemaining(item.auction_ends_at)
    : null;

  return (
    <Link
      href={`/opportunities/${encodeURIComponent(item.id)}`}
      className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h4>

          {/* Status and Source */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium shrink-0',
                STATUS_COLORS[item.status as OpportunityStatus]
              )}
            >
              {STATUS_LABELS[item.status as OpportunityStatus]}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {item.source}
            </span>
            {item.current_bid !== null && (
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
                ${item.current_bid.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Time remaining badge */}
        <div className="flex items-center gap-2">
          {timeInfo && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
                getUrgencyColors(timeInfo.urgency)
              )}
            >
              <Clock className="h-3 w-3" />
              {timeInfo.text}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

interface EndingSoonListProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function EndingSoonList({
  limit = 10,
  showHeader = true,
  className,
}: EndingSoonListProps) {
  const [items, setItems] = useState<OpportunitySummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch opportunities ending soon, sorted by auction_ends_at ascending
      const data = await listOpportunities({
        ending_soon: true,
        limit,
        sort: 'auction_ends_at',
        order: 'asc',
      });
      setItems(data.opportunities);
      setTotalCount(data.total);
    } catch (err) {
      console.error('Failed to fetch ending soon items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every minute to keep countdowns accurate
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update countdown displays
      setItems((prev) => [...prev]);
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Ending Soon
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 dark:border-red-800', className)}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Ending Soon
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="px-3 sm:px-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={cn('border-green-200 dark:border-green-800', className)}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Ending Soon
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="px-3 sm:px-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            No auctions ending soon. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-orange-200 dark:border-orange-800', className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-5 w-5 text-orange-500 shrink-0" />
            <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
              Ending Soon
            </h2>
            <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold shrink-0">
              {totalCount}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.id} className="px-4">
              <EndingSoonItem item={item} />
            </div>
          ))}
        </div>

        {/* View All link - shown when there are more items than displayed */}
        {totalCount > items.length && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/opportunities?ending_soon=true"
              className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center justify-center gap-1"
            >
              View all {totalCount} ending soon
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EndingSoonList;

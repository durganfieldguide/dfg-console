'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  FlaskConical,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatRelativeTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import {
  getAttentionRequired,
  touchOpportunity,
  type AttentionItem,
  type ReasonChip,
} from '@/lib/api';
import type { OpportunityStatus } from '@/types';

/**
 * Reason chip configuration for display.
 */
const CHIP_CONFIG: Record<ReasonChip, { label: string; icon: typeof AlertTriangle; color: string; filterUrl: string }> = {
  DECISION_STALE: {
    label: 'Decision Needed',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    filterUrl: '/opportunities?decision_stale=true',
  },
  ENDING_SOON: {
    label: 'Ending Soon',
    icon: Clock,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    filterUrl: '/opportunities?ending_soon=true',
  },
  STALE: {
    label: 'Stale',
    icon: AlertCircle,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    filterUrl: '/opportunities?stale=true',
  },
  ANALYSIS_STALE: {
    label: 'Needs Re-analysis',
    icon: FlaskConical,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    filterUrl: '/opportunities?analysis_stale=true',
  },
};

interface ReasonChipProps {
  chip: ReasonChip;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
}

function ReasonChipBadge({ chip, size = 'sm', onClick }: ReasonChipProps) {
  const config = CHIP_CONFIG[chip];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity',
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </button>
  );
}

interface AttentionItemRowProps {
  item: AttentionItem;
  onTouch: (id: string) => void;
  onChipClick: (chip: ReasonChip) => void;
}

function AttentionItemRow({ item, onTouch, onChipClick }: AttentionItemRowProps) {
  const handleClick = () => {
    // Fire touch on click (fire-and-forget)
    onTouch(item.id);
  };

  const handleChipClick = (e: React.MouseEvent, chip: ReasonChip) => {
    // Prevent the row click from firing
    e.preventDefault();
    e.stopPropagation();
    onChipClick(chip);
  };

  // Format time remaining
  const timeRemaining = item.auction_ends_at
    ? formatRelativeTime(item.auction_ends_at)
    : null;

  return (
    <Link
      href={`/opportunities/${encodeURIComponent(item.id)}`}
      onClick={handleClick}
      className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h4>

          {/* Status and Source */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                STATUS_COLORS[item.status as OpportunityStatus]
              )}
            >
              {STATUS_LABELS[item.status as OpportunityStatus]}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.source}
            </span>
            {timeRemaining && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {timeRemaining}
              </span>
            )}
          </div>

          {/* Reason Chips - clickable to filter */}
          <div className="flex flex-wrap gap-1 mt-2">
            {item.reason_tags.map((chip) => (
              <ReasonChipBadge
                key={chip}
                chip={chip}
                onClick={(e) => handleChipClick(e, chip)}
              />
            ))}
          </div>
        </div>

        {/* Max Bid if set */}
        <div className="flex flex-col items-end gap-1">
          {item.max_bid_locked && (
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              ${item.max_bid_locked.toLocaleString()}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

interface AttentionRequiredListProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function AttentionRequiredList({
  limit = 5,
  showHeader = true,
  className,
}: AttentionRequiredListProps) {
  const router = useRouter();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAttentionRequired(limit);
      setItems(data.items);
      setTotalCount(data.total_count);
    } catch (err) {
      console.error('Failed to fetch attention required items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTouch = useCallback((id: string) => {
    // Fire and forget - don't await, just trigger the touch
    touchOpportunity(id).catch((err) => {
      console.warn('Touch failed:', err);
    });
  }, []);

  const handleChipClick = useCallback((chip: ReasonChip) => {
    // Navigate to the filtered opportunities page
    const config = CHIP_CONFIG[chip];
    router.push(config.filterUrl);
  }, [router]);

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-medium text-gray-900 dark:text-white">
                Attention Required
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="font-medium text-gray-900 dark:text-white">
                Attention Required
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent>
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-green-500" />
              <h2 className="font-medium text-gray-900 dark:text-white">
                Attention Required
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-400">
            All caught up! No items need attention.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-amber-200 dark:border-amber-800', className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-medium text-gray-900 dark:text-white">
              Attention Required
            </h2>
            <span className="ml-1 text-sm text-amber-600 dark:text-amber-400 font-semibold">
              {totalCount}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.id} className="px-4">
              <AttentionItemRow item={item} onTouch={handleTouch} onChipClick={handleChipClick} />
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}

export default AttentionRequiredList;

'use client';

import { useRouter } from 'next/navigation';
import { Clock, MapPin, AlertCircle, ExternalLink, AlertTriangle, FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge, ScoreBadge } from '@/components/ui/Badge';
import { cn, formatCurrency, formatRelativeTime, isEndingSoon } from '@/lib/utils';
import type { OpportunitySummary } from '@/types';

interface OpportunityCardProps {
  opportunity: OpportunitySummary;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function OpportunityCard({ opportunity, selected, onSelect }: OpportunityCardProps) {
  const router = useRouter();
  const endingSoon = isEndingSoon(opportunity.auction_ends_at, 24);
  const hasAlert = opportunity.has_active_alert || opportunity.watch_fired_at !== null;

  const handleClick = () => {
    if (onSelect) {
      onSelect(opportunity.id);
    } else {
      router.push(`/opportunities/${opportunity.id}`);
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (opportunity.source_url) {
      window.open(opportunity.source_url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn(`[OpportunityCard] source_url missing for opportunity ${opportunity.id}`);
    }
  };

  return (
    <Card
      hover
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden',
        selected && 'ring-2 ring-blue-500',
        hasAlert && 'border-l-4 border-l-red-500'
      )}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Image - using regular img to avoid Next.js image optimization issues with external CDNs */}
          <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-700">
            {opportunity.primary_image_url ? (
              <img
                src={opportunity.primary_image_url}
                alt={opportunity.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <span className="text-xs">No image</span>
              </div>
            )}
            {hasAlert && (
              <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
                <AlertCircle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {opportunity.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {opportunity.source_url && (
                  <button
                    onClick={handleExternalLinkClick}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Open original listing"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}
                <ScoreBadge score={opportunity.buy_box_score} />
              </div>
            </div>

            {/* Status, source, and staleness badges */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <StatusBadge status={opportunity.status} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {opportunity.source === 'sierra_auction' ? 'Sierra' : opportunity.source}
              </span>
              {/* Staleness badges */}
              {opportunity.is_stale && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Stale {opportunity.stale_days ? `${opportunity.stale_days}d` : ''}
                </span>
              )}
              {opportunity.is_decision_stale && !opportunity.is_stale && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Decision Needed
                </span>
              )}
              {opportunity.is_analysis_stale && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <FlaskConical className="h-3 w-3" />
                  Re-analysis
                </span>
              )}
            </div>

            {/* Price and timing */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(opportunity.current_bid)}
              </span>

              {opportunity.auction_ends_at && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    endingSoon
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(opportunity.auction_ends_at)}
                </div>
              )}
            </div>

            {/* Location */}
            {opportunity.distance_miles !== null && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="h-3 w-3" />
                {Math.round(opportunity.distance_miles)} miles
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

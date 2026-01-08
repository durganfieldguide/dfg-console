'use client';

import { useRouter } from 'next/navigation';
import { Clock, MapPin, AlertCircle, ExternalLink, AlertTriangle, FlaskConical, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge, ScoreBadge } from '@/components/ui/Badge';
import { cn, formatCurrency, formatRelativeTime, isEndingSoon, formatSourceLabel } from '@/lib/utils';
import type { OpportunitySummary } from '@/types';

interface OpportunityCardProps {
  opportunity: OpportunitySummary;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * Signal-first opportunity card.
 * Layout prioritizes: Score > Urgency Signals > Time > Price > Details
 */
export function OpportunityCard({ opportunity, selected, onSelect }: OpportunityCardProps) {
  const router = useRouter();
  const endingSoon = isEndingSoon(opportunity.auction_ends_at, 24);
  const hasAlert = opportunity.has_active_alert || opportunity.watch_fired_at !== null;
  const isHighScore = opportunity.buy_box_score >= 70;
  const hasUrgentSignals = opportunity.is_decision_stale || endingSoon || hasAlert;

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

  // Compute background tint based on score (subtle but distinguishable)
  const scoreTint = isHighScore
    ? 'bg-green-50/50 dark:bg-green-900/10'
    : opportunity.buy_box_score < 40
      ? 'bg-gray-50/50 dark:bg-gray-800/50'
      : '';

  return (
    <Card
      hover
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden',
        selected && 'ring-2 ring-blue-500',
        hasAlert && 'border-l-4 border-l-red-500',
        hasUrgentSignals && !hasAlert && 'border-l-4 border-l-orange-400'
      )}
    >
      <CardContent className={cn('p-0', scoreTint)}>
        <div className="flex">
          {/* Image - smaller, as thumbnail only */}
          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 m-2 rounded overflow-hidden">
            {opportunity.primary_image_url ? (
              <img
                src={opportunity.primary_image_url}
                alt={opportunity.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <span className="text-[10px]">No img</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 py-2 pr-3 min-w-0">
            {/* Signal row - urgency indicators FIRST */}
            <div className="flex items-center flex-wrap gap-1.5 mb-1">
              {/* High-priority urgency signals */}
              {hasAlert && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500 text-white">
                  <AlertCircle className="h-3 w-3" />
                  Alert
                </span>
              )}
              {opportunity.is_decision_stale && !hasAlert && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <Zap className="h-3 w-3" />
                  Decide Now
                </span>
              )}
              {endingSoon && !opportunity.is_decision_stale && !hasAlert && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <Clock className="h-3 w-3" />
                  Ending Soon
                </span>
              )}
              {/* Staleness indicators */}
              {opportunity.is_stale && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {opportunity.stale_days ? `${opportunity.stale_days}d stale` : 'Stale'}
                </span>
              )}
              {opportunity.is_analysis_stale && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                  <FlaskConical className="h-3 w-3" />
                  Re-analyze
                </span>
              )}
              {/* Status badge (demoted from title row) */}
              <StatusBadge status={opportunity.status} />
            </div>

            {/* Title + external link */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {opportunity.title}
              </h3>
              {opportunity.source_url && (
                <button
                  onClick={handleExternalLinkClick}
                  className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
                  title="Open original listing"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Price, timing, and location - compact row */}
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(opportunity.current_bid)}
              </span>

              {opportunity.auction_ends_at && (
                <span
                  className={cn(
                    'flex items-center gap-1',
                    endingSoon
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(opportunity.auction_ends_at)}
                </span>
              )}

              {opportunity.distance_miles !== null && (
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {Math.round(opportunity.distance_miles)}mi
                </span>
              )}

              <span className="text-gray-400 dark:text-gray-500 ml-auto">
                {formatSourceLabel(opportunity.source)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

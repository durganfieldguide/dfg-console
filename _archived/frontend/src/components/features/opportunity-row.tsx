'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { VerdictBadge } from './verdict-badge';
import { Countdown } from './countdown';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import type { Listing, ListingWithAnalysis } from '@/lib/types';

// Simple image component with error handling - avoids Next.js image optimization issues
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = React.useState(false);

  if (error || !src) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn('object-cover w-full h-full', className)}
      onError={() => setError(true)}
    />
  );
}

interface OpportunityRowProps {
  listing: Listing | ListingWithAnalysis;
  variant: 'candidate' | 'actionable' | 'marginal' | 'ending_soon';
  onAnalyze?: () => void;
  onView?: () => void;
  onBid?: () => void;
  onPass?: () => void;
  onPursue?: () => void;
  isAnalyzing?: boolean;
  className?: string;
}

function hasAnalysis(listing: Listing | ListingWithAnalysis): listing is ListingWithAnalysis {
  return 'analysis' in listing && listing.analysis !== undefined;
}

export function OpportunityRow({
  listing,
  variant,
  onAnalyze,
  onView,
  onBid,
  onPass,
  onPursue,
  isAnalyzing,
  className,
}: OpportunityRowProps) {
  const analysis = hasAnalysis(listing) ? listing.analysis : undefined;
  const verdict = analysis?.report_fields.verdict;
  const maxBid = analysis?.report_fields.max_bid_mid;
  const margin = analysis?.report_fields.expected_margin;
  const confidence = analysis?.report_fields.confidence;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
        className
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Image */}
      <div className="relative h-14 w-14 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
        <SafeImage src={listing.image_url || ''} alt={listing.title} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{listing.title}</h4>
          {verdict && <VerdictBadge verdict={verdict} size="sm" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {/* Show different info based on variant */}
          {variant === 'candidate' && (
            <>
              <span className="font-medium">Score: {listing.buy_box_score}</span>
              <span>Bid: {formatCurrency(listing.current_bid)}</span>
            </>
          )}
          {(variant === 'actionable' || variant === 'marginal') && analysis && (
            <>
              <span>Current: {formatCurrency(listing.current_bid)}</span>
              {maxBid && <span className="font-medium">Max: {formatCurrency(maxBid)}</span>}
              {margin !== undefined && <span>Margin: {formatPercent(margin)}</span>}
              {confidence !== undefined && variant === 'marginal' && (
                <span>Conf: {confidence}/5</span>
              )}
            </>
          )}
          {variant === 'ending_soon' && (
            <>
              <span>Bid: {formatCurrency(listing.current_bid)}</span>
              <span className="flex items-center gap-1">
                <span>Ends:</span>
                <Countdown endDate={listing.auction_end_at} />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Countdown (for non-ending_soon variants) */}
      {variant !== 'ending_soon' && listing.auction_end_at && (
        <div className="hidden sm:flex flex-col items-end text-xs">
          <span style={{ color: 'var(--muted-foreground)' }}>Ends</span>
          <Countdown endDate={listing.auction_end_at} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {variant === 'candidate' && (
          <>
            {onAnalyze && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                loading={isAnalyzing}
              >
                Analyze
              </Button>
            )}
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )}
          </>
        )}
        {variant === 'actionable' && (
          <>
            {onView && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                View
              </Button>
            )}
            {onBid && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBid();
                }}
              >
                Bid
              </Button>
            )}
          </>
        )}
        {variant === 'marginal' && (
          <>
            {onView && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                View
              </Button>
            )}
            {onPass && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onPass();
                }}
              >
                Pass
              </Button>
            )}
            {onPursue && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPursue();
                }}
              >
                Pursue
              </Button>
            )}
          </>
        )}
        {variant === 'ending_soon' && (
          <>
            {onView && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                View
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

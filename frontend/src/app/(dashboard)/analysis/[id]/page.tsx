'use client';

import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { VerdictReasoning } from '@/components/features/verdict-reasoning';
import { InvestmentBreakdown } from '@/components/features/investment-breakdown';
import { RepairPlan, parseRepairPlan } from '@/components/features/repair-plan';
import { InspectionChecklist, parseInspectionPriorities } from '@/components/features/inspection-checklist';
import { DealKillers, parseDealKillers } from '@/components/features/deal-killers';
import { ConditionAssessment, parseConditionData } from '@/components/features/condition-assessment';
import { BuyerInsights, parseBuyerLensData, type MarketDemandAssessment } from '@/components/features/buyer-insights';
import { AnalysisSummary } from '@/components/features/analysis-summary';
import { FullReport } from '@/components/features/full-report';
import { HelpTooltip } from '@/components/ui/tooltip';
import { CopyButton } from '@/components/ui/copy-button';
import { useMockMode } from '@/lib/hooks/use-mock-mode';
import { mockAnalysis, mockListings, delay } from '@/lib/api/mock-data';
import { formatCurrency, formatPercent, formatConfidence, formatDateTime } from '@/lib/utils/format';
import type { AnalysisResult, Listing } from '@/lib/types';

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { useMockData } = useMockMode();

  const listingId = decodeURIComponent(params.id as string);

  // Fetch analysis - check sessionStorage first (from analyze flow), then try stored D1 analysis
  const { data: analysis, isLoading, refetch, isFetching } = useQuery<AnalysisResult>({
    queryKey: ['analysis', listingId],
    queryFn: async () => {
      if (useMockData) {
        await delay(500);
        return { ...mockAnalysis, listing_id: listingId };
      }

      // Check sessionStorage first (populated by Opportunities page after analysis)
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(`analysis:${listingId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Keep in sessionStorage for page refreshes during same session
            return parsed;
          } catch {
            // Ignore parse errors, fall through to API
          }
        }
      }

      // Fall back to stored analysis from D1
      const res = await fetch(`/api/scout/analysis/${encodeURIComponent(listingId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Analysis not found - this listing may not have been analyzed yet');
        }
        throw new Error('Failed to fetch analysis');
      }
      const data = await res.json();

      // Cache in sessionStorage for future navigation during this session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`analysis:${listingId}`, JSON.stringify(data));
      }

      return data;
    },
  });

  // Fetch listing for context - check sessionStorage first (cached by Opportunities page)
  const { data: listing } = useQuery<Listing>({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      if (useMockData) {
        await delay(200);
        return mockListings.find((l) => l.id === listingId) || mockListings[0];
      }

      // Check sessionStorage first (populated by Opportunities page after analysis)
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(`listing:${listingId}`);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // Ignore parse errors, fall through to API
          }
        }
      }

      const res = await fetch(`/api/scout/listings/${encodeURIComponent(listingId)}`);
      if (!res.ok) throw new Error('Failed to fetch listing');
      const data = await res.json();

      // Cache for future use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`listing:${listingId}`, JSON.stringify(data));
      }

      return data;
    },
  });

  // Re-analyze mutation
  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      if (useMockData) {
        await delay(3000);
        return mockAnalysis;
      }
      if (!listing) throw new Error('No listing data');
      const res = await fetch('/api/analyst/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: listing.source,
          listing_url: listing.url,
          lot_id: listing.source_id,
          category_id: listing.category_id,
          title: listing.title,
          description: listing.description,
          photos: listing.photos || (listing.image_url ? [listing.image_url] : []),
          photo_count: listing.photos?.length ?? (listing.image_url ? 1 : 0), // Total available
          current_bid: listing.current_bid,
          fee_schedule: { buyer_premium: 0.15, sales_tax_percent: 0.086 },
          location: listing.location,
        }),
      });
      if (!res.ok) throw new Error('Re-analysis failed');
      return res.json();
    },
    onSuccess: (result) => {
      addToast({
        type: 'success',
        title: 'Re-analysis complete',
        description: 'The analysis has been updated',
      });

      // Update sessionStorage with new analysis
      const analysisData = {
        ...result,
        listing_id: listingId,
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`analysis:${listingId}`, JSON.stringify(analysisData));
      }

      // Persist to D1 (fire and forget)
      fetch('/api/scout/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData),
      }).catch(err => console.error('Failed to persist re-analysis:', err));

      refetch();
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Re-analysis failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleCopyMaxBid = () => {
    if (analysis?.report_fields.max_bid_mid) {
      navigator.clipboard.writeText(analysis.report_fields.max_bid_mid.toString());
      addToast({
        type: 'success',
        title: 'Copied',
        description: `Max bid of ${formatCurrency(analysis.report_fields.max_bid_mid)} copied to clipboard`,
      });
    }
  };

  const handleExportPDF = () => {
    addToast({
      type: 'info',
      title: 'Export PDF',
      description: 'PDF export coming soon',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Analysis not found</h2>
        <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
          This listing may not have been analyzed yet.
        </p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  // Safely extract report_fields with defaults
  const fields = analysis.report_fields || {
    verdict: 'PASS' as const,
    max_bid_mid: 0,
    max_bid_worst: 0,
    max_bid_best: 0,
    retail_est: 0,
    expected_profit: 0,
    expected_margin: 0,
    confidence: 1,
  };

  // Use calculation_spine for consistent pricing (preferred over retail_est)
  const calcSpine = (analysis as any).calculation_spine;
  const expectedSalePrice = calcSpine?.market_rate_price || fields.retail_est || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link
          href="/opportunities"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Opportunities
        </Link>
        <span style={{ color: 'var(--muted-foreground)' }}>/</span>
        <span className="font-medium truncate max-w-[300px]">
          {analysis.asset_summary?.title || 'Analysis'}
        </span>
      </nav>

      {/* Header */}
      {(() => {
        // Unified verdict logic - one canonical format
        const verdict = fields.verdict as string;
        const bidReadiness = (analysis as any).bid_readiness;
        const isGated = bidReadiness?.status === 'NOT_BID_READY';
        const blockerCount = bidReadiness?.blockers?.length || 0;
        const blockers = bidReadiness?.blockers || [];

        // Canonical recommendation: BUY / PASS / WATCH
        // Hard definitions (do not soften):
        // BUY = bid up to max bid if gates clear. This is a real number.
        // WATCH = needs more info or price drop. Do not bid yet.
        // PASS = do not spend time. Not "maybe later."
        const recommendation = verdict === 'PASS' ? 'PASS' :
                               verdict === 'BUY' || verdict === 'STRONG_BUY' ? 'BUY' : 'WATCH';

        const recommendationTooltips: Record<string, string> = {
          BUY: 'Bid up to max bid shown. Economics work if gates clear.',
          WATCH: 'Do not bid yet. Needs price drop or more information.',
          PASS: 'Do not bid. Do not spend more time on this deal.',
        };

        // Generate "what clears this" message from blockers
        const getClearanceMessage = () => {
          if (blockers.length === 0) return null;
          // Summarize blockers into actionable items
          const actions: string[] = [];
          blockers.forEach((b: string) => {
            const lower = b.toLowerCase();
            if (lower.includes('title') && !actions.includes('title proof')) actions.push('title proof');
            if (lower.includes('photo') && !actions.includes('more photos')) actions.push('more photos');
            if (lower.includes('end') || lower.includes('time') && !actions.includes('end time')) actions.push('end time');
            if (lower.includes('condition') && !actions.includes('condition check')) actions.push('condition check');
            if (lower.includes('vin') && !actions.includes('VIN verification')) actions.push('VIN verification');
            if (lower.includes('mileage') && !actions.includes('mileage confirmation')) actions.push('mileage confirmation');
          });
          // If we couldn't parse specific actions, use first 2 blockers directly
          if (actions.length === 0) {
            return blockers.slice(0, 2).join(' + ');
          }
          return actions.slice(0, 3).join(' + ');
        };

        // Calculate reduced max bid if gates not cleared (20% haircut)
        const gatedMaxBid = Math.round(fields.max_bid_mid * 0.8);

        return (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {analysis.asset_summary?.title || 'Analysis'}
                </h1>
                {/* Unified Decision Badge with tooltip */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold cursor-help ${
                      recommendation === 'BUY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      recommendation === 'WATCH' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                    title={recommendationTooltips[recommendation]}
                  >
                    {recommendation}
                  </span>
                  {isGated && recommendation !== 'PASS' && (
                    <button
                      onClick={() => {
                        const tabTrigger = document.querySelector('[data-state][value="summary"]') as HTMLButtonElement;
                        if (tabTrigger) {
                          tabTrigger.click();
                          setTimeout(() => {
                            const tabContent = document.querySelector('[data-state="active"][role="tabpanel"]');
                            tabContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }
                      }}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors cursor-pointer"
                      title="Click to see blockers in Summary tab"
                    >
                      GATED ({blockerCount}) →
                    </button>
                  )}
                </div>
              </div>
              {/* GATED impact message - show structured impacts if available */}
              {isGated && recommendation !== 'PASS' && (
                <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--muted-foreground)' }}>
                  {bidReadiness?.blockers_with_impact?.length > 0 ? (
                    // New format: show each blocker with its impact
                    bidReadiness.blockers_with_impact.slice(0, 2).map((b: { issue: string; impact: string; action: string }, i: number) => (
                      <p key={i}>
                        <span className="font-medium text-orange-600 dark:text-orange-400">{b.issue}:</span>{' '}
                        {b.impact}
                      </p>
                    ))
                  ) : (
                    // Fallback: legacy format
                    <>
                      <p>
                        <span className="font-medium text-green-600 dark:text-green-400">Clears if:</span>{' '}
                        {getClearanceMessage()}
                      </p>
                      <p>
                        <span className="font-medium text-orange-600 dark:text-orange-400">If not cleared:</span>{' '}
                        reduce max bid to {formatCurrency(gatedMaxBid)} or treat as PASS
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {analysis.asset_summary?.source && (
                  <Badge variant={analysis.asset_summary.source as keyof typeof Badge}>
                    {analysis.asset_summary.source.replace('_', ' ')}
                  </Badge>
                )}
                {analysis.analysis_timestamp && (
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {formatDateTime(analysis.analysis_timestamp)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {listing && (
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                  style={{ borderColor: 'var(--input)' }}
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  View Listing
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => reanalyzeMutation.mutate()}
                loading={reanalyzeMutation.isPending}
                disabled={!listing}
                title={!listing ? 'Listing data not available - return to Opportunities and re-analyze from there' : undefined}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Re-analyze
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Max Bid Hero Card - Shows dual max bids when gated */}
      {(() => {
        const gatedEconomics = (analysis as any).gated_economics;
        const bidReadiness = (analysis as any).bid_readiness;
        const isGated = gatedEconomics?.is_gated;

        if (fields.verdict === 'PASS') {
          // PASS verdict: Show DO NOT BID warning
          return (
            <Card
              className="relative overflow-hidden border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                borderColor: 'rgba(239, 68, 68, 0.5)',
              }}
            >
              <CardContent className="py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Recommendation
                    </p>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-4xl font-bold tracking-tight text-red-600 dark:text-red-400">
                        DO NOT BID
                      </span>
                    </div>
                    <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
                      Deal-breakers identified. See Summary tab for details.
                    </p>
                    {fields.max_bid_mid > 0 && (
                      <p className="text-xs mt-3 italic" style={{ color: 'var(--muted-foreground)' }}>
                        If issues verified and resolved: max bid would be {formatCurrency(fields.max_bid_mid)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Current Bid
                    </p>
                    <p className="text-2xl font-bold font-mono">
                      {formatCurrency(analysis.asset_summary?.current_bid || 0)}
                    </p>
                    {listing && (
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        Open Listing
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // BUY or WATCH verdict: Show Max Bid with dual scenarios if gated
        return (
          <Card
            className="relative overflow-hidden"
            style={{
              background: isGated
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))'
                : fields.verdict === 'BUY'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
            }}
          >
            <CardContent className="py-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                {isGated && gatedEconomics ? (
                  // GATED: Show both verified and gated max bids
                  <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Verified Scenario */}
                      <div className="p-4 rounded-lg border-2 border-dashed" style={{ borderColor: 'rgba(34, 197, 94, 0.5)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                          ✓ If Gates Clear
                        </p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-4xl font-bold tracking-tight text-green-700 dark:text-green-300">
                            {formatCurrency(gatedEconomics.verified.max_bid)}
                          </span>
                          <Button variant="ghost" size="icon" onClick={handleCopyMaxBid} title="Copy verified max bid">
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2 text-sm space-y-1">
                          <p>
                            <span style={{ color: 'var(--muted-foreground)' }}>All-in:</span>{' '}
                            <span className="font-mono">{formatCurrency(gatedEconomics.verified.total_all_in)}</span>
                          </p>
                          <p>
                            <span style={{ color: 'var(--muted-foreground)' }}>Profit:</span>{' '}
                            <span className="font-mono text-green-600 dark:text-green-400">{formatCurrency(gatedEconomics.verified.expected_profit)}</span>
                            <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>
                              ({(gatedEconomics.verified.expected_margin * 100).toFixed(0)}%)
                            </span>
                          </p>
                        </div>
                        {gatedEconomics.clear_with?.length > 0 && (
                          <p className="text-xs mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                            <span className="font-medium">Clear with:</span> {gatedEconomics.clear_with.slice(0, 2).join(' • ')}
                          </p>
                        )}
                      </div>

                      {/* Gated Scenario */}
                      <div className="p-4 rounded-lg border-2" style={{ borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                          ⚠ If Gates NOT Cleared
                        </p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-4xl font-bold tracking-tight text-orange-700 dark:text-orange-300">
                            {formatCurrency(gatedEconomics.gated.max_bid)}
                          </span>
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            (−{(gatedEconomics.gated.haircut_pct * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="mt-2 text-sm space-y-1">
                          <p>
                            <span style={{ color: 'var(--muted-foreground)' }}>All-in:</span>{' '}
                            <span className="font-mono">{formatCurrency(gatedEconomics.gated.total_all_in)}</span>
                          </p>
                          <p>
                            <span style={{ color: 'var(--muted-foreground)' }}>Profit:</span>{' '}
                            <span className={`font-mono ${gatedEconomics.gated.expected_profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(gatedEconomics.gated.expected_profit)}
                            </span>
                            <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>
                              ({(gatedEconomics.gated.expected_margin * 100).toFixed(0)}%)
                            </span>
                          </p>
                        </div>
                        <p className="text-xs mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                          <span className="font-medium">Why:</span> {gatedEconomics.gated.haircut_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // NOT GATED: Show single max bid
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
                      Recommended Max Bid
                      <HelpTooltip term="max bid" explanation="" />
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-5xl font-bold tracking-tight">
                        {formatCurrency(fields.max_bid_mid)}
                      </span>
                      <Button variant="ghost" size="icon" onClick={handleCopyMaxBid} title="Copy max bid to clipboard">
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm">
                        <span style={{ color: 'var(--muted-foreground)' }}>Conservative:</span>{' '}
                        <span className="font-mono">{formatCurrency(fields.max_bid_worst)}</span>
                      </span>
                      <span className="text-sm">
                        <span style={{ color: 'var(--muted-foreground)' }}>Aggressive:</span>{' '}
                        <span className="font-mono">{formatCurrency(fields.max_bid_best)}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Current Bid - always shown */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    Current Bid
                  </p>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(analysis.asset_summary?.current_bid || 0)}
                  </p>
                  {listing && (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Open Listing
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Compact Stats Row - key numbers at a glance */}
      {(() => {
        const gatedEconomics = (analysis as any).gated_economics;
        const isGated = gatedEconomics?.is_gated;

        return (
          <div
            className="flex flex-wrap gap-6 p-4 rounded-lg border"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
          >
            <div className={fields.verdict === 'PASS' ? 'opacity-50' : ''}>
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Expected Sale (Base)</p>
              <p className="text-lg font-bold font-mono">{formatCurrency(expectedSalePrice)}</p>
              {calcSpine && calcSpine.quick_sale_price > 0 && (
                <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {formatCurrency(calcSpine.quick_sale_price)} – {formatCurrency(calcSpine.premium_price)}
                </p>
              )}
            </div>
            <div className={fields.verdict === 'PASS' ? 'opacity-50' : ''}>
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Profit {isGated && <span className="text-orange-600 dark:text-orange-400">(if cleared)</span>}
              </p>
              <p className={`text-lg font-bold font-mono ${fields.verdict !== 'PASS' ? 'text-green-600 dark:text-green-400' : ''}`}>
                {formatCurrency(isGated ? gatedEconomics.verified.expected_profit : fields.expected_profit)}
              </p>
              {isGated && gatedEconomics && (
                <p className="text-xs font-mono text-orange-600 dark:text-orange-400">
                  or {formatCurrency(gatedEconomics.gated.expected_profit)} if not
                </p>
              )}
            </div>
            <div className={fields.verdict === 'PASS' ? 'opacity-50' : ''}>
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Margin {isGated && <span className="text-orange-600 dark:text-orange-400">(if cleared)</span>}
              </p>
              <p className="text-lg font-bold font-mono">
                {formatPercent(isGated ? gatedEconomics.verified.expected_margin : fields.expected_margin)}
              </p>
              {isGated && gatedEconomics && (
                <p className="text-xs font-mono text-orange-600 dark:text-orange-400">
                  or {formatPercent(gatedEconomics.gated.expected_margin)} if not
                </p>
              )}
            </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Confidence</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-2 w-3 rounded"
                  style={i <= fields.confidence ? { backgroundColor: 'var(--primary)' } : { backgroundColor: 'var(--border)' }}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{formatConfidence(fields.confidence)}</span>
          </div>
          {/* Confidence explanation - why this score? */}
          {(() => {
            const cb = (analysis as any).confidence_breakdown;
            if (!cb) return null;

            // Count issues by severity
            const unknownCount = [cb.price, cb.title, cb.condition, cb.timing]
              .filter(d => d?.level === 'unknown').length;
            const lowCount = [cb.price, cb.title, cb.condition, cb.timing]
              .filter(d => d?.level === 'low').length;
            const mediumCount = [cb.price, cb.title, cb.condition, cb.timing]
              .filter(d => d?.level === 'medium').length;
            const highCount = [cb.price, cb.title, cb.condition, cb.timing]
              .filter(d => d?.level === 'high').length;

            // Build explanation parts
            const parts: string[] = [];
            if (unknownCount > 0) parts.push(`${unknownCount} critical missing`);
            if (lowCount > 0) parts.push(`${lowCount} evidence gap${lowCount > 1 ? 's' : ''}`);
            if (mediumCount > 0) parts.push(`${mediumCount} partial`);

            // If all high, say so
            if (highCount === 4) {
              return (
                <p className="text-xs mt-0.5 text-green-600 dark:text-green-400">
                  All 4 dimensions verified
                </p>
              );
            }

            if (parts.length === 0) return null;

            const levelLabel = fields.confidence <= 2 ? 'Low' : fields.confidence <= 3 ? 'Medium' : 'High';
            return (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {levelLabel} because: {parts.join(' + ')}
              </p>
            );
          })()}
        </div>
        {/* Confidence breakdown inline - clickable to jump to Summary and highlight */}
        {(() => {
          const cb = (analysis as any).confidence_breakdown;
          const bidReadiness = (analysis as any).bid_readiness;
          if (!cb) return null;
          const items = [
            { label: 'Price', data: cb.price, tab: 'summary' },
            { label: 'Title', data: cb.title, tab: 'summary' },
            { label: 'Condition', data: cb.condition, tab: 'summary' },
            { label: 'Timing', data: cb.timing, tab: 'summary' }
          ].filter(item => item.data?.level !== 'high');
          if (items.length === 0) return null;
          const levelColors: Record<string, string> = {
            medium: 'text-blue-600 dark:text-blue-400',
            low: 'text-yellow-600 dark:text-yellow-400',
            unknown: 'text-red-600 dark:text-red-400'
          };
          const levelBgColors: Record<string, string> = {
            medium: 'hover:bg-blue-50 dark:hover:bg-blue-950',
            low: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
            unknown: 'hover:bg-red-50 dark:hover:bg-red-950'
          };

          // Helper to navigate and highlight
          const navigateAndHighlight = (category: string) => {
            const tabTrigger = document.querySelector('[data-state][value="summary"]') as HTMLButtonElement;
            if (tabTrigger) {
              tabTrigger.click();
              // Dispatch custom event to highlight matching risk items
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('highlight-risk-item', {
                  detail: { category }
                }));
              }, 150);
            }
          };

          return (
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Gaps {bidReadiness?.blockers?.length > 0 && `(${bidReadiness.blockers.length} blockers)`}
              </p>
              <div className="text-xs space-y-0.5">
                {items.slice(0, 2).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => navigateAndHighlight(item.label)}
                    className={`text-left w-full px-1 py-0.5 rounded cursor-pointer transition-colors ${levelColors[item.data?.level] || ''} ${levelBgColors[item.data?.level] || ''}`}
                    title={item.data?.impact || `Click to highlight ${item.label.toLowerCase()} issues in Summary`}
                  >
                    → {item.label}: {item.data?.impact?.split('—')[0]?.trim() || item.data?.reason?.split(' ').slice(0, 4).join(' ') || item.data?.level}
                  </button>
                ))}
                {items.length > 2 && (
                  <button
                    onClick={() => {
                      const tabTrigger = document.querySelector('[data-state][value="summary"]') as HTMLButtonElement;
                      if (tabTrigger) {
                        tabTrigger.click();
                        setTimeout(() => {
                          const tabContent = document.querySelector('[data-state="active"][role="tabpanel"]');
                          tabContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }
                    }}
                    className="text-left w-full px-1 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                    style={{ color: 'var(--muted-foreground)' }}
                    title="Click to see all gaps in Summary tab"
                  >
                    → +{items.length - 2} more...
                  </button>
                )}
              </div>
            </div>
          );
        })()}
          </div>
        );
      })()}

      {/* Detailed Analysis Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="summary">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent">
              <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Summary
              </TabsTrigger>
              <TabsTrigger value="condition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Condition
              </TabsTrigger>
              <TabsTrigger value="investor" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Investor Lens
              </TabsTrigger>
              <TabsTrigger value="buyer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Buyer Lens
              </TabsTrigger>
              <TabsTrigger value="full" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Full Report
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="pt-6">
              <AnalysisSummary analysis={analysis} />
            </TabsContent>

            <TabsContent value="condition" className="pt-6">
              {analysis.condition ? (
                <div className="space-y-6">
                  {/* Condition Assessment Component */}
                  <ConditionAssessment
                    overallCondition={(analysis.condition as any).overall_grade || (analysis.condition as any).assessment_confidence}
                    areas={parseConditionData(analysis.condition)}
                    summary={(analysis.condition as any).condition_summary}
                    evidenceLedger={(analysis.condition as any).evidence_ledger}
                  />

                  {/* Vehicle/Trailer Info Card */}
                  {((analysis.condition as any).trailer_type || (analysis.condition as any).vehicle_type || (analysis.condition as any).dimensions || (analysis.condition as any).title_status) && (
                    <div
                      className="p-4 rounded-lg border"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="font-medium">Vehicle Details</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {((analysis.condition as any).trailer_type || (analysis.condition as any).vehicle_type) && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Type</p>
                            <p className="font-medium">
                              {(analysis.condition as any).trailer_type || (analysis.condition as any).vehicle_type}
                              {(analysis.condition as any).year && ` (${(analysis.condition as any).year})`}
                            </p>
                          </div>
                        )}
                        {(analysis.condition as any).dimensions && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Dimensions</p>
                            <p className="font-medium">
                              {(analysis.condition as any).dimensions.length_ft && `${(analysis.condition as any).dimensions.length_ft}ft`}
                              {(analysis.condition as any).dimensions.width_ft && ` x ${(analysis.condition as any).dimensions.width_ft}ft`}
                            </p>
                          </div>
                        )}
                        {(analysis.condition as any).title_status && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Title Status</p>
                            <Badge variant={(analysis.condition as any).title_status === 'clean' ? 'default' : 'destructive'}>
                              {(analysis.condition as any).title_status}
                            </Badge>
                          </div>
                        )}
                        {(analysis.condition as any).mileage && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Mileage</p>
                            <p className="font-medium font-mono">
                              {typeof (analysis.condition as any).mileage === 'number'
                                ? (analysis.condition as any).mileage.toLocaleString()
                                : (analysis.condition as any).mileage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Known Issues */}
                  {Array.isArray((analysis.condition as any).known_issues) && (analysis.condition as any).known_issues.length > 0 && (
                    <div
                      className="p-4 rounded-lg border-2"
                      style={{ borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium text-yellow-600 dark:text-yellow-400">Known Issues</span>
                      </div>
                      <ul className="space-y-2">
                        {(analysis.condition as any).known_issues.map((issue: any, idx: number) => {
                          // Handle both string and object formats
                          const issueText = typeof issue === 'string'
                            ? issue
                            : issue?.description || issue?.issue || issue?.text || JSON.stringify(issue);
                          return (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                              <span>{issueText}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Inspection Priorities from Condition */}
                  {Array.isArray((analysis.condition as any).inspection_priorities) && (analysis.condition as any).inspection_priorities.length > 0 && (
                    <InspectionChecklist
                      items={parseInspectionPriorities(
                        (analysis.condition as any).inspection_priorities
                      )}
                    />
                  )}

                  {/* Red Flags and Deal Killers are shown in Summary tab's Risk Assessment */}
                </div>
              ) : (
                <div
                  className="flex items-center gap-3 p-6 rounded-lg border-l-4 border-gray-400"
                  style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
                >
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Condition Data Not Available</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      The AI analysis did not include condition details for this item. Check the Full Report tab for any condition notes.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="investor" className="pt-6">
              {analysis.investor_lens ? (
                <div className="space-y-6">
                  {/* Verdict reasoning - structured display */}
                  {(analysis.investor_lens as any).verdict_reasoning && (
                    <VerdictReasoning reasoning={(analysis.investor_lens as any).verdict_reasoning} />
                  )}

                  {/* Investment Breakdown */}
                  <InvestmentBreakdown
                    currentBid={analysis.asset_summary?.current_bid || 0}
                    maxBid={fields.max_bid_mid}
                    buyerPremium={0.15}
                    salesTax={0.086}
                    estimatedRepairs={
                      typeof (analysis.investor_lens as any).repair_plan === 'object'
                        ? (analysis.investor_lens as any).repair_plan.grand_total || 0
                        : 0
                    }
                  />

                  {/* Repair Plan - structured display */}
                  {(analysis.investor_lens as any).repair_plan && (
                    <RepairPlan
                      items={
                        typeof (analysis.investor_lens as any).repair_plan === 'object' &&
                        (analysis.investor_lens as any).repair_plan.items
                          ? (analysis.investor_lens as any).repair_plan.items.map((item: any) => ({
                              name: item.description || item.name || 'Repair',
                              estimatedCost: item.cost || item.amount || 0,
                              priority: item.priority || 'important',
                              difficulty: item.difficulty,
                            }))
                          : parseRepairPlan(
                              typeof (analysis.investor_lens as any).repair_plan === 'string'
                                ? (analysis.investor_lens as any).repair_plan
                                : ''
                            )
                      }
                      totalEstimate={
                        typeof (analysis.investor_lens as any).repair_plan === 'object'
                          ? (analysis.investor_lens as any).repair_plan.grand_total
                          : undefined
                      }
                    />
                  )}

                  {/* Inspection Priorities are in Condition tab */}
                  {/* Deal Killers are in Summary tab's Risk Assessment */}
                </div>
              ) : (
                <p style={{ color: 'var(--muted-foreground)' }}>No investor analysis available.</p>
              )}
            </TabsContent>

            <TabsContent value="buyer" className="pt-6">
              {analysis.buyer_lens ? (
                <div className="space-y-6">
                  {/* Buyer Insights Component - use calculation_spine for prices (single source of truth) */}
                  {(() => {
                    const parsedData = parseBuyerLensData(analysis.buyer_lens);
                    // Use calculation_spine prices for meaningful spread - this is the single source of truth
                    const calcSpine = (analysis as any).calculation_spine;
                    const spineBasedPriceRange = calcSpine && calcSpine.quick_sale_price > 0 ? {
                      low: calcSpine.quick_sale_price,
                      mid: calcSpine.market_rate_price,
                      high: calcSpine.premium_price,
                    } : undefined;
                    // Fallback to retail estimate only if no calculation_spine
                    const retailEst = fields.retail_est || 0;
                    const fallbackPriceRange = retailEst > 0 ? {
                      low: Math.round(retailEst * 0.75),
                      mid: retailEst,
                      high: Math.round(retailEst * 1.25),
                    } : undefined;

                    // Get rich market demand assessment from API
                    const marketDemand = (analysis as any).market_demand as MarketDemandAssessment | undefined;

                    return (
                      <BuyerInsights
                        targetBuyers={
                          parsedData.targetBuyers ||
                          ((analysis.buyer_lens as any).target_buyer
                            ? [{ type: (analysis.buyer_lens as any).target_buyer }]
                            : undefined)
                        }
                        priceRange={spineBasedPriceRange || parsedData.priceRange || fallbackPriceRange}
                        marketDemand={marketDemand}
                        demandLevel={
                          parsedData.demandLevel ||
                          (analysis.buyer_lens as any).demand_level ||
                          (analysis.buyer_lens as any).market_demand ||
                          'unknown'
                        }
                        bestSellingPoints={
                          parsedData.bestSellingPoints ||
                          (analysis.buyer_lens as any).selling_points ||
                          (analysis.buyer_lens as any).key_features
                        }
                        daysOnMarket={parsedData.daysOnMarket}
                        seasonalFactors={parsedData.seasonalFactors}
                        localMarketNotes={parsedData.localMarketNotes}
                      />
                    );
                  })()}

                  {/* Perceived Value - if text available */}
                  {(analysis.buyer_lens as any).perceived_value && typeof (analysis.buyer_lens as any).perceived_value === 'string' && (
                    <div
                      className="p-4 rounded-lg border-2"
                      style={{ borderColor: 'rgba(59, 130, 246, 0.5)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400">Market Perception</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {(analysis.buyer_lens as any).perceived_value}
                      </p>
                    </div>
                  )}

                  {/* Objections Card */}
                  {(analysis.buyer_lens as any).objections?.length > 0 && (
                    <div
                      className="p-4 rounded-lg border"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="font-medium">Potential Objections & Rebuttals</span>
                        <HelpTooltip term="objections" explanation="Common concerns buyers may have, and suggested responses to overcome them." />
                      </div>
                      <div className="space-y-3">
                        {(analysis.buyer_lens as any).objections.map((obj: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border-l-4"
                            style={{
                              borderColor: 'rgba(245, 158, 11, 0.5)',
                              backgroundColor: 'rgba(245, 158, 11, 0.05)',
                              borderRightColor: 'var(--border)',
                              borderTopColor: 'var(--border)',
                              borderBottomColor: 'var(--border)',
                            }}
                          >
                            {typeof obj === 'string' ? (
                              <div className="flex items-start gap-2">
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Concern:</span>
                                <p className="text-sm">{obj}</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Concern:</span>
                                  <p className="text-sm">{obj.concern}</p>
                                </div>
                                {obj.rebuttal_strategy && (
                                  <div className="flex items-start gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <span className="text-green-600 dark:text-green-400 font-medium text-sm">Rebuttal:</span>
                                    <p className="text-sm">{obj.rebuttal_strategy}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Listing Strategy */}
                  {(analysis.buyer_lens as any).listing_strategy && (
                    <div
                      className="p-4 rounded-lg border-2"
                      style={{ borderColor: 'rgba(34, 197, 94, 0.5)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-green-600 dark:text-green-400">Recommended Listing Strategy</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {(analysis.buyer_lens as any).listing_strategy}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--muted-foreground)' }}>No buyer analysis available.</p>
              )}
            </TabsContent>

            <TabsContent value="full" className="pt-6">
              {/* Operator Brief - unified decision language */}
              {(() => {
                const verdict = fields.verdict as string;
                const bidReadiness = (analysis as any).bid_readiness;
                const isGated = bidReadiness?.status === 'NOT_BID_READY';
                const blockerCount = bidReadiness?.blockers?.length || 0;

                // Same canonical format as header
                const recommendation = verdict === 'PASS' ? 'PASS' :
                                       verdict === 'BUY' || verdict === 'STRONG_BUY' ? 'BUY' : 'WATCH';

                return (
                  <div
                    className="mb-6 p-4 rounded-lg border-l-4"
                    style={{
                      borderColor: recommendation === 'BUY' ? 'rgb(34, 197, 94)' :
                                   recommendation === 'WATCH' ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)',
                      backgroundColor: recommendation === 'BUY' ? 'rgba(34, 197, 94, 0.1)' :
                                       recommendation === 'WATCH' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <p className="font-bold text-lg">
                      {recommendation === 'BUY' ? '✅' : recommendation === 'WATCH' ? '⚠️' : '🛑'}{' '}
                      {recommendation}
                      {isGated && recommendation !== 'PASS' && ` — GATED (${blockerCount})`}
                    </p>
                    <p className="mt-1" style={{ color: 'var(--foreground)' }}>
                      <span className="font-medium">Max Bid:</span> {formatCurrency(fields.max_bid_mid)} — {
                        (analysis as any).investor_lens?.verdict_reasoning?.split('.')[0] ||
                        `${formatPercent(fields.expected_margin)} margin at ${formatCurrency(expectedSalePrice)} expected sale`
                      }
                    </p>
                    {isGated && bidReadiness?.blockers?.length > 0 && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        <span className="font-medium">Gates:</span>{' '}
                        {bidReadiness.blockers.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>
                );
              })()}
              <FullReport markdown={analysis.report_markdown || ''} />

              {/* Execution Playbook - Operational SOP, separate from analysis */}
              {(analysis as any).execution_playbook && (
                <details className="mt-6 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                  <summary
                    className="px-4 py-3 cursor-pointer font-medium text-sm flex items-center gap-2"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <span>📋 Execution Playbook</span>
                    <span className="text-xs font-normal" style={{ color: 'var(--muted-foreground)' }}>
                      (Operational SOP — not analysis)
                    </span>
                  </summary>
                  <div className="p-4 space-y-4 text-sm">
                    {(analysis as any).execution_playbook.if_bidding?.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">If Bidding:</p>
                        <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--muted-foreground)' }}>
                          {(analysis as any).execution_playbook.if_bidding.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(analysis as any).execution_playbook.if_won?.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">If Won:</p>
                        <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--muted-foreground)' }}>
                          {(analysis as any).execution_playbook.if_won.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(analysis as any).execution_playbook.listing_prep?.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Listing Prep:</p>
                        <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--muted-foreground)' }}>
                          {(analysis as any).execution_playbook.listing_prep.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

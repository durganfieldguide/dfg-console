'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RefreshCw, ChevronDown, TrendingUp } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Button } from '@/components/ui/Button';
import { ActiveFilterChip, ToggleFilterChip } from '@/components/ui/FilterChip';
import { listOpportunities, type ListOpportunitiesParams } from '@/lib/api';
import { cn, STATUS_LABELS, ACTIVE_STATUSES } from '@/lib/utils';
import type { OpportunitySummary, OpportunityStatus } from '@/types';

function OpportunitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state from URL
  const status = searchParams.get('status') as OpportunityStatus | null;
  const endingWithin = searchParams.get('ending_within') as '24h' | '48h' | '7d' | null;
  const scoreBand = searchParams.get('score_band') as 'high' | 'medium' | 'low' | null;
  // Sprint N+1: Staleness filters
  const stale = searchParams.get('stale') === 'true';
  const analysisStale = searchParams.get('analysis_stale') === 'true';
  const decisionStale = searchParams.get('decision_stale') === 'true';
  const endingSoon = searchParams.get('ending_soon') === 'true';
  const attention = searchParams.get('attention') === 'true';
  // Sprint N+3: Strike Zone filter
  const strikeZone = searchParams.get('strike_zone') === 'true';
  // Sprint N+3: Verification Needed filter
  const verificationNeeded = searchParams.get('verification_needed') === 'true';
  // Sprint N+4: New today filter (#71)
  const newToday = searchParams.get('new_today') === 'true';

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListOpportunitiesParams = {
        limit: 50,
      };

      if (status) params.status = status;
      if (endingWithin) params.ending_within = endingWithin;
      if (scoreBand) params.score_band = scoreBand;
      // Sprint N+1: Apply staleness filters
      if (stale) params.stale = true;
      if (analysisStale) params.analysis_stale = true;
      if (decisionStale) params.decision_stale = true;
      if (endingSoon) params.ending_soon = true;
      if (attention) params.attention = true;
      // Sprint N+3: Strike Zone filter
      if (strikeZone) params.strike_zone = true;
      // Sprint N+3: Verification Needed filter
      if (verificationNeeded) params.verification_needed = true;
      // Sprint N+4: New today filter
      if (newToday) params.new_today = true;

      const result = await listOpportunities(params);
      setOpportunities(result.opportunities);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [status, endingWithin, scoreBand, stale, analysisStale, decisionStale, endingSoon, attention, strikeZone, verificationNeeded, newToday]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/opportunities?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/opportunities');
  };

  const hasActiveFilters = status || endingWithin || scoreBand || stale || analysisStale || decisionStale || endingSoon || attention || strikeZone || verificationNeeded || newToday;
  const activeFilterCount = [status, endingWithin, scoreBand, stale, analysisStale, decisionStale, endingSoon, attention, strikeZone, verificationNeeded, newToday].filter(Boolean).length;

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Navigation />

      <main className="flex-1 pb-4 min-w-0 w-full max-w-[100vw] overflow-x-hidden overflow-y-auto">
        {/* Desktop Header - hidden on mobile, Navigation provides mobile header (#82, #116) */}
        <header className="hidden md:block sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 h-14 gap-2 min-w-0 max-w-full">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate shrink min-w-0">
              Opportunities
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
              )}
            </h1>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchOpportunities}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              {/* Buy Box Quick Toggle (#70) */}
              <Button
                variant={scoreBand === 'high' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => updateFilter('score_band', scoreBand === 'high' ? null : 'high')}
                title="Show only high-score opportunities (70+)"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Buy Box
              </Button>
              <Button
                variant={hasActiveFilters ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Active filters - chips row (both mobile and desktop) (#108, #103) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              {status && (
                <ActiveFilterChip label={STATUS_LABELS[status]} color="blue" onDismiss={() => updateFilter('status', null)} />
              )}
              {endingWithin && (
                <ActiveFilterChip label={endingWithin} color="orange" onDismiss={() => updateFilter('ending_within', null)} />
              )}
              {scoreBand && (
                <ActiveFilterChip
                  label={scoreBand === 'high' ? 'High Score' : scoreBand === 'medium' ? 'Medium' : 'Low'}
                  color="green"
                  onDismiss={() => updateFilter('score_band', null)}
                />
              )}
              {stale && (
                <ActiveFilterChip label="Stale" color="amber" onDismiss={() => updateFilter('stale', null)} />
              )}
              {analysisStale && (
                <ActiveFilterChip label="Re-analyze" color="blue" onDismiss={() => updateFilter('analysis_stale', null)} />
              )}
              {decisionStale && (
                <ActiveFilterChip label="Decision" color="red" onDismiss={() => updateFilter('decision_stale', null)} />
              )}
              {endingSoon && (
                <ActiveFilterChip label="Ending Soon" color="orange" onDismiss={() => updateFilter('ending_soon', null)} />
              )}
              {attention && (
                <ActiveFilterChip label="Attention" color="amber" onDismiss={() => updateFilter('attention', null)} />
              )}
              {strikeZone && (
                <ActiveFilterChip label="Strike Zone" color="orange" onDismiss={() => updateFilter('strike_zone', null)} />
              )}
              {verificationNeeded && (
                <ActiveFilterChip label="Verification" color="purple" onDismiss={() => updateFilter('verification_needed', null)} />
              )}
              {newToday && (
                <ActiveFilterChip label="New Today" color="blue" onDismiss={() => updateFilter('new_today', null)} />
              )}
              {/* Only show "Clear all" when multiple filters are active (#111) */}
              {activeFilterCount > 1 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </header>

        {/* Mobile Toolbar - action buttons below Navigation (#116) */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500">
            {total > 0 ? `${total} results` : 'Loading...'}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOpportunities}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              variant={scoreBand === 'high' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => updateFilter('score_band', scoreBand === 'high' ? null : 'high')}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Link
              href={`/opportunities/filters?${searchParams.toString()}`}
              className={cn(
                "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors px-3 py-1.5",
                hasActiveFilters
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              )}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Active Filters - chips row (#116, #103) */}
        {hasActiveFilters && (
          <div className="md:hidden flex flex-wrap items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            {status && (
              <ActiveFilterChip label={STATUS_LABELS[status]} color="blue" onDismiss={() => updateFilter('status', null)} />
            )}
            {scoreBand && (
              <ActiveFilterChip
                label={scoreBand === 'high' ? 'High Score' : scoreBand === 'medium' ? 'Medium' : 'Low'}
                color="green"
                onDismiss={() => updateFilter('score_band', null)}
              />
            )}
            {stale && (
              <ActiveFilterChip label="Stale" color="amber" onDismiss={() => updateFilter('stale', null)} />
            )}
            {analysisStale && (
              <ActiveFilterChip label="Re-analyze" color="blue" onDismiss={() => updateFilter('analysis_stale', null)} />
            )}
            {verificationNeeded && (
              <ActiveFilterChip label="Verification" color="purple" onDismiss={() => updateFilter('verification_needed', null)} />
            )}
            {activeFilterCount > 1 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Filter Panel - Desktop only: inline dropdown (#108, #113) */}
        {showFilters && (
          <div className="hidden md:block px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Status filter */}
                <div className="relative">
                  <select
                    value={status || ''}
                    onChange={(e) => updateFilter('status', e.target.value || null)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {ACTIVE_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Score filter */}
                <div className="relative">
                  <select
                    value={scoreBand || ''}
                    onChange={(e) => updateFilter('score_band', e.target.value || null)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Score</option>
                    <option value="high">High (70+)</option>
                    <option value="medium">Medium (40-69)</option>
                    <option value="low">Low (&lt;40)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Ending filter */}
                <div className="relative">
                  <select
                    value={endingWithin || ''}
                    onChange={(e) => updateFilter('ending_within', e.target.value || null)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Time</option>
                    <option value="24h">Ending in 24h</option>
                    <option value="48h">Ending in 48h</option>
                    <option value="7d">Ending in 7 days</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Divider */}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                {/* Toggle buttons (#103) */}
                <ToggleFilterChip label="Stale" color="amber" active={stale} onToggle={() => updateFilter('stale', stale ? null : 'true')} />
                <ToggleFilterChip label="Re-analyze" color="blue" active={analysisStale} onToggle={() => updateFilter('analysis_stale', analysisStale ? null : 'true')} />
                <ToggleFilterChip label="Verification" color="purple" active={verificationNeeded} onToggle={() => updateFilter('verification_needed', verificationNeeded ? null : 'true')} />
                <ToggleFilterChip label="Ending Soon" color="orange" active={endingSoon} onToggle={() => updateFilter('ending_soon', endingSoon ? null : 'true')} />
                <ToggleFilterChip label="Attention" color="amber" active={attention} onToggle={() => updateFilter('attention', attention ? null : 'true')} />
                <ToggleFilterChip label="Strike Zone" color="orange" active={strikeZone} onToggle={() => updateFilter('strike_zone', strikeZone ? null : 'true')} />
                <ToggleFilterChip label="New Today" color="blue" active={newToday} onToggle={() => updateFilter('new_today', newToday ? null : 'true')} />
              </div>
            </div>
        )}

        {/* Content */}
        <div className="p-4">
          {loading && opportunities.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No opportunities found</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}

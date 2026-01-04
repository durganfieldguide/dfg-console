'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RefreshCw, ChevronDown, TrendingUp, X } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Button } from '@/components/ui/Button';
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

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Navigation />

      <main className="flex-1 pb-4 min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        {/* Header - title hidden on mobile since Navigation provides it (#82) */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 h-14 gap-2 min-w-0 max-w-full">
            <h1 className="hidden md:block text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate shrink min-w-0">
              Opportunities
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
              )}
            </h1>
            {/* Mobile: show count only */}
            <span className="md:hidden text-sm text-gray-500">
              {total > 0 && `${total} results`}
            </span>

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
                <span className="hidden sm:inline">Buy Box</span>
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
                    {[status, endingWithin, scoreBand, stale, analysisStale, decisionStale, endingSoon, attention, strikeZone, verificationNeeded, newToday].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Active filters - chips row (both mobile and desktop) (#108) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              {status && (
                <button
                  onClick={() => updateFilter('status', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                >
                  {STATUS_LABELS[status]} <span className="text-blue-500">&times;</span>
                </button>
              )}
              {endingWithin && (
                <button
                  onClick={() => updateFilter('ending_within', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full"
                >
                  {endingWithin} <span className="text-orange-500">&times;</span>
                </button>
              )}
              {scoreBand && (
                <button
                  onClick={() => updateFilter('score_band', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full"
                >
                  {scoreBand === 'high' ? 'High Score' : scoreBand === 'medium' ? 'Medium' : 'Low'} <span className="text-green-500">&times;</span>
                </button>
              )}
              {stale && (
                <button
                  onClick={() => updateFilter('stale', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full"
                >
                  Stale <span className="text-amber-500">&times;</span>
                </button>
              )}
              {analysisStale && (
                <button
                  onClick={() => updateFilter('analysis_stale', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                >
                  Re-analysis <span className="text-blue-500">&times;</span>
                </button>
              )}
              {decisionStale && (
                <button
                  onClick={() => updateFilter('decision_stale', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full"
                >
                  Decision <span className="text-red-500">&times;</span>
                </button>
              )}
              {endingSoon && (
                <button
                  onClick={() => updateFilter('ending_soon', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full"
                >
                  Ending Soon <span className="text-orange-500">&times;</span>
                </button>
              )}
              {attention && (
                <button
                  onClick={() => updateFilter('attention', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full"
                >
                  Attention <span className="text-amber-500">&times;</span>
                </button>
              )}
              {strikeZone && (
                <button
                  onClick={() => updateFilter('strike_zone', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full"
                >
                  Strike Zone <span className="text-orange-500">&times;</span>
                </button>
              )}
              {verificationNeeded && (
                <button
                  onClick={() => updateFilter('verification_needed', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full"
                >
                  Verification <span className="text-purple-500">&times;</span>
                </button>
              )}
              {newToday && (
                <button
                  onClick={() => updateFilter('new_today', null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                >
                  New Today <span className="text-blue-500">&times;</span>
                </button>
              )}
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </header>

        {/* Filter Panel - Desktop: inline dropdown, Mobile: bottom sheet (#108) */}
        {showFilters && (
          <>
            {/* Mobile: Bottom sheet overlay */}
            <div className="md:hidden fixed inset-0 z-50">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowFilters(false)}
              />
              {/* Sheet */}
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl pb-safe">
                {/* Handle */}
                <div className="flex justify-center py-2">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* Filter options */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <div className="relative">
                      <select
                        value={status || ''}
                        onChange={(e) => updateFilter('status', e.target.value || null)}
                        className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Statuses</option>
                        {ACTIVE_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score</label>
                    <div className="relative">
                      <select
                        value={scoreBand || ''}
                        onChange={(e) => updateFilter('score_band', e.target.value || null)}
                        className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Any Score</option>
                        <option value="high">High (70+)</option>
                        <option value="medium">Medium (40-69)</option>
                        <option value="low">Low (&lt;40)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Ending */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ending</label>
                    <div className="relative">
                      <select
                        value={endingWithin || ''}
                        onChange={(e) => updateFilter('ending_within', e.target.value || null)}
                        className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Any Time</option>
                        <option value="24h">Within 24 hours</option>
                        <option value="48h">Within 48 hours</option>
                        <option value="7d">Within 7 days</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Toggle filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Filters</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateFilter('stale', stale ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          stale
                            ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Stale
                      </button>
                      <button
                        onClick={() => updateFilter('analysis_stale', analysisStale ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          analysisStale
                            ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Re-analysis
                      </button>
                      <button
                        onClick={() => updateFilter('verification_needed', verificationNeeded ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          verificationNeeded
                            ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Verification
                      </button>
                      <button
                        onClick={() => updateFilter('ending_soon', endingSoon ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          endingSoon
                            ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Ending Soon
                      </button>
                      <button
                        onClick={() => updateFilter('attention', attention ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          attention
                            ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Attention
                      </button>
                      <button
                        onClick={() => updateFilter('strike_zone', strikeZone ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          strikeZone
                            ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        Strike Zone
                      </button>
                      <button
                        onClick={() => updateFilter('new_today', newToday ? null : 'true')}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                          newToday
                            ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        New Today
                      </button>
                    </div>
                  </div>
                </div>
                {/* Footer actions */}
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="secondary" className="flex-1" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => setShowFilters(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop: Inline panel */}
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
                {/* Toggle buttons */}
                <button
                  onClick={() => updateFilter('stale', stale ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    stale
                      ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Stale
                </button>
                <button
                  onClick={() => updateFilter('analysis_stale', analysisStale ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    analysisStale
                      ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Re-analysis
                </button>
                <button
                  onClick={() => updateFilter('verification_needed', verificationNeeded ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    verificationNeeded
                      ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Verification
                </button>
                <button
                  onClick={() => updateFilter('ending_soon', endingSoon ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    endingSoon
                      ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Ending Soon
                </button>
                <button
                  onClick={() => updateFilter('attention', attention ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    attention
                      ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Attention
                </button>
                <button
                  onClick={() => updateFilter('strike_zone', strikeZone ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    strikeZone
                      ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Strike Zone
                </button>
                <button
                  onClick={() => updateFilter('new_today', newToday ? null : 'true')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                    newToday
                      ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  New Today
                </button>
              </div>
            </div>
          </>
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

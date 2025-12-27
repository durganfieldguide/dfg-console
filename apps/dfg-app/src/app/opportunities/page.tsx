'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RefreshCw, ChevronDown } from 'lucide-react';
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

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListOpportunitiesParams = {
        limit: 50,
      };

      if (status) params.status = status;
      if (endingWithin) params.ending_within = endingWithin;
      if (scoreBand) params.score_band = scoreBand;

      const result = await listOpportunities(params);
      setOpportunities(result.opportunities);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [status, endingWithin, scoreBand]);

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

  const hasActiveFilters = status || endingWithin || scoreBand;

  return (
    <div className="flex min-h-screen">
      <Navigation />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Opportunities
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
              )}
            </h1>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchOpportunities}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
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
                    {[status, endingWithin, scoreBand].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {/* Status filter */}
                <div className="relative">
                  <select
                    value={status || ''}
                    onChange={(e) => updateFilter('status', e.target.value || null)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {ACTIVE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
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

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </header>

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

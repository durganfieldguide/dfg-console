'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, STATUS_LABELS, ACTIVE_STATUSES } from '@/lib/utils';
import type { OpportunityStatus } from '@/types';

function FiltersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current filter values from URL
  const currentStatus = searchParams.get('status') as OpportunityStatus | null;
  const currentScoreBand = searchParams.get('score_band') as 'high' | 'medium' | 'low' | null;
  const currentEndingWithin = searchParams.get('ending_within') as '24h' | '48h' | '7d' | null;
  const currentStale = searchParams.get('stale') === 'true';
  const currentAnalysisStale = searchParams.get('analysis_stale') === 'true';
  const currentDecisionStale = searchParams.get('decision_stale') === 'true';
  const currentEndingSoon = searchParams.get('ending_soon') === 'true';
  const currentAttention = searchParams.get('attention') === 'true';
  const currentStrikeZone = searchParams.get('strike_zone') === 'true';
  const currentVerificationNeeded = searchParams.get('verification_needed') === 'true';
  const currentNewToday = searchParams.get('new_today') === 'true';

  // Build URL with updated filter
  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    return `/opportunities${queryString ? `?${queryString}` : ''}`;
  };

  // Navigate to opportunities with filter applied
  const applyFilter = (key: string, value: string | null) => {
    router.push(buildUrl({ [key]: value }));
  };

  // Toggle a boolean filter
  const toggleFilter = (key: string, currentValue: boolean) => {
    router.push(buildUrl({ [key]: currentValue ? null : 'true' }));
  };

  // Clear all filters
  const clearAll = () => {
    router.push('/opportunities');
  };

  // Go back without changes
  const goBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={goBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Filters
          </h1>
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Filter Sections */}
      <div className="p-4 space-y-6">
        {/* Status */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={!currentStatus}
                onChange={() => applyFilter('status', null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">All Statuses</span>
            </label>
            {ACTIVE_STATUSES.map((s) => (
              <label key={s} className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={currentStatus === s}
                  onChange={() => applyFilter('status', s)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-900 dark:text-white">{STATUS_LABELS[s]}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Score */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Score</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="score"
                checked={!currentScoreBand}
                onChange={() => applyFilter('score_band', null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Any Score</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="score"
                checked={currentScoreBand === 'high'}
                onChange={() => applyFilter('score_band', 'high')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">High (70+)</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="score"
                checked={currentScoreBand === 'medium'}
                onChange={() => applyFilter('score_band', 'medium')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Medium (40-69)</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="score"
                checked={currentScoreBand === 'low'}
                onChange={() => applyFilter('score_band', 'low')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Low (&lt;40)</span>
            </label>
          </div>
        </section>

        {/* Ending */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Ending</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="ending"
                checked={!currentEndingWithin}
                onChange={() => applyFilter('ending_within', null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Any Time</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="ending"
                checked={currentEndingWithin === '24h'}
                onChange={() => applyFilter('ending_within', '24h')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Within 24 hours</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="ending"
                checked={currentEndingWithin === '48h'}
                onChange={() => applyFilter('ending_within', '48h')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Within 48 hours</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="radio"
                name="ending"
                checked={currentEndingWithin === '7d'}
                onChange={() => applyFilter('ending_within', '7d')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Within 7 days</span>
            </label>
          </div>
        </section>

        {/* Quick Filters (toggles) */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Filters</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentStale}
                onChange={() => toggleFilter('stale', currentStale)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Stale</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentAnalysisStale}
                onChange={() => toggleFilter('analysis_stale', currentAnalysisStale)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Re-analyze</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentDecisionStale}
                onChange={() => toggleFilter('decision_stale', currentDecisionStale)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Decision Stale</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentEndingSoon}
                onChange={() => toggleFilter('ending_soon', currentEndingSoon)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Ending Soon</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentAttention}
                onChange={() => toggleFilter('attention', currentAttention)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Attention</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentStrikeZone}
                onChange={() => toggleFilter('strike_zone', currentStrikeZone)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Strike Zone</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentVerificationNeeded}
                onChange={() => toggleFilter('verification_needed', currentVerificationNeeded)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">Verification Needed</span>
            </label>
            <label className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentNewToday}
                onChange={() => toggleFilter('new_today', currentNewToday)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-white">New Today</span>
            </label>
          </div>
        </section>
      </div>

      {/* Fixed bottom button */}
      <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe">
        <Button
          variant="primary"
          className="w-full"
          onClick={goBack}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

export default function FiltersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <FiltersContent />
    </Suspense>
  );
}

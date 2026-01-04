'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { STATUS_LABELS, ACTIVE_STATUSES } from '@/lib/utils';
import type { OpportunityStatus } from '@/types';

function FiltersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for building filters before applying
  const [status, setStatus] = useState<string>(searchParams.get('status') || '');
  const [scoreBand, setScoreBand] = useState<string>(searchParams.get('score_band') || '');
  const [endingWithin, setEndingWithin] = useState<string>(searchParams.get('ending_within') || '');
  const [stale, setStale] = useState(searchParams.get('stale') === 'true');
  const [analysisStale, setAnalysisStale] = useState(searchParams.get('analysis_stale') === 'true');
  const [verificationNeeded, setVerificationNeeded] = useState(searchParams.get('verification_needed') === 'true');

  // Build URL with current filter state
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (scoreBand) params.set('score_band', scoreBand);
    if (endingWithin) params.set('ending_within', endingWithin);
    if (stale) params.set('stale', 'true');
    if (analysisStale) params.set('analysis_stale', 'true');
    if (verificationNeeded) params.set('verification_needed', 'true');
    const queryString = params.toString();
    return `/opportunities${queryString ? `?${queryString}` : ''}`;
  };

  // Apply filters and navigate back
  const applyFilters = () => {
    router.push(buildUrl());
  };

  // Clear all filters
  const clearAll = () => {
    setStatus('');
    setScoreBand('');
    setEndingWithin('');
    setStale(false);
    setAnalysisStale(false);
    setVerificationNeeded(false);
  };

  // Go back without changes
  const goBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
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

      {/* Filter Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Dropdown Selects */}
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">All Statuses</option>
                {ACTIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s as OpportunityStatus]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score
            </label>
            <div className="relative">
              <select
                value={scoreBand}
                onChange={(e) => setScoreBand(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">Any Score</option>
                <option value="high">High (70+)</option>
                <option value="medium">Medium (40-69)</option>
                <option value="low">Low (&lt;40)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Ending */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ending
            </label>
            <div className="relative">
              <select
                value={endingWithin}
                onChange={(e) => setEndingWithin(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">Any Time</option>
                <option value="24h">Within 24h</option>
                <option value="48h">Within 48h</option>
                <option value="7d">Within 7 days</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

        {/* Checkbox Toggles */}
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={stale}
              onChange={(e) => setStale(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3 text-sm text-gray-900 dark:text-white">Stale</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={analysisStale}
              onChange={(e) => setAnalysisStale(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3 text-sm text-gray-900 dark:text-white">Re-analyze</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={verificationNeeded}
              onChange={(e) => setVerificationNeeded(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3 text-sm text-gray-900 dark:text-white">Verification</span>
          </label>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe">
        <Button
          variant="primary"
          className="w-full"
          onClick={applyFilters}
        >
          Apply Filters
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

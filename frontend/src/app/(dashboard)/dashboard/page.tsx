'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  FireIcon,
  BoltIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { ActionStatCard } from '@/components/features/action-stat-card';
import { OpportunityRow } from '@/components/features/opportunity-row';
import { PipelineStatus } from '@/components/features/pipeline-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useMockMode } from '@/lib/hooks/use-mock-mode';
import { mockDashboardStats, delay } from '@/lib/api/mock-data';
import type { AuctionSource, DashboardStatsResponse, Listing, ListingWithAnalysis } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { useMockData } = useMockMode();
  const [selectedSource, setSelectedSource] = React.useState<AuctionSource>('sierra_auction');
  const [analyzingId, setAnalyzingId] = React.useState<string | null>(null);

  // Fetch dashboard stats with opportunity groupings
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      if (useMockData) {
        await delay(500);
        return mockDashboardStats;
      }
      const res = await fetch('/api/scout/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Run scout mutation
  const runScoutMutation = useMutation({
    mutationFn: async (source: AuctionSource) => {
      if (useMockData) {
        await delay(2000);
        return {
          success: true,
          run_id: `run-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}-${source}`,
          duration_ms: 12500,
          candidates: 45,
          fetched: 230,
          rejected: 185,
          source,
        };
      }
      const res = await fetch(`/api/scout/run?source=${source}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run scout');
      return res.json();
    },
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Scout completed',
        description: `Found ${data.candidates} candidates from ${data.source}`,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Scout failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Analyze listing mutation
  const analyzeMutation = useMutation({
    mutationFn: async (listing: Listing) => {
      setAnalyzingId(listing.id);
      if (useMockData) {
        await delay(3000);
        return { success: true, listing_id: listing.id };
      }
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
      if (!res.ok) throw new Error('Failed to analyze');
      return res.json();
    },
    onSuccess: (data, listing) => {
      setAnalyzingId(null);
      addToast({
        type: 'success',
        title: 'Analysis complete',
        description: `Analyzed ${listing.title}`,
      });

      // Store analysis result in sessionStorage for immediate use on analysis page
      const analysisData = {
        ...data,
        listing_id: listing.id,
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`analysis:${listing.id}`, JSON.stringify(analysisData));
        // Also cache listing for re-analysis capability
        sessionStorage.setItem(`listing:${listing.id}`, JSON.stringify(listing));
      }

      // Also persist to D1 for future retrieval (fire and forget)
      fetch('/api/scout/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData),
      }).catch(err => console.error('Failed to persist analysis:', err));

      // Invalidate dashboard stats so the listing moves to the correct section
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Navigate to analysis page
      router.push(`/analysis/${encodeURIComponent(listing.id)}`);
    },
    onError: (error) => {
      setAnalyzingId(null);
      addToast({
        type: 'error',
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleViewListing = (listing: Listing | ListingWithAnalysis) => {
    if ('analysis' in listing && listing.analysis) {
      router.push(`/analysis/${encodeURIComponent(listing.id)}`);
    } else {
      router.push(`/opportunities?listing=${encodeURIComponent(listing.id)}`);
    }
  };

  const handleBid = (listing: ListingWithAnalysis) => {
    // Open listing URL in new tab
    window.open(listing.url, '_blank');
  };

  const opportunities = stats?.opportunities;
  const recentRuns = stats?.recent_runs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            What needs your attention today
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })}
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Action Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <ActionStatCard
              title="Needs Analysis"
              count={opportunities?.needs_analysis || 0}
              description="New opportunities"
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              variant="info"
              actionLabel="Analyze"
              onClick={() => router.push('/opportunities?status=candidate')}
            />
            <ActionStatCard
              title="Ready to Act"
              count={opportunities?.ready_to_act || 0}
              description="BUY + high confidence"
              icon={<CheckCircleIcon className="h-5 w-5" />}
              variant="success"
              actionLabel="View Deals"
              onClick={() => router.push('/opportunities?status=analyzed&verdict=BUY')}
            />
            <ActionStatCard
              title="Under Review"
              count={opportunities?.under_review || 0}
              description="WATCH verdict"
              icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
              variant="warning"
              actionLabel="Review"
              onClick={() => router.push('/opportunities?status=analyzed&verdict=WATCH')}
            />
            <ActionStatCard
              title="Ending Soon"
              count={opportunities?.ending_soon || 0}
              description="< 24 hours left"
              icon={<ClockIcon className="h-5 w-5" />}
              variant="danger"
              actionLabel="View"
              onClick={() => router.push('/opportunities?ending_soon=true')}
            />
          </>
        )}
      </div>

      {/* Ready to Act Section */}
      {!statsLoading && (opportunities?.actionable?.length || 0) > 0 && (
        <section
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <FireIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="font-semibold">Ready to Act</h2>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                BUY verdict, high confidence
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/opportunities?status=analyzed&verdict=BUY')}
            >
              View All
            </Button>
          </div>
          <div className="p-4 space-y-2">
            {opportunities?.actionable?.slice(0, 3).map((listing) => (
              <OpportunityRow
                key={listing.id}
                listing={listing}
                variant="actionable"
                onView={() => handleViewListing(listing)}
                onBid={() => handleBid(listing)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Needs Analysis Section */}
      {!statsLoading && (opportunities?.top_candidates?.length || 0) > 0 && (
        <section
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold">Needs Analysis</h2>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {opportunities?.needs_analysis || 0} candidates
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const topCandidate = opportunities?.top_candidates?.[0];
                if (topCandidate) {
                  analyzeMutation.mutate(topCandidate);
                }
              }}
              loading={analyzeMutation.isPending}
              disabled={!opportunities?.top_candidates?.length}
            >
              Analyze Next
            </Button>
          </div>
          <div className="p-4 space-y-2">
            {opportunities?.top_candidates?.slice(0, 5).map((listing) => (
              <OpportunityRow
                key={listing.id}
                listing={listing}
                variant="candidate"
                onAnalyze={() => analyzeMutation.mutate(listing)}
                onView={() => handleViewListing(listing)}
                isAnalyzing={analyzingId === listing.id}
              />
            ))}
            {(opportunities?.needs_analysis || 0) > 5 && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/opportunities?status=candidate')}
                >
                  View All Candidates ({opportunities?.needs_analysis})
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Under Review Section */}
      {!statsLoading && (opportunities?.marginals?.length || 0) > 0 && (
        <section
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <QuestionMarkCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h2 className="font-semibold">Under Review</h2>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                WATCH - needs your judgment
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {opportunities?.marginals?.slice(0, 3).map((listing) => (
              <OpportunityRow
                key={listing.id}
                listing={listing}
                variant="marginal"
                onView={() => handleViewListing(listing)}
                onPass={() => {
                  // TODO: Implement pass action
                  addToast({ type: 'info', title: 'Pass action', description: 'Coming soon' });
                }}
                onPursue={() => {
                  // TODO: Implement pursue action
                  handleBid(listing);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ending Soon Section */}
      {!statsLoading && (opportunities?.ending_soon_items?.length || 0) > 0 && (
        <section
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h2 className="font-semibold">Ending Soon</h2>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Less than 24 hours
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {opportunities?.ending_soon_items?.slice(0, 3).map((listing) => (
              <OpportunityRow
                key={listing.id}
                listing={listing}
                variant="ending_soon"
                onView={() => handleViewListing(listing)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!statsLoading && !opportunities?.needs_analysis && !opportunities?.ready_to_act && !opportunities?.under_review && (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <h3 className="font-semibold mb-2">No opportunities yet</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Run Scout to discover new deals
          </p>
          <Button onClick={() => runScoutMutation.mutate(selectedSource)} loading={runScoutMutation.isPending}>
            Run Scout Now
          </Button>
        </div>
      )}

      {/* Pipeline Status (collapsed by default) */}
      <PipelineStatus
        sources={stats?.sources || ['sierra_auction']}
        recentRuns={recentRuns}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        onRunScout={() => runScoutMutation.mutate(selectedSource)}
        isRunning={runScoutMutation.isPending}
      />
    </div>
  );
}

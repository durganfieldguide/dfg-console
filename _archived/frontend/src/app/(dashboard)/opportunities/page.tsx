'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FunnelIcon,
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmModal } from '@/components/ui/modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { ScoreIndicator } from '@/components/features/score-indicator';
import { Countdown } from '@/components/features/countdown';
import { useMockMode } from '@/lib/hooks/use-mock-mode';
import { mockListings, getListingsByRunId, delay } from '@/lib/api/mock-data';
import { formatCurrency, truncate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Listing, AuctionSource, SortState } from '@/lib/types';

// Simple image component with error handling - avoids Next.js image optimization issues
function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = React.useState(false);

  if (error || !src) {
    return (
      <div
        className="h-12 w-12 rounded flex items-center justify-center"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          N/A
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12 rounded overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="object-cover w-full h-full"
        onError={() => setError(true)}
      />
    </div>
  );
}

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'sierra_auction', label: 'Sierra Auction' },
  { value: 'ironplanet', label: 'IronPlanet' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'buy_box', label: 'Buy Box' },
  { value: 'fleet_trucks', label: 'Fleet Trucks' },
  { value: 'welders', label: 'Welders' },
  { value: 'air_compressors', label: 'Air Compressors' },
  { value: 'generators', label: 'Generators' },
  { value: 'power_tools', label: 'Power Tools' },
  { value: 'tool_storage', label: 'Tool Storage' },
  { value: 'TRAILER_UTILITY', label: 'Utility Trailers' },
  { value: 'GENERATOR_PORTABLE', label: 'Portable Generators' },
  { value: 'WELDER_PRO', label: 'Professional Welders' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'candidate', label: 'New' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'rejected', label: 'Rejected' },
];

function OpportunitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { useMockData } = useMockMode();

  // URL params
  const runIdParam = searchParams.get('run_id');
  const sourceParam = searchParams.get('source') as AuctionSource | null;

  // Filters
  const [sourceFilter, setSourceFilter] = React.useState<string>(sourceParam || '');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [minScore, setMinScore] = React.useState<string>('');

  // Sorting
  const [sort, setSort] = React.useState<SortState>({
    field: 'buy_box_score',
    direction: 'desc',
  });

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [analyzingId, setAnalyzingId] = React.useState<string | null>(null);

  // Pagination
  const [displayCount, setDisplayCount] = React.useState(20);

  // Fetch listings - default to status=candidate to show only opportunities
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listings', runIdParam, sourceParam, statusFilter],
    queryFn: async () => {
      if (useMockData) {
        await delay(500);
        if (runIdParam) {
          return { listings: getListingsByRunId(runIdParam), total: mockListings.length };
        }
        return { listings: mockListings, total: mockListings.length };
      }
      const params = new URLSearchParams();
      if (runIdParam) params.set('run_id', runIdParam);
      if (sourceParam) params.set('source', sourceParam);
      // Only filter by status if explicitly set - otherwise show all non-rejected listings
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/scout/listings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      return res.json();
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async (listing: Listing) => {
      setAnalyzingId(listing.id);
      if (useMockData) {
        await delay(3000);
        return { success: true };
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
      if (!res.ok) throw new Error('Analysis failed');
      return res.json();
    },
    onSuccess: async (result, listing) => {
      setAnalyzingId(null);
      addToast({
        type: 'success',
        title: 'Analysis complete',
        description: `${listing.title} has been analyzed`,
      });

      // Store analysis result in sessionStorage for immediate use on analysis page
      const analysisData = {
        ...result,
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

      // Invalidate listings to update status
      queryClient.invalidateQueries({ queryKey: ['listings'] });

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

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (useMockData) {
        await delay(500);
        return { success: true };
      }
      const res = await fetch('/api/scout/listings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Reject failed');
      return res.json();
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setRejectModalOpen(false);
      addToast({
        type: 'success',
        title: 'Listings rejected',
        description: `${selectedIds.size} listings marked as rejected`,
      });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Reject failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Filter and sort listings
  const filteredListings = React.useMemo(() => {
    if (!data?.listings) return [];

    let filtered = [...data.listings];

    // Apply filters
    if (sourceFilter) {
      filtered = filtered.filter((l) => l.source === sourceFilter);
    }
    if (categoryFilter) {
      filtered = filtered.filter((l) => l.category_id === categoryFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.source_id.toLowerCase().includes(q)
      );
    }
    if (minScore) {
      const min = parseInt(minScore, 10);
      filtered = filtered.filter((l) => l.buy_box_score >= min);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sort.field === 'score') {
        aVal = a.buy_box_score;
        bVal = b.buy_box_score;
      } else if (sort.field === 'current_bid') {
        aVal = a.current_bid;
        bVal = b.current_bid;
      } else if (sort.field === 'auction_end_at') {
        aVal = a.auction_end_at || '';
        bVal = b.auction_end_at || '';
      } else {
        aVal = a[sort.field] as string | number;
        bVal = b[sort.field] as string | number;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sort.direction === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [data?.listings, sourceFilter, categoryFilter, statusFilter, searchQuery, minScore, sort]);

  const displayedListings = filteredListings.slice(0, displayCount);
  const hasMore = displayCount < filteredListings.length;

  const handleSort = (field: keyof Listing | 'score') => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedListings.map((l) => l.id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const SortIcon = ({ field }: { field: keyof Listing | 'score' }) => {
    if (sort.field !== field) return null;
    return sort.direction === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {runIdParam ? (
              <>
                Showing opportunities from run{' '}
                <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                  {truncate(runIdParam, 30)}
                </code>
              </>
            ) : (
              'Browse and analyze potential deals'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setRejectModalOpen(true)}>
              <XMarkIcon className="h-4 w-4" />
              Reject ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['listings'] })}
            disabled={isFetching}
          >
            <ArrowPathIcon className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="font-medium">Filters</span>
            {(sourceFilter || categoryFilter || statusFilter || searchQuery || minScore) && (
              <Badge variant="default" className="text-xs">
                {[sourceFilter, categoryFilter, statusFilter, searchQuery, minScore].filter(Boolean).length} active
              </Badge>
            )}
          </div>
          {(sourceFilter || categoryFilter || statusFilter || searchQuery || minScore) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSourceFilter('');
                setCategoryFilter('');
                setStatusFilter('');
                setSearchQuery('');
                setMinScore('');
              }}
            >
              <XMarkIcon className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search title or lot ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            options={sourceOptions}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={categoryOptions}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
          />
          <Input
            type="number"
            placeholder="Min score..."
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Showing <span className="font-medium">{displayedListings.length}</span> of{' '}
          <span className="font-medium">{filteredListings.length}</span> opportunities
        </p>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === displayedListings.length && displayedListings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                Title <SortIcon field="title" />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
              <TableHead
                className="text-right cursor-pointer"
                onClick={() => handleSort('current_bid')}
              >
                Bid <SortIcon field="current_bid" />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('score')}
              >
                Score <SortIcon field="score" />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('auction_end_at')}
              >
                Ends <SortIcon field="auction_end_at" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayedListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16">
                  <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      <SparklesIcon className="h-8 w-8" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                      {(sourceFilter || categoryFilter || statusFilter || searchQuery || minScore) ? (
                        'No listings match your current filters. Try adjusting or clearing your filters.'
                      ) : (
                        'No new opportunities are available right now. Run Scout to discover new deals from auction sources.'
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {(sourceFilter || categoryFilter || statusFilter || searchQuery || minScore) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSourceFilter('');
                            setCategoryFilter('');
                            setStatusFilter('');
                            setSearchQuery('');
                            setMinScore('');
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                      <Link href="/dashboard">
                        <Button size="sm">
                          <ArrowPathIcon className="h-4 w-4" />
                          Go to Dashboard
                        </Button>
                      </Link>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedListings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(listing.id)}
                      onChange={() => handleSelect(listing.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <SafeImage src={listing.image_url || ''} alt={listing.title} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={listing.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {truncate(listing.title || 'Untitled', 40)}
                    </Link>
                    <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                      #{listing.source_id || 'N/A'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(listing.source || 'default') as keyof typeof Badge}>
                      {listing.source?.replace('_', ' ') || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(listing.category_id || 'default') as keyof typeof Badge}>
                      {listing.category_id?.replace('_', ' ') || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(listing.current_bid || 0)}
                  </TableCell>
                  <TableCell>
                    <ScoreIndicator score={listing.buy_box_score || 0} />
                  </TableCell>
                  <TableCell>
                    <Countdown endDate={listing.auction_end_at} />
                  </TableCell>
                  <TableCell className="text-right">
                    {listing.status === 'analyzed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/analysis/${encodeURIComponent(listing.id)}`)}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => analyzeMutation.mutate(listing)}
                        loading={analyzingId === listing.id}
                        disabled={analyzingId !== null}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        Analyze
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <Button
              variant="outline"
              onClick={() => setDisplayCount((prev) => prev + 20)}
            >
              Load More ({filteredListings.length - displayCount} remaining)
            </Button>
          </div>
        )}
      </div>

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={() => rejectMutation.mutate(Array.from(selectedIds))}
        title="Reject Listings"
        description={`Are you sure you want to reject ${selectedIds.size} listing(s)? This will remove them from your opportunities.`}
        confirmText="Reject"
        variant="danger"
        loading={rejectMutation.isPending}
      />
    </div>
  );
}

function OpportunitiesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-96" />
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesLoading />}>
      <OpportunitiesContent />
    </Suspense>
  );
}

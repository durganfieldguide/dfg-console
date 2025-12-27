import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Listing, AnalysisResult, ListingWithAnalysis, OpportunityStats, DashboardStatsResponse } from '@/lib/types';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

// Helper to check if auction ends within N hours
function endsWithinHours(endDate: string | null, hours: number): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return diffMs > 0 && diffMs < hours * 60 * 60 * 1000;
}

// Merge listings with their analyses
function mergeWithAnalysis(
  listings: Listing[],
  analyses: Record<string, AnalysisResult>
): ListingWithAnalysis[] {
  return listings.map((listing) => ({
    ...listing,
    analysis: analyses[listing.id],
  }));
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${session.opsToken}`,
    };

    // Fetch base stats, listings, and analyses in parallel
    const [statsRes, listingsRes, analysesRes] = await Promise.all([
      fetch(`${SCOUT_BASE_URL}/ops/stats`, { headers }),
      fetch(`${SCOUT_BASE_URL}/ops/listings?limit=100`, { headers }),
      fetch(`${SCOUT_BASE_URL}/ops/analyses`, { headers }).catch(() => null),
    ]);

    if (!statsRes.ok) {
      const error = await statsRes.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch stats' },
        { status: statsRes.status }
      );
    }

    const baseStats = await statsRes.json();

    // Parse listings (may be empty if endpoint fails)
    let listings: Listing[] = [];
    if (listingsRes.ok) {
      const listingsData = await listingsRes.json();
      listings = listingsData.listings || listingsData || [];
    }

    // Parse analyses into a lookup map
    const analysesMap: Record<string, AnalysisResult> = {};
    if (analysesRes?.ok) {
      try {
        const analysesData = await analysesRes.json();
        const analysesArray: AnalysisResult[] = analysesData.analyses || analysesData || [];
        for (const analysis of analysesArray) {
          analysesMap[analysis.listing_id] = analysis;
        }
      } catch {
        // Analyses endpoint may not exist yet - that's ok
      }
    }

    // Compute opportunity stats
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Filter by opportunity state
    // Treat any non-analyzed, non-rejected, non-passed listing as a candidate
    const candidates = listings.filter((l) =>
      l.status === 'candidate' ||
      (!l.status || (l.status !== 'analyzed' && l.status !== 'rejected' && l.status !== 'passed'))
    );
    const analyzed = listings.filter((l) => l.status === 'analyzed');

    // Get analyzed items with their verdicts
    const analyzedWithAnalysis = mergeWithAnalysis(analyzed, analysesMap);

    // BUY verdicts with confidence >= 3
    const actionable = analyzedWithAnalysis.filter(
      (l) => l.analysis?.report_fields.verdict === 'BUY' &&
             (l.analysis?.report_fields.confidence || 0) >= 3
    );

    // WATCH verdicts (formerly MARGINAL)
    const marginals = analyzedWithAnalysis.filter(
      (l) => l.analysis?.report_fields.verdict === 'WATCH'
    );

    // Items ending within 24 hours (any non-rejected status)
    const endingSoon = listings.filter(
      (l) => l.status !== 'rejected' &&
             l.status !== 'passed' &&
             endsWithinHours(l.auction_end_at, 24)
    );
    const endingSoonWithAnalysis = mergeWithAnalysis(endingSoon, analysesMap);

    // Top candidates by score (for "needs analysis" section)
    const topCandidates = [...candidates]
      .sort((a, b) => b.buy_box_score - a.buy_box_score)
      .slice(0, 5);

    // Sort actionable by expected margin (highest first)
    const sortedActionable = [...actionable].sort((a, b) => {
      const marginA = a.analysis?.report_fields.expected_margin || 0;
      const marginB = b.analysis?.report_fields.expected_margin || 0;
      return marginB - marginA;
    });

    // Sort ending soon by end time (soonest first)
    const sortedEndingSoon = [...endingSoonWithAnalysis].sort((a, b) => {
      if (!a.auction_end_at) return 1;
      if (!b.auction_end_at) return -1;
      return new Date(a.auction_end_at).getTime() - new Date(b.auction_end_at).getTime();
    });

    const opportunities: OpportunityStats = {
      needs_analysis: candidates.length,
      ready_to_act: actionable.length,
      under_review: marginals.length,
      ending_soon: endingSoon.length,
      top_candidates: topCandidates,
      actionable: sortedActionable.slice(0, 10),
      marginals: marginals.slice(0, 10),
      ending_soon_items: sortedEndingSoon.slice(0, 10),
    };

    const response: DashboardStatsResponse = {
      ...baseStats,
      opportunities,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

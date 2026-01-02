import { Env } from '../env';
import { registry } from '../registry';

// Import adapters to ensure they register themselves
// Using named imports to prevent tree-shaking from removing these
import { SierraAdapter } from '../../sources/sierra/adapter';
import { IronPlanetAdapter } from '../../sources/ironplanet/adapter';

// Force side-effects (adapter registration) to not be tree-shaken
void [SierraAdapter, IronPlanetAdapter];

export async function getStats(env: Env) {
  try {
    // Get listing counts by status
    const listingCounts = await env.DFG_DB.prepare(`
      SELECT
        COUNT(*) AS total_listings,
        COALESCE(SUM(CASE WHEN status = 'candidate' THEN 1 ELSE 0 END), 0) AS total_candidates,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS total_rejected,
        COALESCE(SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END), 0) AS total_analyzed,
        COALESCE(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END), 0) AS total_purchased,
        COALESCE(SUM(CASE WHEN r2_snapshot_key IS NOT NULL AND r2_snapshot_key != '' THEN 1 ELSE 0 END), 0) AS archived_snapshots
      FROM listings
    `).first();

    // Fetch recent runs (last 10)
    const recentRunsResult = await env.DFG_DB.prepare(`
      SELECT
        run_id,
        started_at,
        completed_at,
        duration_ms,
        fetched as total_fetched,
        candidates as total_candidates,
        rejected as total_rejected,
        'sierra' as source
      FROM scout_runs
      ORDER BY started_at DESC
      LIMIT 10
    `).all();

    // Transform runs to frontend format
    const recent_runs = (recentRunsResult.results || []).map((run: any) => {
      const startedAt = run.started_at;
      const completedAt = run.completed_at;

      return {
        run_id: run.run_id,
        source: 'sierra_auction', // Map to frontend source name
        started_at: new Date(startedAt * 1000).toISOString(),
        completed_at: completedAt ? new Date(completedAt * 1000).toISOString() : null,
        total_candidates: run.total_candidates || 0,
        total_fetched: run.total_fetched || 0,
        total_rejected: run.total_rejected || 0,
        synced_count: 0, // Not tracked separately
        pending_count: 0, // Calculate if needed
        status: completedAt ? 'completed' : 'running',
        duration_ms: run.duration_ms || 0,
      };
    });

    // Get all registered sources and map to frontend names
    const registeredSources = registry.list();
    console.log('[getStats] Registered sources:', registeredSources, 'count:', registry.count());
    const sourceNameMap: Record<string, string> = {
      'sierra': 'sierra_auction',
      'ironplanet': 'ironplanet',
    };
    const sources = registeredSources.length > 0
      ? registeredSources.map(s => sourceNameMap[s] || s)
      : ['sierra_auction', 'ironplanet']; // Fallback if registry is empty

    return {
      success: true,
      timestamp: new Date().toISOString(),
      // Frontend-compatible format
      recent_runs,
      total_candidates: (listingCounts as any)?.total_candidates || 0,
      total_analyzed: (listingCounts as any)?.total_analyzed || 0,
      total_purchased: (listingCounts as any)?.total_purchased || 0,
      sources,
      // Legacy format for backwards compatibility
      database: listingCounts,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `D1_STATS_ERROR: ${error.message}`
    };
  }
}
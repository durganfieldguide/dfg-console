import { Env } from './core/env';
import { json, authorize } from './core/http';
import { runScout } from './core/pipeline/runScout';
import { getStats } from './core/pipeline/getStats';
import { registry } from './core/registry';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname, searchParams } = new URL(request.url);
    const cleanPath = pathname.replace(/\/$/, "");

    // Auth Checks
    const isOps = authorize(request, env, 'ops');
    const isAdmin = authorize(request, env, 'admin');

    // 1. Health Check (Public)
    if (cleanPath === '/health') {
      return json({ status: 'ok', env: env.ENVIRONMENT });
    }

    // 2. Stats Endpoint
    if (cleanPath === '/ops/stats') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
      try {
        const stats = await getStats(env);
        return json(stats);
      } catch (err: any) {
        return json({ error: 'Stats Failed', details: err.message }, 500);
      }
    }

    // 2b. Listings Endpoint (for frontend Opportunities page)
    if (cleanPath === '/ops/listings') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
      try {
        const source = searchParams.get('source');
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = `
          SELECT
            id,
            source,
            source_id,
            url,
            title,
            current_bid,
            category_id,
            buy_box_score,
            status,
            end_time as auction_end_at,
            location as location_text,
            image_url,
            photos,
            created_at,
            updated_at
          FROM listings
          WHERE 1=1
        `;
        const params: any[] = [];

        if (source) {
          // Accept both 'sierra' and legacy 'sierra_auction' (#100)
          const normalizedSource = source === 'sierra_auction' ? 'sierra' : source;
          query += ` AND source = ?`;
          params.push(normalizedSource);
        }

        if (status) {
          query += ` AND status = ?`;
          params.push(status);
        }

        if (category) {
          query += ` AND category_id = ?`;
          params.push(category);
        }

        query += ` ORDER BY buy_box_score DESC, created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const result = await env.DFG_DB.prepare(query).bind(...params).all();

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as count FROM listings WHERE 1=1`;
        const countParams: any[] = [];
        if (source) {
          // Accept both 'sierra' and legacy 'sierra_auction' (#100)
          const normalizedSource = source === 'sierra_auction' ? 'sierra' : source;
          countQuery += ` AND source = ?`;
          countParams.push(normalizedSource);
        }
        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }
        if (category) {
          countQuery += ` AND category_id = ?`;
          countParams.push(category);
        }

        const countResult = await env.DFG_DB.prepare(countQuery).bind(...countParams).first();
        const total = (countResult as any)?.count || 0;

        // Transform to frontend format
        const listings = (result.results || []).map((row: any) => {
          // Parse photos JSON
          let photos: string[] = [];
          if (row.photos) {
            try {
              photos = JSON.parse(row.photos);
            } catch {
              photos = row.image_url ? [row.image_url] : [];
            }
          } else if (row.image_url) {
            photos = [row.image_url];
          }

          return {
            id: row.id,
            source: row.source, // Return as-is; frontend handles display (#100)
            source_id: row.source_id,
            url: row.url,
            title: row.title,
            current_bid: row.current_bid || 0,
            category_id: row.category_id,
            buy_box_score: row.buy_box_score || 0,
            status: row.status,
            auction_end_at: row.auction_end_at ? new Date(row.auction_end_at * 1000).toISOString() : null,
            location: row.location_text ? { city: row.location_text, state: '', distance_miles: 0 } : null,
            image_url: row.image_url,
            photos,
            created_at: new Date(row.created_at * 1000).toISOString(),
            updated_at: new Date(row.updated_at * 1000).toISOString(),
          };
        });

        return json({ listings, total });
      } catch (err: any) {
        return json({ error: 'Listings fetch failed', details: err.message }, 500);
      }
    }

    // 2c. Single Listing Endpoint (for re-analyze)
    if (cleanPath.startsWith('/ops/listings/') && request.method === 'GET') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
      const listingId = decodeURIComponent(cleanPath.replace('/ops/listings/', ''));

      try {
        const result = await env.DFG_DB.prepare(`
          SELECT
            id,
            source,
            source_id,
            url,
            title,
            description,
            current_bid,
            category_id,
            buy_box_score,
            status,
            end_time as auction_end_at,
            location as location_text,
            image_url,
            photos,
            created_at,
            updated_at
          FROM listings
          WHERE id = ?
        `).bind(listingId).first();

        if (!result) {
          return json({ error: 'Listing not found' }, 404);
        }

        const row = result as any;

        // Parse photos JSON if present
        let photos: string[] = [];
        if (row.photos) {
          try {
            photos = JSON.parse(row.photos);
          } catch {
            photos = row.image_url ? [row.image_url] : [];
          }
        } else if (row.image_url) {
          photos = [row.image_url];
        }

        const listing = {
          id: row.id,
          source: row.source, // Return as-is; frontend handles display (#100)
          source_id: row.source_id,
          url: row.url,
          title: row.title,
          description: row.description || '',
          current_bid: row.current_bid || 0,
          category_id: row.category_id,
          buy_box_score: row.buy_box_score || 0,
          status: row.status,
          auction_end_at: row.auction_end_at ? new Date(row.auction_end_at * 1000).toISOString() : null,
          location: row.location_text ? { city: row.location_text, state: '', distance_miles: 0 } : null,
          image_url: row.image_url,
          photos,
          created_at: new Date(row.created_at * 1000).toISOString(),
          updated_at: new Date(row.updated_at * 1000).toISOString(),
        };

        return json(listing);
      } catch (err: any) {
        return json({ error: 'Failed to fetch listing', details: err.message }, 500);
      }
    }

    // 3. Run Pipeline
    if (cleanPath === '/ops/run') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
      const dryRun = searchParams.get('dryRun') === 'true';
      const source = searchParams.get('source') || undefined;
      const results = await runScout(env, { dryRun, source, ctx });
      return json(results);
    }

    // 4. Verify Snapshots
    if (cleanPath === '/ops/verify-snapshots') {
      if (!isOps) return json({ error: 'Unauthorized' }, 401);
      const list = await env.DFG_EVIDENCE.list({ limit: 5 });
      return json({ ok: true, count: list.objects.length, sample: list.objects });
    }

    // 5. GET Analysis by listing ID
    if (cleanPath.startsWith('/ops/analysis/') && request.method === 'GET') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);
      const listingId = decodeURIComponent(cleanPath.replace('/ops/analysis/', ''));

      try {
        const result = await env.DFG_DB.prepare(
          'SELECT * FROM analyses WHERE listing_id = ?'
        ).bind(listingId).first();

        if (!result) {
          return json({ error: 'Analysis not found', listing_id_searched: listingId }, 404);
        }

        // Parse the full_response JSON and return it
        let fullResponse = {};
        try {
          fullResponse = JSON.parse((result as any).full_response || '{}');
        } catch {
          // If parsing fails, return the raw fields
        }

        return json({
          listing_id: (result as any).listing_id,
          analysis_timestamp: (result as any).analysis_timestamp,
          report_fields: {
            verdict: (result as any).verdict,
            max_bid_mid: (result as any).max_bid_mid,
            max_bid_worst: (result as any).max_bid_worst,
            max_bid_best: (result as any).max_bid_best,
            retail_est: (result as any).retail_est,
            expected_profit: (result as any).expected_profit,
            expected_margin: (result as any).expected_margin,
            confidence: (result as any).confidence,
          },
          report_markdown: (result as any).report_markdown,
          ...fullResponse,
        });
      } catch (err: any) {
        return json({ error: 'Failed to fetch analysis', details: err.message }, 500);
      }
    }

    // 7. POST/PUT Analysis - Store analysis result
    if (cleanPath === '/ops/analysis' && (request.method === 'POST' || request.method === 'PUT')) {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);

      try {
        const body = await request.json() as any;
        const listingId = body.listing_id;

        if (!listingId) {
          return json({ error: 'listing_id is required' }, 400);
        }

        const analysisTimestamp = body.analysis_timestamp || new Date().toISOString();
        const reportFields = body.report_fields || {};
        const reportMarkdown = body.report_markdown || '';

        // Store the full response as JSON for complete retrieval
        const fullResponse = JSON.stringify(body);

        await env.DFG_DB.prepare(`
          INSERT INTO analyses (
            id, listing_id, analysis_timestamp, verdict,
            max_bid_mid, max_bid_worst, max_bid_best,
            retail_est, expected_profit, expected_margin,
            confidence, report_markdown, full_response, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
          ON CONFLICT(listing_id) DO UPDATE SET
            analysis_timestamp = excluded.analysis_timestamp,
            verdict = excluded.verdict,
            max_bid_mid = excluded.max_bid_mid,
            max_bid_worst = excluded.max_bid_worst,
            max_bid_best = excluded.max_bid_best,
            retail_est = excluded.retail_est,
            expected_profit = excluded.expected_profit,
            expected_margin = excluded.expected_margin,
            confidence = excluded.confidence,
            report_markdown = excluded.report_markdown,
            full_response = excluded.full_response,
            updated_at = strftime('%s','now')
        `).bind(
          `analysis-${listingId}`,
          listingId,
          analysisTimestamp,
          reportFields.verdict || 'PASS',
          reportFields.max_bid_mid || 0,
          reportFields.max_bid_worst || 0,
          reportFields.max_bid_best || 0,
          reportFields.retail_est || 0,
          reportFields.expected_profit || 0,
          reportFields.expected_margin || 0,
          reportFields.confidence || 1,
          reportMarkdown,
          fullResponse
        ).run();

        // Also update the listing status to 'analyzed'
        await env.DFG_DB.prepare(
          'UPDATE listings SET status = ? WHERE id = ?'
        ).bind('analyzed', listingId).run();

        return json({ success: true, listing_id: listingId });
      } catch (err: any) {
        return json({ error: 'Failed to store analysis', details: err.message }, 500);
      }
    }

    // 8. Photo Hydration Backfill - Process candidates missing photos or with only thumbnail
    if (cleanPath === '/ops/hydrate-backfill' && request.method === 'POST') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);

      try {
        const limit = parseInt(searchParams.get('limit') || '50');

        // Find candidates with <= 1 photo (missing or thumbnail-only)
        // Full hydration should return 5-15+ photos; 1 photo means only thumbnail was captured
        const candidates = await env.DFG_DB.prepare(`
          SELECT id, source, source_id, title, photos
          FROM listings
          WHERE status = 'candidate'
            AND (
              photos IS NULL
              OR photos = '[]'
              OR photos = ''
              OR json_array_length(photos) <= 1
            )
          LIMIT ?
        `).bind(limit).all();

        const results: { id: string; title: string; photoCount: number; error?: string }[] = [];

        for (const row of candidates.results || []) {
          const r = row as { id: string; source: string; source_id: string; title: string };
          try {
            const adapter = registry.get(r.source);
            if (adapter?.hydratePhotosForLot) {
              const photos = await adapter.hydratePhotosForLot(r.source_id);
              if (photos.length > 0) {
                await env.DFG_DB.prepare(`UPDATE listings SET photos = ? WHERE id = ?`)
                  .bind(JSON.stringify(photos), r.id)
                  .run();
                results.push({ id: r.id, title: r.title, photoCount: photos.length });
                console.log(`✅ Hydrated ${photos.length} photos for ${r.id}`);
              } else {
                results.push({ id: r.id, title: r.title, photoCount: 0, error: 'No photos returned from API' });
                console.log(`⚠️ No photos found for ${r.id}`);
              }
            } else {
              results.push({ id: r.id, title: r.title, photoCount: 0, error: `Adapter ${r.source} does not support photo hydration` });
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            results.push({ id: r.id, title: r.title, photoCount: 0, error: errorMsg });
            console.error(`❌ Photo hydration failed for ${r.id}:`, errorMsg);
          }
        }

        // Get remaining count (matching the query above)
        const remaining = await env.DFG_DB.prepare(`
          SELECT COUNT(*) as count FROM listings
          WHERE status = 'candidate'
            AND (
              photos IS NULL
              OR photos = '[]'
              OR photos = ''
              OR json_array_length(photos) <= 1
            )
        `).first();

        const remainingCount = (remaining as any)?.count ?? 0;

        return json({
          processed: results.length,
          successful: results.filter(r => r.photoCount > 0).length,
          failed: results.filter(r => r.photoCount === 0).length,
          remaining: remainingCount,
          results,
          message: remainingCount > 0
            ? `Run again to process next batch (${remainingCount} remaining)`
            : 'All candidates have been hydrated'
        });
      } catch (err: any) {
        return json({ error: 'Hydration backfill failed', details: err.message }, 500);
      }
    }

    // 9. Photo Stats - Check photo coverage (distinguishes thumbnail-only from fully hydrated)
    if (cleanPath === '/ops/photo-stats' && request.method === 'GET') {
      if (!(isOps || isAdmin)) return json({ error: 'Unauthorized' }, 401);

      try {
        // Count candidates by photo status: none, thumbnail-only (1), or fully hydrated (2+)
        const stats = await env.DFG_DB.prepare(`
          SELECT
            COUNT(*) as total_candidates,
            COUNT(CASE WHEN photos IS NULL OR photos = '[]' OR photos = '' THEN 1 END) as no_photos,
            COUNT(CASE WHEN json_array_length(photos) = 1 THEN 1 END) as thumbnail_only,
            COUNT(CASE WHEN json_array_length(photos) >= 2 THEN 1 END) as fully_hydrated,
            AVG(CASE WHEN json_array_length(photos) >= 1 THEN json_array_length(photos) END) as avg_photo_count
          FROM listings
          WHERE status = 'candidate'
        `).first();

        // Sample some fully hydrated to show URLs
        const sample = await env.DFG_DB.prepare(`
          SELECT id, title, photos, json_array_length(photos) as photo_count
          FROM listings
          WHERE status = 'candidate'
            AND json_array_length(photos) >= 2
          LIMIT 3
        `).all();

        // Count needing hydration (0 or 1 photo)
        const needsHydration = await env.DFG_DB.prepare(`
          SELECT COUNT(*) as count FROM listings
          WHERE status = 'candidate'
            AND (photos IS NULL OR photos = '[]' OR photos = '' OR json_array_length(photos) <= 1)
        `).first();

        return json({
          stats,
          needs_hydration: (needsHydration as any)?.count ?? 0,
          sample: (sample.results || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            photo_count: (r as any).photo_count,
            photos: JSON.parse(r.photos || '[]').slice(0, 3) // Show first 3 URLs only
          }))
        });
      } catch (err: any) {
        return json({ error: 'Photo stats failed', details: err.message }, 500);
      }
    }

    // Fallback 404 - no debug info in production (#97)
    return json({ error: 'Not Found' }, 404);
  },

  // Fixed: Standard ScheduledEvent handling for Cloudflare
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScout(env, { ctx }));
  }
};
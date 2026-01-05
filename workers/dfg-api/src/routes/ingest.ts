/**
 * Ingest route handler.
 * Converts Scout listings into opportunities for operator triage.
 */

import type { Env } from '../core/env';
import type { OpportunityStatus } from '../core/types';
import { json, jsonError, ErrorCodes, parseJsonBody } from '../core/http';
import { generateId, nowISO } from '../lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface IngestListing {
  id: string;
  source: string;
  source_id: string;
  url: string;
  title: string;
  description?: string;
  current_bid?: number;
  category_id?: string;
  buy_box_score?: number;
  status: string;
  end_time?: number; // Unix timestamp
  location?: string;
  image_url?: string;
  photos?: string[] | string; // Can be array or JSON string from D1
  created_at?: number; // Unix timestamp
  updated_at?: number; // Unix timestamp
}

interface IngestRequest {
  listings: IngestListing[];
  source?: string; // Optional source filter/tag
}

/**
 * Parse photos from listing - handles both JSON string (from D1) and array formats.
 */
function parsePhotos(photos: string[] | string | undefined | null): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface IngestResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ listing_id: string; error: string }>;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function handleIngest(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<IngestRequest>(request);
  if (!body || !body.listings) {
    return jsonError(ErrorCodes.INVALID_VALUE, 'listings array required', 400);
  }

  if (body.listings.length > 100) {
    return jsonError(ErrorCodes.BATCH_TOO_LARGE, 'Max 100 listings per ingest', 400);
  }

  const result: IngestResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const listing of body.listings) {
    try {
      const outcome = await processListing(env, listing);
      if (outcome === 'created') result.created++;
      else if (outcome === 'updated') result.updated++;
      else result.skipped++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ listing_id: listing.id, error: message });
    }
  }

  // Update source last_run
  if (body.source) {
    await updateSourceLastRun(env, body.source);
  }

  return json({
    data: result,
    meta: { processed_at: nowISO() },
  });
}

// =============================================================================
// PROCESS SINGLE LISTING
// =============================================================================

type ProcessOutcome = 'created' | 'updated' | 'skipped';

async function processListing(
  env: Env,
  listing: IngestListing
): Promise<ProcessOutcome> {
  // Only process candidate listings (or similar active statuses)
  const eligibleStatuses = ['candidate', 'new', 'active'];
  if (!eligibleStatuses.includes(listing.status)) {
    return 'skipped';
  }

  // Check if opportunity already exists for this listing
  const existing = await env.DB.prepare(`
    SELECT id, status FROM opportunities WHERE listing_id = ?
  `).bind(listing.id).first() as { id: string; status: string } | null;

  if (existing) {
    // Update if in inbox status (re-scrape)
    if (existing.status === 'inbox') {
      await updateOpportunity(env, existing.id, listing);
      return 'updated';
    }
    // Skip if already being processed
    return 'skipped';
  }

  // Create new opportunity
  await createOpportunity(env, listing);
  return 'created';
}

// =============================================================================
// CREATE OPPORTUNITY
// =============================================================================

async function createOpportunity(
  env: Env,
  listing: IngestListing
): Promise<void> {
  const id = generateId();
  const now = nowISO();
  const initialStatus: OpportunityStatus = 'inbox';

  // Use source as-is (#100: standardized to canonical names)
  const source = listing.source;

  // Parse end_time to ISO
  const auctionEndsAt = listing.end_time
    ? new Date(listing.end_time * 1000).toISOString()
    : null;

  // Build photos array - parse JSON string if needed (from D1 listings table)
  let photos: string[] = parsePhotos(listing.photos);
  if (photos.length === 0 && listing.image_url) {
    photos = [listing.image_url];
  }

  await env.DB.prepare(`
    INSERT INTO opportunities (
      id, source, source_lot_id, source_url, listing_id, status, status_changed_at,
      category_id, title, description, current_bid, auction_ends_at,
      buy_box_score, location, distance_miles, photos, primary_image_url,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    source,
    listing.source_id,
    listing.url,
    listing.id,
    initialStatus,
    now,
    listing.category_id || null,
    listing.title,
    listing.description || null,
    listing.current_bid || 0,
    auctionEndsAt,
    listing.buy_box_score || 0,
    listing.location || null,
    null, // distance_miles - not provided by scout
    JSON.stringify(photos),
    listing.image_url || photos[0] || null,
    now,
    now
  ).run();
}

// =============================================================================
// UPDATE OPPORTUNITY
// =============================================================================

async function updateOpportunity(
  env: Env,
  opportunityId: string,
  listing: IngestListing
): Promise<void> {
  const now = nowISO();

  // Parse end_time to ISO
  const auctionEndsAt = listing.end_time
    ? new Date(listing.end_time * 1000).toISOString()
    : null;

  // Build photos array - parse JSON string if needed (from D1 listings table)
  let photos: string[] = parsePhotos(listing.photos);
  if (photos.length === 0 && listing.image_url) {
    photos = [listing.image_url];
  }

  await env.DB.prepare(`
    UPDATE opportunities
    SET
      current_bid = ?,
      auction_ends_at = ?,
      buy_box_score = ?,
      description = COALESCE(?, description),
      photos = ?,
      primary_image_url = COALESCE(?, primary_image_url),
      updated_at = ?
    WHERE id = ?
  `).bind(
    listing.current_bid || 0,
    auctionEndsAt,
    listing.buy_box_score || 0,
    listing.description || null,
    JSON.stringify(photos),
    listing.image_url || photos[0] || null,
    now,
    opportunityId
  ).run();
}

// =============================================================================
// UPDATE SOURCE LAST RUN
// =============================================================================

async function updateSourceLastRun(env: Env, sourceId: string): Promise<void> {
  const now = nowISO();

  await env.DB.prepare(`
    UPDATE sources SET last_run_at = ?, updated_at = ? WHERE id = ?
  `).bind(now, now, sourceId).run();
}

// =============================================================================
// INGEST FROM SCOUT (INTERNAL)
// =============================================================================

/**
 * Pull listings directly from the scout's listings table.
 * This is called by a cron or scheduled task.
 * Also syncs photos for existing opportunities that need updating.
 */
export async function ingestFromScout(env: Env): Promise<IngestResult & { photos_synced?: number }> {
  const result: IngestResult & { photos_synced?: number } = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Query candidate listings from scout's listings table
  // Only get listings that aren't already in opportunities
  const listings = await env.DB.prepare(`
    SELECT
      l.id,
      l.source,
      l.source_id,
      l.url,
      l.title,
      l.description,
      l.current_bid,
      l.category_id,
      l.buy_box_score,
      l.status,
      l.end_time,
      l.location,
      l.image_url,
      l.photos,
      l.created_at,
      l.updated_at
    FROM listings l
    LEFT JOIN opportunities o ON l.id = o.listing_id
    WHERE l.status = 'candidate'
    AND o.id IS NULL
    LIMIT 50
  `).all();

  for (const row of listings.results || []) {
    const listing = row as unknown as IngestListing;
    try {
      const outcome = await processListing(env, { ...listing, status: 'candidate' });
      if (outcome === 'created') result.created++;
      else if (outcome === 'updated') result.updated++;
      else result.skipped++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ listing_id: listing.id, error: message });
    }
  }

  // Also sync photos for existing opportunities that need updating
  const photoSync = await syncPhotosFromListings(env);
  result.photos_synced = photoSync.updated;

  return result;
}

// =============================================================================
// SYNC PHOTOS FROM LISTINGS TO OPPORTUNITIES
// =============================================================================

interface PhotoSyncResult {
  updated: number;
  skipped: number;
  errors: Array<{ opportunity_id: string; error: string }>;
}

/**
 * Sync photos from listings table to opportunities.
 * Fixes opportunities that were created before photo hydration completed.
 * Also fixes double-encoded JSON issues.
 */
export async function syncPhotosFromListings(env: Env): Promise<PhotoSyncResult> {
  const result: PhotoSyncResult = {
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Find opportunities where listing has more photos than opportunity
  // or where opportunity photos are malformed (double-encoded)
  const opportunities = await env.DB.prepare(`
    SELECT
      o.id as opportunity_id,
      o.photos as opp_photos,
      l.photos as listing_photos,
      l.image_url,
      json_array_length(l.photos) as listing_photo_count
    FROM opportunities o
    JOIN listings l ON l.id = o.listing_id
    WHERE
      l.photos IS NOT NULL
      AND json_array_length(l.photos) > 1
      AND (
        -- Opportunity has no photos or malformed photos
        o.photos IS NULL
        OR o.photos = ''
        OR o.photos = '[]'
        -- Opportunity has fewer photos than listing (wasn't synced)
        OR json_array_length(o.photos) < json_array_length(l.photos)
        -- Opportunity photos are double-encoded (starts with escaped quote)
        OR o.photos LIKE '"%'
      )
  `).all();

  const now = nowISO();

  for (const row of opportunities.results || []) {
    const r = row as {
      opportunity_id: string;
      opp_photos: string | null;
      listing_photos: string | null;
      image_url: string | null;
      listing_photo_count: number;
    };

    try {
      // Parse listing photos
      let photos: string[] = parsePhotos(r.listing_photos);

      // Fallback to image_url if no photos
      if (photos.length === 0 && r.image_url) {
        photos = [r.image_url];
      }

      if (photos.length === 0) {
        result.skipped++;
        continue;
      }

      // Update opportunity with correct photos (single JSON.stringify)
      await env.DB.prepare(`
        UPDATE opportunities
        SET
          photos = ?,
          primary_image_url = COALESCE(primary_image_url, ?),
          updated_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(photos),
        photos[0] || null,
        now,
        r.opportunity_id
      ).run();

      result.updated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ opportunity_id: r.opportunity_id, error: message });
    }
  }

  return result;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function handleIngestRoute(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response> {
  // POST /api/ingest
  if (path === '/api/ingest' && method === 'POST') {
    return handleIngest(request, env);
  }

  // POST /api/ingest/sync - Sync from scout's listings table
  if (path === '/api/ingest/sync' && method === 'POST') {
    const result = await ingestFromScout(env);
    return json({
      data: result,
      meta: { synced_at: nowISO() },
    });
  }

  // POST /api/ingest/sync-photos - Sync photos from listings to opportunities
  if (path === '/api/ingest/sync-photos' && method === 'POST') {
    const result = await syncPhotosFromListings(env);
    return json({
      data: result,
      meta: { synced_at: nowISO() },
    });
  }

  return jsonError(ErrorCodes.NOT_FOUND, `Route not found: ${method} ${path}`, 404);
}

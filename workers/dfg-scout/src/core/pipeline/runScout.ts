import { Env, getConfig } from '../env';
import { registry } from '../registry';
import { buildListingId, NormalizedLot, toRouterInput } from '../types';
import '../../sources/sierra/adapter';
import '../../sources/ironplanet/adapter';
import { CategoryRouter, Verdict } from '../../categories/router';

// NOTE: R2 image proxying functions below are currently unused.
// The pipeline now stores source CDN URLs directly for speed.
// Kept for potential future use if R2 archival is re-enabled.

// function _getR2PublicBase(env: Env): string {
//   if (!env.R2_PUBLIC_URL) {
//     console.warn('[Scout] R2_PUBLIC_URL not configured');
//     return 'https://pub-dfg-evidence.r2.dev';
//   }
//   return env.R2_PUBLIC_URL;
// }

// async function _fetchImageWithRetry(...) { ... }
// async function _proxyPhotosToR2(...) { ... }

/**
 * Helper to safely track subrequests and prevent Worker crashes.
 * Ensures we stay under Cloudflare's 50-subrequest limit.
 */
async function trackSubrequest<T>(
	operation: () => Promise<T>,
	counter: { count: number },
	limit: number,
	description: string,
): Promise<T | null> {
	if (counter.count >= limit) {
		console.warn(`[Scout] Subrequest limit reached, skipping: ${description}`);
		return null;
	}
	counter.count++;
	return await operation();
}

/**
 * Main Scout pipeline orchestrator.
 * Source-agnostic: works with any adapter that returns NormalizedLot[].
 */
export async function runScout(env: Env, options: { dryRun?: boolean; ctx?: ExecutionContext; source?: string } = {}) {
	// Config currently unused but kept for future use (e.g., maxBid thresholds)
	void getConfig(env);
	const startTime = Date.now();
	const startTimeEpoch = Math.floor(startTime / 1000);

	// Determine which source(s) to run
	const sourceName = options.source || null;
	const sourcesToRun = sourceName ? [sourceName] : registry.list();

	// Generate run ID with source name if specified
	const runId = sourceName
		? `run-${new Date().toISOString().slice(0, 16).replace(/:/g, '').replace('T', '-')}-${sourceName}`
		: crypto.randomUUID();

	const subreq = { count: 0 };
	const SUBREQUEST_LIMIT = 45; // Leave buffer for D1 writes

	console.log(`[Scout] Starting run ${runId} in ${env.ENVIRONMENT} mode...`);
	console.log(`[Scout] Source filter: ${sourceName || 'ALL'}`);
	console.log(`[Scout] Registered sources: ${registry.list().join(', ')}`);
	// Statistics tracking
	const stats = {
		total: 0,
		fetched: 0,
		parsed: 0,
		new_listings: 0,
		updated_listings: 0,
		refreshed: 0,
		candidates: 0,
		rejected: 0,
		snapshots: 0,
		normalizationFailures: 0,
	};

	const rejectionCounts = new Map<string, number>();

	const d1Statements: any[] = [];
	const candidatesToSync: Array<{
		lot: NormalizedLot;
		d1Id: string;
		verdict: Verdict;
		needsSnapshot: boolean;
	}> = [];

	// Load existing state from D1 (include photos for self-healing hydration check)
	const existingListings = await trackSubrequest(
		() => env.DFG_DB.prepare(`SELECT id, current_bid, r2_snapshot_key, photos, status FROM listings`).all(),
		subreq,
		SUBREQUEST_LIMIT,
		'Load existing listings',
	);

	if (!existingListings) {
		return {
			success: false,
			run_id: runId,
			error: 'Subrequest limit reached before initial D1 state load',
			subrequests_used: subreq.count,
		};
	}

	const stateMap = new Map((existingListings as any).results?.map((r: any) => [r.id, r]));

	// =========================================================================
	// FETCH & NORMALIZE FROM SOURCES (filtered or all)
	// =========================================================================

	for (const sourceName of sourcesToRun) {
		const adapter = registry.get(sourceName);

		if (!adapter) {
			console.error(`[Scout] Source "${sourceName}" not found in registry. Available: ${registry.list().join(', ')}`);
			continue;
		}

		// Initialize source-specific router (loads only categories enabled for this source)
		const router = new CategoryRouter(env);
		const routerLoaded = await trackSubrequest(() => router.load(sourceName), subreq, SUBREQUEST_LIMIT, `Router Load (${sourceName})`);

		if (routerLoaded === null) {
			console.warn(`[Scout] Skipped ${sourceName} due to subrequest limit during router load`);
			continue;
		}

		const loadedCategories = router.getLoadedCategories();
		if (loadedCategories.length === 0) {
			console.log(`[Scout] Skipping ${sourceName} - no enabled categories for this source`);
			continue;
		}

		try {
			// Fetch active auctions
			const auctions = await trackSubrequest(
				() => adapter.fetchActiveAuctions(),
				subreq,
				SUBREQUEST_LIMIT,
				`Fetch Auctions (${sourceName})`,
			);

			if (!auctions) {
				console.warn(`[Scout] Skipped ${sourceName} due to subrequest limit`);
				continue;
			}

			console.log(`[Scout] Found ${auctions.length} active auctions from ${sourceName}`);

			// Fetch and normalize lots from each auction
			for (const auction of auctions) {
				const lots = await trackSubrequest(
					() => adapter.fetchLotsNormalized(auction.auctionId),
					subreq,
					SUBREQUEST_LIMIT,
					`Fetch Lots (${sourceName}:${auction.auctionId})`,
				);

				if (!lots) {
					console.warn(`[Scout] Skipped auction ${auction.auctionId} due to subrequest limit`);
					continue;
				}

				stats.total += lots.length;
				stats.fetched += lots.length;
				stats.parsed += lots.length;

				// =====================================================================
				// EVALUATE & PERSIST EACH NORMALIZED LOT
				// =====================================================================

				for (const lot of lots) {
					const d1Id = buildListingId(lot);

					// Evaluate lot using source-filtered router
					const routerInput = toRouterInput(lot);
					const verdict: Verdict = router.evaluate(routerInput);

					const previousState: any = stateMap.get(d1Id);
					const prevBid = previousState?.current_bid !== undefined ? Number(previousState.current_bid) : undefined;
					const hasPriceChanged = previousState ? prevBid !== lot.price.amount : true;

					if (!previousState) stats.new_listings++;
					else if (hasPriceChanged) stats.updated_listings++;
					else stats.refreshed++;

					// Upsert to D1 with normalized fields
					// Store photos as JSON array for analyst consumption
					const photosJson = lot.photoUrls && lot.photoUrls.length > 0 ? JSON.stringify(lot.photoUrls) : null;

					d1Statements.push(
						env.DFG_DB.prepare(
							`
              INSERT INTO listings (
                id,
                source,
                source_id,
                url,
                title,
                current_bid,
                status,
                category_id,
                buy_box_score,
                location_text,
                auction_end_at,
                image_url,
                photos,
                price_kind,
                price_verified,
                lot_status,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                url = excluded.url,
                title = excluded.title,
                current_bid = excluded.current_bid,
                status = excluded.status,
                category_id = excluded.category_id,
                buy_box_score = excluded.buy_box_score,
                location_text = excluded.location_text,
                auction_end_at = excluded.auction_end_at,
                image_url = excluded.image_url,
                -- IMPORTANT: Don't overwrite hydrated photos with thumbnail!
                -- Only update photos if new data has more items OR existing is empty
                photos = CASE
                  WHEN listings.photos IS NULL OR listings.photos = '' OR listings.photos = '[]' THEN excluded.photos
                  WHEN json_array_length(excluded.photos) > json_array_length(listings.photos) THEN excluded.photos
                  ELSE listings.photos
                END,
                price_kind = excluded.price_kind,
                price_verified = excluded.price_verified,
                lot_status = excluded.lot_status,
                updated_at = excluded.updated_at
            `,
						).bind(
							d1Id,
							lot.source,
							lot.sourceLotId,
							lot.sourceUrl,
							lot.title,
							lot.price.amount,
							verdict.status,
							verdict.categoryId,
							verdict.score,
							lot.locationText || null,
							lot.auctionEndAt || null,
							lot.imageUrl || null,
							photosJson,
							lot.price.kind,
							lot.price.verified ? 1 : 0,
							lot.lotStatus || null,
							startTimeEpoch,
						),
					);

					// Track candidates
					if (verdict.status === 'candidate') {
						stats.candidates++;

						// Queue candidates that need snapshots or photo hydration
						const needsSnapshot = verdict.requiresSnapshot && !previousState?.r2_snapshot_key;

						// Self-healing: Queue candidates missing photos OR with only thumbnail (1 photo)
						// Full hydration should return 5-15+ photos; 1 photo means only thumbnail was captured
						const existingPhotos = previousState?.photos;
						let photoCount = 0;
						if (existingPhotos && existingPhotos !== '[]' && existingPhotos !== '') {
							try {
								const parsed = JSON.parse(existingPhotos);
								photoCount = Array.isArray(parsed) ? parsed.length : 0;
							} catch {
								photoCount = 0;
							}
						}
						const needsPhotoHydration = photoCount <= 1; // 0 = missing, 1 = thumbnail only

						// Only add to sync queue if needs snapshot OR needs photo hydration
						if (needsSnapshot || needsPhotoHydration) {
							candidatesToSync.push({ lot, d1Id, verdict, needsSnapshot });
						}
					} else {
						stats.rejected++;
						const rr = verdict.rejectionReason || 'unknown';
						rejectionCounts.set(rr, (rejectionCounts.get(rr) || 0) + 1);
					}
				}
			}
		} catch (err: any) {
			console.error(`[Scout] Error processing source ${sourceName}:`, err.message);
			// Continue with other sources
		}
	}

	// =========================================================================
	// EXECUTE D1 STATE UPDATES IN BATCHES
	// =========================================================================

	const warnings: string[] = [];

	if (d1Statements.length > 0) {
		console.log(`[Scout] Persisting ${d1Statements.length} D1 statements...`);
		for (let i = 0; i < d1Statements.length; i += 100) {
			const ok = await trackSubrequest(
				() => env.DFG_DB.batch(d1Statements.slice(i, i + 100)),
				subreq,
				SUBREQUEST_LIMIT,
				`D1 batch write ${i}-${Math.min(i + 100, d1Statements.length)}`,
			);
			if (!ok) {
				warnings.push('Subrequest limit reached during D1 batch writes; some listing updates may be missing.');
				break;
			}
		}
	}

	// =========================================================================
	// D1 RUN LOG (Local Persistence)
	// =========================================================================

	try {
		const endTimeEpoch = Math.floor(Date.now() / 1000);
		const durationMs = Date.now() - startTime;

		const topRejections = Array.from(rejectionCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 8)
			.map(([reason, count]) => ({ reason, count }));

		const candidateRate = stats.total > 0 ? Number((stats.candidates / stats.total).toFixed(4)) : 0;
		const rejectionRate = stats.total > 0 ? Number((stats.rejected / stats.total).toFixed(4)) : 0;

		await trackSubrequest(
			() =>
				env.DFG_DB.prepare(
					`
        INSERT INTO scout_runs (
          run_id,
          started_at,
          completed_at,
          duration_ms,
          fetched,
          parsed,
          new_listings,
          updated_listings,
          candidates,
          rejected,
          refreshed,
          candidate_rate,
          rejection_rate,
          top_rejection_reasons,
          error_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          completed_at = excluded.completed_at,
          duration_ms = excluded.duration_ms,
          fetched = excluded.fetched,
          parsed = excluded.parsed,
          new_listings = excluded.new_listings,
          updated_listings = excluded.updated_listings,
          candidates = excluded.candidates,
          rejected = excluded.rejected,
          refreshed = excluded.refreshed,
          candidate_rate = excluded.candidate_rate,
          rejection_rate = excluded.rejection_rate,
          top_rejection_reasons = excluded.top_rejection_reasons,
          error_summary = excluded.error_summary
      `,
				)
					.bind(
						runId,
						startTimeEpoch,
						endTimeEpoch,
						durationMs,
						stats.fetched,
						stats.parsed,
						stats.new_listings,
						stats.updated_listings,
						stats.candidates,
						stats.rejected,
						stats.refreshed,
						candidateRate,
						rejectionRate,
						JSON.stringify(topRejections),
						warnings.length ? warnings.join(' | ') : null,
					)
					.run(),
			subreq,
			SUBREQUEST_LIMIT,
			'D1 run log insert',
		);
	} catch (d1Err: any) {
		console.error(`[Scout] D1 run log failed:`, d1Err.message);
		warnings.push(`D1 run log failed: ${d1Err.message}`);
	}

	// =========================================================================
	// BACKGROUND TASKS (Snapshots & Images) via ctx.waitUntil
	// =========================================================================

	if (options.ctx && !options.dryRun) {
		const backgroundWork = async () => {
			let snapshotsCompleted = 0;
			let photosHydratedCount = 0;
			let photosHydratedListings = 0;
			let photosFailed = 0;

			console.log(`[Scout] Starting background work for ${candidatesToSync.length} candidates`);

			// Process candidate for photo hydration (skip R2 proxy - too slow, use source CDN directly)
			const processCandidate = async (item: (typeof candidatesToSync)[0]) => {
				try {
					// Hydrate full photo gallery for candidates (if adapter supports it)
					const adapter = registry.get(item.lot.source);
					if (adapter?.hydratePhotosForLot && item.lot.sourceLotId) {
						try {
							const hydratedUrls = await adapter.hydratePhotosForLot(item.lot.sourceLotId);
							if (hydratedUrls.length > 0) {
								photosHydratedCount += hydratedUrls.length;
								photosHydratedListings++;
								// Store source CDN URLs directly (no R2 proxy - Analyst can fetch from CDN)
								const photosJson = JSON.stringify(hydratedUrls);
								await env.DFG_DB.prepare(`UPDATE listings SET photos = ? WHERE id = ?`).bind(photosJson, item.d1Id).run();
								console.log(`✅ [Scout] Hydrated ${hydratedUrls.length} photos for ${item.d1Id}`);
							} else {
								photosFailed++;
								console.log(`⚠️ [Scout] No photos returned for ${item.d1Id}`);
							}
						} catch (err: any) {
							photosFailed++;
							console.error(`❌ [Scout] Photo hydration failed for ${item.d1Id}: ${err.message}`);
						}
					}

					// Snapshots for new candidates
					if (item.needsSnapshot) {
						const snapshotKey = `snapshots/${item.d1Id}.json`;
						await env.DFG_EVIDENCE.put(snapshotKey, JSON.stringify(item.lot.raw));

						await env.DFG_DB.prepare(`UPDATE listings SET r2_snapshot_key = ? WHERE id = ?`).bind(snapshotKey, item.d1Id).run();

						snapshotsCompleted++;
					}
				} catch (err: any) {
					console.error(`[Scout] Background task failed for ${item.d1Id}:`, err.message);
				}
			};

			// Process candidates in parallel batches of 10 for speed
			const PARALLEL_BATCH_SIZE = 10;
			for (let i = 0; i < candidatesToSync.length; i += PARALLEL_BATCH_SIZE) {
				const batch = candidatesToSync.slice(i, i + PARALLEL_BATCH_SIZE);
				await Promise.all(batch.map(processCandidate));
				console.log(
					`[Scout] Processed batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(candidatesToSync.length / PARALLEL_BATCH_SIZE)}`,
				);
			}

			console.log(
				`[Scout] Background complete: ${snapshotsCompleted} snapshots, ${photosHydratedListings} listings hydrated (${photosHydratedCount} total photos), ${photosFailed} failed`,
			);
		};

		options.ctx.waitUntil(backgroundWork());
	}

	// =========================================================================
	// RETURN RESULTS
	// =========================================================================

	return {
		success: true,
		run_id: runId,
		duration_ms: Date.now() - startTime,
		...stats,
		subrequests_used: subreq.count,
		subrequests_remaining: SUBREQUEST_LIMIT - subreq.count,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

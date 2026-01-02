import type { AdapterContext, NormalizedLot, NormalizedSourceAdapter } from '../../core/types';
import { registry } from '../../core/registry';
import { safeNormalizeSierraLot } from './normalize';

// Sierra GraphQL endpoint (no auth currently)
const API_BASE = 'https://sierraauction.auctioneersoftware.com/api';

// Build inline GraphQL queries (Sierra's API rejects parameterized variable types)
function buildAuctionsQuery(): string {
  return `query{auctions(pagination:{page:1,pageSize:50},filter:{auction_status:[100,200],is_visible_on_front:true},order:{column:"end_time",direction:"asc"}){auctions{auction_id title end_time}}}`;
}

function buildLotsQuery(auctionId: string, page: number, pageSize: number): string {
  // List query: Sierra GraphQL only exposes 'primary_image' at lot list level
  // Full photo gallery requires per-lot hydration via lot() query
  return `query{auction(auction_id:"${auctionId}"){lots(pagination:{page:${page},pageSize:${pageSize}},filter:{is_visible:true}){lots{auction_lot_id lot_number title description winning_bid_amount starting_bid primary_image lot_location{city state{abbreviation}}auction_id auction{end_time}}}}}`;
}

function buildLotDetailQuery(lotId: string): string {
  // Detail query: fetch full photo gallery via images.cached_assets
  return `query{lot(auction_lot_id:"${lotId}"){auction_lot_id images{cached_assets{variant url}}}}`;
}

function getFetch(ctx?: AdapterContext): typeof fetch {
  return ctx?.fetch ?? fetch;
}

function nowMs(ctx?: AdapterContext): number {
  return ctx?.now ? ctx.now() : Date.now();
}

/**
 * Hydrate a single lot with full photo gallery from detail query.
 * Extracts 'large' variant URLs from cached_assets.
 */
async function hydrateLotImages(
  lotId: string,
  f: typeof fetch
): Promise<string[]> {
  try {
    const resp = await f(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: buildLotDetailQuery(lotId) }),
    });

    if (!resp.ok) return [];

    const data: any = await resp.json();
    if (data.errors?.length) return [];

    const images = data.data?.lot?.images || [];
    const urls: string[] = [];

    for (const img of images) {
      // Prefer 'large' variant for best quality
      const largeAsset = img.cached_assets?.find((a: any) => a.variant === 'large');
      if (largeAsset?.url) {
        urls.push(largeAsset.url);
      }
    }

    return urls;
  } catch {
    return [];
  }
}

export const SierraAdapter: NormalizedSourceAdapter = {
  source: 'sierra',

  /**
   * Returns active (not yet ended) auctions.
   * runScout will decide which ones to process.
   */
  async fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>> {
    const f = getFetch(ctx);

    const resp = await f(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: buildAuctionsQuery() }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Sierra Auctions Fetch Failed: ${resp.status} body=${body.slice(0, 500)}`);
    }

    const data: any = await resp.json();
    const now = nowMs(ctx);

    const auctions = (data.data?.auctions?.auctions || [])
      .filter((a: any) => {
        const end = new Date(a?.end_time).getTime();
        return Number.isFinite(end) ? end > now : true; // if missing/invalid end_time, keep it and let pipeline decide
      })
      .map((a: any) => ({
        auctionId: String(a.auction_id),
        title: a?.title,
        end_time: a?.end_time,
      }));

    return auctions;
  },

  /**
   * Fetch raw lots from a given auction.
   * Note: Photos are NOT hydrated here due to subrequest limits.
   * Use hydratePhotosForLot() separately for candidates only.
   */
  async fetchLots(auctionId: string, ctx?: AdapterContext): Promise<any[]> {
    const f = getFetch(ctx);

    const all: any[] = [];
    let page = 1;
    const pageSize = 500;

    while (true) {
      const resp = await f(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: buildLotsQuery(auctionId, page, pageSize) }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Sierra Lots Fetch Failed: ${resp.status} body=${body.slice(0, 800)}`);
      }

      const data: any = await resp.json();

      // Check for GraphQL errors
      if (data.errors?.length) {
        console.error(`[Sierra] GraphQL errors for auction ${auctionId}:`, data.errors);
        throw new Error(`Sierra GraphQL Error: ${data.errors[0]?.message || 'Unknown'}`);
      }

      const batch = data.data?.auction?.lots?.lots || [];
      all.push(...batch);

      if (batch.length < pageSize) break;
      page++;
    }

    console.log(`[Sierra] Fetched ${all.length} lots from auction ${auctionId}`);
    return all;
  },

  /**
   * Hydrate photos for a single lot (used for candidates only to save subrequests).
   * Returns array of large-variant photo URLs.
   */
  async hydratePhotosForLot(lotId: string, ctx?: AdapterContext): Promise<string[]> {
    const f = getFetch(ctx);
    return hydrateLotImages(lotId, f);
  },

  /**
   * Fetch and normalize lots into the canonical NormalizedLot contract.
   */
  async fetchLotsNormalized(auctionId: string, ctx?: AdapterContext): Promise<NormalizedLot[]> {
    const rawLots = await this.fetchLots!(auctionId, ctx);
    const n = nowMs(ctx);

    const results = rawLots.map((raw: unknown) => safeNormalizeSierraLot(raw, n));
    const successes = results.filter((r): r is { success: true; lot: NormalizedLot } => r.success);
    const failures = results.filter((r): r is { success: false; error: string; raw: unknown } => !r.success);

    if (failures.length > 0) {
      console.warn(
        `[Sierra] ${failures.length}/${rawLots.length} lots failed normalization for auction ${auctionId}`,
        failures.slice(0, 5).map((f) => ({ error: f.error }))
      );
    }

    console.log(`[Sierra] Normalized ${successes.length}/${rawLots.length} lots for auction ${auctionId}`);

    return successes.map((r) => r.lot);
  },
};

// Side-effect registration on import
registry.register(SierraAdapter);
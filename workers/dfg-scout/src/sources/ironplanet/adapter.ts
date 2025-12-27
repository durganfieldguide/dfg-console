import type { AdapterContext, NormalizedLot, NormalizedSourceAdapter } from '../../core/types';
import { registry } from '../../core/registry';
import { safeNormalizeIronPlanetLot, type IronPlanetQuickview } from './normalize';

/**
 * IronPlanet Source Adapter
 *
 * IronPlanet is an online marketplace for heavy equipment, trucks, and trailers.
 * Unlike Sierra which has a GraphQL API, IronPlanet embeds listing data in
 * JavaScript arrays within HTML pages.
 *
 * Data source: HTML pages with embedded quickviews[] JavaScript arrays
 * Pagination: No traditional pagination; results are loaded via category/filter params
 *
 * Key URL parameters:
 * - ct: top-level category (3 = Trucks & Trailers)
 * - c: sub-category (2268 = Utility Trailers, 2252 = Flatbed Trailers, etc.)
 * - l2: location filter (USA-AZ = Arizona)
 * - sm: search mode (0 = standard)
 */

const BASE_URL = 'https://www.ironplanet.com';
const SEARCH_PATH = '/jsp/s/search.ips';

// Category mappings for IronPlanet
// ct=3 is Trucks & Trailers
export const IRONPLANET_CATEGORIES = {
  TRUCKS_TRAILERS: { ct: '3' },
  UTILITY_TRAILERS: { ct: '3', c: '2268' },
  FLATBED_TRAILERS: { ct: '3', c: '2252' },
  DUMP_TRAILERS: { ct: '3', c: '2260' },
  ENCLOSED_TRAILERS: { ct: '3', c: '2262' },
  EQUIPMENT_TRAILERS: { ct: '3', c: '2264' },
  TRUCK_TRACTORS: { ct: '3', c: '2866' },
} as const;

// Default search configuration
const DEFAULT_SEARCH_CONFIG = {
  ct: '3',           // Trucks & Trailers
  l2: 'USA-AZ',      // Arizona
  sm: '0',           // Standard search mode
};

function getFetch(ctx?: AdapterContext): typeof fetch {
  return ctx?.fetch ?? fetch;
}

function nowMs(ctx?: AdapterContext): number {
  return ctx?.now ? ctx.now() : Date.now();
}

/**
 * Extract quickviews array from IronPlanet HTML response.
 *
 * IronPlanet embeds listing data in JavaScript like:
 *   quickviews.push({equipId:"123", description:"...", ...});
 *
 * The objects are valid JSON (double-quoted keys and values).
 * We find the start of each push() call and extract the JSON object.
 */
function extractQuickviews(html: string): IronPlanetQuickview[] {
  const quickviews: IronPlanetQuickview[] = [];

  // Find all occurrences of quickviews.push({ and extract the JSON object
  const pushPrefix = 'quickviews.push(';
  let searchStart = 0;

  while (true) {
    const pushIndex = html.indexOf(pushPrefix, searchStart);
    if (pushIndex === -1) break;

    // Find the opening brace
    const objStart = pushIndex + pushPrefix.length;
    if (html[objStart] !== '{') {
      searchStart = objStart;
      continue;
    }

    // Find matching closing brace by counting braces
    let braceCount = 0;
    let objEnd = objStart;
    for (let i = objStart; i < html.length; i++) {
      if (html[i] === '{') braceCount++;
      else if (html[i] === '}') braceCount--;

      if (braceCount === 0) {
        objEnd = i + 1;
        break;
      }
    }

    if (braceCount !== 0) {
      // Unbalanced braces, skip
      searchStart = objStart + 1;
      continue;
    }

    const jsonStr = html.slice(objStart, objEnd);
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.equipId) {
        quickviews.push(parsed);
      }
    } catch {
      // Skip malformed entries
    }

    searchStart = objEnd;
  }

  return quickviews;
}

/**
 * Extract total result count from page
 * Looks for patterns like "573 items" or "Items 1-96 of 573"
 */
function extractTotalCount(html: string): number | null {
  // Try "X items for Category"
  const itemsMatch = html.match(/(\d{1,3}(?:,\d{3})*)\s*items?\s+for/i);
  if (itemsMatch) {
    return parseInt(itemsMatch[1].replace(/,/g, ''), 10);
  }

  // Try "Items X-Y of Z"
  const ofMatch = html.match(/items?\s+\d+-\d+\s+of\s+(\d{1,3}(?:,\d{3})*)/i);
  if (ofMatch) {
    return parseInt(ofMatch[1].replace(/,/g, ''), 10);
  }

  return null;
}

/**
 * Build search URL with parameters
 */
function buildSearchUrl(params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  return `${BASE_URL}${SEARCH_PATH}?${searchParams.toString()}`;
}

/**
 * Fetch a single search results page and extract listings
 */
async function fetchSearchPage(
  params: Record<string, string>,
  f: typeof fetch
): Promise<{ quickviews: IronPlanetQuickview[]; totalCount: number | null }> {
  const url = buildSearchUrl(params);

  const resp = await f(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DFG-Scout/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!resp.ok) {
    throw new Error(`IronPlanet fetch failed: ${resp.status} ${resp.statusText}`);
  }

  const html = await resp.text();
  const quickviews = extractQuickviews(html);
  const totalCount = extractTotalCount(html);

  return { quickviews, totalCount };
}

export const IronPlanetAdapter: NormalizedSourceAdapter = {
  source: 'ironplanet',

  /**
   * IronPlanet doesn't have a traditional auction model like Sierra.
   * Instead, we treat each category/location combination as a "virtual auction"
   * to fit the adapter interface.
   *
   * Returns configured search categories as auction entries.
   */
  async fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>> {
    // For now, we return a single "auction" representing the AZ Trucks & Trailers search
    // In the future, this could be expanded to multiple categories or locations
    return [
      {
        auctionId: 'az-trucks-trailers',
        title: 'Arizona Trucks & Trailers',
        searchParams: { ...DEFAULT_SEARCH_CONFIG },
      },
      // Uncomment to add more category searches:
      // {
      //   auctionId: 'az-utility-trailers',
      //   title: 'Arizona Utility Trailers',
      //   searchParams: { ...DEFAULT_SEARCH_CONFIG, c: '2268' },
      // },
    ];
  },

  /**
   * Fetch all lots for a given "auction" (search category)
   */
  async fetchLots(auctionId: string, ctx?: AdapterContext): Promise<IronPlanetQuickview[]> {
    const f = getFetch(ctx);

    // Determine search params based on auctionId
    let searchParams: Record<string, string>;
    switch (auctionId) {
      case 'az-utility-trailers':
        searchParams = { ...DEFAULT_SEARCH_CONFIG, c: '2268' };
        break;
      case 'az-flatbed-trailers':
        searchParams = { ...DEFAULT_SEARCH_CONFIG, c: '2252' };
        break;
      case 'az-trucks-trailers':
      default:
        searchParams = { ...DEFAULT_SEARCH_CONFIG };
        break;
    }

    const all: IronPlanetQuickview[] = [];
    const seenIds = new Set<string>();

    // IronPlanet doesn't have clear pagination, but we can try multiple approaches:
    // 1. First fetch - get initial results
    const { quickviews, totalCount } = await fetchSearchPage(searchParams, f);

    for (const qv of quickviews) {
      if (qv.equipId && !seenIds.has(qv.equipId)) {
        seenIds.add(qv.equipId);
        all.push(qv);
      }
    }

    console.log(`[IronPlanet] Fetched ${all.length} listings for ${auctionId} (total available: ${totalCount ?? 'unknown'})`);

    // Note: IronPlanet may have more results than what's shown on the first page.
    // To get all results, we might need to:
    // - Use different sub-categories to capture more listings
    // - Implement scroll/load-more simulation (complex)
    // For now, we capture what's on the initial page load.
    //
    // If we need more comprehensive coverage, we can add additional
    // "auctions" for each sub-category.

    return all;
  },

  /**
   * Fetch and normalize lots into NormalizedLot format
   */
  async fetchLotsNormalized(auctionId: string, ctx?: AdapterContext): Promise<NormalizedLot[]> {
    const rawLots = await this.fetchLots(auctionId, ctx);
    const n = nowMs(ctx);

    const results = rawLots.map((raw) => safeNormalizeIronPlanetLot(raw, n));
    const successes = results.filter((r) => r.success) as Array<{ success: true; lot: NormalizedLot }>;
    const failures = results.filter((r) => !r.success) as Array<{ success: false; error: string; raw: unknown }>;

    if (failures.length > 0) {
      console.warn(
        `[IronPlanet] ${failures.length}/${rawLots.length} lots failed normalization for ${auctionId}`,
        failures.slice(0, 3).map((f) => ({ error: f.error }))
      );
    }

    console.log(`[IronPlanet] Normalized ${successes.length}/${rawLots.length} lots for ${auctionId}`);

    return successes.map((r) => r.lot);
  },

  /**
   * Optional: Fetch full photo gallery for a single lot.
   * IronPlanet item pages may have additional photos beyond the thumbnail.
   * For now, we don't implement this as the initial thumbnail is usually sufficient.
   */
  // async hydratePhotosForLot(lotId: string, ctx?: AdapterContext): Promise<string[]> {
  //   // Could fetch /jsp/s/item/{lotId} and extract photo gallery
  //   return [];
  // },
};

// Side-effect registration on import
registry.register(IronPlanetAdapter);

/**
 * Core type definitions for the DFG Scout normalization layer.
 * These types define the contract between source adapters and the pipeline.
 *
 * Canonical location: src/core/types.ts
 * No other shared types modules should exist.
 */

// =============================================================================
// PRICE TYPES
// =============================================================================

export type PriceKind =
  | 'winning_bid'    // verified: current top bid in active auction
  | 'current_bid'    // verified: if a source distinguishes current from winning
  | 'starting_bid'   // unverified: opening/min/reserve-like
  | 'reserve'        // unverified: explicit reserve amount
  | 'buy_now'        // verified: fixed purchase option
  | 'sold'           // verified: final hammer price / closed result
  | 'estimate'       // unverified: platform/appraiser estimate
  | 'none';

export type NormalizedPrice = {
  amount: number;          // 0 if unknown
  kind: PriceKind;
  verified: boolean;       // derived from kind (but stored explicitly for observability)
  sourceField?: string;    // debugging: where this came from
  currency?: string;       // default 'USD'
};

/**
 * Compute the canonical D1 listing id for a normalized lot.
 * Format:
 *  - With auction id:   "{source}:{sourceAuctionId}:{sourceLotId}" (e.g., "sierra:6817:485894")
 *  - Without auction id:"{source}:{sourceLotId}" (e.g., "govdeals:12345")
 */
export function buildListingId(lot: Pick<NormalizedLot, 'source' | 'sourceAuctionId' | 'sourceLotId'>): string {
  const src = String(lot.source).trim();
  const lotId = String(lot.sourceLotId).trim();
  const auc = lot.sourceAuctionId ? String(lot.sourceAuctionId).trim() : '';
  return auc ? `${src}:${auc}:${lotId}` : `${src}:${lotId}`;
}

export function isPriceVerified(kind: PriceKind): boolean {
  return ['winning_bid', 'current_bid', 'buy_now', 'sold'].includes(kind);
}

// =============================================================================
// LOT STATUS
// =============================================================================

export type LotStatus =
  | 'upcoming'      // Auction hasn't started
  | 'active'        // Auction live, accepting bids
  | 'closing'       // Less than 1 hour remaining
  | 'closed'        // Auction ended
  | 'sold'          // Lot sold
  | 'unsold'        // Lot didn't meet reserve
  | 'unknown';

// =============================================================================
// NORMALIZED LOT (The Core Contract)
// =============================================================================

export type NormalizedLot = {
  source: string;              // 'sierra', 'rbid', 'govdeals', etc.
  sourceAuctionId?: string;    // Optional - not all sources have auctions
  sourceLotId: string;         // Pure lot identifier (e.g., '485894')
  sourceUrl: string;           // Direct link to lot on source platform

  title: string;               // Required (fallback: 'Untitled Lot')
  description?: string;        // Optional

  auctionStartAt?: string;     // ISO datetime
  auctionEndAt?: string;       // ISO datetime
  lotStatus?: LotStatus;

  locationText?: string;       // e.g., "Phoenix, AZ"

  price: NormalizedPrice;

  imageUrl?: string;           // Primary image URL (thumbnail)
  photoUrls?: string[];        // Full gallery URLs (for analyst)
  photoCount?: number;         // Total photos reported by source

  sourceCategories?: string[]; // Source's native categories
  sourceTags?: string[];       // Source's native tags

  raw: unknown;                // Preserve raw for evidence + future parsing
};

// =============================================================================
// ROUTER INPUT (Minimal, Stable)
// =============================================================================

export type RouterInput = {
  title: string;
  description: string;         // Required; default to ''
  price: number;
  priceVerified: boolean;
  priceKind: PriceKind;
  locationText?: string;
  auctionEndAt?: string;
  lotStatus?: LotStatus;
};

export function toRouterInput(lot: NormalizedLot): RouterInput {
  return {
    title: lot.title,
    description: lot.description || '',
    price: lot.price.amount,
    priceVerified: lot.price.verified,
    priceKind: lot.price.kind,
    locationText: lot.locationText,
    auctionEndAt: lot.auctionEndAt,
    lotStatus: lot.lotStatus,
  };
}

// =============================================================================
// ADAPTER CONTEXT (Injected by runScout)
// =============================================================================

export type AdapterContext = {
  /** Budgeted fetch injected by the pipeline to enforce subrequest limits */
  fetch: typeof fetch;
  /** Optional clock injection for deterministic tests */
  now?: () => number;
};

// =============================================================================
// VALIDATION
// =============================================================================

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: unknown) {
    super(`Validation failed for field '${field}': ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Enforce consistency between a price kind and its verified flag.
 * This is intentionally strict to prevent silent production drift.
 */
export function validatePriceVerified(price: Pick<NormalizedPrice, 'kind' | 'verified'>): void {
  const expected = isPriceVerified(price.kind);
  if (price.verified !== expected) {
    throw new ValidationError(
      `price.verified must match isPriceVerified(price.kind). Expected ${expected} for kind='${price.kind}'.`,
      'price.verified',
      price.verified
    );
  }
}

export function validateNormalizedLot(lot: NormalizedLot): void {
  // Required fields
  if (!lot.source || typeof lot.source !== 'string' || lot.source.trim() === '') {
    throw new ValidationError('source is required and must be non-empty string', 'source', lot.source);
  }

  if (!lot.sourceLotId || typeof lot.sourceLotId !== 'string' || lot.sourceLotId.trim() === '') {
    throw new ValidationError('sourceLotId is required and must be non-empty string', 'sourceLotId', lot.sourceLotId);
  }

  if (lot.sourceAuctionId !== undefined && String(lot.sourceAuctionId).trim() === '') {
    throw new ValidationError('sourceAuctionId, if provided, must be a non-empty string', 'sourceAuctionId', lot.sourceAuctionId);
  }

  if (!lot.sourceUrl || typeof lot.sourceUrl !== 'string' || !lot.sourceUrl.startsWith('http')) {
    throw new ValidationError('sourceUrl must be a valid HTTP(S) URL', 'sourceUrl', lot.sourceUrl);
  }

  if (!lot.title || typeof lot.title !== 'string' || lot.title.trim() === '') {
    throw new ValidationError('title is required and must be non-empty string', 'title', lot.title);
  }

  // Price validation
  if (typeof lot.price?.amount !== 'number' || lot.price.amount < 0) {
    throw new ValidationError('price.amount must be a non-negative number', 'price.amount', lot.price?.amount);
  }

  if (!lot.price?.kind) {
    throw new ValidationError('price.kind is required', 'price.kind', lot.price?.kind);
  }

  if (typeof lot.price?.verified !== 'boolean') {
    throw new ValidationError('price.verified must be boolean', 'price.verified', lot.price?.verified);
  }

  // Ensure price.kind and price.verified remain consistent (prevents silent drift)
  validatePriceVerified({ kind: lot.price.kind, verified: lot.price.verified });

  // ISO datetime validation (optional)
  if (lot.auctionEndAt) {
    const dt = new Date(lot.auctionEndAt);
    if (Number.isNaN(dt.getTime())) {
      throw new ValidationError('auctionEndAt must be valid ISO datetime', 'auctionEndAt', lot.auctionEndAt);
    }
  }

  if (lot.auctionStartAt) {
    const dt = new Date(lot.auctionStartAt);
    if (Number.isNaN(dt.getTime())) {
      throw new ValidationError('auctionStartAt must be valid ISO datetime', 'auctionStartAt', lot.auctionStartAt);
    }
  }

  // Normalize the verified flag if callers forgot to set it correctly.
  // (We do NOT mutate here; validation just ensures consistency.)
  // If you want strictness later, upgrade this to throw when inconsistent.
}

// =============================================================================
// NORMALIZATION RESULT (Safe Error Handling)
// =============================================================================

export type NormalizationResult =
  | { success: true; lot: NormalizedLot }
  | { success: false; error: string; raw: unknown };

// =============================================================================
// SOURCE ADAPTER INTERFACE
// =============================================================================

export interface NormalizedSourceAdapter {
  source: string;
  fetchActiveAuctions(ctx?: AdapterContext): Promise<Array<{ auctionId: string; [key: string]: any }>>;
  fetchLotsNormalized(auctionId: string, ctx?: AdapterContext): Promise<NormalizedLot[]>;
  /** Optional: Hydrate full photo gallery for a single lot (called for candidates only) */
  hydratePhotosForLot?(lotId: string, ctx?: AdapterContext): Promise<string[]>;
}

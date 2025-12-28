import {
  NormalizedLot,
  NormalizedPrice,
  NormalizationResult,
  LotStatus,
  validateNormalizedLot,
} from '../../core/types';

/**
 * Determine lot status based on auction end time.
 *
 * Note: This is conservative and only uses end time.
 * In the future we can incorporate start time, explicit status fields,
 * or "sold/unsold" indicators for closed auctions.
 */
export function determineLotStatus(
  endTimeIso: string | null | undefined,
  nowMs: number = Date.now()
): LotStatus {
  if (!endTimeIso) return 'unknown';

  try {
    const end = new Date(endTimeIso).getTime();
    if (Number.isNaN(end)) return 'unknown';

    if (end < nowMs) return 'closed';
    if (end - nowMs < 60 * 60 * 1000) return 'closing';
    return 'active';
  } catch {
    return 'unknown';
  }
}

function toIsoOrUndefined(v: any): string | undefined {
  if (!v) return undefined;
  try {
    const dt = new Date(v);
    return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
  } catch {
    return undefined;
  }
}

function coerceNonEmptyString(v: any): string | undefined {
  const s = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
  return s.length ? s : undefined;
}

/**
 * Normalize a raw Sierra lot into the standard NormalizedLot contract.
 * Throws on irrecoverable identifier errors. Also throws ValidationError
 * if the normalized result violates the contract.
 */
export function normalizeSierraLot(raw: any, nowMs: number = Date.now()): NormalizedLot {
  // Identifiers
  const auctionId = coerceNonEmptyString(raw?.auction_id);
  const lotId = coerceNonEmptyString(raw?.auction_lot_id);

  if (!auctionId || !lotId) {
    throw new Error(
      `Missing required identifiers: auction_id=${String(raw?.auction_id ?? '')}, auction_lot_id=${String(
        raw?.auction_lot_id ?? ''
      )}`
    );
  }

  // URL
  const sourceUrl = `https://sierraauction.auctioneersoftware.com/auctions/${auctionId}/lot/${lotId}`;

  // Title/Description
  const title = coerceNonEmptyString(raw?.title) ?? 'Untitled Lot';
  const description = coerceNonEmptyString(raw?.description);

  // Location (Sierra schema)
  const city = coerceNonEmptyString(raw?.lot_location?.city);
  const stateAbbr = coerceNonEmptyString(raw?.lot_location?.state?.abbreviation);
  const locationText = city && stateAbbr ? `${city}, ${stateAbbr}` : city;

  // Auction timing
  const endTimeRaw = raw?.auction?.end_time ?? raw?.end_time ?? null;
  const auctionEndAt = toIsoOrUndefined(endTimeRaw);
  const lotStatus = determineLotStatus(endTimeRaw, nowMs);

  // Image - primary thumbnail (Sierra provides multiple sizes)
  // Prefer 'large' variant for best quality, fall back to full_url or url
  const imageUrl = coerceNonEmptyString(raw?.primary_image?.large)
    || coerceNonEmptyString(raw?.primary_image?.full_url)
    || coerceNonEmptyString(raw?.primary_image?.url);

  // Full photo gallery from hydrated_images (fetched via per-lot detail query)
  // These are already 'large' variant URLs from cached_assets
  const photoUrls: string[] = [];
  if (Array.isArray(raw?.hydrated_images)) {
    for (const url of raw.hydrated_images) {
      const validUrl = coerceNonEmptyString(url);
      if (validUrl) photoUrls.push(validUrl);
    }
  }
  // Fallback: if no hydrated images but we have primary_image, use that
  if (photoUrls.length === 0 && imageUrl) {
    photoUrls.push(imageUrl);
  }
  const photoCount = photoUrls.length;

  // Price normalization
  const winningBid = Number(raw?.winning_bid_amount);
  const currentBid = Number(raw?.current_bid_amount);
  const startingBid = Number(raw?.starting_bid);

  let price: NormalizedPrice;

  // Prefer verified bids if present
  if (Number.isFinite(winningBid) && winningBid > 0) {
    price = {
      amount: winningBid,
      kind: 'winning_bid',
      verified: true,
      sourceField: 'winning_bid_amount',
      currency: 'USD',
    };
  } else if (Number.isFinite(currentBid) && currentBid > 0) {
    // Some sources distinguish current bid; Sierra may not always include this,
    // but supporting it keeps normalization robust.
    price = {
      amount: currentBid,
      kind: 'current_bid',
      verified: true,
      sourceField: 'current_bid_amount',
      currency: 'USD',
    };
  } else if (Number.isFinite(startingBid) && startingBid > 0) {
    price = {
      amount: startingBid,
      kind: 'starting_bid',
      verified: false,
      sourceField: 'starting_bid',
      currency: 'USD',
    };
  } else {
    price = {
      amount: 0,
      kind: 'none',
      verified: false,
      currency: 'USD',
    };
  }

  const normalized: NormalizedLot = {
    source: 'sierra',
    sourceAuctionId: auctionId,
    sourceLotId: lotId,
    sourceUrl,
    title,
    description,
    auctionEndAt,
    lotStatus,
    locationText,
    price,
    imageUrl,
    photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    photoCount: photoCount > 0 ? photoCount : undefined,
    raw,
  };

  validateNormalizedLot(normalized);
  return normalized;
}

/**
 * Safe normalization wrapper that catches errors and returns a tagged result.
 */
export function safeNormalizeSierraLot(raw: any, nowMs: number = Date.now()): NormalizationResult {
  try {
    const lot = normalizeSierraLot(raw, nowMs);
    return { success: true, lot };
  } catch (err) {
    // Include small, high-signal context in the error message to help spot patterns
    // without having to inspect full raw objects.
    const ctx = {
      auction_id: raw?.auction_id,
      auction_lot_id: raw?.auction_lot_id,
      title: raw?.title,
    };

    const baseMsg = err instanceof Error ? err.message : String(err);
    const ctxMsg = `ctx=${JSON.stringify(ctx)}`;

    return {
      success: false,
      error: `${baseMsg} | ${ctxMsg}`,
      raw,
    };
  }
}
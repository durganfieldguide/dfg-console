import { NormalizedLot, NormalizedPrice, NormalizationResult, LotStatus, PriceKind, validateNormalizedLot } from '../../core/types';

/**
 * IronPlanet quickviews object structure (extracted from page JavaScript):
 * {
 *   equipId: "14109982",
 *   description: "2016 Load Trail Low-Pro 44 ft T/A Gooseneck...",
 *   convPrice: "US $21,000",
 *   price: 21000,
 *   usage: "12,345 mi",
 *   distanceString: "(5 mi away)",
 *   timeLeft: "Jan 8" | "2d 4h" | "Closed",
 *   lat: 33.5616,
 *   lng: -112.0946,
 *   photo: "https://cdn.ironpla.net/i/...",
 *   photoThumb: "https://...",
 *   photoBigger: "https://...",
 *   auctionType: "Buy Now" | "Online Auction" | "On-Site Auction",
 *   marketplace: "M" | "T" | "R",
 *   buyItNow: true | false,
 *   hasBid: true | false,
 *   isICA: true | false,
 *   bidUrl: "/jsp/s/item/14109982",
 *   features: "Ball Hitch|Spring Suspension|...",
 *   flagPath: "USA",
 *   location: "Phoenix, AZ" (sometimes available)
 * }
 */

export interface IronPlanetQuickview {
	equipId: string;
	description?: string;
	convPrice?: string;
	price?: number;
	usage?: string;
	distanceString?: string;
	timeLeft?: string;
	lat?: number;
	lng?: number;
	photo?: string;
	photoThumb?: string;
	photoBigger?: string;
	auctionType?: string;
	marketplace?: string;
	buyItNow?: boolean;
	hasBid?: boolean;
	isICA?: boolean;
	bidUrl?: string;
	features?: string;
	flagPath?: string;
	location?: string;
	city?: string;
	state?: string;
}

function coerceNonEmptyString(v: any): string | undefined {
	const s = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
	return s.length ? s : undefined;
}

/**
 * Parse IronPlanet price string like "US $21,000" or "$1,500"
 */
function parseIronPlanetPrice(convPrice: string | undefined, numericPrice: number | undefined): { amount: number; currency: string } {
	// Prefer numeric price if available
	if (typeof numericPrice === 'number' && Number.isFinite(numericPrice) && numericPrice > 0) {
		return { amount: numericPrice, currency: 'USD' };
	}

	if (!convPrice) {
		return { amount: 0, currency: 'USD' };
	}

	// Parse string like "US $21,000" or "CAD $5,000" or "$1,500"
	const currencyMatch = convPrice.match(/^(US|CAD|EUR|GBP)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
	if (currencyMatch) {
		const currency = currencyMatch[1]?.toUpperCase() || 'USD';
		const amount = parseFloat(currencyMatch[2].replace(/,/g, ''));
		if (Number.isFinite(amount)) {
			return { amount, currency };
		}
	}

	return { amount: 0, currency: 'USD' };
}

/**
 * Parse IronPlanet timeLeft string to estimate auction end.
 * Formats: "Jan 8", "2d 4h", "Closed", "Ends Today"
 */
function parseTimeLeft(timeLeft: string | undefined, nowMs: number): { endAt: string | undefined; status: LotStatus } {
	if (!timeLeft) {
		return { endAt: undefined, status: 'unknown' };
	}

	const lower = timeLeft.toLowerCase().trim();

	// Closed auctions
	if (lower === 'closed' || lower.includes('sold') || lower.includes('ended')) {
		return { endAt: undefined, status: 'closed' };
	}

	// Ends today - set to end of day
	if (lower === 'ends today' || lower === 'today') {
		const endOfDay = new Date(nowMs);
		endOfDay.setHours(23, 59, 59, 999);
		return { endAt: endOfDay.toISOString(), status: 'closing' };
	}

	// Relative time: "2d 4h", "5h 30m", "45m"
	const relativeMatch = lower.match(/(\d+)d?\s*(\d+)?h?\s*(\d+)?m?/);
	if (relativeMatch && (lower.includes('d') || lower.includes('h') || lower.includes('m'))) {
		const days = lower.includes('d') ? parseInt(relativeMatch[1], 10) || 0 : 0;
		const hours = lower.includes('h') ? parseInt(relativeMatch[2] || relativeMatch[1], 10) || 0 : 0;
		const minutes = lower.includes('m') ? parseInt(relativeMatch[3] || relativeMatch[2] || relativeMatch[1], 10) || 0 : 0;

		const endMs = nowMs + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000;
		const endAt = new Date(endMs).toISOString();
		const status: LotStatus = endMs - nowMs < 60 * 60 * 1000 ? 'closing' : 'active';
		return { endAt, status };
	}

	// Absolute date: "Jan 8", "January 8", "Jan 8, 2025"
	const monthMatch = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
	if (monthMatch) {
		const monthNames: Record<string, number> = {
			jan: 0,
			feb: 1,
			mar: 2,
			apr: 3,
			may: 4,
			jun: 5,
			jul: 6,
			aug: 7,
			sep: 8,
			oct: 9,
			nov: 10,
			dec: 11,
		};
		const month = monthNames[monthMatch[1].toLowerCase().slice(0, 3)];
		const day = parseInt(monthMatch[2], 10);
		const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : new Date(nowMs).getFullYear();

		const endDate = new Date(year, month, day, 23, 59, 59, 999);
		// If the date is in the past for this year, assume next year
		if (endDate.getTime() < nowMs && !monthMatch[3]) {
			endDate.setFullYear(endDate.getFullYear() + 1);
		}

		const endAt = endDate.toISOString();
		const status: LotStatus = endDate.getTime() < nowMs ? 'closed' : endDate.getTime() - nowMs < 24 * 60 * 60 * 1000 ? 'closing' : 'active';
		return { endAt, status };
	}

	return { endAt: undefined, status: 'active' };
}

/**
 * Determine price kind based on auction type and buy now flag
 */
function determinePriceKind(raw: IronPlanetQuickview): PriceKind {
	const auctionType = raw.auctionType?.toLowerCase() || '';

	if (raw.buyItNow || auctionType.includes('buy now')) {
		return 'buy_now';
	}

	if (raw.hasBid) {
		return 'current_bid';
	}

	if (auctionType.includes('auction')) {
		return 'starting_bid';
	}

	return 'estimate';
}

/**
 * Extract location from IronPlanet data
 * May come from location field, city/state, or distanceString
 */
function extractLocation(raw: IronPlanetQuickview): string | undefined {
	// Direct location field
	if (raw.location) {
		return coerceNonEmptyString(raw.location);
	}

	// City + State
	if (raw.city && raw.state) {
		return `${raw.city}, ${raw.state}`;
	}

	// Distance string sometimes includes location hint
	// "(5 mi away)" doesn't help, but some may include city

	return undefined;
}

/**
 * Build the canonical IronPlanet listing URL
 */
function buildSourceUrl(equipId: string, bidUrl?: string): string {
	// bidUrl is like "/jsp/s/item/14109982"
	if (bidUrl?.startsWith('/')) {
		return `https://www.ironplanet.com${bidUrl}`;
	}
	return `https://www.ironplanet.com/jsp/s/item/${equipId}`;
}

/**
 * Normalize a raw IronPlanet quickview object into NormalizedLot
 */
export function normalizeIronPlanetLot(raw: IronPlanetQuickview, nowMs: number = Date.now()): NormalizedLot {
	const equipId = coerceNonEmptyString(raw.equipId);

	if (!equipId) {
		throw new Error(`Missing required identifier: equipId=${String(raw.equipId ?? '')}`);
	}

	const sourceUrl = buildSourceUrl(equipId, raw.bidUrl);
	const title = coerceNonEmptyString(raw.description) ?? 'Untitled Listing';

	// Parse timing
	const { endAt, status } = parseTimeLeft(raw.timeLeft, nowMs);

	// Parse price
	const { amount, currency } = parseIronPlanetPrice(raw.convPrice, raw.price);
	const priceKind = determinePriceKind(raw);
	const verified = priceKind === 'current_bid' || priceKind === 'buy_now';

	const price: NormalizedPrice = {
		amount,
		kind: priceKind,
		verified,
		sourceField: raw.convPrice ? 'convPrice' : 'price',
		currency,
	};

	// Images - prefer larger versions
	const imageUrl = coerceNonEmptyString(raw.photoBigger) || coerceNonEmptyString(raw.photo) || coerceNonEmptyString(raw.photoThumb);

	const photoUrls: string[] = [];
	if (imageUrl) photoUrls.push(imageUrl);

	// Location
	const locationText = extractLocation(raw);

	// Features as tags
	const sourceTags = raw.features
		?.split('|')
		.map((f) => f.trim())
		.filter(Boolean);

	// Source categories from marketplace/auctionType
	const sourceCategories: string[] = [];
	if (raw.auctionType) sourceCategories.push(raw.auctionType);
	if (raw.marketplace) {
		const marketplaceMap: Record<string, string> = {
			M: 'Marketplace',
			T: 'Timed Auction',
			R: 'RB Auction',
		};
		sourceCategories.push(marketplaceMap[raw.marketplace] || raw.marketplace);
	}

	const normalized: NormalizedLot = {
		source: 'ironplanet',
		sourceLotId: equipId,
		sourceUrl,
		title,
		auctionEndAt: endAt,
		lotStatus: status,
		locationText,
		price,
		imageUrl,
		photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
		photoCount: photoUrls.length > 0 ? photoUrls.length : undefined,
		sourceCategories: sourceCategories.length > 0 ? sourceCategories : undefined,
		sourceTags: sourceTags && sourceTags.length > 0 ? sourceTags : undefined,
		raw,
	};

	validateNormalizedLot(normalized);
	return normalized;
}

/**
 * Safe normalization wrapper
 */
export function safeNormalizeIronPlanetLot(raw: any, nowMs: number = Date.now()): NormalizationResult {
	try {
		const lot = normalizeIronPlanetLot(raw as IronPlanetQuickview, nowMs);
		return { success: true, lot };
	} catch (err) {
		const ctx = {
			equipId: raw?.equipId,
			description: raw?.description?.slice(0, 50),
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

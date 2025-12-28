import { describe, it, expect } from 'vitest';

import { determineLotStatus, normalizeSierraLot, safeNormalizeSierraLot } from './normalize';

// NOTE: We pass `nowMs` to time-sensitive helpers for deterministic tests.
// Extra args are safe even if the implementation doesn't use them.

describe('determineLotStatus', () => {
  const now = Date.parse('2025-12-19T14:00:00Z');

  it('returns active for auction ending in > 1 hour', () => {
    const endTime = '2025-12-19T16:00:00Z'; // 2 hours away
    expect(determineLotStatus(endTime, now)).toBe('active');
  });

  it('returns closing for auction ending in < 1 hour', () => {
    const endTime = '2025-12-19T14:30:00Z'; // 30 minutes away
    expect(determineLotStatus(endTime, now)).toBe('closing');
  });

  it('returns closed for past auction', () => {
    const endTime = '2025-12-19T13:00:00Z'; // 1 hour ago
    expect(determineLotStatus(endTime, now)).toBe('closed');
  });

  it('returns unknown for null/undefined', () => {
    expect(determineLotStatus(null, now)).toBe('unknown');
    expect(determineLotStatus(undefined, now)).toBe('unknown');
  });

  it('returns unknown for invalid date', () => {
    expect(determineLotStatus('invalid-date', now)).toBe('unknown');
  });
});

describe('normalizeSierraLot', () => {
  const now = Date.parse('2025-12-19T14:00:00Z');

  const validRaw: any = {
    auction_id: '6817',
    auction_lot_id: '485894',
    title: 'Utility Trailer 6x12',
    description: 'Heavy duty trailer',
    winning_bid_amount: 1200,
    starting_bid: 800,
    lot_location: {
      city: 'Phoenix',
      state: { abbreviation: 'AZ' },
    },
    auction: {
      end_time: '2025-12-25T18:00:00Z',
    },
    primary_image: {
      full_url: 'https://example.com/image.jpg',
    },
  };

  it('normalizes complete lot successfully', () => {
    const result: any = normalizeSierraLot(validRaw, now);

    expect(result.source).toBe('sierra');
    expect(result.sourceAuctionId).toBe('6817');
    expect(result.sourceLotId).toBe('485894');
    expect(result.sourceUrl).toBe('https://sierraauction.auctioneersoftware.com/auctions/6817/lot/485894');

    expect(result.title).toBe('Utility Trailer 6x12');
    expect(result.description).toBe('Heavy duty trailer');

    expect(result.locationText).toBe('Phoenix, AZ');

    expect(result.auctionEndAt).toBe('2025-12-25T18:00:00.000Z');
    expect(result.lotStatus).toBeDefined();

    expect(result.price.amount).toBe(1200);
    expect(result.price.kind).toBe('winning_bid');
    expect(result.price.verified).toBe(true);

    expect(result.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('handles missing optional fields with sane defaults', () => {
    const minimal: any = {
      auction_id: '6817',
      auction_lot_id: '485894',
    };

    const result: any = normalizeSierraLot(minimal, now);

    expect(result.title).toBe('Untitled Lot');
    expect(result.description).toBeUndefined();
    expect(result.locationText).toBeUndefined();

    expect(result.price.kind).toBe('none');
    expect(result.price.amount).toBe(0);
    expect(result.price.verified).toBe(false);
  });

  it('prefers winning_bid_amount over starting_bid', () => {
    const result: any = normalizeSierraLot(validRaw, now);
    expect(result.price.kind).toBe('winning_bid');
    expect(result.price.amount).toBe(1200);
    expect(result.price.verified).toBe(true);
  });

  it('uses starting_bid if winning_bid_amount absent', () => {
    const raw: any = {
      ...validRaw,
      winning_bid_amount: null,
    };

    const result: any = normalizeSierraLot(raw, now);
    expect(result.price.kind).toBe('starting_bid');
    expect(result.price.amount).toBe(800);
    expect(result.price.verified).toBe(false);
  });

  it('throws on missing auction_id', () => {
    const invalid: any = {
      auction_lot_id: '485894',
    };

    expect(() => normalizeSierraLot(invalid, now)).toThrow('Missing required identifiers');
  });

  it('throws on missing auction_lot_id', () => {
    const invalid: any = {
      auction_id: '6817',
    };

    expect(() => normalizeSierraLot(invalid, now)).toThrow('Missing required identifiers');
  });

  it('handles city without state abbreviation', () => {
    const raw: any = {
      ...validRaw,
      lot_location: { city: 'Phoenix' },
    };

    const result: any = normalizeSierraLot(raw, now);
    expect(result.locationText).toBe('Phoenix');
  });

  it('preserves raw data reference', () => {
    const result: any = normalizeSierraLot(validRaw, now);
    expect(result.raw).toBe(validRaw);
  });
});

describe('safeNormalizeSierraLot', () => {
  const now = Date.parse('2025-12-19T14:00:00Z');

  it('returns success for valid lot', () => {
    const raw: any = {
      auction_id: '6817',
      auction_lot_id: '485894',
    };

    const result: any = safeNormalizeSierraLot(raw, now);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.lot.source).toBe('sierra');
      expect(result.lot.sourceLotId).toBe('485894');
    }
  });

  it('returns failure for invalid lot', () => {
    const raw: any = {
      // Missing both IDs
    };

    const result: any = safeNormalizeSierraLot(raw, now);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing required identifiers');
      expect(result.raw).toBe(raw);
    }
  });
});

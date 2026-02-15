import { describe, it, expect } from 'vitest';

import { evaluateLotPure, type LoadedCategory } from './router';
import type { RouterInput } from '../core/types';

const mockCategories: LoadedCategory[] = [
	{
		id: 'TRAILERS',
		name: 'Trailers',
		enabled: true,
		minScore: 70,
		requiresSnapshot: true,
		positive: ['utility trailer', 'dump trailer', 'cargo trailer'],
		negative: ['toy', 'hitch', 'parts'],
		hardGates: [],
	},
	{
		id: 'GENERATORS',
		name: 'Generators',
		enabled: true,
		minScore: 65,
		requiresSnapshot: true,
		positive: ['generator', 'honda generator', 'portable generator'],
		negative: ['battery', 'charger'],
		hardGates: [],
	},
];

const config = { maxBid: 6000, stealThreshold: 2000 };

function input(partial: Partial<RouterInput>): RouterInput {
	return {
		title: 'Untitled',
		description: '',
		price: 0,
		priceVerified: true,
		priceKind: 'winning_bid',
		...partial,
	};
}

describe('evaluateLotPure', () => {
	describe('Price filtering', () => {
		it('rejects lots over maxBid', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer',
					description: 'Great condition',
					price: 7000,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('price_over_max');
		});

		it('accepts lots under maxBid when keywords match', () => {
			// Price must be low enough to get high price score to meet minScore of 70
			// Score = base(10) + keyword(20 for 'utility trailer') + price(40 for verified <= 1000) = 70
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer',
					description: '6x12 flatbed cargo trailer', // Add 'cargo trailer' for more keyword points
					price: 800, // Under 1000 for maximum price score
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('candidate');
			expect(verdict.categoryId).toBe('TRAILERS');
		});
	});

	describe('Global negatives', () => {
		it('rejects "parts only"', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer - Parts Only',
					description: 'Selling for parts only',
					price: 500,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('global_negative_trigger');
			// Implementation should expose which phrase triggered.
			expect(verdict.matchedNegative || []).toContain('parts only');
		});

		it('rejects "salvage title" even if category would match', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Honda Portable Generator',
					description: 'Salvage title, runs great',
					price: 800,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('global_negative_trigger');
		});
	});

	describe('Category matching', () => {
		it('matches trailer category with positive keywords', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer 6x12',
					description: 'Heavy duty cargo trailer',
					price: 1200,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('candidate');
			expect(verdict.categoryName).toBe('Trailers');
			expect(verdict.matchedPositive || []).toContain('utility trailer');
			expect(verdict.matchedPositive || []).toContain('cargo trailer');
		});

		it('matches generator category with positive keywords', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Honda Portable Generator',
					description: '5000W gas powered',
					price: 900,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('candidate');
			expect(verdict.categoryName).toBe('Generators');
			// "honda generator" might be matched via title containing "Honda" + "Generator" depending on keyword list.
			// We at least expect "portable generator" and/or "generator" to match.
			expect((verdict.matchedPositive || []).length).toBeGreaterThan(0);
		});
	});

	describe('Negative keywords', () => {
		it('rejects trailer accessory lots with "hitch" negative', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer Hitch Adapter',
					description: 'Universal hitch for trailers',
					price: 75,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('matched_negative_keywords');
			expect(verdict.matchedNegative || []).toContain('hitch');
		});

		it('rejects toys with "toy" negative', () => {
			// Title must match a positive keyword first, then get rejected by negative
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer Toy Hauler',
					description: 'Small toy utility trailer',
					price: 500,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('matched_negative_keywords');
			expect(verdict.matchedNegative || []).toContain('toy');
		});
	});

	describe('Word boundary matching', () => {
		it('does NOT match "utility trailer" inside "non-utility trailer"', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Non-utility trailer parts',
					description: 'Parts for non-utility trailers',
					price: 100,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.matchedPositive || []).not.toContain('utility trailer');
		});

		it('DOES match hyphenated "dump-trailer" when keyword is "dump trailer"', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Heavy-duty dump-trailer',
					description: 'Industrial dump-trailer',
					price: 2500,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.matchedPositive || []).toContain('dump trailer');
		});
	});

	describe('Unverified pricing policy', () => {
		it('accepts starting_bid as valid price for evaluation', () => {
			// Current implementation treats starting_bid as valid for scoring
			// This allows evaluation of auction items before bids are placed
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer Cargo Trailer',
					description: '6x12 flatbed dump trailer',
					price: 500,
					priceVerified: false,
					priceKind: 'starting_bid',
				}),
				mockCategories,
				config,
			);

			// With enough keyword matches and low price, should be candidate
			// Score: base(10) + keywords(60 for 3 matches) + price(35 for unverified <= 1000) = 105 > minScore(70)
			expect(verdict.status).toBe('candidate');
		});

		it('rejects lots with no price (priceKind=none)', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Utility Trailer',
					description: '6x12 flatbed',
					price: 0,
					priceVerified: false,
					priceKind: 'none',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('unpriced');
		});
	});

	describe('No categories loaded', () => {
		it('returns router_not_loaded when categories empty', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Anything',
					description: 'Whatever',
					price: 1000,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				[],
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('router_not_loaded');
		});
	});

	describe('No category match', () => {
		it('returns no_category_match when no keywords match', () => {
			const verdict = evaluateLotPure(
				input({
					title: 'Office Furniture',
					description: 'Desk and chair set',
					price: 500,
					priceVerified: true,
					priceKind: 'winning_bid',
				}),
				mockCategories,
				config,
			);

			expect(verdict.status).toBe('rejected');
			expect(verdict.rejectionReason).toBe('no_category_match');
		});
	});
});

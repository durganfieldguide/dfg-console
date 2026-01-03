import { Env, getConfig } from '../core/env';
import type { RouterInput } from '../core/types';

export interface Verdict {
  status: 'candidate' | 'rejected';
  categoryId: string | null;
  categoryName: string | null;
  requiresSnapshot: boolean;
  score: number;
  minScore: number;
  matchedPositive: string[];
  matchedNegative: string[];
  hardGateFailures?: Array<{ field: string; reason: string }>;  // Failed hard gates
  rejectionReason?:
    | 'price_over_max'
    | 'no_category_match'
    | 'matched_negative_keywords'
    | 'below_min_score'
    | 'router_not_loaded'
    | 'global_negative_trigger'
    | 'hard_gate_failed'
    | 'unpriced';
}

/**
 * Hard gate rule for auto-reject/flag
 */
export interface HardGate {
  field: string;           // e.g., "title_status", "parts_only", "mileage"
  operator: 'equals' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: unknown;          // Single value or array for 'in' operator
  action: 'reject' | 'flag';  // reject = auto-reject, flag = needs review
}

export type LoadedCategory = {
  id: string;
  name: string;
  enabled: boolean;
  minScore: number;
  requiresSnapshot: boolean;
  positive: string[];
  negative: string[];
  hardGates: HardGate[];   // Hard gates loaded from D1
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseKeywords(field: unknown): string[] {
  if (field == null) return [];
  const raw = String(field).trim();
  if (!raw) return [];

  // Support BOTH historical JSON-array storage and newer CSV storage.
  // Examples:
  //   '["trailer","dump"]'
  //   'trailer,dump,tilt,flatbed'
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr
          .map(v => String(v).trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {
      // fall through to CSV parsing
    }
  }

  return raw
    .split(/[,\n\r;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function includesKeyword(text: string, keyword: string): boolean {
  const k = (keyword || '').trim().toLowerCase();
  if (!k) return false;

  // Strict boundary check that treats hyphen as a word char.
  // This prevents matches like "utility trailer" inside "non-utility trailer".
  // For multi-word phrases, allow spaces OR hyphens between tokens so
  // "dump trailer" matches "dump-trailer".
  // Cloudflare Workers (V8) supports lookbehind.
  const tokens = k.split(/\s+/).filter(Boolean);
  const core =
    tokens.length > 1
      ? tokens.map(escapeRegExp).join('[\\s-]+')
      : escapeRegExp(k);

  const re = new RegExp(`(?<![\\w-])${core}(?![\\w-])`, 'i');
  return re.test(text);
}

/**
 * Evaluate hard gates against input data
 * Returns array of failures (empty = all passed)
 */
function evaluateHardGates(
  gates: HardGate[],
  input: RouterInput
): Array<{ field: string; reason: string; action: 'reject' | 'flag' }> {
  const failures: Array<{ field: string; reason: string; action: 'reject' | 'flag' }> = [];

  // Build a lookup of input fields
  const data: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    price: input.price,
    // Add any other fields that might be checked
    ...((input as unknown as Record<string, unknown>) || {}),
  };

  for (const gate of gates) {
    const value = data[gate.field];
    let triggered = false;

    switch (gate.operator) {
      case 'equals':
        triggered = value === gate.value;
        break;
      case 'in':
        triggered = Array.isArray(gate.value) && (gate.value as unknown[]).includes(value);
        break;
      case 'gt':
        triggered = typeof value === 'number' && typeof gate.value === 'number' && value > gate.value;
        break;
      case 'lt':
        triggered = typeof value === 'number' && typeof gate.value === 'number' && value < gate.value;
        break;
      case 'gte':
        triggered = typeof value === 'number' && typeof gate.value === 'number' && value >= gate.value;
        break;
      case 'lte':
        triggered = typeof value === 'number' && typeof gate.value === 'number' && value <= gate.value;
        break;
      case 'contains':
        if (typeof value === 'string' && typeof gate.value === 'string') {
          triggered = value.toLowerCase().includes(gate.value.toLowerCase());
        }
        break;
    }

    if (triggered) {
      failures.push({
        field: gate.field,
        reason: `${gate.field} ${gate.operator} ${JSON.stringify(gate.value)}`,
        action: gate.action,
      });
    }
  }

  return failures;
}

export function evaluateLotPure(
  input: RouterInput,
  categories: LoadedCategory[],
  config: { maxBid: number; stealThreshold: number }
): Verdict {
  const title = String(input?.title || '').toLowerCase();
  const description = String(input?.description || '').toLowerCase();
  const text = `${title} ${description}`.trim();

  const price = Number(input?.price ?? 0);
  const priceKind = String(input?.priceKind || 'none').toLowerCase();

  // A price is "valid" for scoring if:
  // 1. It's verified (has actual bids), OR
  // 2. It's a starting_bid (auction floor price - still useful for evaluation)
  // Only reject if price_kind is 'none' or price is invalid
  const hasValidPrice = Number.isFinite(price) && price > 0 && priceKind !== 'none';
  const hasVerifiedPrice = Boolean(input?.priceVerified) && hasValidPrice;

  if (Number.isFinite(price) && price > config.maxBid) {
    return {
      status: 'rejected',
      categoryId: null,
      categoryName: null,
      requiresSnapshot: false,
      score: 0,
      minScore: 0,
      matchedPositive: [],
      matchedNegative: [],
      rejectionReason: 'price_over_max',
    };
  }

  // Nuclear negatives: if these fire, we never want the lot to become a candidate.
  // Keep this list short and brutal.
  const globalNegatives = [
    'scrap metal',
    'scrap only',
    'for parts only',
    'parts only',
    'frame only',
    'shell only',
    'no title',
    'certificate of destruction',
    'salvage title',
    'rebuilt title',
    'rebuild title',
    'flood damage',
    'fire damage',
    'total loss',
    'theft recovery',
    'bill of sale only',
  ];

  const matchedGlobalNegatives = globalNegatives.filter(k => includesKeyword(text, k));
  if (matchedGlobalNegatives.length > 0) {
    return {
      status: 'rejected',
      categoryId: null,
      categoryName: null,
      requiresSnapshot: false,
      score: 0,
      minScore: 0,
      matchedPositive: [],
      matchedNegative: matchedGlobalNegatives,
      rejectionReason: 'global_negative_trigger',
    };
  }

  if (!categories || categories.length === 0) {
    return {
      status: 'rejected',
      categoryId: null,
      categoryName: null,
      requiresSnapshot: false,
      score: 0,
      minScore: 0,
      matchedPositive: [],
      matchedNegative: [],
      rejectionReason: 'router_not_loaded',
    };
  }

  let bestCandidate: Verdict | null = null;
  let bestAttempt: Verdict | null = null;

  for (const cat of categories) {
    const matchedPositive = cat.positive.filter(k => includesKeyword(text, k));
    const matchedNegative = cat.negative.filter(k => includesKeyword(text, k));

    // If nothing positive matched, skip this category entirely.
    if (matchedPositive.length === 0) continue;

    // Keyword scoring: positives help, negatives hurt.
    // Negatives are weighted 1.5x stronger (30 vs 20) to be conservative and reduce false positives.
    // Clamp keyword contribution so price still matters.
    let keywordScore = Math.min(60, matchedPositive.length * 20) - Math.min(60, matchedNegative.length * 30);
    if (keywordScore < 0) keywordScore = 0;

    // Price scoring (kept similar to prior tiers).
    // IMPORTANT: router does not infer price fields; it trusts the normalized input.
    // Use hasValidPrice (includes starting_bid) for scoring - we want to evaluate all priced items.
    // Verified bids get a small bonus since they represent actual market interest.
    let priceScore = 0;
    if (hasValidPrice) {
      if (price <= 1000) priceScore = hasVerifiedPrice ? 40 : 35;
      else if (price <= config.stealThreshold) priceScore = hasVerifiedPrice ? 25 : 20;
      else if (price <= 4000) priceScore = hasVerifiedPrice ? 10 : 5;
      else priceScore = 0;
    }

    // Base is intentionally modest; tuning happens via keywords + minScore.
    const base = 10;
    const score = Math.max(0, Math.min(base + keywordScore + priceScore, 100));

    // Attempt verdict (even if rejected) is useful for diagnostics.
    const attempt: Verdict = {
      status: 'rejected',
      categoryId: cat.id,
      categoryName: cat.name,
      requiresSnapshot: Boolean(cat.requiresSnapshot),
      score,
      minScore: cat.minScore,
      matchedPositive,
      matchedNegative,
      rejectionReason:
        matchedNegative.length > 0
          ? 'matched_negative_keywords'
          : !hasValidPrice
            ? 'unpriced'
            : score < cat.minScore
              ? 'below_min_score'
              : undefined,
    };

    if (!bestAttempt || attempt.score > bestAttempt.score) bestAttempt = attempt;

    // Candidate requires: positives matched, no negatives matched, valid price, and score >= minScore.
    // Note: We use hasValidPrice (not hasVerifiedPrice) to allow starting_bid items as candidates.
    if (matchedNegative.length > 0) continue;
    if (!hasValidPrice) continue;
    if (score < cat.minScore) continue;

    // Evaluate hard gates for this category
    const hardGateFailures = evaluateHardGates(cat.hardGates, input);
    const rejectGates = hardGateFailures.filter(f => f.action === 'reject');

    // If any hard gates with 'reject' action failed, skip this candidate
    if (rejectGates.length > 0) {
      const attempt: Verdict = {
        status: 'rejected',
        categoryId: cat.id,
        categoryName: cat.name,
        requiresSnapshot: Boolean(cat.requiresSnapshot),
        score,
        minScore: cat.minScore,
        matchedPositive,
        matchedNegative,
        hardGateFailures: rejectGates.map(f => ({ field: f.field, reason: f.reason })),
        rejectionReason: 'hard_gate_failed',
      };
      if (!bestAttempt || attempt.score > bestAttempt.score) bestAttempt = attempt;
      continue;
    }

    const candidate: Verdict = {
      status: 'candidate',
      categoryId: cat.id,
      categoryName: cat.name,
      requiresSnapshot: Boolean(cat.requiresSnapshot),
      score,
      minScore: cat.minScore,
      matchedPositive,
      matchedNegative,
      // Include flag-level gate failures for operator awareness (but don't reject)
      hardGateFailures: hardGateFailures.filter(f => f.action === 'flag').map(f => ({ field: f.field, reason: f.reason })),
    };

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  if (bestCandidate) return bestCandidate;

  // If we had any attempt (i.e., at least one category had a positive keyword match),
  // return the best attempt so analysts can see what fired.
  if (bestAttempt) return bestAttempt;

  return {
    status: 'rejected',
    categoryId: null,
    categoryName: null,
    requiresSnapshot: false,
    score: 0,
    minScore: 0,
    matchedPositive: [],
    matchedNegative: [],
    rejectionReason: 'no_category_match',
  };
}

interface CategoryDefRow {
  id?: string;
  category_id?: string;
  name?: string;
  enabled?: number;
  min_score?: number;
  requires_snapshot?: number;
  keywords_positive?: string;
  keywords_negative?: string;
  hard_gates?: string;  // JSON string of HardGate[]
}

/**
 * Parse hard_gates from JSON string
 */
function parseHardGates(json: string | null | undefined): HardGate[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class CategoryRouter {
  private categories: LoadedCategory[] = [];
  private env: Env;
  private config: ReturnType<typeof getConfig>;

  constructor(env: Env) {
    this.env = env;
    this.config = getConfig(env);
  }

  /**
   * Load categories, optionally filtered by source.
   * @param source - If provided, attempts to load categories enabled for this source.
   *                 Falls back to all enabled categories if source_category_map doesn't exist.
   */
  async load(source?: string) {
    try {
      let results: { results: CategoryDefRow[] | null };

      if (source) {
        // Try to load categories filtered by source, but fall back if table doesn't exist
        try {
          const query = `
            SELECT cd.*
            FROM category_defs cd
            INNER JOIN source_category_map scm ON cd.id = scm.category_id
            WHERE cd.enabled = 1
              AND scm.enabled = 1
              AND scm.source = ?
          `;
          results = await this.env.DFG_DB.prepare(query).bind(source).all<CategoryDefRow>();
        } catch (tableErr: any) {
          // source_category_map table doesn't exist, fall back to all categories
          console.log(`[Router] source_category_map not found, loading all enabled categories`);
          results = await this.env.DFG_DB.prepare('SELECT * FROM category_defs WHERE enabled = 1').all<CategoryDefRow>();
        }
      } else {
        // Load all enabled categories (backward compatible)
        results = await this.env.DFG_DB.prepare('SELECT * FROM category_defs WHERE enabled = 1').all<CategoryDefRow>();
      }

      const rows = results.results || [];
      console.log(`[Router] Query returned ${rows.length} rows for source '${source || 'all'}'`);
      this.categories = rows
        .map((cat): LoadedCategory => {
          const id = String(cat.id ?? cat.category_id ?? cat.name ?? '').trim();
          const name = String(cat.name ?? id).trim();

          const enabledNum = Number(cat.enabled ?? 1);
          const enabled = Number.isFinite(enabledNum) ? enabledNum !== 0 : Boolean(cat.enabled ?? 1);

          const minScoreNum = Number(cat.min_score ?? 0);
          const minScore = Number.isFinite(minScoreNum) ? minScoreNum : 0;

          const reqSnapNum = Number(cat.requires_snapshot ?? 1);
          const requiresSnapshot = Number.isFinite(reqSnapNum) ? reqSnapNum !== 0 : Boolean(cat.requires_snapshot ?? 1);

          return {
            id,
            name,
            enabled,
            minScore,
            requiresSnapshot,
            positive: parseKeywords(cat.keywords_positive),
            negative: parseKeywords(cat.keywords_negative),
            hardGates: parseHardGates(cat.hard_gates),
          };
        })
        .filter(c => c.id && c.enabled);

      if (this.categories.length === 0) {
        const msg = source
          ? `[Router] WARNING: No active categories loaded for source '${source}'.`
          : '[Router] WARNING: No active categories loaded from category_defs.';
        console.warn(msg);
      } else {
        const msg = source
          ? `[Router] Loaded ${this.categories.length} active category definitions for source '${source}'.`
          : `[Router] Loaded ${this.categories.length} active category definitions.`;
        console.log(msg);
      }
    } catch (err) {
      console.error('[Router] Failed to load categories from D1:', err);
      this.categories = [];
      throw err;
    }
  }

  evaluate(input: RouterInput): Verdict {
    return evaluateLotPure(input, this.categories, {
      maxBid: this.config.maxBid,
      stealThreshold: this.config.stealThreshold,
    });
  }

  /**
   * Get the list of loaded categories (useful for pipeline coordination)
   */
  getLoadedCategories(): LoadedCategory[] {
    return this.categories;
  }
}
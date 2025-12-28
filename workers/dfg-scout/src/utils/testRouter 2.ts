/**
 * testRouter.ts
 *
 * Local, fast router regression tests for DFG Scout.
 *
 * Purpose:
 * - Run router keyword logic against a directory of fixture JSON lots.
 * - Verify expected candidate/reject outcomes.
 * - Print matched keywords + rejection reasons for fast tuning.
 *
 * Usage (recommended):
 *   npx tsx src/utils/testRouter.ts --defs ./fixtures/category_defs.preview.json ./fixtures/lots
 *
 * Where:
 * - --defs points to a JSON file containing an array of category definitions.
 * - The final args are one or more fixture files or directories.
 *
 * Fixture file format:
 * {
 *   "__fixture": { "expectedCategory": "Trailers", "expectCandidate": true, "note": "Known good" },
 *   ... raw lot fields ...
 * }
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { evaluateLotPure, type Verdict } from '../categories/router';
import type { RouterInput, PriceKind } from '../core/types';

type CategoryDefInput = {
  // Accept either D1-ish rows or cleaner JSON.
  id?: string;
  category_id?: string;
  name?: string;
  enabled?: number | boolean;
  min_score?: number;
  requires_snapshot?: number | boolean;
  keywords_positive?: unknown;
  keywords_negative?: unknown;

  // Alternate keys (if you prefer explicit fields in fixtures)
  minScore?: number;
  requiresSnapshot?: boolean;
  positive?: unknown;
  negative?: unknown;
};

type LoadedCategory = {
  id: string;
  name: string;
  enabled: boolean;
  minScore: number;
  requiresSnapshot: boolean;
  positive: string[];
  negative: string[];
};

type FixtureMeta = {
  expectedCategory?: string; // e.g. "Trailers" or "NONE"
  expectCandidate?: boolean;
  note?: string;
};

type FixtureFile = {
  __fixture?: FixtureMeta;
  [k: string]: any;
};

type RunnerConfig = {
  maxBid: number;
  stealThreshold: number;
};

function toRouterInputFromFixture(lot: any): RouterInput {
  const title = String(lot?.title ?? lot?.name ?? lot?.lot_title ?? lot?.lotTitle ?? '').trim() || 'Untitled Lot';
  const description = String(
    lot?.description ??
      lot?.desc ??
      lot?.lot_description ??
      lot?.lotDescription ??
      ''
  ).trim();

  const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Allow fixtures to explicitly specify these, but also infer from common field names.
  const explicitKind = (lot?.priceKind ?? lot?.price_kind ?? lot?.price?.kind) as PriceKind | undefined;
  const explicitVerified = lot?.priceVerified ?? lot?.price_verified ?? lot?.price?.verified;

  const winningBid = num(lot?.winning_bid_amount ?? lot?.winningBidAmount ?? lot?.winning_bid);
  const currentBid = num(lot?.current_bid_amount ?? lot?.currentBidAmount ?? lot?.current_bid);
  const startingBid = num(lot?.starting_bid ?? lot?.startingBid);
  const fixedPrice = num(lot?.buy_now_price ?? lot?.buyNowPrice ?? lot?.fixed_price ?? lot?.fixedPrice);

  let priceKind: PriceKind = 'none';
  let price = 0;

  if (explicitKind) {
    priceKind = explicitKind;
    // Try a few reasonable places for the amount
    price = num(lot?.price ?? lot?.current_price ?? lot?.currentPrice ?? lot?.price_amount ?? lot?.priceAmount);
    if (!price) {
      // Fall back to common bid fields if no explicit amount is present
      if (priceKind === 'winning_bid') price = winningBid;
      else if (priceKind === 'current_bid') price = currentBid;
      else if (priceKind === 'starting_bid') price = startingBid;
      else if (priceKind === 'buy_now') price = fixedPrice;
    }
  } else if (winningBid > 0) {
    priceKind = 'winning_bid';
    price = winningBid;
  } else if (currentBid > 0) {
    priceKind = 'current_bid';
    price = currentBid;
  } else if (fixedPrice > 0) {
    priceKind = 'buy_now';
    price = fixedPrice;
  } else if (startingBid > 0) {
    priceKind = 'starting_bid';
    price = startingBid;
  } else {
    // best-effort fallback if fixtures use a generic price field
    price = num(lot?.price ?? lot?.current_price ?? lot?.currentPrice);
    priceKind = price > 0 ? 'estimate' : 'none';
  }

  const priceVerified =
    typeof explicitVerified === 'boolean'
      ? explicitVerified
      : // Infer verified-ness from kind (keep aligned with core/types.ts semantics)
        priceKind === 'winning_bid' || priceKind === 'current_bid' || priceKind === 'buy_now' || priceKind === 'sold';

  const locationText =
    typeof lot?.locationText === 'string'
      ? lot.locationText
      : typeof lot?.location_text === 'string'
        ? lot.location_text
        : typeof lot?.location === 'string'
          ? lot.location
          : undefined;

  const auctionEndAt =
    typeof lot?.auctionEndAt === 'string'
      ? lot.auctionEndAt
      : typeof lot?.auction_end_at === 'string'
        ? lot.auction_end_at
        : typeof lot?.auction?.end_time === 'string'
          ? lot.auction.end_time
          : undefined;

  const lotStatus = typeof lot?.lotStatus === 'string' ? lot.lotStatus : typeof lot?.lot_status === 'string' ? lot.lot_status : undefined;

  return {
    title,
    description,
    price,
    priceVerified,
    priceKind,
    locationText,
    auctionEndAt,
    lotStatus,
  };
}

function parseArgs(argv: string[]) {
  const out: {
    defsPath: string;
    maxBid?: number;
    stealThreshold?: number;
    inputs: string[];
  } = { defsPath: '', inputs: [] };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--defs') out.defsPath = argv[++i] ?? '';
    else if (a === '--maxBid') out.maxBid = Number(argv[++i]);
    else if (a === '--stealThreshold') out.stealThreshold = Number(argv[++i]);
    else out.inputs.push(a);
  }

  if (!out.defsPath) {
    throw new Error('Missing --defs <path-to-category-defs.json>');
  }
  if (out.inputs.length === 0) {
    throw new Error('Provide one or more fixture files or directories.');
  }

  return out;
}

function readJson<T>(p: string): T {
  const txt = fs.readFileSync(p, 'utf-8');
  return JSON.parse(txt) as T;
}

function collectJsonFiles(inputPath: string): string[] {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) return [];

  const out: string[] = [];
  for (const entry of fs.readdirSync(inputPath)) {
    const full = path.join(inputPath, entry);
    const s = fs.statSync(full);
    if (s.isDirectory()) out.push(...collectJsonFiles(full));
    else if (s.isFile() && full.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}

function norm(s: string) {
  return (s ?? '').trim().toLowerCase();
}

function pad(n: number, w: number) {
  const s = String(n);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}

function parseKeywords(field: unknown): string[] {
  if (field == null) return [];
  const raw = String(field).trim();
  if (!raw) return [];

  // Support BOTH JSON-array and CSV/line-delimited.
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr
          .map(v => String(v).trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  return raw
    .split(/[,\n\r;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function toLoadedCategory(d: CategoryDefInput): LoadedCategory | null {
  const id = String(d.id ?? d.category_id ?? d.name ?? '').trim();
  if (!id) return null;

  const name = String(d.name ?? id).trim();
  const enabled = Boolean((d.enabled ?? true) as any);
  const minScore = Number(d.min_score ?? d.minScore ?? 0);
  const requiresSnapshot = Boolean(d.requires_snapshot ?? d.requiresSnapshot ?? 0);

  const pos = d.positive ?? d.keywords_positive ?? '';
  const neg = d.negative ?? d.keywords_negative ?? '';

  return {
    id,
    name,
    enabled,
    minScore: Number.isFinite(minScore) ? minScore : 0,
    requiresSnapshot,
    positive: parseKeywords(pos),
    negative: parseKeywords(neg),
  };
}

function formatFixturePath(p: string) {
  const cwd = process.cwd();
  return p.startsWith(cwd) ? '.' + p.slice(cwd.length) : p;
}

function computeConfig(args: ReturnType<typeof parseArgs>): RunnerConfig {
  const maxBid = Number.isFinite(args.maxBid) ? Number(args.maxBid) : 15000;
  const stealThreshold = Number.isFinite(args.stealThreshold) ? Number(args.stealThreshold) : 2500;
  return { maxBid, stealThreshold };
}

function summarizeVerdict(v: Verdict): string {
  const cat = v.categoryName ?? 'NONE';
  const cand = v.status === 'candidate';
  const reason = v.rejectionReason ? ` reason=${v.rejectionReason}` : '';
  return `${cat} score=${pad(v.score, 3)}/${pad(v.minScore, 3)} candidate=${cand}${reason}`;
}

function formatMatches(v: Verdict): string[] {
  const out: string[] = [];
  if (v.matchedPositive?.length) out.push(`+ ${v.matchedPositive.join(', ')}`);
  if (v.matchedNegative?.length) out.push(`- ${v.matchedNegative.join(', ')}`);
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const config = computeConfig(args);

  const defsRaw = readJson<CategoryDefInput[]>(args.defsPath);
  if (!Array.isArray(defsRaw) || defsRaw.length === 0) {
    throw new Error('Defs file must be a JSON array of category definitions.');
  }

  const categories = defsRaw
    .map(toLoadedCategory)
    .filter((c): c is LoadedCategory => Boolean(c))
    .filter(c => c.enabled);

  if (categories.length === 0) {
    console.warn('[testRouter] WARNING: 0 enabled categories after parsing defs. All fixtures will reject.');
  }

  const files = args.inputs.flatMap(collectJsonFiles);
  if (files.length === 0) throw new Error('No .json fixtures found.');

  console.log('\nDFG Router Test');
  console.log(`Defs: ${args.defsPath}`);
  console.log(`Config: maxBid=${config.maxBid} stealThreshold=${config.stealThreshold}`);
  console.log(`Fixtures: ${files.length}\n`);

  let pass = 0;
  let fail = 0;

  for (const f of files) {
    const raw = readJson<FixtureFile>(f);
    const meta = raw.__fixture ?? {};
    const { __fixture, ...lot } = raw;

    const input = toRouterInputFromFixture(lot);
    const verdict = evaluateLotPure(input, categories as any, config);

    const gotCandidate = verdict.status === 'candidate';
    const gotCat = verdict.categoryName ?? 'NONE';

    const expCand = typeof meta.expectCandidate === 'boolean' ? meta.expectCandidate : undefined;
    const expCat = typeof meta.expectedCategory === 'string' ? meta.expectedCategory : undefined;

    let ok = true;
    if (typeof expCand === 'boolean' && expCand !== gotCandidate) ok = false;
    if (typeof expCat === 'string' && norm(expCat) !== norm(gotCat)) ok = false;

    const mark = ok ? '✅' : '❌';
    console.log(`${mark} ${formatFixturePath(f)}`);

    console.log(`   ${input.title}  (price=${input.price} kind=${input.priceKind} verified=${input.priceVerified})`);
    console.log(`   got: ${summarizeVerdict(verdict)}`);

    if (typeof expCand === 'boolean' || typeof expCat === 'string') {
      console.log(
        `   exp: ${expCat ?? '(any)'} candidate=${typeof expCand === 'boolean' ? expCand : '(any)'}`
      );
    }

    for (const line of formatMatches(verdict)) console.log(`   ${line}`);
    if (meta.note) console.log(`   note: ${meta.note}`);
    console.log('');

    if (ok) pass++;
    else fail++;
  }

  console.log(`Result: pass=${pass} fail=${fail}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`Fatal: ${err?.message ?? String(err)}`);
  process.exit(2);
});

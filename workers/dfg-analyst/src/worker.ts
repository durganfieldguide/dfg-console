// worker.ts - DFG Dual-Lens Analyst V2.7 (Truthful + Single Calc Spine)
import type {
  ListingData, ConditionAssessment, BuyerLensOutput,
  InvestorLensOutput, DualLensReport
} from "./types";

import {
  CONFIG, calculateMinimumViableRepair, calculateAcquisitionForBid,
  calculateProfitScenarios, calculateMaxBidBySearch,
  buildAssetSummary, buildNextSteps, applyVerdictGates,
  formatPhoenixResaleRange, assertFiniteNumber
} from "./analysis";
import { lookupPhoenixComps, SIERRA_FEES } from "./phoenix-market-data";
import {
  buildConditionPrompt,
  buildBuyerLensPrompt,
  buildInvestorLensPrompt,
  buildInvestorJustificationPrompt,
  buildBuyerJustificationPrompt
} from "./prompts";
import {
  detectAssetType,
  buildAssetSummaryForType,
  buildNextStepsForAsset,
  type AssetType
} from "./category-templates";
import {
  evaluateRisks,
  buildPreBidChecklist,
  getConditionConfidenceLabel,
  getRiskBannerText,
  type RiskAssessment
} from "./risk-taxonomy";
import {
  buildCalculationSpine,
  buildGatedEconomics,
  buildUnifiedConfidence,
  evaluateBidReadiness,
  evaluateConfidenceBreakdown,
  evaluateConditionScore,
  type CalculationSpine,
  type BidReadiness,
  type ConfidenceBreakdown,
  type GatedEconomics,
  type UnifiedConfidence
} from "./calculation-spine";

interface Env {
  ANTHROPIC_API_KEY: string;
  DEBUG?: string;
}

// Buyer-lens sanity bounds (keep buyer value anchored to Phoenix comps unless we have strong evidence)

const BUYER_MIN_MULTIPLIER = 1.1;
const BUYER_MAX_MULTIPLIER = 1.3;

// ============================================
// REPORT FORMATTING (DFG) — deterministic
// (No Claude needed; format what we already computed.)
// ============================================

type Verdict = "STRONG_BUY" | "BUY" | "MARGINAL" | "PASS";

// ============================================
// CANONICAL VERDICT LANGUAGE
// ============================================
// Internal verdicts: STRONG_BUY, BUY, MARGINAL, PASS
// Display verdicts: BUY, WATCH, PASS (user-facing)
//
// Hard definitions (do not soften):
// BUY = bid up to max bid if gates clear. This is a real number.
// WATCH = needs more info or price drop. Do not bid yet.
// PASS = do not spend time. Not "maybe later."

type DisplayVerdict = "BUY" | "WATCH" | "PASS";

function toDisplayVerdict(v: Verdict): DisplayVerdict {
  switch (v) {
    case "STRONG_BUY":
    case "BUY":
      return "BUY";
    case "MARGINAL":
      return "WATCH";
    case "PASS":
      return "PASS";
  }
}

// Post-process report markdown to replace legacy tokens
function normalizeReportLanguage(markdown: string): string {
  return markdown
    // Replace verdict labels
    .replace(/\bMARGINAL\b/g, 'WATCH')
    .replace(/\bSTRONG_BUY\b/g, 'BUY')
    // Replace bid readiness labels (keep underscore version for machine parsing)
    .replace(/\bNOT BID READY\b/gi, 'NOT BID-READY')
    .replace(/\bBID READY\b/gi, 'BID-READY')
    // Replace emoji mapping for consistency
    .replace(/🟠 WATCH/g, '🟡 WATCH'); // WATCH uses yellow, not orange
}

type ReportFields = {
  verdict: DisplayVerdict; // Use canonical display verdict for API response
  max_bid_mid: number;
  max_bid_worst: number;
  max_bid_best: number;
  retail_est: number;
  wholesale_floor: number;
  expected_profit: number;
  expected_margin: number;
  confidence: number; // 1–5
  auction_end: string | null;
  listing_url: string;
  title: string;
  key_specs: string;
};

type GateResult = { name: string; triggered: boolean; reason?: string };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function fmtMoney(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return `$${Math.round(x).toLocaleString()}`;
}

function fmtPct(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return `${(x * 100).toFixed(0)}%`;
}

function calculateConfidenceScore(condition: ConditionAssessment): number {
  let score = 5;

  // Photo evidence
  if (condition.photos_analyzed == null || condition.photos_analyzed < 2) score -= 2;
  else if (condition.photos_analyzed < 4) score -= 1;

  // Identity confidence
  if (condition.identity_confidence === "low") score -= 1;
  if (condition.identity_conflict) score -= 1;

  // Title risk
  if (condition.title_status === "unknown" || condition.title_status === "on_file") score -= 1;

  // Brake uncertainty on tandem
  if (condition.axle_status === "tandem" && condition.brakes === "unknown") score -= 1;

  // Storage constraint (garage)
  if ((condition.dimensions?.length_ft ?? 0) > 18) score -= 1;

  return clamp(score, 1, 5);
}

// ============================================
// EVIDENCE LEDGER - Track what backs each claim
// ============================================
// HARD RULE: verified=true requires at least one DIRECT evidence type
// DIRECT (can verify): photo, listing_text, vin_decode, seller_stated
// INDIRECT (cannot verify alone): pattern, inferred, default

type EvidenceType = 'photo' | 'listing_text' | 'vin_decode' | 'seller_stated' | 'pattern' | 'inferred' | 'default';

// Direct evidence types that CAN contribute to verification
const DIRECT_EVIDENCE_TYPES: EvidenceType[] = ['photo', 'listing_text', 'vin_decode', 'seller_stated'];

// Indirect evidence types that CANNOT verify on their own
const INDIRECT_EVIDENCE_TYPES: EvidenceType[] = ['pattern', 'inferred', 'default'];

interface EvidenceCitation {
  type: EvidenceType;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  detail?: string;
  // Source reference for traceability
  source_ref?: {
    photo_indices?: number[];      // e.g., [0, 2, 5] for photos 1, 3, 6
    text_snippet?: string;         // First 50 chars of matching sentence
    text_hash?: string;            // Hash of full matching text for lookup
    vin_provider?: string;         // e.g., "NHTSA", "CarFax"
    seller_method?: string;        // e.g., "listing_description", "phone_call"
  };
}

interface SubsystemEvidence {
  claim: string;
  evidence: EvidenceCitation[];
  verified: boolean;
  verification_basis: string;      // Explicit explanation of why verified/not
  summary: string;
}

// Helper to extract text snippets containing keywords
function extractTextSnippet(text: string, keywords: string[]): { snippet: string; hash: string } | null {
  const textLower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = textLower.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      // Extract ~60 chars centered on the keyword
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + kw.length + 40);
      const snippet = text.slice(start, end).trim();
      // Simple hash: first 8 chars of base64 of snippet
      const hash = btoa(snippet.slice(0, 30)).slice(0, 8);
      return { snippet: snippet.length > 50 ? snippet.slice(0, 47) + '...' : snippet, hash };
    }
  }
  return null;
}

function buildEvidenceLedger(
  condition: ConditionAssessment,
  listingData: { photos: string[]; description: string; title: string },
  actualPhotosAnalyzed?: number  // From actual fetch results, not Claude's claim
): NonNullable<ConditionAssessment['evidence_ledger']> {
  // CRITICAL: Use actual successfully fetched photos, NOT Claude's claim or received count
  // Evidence only exists if we actually processed the photo
  const photoCount = actualPhotosAnalyzed ?? condition.photo_metrics?.analyzed_ok ?? 0;
  const hasDescription = listingData.description && listingData.description.length > 50;
  const descText = listingData.description || '';

  // Helper to build subsystem evidence with strict verification rules
  function buildSubsystem(
    claim: string | undefined | null,
    field: string,
    photoEvidence: boolean,
    textKeywords: string[]  // Keywords to search for in description
  ): SubsystemEvidence {
    const evidence: EvidenceCitation[] = [];
    const claimStr = claim || 'Unknown';

    if (claimStr === 'Unknown' || claimStr === 'unknown') {
      return {
        claim: 'Unknown',
        evidence: [],
        verified: false,
        verification_basis: 'No claim made',
        summary: 'No evidence available'
      };
    }

    // Check for text mention and extract snippet
    const textMatch = hasDescription ? extractTextSnippet(descText, textKeywords) : null;

    // Add photo evidence with source_ref
    // photoCount is actual successfully-fetched photos, not received URLs
    if (photoEvidence && photoCount >= 2) {
      // Generate approximate photo indices (we don't have exact mapping, so estimate)
      const photoIndices = Array.from({ length: Math.min(photoCount, 4) }, (_, i) => i);
      evidence.push({
        type: 'photo',
        source: `${photoCount} photos analyzed`,
        confidence: photoCount >= 6 ? 'high' : photoCount >= 4 ? 'medium' : 'low',
        detail: `${field} assessed from ${photoCount} successfully processed photos`,
        source_ref: {
          photo_indices: photoIndices
        }
      });
    }

    // Add text evidence with source_ref
    if (textMatch) {
      evidence.push({
        type: 'listing_text',
        source: 'Listing description',
        confidence: 'medium',
        detail: `${field} mentioned in description`,
        source_ref: {
          text_snippet: textMatch.snippet,
          text_hash: textMatch.hash
        }
      });
    }

    // If no direct evidence, add inferred (but this CANNOT verify)
    if (evidence.length === 0) {
      evidence.push({
        type: 'inferred',
        source: 'Analysis inference',
        confidence: 'low',
        detail: `${field} inferred from available data`
      });
    }

    // ============================================
    // STRICT VERIFICATION RULES
    // ============================================
    // verified=true requires at least one DIRECT evidence type
    // pattern/inferred/default can NEVER contribute to verification

    const directEvidence = evidence.filter(e => DIRECT_EVIDENCE_TYPES.includes(e.type));
    const hasDirectEvidence = directEvidence.length > 0;

    // Only direct evidence can verify. Count high/medium confidence from DIRECT sources only.
    const directHighConf = directEvidence.filter(e => e.confidence === 'high');
    const directMediumConf = directEvidence.filter(e => e.confidence === 'medium');

    // Verification requires:
    // - At least one high-confidence direct source, OR
    // - At least two medium-confidence direct sources (e.g., photo + text)
    const verified = directHighConf.length >= 1 || directMediumConf.length >= 2;

    // Build explicit verification basis
    let verificationBasis: string;
    if (!hasDirectEvidence) {
      verificationBasis = 'No direct evidence (inferred only)';
    } else if (verified) {
      if (directHighConf.length >= 1) {
        verificationBasis = `High-confidence ${directHighConf[0].type}`;
      } else {
        verificationBasis = `${directMediumConf.length} medium-confidence sources: ${directMediumConf.map(e => e.type).join(' + ')}`;
      }
    } else {
      verificationBasis = `Insufficient: ${directEvidence.length} direct source(s), but below threshold`;
    }

    // Build summary - be honest about what we actually have
    const photoEvidenceCount = evidence.filter(e => e.type === 'photo').length;
    const textEvidenceCount = evidence.filter(e => e.type === 'listing_text').length;
    const inferredCount = evidence.filter(e => INDIRECT_EVIDENCE_TYPES.includes(e.type)).length;

    let summary = '';
    if (verified) {
      if (photoEvidenceCount > 0 && textEvidenceCount > 0) {
        summary = `Verified: photo + text`;
      } else if (photoEvidenceCount > 0) {
        const conf = directHighConf.some(e => e.type === 'photo') ? 'high-conf' : 'med-conf';
        summary = `Verified: ${conf} photo`;
      } else if (textEvidenceCount > 0) {
        summary = `Verified: listing text`;
      } else {
        summary = `Verified: direct evidence`;
      }
    } else {
      if (photoEvidenceCount > 0 || textEvidenceCount > 0) {
        summary = `Unverified: insufficient confidence`;
      } else if (inferredCount > 0) {
        summary = `Unverified: inferred only`;
      } else {
        summary = `Unverified: no direct evidence`;
      }
    }

    return { claim: claimStr, evidence, verified, verification_basis: verificationBasis, summary };
  }

  // Build evidence for each subsystem with specific keywords
  const frame = buildSubsystem(
    condition.frame_integrity || condition.frame_rust_severity,
    'Frame',
    photoCount >= 3,
    ['frame', 'rust', 'structural', 'chassis', 'undercarriage']
  );

  const axles = buildSubsystem(
    condition.axle_condition || condition.axle_status,
    'Axles',
    photoCount >= 2,
    ['axle', 'axles', 'tandem', 'single axle', 'dual axle']
  );

  const tiresValue = typeof condition.tires === 'object'
    ? (condition.tires as any)?.condition
    : condition.tires;
  const tires = buildSubsystem(
    tiresValue,
    'Tires',
    photoCount >= 2,
    ['tire', 'tires', 'tread', 'wheel', 'wheels']
  );

  const brakes = buildSubsystem(
    condition.brakes,
    'Brakes',
    false,
    ['brake', 'brakes', 'braking', 'electric brake', 'surge brake']
  );

  const lights = buildSubsystem(
    condition.lights,
    'Lights',
    photoCount >= 2,
    ['light', 'lights', 'lighting', 'led', 'tail light', 'marker']
  );

  const exteriorValue = typeof condition.exterior === 'object'
    ? (condition.exterior as any)?.paint_condition || (condition.exterior as any)?.body_damage
    : condition.exterior;
  const exterior = buildSubsystem(
    exteriorValue,
    'Exterior',
    photoCount >= 1,
    ['paint', 'body', 'dent', 'scratch', 'exterior', 'finish', 'rust']
  );

  const interiorValue = typeof condition.interior === 'object'
    ? (condition.interior as any)?.condition || (condition.interior as any)?.seats
    : condition.interior;
  const interior = buildSubsystem(
    interiorValue,
    'Interior',
    photoCount >= 4,
    ['interior', 'seats', 'seat', 'dashboard', 'carpet', 'upholstery', 'cabin']
  );

  const mechanicalValue = typeof condition.mechanical === 'object'
    ? (condition.mechanical as any)?.engine_status || 'Unknown'
    : condition.mechanical;
  const mechanical = buildSubsystem(
    mechanicalValue,
    'Mechanical',
    false,
    ['engine', 'motor', 'runs', 'running', 'transmission', 'starts', 'drives', 'mechanical']
  );

  const title = buildSubsystem(
    condition.title_status,
    'Title',
    false,
    ['title', 'clean title', 'salvage', 'rebuilt', 'clear title', 'lien']
  );

  // Count stats with strict rules
  const subsystems = [frame, axles, tires, brakes, lights, exterior, interior, mechanical, title];
  const totalClaims = subsystems.filter(s => s.claim !== 'Unknown').length;
  const verifiedClaims = subsystems.filter(s => s.verified).length;
  const photoBacked = subsystems.filter(s => s.evidence.some(e => e.type === 'photo')).length;
  const textBacked = subsystems.filter(s => s.evidence.some(e => e.type === 'listing_text')).length;
  const inferredOnly = subsystems.filter(s =>
    s.evidence.length > 0 && s.evidence.every(e => INDIRECT_EVIDENCE_TYPES.includes(e.type))
  ).length;

  return {
    frame,
    axles,
    tires,
    brakes,
    lights,
    exterior,
    interior,
    mechanical,
    title,
    total_claims: totalClaims,
    verified_claims: verifiedClaims,
    photo_backed: photoBacked,
    text_backed: textBacked,
    inferred: inferredOnly
  };
}

// ============================================
// MARKET DEMAND ASSESSMENT - Never say "Unknown"
// ============================================

type DemandLevel = 'high' | 'moderate' | 'low' | 'niche';

interface MarketDemandAssessment {
  level: DemandLevel;
  confidence: 'high' | 'medium' | 'low';
  is_heuristic: boolean;  // True if no real comps/DOM data - confidence capped at medium
  basis: {
    method: 'comps_data' | 'category_heuristic' | 'price_band' | 'seasonal' | 'combined';
    factors: string[];
  };
  missing_inputs: string[];
  implications: {
    expected_days_to_sell: string;
    pricing_advice: string;
    risk_note: string | null;
  };
  summary: string;
}

function assessMarketDemand(args: {
  assetType: string;
  trailerType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  toolType?: string;
  pricePoint: number;  // Expected sale price
  titleStatus?: string;
  location?: { state?: string };
}): MarketDemandAssessment {
  const { assetType, trailerType, vehicleMake, vehicleModel, toolType, pricePoint, titleStatus, location } = args;

  const factors: string[] = [];
  const missingInputs: string[] = [];
  let level: DemandLevel = 'moderate';
  // GUARDRAIL #1: Without real comps/DOM data, confidence is ALWAYS capped at 'medium'
  // We never claim 'high' confidence on heuristic-only assessments
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const MAX_HEURISTIC_CONFIDENCE: 'high' | 'medium' | 'low' = 'medium';  // Cap for all heuristic estimates

  // Method is always 'heuristic' until we have real data feeds
  let method: MarketDemandAssessment['basis']['method'] = 'category_heuristic';
  const isHeuristicOnly = true;  // Flag for when we get real data later

  // Always note we don't have real-time comps - this is critical transparency
  missingInputs.push('Real-time local comps feed');
  missingInputs.push('Days-on-market data');

  // === TRAILER DEMAND HEURISTICS ===
  if (assetType === 'trailer') {
    method = 'combined';

    // Enclosed trailers are always in demand
    if (trailerType === 'enclosed') {
      level = 'high';
      factors.push('Enclosed trailers have broad buyer appeal');
      confidence = 'medium';
    } else if (trailerType === 'car_hauler') {
      level = 'moderate';
      factors.push('Car haulers serve specific buyer segment');
    } else if (trailerType === 'dump') {
      level = 'moderate';
      factors.push('Dump trailers popular with contractors');
    } else if (trailerType === 'flatbed' || trailerType === 'open_utility') {
      level = 'high';
      factors.push('Utility trailers have wide appeal for homeowners/businesses');
      confidence = 'medium';
    } else {
      level = 'moderate';
      factors.push('Standard trailer category');
    }

    // Price band heuristics for trailers
    if (pricePoint <= 3000) {
      level = 'high';
      factors.push('Sub-$3k price point attracts impulse buyers');
      confidence = confidence === 'medium' ? 'medium' : 'low';
    } else if (pricePoint <= 6000) {
      factors.push('$3k-$6k is active trailer market segment');
    } else if (pricePoint <= 10000) {
      factors.push('$6k-$10k requires more serious buyer');
      if (level === 'high') level = 'moderate';
    } else {
      factors.push('Above $10k narrows buyer pool significantly');
      level = level === 'high' ? 'moderate' : 'low';
    }

    // GUARDRAIL #2: Title status affects ALL asset types, not just vehicles
    // Salvage/rebuilt/unknown titles shrink buyer pool regardless of category
    if (titleStatus === 'salvage' || titleStatus === 'rebuilt' || titleStatus === 'unknown') {
      level = 'niche';
      factors.push(`${titleStatus} title significantly limits buyer pool`);
      confidence = 'medium';  // We're confident about this negative impact
    }
  }

  // === VEHICLE DEMAND HEURISTICS ===
  else if (assetType === 'vehicle') {
    method = 'combined';

    // Popular makes/models
    const popularMakes = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan'];
    const makeLower = (vehicleMake || '').toLowerCase();
    if (popularMakes.includes(makeLower)) {
      level = 'high';
      factors.push(`${vehicleMake} has strong resale demand`);
      confidence = 'medium';
    } else {
      level = 'moderate';
      factors.push('Standard vehicle brand');
    }

    // Price band for vehicles
    if (pricePoint <= 5000) {
      factors.push('Sub-$5k vehicles move quickly (first-car/beater market)');
      if (level !== 'high') level = 'high';
    } else if (pricePoint <= 15000) {
      factors.push('$5k-$15k is competitive used car segment');
    } else {
      factors.push('Above $15k requires qualified buyer');
      if (level === 'high') level = 'moderate';
    }

    // GUARDRAIL #2: Title status affects buyer pool significantly
    // Salvage/rebuilt/unknown all shrink the pool
    if (titleStatus === 'salvage' || titleStatus === 'rebuilt' || titleStatus === 'unknown') {
      level = 'niche';
      factors.push(`${titleStatus} title limits buyer pool to mechanics/rebuilders`);
      confidence = 'medium';  // We're confident about this negative impact
    }
  }

  // === POWER TOOL DEMAND HEURISTICS ===
  else if (assetType === 'power_tools') {
    method = 'category_heuristic';

    const toolLower = (toolType || '').toLowerCase();
    if (toolLower.includes('drill') || toolLower.includes('impact') || toolLower.includes('saw')) {
      level = 'high';
      factors.push('Core power tools have consistent demand');
      confidence = 'medium';
    } else if (toolLower.includes('welder') || toolLower.includes('compressor')) {
      level = 'moderate';
      factors.push('Specialty tools serve specific trades');
    } else {
      level = 'moderate';
      factors.push('General power tool category');
    }

    // Price band for tools
    if (pricePoint <= 200) {
      factors.push('Sub-$200 tools sell quickly on FB Marketplace');
      level = 'high';
    } else if (pricePoint <= 500) {
      factors.push('$200-$500 range is active tool market');
    } else {
      factors.push('Above $500 requires trade professional buyer');
      if (level === 'high') level = 'moderate';
    }
  }

  // === UNKNOWN ASSET TYPE ===
  else {
    method = 'price_band';
    level = 'moderate';
    factors.push('Category not in demand database - using price band heuristic');
    missingInputs.push('Category-specific demand data');

    if (pricePoint <= 2000) {
      factors.push('Low price point generally moves faster');
    } else if (pricePoint > 10000) {
      factors.push('Higher price point typically slower to sell');
      level = 'low';
    }
  }

  // === UNIVERSAL TITLE STATUS CHECK ===
  // GUARDRAIL #2: Apply title downgrade to ALL asset types that didn't already handle it
  // (Power tools and unknown categories need this check)
  if (assetType !== 'trailer' && assetType !== 'vehicle') {
    if (titleStatus === 'salvage' || titleStatus === 'rebuilt' || titleStatus === 'unknown') {
      // Only downgrade if not already niche
      if (level !== 'niche') {
        level = 'niche';
        factors.push(`${titleStatus} title limits buyer pool`);
      }
    }
  }

  // === APPLY CONFIDENCE CAP ===
  // GUARDRAIL #1: Without real comps/DOM data, we NEVER claim high confidence
  // Note: Currently isHeuristicOnly is always true (we don't have comps feeds yet),
  // but this code is written to handle future data sources
  if (isHeuristicOnly) {
    // Use type assertion for future-proofing when comps data becomes available
    const rawConfidence = confidence as 'high' | 'medium' | 'low';
    if (rawConfidence === 'high') {
      confidence = MAX_HEURISTIC_CONFIDENCE;
      factors.push('Confidence capped at medium (no real-time market data)');
    }
  }

  // === BUILD IMPLICATIONS ===
  let expectedDays: string;
  let pricingAdvice: string;
  let riskNote: string | null = null;

  switch (level) {
    case 'high':
      expectedDays = '7-14 days';
      pricingAdvice = 'Price at market rate - will move quickly';
      break;
    case 'moderate':
      expectedDays = '14-30 days';
      pricingAdvice = 'Competitive pricing recommended for faster sale';
      break;
    case 'low':
      expectedDays = '30-60+ days';
      pricingAdvice = 'Consider aggressive pricing or niche listing platforms';
      riskNote = 'Extended holding time increases carrying costs';
      break;
    case 'niche':
      expectedDays = '30-90 days';
      pricingAdvice = 'Target specialty buyers - FB groups, forums, trade channels';
      riskNote = 'Niche market requires patience or price flexibility';
      break;
  }

  // === BUILD SUMMARY ===
  // GUARDRAIL #1: Always label as "Heuristic" when using heuristic-only estimates
  const rawConfidenceForNote = confidence as 'high' | 'medium' | 'low';  // Type assertion for future-proofing
  const confidenceNote = isHeuristicOnly
    ? ' (heuristic)'  // Always show this label when no real data
    : rawConfidenceForNote === 'high' ? ' (data-backed)' : '';
  const categoryLabel = assetType === 'trailer' ? trailerType || 'trailer' :
                        assetType === 'vehicle' ? `${vehicleMake || ''} ${vehicleModel || ''}`.trim() || 'vehicle' :
                        assetType === 'power_tools' ? toolType || 'power tool' : assetType;

  const priceLabel = pricePoint <= 3000 ? 'under $3k' :
                     pricePoint <= 6000 ? '$3k-$6k' :
                     pricePoint <= 10000 ? '$6k-$10k' : 'above $10k';

  const summary = level === 'high'
    ? `High demand${confidenceNote}: ${categoryLabel} ${priceLabel} sells quickly`
    : level === 'moderate'
    ? `Moderate demand${confidenceNote}: ${categoryLabel} at ${priceLabel} has steady buyer interest`
    : level === 'low'
    ? `Low demand${confidenceNote}: ${categoryLabel} at ${priceLabel} may require patience or price cut`
    : `Niche market${confidenceNote}: ${categoryLabel} requires targeted marketing`;

  return {
    level,
    confidence,
    is_heuristic: isHeuristicOnly,
    basis: { method, factors },
    missing_inputs: missingInputs,
    implications: {
      expected_days_to_sell: expectedDays,
      pricing_advice: pricingAdvice,
      risk_note: riskNote
    },
    summary
  };
}

function evaluateGates(condition: ConditionAssessment, scenarios?: any): GateResult[] {
  const gates: GateResult[] = [];

  // Photo gates - distinguish seller's limited photos from fetch failures
  const pm = condition.photo_metrics;
  if (pm) {
    if (!pm.availability_known) {
      // PHOTO_COUNT_UNKNOWN: we don't know how many photos the source has
      // This is a neutral/low-severity gate - fixable by rehydration/backfill
      // Don't trigger limited_photos or photo_fetch_failed when we're guessing
      gates.push({
        name: "photo_count_unknown",
        triggered: true,
        reason: "Photo count not tracked by source (legacy data or missing field)"
      });
    } else {
      // LIMITED_PHOTOS: seller provided few photos (this is the seller's problem)
      gates.push({
        name: "limited_photos",
        triggered: pm.available < 4,
        reason: pm.available < 4 ? `Listing only has ${pm.available} photo(s) available` : undefined
      });
      // PHOTO_FETCH_FAILED: we received photos but couldn't analyze them (our problem)
      if (pm.analyzed_failed > 0 && pm.received >= 4) {
        gates.push({
          name: "photo_fetch_failed",
          triggered: true,
          reason: `Failed to analyze ${pm.analyzed_failed} of ${pm.selected} photos (hotlink blocked?)`
        });
      }
    }
  } else {
    // Fallback for legacy (no photo_metrics at all): mark as unknown
    gates.push({
      name: "photo_count_unknown",
      triggered: true,
      reason: "No photo metrics available (legacy analysis)"
    });
  }

  gates.push({
    name: "identity_conflict",
    triggered: condition.identity_conflict === true,
    reason: condition.identity_conflict ? "VIN/title/visual mismatch detected" : undefined
  });

  gates.push({
    name: "storage_length",
    triggered: (condition.dimensions?.length_ft ?? 0) > 18,
    reason: condition.dimensions?.length_ft ? `${condition.dimensions.length_ft}ft exceeds garage capacity` : undefined
  });

  gates.push({
    name: "unknown_brakes_tandem",
    triggered: condition.axle_status === "tandem" && condition.brakes === "unknown",
    reason: "Tandem axle with unknown brake status"
  });

  gates.push({
    name: "title_issue",
    triggered: !!condition.title_status && condition.title_status !== "clean",
    reason: condition.title_status ? `Title status: ${condition.title_status}` : undefined
  });

  const qs = scenarios?.quick_sale;
  if (qs && typeof qs.gross_profit === "number" && typeof qs.margin === "number") {
    gates.push({
      name: "thin_downside",
      triggered: qs.gross_profit < 300 && qs.margin < 0.15,
      reason: `Quick-sale profit ${fmtMoney(qs.gross_profit)} at ${fmtPct(qs.margin)} margin`
    });
  }

  return gates;
}

function buildReportFields(args: {
  assetSummary: any;
  investorLens: InvestorLensOutput;
  buyerLens: BuyerLensOutput;
  condition: ConditionAssessment;
  wholesaleFloor?: number;
}): ReportFields {
  const { assetSummary, investorLens, buyerLens, condition, wholesaleFloor } = args;

  const scenarios: any = (investorLens as any).scenarios;

  const maxBidMid = investorLens.max_bid ?? 0;
  const maxBidWorst = Math.round(maxBidMid * 0.85);
  const maxBidBest = Math.round(maxBidMid * 1.10);

  const retailEst =
    (buyerLens as any)?.perceived_value_range?.high ??
    scenarios?.premium?.sale_price ??
    scenarios?.expected?.sale_price ??
    0;

  const expectedProfit = scenarios?.expected?.gross_profit ?? 0;
  const expectedMargin = scenarios?.expected?.margin ?? 0;

  const confidence = calculateConfidenceScore(condition);

  const floor =
    wholesaleFloor ??
    (investorLens as any).total_investment ??
    (investorLens as any).totalInvestment ??
    (investorLens as any).acquisition_model?.total_acquisition ??
    0;

  // Use canonical display verdict (BUY/WATCH/PASS) for API response
  const internalVerdict = (investorLens.verdict as Verdict) ?? "PASS";

  return {
    verdict: toDisplayVerdict(internalVerdict),
    max_bid_mid: maxBidMid,
    max_bid_worst: maxBidWorst,
    max_bid_best: maxBidBest,
    retail_est: retailEst,
    wholesale_floor: floor,
    expected_profit: expectedProfit,
    expected_margin: expectedMargin,
    confidence,
    auction_end: assetSummary?.auction_end ?? null,
    listing_url: assetSummary?.listing_url ?? "",
    title: assetSummary?.title ?? "",
    key_specs: assetSummary?.key_specs ?? ""
  };
}

function buildReportSummary(args: {
  assetSummary: any;
  investorLens: InvestorLensOutput;
  condition: ConditionAssessment;
}): string {
  const { assetSummary, investorLens, condition } = args;
  const internalVerdict = (investorLens.verdict as Verdict) ?? "PASS";
  const displayVerdict = toDisplayVerdict(internalVerdict);
  const maxBid = investorLens.max_bid ?? 0;
  const category = (investorLens as any).phoenix_comp_category || "standard";

  const gates = evaluateGates(condition, (investorLens as any).scenarios);
  const triggered = gates.filter(g => g.triggered).map(g => g.name.replace(/_/g, " "));
  const gateNote = triggered.length
    ? ` Gates: ${triggered.slice(0, 2).join(", ")}${triggered.length > 2 ? "…" : ""}.`
    : "";

  const categoryNote = category === "unicorn" ? " 🦄 Phoenix unicorn." : "";

  // Use canonical display verdict (BUY/WATCH/PASS)
  return `${displayVerdict}: ${assetSummary?.key_specs ?? ""}.${categoryNote}${gateNote} Max bid ${fmtMoney(maxBid)}.`;
}

function buildReportMarkdown(args: {
  assetSummary: any;
  investorLens: InvestorLensOutput;
  buyerLens: BuyerLensOutput;
  condition: ConditionAssessment;
  nextSteps: { if_bidding: string[]; if_won: string[]; listing_prep: string[] };
  riskAssessment?: RiskAssessment;
  marketDemand?: { level: string; implications?: { expected_days_to_sell?: string } };
}): string {
  const { assetSummary, investorLens, buyerLens, condition, nextSteps, riskAssessment, marketDemand } = args;

  const scenarios: any = (investorLens as any).scenarios;
  const acquisition: any = (investorLens as any).acquisition_model;

  const internalVerdict = ((investorLens.verdict as Verdict) ?? "PASS");
  const displayVerdict = toDisplayVerdict(internalVerdict);
  const maxBid = investorLens.max_bid ?? 0;

  const gates = evaluateGates(condition, scenarios);
  const triggeredGates = gates.filter(g => g.triggered);

  const lines: string[] = [];

  // ============================================
  // SECTION 1: DECISION + GATING RULE
  // ============================================
  const verdictEmoji: Record<DisplayVerdict, string> = { BUY: "🟢", WATCH: "🟡", PASS: "🔴" };
  lines.push(`## ${verdictEmoji[displayVerdict]} ${displayVerdict}`);

  if (displayVerdict === "BUY") {
    if (triggeredGates.length > 0) {
      const gateList = triggeredGates.slice(0, 2).map(g => g.name.replace(/_/g, " ")).join(" + ");
      lines.push(`Bid up to **${fmtMoney(maxBid)}** IF gates clear: ${gateList}`);
      lines.push(`If gates don't clear: reduce to **${fmtMoney(Math.round(maxBid * 0.8))}** or PASS`);
    } else {
      lines.push(`Bid up to **${fmtMoney(maxBid)}** — no gates blocking`);
    }
  } else if (displayVerdict === "WATCH") {
    lines.push(`Do not bid yet. Needs price drop or more information.`);
    if (triggeredGates.length > 0) {
      lines.push(`Blocking: ${triggeredGates.slice(0, 2).map(g => g.name.replace(/_/g, " ")).join(", ")}`);
    }
  } else {
    lines.push(`Do not bid. Do not spend more time on this deal.`);
  }

  // ============================================
  // SECTION 2: NUMBERS (ONE LINE)
  // ============================================
  lines.push(`\n---\n### 💰 Numbers`);
  const allIn = acquisition?.total_acquisition ?? 0;
  const profit = scenarios?.expected?.gross_profit ?? 0;
  const margin = scenarios?.expected?.margin ?? 0;
  const qsProfit = scenarios?.quick_sale?.gross_profit ?? 0;
  lines.push(`Max ${fmtMoney(maxBid)} → All-in ${fmtMoney(allIn)} → Sell ${fmtMoney(scenarios?.expected?.sale_price ?? 0)} → Profit ${fmtMoney(profit)} (${fmtPct(margin)}) | Floor ${fmtMoney(qsProfit)}`);

  // ============================================
  // SECTION 3: WHY IT WORKS (3 BULLETS)
  // ============================================
  // ENFORCEMENT: Each bullet must have a source. No vibes.
  // Sources: economics_calc, gates, condition_assessment, market_demand, title_status, photos, repair_plan
  type BulletSource = 'economics_calc' | 'gates' | 'condition_assessment' | 'market_demand' | 'title_status' | 'photos' | 'repair_plan' | 'scarcity';
  interface SourcedBullet { text: string; source: BulletSource; confidence: 'high' | 'medium' | 'low' }

  lines.push(`\n---\n### ✅ Why It Works`);
  const whyWorks: SourcedBullet[] = [];

  // Economic strength - SOURCE: economics_calc (scenarios.expected.margin)
  if (typeof margin === 'number' && Number.isFinite(margin)) {
    if (margin >= 0.35) {
      whyWorks.push({ text: `${fmtPct(margin)} margin exceeds 35% target`, source: 'economics_calc', confidence: 'high' });
    } else if (margin >= 0.25) {
      whyWorks.push({ text: `${fmtPct(margin)} margin meets minimum threshold`, source: 'economics_calc', confidence: 'medium' });
    }
  }

  // Downside protection - SOURCE: economics_calc (scenarios.quick_sale.gross_profit)
  if (typeof qsProfit === 'number' && Number.isFinite(qsProfit) && qsProfit >= 300) {
    whyWorks.push({ text: `Quick-sale floor of ${fmtMoney(qsProfit)} protects downside`, source: 'economics_calc', confidence: 'high' });
  }

  // Market factors - SOURCE: market_demand (ONLY if confidence is medium+)
  const demandLevel = marketDemand?.level;
  const demandConfidence = (marketDemand as any)?.confidence;
  // GUARDRAIL: Only emit market demand bullets if confidence is medium or better
  if (demandLevel === 'high' && demandConfidence !== 'low') {
    whyWorks.push({ text: `High market demand — expect ${marketDemand?.implications?.expected_days_to_sell || '7-14 days'}`, source: 'market_demand', confidence: demandConfidence === 'high' ? 'high' : 'medium' });
  } else if (demandLevel === 'moderate' && demandConfidence !== 'low') {
    whyWorks.push({ text: `Moderate demand — expect ${marketDemand?.implications?.expected_days_to_sell || '14-30 days'}`, source: 'market_demand', confidence: 'medium' });
  }
  // NOTE: Low/niche demand goes in "Why It Could Fail", not here

  // Title status - SOURCE: title_status (condition.title_status)
  if (condition.title_status === 'clean') {
    whyWorks.push({ text: `Clean title — full buyer pool`, source: 'title_status', confidence: 'high' });
  }

  // Scarcity - SOURCE: scarcity (phoenix_comp_category)
  const scarcity = (investorLens as any).scarcity_factor;
  const phoenixCategory = (investorLens as any).phoenix_comp_category;
  if (phoenixCategory === 'unicorn' || scarcity === 'unicorn') {
    whyWorks.push({ text: `🦄 Unicorn category — pricing power if patient`, source: 'scarcity', confidence: 'high' });
  } else if (scarcity === 'scarce') {
    whyWorks.push({ text: `Scarce asset — reduced competition`, source: 'scarcity', confidence: 'medium' });
  }

  // Repair simplicity - SOURCE: repair_plan (investorLens.repair_plan)
  const repairTotal = (investorLens as any).repair_plan?.grand_total ?? null;
  if (repairTotal === 0) {
    whyWorks.push({ text: `No repairs needed — flip as-is`, source: 'repair_plan', confidence: 'high' });
  } else if (typeof repairTotal === 'number' && repairTotal < 200) {
    whyWorks.push({ text: `Minimal repairs (${fmtMoney(repairTotal)}) — quick turnaround`, source: 'repair_plan', confidence: 'medium' });
  }

  // Photo count - SOURCE: photos (only if 6+ photos = good coverage)
  const photoCount = condition.photos_analyzed ?? 0;
  if (photoCount >= 6) {
    whyWorks.push({ text: `${photoCount} photos provide good condition visibility`, source: 'photos', confidence: 'medium' });
  }

  // Take top 3 with highest confidence, or provide honest fallback
  const sortedWhyWorks = whyWorks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
  const finalWhyWorks = sortedWhyWorks.slice(0, 3);

  // HONEST FALLBACK: If no sourced positives, say so
  if (finalWhyWorks.length === 0) {
    lines.push(`• No strong positives identified — proceed with caution`);
  } else {
    finalWhyWorks.forEach(w => lines.push(`• ${w.text}`));
  }

  // ============================================
  // SECTION 4: WHY IT COULD FAIL (3 BULLETS)
  // ============================================
  // ENFORCEMENT: Each bullet must have a source. No vibes.
  lines.push(`\n---\n### ⚠️ Why It Could Fail`);
  const whyFail: SourcedBullet[] = [];

  // Gate-based risks - SOURCE: gates (evaluateGates output)
  const pm = condition.photo_metrics;
  triggeredGates.forEach(g => {
    if (g.name === 'limited_photos') {
      const available = pm?.available ?? photoCount;
      whyFail.push({ text: `Only ${available} photo(s) available — hidden damage possible`, source: 'photos', confidence: 'high' });
    } else if (g.name === 'photo_fetch_failed') {
      // This is a system problem, not seller's fault - different messaging
      whyFail.push({ text: `Analyzed ${pm?.analyzed_ok ?? 0}/${pm?.available ?? 'N/A'} photos (fetch issues) — coverage limited`, source: 'photos', confidence: 'medium' });
    } else if (g.name === 'identity_conflict') {
      whyFail.push({ text: `Title/year mismatch detected — verify before bidding`, source: 'gates', confidence: 'high' });
    } else if (g.name === 'unknown_brakes_tandem') {
      whyFail.push({ text: `Unknown brakes on tandem axle — could add $200-400`, source: 'gates', confidence: 'high' });
    } else if (g.name === 'title_issue') {
      whyFail.push({ text: `Title is '${condition.title_status}' — limits buyer pool`, source: 'title_status', confidence: 'high' });
    } else if (g.name === 'storage_length') {
      whyFail.push({ text: `${condition.dimensions?.length_ft}ft length exceeds storage capacity`, source: 'condition_assessment', confidence: 'high' });
    } else if (g.name === 'thin_downside') {
      whyFail.push({ text: `Quick-sale profit only ${fmtMoney(qsProfit)} — no room for surprises`, source: 'economics_calc', confidence: 'high' });
    }
  });

  // Risk assessment items - SOURCE: condition_assessment (riskAssessment from Claude)
  if (riskAssessment) {
    riskAssessment.observed_issues.forEach(issue => {
      if (issue.severity === 'deal_breaker' || issue.severity === 'major_concern') {
        whyFail.push({ text: issue.title, source: 'condition_assessment', confidence: 'medium' });
      }
    });
    riskAssessment.unverified_risks.slice(0, 2).forEach(risk => {
      whyFail.push({ text: `Unverified: ${risk.title}`, source: 'condition_assessment', confidence: 'low' });
    });
  }

  // Condition-based risks - SOURCE: condition_assessment (direct fields)
  if (condition.frame_integrity === 'structural_rust' || condition.frame_integrity === 'compromised') {
    whyFail.push({ text: `Frame integrity: ${condition.frame_integrity} — major repair or pass`, source: 'condition_assessment', confidence: 'high' });
  }
  if (condition.structural_damage) {
    whyFail.push({ text: `Structural damage detected in photos`, source: 'condition_assessment', confidence: 'high' });
  }

  // Market risks - SOURCE: market_demand (ONLY if the basis is clear)
  // Note: We already know demand is heuristic, so be honest about it
  if (demandLevel === 'low' || demandLevel === 'niche') {
    const isHeuristic = (marketDemand as any)?.is_heuristic !== false;
    const demandDays = marketDemand?.implications?.expected_days_to_sell || '30-60 days';
    if (demandLevel === 'niche') {
      whyFail.push({ text: `Niche market${isHeuristic ? ' (heuristic)' : ''} — expect ${demandDays}`, source: 'market_demand', confidence: isHeuristic ? 'low' : 'medium' });
    } else {
      whyFail.push({ text: `Low demand${isHeuristic ? ' (heuristic)' : ''} — expect ${demandDays}`, source: 'market_demand', confidence: isHeuristic ? 'low' : 'medium' });
    }
  }

  // Title risks - SOURCE: title_status (if not clean and not already in gates)
  if (condition.title_status && condition.title_status !== 'clean' && !triggeredGates.some(g => g.name === 'title_issue')) {
    whyFail.push({ text: `Title is '${condition.title_status}' — limits resale options`, source: 'title_status', confidence: 'high' });
  }

  // Mechanical unknowns - SOURCE: condition_assessment
  if (condition.engine_status === 'unknown' || condition.mechanical_confidence === 'low') {
    whyFail.push({ text: `Mechanical status unverified — repair estimate uncertain`, source: 'condition_assessment', confidence: 'medium' });
  }

  // Sort by confidence (high severity first) and take top 3
  const sortedWhyFail = whyFail.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
  const finalWhyFail = sortedWhyFail.slice(0, 3);

  // HONEST FALLBACK: If no sourced risks, say so
  if (finalWhyFail.length === 0) {
    lines.push(`• No specific risks identified — standard auction due diligence applies`);
  } else {
    finalWhyFail.forEach(w => lines.push(`• ${w.text}`));
  }

  // ============================================
  // SECTION 5: REQUIRED VERIFICATIONS (CHECKLIST)
  // ============================================
  lines.push(`\n---\n### ☑️ Required Verifications`);
  const verifications: string[] = [];

  if (triggeredGates.some(g => g.name === 'title_issue') || condition.title_status !== 'clean') {
    verifications.push(`☐ Confirm title status (clean/on-file/salvage)`);
  }
  if (triggeredGates.some(g => g.name === 'limited_photos')) {
    verifications.push(`☐ Request additional photos (underside, hitch, interior)`);
  }
  if (triggeredGates.some(g => g.name === 'identity_conflict')) {
    verifications.push(`☐ Verify VIN matches title year`);
  }
  if (triggeredGates.some(g => g.name === 'unknown_brakes_tandem')) {
    verifications.push(`☐ Ask seller about brake condition`);
  }
  if (condition.mileage === null || condition.mileage_confidence === 'unknown') {
    verifications.push(`☐ Confirm mileage if vehicle`);
  }

  // Add inspection priorities as verifications
  const inspection: string[] = (investorLens as any).inspection_priorities || [];
  inspection.slice(0, 3).forEach(p => {
    if (!verifications.some(v => v.toLowerCase().includes(p.toLowerCase().split(' ')[0]))) {
      verifications.push(`☐ ${p}`);
    }
  });

  if (verifications.length === 0) {
    verifications.push(`☐ Standard pickup inspection`);
  }
  verifications.slice(0, 5).forEach(v => lines.push(v));

  // ============================================
  // SECTION 6: BID PLAN (SNIPING + WALK-AWAY)
  // ============================================
  lines.push(`\n---\n### 🎯 Bid Plan`);
  const conservativeBid = Math.round(maxBid * 0.85);
  const aggressiveBid = Math.round(maxBid * 1.05);

  lines.push(`• **Opening:** ${fmtMoney(conservativeBid)} (85% of max)`);
  lines.push(`• **Snipe:** ${fmtMoney(maxBid)} in final 30 seconds`);
  lines.push(`• **Walk-away:** Above ${fmtMoney(aggressiveBid)} — let it go`);

  if (triggeredGates.length > 0) {
    lines.push(`• **If gates don't clear:** Max ${fmtMoney(Math.round(maxBid * 0.8))} or skip entirely`);
  }

  // ============================================
  // SECTION 7: SELL PLAN (CHANNEL + PRICING + PHOTOS)
  // ============================================
  // SOURCES: condition_assessment (asset type), economics_calc (pricing), market_demand (timeline)
  lines.push(`\n---\n### 📸 Sell Plan`);

  // Channel recommendation - SOURCE: condition_assessment (trailer_type, make/model)
  const trailerType = condition.trailer_type;
  const isVehicle = !!(condition.make && condition.model);

  if (isVehicle) {
    lines.push(`• **Channel:** FB Marketplace → Craigslist → OfferUp`);
  } else if (trailerType === 'enclosed') {
    lines.push(`• **Channel:** FB Marketplace → Craigslist → Trailer Trader`);
  } else if (demandLevel === 'niche') {
    // Niche items need specialty channels - SOURCE: market_demand
    lines.push(`• **Channel:** FB Groups (specific) → Craigslist → Trade forums`);
  } else {
    lines.push(`• **Channel:** FB Marketplace → Craigslist → OfferUp`);
  }

  // Pricing band - SOURCE: economics_calc (scenarios.*.sale_price)
  const quickSale = scenarios?.quick_sale?.sale_price ?? 0;
  const marketRate = scenarios?.expected?.sale_price ?? 0;
  const premium = scenarios?.premium?.sale_price ?? scenarios?.optimistic?.sale_price ?? 0;

  if (quickSale > 0 && marketRate > 0 && premium > 0) {
    lines.push(`• **Pricing:** List ${fmtMoney(premium)} → Accept ${fmtMoney(marketRate)} → Floor ${fmtMoney(quickSale)}`);
  } else if (marketRate > 0) {
    lines.push(`• **Pricing:** List around ${fmtMoney(marketRate)} (scenario data incomplete)`);
  } else {
    lines.push(`• **Pricing:** Use comparable listings to set price (no scenario data)`);
  }

  // Expected timeline - SOURCE: market_demand (with heuristic label if applicable)
  const daysToSell = marketDemand?.implications?.expected_days_to_sell || '14-30 days';
  const isHeuristicDemand = (marketDemand as any)?.is_heuristic !== false;
  if (isHeuristicDemand) {
    lines.push(`• **Timeline:** ${daysToSell} (heuristic estimate)`);
  } else {
    lines.push(`• **Timeline:** ${daysToSell}`);
  }

  // Must-have photos - SOURCE: condition_assessment (asset type determines photo list)
  lines.push(`• **Must-have photos:**`);
  if (isVehicle) {
    lines.push(`  - Front 3/4, rear 3/4, interior, dash/odometer, engine bay, VIN plate`);
  } else if (trailerType === 'enclosed') {
    lines.push(`  - Front hitch, rear doors open, interior empty, floor close-up, lights working`);
  } else {
    lines.push(`  - Front hitch, side profile, deck/bed, undercarriage, lights, tires`);
  }

  return lines.join("\n");
}

function parseYearFromTitle(title: string | undefined | null): number | null {
  if (!title) return null;
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const yr = Number(match[0]);
  return Number.isFinite(yr) ? yr : null;
}


function hasPremiumEquipment(condition: ConditionAssessment): boolean {
  return (condition.auxiliary_equipment || []).some(eq => {
    // Only treat as premium evidence if we know it's functional.
    if (eq.status !== "functional") return false;
    const t = `${eq.type || ""} ${eq.brand_model || ""}`.toLowerCase();
    return /lift|compressor|welder|generator/.test(t);
  });
}

// Numeric coercion helper
function toFiniteNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.+-]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function clampBuyerRange(
  buyer: BuyerLensOutput,
  comps: { quick_sale: number; premium: number },
  condition: ConditionAssessment
): BuyerLensOutput {
  // Always normalize first (even if we early-return due to premium evidence)
  buyer = normalizeBuyerLensRange(buyer);

  const premiumEvidence = hasPremiumEquipment(condition);
  if (premiumEvidence) {
    // Still enforce low<=high even when we don't clamp to comps bounds
    const low0 = (buyer as any)?.perceived_value_range?.low;
    const high0 = (buyer as any)?.perceived_value_range?.high;
    if (
      typeof low0 === "number" &&
      typeof high0 === "number" &&
      Number.isFinite(low0) &&
      Number.isFinite(high0) &&
      low0 > high0
    ) {
      return {
        ...buyer,
        perceived_value_range: { low: high0, high: low0 }
      };
    }
    return buyer;
  }

  const minBound = comps.quick_sale * BUYER_MIN_MULTIPLIER;
  const maxBound = comps.premium * BUYER_MAX_MULTIPLIER;

  const rawLow =
    typeof (buyer as any)?.perceived_value_range?.low === "number"
      ? (buyer as any).perceived_value_range.low
      : minBound;

  const rawHigh =
    typeof (buyer as any)?.perceived_value_range?.high === "number"
      ? (buyer as any).perceived_value_range.high
      : maxBound;

  // Enforce ordering first
  const orderedLow = Math.min(rawLow, rawHigh);
  const orderedHigh = Math.max(rawLow, rawHigh);

  // Then clamp bounds
  const low = Math.max(minBound, orderedLow);
  const high = Math.min(maxBound, Math.max(low, orderedHigh));

  return {
    ...buyer,
    perceived_value_range: { low, high }
  };
}

function normalizeBuyerLensRange(buyer: BuyerLensOutput): BuyerLensOutput {
  const lowRaw = (buyer as any)?.perceived_value_range?.low;
  const highRaw = (buyer as any)?.perceived_value_range?.high;

  // If both are present but as strings, coerce them so later logic can reason.
  const low = typeof lowRaw === "string" ? Number(lowRaw.replace(/[^0-9.+-]/g, "")) : lowRaw;
  const high = typeof highRaw === "string" ? Number(highRaw.replace(/[^0-9.+-]/g, "")) : highRaw;

  if (
    typeof low === "number" &&
    typeof high === "number" &&
    Number.isFinite(low) &&
    Number.isFinite(high) &&
    low > high
  ) {
    return {
      ...buyer,
      perceived_value_range: { low: high, high: low }
    };
  }

  return buyer;
}

function finalizeBuyerLens(
  buyer: BuyerLensOutput,
  comps: { quick_sale: number; premium: number },
  condition: ConditionAssessment
): BuyerLensOutput {
  const premiumEvidence = hasPremiumEquipment(condition);

  const minBound = comps.quick_sale * BUYER_MIN_MULTIPLIER;
  const maxBound = comps.premium * BUYER_MAX_MULTIPLIER;

  let low = toFiniteNumber((buyer as any)?.perceived_value_range?.low, minBound);
  let high = toFiniteNumber((buyer as any)?.perceived_value_range?.high, maxBound);

  // Always enforce ordering
  if (low > high) [low, high] = [high, low];

  // Clamp to market bounds unless we have real premium evidence.
  if (!premiumEvidence) {
    low = Math.min(maxBound, Math.max(minBound, low));
    high = Math.min(maxBound, Math.max(low, high));
  }

  return {
    ...buyer,
    perceived_value_range: { low, high }
  };
}

function buildDeterministicInvestorReasoning(args: {
  listingData: ListingData;
  condition: ConditionAssessment;
  phoenixRangeObj: { quick_sale: number; market_rate: number; premium: number; scarcity?: any };
  scenarios: any;
  maxBid: number;
  totalInvestment: number;
  verdict: InvestorLensOutput["verdict"];
  engine1DownsideFail: boolean;
}): string {
  const { listingData, condition, phoenixRangeObj, scenarios, maxBid, totalInvestment, verdict, engine1DownsideFail } = args;

  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  const usd = (x: number) => `$${Math.round(x).toLocaleString()}`;

  const qs = scenarios?.quick_sale;
  const ex = scenarios?.expected;
  const pr = scenarios?.premium;

  const qsProfit = typeof qs?.gross_profit === "number" ? qs.gross_profit : NaN;
  const qsMargin = typeof qs?.margin === "number" ? qs.margin : NaN;
  const exProfit = typeof ex?.gross_profit === "number" ? ex.gross_profit : NaN;
  const exMargin = typeof ex?.margin === "number" ? ex.margin : NaN;
  const prProfit = typeof pr?.gross_profit === "number" ? pr.gross_profit : NaN;
  const prMargin = typeof pr?.margin === "number" ? pr.margin : NaN;

  // Engine 1 economic tiers (40% rule) - use internal verdicts for calculation
  const econTier: InvestorLensOutput["verdict"] =
    (Number.isFinite(exProfit) && Number.isFinite(exMargin) && exMargin >= 0.40 && exProfit >= 800) ? "STRONG_BUY" :
    (Number.isFinite(exProfit) && Number.isFinite(exMargin) && exMargin >= 0.35 && exProfit >= 600) ? "BUY" :
    (Number.isFinite(exProfit) && Number.isFinite(exMargin) && exMargin >= 0.25 && exProfit >= 400) ? "MARGINAL" :
    "PASS";

  // Convert to display verdicts for user-facing text
  const displayVerdict = toDisplayVerdict(verdict);
  const displayEconTier = toDisplayVerdict(econTier);

  const gates: string[] = [];
  if (listingData.photos.length < 4) gates.push("limited photos (<4)");
  if (condition.identity_conflict) gates.push("identity conflict (title/year mismatch)");
  if (condition.axle_status === "tandem" && condition.brakes === "unknown") gates.push("unknown brakes on tandem");
  if (condition.title_status && condition.title_status !== "clean") gates.push(`title status: ${condition.title_status}`);
  if (condition.dimensions?.length_ft && condition.dimensions.length_ft > 18) gates.push("storage risk: length > 18ft");
  if (engine1DownsideFail) gates.push("fails quick-sale downside safety");

  const econLine = `Economics @ max bid ${usd(maxBid)} (all-in ${usd(totalInvestment)}): quick-sale ${usd(phoenixRangeObj.quick_sale)} -> ${usd(qsProfit)} (${pct(qsMargin)}), expected ${usd(phoenixRangeObj.market_rate)} -> ${usd(exProfit)} (${pct(exMargin)}), premium ${usd(phoenixRangeObj.premium)} -> ${usd(prProfit)} (${pct(prMargin)}).`;

  // If the LLM tried to label it BUY but gates cap it, be explicit.
  // Use display verdicts in user-facing reasoning text
  if (verdict !== econTier) {
    const why = gates.length ? `Capped/downgraded by gates: ${gates.join(", ")}.` : "Capped/downgraded by risk gates.";
    return `${econLine} Economic tier: ${displayEconTier}. Final verdict: ${displayVerdict}. ${why}`;
  }

  if (gates.length) {
    return `${econLine} Verdict: ${displayVerdict}. Risk notes: ${gates.join(", ")}.`;
  }

  return `${econLine} Verdict: ${displayVerdict}.`;
}

export function ensureSierraFees(listing: ListingData) {
  if (listing.source !== "sierra_auction") return;
  const fs = listing.fee_schedule ?? {};
  // Always enforce the Sierra tiered schedule to avoid silent numeric fallbacks.
  const buyer_premium = SIERRA_FEES.buyer_premium;
  const sales_tax_percent =
    typeof fs.sales_tax_percent === "number" && Number.isFinite(fs.sales_tax_percent)
      ? fs.sales_tax_percent
      : SIERRA_FEES.sales_tax_percent;

  listing.fee_schedule = { ...fs, buyer_premium, sales_tax_percent };
  listing.fee_schedule_source = fs.buyer_premium ? "listing" : "injected_sierra_default";
  console.log(`[FEES] Enforced Sierra tiered fee schedule for listing ${listing.title || listing.listing_url || ""} (source=${listing.fee_schedule_source})`);
}

export function normalizeListingForAnalysis(listing: ListingData): ListingData {
  ensureSierraFees(listing);
  return listing;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(
  env: Env, model: string, messages: Array<{ role: string; content: any }>, maxTokens = 4000
): Promise<{ text: string; tokens: number }> {
  const response = await fetchClaudeWithRetry(env, { model, max_tokens: maxTokens, messages });

  const data = await response.json() as ClaudeResponse;
  const text = data.content.filter(c => c.type === "text").map(c => c.text).join("");
  return { text, tokens: data.usage.input_tokens + data.usage.output_tokens };
}

// Track individual image fetch results
export interface ImageFetchResult {
  index: number;
  url: string;
  status: 'ok' | 'failed';
  fail_reason?: string;
  content_type?: string;
  bytes?: number;
}

// Return type now includes fetch metrics
export interface VisionCallResult {
  text: string;
  tokens: number;
  image_fetch_results: ImageFetchResult[];
}

// Retry helper with exponential backoff + jitter
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(baseMs: number): number {
  // Add 0-50% random jitter
  return baseMs + Math.random() * baseMs * 0.5;
}

// Retryable status codes for Claude API
function isRetryableStatus(status: number): boolean {
  // 429 = rate limit, 5xx = server errors
  return status === 429 || (status >= 500 && status < 600);
}

// Claude API fetch with retry logic
async function fetchClaudeWithRetry(
  env: Env,
  body: object,
  maxRetries = 3
): Promise<Response> {
  const baseDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body)
      });

      // Success - return immediately
      if (response.ok) {
        if (attempt > 0) {
          console.log(`[CLAUDE] Request succeeded on attempt ${attempt + 1}`);
        }
        return response;
      }

      // Non-retryable error (4xx except 429) - fail immediately
      if (!isRetryableStatus(response.status)) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      // Retryable error - log and continue
      const errorText = await response.text();
      lastError = new Error(`Claude API error: ${response.status} - ${errorText}`);
      console.warn(`[CLAUDE] Attempt ${attempt + 1}/${maxRetries + 1} failed with ${response.status}: ${errorText.substring(0, 200)}`);

      // Check for Retry-After header on 429
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000;
          if (retryMs > 0 && retryMs < 60000) {
            console.log(`[CLAUDE] Respecting Retry-After header: ${retryAfter}s`);
            await sleep(retryMs);
            continue;
          }
        }
      }

      // Exponential backoff with jitter
      if (attempt < maxRetries) {
        const delayMs = jitter(baseDelays[Math.min(attempt, baseDelays.length - 1)]);
        console.log(`[CLAUDE] Retrying in ${Math.round(delayMs)}ms...`);
        await sleep(delayMs);
      }
    } catch (error) {
      // Network error - treat as retryable
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[CLAUDE] Attempt ${attempt + 1}/${maxRetries + 1} failed with network error: ${lastError.message}`);

      if (attempt < maxRetries) {
        const delayMs = jitter(baseDelays[Math.min(attempt, baseDelays.length - 1)]);
        console.log(`[CLAUDE] Retrying in ${Math.round(delayMs)}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Claude API request failed after all retries');
}

// Fetch a single image with proper headers, retry logic, and timeout
async function fetchImageAsBase64(
  url: string,
  index: number,
  maxRetries = 2
): Promise<{ result: ImageFetchResult; base64?: string; mediaType?: string }> {
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries with exponential backoff + jitter
      if (attempt > 0) {
        const delayMs = jitter(500 * Math.pow(2, attempt - 1)); // 500ms, 1s, 2s base
        console.log(`[IMAGE] Retry ${attempt}/${maxRetries} for image ${index} after ${Math.round(delayMs)}ms`);
        await sleep(delayMs);
      }

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': new URL(url).origin + '/',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      clearTimeout(timeoutId);

      // 429 = rate limited, 503 = overloaded - these are retryable
      if (response.status === 429 || response.status === 503) {
        lastError = `HTTP ${response.status} (retryable)`;
        continue; // Retry
      }

      if (!response.ok) {
        // Non-retryable HTTP error
        return {
          result: {
            index,
            url,
            status: 'failed',
            fail_reason: `HTTP ${response.status}`,
          }
        };
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        return {
          result: {
            index,
            url,
            status: 'failed',
            fail_reason: `Invalid content-type: ${contentType}`,
            content_type: contentType,
          }
        };
      }

      const buffer = await response.arrayBuffer();
      const bytes = buffer.byteLength;

      // Check minimum size (tiny images are likely error placeholders)
      if (bytes < 1000) {
        return {
          result: {
            index,
            url,
            status: 'failed',
            fail_reason: `Image too small (${bytes} bytes)`,
            bytes,
            content_type: contentType,
          }
        };
      }

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mediaType = contentType.split(';')[0].trim();

      return {
        result: {
          index,
          url,
          status: 'ok',
          content_type: mediaType,
          bytes,
        },
        base64,
        mediaType,
      };
    } catch (err: any) {
      // AbortError = timeout, network errors may be transient
      const isTimeout = err.name === 'AbortError';
      lastError = isTimeout ? 'Timeout (15s)' : (err.message || 'Unknown fetch error');

      // Network errors and timeouts are retryable
      if (attempt < maxRetries) {
        continue;
      }
    }
  }

  // All retries exhausted
  return {
    result: {
      index,
      url,
      status: 'failed',
      fail_reason: lastError,
    }
  };
}

// Concurrency-limited batch processor
async function batchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  // Start `concurrency` workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function callClaudeWithVision(
  env: Env, model: string, prompt: string, imageData: string[], maxTokens = 4000
): Promise<VisionCallResult> {
  const content: Array<{ type: string; [key: string]: any }> = [];
  const fetchResults: ImageFetchResult[] = [];

  // Fetch images ourselves to track success/failure (cap at 10)
  const imagesToFetch = imageData.slice(0, 10);
  console.log(`[VISION] Fetching ${imagesToFetch.length} images with concurrency limit...`);

  // Fetch with concurrency limit (3 at a time) to avoid rate limiting
  const results = await batchWithConcurrency(
    imagesToFetch,
    async (data, idx) => {
      if (data.startsWith('data:')) {
        // Already base64 - extract and track as successful
        const matches = data.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (matches) {
          const [, mediaType, base64] = matches;
          return {
            result: {
              index: idx,
              url: data.substring(0, 50) + '...',
              status: 'ok' as const,
              content_type: mediaType,
              bytes: base64.length * 0.75, // Approximate decoded size
            },
            base64,
            mediaType,
          };
        }
        return {
          result: {
            index: idx,
            url: data.substring(0, 50) + '...',
            status: 'failed' as const,
            fail_reason: 'Invalid base64 format',
          }
        };
      } else {
        // URL - fetch it ourselves with retry
        return fetchImageAsBase64(data, idx);
      }
    },
    3 // Max 3 concurrent fetches
  );

  // Process results
  for (const { result, base64, mediaType } of results) {
    fetchResults.push(result);
    if (result.status === 'ok' && base64 && mediaType) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        }
      });
    }
  }

  const okCount = fetchResults.filter(r => r.status === 'ok').length;
  const failedCount = fetchResults.filter(r => r.status === 'failed').length;
  console.log(`[VISION] Fetch complete: ${okCount} ok, ${failedCount} failed`);

  if (failedCount > 0) {
    const failures = fetchResults.filter(r => r.status === 'failed');
    console.log(`[VISION] Failed images:`, failures.map(f => `[${f.index}] ${f.fail_reason}`).join(', '));
  }

  // Add text prompt
  content.push({ type: "text", text: prompt });

  // If no images succeeded, fall back to text-only
  if (okCount === 0) {
    console.warn(`[VISION] All ${imagesToFetch.length} images failed to fetch, falling back to text-only`);
    const textResult = await callClaude(env, model, [{ role: "user", content: prompt }], maxTokens);
    return { ...textResult, image_fetch_results: fetchResults };
  }

  const response = await fetchClaudeWithRetry(env, {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }]
  });

  const data = await response.json() as ClaudeResponse;
  const text = data.content.filter(c => c.type === "text").map(c => c.text).join("");
  return {
    text,
    tokens: data.usage.input_tokens + data.usage.output_tokens,
    image_fetch_results: fetchResults,
  };
}

function parseJsonResponse<T>(text: string): T {
  let jsonStr = text.trim();
  
  if (jsonStr.startsWith("```")) {
    const firstNewline = jsonStr.indexOf("\n");
    if (firstNewline !== -1) {
      jsonStr = jsonStr.substring(firstNewline + 1);
    }
    const lastBackticks = jsonStr.lastIndexOf("```");
    if (lastBackticks !== -1) {
      jsonStr = jsonStr.substring(0, lastBackticks);
    }
  }
  
  jsonStr = jsonStr.trim();
  
  if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
    const jsonStart = jsonStr.indexOf("{");
    if (jsonStart !== -1) {
      jsonStr = jsonStr.substring(jsonStart);
    }
  }
  
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON:", jsonStr.substring(0, 500));
    throw new Error(`Failed to parse Claude response as JSON: ${e}`);
  }
}

export async function analyzeAsset(env: Env, listingData: ListingData, includeJustifications: boolean = false): Promise<DualLensReport> {
  let totalTokens = 0;
  const startTime = Date.now();

  // Normalize input: ensure photos is always an array
  if (!listingData.photos) {
    listingData.photos = [];
  }
  if (!listingData.description) {
    listingData.description = '';
  }
  if (!listingData.title) {
    listingData.title = 'Unknown Item';
  }

  console.log(`[ANALYSIS] Starting analysis for: ${listingData.title} (category: ${listingData.category_id || 'unknown'})`);

  ensureSierraFees(listingData);

  // Detect category and route to appropriate prompts/analysis
  const category = listingData.category_id || 'buy_box';
  const categoryLower = category.toLowerCase();
  const titleLower = (listingData.title || '').toLowerCase();

  // Known vehicle makes for title-based detection
  const vehicleMakes = [
    'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'dodge', 'ram', 'jeep',
    'nissan', 'hyundai', 'kia', 'subaru', 'mazda', 'volkswagen', 'vw',
    'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac',
    'buick', 'gmc', 'chrysler', 'lincoln', 'volvo', 'porsche', 'jaguar',
    'land rover', 'range rover', 'rover', 'mini', 'fiat', 'alfa romeo',
    'tesla', 'rivian', 'lucid', 'genesis', 'maserati', 'bentley', 'rolls royce'
  ];
  const vehicleTypes = ['sedan', 'coupe', 'suv', 'crossover', 'hatchback', 'wagon', 'convertible', 'minivan', 'pickup'];

  // Title-based vehicle detection (fallback when category is generic)
  const titleHasVehicleMake = vehicleMakes.some(make => titleLower.includes(make));
  const titleHasVehicleType = vehicleTypes.some(type => titleLower.includes(type));
  const titleLooksLikeVehicle = titleHasVehicleMake || titleHasVehicleType ||
    /\b(20\d{2}|19\d{2})\s+\w+\s+\w+\b/.test(titleLower); // Pattern like "2018 Honda Accord"

  // Category detection logic
  const isPowerTools = categoryLower === 'power_tools';
  const isVehicleByCategory = categoryLower === 'vehicle' || categoryLower === 'vehicles' ||
    categoryLower === 'suv' || categoryLower === 'car' || categoryLower === 'truck' ||
    categoryLower === 'cars_trucks' || categoryLower === 'auto' || categoryLower === 'automotive' ||
    categoryLower === 'fleet_trucks' ||
    categoryLower.includes('vehicle') || categoryLower.includes('car') ||
    categoryLower.includes('suv') || categoryLower.includes('truck');

  // Vehicle detection: explicit category OR title-based detection (when category is generic like buy_box)
  const isVehicle = isVehicleByCategory || (categoryLower === 'buy_box' && titleLooksLikeVehicle);
  const isTrailer = !isPowerTools && !isVehicle; // Default to trailer if not explicitly another category

  console.log(`[CATEGORY] Detected: ${category} -> isPowerTools=${isPowerTools}, isVehicle=${isVehicle}, isTrailer=${isTrailer} (titleLooksLikeVehicle=${titleLooksLikeVehicle})`);

  // PHASE 1: Condition Assessment (category-specific prompts)
  let conditionPrompt: string;
  if (isPowerTools) {
    const { buildConditionPromptPowerTools } = await import('./prompts-power-tools');
    conditionPrompt = buildConditionPromptPowerTools(listingData.description, listingData.photos.length);
  } else if (isVehicle) {
    const { buildConditionPromptVehicles } = await import('./prompts-vehicles');
    conditionPrompt = buildConditionPromptVehicles(listingData.description, listingData.photos.length);
  } else {
    conditionPrompt = buildConditionPrompt(listingData.description, listingData.photos.length);
  }
  
  // Track actual image fetch results (not Claude's claimed count)
  let conditionResult: VisionCallResult | { text: string; tokens: number; image_fetch_results?: ImageFetchResult[] };
  let imageFetchResults: ImageFetchResult[] = [];

  if (listingData.photos.length > 0) {
    conditionResult = await callClaudeWithVision(
      env, CONFIG.models.CONDITION_MODEL, conditionPrompt, listingData.photos, 4000
    );
    imageFetchResults = conditionResult.image_fetch_results || [];
  } else {
    conditionResult = await callClaude(
      env, CONFIG.models.CONDITION_MODEL,
      [{ role: "user", content: conditionPrompt }],
      4000
    );
  }
  totalTokens += conditionResult.tokens;
  const condition = parseJsonResponse<ConditionAssessment>(conditionResult.text);
  const titleYear = parseYearFromTitle(listingData.title);
  if (titleYear && condition.year && titleYear !== condition.year) {
    condition.identity_conflict = true;
    condition.identity_confidence = "low";
  } else {
    condition.identity_confidence = condition.identity_confidence || "high";
    condition.identity_conflict = condition.identity_conflict || false;
  }

  // Sprint 1.5: Merge operator inputs into condition assessment
  // Operator inputs override AI-inferred values when provided
  console.log(`[OPERATOR] Checking operator_inputs: ${JSON.stringify(listingData.operator_inputs)}`);
  if (listingData.operator_inputs) {
    const opInputs = listingData.operator_inputs;
    console.log(`[OPERATOR] Found operator inputs - title_status: ${opInputs.title_status}, verified: ${opInputs.title_status_verified}`);

    // Title status - operator input takes precedence
    if (opInputs.title_status && opInputs.title_status !== 'unknown') {
      const previousStatus = condition.title_status;
      condition.title_status = opInputs.title_status;
      console.log(`[OPERATOR] Title status override: ${previousStatus} -> ${opInputs.title_status} (verified: ${opInputs.title_status_verified})`);
    }

    // Odometer/mileage - operator input takes precedence
    if (opInputs.odometer_miles != null && opInputs.odometer_miles > 0) {
      condition.mileage = opInputs.odometer_miles;
      condition.mileage_confidence = opInputs.odometer_verified ? 'odometer_visible' : 'estimated';
      console.log(`[OPERATOR] Mileage override: ${opInputs.odometer_miles} (verified: ${opInputs.odometer_verified})`);
    }

    // VIN - operator input takes precedence
    if (opInputs.vin && opInputs.vin.length >= 11) {
      condition.vin_visible = opInputs.vin;
      console.log(`[OPERATOR] VIN override: ${opInputs.vin}`);
    }
  }

  // Build photo metrics from ACTUAL FETCH RESULTS (not Claude's claimed count)
  const photosReceived = listingData.photos.length;
  const availabilityKnown = listingData.photo_count != null; // Did source provide a count?
  const photosAvailable = listingData.photo_count ?? photosReceived;
  const photosSelected = Math.min(photosReceived, 10); // We cap at 10 in callClaudeWithVision

  // Use actual fetch tracking, not inference
  const actualFetchOk = imageFetchResults.filter(r => r.status === 'ok').length;
  const actualFetchFailed = imageFetchResults.filter(r => r.status === 'failed').length;
  const successfulIndices = imageFetchResults.filter(r => r.status === 'ok').map(r => r.index);

  condition.photo_metrics = {
    available: photosAvailable,
    availability_known: availabilityKnown,
    received: photosReceived,
    selected: photosSelected,
    analyzed_ok: actualFetchOk,
    analyzed_failed: actualFetchFailed,
    selected_indices: successfulIndices.length > 0 ? successfulIndices : undefined,
  };

  // Engine 1 safety: cap confidence based on actual photo evidence
  // Evidence only exists if we actually fetched photos successfully
  if (actualFetchOk === 0) {
    // No visual evidence at all - confidence cannot be high
    condition.assessment_confidence = "low";
  } else if (actualFetchOk < 4) {
    // Limited visual evidence - cap at medium
    if (condition.assessment_confidence === "high") condition.assessment_confidence = "medium";
    if (condition.identity_conflict) condition.assessment_confidence = "low";
  }

  // Log photo pipeline for debugging
  console.log(`[PHOTOS] available=${photosAvailable} (known=${availabilityKnown}) received=${photosReceived} selected=${photosSelected} fetched_ok=${actualFetchOk} fetched_failed=${actualFetchFailed}`);

  // Build evidence ledger - track what backs each condition claim
  // CRITICAL: Pass actualFetchOk so evidence is based on what we actually processed
  condition.evidence_ledger = buildEvidenceLedger(condition, listingData, actualFetchOk);

  console.log(`[PHASE 1] Complete: ${isPowerTools ? condition.tool_type : isVehicle ? `${condition.make} ${condition.model}` : condition.trailer_type}`);

  // WORKER LOGIC: Compute hard data (category-specific)
  let phoenixRangeObj: any;
  let repairPlan: any;

  if (isPowerTools) {
    const { lookupPowerToolComps, calculateMinimumViableRepairPowerTools } = await import('./analysis-power-tools');
    phoenixRangeObj = lookupPowerToolComps(
      condition.tool_type,
      condition.make,
      condition.model,
      condition.battery_system?.voltage ?? null
    );
    repairPlan = calculateMinimumViableRepairPowerTools(condition);
  } else if (isVehicle) {
    const { lookupVehicleComps, calculateMinimumViableRepairVehicles } = await import('./analysis-vehicles');
    phoenixRangeObj = lookupVehicleComps(
      condition.make,
      condition.model,
      condition.year,
      condition.mileage,
      condition.title_status,
      condition
    );
    repairPlan = calculateMinimumViableRepairVehicles(condition);
  } else {
    phoenixRangeObj = lookupPhoenixComps(
      condition.trailer_type,
      condition.axle_status,
      condition.dimensions?.width_ft ?? null,
      condition.dimensions?.length_ft ?? null
    );
    repairPlan = calculateMinimumViableRepair(condition);
  }

  const phoenixRangeDisplay = formatPhoenixResaleRange(phoenixRangeObj);
  // Use bid search to derive max bid and investment numbers for prompts/reasoning with Engine 1 constraints.
  const quickSalePrice = phoenixRangeObj.quick_sale;
  const maxBidBuy = calculateMaxBidBySearch({
    listing: listingData,
    marketRate: phoenixRangeObj.market_rate ?? listingData.current_bid,
    repairTotal: repairPlan.grand_total,
    step: 50,
    desiredVerdict: "BUY",
    quickSalePrice,
    minQuickProfit: 300,
    minQuickMargin: 0.15
  });
  const maxBidMarginal = maxBidBuy > 0 ? 0 : calculateMaxBidBySearch({
    listing: listingData,
    marketRate: phoenixRangeObj.market_rate ?? listingData.current_bid,
    repairTotal: repairPlan.grand_total,
    step: 50,
    desiredVerdict: "MARGINAL",
    quickSalePrice,
    minQuickProfit: 300,
    minQuickMargin: 0.15
  });
  const maxBidSearch = maxBidBuy > 0 ? maxBidBuy : maxBidMarginal;
  const acquisitionForPrompt = calculateAcquisitionForBid(
    listingData,
    Math.max(maxBidSearch, listingData.current_bid),
    { payment_method: "cash", debug: env.DEBUG === "true" }
  );
  const totalInvestmentPrompt = acquisitionForPrompt.total_acquisition + repairPlan.grand_total;
  const promptScenarios = calculateProfitScenarios(phoenixRangeObj, totalInvestmentPrompt, CONFIG.phoenix_market.holding_days);

  console.log(`[COMPUTE] Investment: $${totalInvestmentPrompt}`);

  // PHASE 2: Parallel lens analysis
  console.log(`[PHASE 2] Running dual-lens analysis...`);

  let investorPromptContent: string;
  let buyerPromptContent: string;

  if (isPowerTools) {
    const { buildInvestorLensPromptPowerTools, buildBuyerLensPromptPowerTools } = await import('./prompts-power-tools');
    investorPromptContent = buildInvestorLensPromptPowerTools(
      JSON.stringify(condition, null, 2),
      JSON.stringify(phoenixRangeObj, null, 2),
      JSON.stringify(repairPlan, null, 2),
      JSON.stringify(acquisitionForPrompt, null, 2),
      {
        maxBid: maxBidSearch,
        totalInvestment: totalInvestmentPrompt,
        scenarios: promptScenarios
      }
    );
    buyerPromptContent = buildBuyerLensPromptPowerTools(
      JSON.stringify(condition, null, 2)
    );
  } else if (isVehicle) {
    const { buildInvestorLensPromptVehicles, buildBuyerLensPromptVehicles } = await import('./prompts-vehicles');
    investorPromptContent = buildInvestorLensPromptVehicles(
      JSON.stringify(condition, null, 2),
      JSON.stringify(phoenixRangeObj, null, 2),
      JSON.stringify(repairPlan, null, 2),
      JSON.stringify(acquisitionForPrompt, null, 2),
      {
        maxBid: maxBidSearch,
        totalInvestment: totalInvestmentPrompt,
        scenarios: promptScenarios
      }
    );
    buyerPromptContent = buildBuyerLensPromptVehicles(
      JSON.stringify(condition, null, 2)
    );
  } else {
    investorPromptContent = buildInvestorLensPrompt(
      JSON.stringify(condition, null, 2),
      JSON.stringify(phoenixRangeObj, null, 2),
      JSON.stringify(repairPlan, null, 2),
      JSON.stringify(acquisitionForPrompt, null, 2),
      {
        maxBid: maxBidSearch,
        totalInvestment: totalInvestmentPrompt,
        scenarios: promptScenarios
      }
    );
    buyerPromptContent = buildBuyerLensPrompt(
      JSON.stringify(condition, null, 2)
    );
  }

  const [investorResult, buyerResult] = await Promise.all([
    callClaude(env, CONFIG.models.REASONING_MODEL, [{
      role: "user",
      content: investorPromptContent
    }], 1500),
    callClaude(env, CONFIG.models.REASONING_MODEL, [{
      role: "user",
      content: buyerPromptContent
    }], 1000)
  ]);

  totalTokens += investorResult.tokens + buyerResult.tokens;
  
  const investorLens = parseJsonResponse<InvestorLensOutput>(investorResult.text);
  const buyerLensRaw = parseJsonResponse<BuyerLensOutput>(buyerResult.text);
  const buyerLensNormalized = normalizeBuyerLensRange(buyerLensRaw);
  const buyerLensClamped = clampBuyerRange(buyerLensNormalized, phoenixRangeObj, condition);
  const buyerLens = finalizeBuyerLens(buyerLensClamped, phoenixRangeObj, condition);
  investorLens.phoenix_resale_range = phoenixRangeDisplay as any;
  
  console.log(`[PHASE 2] Complete: ${investorLens.verdict}`);

  // Recompute scenarios using acquisition at max bid to avoid zero-bid underestimates
  let maxBid = Number.isFinite(maxBidSearch) && maxBidSearch > 0
    ? maxBidSearch
    : (investorLens.max_bid || listingData.current_bid);
  if (maxBidSearch === 0) {
    investorLens.verdict = "PASS";
    maxBid = 0;
  }

  ensureSierraFees(listingData);
  const acqAtMax = calculateAcquisitionForBid(listingData, maxBid, { payment_method: "cash", debug: env.DEBUG === "true" });
  if (listingData.source === "sierra_auction" && Math.round(maxBid) === 1600) {
    console.log(`[FEES] Sierra premium sanity: bid=${maxBid}, premium=${acqAtMax.buyer_premium} (expect ~299)`);
  }
  const transportEstimate = investorLens.acquisition_model?.transport_estimate ?? 0;
  const totalInvestmentAtMax = acqAtMax.total_acquisition + transportEstimate + repairPlan.grand_total;
  assertFiniteNumber("quick_sale", phoenixRangeObj.quick_sale);
  assertFiniteNumber("market_rate", phoenixRangeObj.market_rate);
  assertFiniteNumber("premium", phoenixRangeObj.premium);
  assertFiniteNumber("totalInvestment", totalInvestmentAtMax);

  const scenarios = calculateProfitScenarios(phoenixRangeObj, totalInvestmentAtMax, CONFIG.phoenix_market.holding_days);

  investorLens.acquisition_model = acqAtMax;
  investorLens.repair_plan = repairPlan;
  investorLens.total_investment = totalInvestmentAtMax;
  investorLens.max_bid = maxBid;
  investorLens.scenarios = scenarios;

  // Detect asset type for category-aware templates
  const assetType: AssetType = isVehicle ? 'vehicle' : isPowerTools ? 'power_tool' : isTrailer ? 'trailer' : 'unknown';

  // Build final report components using category-aware templates
  const assetSummary = buildAssetSummaryForType(listingData, condition, assetType);
  investorLens.verdict = applyVerdictGates(investorLens.verdict, condition, assetSummary);

  // Engine 1 hard gate: if it's only MARGINAL, require downside safety in quick-sale.
  // If quick_sale profit < $300 AND quick_sale margin < 15%, downgrade to PASS.
  let engine1DownsideFail = false;
  const qs = investorLens.scenarios?.quick_sale;
  if (
    investorLens.verdict === "MARGINAL" &&
    qs &&
    typeof qs.gross_profit === "number" &&
    typeof qs.margin === "number" &&
    qs.gross_profit < 300 &&
    qs.margin < 0.15
  ) {
    engine1DownsideFail = true;
    investorLens.verdict = "PASS";
  }

  // Deterministic reasoning: never trust the LLM for decision math/explanations.
  investorLens.verdict_reasoning = buildDeterministicInvestorReasoning({
    listingData,
    condition,
    phoenixRangeObj,
    scenarios: investorLens.scenarios,
    maxBid: investorLens.max_bid || 0,
    totalInvestment: investorLens.total_investment || 0,
    verdict: investorLens.verdict,
    engine1DownsideFail
  });

  // ============================================
  // V2.7: SINGLE CALCULATION SPINE - All numbers derive from here
  // ============================================
  const hasAuctionEndTime = !!(assetSummary?.auction_end);

  // Build the single source of truth for all numbers
  const calculationSpine = buildCalculationSpine({
    bidAmount: maxBid,
    feeSchedule: listingData.fee_schedule || { buyer_premium: 0.15, sales_tax_percent: 0.0725 },
    transport: transportEstimate,
    repairs: repairPlan.grand_total,
    repairsBasis: repairPlan.items?.length > 0 ? 'observed' : 'estimated',
    marketPrices: {
      quick_sale: phoenixRangeObj.quick_sale,
      market_rate: phoenixRangeObj.market_rate,
      premium: phoenixRangeObj.premium
    },
    marketSource: 'phoenix_comps'
  });

  // Evaluate risks using strict taxonomy with evidence status and two-axis verdict
  // Economics is OK if verdict is BUY or MARGINAL (not PASS due to economics)
  const economicsOk = investorLens.verdict === 'BUY' || investorLens.verdict === 'MARGINAL' || investorLens.verdict === 'STRONG_BUY';
  const effectiveAssetType = assetType === 'unknown' ? 'trailer' : assetType;
  const riskAssessment = evaluateRisks(condition, effectiveAssetType, scenarios, economicsOk, hasAuctionEndTime);
  const preBidChecklist = buildPreBidChecklist(riskAssessment, effectiveAssetType, hasAuctionEndTime);

  // Get risk banner (no more "Deal Killer" for minor issues)
  const riskBanner = getRiskBannerText(riskAssessment.summary);

  // Condition confidence with coverage
  const conditionConfidence = getConditionConfidenceLabel(condition);

  // Condition score with coverage penalty (no more 4.0/5 when everything is unknown)
  // Extract string values from condition objects (exterior/interior/mechanical are objects, not strings)
  const conditionScore = evaluateConditionScore({
    exterior: typeof condition.exterior === 'object' ? (condition.exterior?.paint_condition || condition.exterior?.body_damage || null) : condition.exterior,
    interior: typeof condition.interior === 'object' ? (condition.interior?.condition || condition.interior?.seats || null) : condition.interior,
    mechanical: typeof condition.mechanical === 'object' ? (condition.mechanical?.engine_status || condition.mechanical?.transmission_status || null) : condition.mechanical,
    tires: typeof condition.tires === 'object' ? (condition.tires?.condition || null) : (condition.tires_condition || condition.tires),
    frame: condition.frame_integrity || condition.frame_rust_severity,
    photos_analyzed: condition.photos_analyzed
  });

  // Bid readiness status (BID-READY / NOT BID-READY / DO NOT BID)
  const criticalInfoGaps = riskAssessment.info_gaps
    .filter(g => g.id === 'title_unknown' || g.id === 'mileage_unknown')
    .map(g => g.id);

  const bidReadiness = evaluateBidReadiness({
    hasAuctionEndTime,
    hasTitleStatus: condition.title_status && condition.title_status !== 'unknown',
    titleStatus: condition.title_status,
    economicsVerdict: economicsOk ? 'BUY' : 'PASS',
    hasConfirmedDealBreakers: riskAssessment.summary.has_deal_breakers,
    infoGapsCount: riskAssessment.info_gaps.length,
    criticalInfoGaps
  });

  // Build gated economics - show both verified and haircutted scenarios
  const gatedEconomics = buildGatedEconomics({
    verifiedSpine: calculationSpine,
    bidReadiness,
    feeSchedule: listingData.fee_schedule || { buyer_premium: 0.15, sales_tax_percent: 0.0725 },
    transport: transportEstimate,
    repairs: repairPlan.grand_total,
    marketPrices: {
      quick_sale: phoenixRangeObj.quick_sale,
      market_rate: phoenixRangeObj.market_rate,
      premium: phoenixRangeObj.premium
    }
  });

  // Market demand assessment - never say "Unknown", always provide heuristic
  const marketDemand = assessMarketDemand({
    assetType: isVehicle ? 'vehicle' : isPowerTools ? 'power_tools' : 'trailer',
    trailerType: condition.trailer_type,
    vehicleMake: condition.make || undefined,
    vehicleModel: condition.model || undefined,
    toolType: condition.tool_type,
    pricePoint: phoenixRangeObj.market_rate,
    titleStatus: condition.title_status,
    location: listingData.location ? { state: listingData.location.state } : undefined
  });

  // Split confidence into 4 meters
  const confidenceBreakdown = evaluateConfidenceBreakdown({
    priceVerified: listingData.price_verified || false,
    priceKind: listingData.price_kind || 'starting_bid',
    titleStatus: condition.title_status,
    photoCount: condition.photos_analyzed || 0,
    hasConditionDetails: !!(condition.exterior || condition.interior),
    mechanicalKnown: condition.mechanical && condition.mechanical !== 'unknown',
    hasAuctionEndTime
  });

  // ============================================
  // UNIFIED CONFIDENCE - Single Source of Truth
  // ============================================
  // Aggregates all confidence signals with explicit penalties.
  // Ensures no contradictions between subsystem and overall confidence.
  const unifiedConfidence = buildUnifiedConfidence({
    // From 4-meter breakdown
    priceLevel: confidenceBreakdown.price.level,
    titleLevel: confidenceBreakdown.title.level,
    conditionLevel: confidenceBreakdown.condition.level,
    timingLevel: confidenceBreakdown.timing.level,

    // From evidence ledger
    evidenceCoverage: {
      verified_claims: condition.evidence_ledger?.verified_claims ?? 0,
      total_claims: condition.evidence_ledger?.total_claims ?? 0,
      inferred_only: condition.evidence_ledger?.inferred ?? 0
    },

    // From condition
    titleStatus: condition.title_status,
    mechanicalKnown: !!(condition.mechanical && condition.mechanical !== 'unknown'),
    photoCount: condition.photos_analyzed || 0,

    // From market demand
    demandLevel: marketDemand.level,

    // Hard blockers from risk assessment
    hasHardBlockers: riskAssessment.summary.has_deal_breakers
  });

  // Build category-aware next steps
  const nextSteps = buildNextStepsForAsset(
    assetType,
    investorLens.max_bid || 0,
    investorLens.inspection_priorities || [],
    investorLens.repair_plan?.items
  );

  // Deterministic report outputs for automation consumption
  const report_fields = buildReportFields({
    assetSummary,
    investorLens,
    buyerLens,
    condition,
    wholesaleFloor: totalInvestmentAtMax
  });

  // Normalize report_summary to use canonical display verdicts
  const report_summary = normalizeReportLanguage(buildReportSummary({ assetSummary, investorLens, condition }));

  // Build markdown and normalize to canonical display language (BUY/WATCH/PASS)
  const report_markdown = normalizeReportLanguage(buildReportMarkdown({
    assetSummary,
    investorLens,
    buyerLens,
    condition,
    nextSteps,
    riskAssessment,
    marketDemand
  }));

  // PHASE 3: Optional Justifications
  let investorJustification = "";
  let buyerJustification = "";

  if (includeJustifications) {
    console.log(`[PHASE 3] Generating justifications`);
    const [investorJustificationResult, buyerJustificationResult] = await Promise.all([
      callClaude(env, CONFIG.models.REASONING_MODEL, [{
        role: "user",
        content: buildInvestorJustificationPrompt(
          JSON.stringify(investorLens, null, 2),
          JSON.stringify(condition, null, 2),
          JSON.stringify(phoenixRangeObj, null, 2),
          JSON.stringify(repairPlan, null, 2)
        )
      }], 1000),
      callClaude(env, CONFIG.models.REASONING_MODEL, [{
        role: "user",
        content: buildBuyerJustificationPrompt(
          JSON.stringify(buyerLens, null, 2),
          JSON.stringify(condition, null, 2)
        )
      }], 1000)
    ]);
    
    totalTokens += investorJustificationResult.tokens + buyerJustificationResult.tokens;
    // Normalize LLM-generated text to use canonical display verdicts
    investorJustification = normalizeReportLanguage(investorJustificationResult.text.trim());
    buyerJustification = normalizeReportLanguage(buyerJustificationResult.text.trim());
  }
  
  const buyerHigh = typeof buyerLens.perceived_value_range?.high === "number" ? buyerLens.perceived_value_range.high : phoenixRangeObj.premium;
  const arbitrageGap = buyerHigh - totalInvestmentAtMax;

  const report: any = {
    analysis_timestamp: new Date().toISOString(),
    version: "2.7",
    asset_type: assetType,
    asset_summary: assetSummary,
    report_fields,
    report_summary,
    report_markdown,
    condition,

    // ============================================
    // V2.7: SINGLE SOURCE OF TRUTH - All numbers
    // ============================================
    calculation_spine: calculationSpine,

    // Bid readiness (BID-READY / NOT BID-READY / DO NOT BID)
    bid_readiness: bidReadiness,

    // Gated economics - show both verified and haircutted scenarios
    // Solves: "Bid $3,250... unless don't" problem
    gated_economics: gatedEconomics,

    // Confidence breakdown (4 meters instead of 1 blob)
    confidence_breakdown: confidenceBreakdown,

    // UNIFIED CONFIDENCE - Single source of truth for overall deal confidence
    // Aggregates all signals with explicit penalty breakdown
    // Eliminates contradictions between subsystem and overall confidence
    unified_confidence: unifiedConfidence,

    // Condition score with coverage penalty
    condition_score: conditionScore,

    // Condition confidence assessment (legacy - kept for backward compat)
    condition_confidence: conditionConfidence,

    // Risk assessment with Observed / Unverified / Info Gap separation
    risk_assessment: riskAssessment,

    // Risk banner (correct headline based on actual severity)
    risk_banner: riskBanner,

    // Pre-bid checklist (gates to clear)
    pre_bid_checklist: preBidChecklist,

    // Market demand assessment - never "Unknown", always heuristic-based
    market_demand: marketDemand,

    // Normalize investor_lens: verdict + any text fields that might contain legacy tokens
    investor_lens: {
      ...investorLens,
      verdict: toDisplayVerdict(investorLens.verdict),
      verdict_reasoning: normalizeReportLanguage(investorLens.verdict_reasoning || ''),
      // Normalize any string arrays that might contain legacy tokens
      deal_killers: (investorLens.deal_killers || []).map((d: string) => normalizeReportLanguage(d)),
      inspection_priorities: (investorLens.inspection_priorities || []).map((p: string) => normalizeReportLanguage(p)),
    },
    buyer_lens: buyerLens,
    investor_lens_justification: investorJustification,
    buyer_lens_justification: buyerJustification,
    arbitrage: {
      perception_gap: Math.max(0, arbitrageGap),
      buyer_sees_value: buyerHigh,
      investor_total_cost: totalInvestmentAtMax
    },

    // Execution playbook - operational SOP, NOT analysis
    // Kept separate from report_markdown intentionally
    execution_playbook: nextSteps,
    metadata: {
      total_tokens: totalTokens,
      analysis_duration_ms: Date.now() - startTime,
      model_versions: {
        condition: CONFIG.models.CONDITION_MODEL,
        reasoning: CONFIG.models.REASONING_MODEL
      }
    }
  };

  console.log(`[COMPLETE] ${investorLens.verdict} | ${Date.now() - startTime}ms`);
  
  return report;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", version: "2.7-truthful-spine" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (url.pathname === "/analyze" && request.method === "POST") {
      try {
        const listingData = await request.json() as ListingData;
        const report = await analyzeAsset(env, listingData, false);
        return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
      } catch (error) {
        console.error("Analysis error:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    if (url.pathname === "/analyze/justifications" && request.method === "POST") {
      try {
        const report = await request.json() as DualLensReport;
        
        const [investorJustificationResult, buyerJustificationResult] = await Promise.all([
          callClaude(env, CONFIG.models.REASONING_MODEL, [{
            role: "user",
            content: buildInvestorJustificationPrompt(
              JSON.stringify(report.investor_lens, null, 2),
              JSON.stringify(report.condition, null, 2),
              JSON.stringify(report.investor_lens.phoenix_resale_range, null, 2),
              JSON.stringify(report.investor_lens.repair_plan, null, 2)
            )
          }], 1000),
          callClaude(env, CONFIG.models.REASONING_MODEL, [{
            role: "user",
            content: buildBuyerJustificationPrompt(
              JSON.stringify(report.buyer_lens, null, 2),
              JSON.stringify(report.condition, null, 2)
            )
          }], 1000)
        ]);
        
        return new Response(JSON.stringify({
          investor_lens_justification: investorJustificationResult.text.trim(),
          buyer_lens_justification: buyerJustificationResult.text.trim()
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return new Response("DFG Dual-Lens Analyst v2.3\n\nPOST /analyze\nPOST /analyze/justifications\nGET /health", {
      headers: { "Content-Type": "text/plain" }
    });
  }
};

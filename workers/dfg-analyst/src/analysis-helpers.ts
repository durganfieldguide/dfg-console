// ============================================
// REPORT FORMATTING (Durgan Field Guide)
// Deterministic formatting for automations.
// ============================================

import type {
  AssetSummary,
  ConditionAssessment,
  InvestorLensOutput,
  BuyerLensOutput,
  PriceRange
} from "./types";

// If you already export Verdict elsewhere, delete this and import it.
export type Verdict = "STRONG_BUY" | "BUY" | "MARGINAL" | "PASS";

export interface ReportFields {
  verdict: Verdict;
  max_bid_mid: number;
  max_bid_worst: number;
  max_bid_best: number;
  retail_est: number;
  wholesale_floor: number;
  expected_profit: number;
  expected_margin: number;
  confidence: number; // 1-5
  auction_end: string | null;
  listing_url: string;
  title: string;
  key_specs: string;
}

export interface GateResult {
  name: string;
  triggered: boolean;
  reason?: string;
}

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

/**
 * Confidence score 1-5 based on data quality and risk factors.
 * Deterministic, no model calls.
 */
export function calculateConfidenceScore(
  condition: ConditionAssessment
): number {
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

  // Storage constraint (garage gate)
  if ((condition.dimensions?.length_ft ?? 0) > 18) score -= 1;

  return clamp(score, 1, 5);
}

/**
 * Evaluate which gates were triggered for transparency.
 */
export function evaluateGates(params: {
  condition: ConditionAssessment;
  scenarios?: {
    quick_sale?: { gross_profit: number; margin: number };
    expected?: { gross_profit: number; margin: number };
  };
}): GateResult[] {
  const { condition, scenarios } = params;
  const gates: GateResult[] = [];

  gates.push({
    name: "limited_photos",
    triggered: condition.photos_analyzed != null && condition.photos_analyzed < 4,
    reason: condition.photos_analyzed != null ? `Only ${condition.photos_analyzed} photo(s) analyzed` : undefined
  });

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

  // Downside check (cash-flow paranoia)
  if (scenarios?.quick_sale) {
    gates.push({
      name: "thin_downside",
      triggered: scenarios.quick_sale.gross_profit < 300 && scenarios.quick_sale.margin < 0.15,
      reason: `Quick-sale profit ${fmtMoney(scenarios.quick_sale.gross_profit)} at ${fmtPct(scenarios.quick_sale.margin)} margin`
    });
  }

  return gates;
}

/**
 * Flat map of primitives for Make.com mapping.
 * Keep this shallow. Keep it boring. Keep it reliable.
 */
export function buildReportFields(params: {
  assetSummary: AssetSummary;
  investorLens: InvestorLensOutput;
  buyerLens: BuyerLensOutput;
  condition: ConditionAssessment;
  wholesaleFloor?: number; // pass arbitrage.investor_total_cost if you have it
}): ReportFields {
  const { assetSummary, investorLens, buyerLens, condition } = params;

  const scenarios = investorLens.scenarios as any;

  const maxBidMid = investorLens.max_bid ?? 0;
  const maxBidWorst = Math.round(maxBidMid * 0.85); // conservative haircut
  const maxBidBest = Math.round(maxBidMid * 1.10);  // upside if inspection clean

  const retailEst =
    buyerLens?.perceived_value_range?.high ??
    scenarios?.premium?.sale_price ??
    scenarios?.expected?.sale_price ??
    0;

  // Prefer explicit passed-in value (arbitrage.investor_total_cost).
  const wholesaleFloor =
    params.wholesaleFloor ??
    (investorLens as any).total_investment ??
    (investorLens as any).totalInvestment ??
    (investorLens as any).acquisition_model?.total_acquisition ??
    0;

  const expectedProfit = scenarios?.expected?.gross_profit ?? 0;
  const expectedMargin = scenarios?.expected?.margin ?? 0;

  const confidence = calculateConfidenceScore(condition);

  return {
    verdict: (investorLens.verdict as Verdict) ?? "PASS",
    max_bid_mid: maxBidMid,
    max_bid_worst: maxBidWorst,
    max_bid_best: maxBidBest,
    retail_est: retailEst,
    wholesale_floor: wholesaleFloor,
    expected_profit: expectedProfit,
    expected_margin: expectedMargin,
    confidence,
    auction_end: assetSummary.auction_end ?? null,
    listing_url: assetSummary.listing_url,
    title: assetSummary.title,
    key_specs: assetSummary.key_specs
  };
}

/**
 * 1–2 line summary for fast scanning.
 * Deterministic template; no Claude.
 */
export function buildReportSummary(params: {
  assetSummary: AssetSummary;
  investorLens: InvestorLensOutput;
  condition: ConditionAssessment;
}): string {
  const { assetSummary, investorLens, condition } = params;

  const verdict = (investorLens.verdict as Verdict) ?? "PASS";
  const maxBid = investorLens.max_bid ?? 0;
  const category = (investorLens as any).phoenix_comp_category || "standard";

  const gates = evaluateGates({ condition, scenarios: investorLens.scenarios as any });
  const triggered = gates.filter(g => g.triggered).map(g => g.name.replace(/_/g, " "));
  const gateNote = triggered.length
    ? ` Gates: ${triggered.slice(0, 2).join(", ")}${triggered.length > 2 ? "…" : ""}.`
    : "";

  const categoryNote = category === "unicorn" ? " 🦄 Phoenix unicorn." : "";

  return `${verdict}: ${assetSummary.key_specs}.${categoryNote}${gateNote} Max bid ${fmtMoney(maxBid)}.`;
}

/**
 * Full markdown report (human-readable).
 * Uses only computed values; no LLM.
 */
export function buildReportMarkdown(params: {
  assetSummary: AssetSummary;
  investorLens: InvestorLensOutput;
  buyerLens: BuyerLensOutput;
  condition: ConditionAssessment;
  nextSteps: { if_bidding: string[]; if_won: string[]; listing_prep: string[] };
}): string {
  const { assetSummary, investorLens, buyerLens, condition, nextSteps } = params;

  const scenarios = investorLens.scenarios as any;
  const acquisition = (investorLens as any).acquisition_model;

  const gates = evaluateGates({ condition, scenarios });
  const triggeredGates = gates.filter(g => g.triggered);

  const verdict = (investorLens.verdict as Verdict) ?? "PASS";

  const verdictEmoji: Record<Verdict, string> = {
    STRONG_BUY: "🟢",
    BUY: "🟡",
    MARGINAL: "🟠",
    PASS: "🔴"
  };

  const maxBid = investorLens.max_bid ?? 0;
  const confidence = calculateConfidenceScore(condition);

  // Auction end formatting (safe for Workers)
  let auctionEndStr = "Unknown";
  if (assetSummary.auction_end) {
    try {
      const endDate = new Date(assetSummary.auction_end);
      auctionEndStr = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
      }).format(endDate);
    } catch {
      auctionEndStr = assetSummary.auction_end;
    }
  }

  const lines: string[] = [];

  // Header
  lines.push(`## ${verdictEmoji[verdict]} ${verdict}: ${assetSummary.title}`);
  lines.push(`**${assetSummary.key_specs}** | ${assetSummary.year_make_model}`);
  lines.push(`Auction ends: ${auctionEndStr}`);
  lines.push(`[View Listing](${assetSummary.listing_url})`);

  // Numbers
  lines.push(`\n---\n### 💰 Numbers`);
  lines.push(`**Max Bid:** ${fmtMoney(maxBid)} (walk away above this)`);
  lines.push(`**Bid Range:** ${fmtMoney(Math.round(maxBid * 0.85))} – ${fmtMoney(Math.round(maxBid * 1.10))}`);

  if (acquisition?.total_acquisition != null) {
    lines.push(`**All-In Cost (est):** ${fmtMoney(acquisition.total_acquisition)} (bid + premium + tax)`);
  }

  if (scenarios?.expected) {
    lines.push(`**Expected Profit:** ${fmtMoney(scenarios.expected.gross_profit)} @ ${fmtPct(scenarios.expected.margin)} margin`);
  }
  if (scenarios?.quick_sale) {
    lines.push(`**Quick-Sale Floor (7d):** ${fmtMoney(scenarios.quick_sale.gross_profit)} @ ${fmtPct(scenarios.quick_sale.margin)}`);
  }

  lines.push(`**Confidence:** ${"★".repeat(confidence)}${"☆".repeat(5 - confidence)} (${confidence}/5)`);

  // Reasoning (use existing reasoning text, but still deterministic output)
  lines.push(`\n---\n### 🧠 Reasoning`);
  lines.push((investorLens as any).verdict_reasoning || "No reasoning provided.");

  // Gates
  if (triggeredGates.length) {
    lines.push(`\n---\n### ⚠️ Gates Triggered`);
    lines.push(`These factors capped or downgraded the verdict:\n`);
    for (const g of triggeredGates) {
      lines.push(`• **${g.name.replace(/_/g, " ")}**: ${g.reason || "triggered"}`);
    }
  }

  // Inspection priorities
  const inspection = (investorLens as any).inspection_priorities || [];
  if (inspection.length) {
    lines.push(`\n---\n### 🔍 Inspection Priorities`);
    inspection.slice(0, 5).forEach((p: string, i: number) => lines.push(`${i + 1}. ${p}`));
  }

  // Deal killers
  const killers = (investorLens as any).deal_killers || [];
  if (killers.length) {
    lines.push(`\n---\n### 🚫 Deal Killers`);
    killers.forEach((k: string) => lines.push(`• ${k}`));
  }

  // Next steps
  lines.push(`\n---\n### 📋 Next Steps`);

  lines.push(`\n**If Bidding:**`);
  nextSteps.if_bidding.forEach(s => lines.push(`• ${s}`));

  lines.push(`\n**If Won:**`);
  nextSteps.if_won.forEach(s => lines.push(`• ${s}`));

  lines.push(`\n**Listing Prep:**`);
  nextSteps.listing_prep.forEach(s => lines.push(`• ${s}`));

  // Buyer psychology (optional)
  if (buyerLens?.perceived_value_range) {
    lines.push(`\n---\n### 👤 Buyer Psychology`);
    lines.push(
      `Buyers see this as worth ${fmtMoney(buyerLens.perceived_value_range.low)}–${fmtMoney(
        buyerLens.perceived_value_range.high
      )}`
    );
    const objections = (buyerLens as any).objections || [];
    if (objections.length) {
      lines.push(`\n**Likely Objections:**`);
      objections.slice(0, 3).forEach((o: any) => {
        lines.push(`• "${o.concern}" → Rebuttal: ${o.rebuttal_strategy || "address in listing copy"}`);
      });
    }
  }

  return lines.join("\n");
}
// prompts.ts - All Claude Prompt Templates

export const CONDITION_ASSESSMENT_PROMPT = `Extract trailer condition as JSON. FACTS ONLY - no opinions or pricing.

## RULES:
- Use null for unknown values
- "Stationary" in auctions = legal disclaimer, not broken
- "Engine Issues" on generator = status "non-functional"

## RED FLAG CLASSIFICATION:
CORE RISK (deal-critical):
- Frame/axle structural damage (rust-through, cracks, bends)
- Title issues (salvage, lien, VIN mismatch, missing)
- Transport-critical: brakes locked, tires flat/missing (cannot tow safely)
- Water intrusion with structural impact (floor rot, wall delamination)
- Fraud indicators (misrepresentation, stolen, title washing)

OPTIONAL (non-essential features):
- Generators, A/C, entertainment systems, auxiliary equipment
- Cosmetic damage (paint, dents, surface rust)
- Minor electrical (lights, outlets, accessories)
- Accessories (toolboxes, spare parts, ramps)

BUYER IMPACT:
- Write from buyer's perspective (not investor/flipper)
- Answer: "Why would a buyer care?" or "How does this affect resale?"
- 1-2 sentences maximum
- Examples:
  * "Buyers will demand receipts showing the frame was professionally inspected."
  * "Most contractors view generators as a bonus - won't affect price."
  * "This raises red flags and will require 30-40% discount to sell."

## TITLE STATUS DETECTION (CRITICAL):
- ONLY set title_status based on EXPLICIT per-lot declarations like "Title Status: Clean" or "Title Status: On File"
- "Title Status: On File" = treat as "on_file" (unknown until physically verified)
- DO NOT infer salvage/rebuilt from general auction T&C boilerplate or educational text
- If no explicit title status is stated for THIS lot, use "unknown"

## RETURN JSON:
{
  "assessment_confidence": "high|medium|low",
  "photos_analyzed": 0,
  "year": number|null,
  "make": "string"|null,
  "model": "string"|null,
  "dimensions": {"length_ft": number|null, "width_ft": number|null, "height_ft": null},
  "dimension_confidence": "measured|estimated|unknown",
  "frame_integrity": "solid|surface_rust|structural_rust|compromised|unknown",
  "axle_status": "single|tandem|triple|unknown",
  "axle_condition": "good|worn|bent|unknown",
  "hitch_type": "bumper_pull|gooseneck|pintle|5th_wheel|unknown",
  "tires": {"count": number|null, "condition": "good|fair|worn|flat|missing|unknown", "estimated_remaining_life": "75%+|50-75%|25-50%|<25%|unknown"},
  "brakes": "functional|unknown|needs_service|locked",
  "lights": "functional|partial|non-functional|unknown",
  "trailer_type": "enclosed|open_utility|flatbed|dump|car_hauler|other",
  "enclosure": {"walls": "solid|dents|holes|delaminating|unknown", "doors": "functional|damaged|missing|unknown", "roof": "solid|leaks|damaged|unknown", "floor": "solid|soft_spots|rotted|unknown"},
  "auxiliary_equipment": [{"type": "string", "brand_model": "string"|null, "status": "functional|issues|non-functional|unknown", "notes": "brief"}],
  "title_status": "clean|salvage|rebuilt|on_file|unknown",
  "drive_status": "roadworthy|stationary|unknown",
  "red_flags": [{"category": "structural|mechanical|documentation|fraud", "severity": "minor|moderate|major|dealbreaker", "description": "brief", "requires_inspection": boolean, "riskCategory": "core_risk|optional", "buyerImpact": "1-2 sentence buyer perspective"}],
  "inspection_required": ["brief items"],
  "extraction_notes": ["brief notes"]
}`;

export const BUYER_LENS_PROMPT = `Analyze this trailer from a CONSERVATIVE BUYER's perspective.

## CONDITION:
{{CONDITION_JSON}}

## RETURN COMPACT JSON (no explanations, just data):
{
  "perceived_value_range": { "low": number, "high": number },
  "value_anchors": ["1-2 word comparisons"],
  "objections": [{"concern": "short issue", "severity": "minor|significant|major", "likely_discount_demand": number, "rebuttal_strategy": "brief"}],
  "perceived_repair_costs": {"items": [{"item": "name", "buyer_estimate": number, "reasoning": "brief"}], "total": number},
  "buyer_confidence": "high|medium|low",
  "friction_points": ["brief points"],
  "transparency_items": ["what to disclose"],
  "photography_priorities": ["what to photograph"],
  "copy_angles": ["listing angles"]
}

Use retail pricing: tires $150-200 each, brake job $300/axle, generator repair $1000+.
Keep all string values SHORT. Max 3-5 items per array.`;

export const INVESTOR_LENS_PROMPT = `You are a Phoenix-based trailer flipper evaluating an acquisition.

## YOUR BUSINESS MODEL:
- Buy undervalued assets, apply MINIMUM VIABLE REPAIRS, sell to contractors
- Target: >$600 profit OR >40% margin

## YOUR REPAIR PHILOSOPHY:
- Tires: Used from llantera ($40/tire)
- Lights: Amazon LED kit ($35)
- Generators with issues: NOT YOUR PROBLEM - market as "bonus core"
- Cosmetic: Pressure wash only (sweat equity)

## PHOENIX MARKET INTELLIGENCE:
- Contractors pay PREMIUM for tandem axles
- Small enclosed tandems (7x10, 7x12) are UNICORNS
- "Stationary" = legal CYA, not "won't roll"

## ⚠️ CRITICAL INSTRUCTION:
You have been provided with repair_plan and phoenix_comps.
**DO NOT** create your own repair list.
**DO NOT** adjust the system-provided costs.
**DO NOT** reduce resale because of non-functional auxiliary equipment.
Your job is to EVALUATE profit margin based STRICTLY on provided data.

## PROVIDED DATA:
Condition: {{CONDITION_JSON}}
Phoenix Comps: {{PHOENIX_COMPS_JSON}}
Repair Plan: {{REPAIR_PLAN_JSON}}
Acquisition: {{ACQUISITION_JSON}}

## SYSTEM CALCULATED NUMBERS (USE EXACTLY AS PROVIDED):
- max_bid: {{MAX_BID}}
- total_investment: {{TOTAL_INVESTMENT}}
- scenarios:
  - quick_sale: sale_price={{QS_PRICE}}, gross_profit={{QS_PROFIT}}, margin={{QS_MARGIN}}
  - expected: sale_price={{EXP_PRICE}}, gross_profit={{EXP_PROFIT}}, margin={{EXP_MARGIN}}
  - premium: sale_price={{PREM_PRICE}}, gross_profit={{PREM_PROFIT}}, margin={{PREM_MARGIN}}

## RETURN JSON with: phoenix_comp_category, phoenix_resale_range, scenarios (conservative/expected/optimistic), verdict (BUY|WATCH|PASS), verdict_reasoning, max_bid, inspection_priorities, deal_killers

## VERDICT CRITERIA (use ONLY these three terms):
- BUY: >$600 expected profit OR >40% margin, acceptable risk
- WATCH: $400-600 profit, OR elevated risk that needs resolution
- PASS: <$400 profit OR unacceptable risk - do not pursue

## VERDICT_REASONING RULES:
- Reference the threshold that was met or missed for the returned verdict (e.g., BUY threshold $600 / 40%).
- Title language must reflect title_status: "clean title", "title on file (verify transfer)", or "title risk".
- If quick_sale margin < 0.15, include a downside warning about thin quick-sale safety.
- Use the provided numeric values; do not invent or adjust profits/margins.`;

export function buildConditionPrompt(description: string, photoCount: number): string {
  return `${CONDITION_ASSESSMENT_PROMPT}

LISTING: ${description}

Photos: ${photoCount}. Return ONLY the JSON object, no markdown.`;
}

export function buildBuyerLensPrompt(conditionJson: string): string {
  return BUYER_LENS_PROMPT.replace("{{CONDITION_JSON}}", conditionJson) + "\n\nReturn ONLY JSON, no markdown.";
}

export function buildInvestorLensPrompt(
  conditionJson: string,
  phoenixCompsJson: string,
  repairPlanJson: string,
  acquisitionJson: string,
  metrics: {
    maxBid: number;
    totalInvestment: number;
    scenarios: {
      quick_sale: { sale_price: number; gross_profit: number; margin: number };
      expected: { sale_price: number; gross_profit: number; margin: number };
      premium: { sale_price: number; gross_profit: number; margin: number };
    };
  }
): string {
  return INVESTOR_LENS_PROMPT
    .replace("{{CONDITION_JSON}}", conditionJson)
    .replace("{{PHOENIX_COMPS_JSON}}", phoenixCompsJson)
    .replace("{{REPAIR_PLAN_JSON}}", repairPlanJson)
    .replace("{{ACQUISITION_JSON}}", acquisitionJson)
    .replace("{{MAX_BID}}", String(metrics.maxBid))
    .replace("{{TOTAL_INVESTMENT}}", String(metrics.totalInvestment))
    .replace("{{QS_PRICE}}", String(metrics.scenarios.quick_sale.sale_price))
    .replace("{{QS_PROFIT}}", String(metrics.scenarios.quick_sale.gross_profit))
    .replace("{{QS_MARGIN}}", String(metrics.scenarios.quick_sale.margin))
    .replace("{{EXP_PRICE}}", String(metrics.scenarios.expected.sale_price))
    .replace("{{EXP_PROFIT}}", String(metrics.scenarios.expected.gross_profit))
    .replace("{{EXP_MARGIN}}", String(metrics.scenarios.expected.margin))
    .replace("{{PREM_PRICE}}", String(metrics.scenarios.premium.sale_price))
    .replace("{{PREM_PROFIT}}", String(metrics.scenarios.premium.gross_profit))
    .replace("{{PREM_MARGIN}}", String(metrics.scenarios.premium.margin))
    + "\n\nReturn ONLY JSON, no markdown.";
}

export function buildInvestorJustificationPrompt(
  investorLens: string,
  condition: string,
  phoenixComps: string,
  repairPlan: string
  ): string {
    return `You are explaining the INVESTOR/OPERATOR logic behind a trailer flip deal to help the operator understand and learn the reasoning.

  INVESTOR LENS OUTPUT:
  ${investorLens}

  CONDITION ASSESSMENT:
  ${condition}

  PHOENIX COMPS:
  ${phoenixComps}

  REPAIR PLAN:
  ${repairPlan}

  Write a concise 5-7 sentence explanation that covers:
  - How the Phoenix resale comps were selected and why they're reliable
  - Why the resale target (market_rate) is set at this level
  - Why the repair plan is minimal (or not) and what drives repair costs
  - Where the arbitrage opportunity comes from (scarcity, market inefficiency, etc.)
  - Critical assumptions that MUST be physically verified on-site

  Write in second person ("You're looking at..."). Be specific with numbers. Focus on teachable insights.

  Return ONLY the justification text, no preamble.`;
}

export function buildBuyerJustificationPrompt(
  buyerLens: string,
  condition: string
  ): string {
    return `You are explaining RETAIL BUYER PSYCHOLOGY to help an investor understand how non-professional buyers think and price deals.

  BUYER LENS OUTPUT:
  ${buyerLens}

  CONDITION ASSESSMENT:
  ${condition}

  Write a concise 5-7 sentence explanation that covers:
  - What visual/psychological factors anchor the buyer's mental price
  - What scares them or makes them discount heavily
  - Why their perceived repair costs are higher than actual investor costs
  - How they compare this asset to national listings vs local market reality
  - Why they miss the scarcity or arbitrage opportunity

  Write in third person ("A typical buyer sees..."). Be specific about their mental math. Focus on the psychology.

  Return ONLY the justification text, no preamble.`;
}

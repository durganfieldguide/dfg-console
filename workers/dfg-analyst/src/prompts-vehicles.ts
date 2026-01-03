// prompts-vehicles.ts - Vehicle Category Prompts (SUVs, Cars, Trucks)

export const CONDITION_ASSESSMENT_PROMPT_VEHICLES = `Extract vehicle condition as JSON. FACTS ONLY - no opinions or pricing.

## RULES:
- Use null for unknown values
- "Stationary" in auctions = legal disclaimer, not necessarily broken
- Salvage/Rebuilt title is CRITICAL information

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
  "trim": "string"|null,
  "vin_visible": "string"|null,
  "mileage": number|null,
  "mileage_confidence": "odometer_visible|estimated|unknown",
  "exterior": {
    "color": "string"|null,
    "paint_condition": "excellent|good|fair|poor|repainted|unknown",
    "body_damage": "none|minor_dents|major_dents|collision_damage|rust|unknown",
    "glass": "intact|cracked|missing|unknown",
    "lights": "all_working|some_out|damaged|unknown"
  },
  "interior": {
    "condition": "excellent|good|fair|poor|gutted|unknown",
    "seats": "intact|worn|torn|missing|unknown",
    "dashboard": "intact|cracked|modified|unknown",
    "electronics": "all_working|partial|non_functional|unknown",
    "odor": "clean|smoke|mildew|unknown"
  },
  "mechanical": {
    "engine_status": "runs_drives|runs_rough|cranks_no_start|no_crank|unknown",
    "engine_type": "string"|null,
    "transmission": "automatic|manual|cvt|unknown",
    "transmission_status": "shifts_smooth|slips|hard_shifts|inoperable|unknown",
    "drivetrain": "FWD|RWD|AWD|4WD|unknown",
    "suspension": "good|worn|damaged|modified|unknown",
    "brakes": "good|needs_service|grinding|unknown",
    "exhaust": "intact|leak|missing|modified|unknown"
  },
  "tires": {
    "count": number|null,
    "condition": "good|fair|worn|bald|mismatched|unknown",
    "estimated_remaining_life": "75%+|50-75%|25-50%|<25%|unknown"
  },
  "title_status": "clean|salvage|rebuilt|lien|branded|unknown",
  "drive_status": "runs_drives|runs_stationary|tow_only|unknown",
  "red_flags": [{"category": "structural|mechanical|title|fraud|odometer", "severity": "minor|moderate|major|dealbreaker", "description": "brief", "requires_inspection": boolean}],
  "known_issues": ["brief description of visible/stated issues"],
  "inspection_required": ["brief items"],
  "extraction_notes": ["brief notes"]
}`;

export const BUYER_LENS_PROMPT_VEHICLES = `Analyze this vehicle from a CONSERVATIVE BUYER's perspective.

## CONDITION:
{{CONDITION_JSON}}

## RETURN COMPACT JSON (no explanations, just data):
{
  "perceived_value_range": { "low": number, "high": number },
  "value_anchors": ["KBB estimate", "similar local listings"],
  "objections": [{"concern": "short issue", "severity": "minor|significant|major", "likely_discount_demand": number, "rebuttal_strategy": "brief"}],
  "perceived_repair_costs": {"items": [{"item": "name", "buyer_estimate": number, "reasoning": "brief"}], "total": number},
  "buyer_confidence": "high|medium|low",
  "friction_points": ["brief points"],
  "transparency_items": ["what to disclose upfront"],
  "photography_priorities": ["angles/details to photograph for listing"],
  "copy_angles": ["selling points to emphasize"]
}

Use retail repair pricing: oil change $80-120, brakes $300-600/axle, tires $600-1200 set.
Buyers discount heavily for: salvage title (30-50%), high mileage, visible damage.
Keep all string values SHORT. Max 3-5 items per array.`;

export const INVESTOR_LENS_PROMPT_VEHICLES = `You are a Phoenix-based vehicle flipper evaluating an acquisition.

## YOUR BUSINESS MODEL:
- Buy undervalued vehicles, apply MINIMUM VIABLE REPAIRS, sell to retail buyers
- Target: >$1,500 profit OR >20% margin
- Typical flip: 14-30 days

## YOUR REPAIR PHILOSOPHY:
- Cosmetic: Detail only ($100-200), no paint work unless obvious
- Mechanical: Only safety-critical items (brakes, tires)
- Deferred maintenance: Disclose, don't fix (timing belt, suspension)
- Title issues: Salvage = heavy discount or pass

## PHOENIX MARKET INTELLIGENCE:
- SUVs and trucks command premium in AZ
- 4WD/AWD less critical here than mountain states
- Fuel economy matters less (gas is cheap)
- Clean Carfax sells for 10-15% premium
- Private party sales avoid dealer fees

## ⚠️ CRITICAL INSTRUCTION:
You have been provided with repair_plan and market_comps.
**DO NOT** create your own repair list.
**DO NOT** adjust the system-provided costs.
Your job is to EVALUATE profit margin based STRICTLY on provided data.

## PROVIDED DATA:
Condition: {{CONDITION_JSON}}
Market Comps: {{MARKET_COMPS_JSON}}
Repair Plan: {{REPAIR_PLAN_JSON}}
Acquisition: {{ACQUISITION_JSON}}

## SYSTEM CALCULATED NUMBERS (USE EXACTLY AS PROVIDED):
- max_bid: {{MAX_BID}}
- total_investment: {{TOTAL_INVESTMENT}}
- scenarios:
  - quick_sale: sale_price={{QS_PRICE}}, gross_profit={{QS_PROFIT}}, margin={{QS_MARGIN}}
  - expected: sale_price={{EXP_PRICE}}, gross_profit={{EXP_PROFIT}}, margin={{EXP_MARGIN}}
  - premium: sale_price={{PREM_PRICE}}, gross_profit={{PREM_PROFIT}}, margin={{PREM_MARGIN}}

## RETURN JSON with: market_comp_category, resale_range, scenarios, verdict (BUY|WATCH|PASS), verdict_reasoning, max_bid, inspection_priorities, deal_killers

## VERDICT CRITERIA (use ONLY these three terms):
- BUY: >$1,500 expected profit OR >20% margin, clean title preferred
- WATCH: $800-1,500 profit, OR elevated risk that needs resolution
- PASS: <$800 profit OR unacceptable risk (salvage w/o deep discount, flood damage, frame damage)

## VERDICT_REASONING RULES:
- Reference the threshold that was met or missed for the returned verdict
- Title status is CRITICAL: clean title, salvage (30-50% discount required), rebuilt
- Mileage bands matter: <100k good, 100-150k acceptable, >150k = budget buyer only
- Include any mechanical unknowns as risk factors
- For salvage title: profit must be exceptional to justify (>$3k minimum)`;

export function buildConditionPromptVehicles(description: string, photoCount: number): string {
  return `${CONDITION_ASSESSMENT_PROMPT_VEHICLES}

LISTING: ${description}

Photos: ${photoCount}. Return ONLY the JSON object, no markdown.`;
}

export function buildBuyerLensPromptVehicles(conditionJson: string): string {
  return BUYER_LENS_PROMPT_VEHICLES.replace("{{CONDITION_JSON}}", conditionJson) + "\n\nReturn ONLY JSON, no markdown.";
}

export function buildInvestorLensPromptVehicles(
  conditionJson: string,
  marketCompsJson: string,
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
  return INVESTOR_LENS_PROMPT_VEHICLES
    .replace("{{CONDITION_JSON}}", conditionJson)
    .replace("{{MARKET_COMPS_JSON}}", marketCompsJson)
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

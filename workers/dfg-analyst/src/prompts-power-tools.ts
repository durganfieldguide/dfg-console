// prompts-power-tools.ts - Power Tools Category Prompts

export const CONDITION_ASSESSMENT_PROMPT_POWER_TOOLS = `Extract power tool condition as JSON. FACTS ONLY - no opinions or pricing.

## RULES:
- Use null for unknown values
- "Tested" means turned on, not necessarily fully functional
- Battery condition is CRITICAL - note date codes if visible

## RETURN JSON:
{
  "assessment_confidence": "high|medium|low",
  "photos_analyzed": 0,
  "year": number|null,
  "make": "string"|null,
  "model": "string"|null,
  "tool_type": "drill|impact_driver|circular_saw|reciprocating_saw|grinder|multi_tool|combo_kit|other",
  "power_source": "cordless|corded|pneumatic|unknown",
  "battery_system": {"voltage": "12V|18V|20V|40V|60V|unknown", "chemistry": "lithium|nimh|nicd|unknown", "count": number|null, "condition": "good|fair|worn|swollen|missing|unknown"},
  "charger_included": "yes|no|unknown",
  "condition": {
    "cosmetic": "excellent|good|fair|heavy_wear|unknown",
    "motor": "runs_strong|runs_weak|noisy|smoking|dead|untested|unknown",
    "chuck_or_blade": "good|worn|damaged|missing|unknown",
    "trigger_switch": "responsive|sticky|intermittent|broken|unknown",
    "battery_terminals": "clean|corroded|damaged|unknown"
  },
  "included_accessories": [{"item": "string", "condition": "good|fair|poor|unknown"}],
  "case_or_bag": "hard_case|soft_bag|none|unknown",
  "red_flags": [{"category": "mechanical|electrical|battery|counterfeit", "severity": "minor|moderate|major|dealbreaker", "description": "brief", "requires_testing": boolean}],
  "inspection_required": ["brief items"],
  "extraction_notes": ["brief notes"]
}`;

export const BUYER_LENS_PROMPT_POWER_TOOLS = `Analyze this power tool from a CONSERVATIVE BUYER's perspective.

## CONDITION:
{{CONDITION_JSON}}

## RETURN COMPACT JSON (no explanations, just data):
{
  "perceived_value_range": { "low": number, "high": number },
  "value_anchors": ["Home Depot new price", "eBay used comps"],
  "objections": [{"concern": "short issue", "severity": "minor|significant|major", "likely_discount_demand": number, "rebuttal_strategy": "brief"}],
  "perceived_repair_costs": {"items": [{"item": "name", "buyer_estimate": number, "reasoning": "brief"}], "total": number},
  "buyer_confidence": "high|medium|low",
  "friction_points": ["brief points"],
  "transparency_items": ["what to disclose"],
  "photography_priorities": ["what to photograph"],
  "copy_angles": ["listing angles"]
}

Use retail pricing: batteries $40-80 each, chargers $30-50. Buyers fear battery replacement costs.
Keep all string values SHORT. Max 3-5 items per array.`;

export const INVESTOR_LENS_PROMPT_POWER_TOOLS = `You are a Phoenix-based tool flipper evaluating an acquisition.

## YOUR BUSINESS MODEL:
- Buy undervalued tools, test/clean, sell to contractors
- Target: >$40 profit OR >30% margin
- Fast flip: list within 24h, sell within 7 days

## YOUR APPROACH:
- Batteries: Test voltage, replace if dead ($40-80 each)
- Cosmetic: Wipe down only (sweat equity)
- Missing accessories: Don't replace unless critical (chuck key, blade guard)
- Case: Nice to have but not required

## PHOENIX MARKET INTELLIGENCE:
- Contractors prefer Milwaukee, DeWalt, Makita (brand loyalty strong)
- Combo kits sell fast if complete
- Single tools need to be priced 40-50% below retail
- Battery compatibility is KING (XR, Flexvolt systems premium)

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
- BUY: >$40 expected profit OR >30% margin, premium brand preferred
- WATCH: $20-40 profit, OR elevated risk that needs resolution
- PASS: <$20 profit OR unacceptable risk

## VERDICT_REASONING RULES:
- Reference the threshold that was met or missed
- Battery condition is PRIMARY risk factor
- Brand matters: DeWalt/Milwaukee = lower risk, off-brand = higher risk
- Combo kits require ALL pieces present for premium pricing`;

export function buildConditionPromptPowerTools(description: string, photoCount: number): string {
  return `${CONDITION_ASSESSMENT_PROMPT_POWER_TOOLS}

LISTING: ${description}

Photos: ${photoCount}. Return ONLY the JSON object, no markdown.`;
}

export function buildBuyerLensPromptPowerTools(conditionJson: string): string {
  return BUYER_LENS_PROMPT_POWER_TOOLS.replace("{{CONDITION_JSON}}", conditionJson) + "\n\nReturn ONLY JSON, no markdown.";
}

export function buildInvestorLensPromptPowerTools(
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
  return INVESTOR_LENS_PROMPT_POWER_TOOLS
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

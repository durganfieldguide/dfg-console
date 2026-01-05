// types.ts - FlipOS Dual-Lens Analyst Type Definitions

// ============================================
// CONFIGURATION
// ============================================

export interface ModelConfig {
  CONDITION_MODEL: string;
  REASONING_MODEL: string;
  FALLBACK_MODEL: string;
}

export interface Limits {
  MAX_CONCURRENT_ANALYSES: number;
  MAX_BATCH_SIZE: number;
  MAX_COST_PER_RUN_USD: number;
  TOKENS_PER_ANALYSIS_ESTIMATE: number;
}

// ============================================
// LISTING DATA (Ingress Contract)
// ============================================

export interface TieredFeeSchedule {
  tiers: Array<{
    max_bid: number;
    premium: number;
  }>;
  above_threshold_percent?: number;
}

/**
 * Category configuration passed from API (loaded from D1)
 * Enables pluggable categories without code changes
 */
export interface CategoryConfigData {
  id: string;
  name: string;
  min_profit_dollars: number;
  min_margin_percent: number;    // 40 = 40%
  max_acquisition: number;
  target_days_to_sell: number;
  max_distance_miles: number;
  min_photos: number;
  required_evidence: string[];
  verdict_thresholds: {
    buy: { min_profit: number; min_margin: number };
    watch: { min_profit: number; min_margin: number };
    pass?: { max_profit: number };
  };
  prompt_file: string;
  market_comps_file: string;
}

export interface ListingData {
  source: "sierra" | "fb_marketplace" | "craigslist" | "offerup" | string; // #100: standardized to 'sierra'
  listing_url: string;
  lot_id?: string;
  auction_id?: string;
  fee_schedule_source?: string;
  category_id?: string;  // Added: category from Scout (buy_box, power_tools, welders, etc.)
  title: string;
  description: string;
  photos: string[];       // Full gallery URLs from Scout
  photo_count?: number;   // Total available (from source, may differ from photos.length)
  current_bid: number;
  buy_now_price?: number;
  fee_schedule?: {
    buyer_premium: number | TieredFeeSchedule;
    sales_tax_percent: number;
  };
  location: {
    city: string;
    state: string;
    distance_miles?: number;
  };
  ends_at?: string;
  seller_type?: "private" | "dealer" | "municipal_fleet" | "commercial_fleet" | "repo";

  // Sprint 1.5: Operator inputs from frontend
  operator_inputs?: {
    title_status?: "clean" | "salvage" | "rebuilt" | "bonded" | "parts_only" | "unknown" | string;
    title_in_hand?: "yes" | "no" | "unknown";
    lien_status?: "none" | "lien_present" | "unknown";
    vin?: string;
    odometer_miles?: number;
    title_status_verified?: boolean;
    odometer_verified?: boolean;
  };

  // Sprint N+2: Category config from D1 (enables pluggable categories)
  category_config?: CategoryConfigData;
}

// ============================================
// CONDITION ASSESSMENT (Phase 1 Output)
// ============================================

export interface TireCondition {
  count: number | null;
  condition: "good" | "fair" | "worn" | "flat" | "missing" | "unknown";
  estimated_remaining_life: "75%+" | "50-75%" | "25-50%" | "<25%" | "unknown";
}

export interface EnclosureCondition {
  walls: "solid" | "dents" | "holes" | "delaminating" | "unknown";
  doors: "functional" | "damaged" | "missing" | "unknown";
  roof: "solid" | "leaks" | "damaged" | "unknown";
  floor: "solid" | "soft_spots" | "rotted" | "unknown";
}

export interface AuxiliaryEquipment {
  type: string;
  brand_model: string | null;
  status: "functional" | "issues" | "non-functional" | "unknown";
  notes: string;
}

export interface RedFlag {
  category: "structural" | "mechanical" | "documentation" | "fraud";
  severity: "minor" | "moderate" | "major" | "dealbreaker";
  description: string;
  requires_inspection: boolean;
}

// ============================================
// EVIDENCE LEDGER - What backs each claim
// ============================================

export type EvidenceType =
  | 'photo'           // Visible in photos
  | 'listing_text'    // Stated in listing description
  | 'vin_decode'      // From VIN decoding
  | 'seller_stated'   // Seller explicitly stated
  | 'pattern'         // Inferred from patterns (e.g., rust pattern → frame damage)
  | 'inferred'        // Inferred from other evidence (e.g., no photos → unknown)
  | 'default';        // Default assumption (no evidence)

export interface EvidenceCitation {
  type: EvidenceType;
  source: string;           // e.g., "photo #3", "listing description", "VIN decode"
  confidence: 'high' | 'medium' | 'low';
  detail?: string;          // What specifically was observed
}

export interface SubsystemEvidence {
  claim: string;            // e.g., "Good", "Surface rust", "Unknown"
  evidence: EvidenceCitation[];
  verified: boolean;        // True if backed by high-confidence evidence
  summary: string;          // e.g., "Verified by: 2 photos" or "No evidence (assumed)"
}

// Photo pipeline metrics - distinguishes source/fetch/analysis failures
export interface PhotoMetrics {
  available: number;       // Total photos the listing has (from source)
  availability_known: boolean; // True if photo_count came from source; false if we're guessing from received
  received: number;        // URLs received in API request
  selected: number;        // Chosen for analysis (capped at 10-12)
  analyzed_ok: number;     // Successfully processed by Claude
  analyzed_failed: number; // Failed to fetch/process
  selected_indices?: number[]; // Which photos we analyzed (for evidence ledger)
}

export interface ConditionAssessment {
  assessment_confidence: "high" | "medium" | "low";
  identity_confidence?: "high" | "medium" | "low";
  identity_conflict?: boolean;
  photos_analyzed: number;   // What Claude reports it saw
  photo_metrics?: PhotoMetrics; // Full pipeline metrics

  // Common Specs
  year: number | null;
  make: string | null;
  model: string | null;
  dimensions?: {
    length_ft: number | null;
    width_ft: number | null;
    height_ft?: number | null;
  };
  dimension_confidence?: "measured" | "estimated" | "unknown";

  // Trailer-specific fields
  frame_integrity?: "solid" | "surface_rust" | "structural_rust" | "compromised" | "unknown";
  axle_status?: "single" | "tandem" | "triple" | "unknown";
  axle_condition?: "good" | "worn" | "bent" | "unknown";
  hitch_type?: "bumper_pull" | "gooseneck" | "pintle" | "5th_wheel" | "unknown";
  trailer_type?: "enclosed" | "open_utility" | "flatbed" | "dump" | "car_hauler" | "other";
  enclosure?: EnclosureCondition;
  auxiliary_equipment?: AuxiliaryEquipment[];

  // Vehicle-specific fields
  trim?: string | null;
  vin_visible?: string | null;
  mileage?: number | null;
  mileage_confidence?: "odometer_visible" | "estimated" | "unknown";
  exterior?: {
    color?: string | null;
    paint_condition?: string;
    body_damage?: string;
    glass?: string;
    lights?: string;
  };
  interior?: {
    condition?: string;
    seats?: string;
    dashboard?: string;
    electronics?: string;
    odor?: string;
  };
  mechanical?: {
    engine_status?: string;
    engine_type?: string | null;
    transmission?: string;
    transmission_status?: string;
    drivetrain?: string;
    suspension?: string;
    brakes?: string;
    exhaust?: string;
  };
  known_issues?: string[];

  // Power tool specific fields
  tool_type?: string;
  power_source?: string;
  battery_system?: {
    voltage?: string;
    chemistry?: string;
    count?: number | null;
    condition?: string;
  };
  charger_included?: string;
  condition?: {
    cosmetic?: string;
    motor?: string;
    chuck_or_blade?: string;
    trigger_switch?: string;
    battery_terminals?: string;
  };
  included_accessories?: Array<{ item: string; condition: string }>;
  case_or_bag?: string;

  // Common wear items (optional for flexibility)
  tires?: TireCondition | { count?: number | null; condition?: string; estimated_remaining_life?: string };
  brakes?: "functional" | "unknown" | "needs_service" | "locked" | string;
  lights?: "functional" | "partial" | "non-functional" | "unknown" | string;

  // Common documentation
  title_status?: "clean" | "salvage" | "rebuilt" | "on_file" | "unknown" | "lien" | "branded" | string;
  drive_status?: "roadworthy" | "stationary" | "unknown" | "runs_drives" | "runs_stationary" | "tow_only" | string;

  // Common flags
  red_flags?: RedFlag[];
  inspection_required?: string[];
  extraction_notes?: string[];

  // Repair indicators (from analysis logic)
  tires_need_replacement?: boolean;
  lights_inoperable?: boolean;
  deck_needs_repair?: boolean;
  rust_treatment_needed?: boolean;
  frame_rust_severity?: string;
  structural_damage?: boolean;

  // Evidence ledger - what backs each condition claim
  evidence_ledger?: {
    frame?: SubsystemEvidence;
    axles?: SubsystemEvidence;
    tires?: SubsystemEvidence;
    brakes?: SubsystemEvidence;
    lights?: SubsystemEvidence;
    exterior?: SubsystemEvidence;
    interior?: SubsystemEvidence;
    mechanical?: SubsystemEvidence;
    title?: SubsystemEvidence;
    // Summary stats
    total_claims: number;
    verified_claims: number;
    photo_backed: number;
    text_backed: number;
    inferred: number;
  };
}

// ============================================
// MARKET DEMAND ASSESSMENT
// ============================================
// Never say "Unknown" - always provide a heuristic rating with caveats

export type DemandLevel = 'high' | 'moderate' | 'low' | 'niche';

export interface MarketDemandAssessment {
  // The rating (never "unknown")
  level: DemandLevel;

  // Confidence in this rating
  confidence: 'high' | 'medium' | 'low';

  // What drove this rating
  basis: {
    method: 'comps_data' | 'category_heuristic' | 'price_band' | 'seasonal' | 'combined';
    factors: string[];  // e.g., ["enclosed trailers popular", "under $5k sweet spot"]
  };

  // Missing data that would improve this
  missing_inputs: string[];  // e.g., ["local comps feed", "days-on-market data"]

  // Actionable implications
  implications: {
    expected_days_to_sell: string;  // e.g., "7-14 days" or "14-30 days"
    pricing_advice: string;         // e.g., "Price at market rate, will move quickly"
    risk_note: string | null;       // e.g., "Niche market - may take longer"
  };

  // Human-readable summary (never "N/A")
  summary: string;  // e.g., "High demand (enclosed trailers under $5k sell fast in Phoenix)"
}

// ============================================
// BUYER LENS (Phase 2A Output)
// ============================================

export interface BuyerObjection {
  concern: string;
  severity: "minor" | "significant" | "major";
  likely_discount_demand: number;
  rebuttal_strategy: string;
}

export interface PerceivedRepairItem {
  item: string;
  buyer_estimate: number;
  reasoning: string;
}

export interface BuyerLensOutput {
  perceived_value_range: { low: number; high: number };
  value_anchors: string[];
  objections: BuyerObjection[];
  perceived_repair_costs: {
    items: PerceivedRepairItem[];
    total: number;
  };
  buyer_confidence: "high" | "medium" | "low";
  friction_points: string[];
  transparency_items: string[];
  photography_priorities: string[];
  copy_angles: string[];
}

// ============================================
// INVESTOR LENS (Phase 2B Output)
// ============================================

export interface PriceRange {
  quick_sale: number;
  market_rate: number;
  premium: number;
  scarcity?: "common" | "moderate" | "scarce" | "unicorn";
  interpolated_from?: string;
  note?: string;
}

export interface RepairItem {
  item: string;
  approach: string;
  cost: number;
  required: boolean;
  note?: string;
  marketing_note?: string;
}

export interface RepairPlan {
  items: RepairItem[];
  total_required: number;
  contingency: number;
  grand_total: number;
  confidence: "high" | "medium" | "low";
}

export interface AcquisitionModel {
  current_bid: number;
  estimated_winning_bid: number;
  buyer_premium: number;
  sales_tax: number;
  transport_estimate: number;
  total_acquisition: number;
}

export interface ProfitScenario {
  sale_price: number;
  total_cost: number;
  gross_profit: number;
  margin: number;
  days_to_sell: string;
  meets_threshold: boolean;
}

export interface InvestorLensOutput {
  phoenix_comp_category: string;
  phoenix_resale_range: PriceRange;
  comp_source: "exact_match" | "interpolated" | "baseline";
  interpolated_from?: string;
  scarcity_factor: "common" | "moderate" | "scarce" | "unicorn";
  
  acquisition_model: AcquisitionModel;
  repair_plan: RepairPlan;
  total_investment: number;
  
  scenarios: {
    conservative: ProfitScenario;
    expected: ProfitScenario;
    optimistic: ProfitScenario;
  };
  
  verdict: "STRONG_BUY" | "BUY" | "MARGINAL" | "PASS";
  verdict_reasoning: string;
  max_bid: number;
  
  inspection_priorities: string[];
  deal_killers: string[];
}

// ============================================
// UNIFIED OUTPUT
// ============================================

export interface ArbitrageAnalysis {
  perception_gap: number;
  objection_cost: number;
  marketing_leverage: string[];
}

export interface AssetSummary {
  title: string;
  year_make_model: string;
  key_specs: string;
  source: string;
  listing_url: string;
  current_bid: number;
  auction_end?: string;
}

export interface DualLensReport {
  asset_summary: AssetSummary;
  condition: ConditionAssessment;
  buyer_lens: BuyerLensOutput;
  investor_lens: InvestorLensOutput;
  arbitrage: {
    perception_gap: number;
    objection_cost: number;
    marketing_leverage: string[];
  };
  
  // NEW: Justification narratives
  investor_lens_justification: string;
  buyer_lens_justification: string;
  
  next_steps: {
    if_bidding: string[];
    if_won: string[];
    listing_prep: string[];
  };
  analysis_timestamp: string;
  model_versions: {
    CONDITION_MODEL: string;
    REASONING_MODEL: string;
    FALLBACK_MODEL: string;
  };
  total_tokens_used: number;
}

// ============================================
// DISCORD TYPES
// ============================================

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  color: number;
  description?: string;
  fields: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

// ============================================
// PHOENIX MARKET DATA TYPES
// ============================================

export interface TrailerSizeComps {
  [size: string]: PriceRange;
}

export interface AxleTypeComps {
  single_axle: TrailerSizeComps;
  tandem_axle: TrailerSizeComps;
}

export interface TrailerComps {
  enclosed: AxleTypeComps;
  utility_open: AxleTypeComps;
}

export interface FlipCosts {
  tires: {
    used_llantera_per_tire: number;
    used_set_2: number;
    used_set_4: number;
    new_budget_per_tire: number;
    new_budget_set_4: number;
  };
  lights: {
    led_kit_basic: number;
    led_kit_full: number;
    wiring_repair: number;
    individual_bulb: number;
  };
  bearings: {
    repack_diy_per_axle: number;
    replace_per_hub: number;
    full_kit_per_axle: number;
  };
  brakes: {
    adjust_only: number;
    shoes_per_axle: number;
    full_brake_job_per_axle: number;
  };
  cosmetic: {
    pressure_wash: number;
    touch_up_paint: number;
    rust_converter_treatment: number;
    full_respray: number;
  };
  floor: {
    plywood_sheet_3_4: number;
    osb_sheet: number;
    labor: number;
  };
  doors: {
    hinge_repair: number;
    latch_replacement: number;
    full_door_used: number;
  };
  contingency: {
    low_confidence_buffer: number;
    unknown_axle_buffer: number;
    unknown_brakes_buffer: number;
  };
}

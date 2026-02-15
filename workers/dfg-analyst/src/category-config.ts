/**
 * Category Configuration System
 *
 * Enables pluggable categories where new category = D1 row + prompt file.
 * No code changes required to add new categories.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Hard gate rule for auto-reject/flag in Scout
 */
export interface HardGate {
  field: string // e.g., "title_status", "parts_only", "mileage"
  operator: 'equals' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  value: unknown // Single value or array for 'in' operator
  action: 'reject' | 'flag' // reject = auto-reject, flag = needs review
}

/**
 * Verdict thresholds for buy/watch/pass decisions
 */
export interface VerdictThresholds {
  buy: {
    min_profit: number
    min_margin: number // 0.40 = 40%
  }
  watch: {
    min_profit: number
    min_margin: number
  }
  pass?: {
    max_profit: number // Below this = auto-pass
  }
}

/**
 * Category configuration loaded from D1
 */
export interface CategoryConfig {
  id: string
  name: string
  parent_id?: string
  enabled: boolean

  // Classification (Scout)
  keywords_positive: string[]
  keywords_negative: string[]
  confidence_threshold: number // 0-100

  // Hard gates (Scout auto-reject)
  hard_gates: HardGate[]

  // Evidence requirements (Analyst)
  min_photos: number
  required_evidence: string[] // e.g., ["frame_integrity", "axle_status"]

  // Economic thresholds (Analyst)
  min_profit_dollars: number
  min_margin_percent: number // 40 = 40%
  max_acquisition: number
  target_days_to_sell: number

  // Geography limits
  max_distance_miles: number
  distance_margin_override?: number

  // Prompt configuration
  prompt_file: string // e.g., "prompts-vehicles.ts"
  market_comps_file: string // e.g., "analysis-vehicles.ts"
  condition_schema?: Record<string, unknown>

  // Verdict thresholds
  verdict_thresholds: VerdictThresholds

  // Display
  display_order: number
  icon?: string
}

// =============================================================================
// DEFAULT CONFIGURATIONS (fallback if D1 unavailable)
// =============================================================================

export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  buy_box: {
    id: 'buy_box',
    name: 'Primary Buy Box (Trailers)',
    enabled: true,
    keywords_positive: ['utility trailer', 'cargo trailer', 'enclosed trailer'],
    keywords_negative: ['parts only', 'salvage', 'no title'],
    confidence_threshold: 60,
    hard_gates: [{ field: 'parts_only', operator: 'equals', value: true, action: 'reject' }],
    min_photos: 4,
    required_evidence: ['frame_integrity', 'axle_status', 'tires'],
    min_profit_dollars: 600,
    min_margin_percent: 40,
    max_acquisition: 6000,
    target_days_to_sell: 14,
    max_distance_miles: 100,
    prompt_file: 'prompts.ts',
    market_comps_file: 'analysis.ts',
    verdict_thresholds: {
      buy: { min_profit: 600, min_margin: 0.4 },
      watch: { min_profit: 400, min_margin: 0.25 },
      pass: { max_profit: 400 },
    },
    display_order: 10,
    icon: 'truck',
  },

  fleet_trucks: {
    id: 'fleet_trucks',
    name: 'Fleet Trucks / Vehicles',
    enabled: true,
    keywords_positive: ['f-150', 'f-250', 'silverado', 'ram', 'tahoe'],
    keywords_negative: ['salvage', 'parts only', 'no title'],
    confidence_threshold: 70,
    hard_gates: [
      { field: 'title_status', operator: 'in', value: ['salvage', 'parts_only'], action: 'flag' },
      { field: 'mileage', operator: 'gt', value: 200000, action: 'flag' },
    ],
    min_photos: 6,
    required_evidence: ['year', 'make', 'model', 'mileage', 'title_status'],
    min_profit_dollars: 1500,
    min_margin_percent: 20,
    max_acquisition: 15000,
    target_days_to_sell: 21,
    max_distance_miles: 150,
    prompt_file: 'prompts-vehicles.ts',
    market_comps_file: 'analysis-vehicles.ts',
    verdict_thresholds: {
      buy: { min_profit: 1500, min_margin: 0.2 },
      watch: { min_profit: 1000, min_margin: 0.15 },
      pass: { max_profit: 1000 },
    },
    display_order: 20,
    icon: 'car',
  },

  power_tools: {
    id: 'power_tools',
    name: 'Power Tools',
    enabled: true,
    keywords_positive: ['drill', 'impact driver', 'saw', 'dewalt', 'milwaukee', 'makita'],
    keywords_negative: ['parts only', 'broken', 'not working'],
    confidence_threshold: 50,
    hard_gates: [{ field: 'parts_only', operator: 'equals', value: true, action: 'reject' }],
    min_photos: 2,
    required_evidence: ['tool_type', 'make', 'power_source'],
    min_profit_dollars: 40,
    min_margin_percent: 30,
    max_acquisition: 500,
    target_days_to_sell: 7,
    max_distance_miles: 50,
    prompt_file: 'prompts-power-tools.ts',
    market_comps_file: 'analysis-power-tools.ts',
    verdict_thresholds: {
      buy: { min_profit: 40, min_margin: 0.3 },
      watch: { min_profit: 25, min_margin: 0.2 },
      pass: { max_profit: 25 },
    },
    display_order: 30,
    icon: 'wrench',
  },
}

// =============================================================================
// CATEGORY DETECTION
// =============================================================================

/**
 * Detect category type from category ID or title
 */
export type CategoryType = 'power_tools' | 'vehicle' | 'trailer'

export function detectCategoryType(categoryId: string | undefined, title: string): CategoryType {
  const categoryLower = (categoryId || '').toLowerCase()
  const titleLower = title.toLowerCase()

  // Power tools detection
  if (categoryLower === 'power_tools') {
    return 'power_tools'
  }

  // Vehicle detection (explicit category or title pattern)
  const vehicleCategories = [
    'vehicle',
    'vehicles',
    'suv',
    'car',
    'truck',
    'cars_trucks',
    'auto',
    'automotive',
    'fleet_trucks',
  ]
  const isVehicleByCategory = vehicleCategories.some(
    (v) => categoryLower === v || categoryLower.includes(v)
  )

  if (isVehicleByCategory) {
    return 'vehicle'
  }

  // Title-based vehicle detection (for generic categories like buy_box)
  const vehicleMakes = [
    'ford',
    'chevrolet',
    'chevy',
    'toyota',
    'honda',
    'nissan',
    'dodge',
    'ram',
    'gmc',
    'jeep',
    'bmw',
    'mercedes',
    'audi',
    'lexus',
    'acura',
    'hyundai',
    'kia',
  ]
  const vehicleTypes = [
    'sedan',
    'coupe',
    'suv',
    'crossover',
    'hatchback',
    'wagon',
    'convertible',
    'minivan',
    'pickup',
  ]

  const titleHasVehicleMake = vehicleMakes.some((make) => titleLower.includes(make))
  const titleHasVehicleType = vehicleTypes.some((type) => titleLower.includes(type))
  const titleHasYearPattern = /\b(20\d{2}|19\d{2})\s+\w+\s+\w+\b/.test(titleLower)

  if (
    (categoryLower === 'buy_box' || !categoryId) &&
    (titleHasVehicleMake || titleHasVehicleType || titleHasYearPattern)
  ) {
    return 'vehicle'
  }

  // Default to trailer
  return 'trailer'
}

/**
 * Get category config, using defaults if not provided
 */
export function getCategoryConfig(categoryId: string | undefined): CategoryConfig {
  const id = categoryId?.toLowerCase() || 'buy_box'

  // Check for exact match
  if (DEFAULT_CATEGORIES[id]) {
    return DEFAULT_CATEGORIES[id]
  }

  // Check for vehicle category
  if (
    id.includes('vehicle') ||
    id.includes('truck') ||
    id.includes('car') ||
    id === 'fleet_trucks'
  ) {
    return DEFAULT_CATEGORIES.fleet_trucks
  }

  // Check for power tools
  if (id.includes('power') || id.includes('tool')) {
    return DEFAULT_CATEGORIES.power_tools
  }

  // Default to buy_box (trailers)
  return DEFAULT_CATEGORIES.buy_box
}

/**
 * Apply verdict thresholds to determine recommendation
 */
export function applyVerdictThresholds(
  config: CategoryConfig,
  profit: number,
  margin: number
): 'BUY' | 'WATCH' | 'PASS' {
  const thresholds = config.verdict_thresholds

  // Check BUY thresholds
  if (profit >= thresholds.buy.min_profit || margin >= thresholds.buy.min_margin) {
    return 'BUY'
  }

  // Check WATCH thresholds
  if (profit >= thresholds.watch.min_profit || margin >= thresholds.watch.min_margin) {
    return 'WATCH'
  }

  // Default to PASS
  return 'PASS'
}

/**
 * Check if a listing passes all hard gates
 */
export function evaluateHardGates(
  config: CategoryConfig,
  listing: Record<string, unknown>
): { passed: boolean; failures: Array<{ gate: HardGate; reason: string }> } {
  const failures: Array<{ gate: HardGate; reason: string }> = []

  for (const gate of config.hard_gates) {
    const value = listing[gate.field]
    let triggered = false

    switch (gate.operator) {
      case 'equals':
        triggered = value === gate.value
        break
      case 'in':
        triggered = Array.isArray(gate.value) && gate.value.includes(value)
        break
      case 'gt':
        triggered =
          typeof value === 'number' && typeof gate.value === 'number' && value > gate.value
        break
      case 'lt':
        triggered =
          typeof value === 'number' && typeof gate.value === 'number' && value < gate.value
        break
      case 'gte':
        triggered =
          typeof value === 'number' && typeof gate.value === 'number' && value >= gate.value
        break
      case 'lte':
        triggered =
          typeof value === 'number' && typeof gate.value === 'number' && value <= gate.value
        break
      case 'contains':
        triggered =
          typeof value === 'string' &&
          typeof gate.value === 'string' &&
          value.toLowerCase().includes(gate.value.toLowerCase())
        break
    }

    if (triggered && gate.action === 'reject') {
      failures.push({
        gate,
        reason: `${gate.field} ${gate.operator} ${JSON.stringify(gate.value)}`,
      })
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  }
}

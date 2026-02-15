/**
 * Category-Aware Templates for DFG Analyst
 *
 * NO HARD-CODED TRAILER LANGUAGE except when asset_type === 'trailer'.
 * Use neutral nouns by default: asset, item, unit, listing.
 */

export type AssetType = 'vehicle' | 'trailer' | 'power_tool' | 'unknown'

/**
 * Detect asset type from category and title
 */
export function detectAssetType(
  categoryId: string | null | undefined,
  title: string | null | undefined
): AssetType {
  const cat = (categoryId || '').toLowerCase()
  const titleLower = (title || '').toLowerCase()

  // Explicit vehicle categories
  if (
    cat === 'fleet_trucks' ||
    cat === 'vehicles' ||
    cat === 'vehicle' ||
    cat === 'cars_trucks' ||
    cat === 'auto' ||
    cat === 'automotive' ||
    cat.includes('vehicle') ||
    cat.includes('car') ||
    cat.includes('truck') ||
    cat.includes('suv')
  ) {
    return 'vehicle'
  }

  // Explicit power tool categories
  if (cat === 'power_tools' || cat.includes('tool')) {
    return 'power_tool'
  }

  // Explicit trailer categories
  if (cat.includes('trailer')) {
    return 'trailer'
  }

  // Title-based detection for generic categories like 'buy_box'
  const vehicleMakes = [
    'toyota',
    'honda',
    'ford',
    'chevrolet',
    'chevy',
    'dodge',
    'ram',
    'jeep',
    'nissan',
    'hyundai',
    'kia',
    'subaru',
    'mazda',
    'volkswagen',
    'vw',
    'bmw',
    'mercedes',
    'audi',
    'lexus',
    'acura',
    'infiniti',
    'cadillac',
    'buick',
    'gmc',
    'chrysler',
    'lincoln',
    'volvo',
    'porsche',
    'jaguar',
    'land rover',
    'range rover',
    'rover',
    'mini',
    'fiat',
    'alfa romeo',
    'tesla',
    'rivian',
    'lucid',
    'genesis',
    'maserati',
    'bentley',
    'rolls royce',
    'crown victoria',
    'tahoe',
    'suburban',
    'expedition',
    'yukon',
    'silverado',
    'sierra',
    'f-150',
    'f-250',
    'f-350',
    'mustang',
    'camaro',
    'corvette',
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
    'crew cab',
    'extended cab',
  ]

  const trailerKeywords = [
    'trailer',
    'flatbed',
    'enclosed',
    'utility trailer',
    'cargo trailer',
    'dump trailer',
    'car hauler',
    'equipment trailer',
    'tilt deck',
  ]

  const powerToolKeywords = [
    'drill',
    'saw',
    'grinder',
    'sander',
    'router',
    'planer',
    'jointer',
    'lathe',
    'welder',
    'compressor',
    'generator',
    'milwaukee',
    'dewalt',
    'makita',
    'bosch',
    'ryobi',
  ]

  // Check title for asset type indicators
  if (
    vehicleMakes.some((make) => titleLower.includes(make)) ||
    vehicleTypes.some((type) => titleLower.includes(type)) ||
    /\b(19|20)\d{2}\s+\w+\s+\w+\b/.test(titleLower)
  ) {
    return 'vehicle'
  }

  if (trailerKeywords.some((kw) => titleLower.includes(kw))) {
    return 'trailer'
  }

  if (powerToolKeywords.some((kw) => titleLower.includes(kw))) {
    return 'power_tool'
  }

  // Default to unknown - will use generic copy
  return 'unknown'
}

/**
 * Get the neutral noun for this asset type
 */
export function getAssetNoun(type: AssetType): string {
  switch (type) {
    case 'vehicle':
      return 'vehicle'
    case 'trailer':
      return 'trailer'
    case 'power_tool':
      return 'tool'
    case 'unknown':
      return 'item'
  }
}

/**
 * Build key specs string based on asset type
 */
export function buildKeySpecs(condition: any, assetType: AssetType): string {
  const specs: string[] = []

  switch (assetType) {
    case 'vehicle':
      if (condition.year) specs.push(String(condition.year))
      if (condition.make) specs.push(condition.make)
      if (condition.model) specs.push(condition.model)
      if (condition.trim) specs.push(condition.trim)
      if (condition.mileage) specs.push(`${Math.round(condition.mileage / 1000)}k mi`)
      if (condition.engine) specs.push(condition.engine)
      break

    case 'trailer':
      if (condition.dimensions?.width_ft && condition.dimensions?.length_ft) {
        specs.push(`${condition.dimensions.width_ft}x${condition.dimensions.length_ft}`)
      }
      if (condition.trailer_type) specs.push(condition.trailer_type)
      if (condition.axle_status) {
        specs.push(condition.axle_status === 'tandem' ? 'tandem axle' : 'single axle')
      }
      if (condition.gvwr) specs.push(`${condition.gvwr} GVWR`)
      break

    case 'power_tool':
      if (condition.make) specs.push(condition.make)
      if (condition.model) specs.push(condition.model)
      if (condition.tool_type) specs.push(condition.tool_type)
      if (condition.battery_system?.voltage) specs.push(`${condition.battery_system.voltage}V`)
      if (condition.power_source) specs.push(condition.power_source)
      break

    default:
      // Generic - use whatever we have
      if (condition.year) specs.push(String(condition.year))
      if (condition.make) specs.push(condition.make)
      if (condition.model) specs.push(condition.model)
      if (condition.dimensions?.length_ft) specs.push(`${condition.dimensions.length_ft}ft`)
      break
  }

  return specs.filter(Boolean).join(' | ') || 'Unknown'
}

/**
 * Build "If Bidding" steps based on asset type
 */
export function buildIfBiddingSteps(
  assetType: AssetType,
  maxBid: number,
  inspectionPriorities: string[]
): string[] {
  const noun = getAssetNoun(assetType)
  const steps: string[] = [
    `Set max bid at $${maxBid} - walk away above this`,
    `Schedule inspection before auction ends if possible`,
  ]

  // Asset-specific inspection notes
  switch (assetType) {
    case 'vehicle':
      steps.push('Request VIN and run Carfax/AutoCheck')
      steps.push('Ask about service records and maintenance history')
      break
    case 'trailer':
      steps.push('Verify VIN plate is present and legible')
      steps.push('Ask about brake controller compatibility')
      break
    case 'power_tool':
      steps.push('Request serial number for warranty verification')
      steps.push('Ask if batteries/charger are included')
      break
  }

  // Add top inspection priorities
  inspectionPriorities.slice(0, 2).forEach((p) => steps.push(p))

  // Universal auction tactics
  steps.push('AUCTION SNIPE: Do not bid until T-minus 2 minutes (avoid price-warming)')
  steps.push(
    'KILL ZONE: Enter your absolute max once. No incremental bidding. Walk away if outbid.'
  )

  return steps
}

/**
 * Build "If Won" steps based on asset type
 */
export function buildIfWonSteps(assetType: AssetType): string[] {
  const baseSteps = [
    'Arrange pickup within auction deadline (usually 5 business days)',
    'Have cash/certified check for total amount',
    'Get signed title and bill of sale before leaving',
  ]

  switch (assetType) {
    case 'vehicle':
      return [
        ...baseSteps,
        'Bring: valid license, proof of insurance, spare key if available',
        'Verify odometer reading matches documentation',
        'Check for all keys, remotes, and owner manual',
        'Do walkaround: start engine, check lights, test AC, look underneath',
      ]

    case 'trailer':
      return [
        ...baseSteps,
        'Bring: truck with proper tow rating, correct hitch ball size, safety chains',
        'Bring: ratchet straps, basic tools, tire pressure gauge',
        'Verify coupler size matches your setup (2" or 2-5/16")',
        'Check tire pressure and all lights before leaving lot',
      ]

    case 'power_tool':
      return [
        ...baseSteps.slice(0, 2), // No title for tools
        'Verify all advertised accessories are present',
        'Function test before leaving if possible',
        'Check serial number matches any documentation',
        'Bring: vehicle with adequate cargo space, moving blankets',
      ]

    default:
      return [
        ...baseSteps,
        'Bring: appropriate vehicle for transport',
        'Verify item matches listing photos/description',
        'Document condition with photos before leaving',
      ]
  }
}

/**
 * Build "Listing Prep" steps based on asset type
 */
export function buildListingPrepSteps(
  assetType: AssetType,
  repairItems?: Array<{ marketing_note?: string }>
): string[] {
  const steps: string[] = []

  switch (assetType) {
    case 'vehicle':
      steps.push('Detail interior and exterior (or pay for professional detail)')
      steps.push('Complete any safety-related repairs')
      steps.push('Get fresh oil change and top off fluids')
      steps.push('Take 20+ photos: all angles, engine bay, interior, tires, odometer')
      steps.push('Include Carfax/AutoCheck in listing')
      steps.push('Note: year, make, model, mileage, VIN, clean title')
      break

    case 'trailer':
      steps.push('Pressure wash and clean out thoroughly')
      steps.push('Complete minimum repairs from plan')
      steps.push('Touch up paint on any rust spots')
      steps.push('Take 15+ photos: all angles, deck, tires, hitch, lights working')
      steps.push('Note: dimensions, GVWR, axle type, title status')
      break

    case 'power_tool':
      steps.push('Clean and remove dust/debris')
      steps.push('Function test and document operation')
      steps.push('Charge all batteries fully before photos')
      steps.push('Take 10+ photos: all angles, accessories, any wear')
      steps.push('Note: brand, model, voltage, included accessories')
      steps.push('Include original box/case if available')
      break

    default:
      steps.push('Clean thoroughly')
      steps.push('Complete any necessary repairs')
      steps.push('Take comprehensive photos from all angles')
      steps.push('Document all features and condition notes')
      break
  }

  // Add marketing highlights from repairs
  if (repairItems && repairItems.length > 0) {
    repairItems
      .filter((r) => r.marketing_note)
      .slice(0, 3)
      .forEach((r) => steps.push(`Highlight: "${r.marketing_note}"`))
  }

  return steps
}

/**
 * Build complete NextSteps object
 */
export function buildNextStepsForAsset(
  assetType: AssetType,
  maxBid: number,
  inspectionPriorities: string[],
  repairItems?: Array<{ marketing_note?: string }>
): {
  if_bidding: string[]
  if_won: string[]
  listing_prep: string[]
} {
  return {
    if_bidding: buildIfBiddingSteps(assetType, maxBid, inspectionPriorities),
    if_won: buildIfWonSteps(assetType),
    listing_prep: buildListingPrepSteps(assetType, repairItems),
  }
}

/**
 * Build asset summary with category-aware specs
 */
export function buildAssetSummaryForType(
  listing: any,
  condition: any,
  assetType: AssetType
): {
  title: string
  year_make_model: string
  key_specs: string
  asset_type: AssetType
  source: string
  listing_url: string
  current_bid: number
  auction_end?: string
} {
  const parts: string[] = []

  if (condition.year) parts.push(String(condition.year))
  if (condition.make) parts.push(condition.make)
  if (condition.model) parts.push(condition.model)

  return {
    title: listing.title || 'Unknown',
    year_make_model: parts.length > 0 ? parts.join(' ') : 'Unknown',
    key_specs: buildKeySpecs(condition, assetType),
    asset_type: assetType,
    source: listing.source,
    listing_url: listing.listing_url,
    current_bid: listing.current_bid,
    auction_end: listing.ends_at || undefined,
  }
}

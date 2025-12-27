import type {
  ScoutRun,
  Listing,
  AnalysisResult,
  StatsResponse,
  DashboardStatsResponse,
  OpportunityStats,
  ListingWithAnalysis,
  AuctionSource,
  CategoryId,
} from '@/lib/types';

// ============================================
// Mock Scout Runs
// ============================================

export const mockRuns: ScoutRun[] = [
  {
    run_id: 'run-2025-12-21-1730-sierra_auction',
    source: 'sierra_auction',
    started_at: '2025-12-21T17:30:00Z',
    completed_at: '2025-12-21T17:30:12Z',
    total_candidates: 45,
    total_fetched: 230,
    total_rejected: 185,
    synced_count: 10,
    pending_count: 35,
    status: 'completed',
    duration_ms: 12500,
  },
  {
    run_id: 'run-2025-12-21-1600-sierra_auction',
    source: 'sierra_auction',
    started_at: '2025-12-21T16:00:00Z',
    completed_at: '2025-12-21T16:00:18Z',
    total_candidates: 38,
    total_fetched: 215,
    total_rejected: 177,
    synced_count: 38,
    pending_count: 0,
    status: 'completed',
    duration_ms: 18200,
  },
  {
    run_id: 'run-2025-12-21-1200-sierra_auction',
    source: 'sierra_auction',
    started_at: '2025-12-21T12:00:00Z',
    completed_at: '2025-12-21T12:00:25Z',
    total_candidates: 62,
    total_fetched: 340,
    total_rejected: 278,
    synced_count: 20,
    pending_count: 42,
    status: 'completed',
    duration_ms: 25400,
  },
  {
    run_id: 'run-2025-12-20-2200-sierra_auction',
    source: 'sierra_auction',
    started_at: '2025-12-20T22:00:00Z',
    completed_at: '2025-12-20T22:00:15Z',
    total_candidates: 52,
    total_fetched: 198,
    total_rejected: 146,
    synced_count: 52,
    pending_count: 0,
    status: 'completed',
    duration_ms: 15300,
  },
  {
    run_id: 'run-2025-12-20-1800-sierra_auction',
    source: 'sierra_auction',
    started_at: '2025-12-20T18:00:00Z',
    completed_at: '2025-12-20T18:00:22Z',
    total_candidates: 41,
    total_fetched: 285,
    total_rejected: 244,
    synced_count: 41,
    pending_count: 0,
    status: 'completed',
    duration_ms: 22100,
  },
];

// ============================================
// Mock Listings
// ============================================

export const mockListings: Listing[] = [
  {
    id: 'sierra_auction:6817',
    source: 'sierra_auction',
    source_id: '6817',
    url: 'https://sierraauction.com/lot/6817',
    title: 'DeWalt 20V XR Hammer Drill Kit with Batteries',
    description: 'DeWalt DCD996 20V MAX XR Brushless 3-Speed Hammer Drill/Driver Kit. Includes 2 batteries and charger. Minor cosmetic wear, tested working.',
    current_bid: 110,
    category_id: 'power_tools',
    buy_box_score: 87,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    auction_end_at: '2025-12-25T20:00:00Z',
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 0 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6823',
    source: 'sierra_auction',
    source_id: '6823',
    url: 'https://sierraauction.com/lot/6823',
    title: 'Miller Millermatic 211 MIG Welder',
    description: 'Miller Millermatic 211 Auto-Set MIG Welder with MVP. 110/220V capable. Running condition, some cable wear.',
    current_bid: 850,
    category_id: 'welders',
    buy_box_score: 92,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
    auction_end_at: '2025-12-24T18:00:00Z',
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 0 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6831',
    source: 'sierra_auction',
    source_id: '6831',
    url: 'https://sierraauction.com/lot/6831',
    title: '16ft Utility Trailer - Tandem Axle',
    description: '16x6.5 tandem axle utility trailer. 7000lb GVWR. Some surface rust, tires at 60%. Lights work.',
    current_bid: 1450,
    category_id: 'TRAILER_UTILITY',
    buy_box_score: 78,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1628288280961-ca1808e86b0a?w=400',
    auction_end_at: '2025-12-26T19:00:00Z',
    location: { city: 'Tucson', state: 'AZ', distance_miles: 112 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6845',
    source: 'sierra_auction',
    source_id: '6845',
    url: 'https://sierraauction.com/lot/6845',
    title: 'Ingersoll Rand 60-Gallon Air Compressor',
    description: 'Ingersoll Rand SS3L3 3HP 60-Gallon Air Compressor. 135 PSI max. Runs well, needs new pressure switch.',
    current_bid: 320,
    category_id: 'air_compressors',
    buy_box_score: 81,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
    auction_end_at: '2025-12-23T21:00:00Z',
    location: { city: 'Mesa', state: 'AZ', distance_miles: 18 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6852',
    source: 'sierra_auction',
    source_id: '6852',
    url: 'https://sierraauction.com/lot/6852',
    title: 'Honda EU2200i Inverter Generator',
    description: 'Honda EU2200i Super Quiet Inverter Generator. 2200W. Low hours, clean unit. Starts and runs.',
    current_bid: 475,
    category_id: 'generators',
    buy_box_score: 88,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1611270418597-a6c77f4b7271?w=400',
    auction_end_at: '2025-12-24T20:00:00Z',
    location: { city: 'Scottsdale', state: 'AZ', distance_miles: 12 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:35:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6855',
    source: 'sierra_auction',
    source_id: '6855',
    url: 'https://sierraauction.com/lot/6855',
    title: 'Lincoln Electric Power MIG 210 MP',
    description: 'Lincoln Power MIG 210 MP multi-process welder. Very little use, like new condition. Comes with all accessories.',
    current_bid: 650,
    category_id: 'welders',
    buy_box_score: 95,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
    auction_end_at: '2025-12-26T18:00:00Z',
    location: { city: 'Gilbert', state: 'AZ', distance_miles: 22 },
    created_at: '2025-12-21T14:00:00Z',
    updated_at: '2025-12-21T14:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
  {
    id: 'sierra_auction:6861',
    source: 'sierra_auction',
    source_id: '6861',
    url: 'https://sierraauction.com/lot/6861',
    title: 'Milwaukee M18 FUEL 7-Tool Combo Kit',
    description: 'Milwaukee 2997-27 M18 FUEL 7-Tool Combo Kit. Complete with 2 batteries, charger, and contractor bag. Light use.',
    current_bid: 380,
    category_id: 'power_tools',
    buy_box_score: 84,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    auction_end_at: '2025-12-25T18:00:00Z',
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 0 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6867',
    source: 'sierra_auction',
    source_id: '6867',
    url: 'https://sierraauction.com/lot/6867',
    title: 'Bobcat MT55 Mini Track Loader',
    description: '2018 Bobcat MT55 Mini Track Loader. 1,200 hours. New tracks, hydraulics serviced. Work ready.',
    current_bid: 8500,
    category_id: 'buy_box',
    buy_box_score: 76,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400',
    auction_end_at: '2025-12-27T19:00:00Z',
    location: { city: 'Tempe', state: 'AZ', distance_miles: 8 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
  {
    id: 'sierra_auction:6869',
    source: 'sierra_auction',
    source_id: '6869',
    url: 'https://sierraauction.com/lot/6869',
    title: 'Craftsman 26" Tool Chest Combo',
    description: 'Craftsman 26" 16-drawer tool chest and cabinet combo. Ball bearing slides. Great condition.',
    current_bid: 225,
    category_id: 'tool_storage',
    buy_box_score: 71,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
    auction_end_at: '2025-12-25T16:00:00Z',
    location: { city: 'Chandler', state: 'AZ', distance_miles: 25 },
    created_at: '2025-12-21T14:00:00Z',
    updated_at: '2025-12-21T14:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
  {
    id: 'sierra_auction:6873',
    source: 'sierra_auction',
    source_id: '6873',
    url: 'https://sierraauction.com/lot/6873',
    title: 'Snap-on KRSC46 Roll Cart',
    description: 'Snap-on KRSC46 6-drawer roll cart. Candy Apple Red. Some scratches, drawers slide smooth.',
    current_bid: 890,
    category_id: 'buy_box',
    buy_box_score: 89,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
    auction_end_at: '2025-12-24T17:00:00Z',
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 0 },
    created_at: '2025-12-21T17:30:00Z',
    updated_at: '2025-12-21T17:30:00Z',
    run_id: 'run-2025-12-21-1730-sierra_auction',
  },
];

// ============================================
// Additional Mock Listings for Dashboard Demo
// ============================================

// Listings with 'analyzed' status and various verdicts
export const mockAnalyzedListings: Listing[] = [
  {
    id: 'sierra_auction:6880',
    source: 'sierra_auction',
    source_id: '6880',
    url: 'https://sierraauction.com/lot/6880',
    title: '2014 Hyundai Veloster Turbo',
    description: '2014 Hyundai Veloster Turbo. 89k miles. Runs and drives. Some cosmetic damage to rear bumper.',
    current_bid: 2100,
    category_id: 'buy_box',
    buy_box_score: 91,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400',
    auction_end_at: '2025-12-23T20:00:00Z',
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 5 },
    created_at: '2025-12-21T10:00:00Z',
    updated_at: '2025-12-21T12:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
  {
    id: 'sierra_auction:6885',
    source: 'sierra_auction',
    source_id: '6885',
    url: 'https://sierraauction.com/lot/6885',
    title: '16ft Utility Trailer - Heavy Duty',
    description: '16x7 heavy duty utility trailer. 10,000lb GVWR. Ramps included. Good condition.',
    current_bid: 950,
    category_id: 'TRAILER_UTILITY',
    buy_box_score: 88,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1628288280961-ca1808e86b0a?w=400',
    auction_end_at: '2025-12-26T18:00:00Z',
    location: { city: 'Mesa', state: 'AZ', distance_miles: 15 },
    created_at: '2025-12-21T10:00:00Z',
    updated_at: '2025-12-21T14:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
  {
    id: 'sierra_auction:6890',
    source: 'sierra_auction',
    source_id: '6890',
    url: 'https://sierraauction.com/lot/6890',
    title: 'Ingersoll Rand 80-Gallon Air Compressor',
    description: 'Ingersoll Rand 5HP 80-Gallon Vertical Air Compressor. 175 PSI. Runs but may need new motor.',
    current_bid: 420,
    category_id: 'air_compressors',
    buy_box_score: 72,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
    auction_end_at: '2025-12-24T21:00:00Z',
    location: { city: 'Tempe', state: 'AZ', distance_miles: 8 },
    created_at: '2025-12-21T10:00:00Z',
    updated_at: '2025-12-21T15:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
  {
    id: 'sierra_auction:6895',
    source: 'sierra_auction',
    source_id: '6895',
    url: 'https://sierraauction.com/lot/6895',
    title: 'Champion 7500W Generator',
    description: 'Champion 7500W Dual Fuel Generator. Electric start. Low hours. Clean unit.',
    current_bid: 380,
    category_id: 'generators',
    buy_box_score: 85,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1611270418597-a6c77f4b7271?w=400',
    auction_end_at: '2025-12-25T19:00:00Z',
    location: { city: 'Gilbert', state: 'AZ', distance_miles: 20 },
    created_at: '2025-12-21T10:00:00Z',
    updated_at: '2025-12-21T16:00:00Z',
    run_id: 'run-2025-12-21-1200-sierra_auction',
  },
];

// Listings ending very soon (within 24 hours)
export const mockEndingSoonListings: Listing[] = [
  {
    id: 'sierra_auction:6898',
    source: 'sierra_auction',
    source_id: '6898',
    url: 'https://sierraauction.com/lot/6898',
    title: 'Milwaukee M18 Impact Driver',
    description: 'Milwaukee M18 FUEL Impact Driver. Bare tool, works great.',
    current_bid: 65,
    category_id: 'power_tools',
    buy_box_score: 79,
    status: 'candidate',
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    auction_end_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
    location: { city: 'Phoenix', state: 'AZ', distance_miles: 0 },
    created_at: '2025-12-21T08:00:00Z',
    updated_at: '2025-12-21T08:00:00Z',
    run_id: 'run-2025-12-21-0800-sierra_auction',
  },
  {
    id: 'sierra_auction:6899',
    source: 'sierra_auction',
    source_id: '6899',
    url: 'https://sierraauction.com/lot/6899',
    title: 'DeWalt Table Saw DWE7491RS',
    description: 'DeWalt 10" Table Saw with Rolling Stand. Works perfectly.',
    current_bid: 280,
    category_id: 'power_tools',
    buy_box_score: 86,
    status: 'analyzed',
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    auction_end_at: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(), // 14 hours from now
    location: { city: 'Scottsdale', state: 'AZ', distance_miles: 12 },
    created_at: '2025-12-21T06:00:00Z',
    updated_at: '2025-12-21T10:00:00Z',
    run_id: 'run-2025-12-21-0600-sierra_auction',
  },
];

// ============================================
// Mock Analyses for Dashboard
// ============================================

export const mockAnalyses: Record<string, AnalysisResult> = {
  'sierra_auction:6880': {
    id: 'analysis-sierra_auction-6880',
    listing_id: 'sierra_auction:6880',
    analysis_timestamp: '2025-12-21T12:00:00Z',
    asset_summary: {
      title: '2014 Hyundai Veloster Turbo',
      year_make_model: '2014 Hyundai Veloster Turbo',
      source: 'sierra_auction',
      current_bid: 2100,
      lot_id: '6880',
    },
    report_fields: {
      verdict: 'BUY',
      max_bid_mid: 4200,
      max_bid_worst: 3500,
      max_bid_best: 4800,
      retail_est: 7500,
      expected_profit: 1800,
      expected_margin: 0.35,
      confidence: 4,
    },
    report_markdown: '## BUY: 2014 Hyundai Veloster Turbo\n\nStrong flip opportunity with good margin potential.',
  },
  'sierra_auction:6885': {
    id: 'analysis-sierra_auction-6885',
    listing_id: 'sierra_auction:6885',
    analysis_timestamp: '2025-12-21T14:00:00Z',
    asset_summary: {
      title: '16ft Utility Trailer - Heavy Duty',
      source: 'sierra_auction',
      current_bid: 950,
      lot_id: '6885',
    },
    report_fields: {
      verdict: 'BUY',
      max_bid_mid: 1800,
      max_bid_worst: 1500,
      max_bid_best: 2000,
      retail_est: 3200,
      expected_profit: 950,
      expected_margin: 0.42,
      confidence: 4,
    },
    report_markdown: '## BUY: 16ft Utility Trailer\n\nExcellent margin on heavy duty trailer.',
  },
  'sierra_auction:6890': {
    id: 'analysis-sierra_auction-6890',
    listing_id: 'sierra_auction:6890',
    analysis_timestamp: '2025-12-21T15:00:00Z',
    asset_summary: {
      title: 'Ingersoll Rand 80-Gallon Air Compressor',
      source: 'sierra_auction',
      current_bid: 420,
      lot_id: '6890',
    },
    report_fields: {
      verdict: 'WATCH',
      max_bid_mid: 600,
      max_bid_worst: 450,
      max_bid_best: 700,
      retail_est: 900,
      expected_profit: 120,
      expected_margin: 0.15,
      confidence: 2,
    },
    report_markdown: '## WATCH: Air Compressor\n\nPotential motor issues reduce confidence. Margin is thin.',
  },
  'sierra_auction:6895': {
    id: 'analysis-sierra_auction-6895',
    listing_id: 'sierra_auction:6895',
    analysis_timestamp: '2025-12-21T16:00:00Z',
    asset_summary: {
      title: 'Champion 7500W Generator',
      source: 'sierra_auction',
      current_bid: 380,
      lot_id: '6895',
    },
    report_fields: {
      verdict: 'WATCH',
      max_bid_mid: 550,
      max_bid_worst: 450,
      max_bid_best: 650,
      retail_est: 800,
      expected_profit: 100,
      expected_margin: 0.14,
      confidence: 3,
    },
    report_markdown: '## WATCH: Champion Generator\n\nDecent unit but margin is borderline.',
  },
  'sierra_auction:6899': {
    id: 'analysis-sierra_auction-6899',
    listing_id: 'sierra_auction:6899',
    analysis_timestamp: '2025-12-21T10:00:00Z',
    asset_summary: {
      title: 'DeWalt Table Saw DWE7491RS',
      source: 'sierra_auction',
      current_bid: 280,
      lot_id: '6899',
    },
    report_fields: {
      verdict: 'BUY',
      max_bid_mid: 400,
      max_bid_worst: 350,
      max_bid_best: 450,
      retail_est: 600,
      expected_profit: 140,
      expected_margin: 0.28,
      confidence: 4,
    },
    report_markdown: '## BUY: DeWalt Table Saw\n\nGreat flip opportunity. These sell quickly.',
  },
};

// ============================================
// Mock Analysis Result (Original - keeping for backward compatibility)
// ============================================

export const mockAnalysis: AnalysisResult = {
  id: 'analysis-sierra_auction-6817',
  listing_id: 'sierra_auction:6817',
  analysis_timestamp: '2025-12-21T17:35:14.605Z',
  asset_summary: {
    title: 'DeWalt 20V XR Hammer Drill Kit with Batteries',
    year_make_model: 'DeWalt DCD996',
    source: 'sierra_auction',
    current_bid: 110,
    lot_id: '6817',
  },
  report_fields: {
    verdict: 'BUY',
    max_bid_mid: 150,
    max_bid_worst: 128,
    max_bid_best: 165,
    retail_est: 250,
    expected_profit: 45,
    expected_margin: 0.23,
    confidence: 4,
  },
  report_markdown: `## BUY: DeWalt 20V XR Hammer Drill Kit

### Summary
This DeWalt DCD996 20V MAX XR Brushless 3-Speed Hammer Drill/Driver Kit represents a solid buying opportunity at the current bid of $110. The kit includes essential accessories (2 batteries and charger), and the description indicates functional condition with only minor cosmetic wear.

### Key Numbers
| Metric | Value |
|--------|-------|
| Current Bid | $110 |
| Max Bid (Conservative) | $128 |
| Max Bid (Target) | $150 |
| Max Bid (Aggressive) | $165 |
| Retail Value | $250 |
| Expected Profit | $45 |
| Expected Margin | 23% |

### Condition Assessment
- **Overall Grade**: B+
- **Functional Status**: Tested working per seller
- **Cosmetic**: Minor wear (typical for used power tools)
- **Completeness**: Full kit (2 batteries, charger)

### Investment Thesis
This drill kit sells consistently on secondary markets. The XR brushless line commands premium prices due to professional-grade build quality. Two batteries significantly increase resale value vs. single-battery units.

### Risks & Considerations
1. Battery health unknown - may need replacement ($60-80/each)
2. No case mentioned - may need to source one for retail sale
3. Auction fees will reduce margin (estimate 15% buyer premium + 8.6% tax)

### Recommendation
**Proceed to max bid of $150**. At this price point, even with one battery needing replacement, you maintain acceptable margins for flip.`,
  condition: {
    overall_grade: 'B+',
    known_issues: ['Minor cosmetic wear', 'Battery health unknown'],
    inspection_priorities: ['Test battery charge capacity', 'Check chuck runout', 'Verify all speeds work'],
    red_flags: [],
  },
  investor_lens: {
    repair_plan: 'Clean and detail. Test batteries under load. Replace any weak cells.',
    repair_cost_estimate: 25,
    market_comps: [
      'eBay sold: $229-279 (complete kits)',
      'FB Marketplace: $200-240 local',
      'Amazon Renewed: $249',
    ],
    deal_killers: ['Both batteries dead', 'Motor issues', 'Chuck damage'],
    exit_strategy: 'List on FB Marketplace at $239, negotiate to $200-220',
  },
  buyer_lens: {
    perceived_value: 'Professional-grade tool at used price point. Contractor favorite.',
    objections: ['Warranty concerns', 'Battery life uncertainty', 'No original case'],
    listing_strategy: 'Emphasize brushless motor longevity, include battery test results, offer 7-day return',
    target_buyer: 'Weekend warrior upgrading from Harbor Freight, small contractor',
  },
};

// ============================================
// Mock Stats
// ============================================

export const mockStats: StatsResponse = {
  recent_runs: mockRuns,
  total_candidates: 238,
  sources: ['sierra_auction'] as AuctionSource[],
  total_analyzed: 45,
  total_purchased: 12,
};

// ============================================
// Mock Dashboard Stats (Opportunity-Centric)
// ============================================

// Combine all mock listings
const allMockListings = [...mockListings, ...mockAnalyzedListings, ...mockEndingSoonListings];

// Helper to merge listings with analysis
function mergeWithAnalysisMock(listings: Listing[]): ListingWithAnalysis[] {
  return listings.map((listing) => ({
    ...listing,
    analysis: mockAnalyses[listing.id],
  }));
}

// Helper to check if ending within hours
function isEndingWithinHours(endDate: string | null, hours: number): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return diffMs > 0 && diffMs < hours * 60 * 60 * 1000;
}

// Compute opportunity stats for mock data
function computeMockOpportunityStats(): OpportunityStats {
  // Filter by status
  const candidates = allMockListings.filter((l) => l.status === 'candidate');
  const analyzed = allMockListings.filter((l) => l.status === 'analyzed');

  // Get analyzed with their verdicts
  const analyzedWithAnalysis = mergeWithAnalysisMock(analyzed);

  // BUY verdicts with high confidence
  const actionable = analyzedWithAnalysis.filter(
    (l) => l.analysis?.report_fields.verdict === 'BUY' &&
           (l.analysis?.report_fields.confidence || 0) >= 3
  );

  // WATCH verdicts (formerly MARGINAL)
  const marginals = analyzedWithAnalysis.filter(
    (l) => l.analysis?.report_fields.verdict === 'WATCH'
  );

  // Items ending within 24 hours
  const endingSoon = allMockListings.filter(
    (l) => l.status !== 'rejected' &&
           l.status !== 'passed' &&
           isEndingWithinHours(l.auction_end_at, 24)
  );
  const endingSoonWithAnalysis = mergeWithAnalysisMock(endingSoon);

  // Top candidates by score
  const topCandidates = [...candidates]
    .sort((a, b) => b.buy_box_score - a.buy_box_score)
    .slice(0, 5);

  // Sort actionable by margin
  const sortedActionable = [...actionable].sort((a, b) => {
    const marginA = a.analysis?.report_fields.expected_margin || 0;
    const marginB = b.analysis?.report_fields.expected_margin || 0;
    return marginB - marginA;
  });

  // Sort ending soon by end time
  const sortedEndingSoon = [...endingSoonWithAnalysis].sort((a, b) => {
    if (!a.auction_end_at) return 1;
    if (!b.auction_end_at) return -1;
    return new Date(a.auction_end_at).getTime() - new Date(b.auction_end_at).getTime();
  });

  return {
    needs_analysis: candidates.length,
    ready_to_act: actionable.length,
    under_review: marginals.length,
    ending_soon: endingSoon.length,
    top_candidates: topCandidates,
    actionable: sortedActionable.slice(0, 10),
    marginals: marginals.slice(0, 10),
    ending_soon_items: sortedEndingSoon.slice(0, 10),
  };
}

export const mockDashboardStats: DashboardStatsResponse = {
  ...mockStats,
  opportunities: computeMockOpportunityStats(),
};

// ============================================
// Helper Functions
// ============================================

export function getListingsByRunId(runId: string): Listing[] {
  return mockListings.filter(l => l.run_id === runId);
}

export function getListingById(id: string): Listing | undefined {
  return mockListings.find(l => l.id === id);
}

export function getListingsBySource(source: AuctionSource): Listing[] {
  return mockListings.filter(l => l.source === source);
}

export function getListingsByCategory(categoryId: CategoryId): Listing[] {
  return mockListings.filter(l => l.category_id === categoryId);
}

export function getRunById(runId: string): ScoutRun | undefined {
  return mockRuns.find(r => r.run_id === runId);
}

// Simulate API delay
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

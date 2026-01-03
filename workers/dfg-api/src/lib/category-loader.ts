/**
 * Category Configuration Loader
 *
 * Loads category configuration from D1 for passing to Analyst worker.
 * This enables pluggable categories where new category = D1 row + prompt file.
 */

import type { Env } from '../core/env';

/**
 * Category configuration loaded from D1
 */
export interface CategoryConfigData {
  id: string;
  name: string;
  min_profit_dollars: number;
  min_margin_percent: number;
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

/**
 * Raw row from D1 category_defs table
 */
interface CategoryDefRow {
  id: string;
  name: string;
  min_profit_dollars: number | null;
  min_margin_percent: number | null;
  max_acquisition: number | null;
  target_days_to_sell: number | null;
  max_distance_miles: number | null;
  min_photos: number | null;
  required_evidence: string | null;
  verdict_thresholds: string | null;
  prompt_file: string | null;
  market_comps_file: string | null;
}

/**
 * Default category configurations (fallback if D1 unavailable)
 */
const DEFAULTS: Record<string, CategoryConfigData> = {
  buy_box: {
    id: 'buy_box',
    name: 'Primary Buy Box (Trailers)',
    min_profit_dollars: 600,
    min_margin_percent: 40,
    max_acquisition: 6000,
    target_days_to_sell: 14,
    max_distance_miles: 100,
    min_photos: 4,
    required_evidence: ['frame_integrity', 'axle_status', 'tires'],
    verdict_thresholds: {
      buy: { min_profit: 600, min_margin: 0.40 },
      watch: { min_profit: 400, min_margin: 0.25 },
      pass: { max_profit: 400 },
    },
    prompt_file: 'prompts.ts',
    market_comps_file: 'analysis.ts',
  },
  fleet_trucks: {
    id: 'fleet_trucks',
    name: 'Fleet Trucks / Vehicles',
    min_profit_dollars: 1500,
    min_margin_percent: 20,
    max_acquisition: 15000,
    target_days_to_sell: 21,
    max_distance_miles: 150,
    min_photos: 6,
    required_evidence: ['year', 'make', 'model', 'mileage', 'title_status'],
    verdict_thresholds: {
      buy: { min_profit: 1500, min_margin: 0.20 },
      watch: { min_profit: 1000, min_margin: 0.15 },
      pass: { max_profit: 1000 },
    },
    prompt_file: 'prompts-vehicles.ts',
    market_comps_file: 'analysis-vehicles.ts',
  },
  power_tools: {
    id: 'power_tools',
    name: 'Power Tools',
    min_profit_dollars: 40,
    min_margin_percent: 30,
    max_acquisition: 500,
    target_days_to_sell: 7,
    max_distance_miles: 50,
    min_photos: 2,
    required_evidence: ['tool_type', 'make', 'power_source'],
    verdict_thresholds: {
      buy: { min_profit: 40, min_margin: 0.30 },
      watch: { min_profit: 25, min_margin: 0.20 },
      pass: { max_profit: 25 },
    },
    prompt_file: 'prompts-power-tools.ts',
    market_comps_file: 'analysis-power-tools.ts',
  },
};

/**
 * Load category configuration from D1
 */
export async function loadCategoryConfig(
  env: Env,
  categoryId: string | undefined
): Promise<CategoryConfigData> {
  const id = categoryId?.toLowerCase() || 'buy_box';

  try {
    const row = await env.DB.prepare(`
      SELECT
        id, name,
        min_profit_dollars, min_margin_percent,
        max_acquisition, target_days_to_sell,
        max_distance_miles, min_photos,
        required_evidence, verdict_thresholds,
        prompt_file, market_comps_file
      FROM category_defs
      WHERE id = ? AND enabled = 1
    `).bind(id).first() as CategoryDefRow | null;

    if (row) {
      return {
        id: row.id,
        name: row.name,
        min_profit_dollars: row.min_profit_dollars ?? 600,
        min_margin_percent: row.min_margin_percent ?? 40,
        max_acquisition: row.max_acquisition ?? 6000,
        target_days_to_sell: row.target_days_to_sell ?? 14,
        max_distance_miles: row.max_distance_miles ?? 100,
        min_photos: row.min_photos ?? 4,
        required_evidence: parseJsonSafe(row.required_evidence) || [],
        verdict_thresholds: parseJsonSafe(row.verdict_thresholds) || DEFAULTS.buy_box.verdict_thresholds,
        prompt_file: row.prompt_file || 'prompts.ts',
        market_comps_file: row.market_comps_file || 'analysis.ts',
      };
    }
  } catch (error) {
    console.error(`[CategoryLoader] Error loading category ${id}:`, error);
  }

  // Fallback to defaults
  if (DEFAULTS[id]) {
    return DEFAULTS[id];
  }

  // Check for vehicle category
  if (id.includes('vehicle') || id.includes('truck') || id.includes('car') || id === 'fleet_trucks') {
    return DEFAULTS.fleet_trucks;
  }

  // Check for power tools
  if (id.includes('power') || id.includes('tool')) {
    return DEFAULTS.power_tools;
  }

  // Default to buy_box (trailers)
  return DEFAULTS.buy_box;
}

/**
 * Load all enabled category configurations
 */
export async function loadAllCategoryConfigs(env: Env): Promise<CategoryConfigData[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id, name,
        min_profit_dollars, min_margin_percent,
        max_acquisition, target_days_to_sell,
        max_distance_miles, min_photos,
        required_evidence, verdict_thresholds,
        prompt_file, market_comps_file
      FROM category_defs
      WHERE enabled = 1
      ORDER BY display_order
    `).all();

    return (result.results || []).map((row: unknown) => {
      const r = row as CategoryDefRow;
      return {
        id: r.id,
        name: r.name,
        min_profit_dollars: r.min_profit_dollars ?? 600,
        min_margin_percent: r.min_margin_percent ?? 40,
        max_acquisition: r.max_acquisition ?? 6000,
        target_days_to_sell: r.target_days_to_sell ?? 14,
        max_distance_miles: r.max_distance_miles ?? 100,
        min_photos: r.min_photos ?? 4,
        required_evidence: parseJsonSafe(r.required_evidence) || [],
        verdict_thresholds: parseJsonSafe(r.verdict_thresholds) || DEFAULTS.buy_box.verdict_thresholds,
        prompt_file: r.prompt_file || 'prompts.ts',
        market_comps_file: r.market_comps_file || 'analysis.ts',
      };
    });
  } catch (error) {
    console.error('[CategoryLoader] Error loading all categories:', error);
    return Object.values(DEFAULTS);
  }
}

/**
 * Safe JSON parse helper
 */
function parseJsonSafe<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

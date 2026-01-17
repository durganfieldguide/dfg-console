export interface Env {
  ENVIRONMENT: 'production' | 'preview' | 'development';
  SIERRA_API_URL: string;
  SIERRA_API_KEY: string;

  // Databases
  DFG_DB: D1Database;
  DFG_EVIDENCE: R2Bucket;
  SCOUT_KV: KVNamespace;

  // Security
  RESET_TOKEN: string;
  OPS_TOKEN: string;

  // Business Logic Config
  MAX_BID_LIMIT: string;
  STEAL_THRESHOLD: string;

  // R2 Configuration
  // Public URL for serving images from R2 bucket
  R2_PUBLIC_URL?: string;
}

export const getConfig = (env: Env) => {
  const maxBid = parseFloat(env.MAX_BID_LIMIT || '6000');
  const stealThreshold = parseFloat(env.STEAL_THRESHOLD || '2000');

  if (isNaN(maxBid) || maxBid <= 0) {
    throw new Error(`Invalid MAX_BID_LIMIT: ${env.MAX_BID_LIMIT}. Must be a positive number.`);
  }
  if (isNaN(stealThreshold) || stealThreshold <= 0) {
    throw new Error(`Invalid STEAL_THRESHOLD: ${env.STEAL_THRESHOLD}. Must be a positive number.`);
  }

  return {
    isProd: env.ENVIRONMENT === 'production',
    isPreview: env.ENVIRONMENT === 'preview',
    maxBid,
    stealThreshold,
  };
};

/**
 * Load operator configuration from database (#214)
 * Falls back to environment variables if table doesn't exist or query fails
 */
export interface OperatorConfig {
  max_acquisition_dollars: number;
  max_distance_miles: number;
  home_location: string;
  home_lat: number;
  home_lon: number;
  min_profit_dollars: number;
  min_margin_percent: number;
}

export async function getOperatorConfig(env: Env, userId = 'default'): Promise<OperatorConfig> {
  try {
    const result = await env.DFG_DB.prepare(
      'SELECT key, value FROM operator_config WHERE user_id = ?'
    ).bind(userId).all();

    // Convert rows to key-value map
    const configMap: Record<string, string> = {};
    for (const row of result.results || []) {
      const r = row as { key: string; value: string };
      configMap[r.key] = r.value;
    }

    // Parse and return with type safety
    return {
      max_acquisition_dollars: parseFloat(configMap.max_acquisition_dollars || '6000'),
      max_distance_miles: parseFloat(configMap.max_distance_miles || '100'),
      home_location: configMap.home_location || 'Phoenix, AZ',
      home_lat: parseFloat(configMap.home_lat || '33.4484'),
      home_lon: parseFloat(configMap.home_lon || '-112.0740'),
      min_profit_dollars: parseFloat(configMap.min_profit_dollars || '600'),
      min_margin_percent: parseFloat(configMap.min_margin_percent || '40'),
    };
  } catch (err) {
    // Fallback to environment variables if table doesn't exist
    console.warn('[Config] Failed to load operator_config from D1, using defaults:', err);
    return {
      max_acquisition_dollars: parseFloat(env.MAX_BID_LIMIT || '6000'),
      max_distance_miles: 100,
      home_location: 'Phoenix, AZ',
      home_lat: 33.4484,
      home_lon: -112.0740,
      min_profit_dollars: 600,
      min_margin_percent: 40,
    };
  }
}

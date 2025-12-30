/**
 * Environment bindings for dfg-api worker.
 * Shares D1 database with dfg-scout.
 */
export interface Env {
  ENVIRONMENT: 'production' | 'development';

  // Database (shared with dfg-scout)
  DB: D1Database;

  // Security
  OPS_TOKEN: string;

  // Observability
  SENTRY_DSN?: string;

  // Make.com Integration
  // Webhook URL for triggering scout runs via Make.com scenarios
  MAKE_WEBHOOK_URL?: string;

  // Optional: dfg-scout service binding (for direct calls in production)
  SCOUT?: Fetcher;

  // Staleness configuration (optional, defaults defined in utils/staleness.ts)
  STALE_THRESHOLD_DAYS?: string;
}

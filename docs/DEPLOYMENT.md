# DFG Application Deployment Guide

This guide covers deploying the DFG application components to production.

## Components Overview

| Component | Type | Directory | Production URL |
|-----------|------|-----------|----------------|
| dfg-scout | Cloudflare Worker | `workers/dfg-scout/` | dfg-scout.automation-ab6.workers.dev |
| dfg-api | Cloudflare Worker | `workers/dfg-api/` | dfg-api.automation-ab6.workers.dev |
| dfg-app | Next.js App | `apps/dfg-app/` | TBD (Vercel/Cloudflare Pages) |

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, and KV enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Node.js 20+** for the frontend

## Database Setup

### 1. Run Migrations on Production D1

```bash
# From dfg-api directory
cd workers/dfg-api

# Run migrations on production database
npx wrangler d1 execute dfg-scout-db --remote --file=migrations/0001_opportunities.sql
```

## Worker Deployments

### Deploy dfg-scout

```bash
cd workers/dfg-scout

# Deploy to production
npx wrangler deploy --env production

# Set secrets (if not already set)
npx wrangler secret put SIERRA_API_KEY --env production
npx wrangler secret put OPS_TOKEN --env production
npx wrangler secret put RESET_TOKEN --env production
```

### Deploy dfg-api

```bash
cd workers/dfg-api

# Deploy to production
npx wrangler deploy --env production

# Set secrets
npx wrangler secret put OPS_TOKEN --env production

# Optional: Set Make.com webhook URL for external triggers
npx wrangler secret put MAKE_WEBHOOK_URL --env production
```

### Verify Deployments

```bash
# Check dfg-scout health
curl https://dfg-scout.automation-ab6.workers.dev/health

# Check dfg-api health
curl https://dfg-api.automation-ab6.workers.dev/health

# Test authenticated endpoint (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://dfg-api.automation-ab6.workers.dev/api/opportunities/stats
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set root directory to `apps/dfg-app`
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: `https://dfg-api.automation-ab6.workers.dev`
   - `NEXT_PUBLIC_API_TOKEN`: Your OPS_TOKEN

```bash
# Or deploy via CLI
cd apps/dfg-app
npm install
npx vercel --prod
```

### Option 2: Cloudflare Pages

```bash
cd apps/dfg-app
npm install
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name=dfg-app
```

## Configuration Reference

### Environment Variables

| Variable | Worker | Description |
|----------|--------|-------------|
| `ENVIRONMENT` | both | `production` or `development` |
| `SIERRA_API_KEY` | scout | Sierra Auctions API key |
| `OPS_TOKEN` | both | Shared auth token for operator access |
| `RESET_TOKEN` | scout | Admin token for reset operations |
| `MAKE_WEBHOOK_URL` | api | Optional Make.com webhook for scout triggers |

### Cron Schedules

| Worker | Schedule | Task |
|--------|----------|------|
| dfg-scout | `*/15 * * * *` | Scrape auctions every 15 minutes |
| dfg-api | `*/5 * * * *` | Check watch triggers every 5 minutes |

## Make.com Integration

To trigger scout runs from Make.com:

1. Create a webhook in Make.com
2. Set the `MAKE_WEBHOOK_URL` secret in dfg-api
3. The webhook receives:
   ```json
   {
     "action": "run_scout",
     "source": "all",
     "dryRun": false,
     "triggered_at": "2025-01-01T00:00:00.000Z"
   }
   ```

4. Make.com scenario should call dfg-scout's `/ops/run` endpoint

## Service Bindings

In production, dfg-api can call dfg-scout directly via service binding:

```toml
# In dfg-api wrangler.toml
[[env.production.services]]
binding = "SCOUT"
service = "dfg-scout"
```

This enables zero-latency worker-to-worker communication.

## Troubleshooting

### Check Logs

```bash
# Tail dfg-scout logs
npx wrangler tail dfg-scout --env production

# Tail dfg-api logs
npx wrangler tail dfg-api --env production
```

### Database Queries

```bash
# Query production D1
npx wrangler d1 execute dfg-scout-db --remote --command "SELECT COUNT(*) FROM opportunities"

# Check recent opportunities
npx wrangler d1 execute dfg-scout-db --remote --command "SELECT id, status, title FROM opportunities ORDER BY created_at DESC LIMIT 10"
```

### Common Issues

1. **401 Unauthorized**: Check OPS_TOKEN is set correctly as a secret
2. **Database errors**: Ensure migrations have been run on production D1
3. **CORS errors**: The API allows all origins; check the frontend URL is correct

## Rollback

```bash
# View deployment history
npx wrangler deployments list --env production

# Rollback to previous version
npx wrangler rollback --env production
```

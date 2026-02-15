'use client'

import * as React from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { formatPercent } from '@/lib/utils/format'
import {
  Users,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  Info,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

type DemandLevel = 'high' | 'medium' | 'moderate' | 'low' | 'niche' | 'unknown'
type TimeToSell = 'fast' | 'average' | 'slow' | 'unknown'

interface BuyerProfile {
  type: string
  percentage?: number
  description?: string
}

interface MarketInsight {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  description?: string
}

// Rich market demand assessment from the API (never "unknown")
export interface MarketDemandAssessment {
  level: 'high' | 'moderate' | 'low' | 'niche'
  confidence: 'high' | 'medium' | 'low'
  is_heuristic: boolean // True if no real comps/DOM data - confidence capped at medium
  basis: {
    method: 'comps_data' | 'category_heuristic' | 'price_band' | 'seasonal' | 'combined'
    factors: string[]
  }
  missing_inputs: string[]
  implications: {
    expected_days_to_sell: string
    pricing_advice: string
    risk_note: string | null
  }
  summary: string
}

interface BuyerInsightsProps {
  targetBuyers?: BuyerProfile[]
  demandLevel?: DemandLevel
  marketDemand?: MarketDemandAssessment // Rich demand assessment
  expectedTimeToSell?: TimeToSell
  daysOnMarket?: number
  bestSellingPoints?: string[]
  marketInsights?: MarketInsight[]
  priceRange?: { low: number; mid: number; high: number }
  seasonalFactors?: string
  localMarketNotes?: string
  className?: string
}

const demandConfig: Record<
  DemandLevel,
  { label: string; color: string; bgColor: string; description: string }
> = {
  high: {
    label: 'High Demand',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    description: 'This asset is in high demand. Expect quick sale at asking price.',
  },
  moderate: {
    label: 'Moderate Demand',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    description: 'Steady interest expected. Price competitively for reasonable sale time.',
  },
  medium: {
    label: 'Moderate Demand',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    description: 'Steady interest expected. Price competitively for reasonable sale time.',
  },
  low: {
    label: 'Low Demand',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Limited buyer pool. May require aggressive pricing or patience.',
  },
  niche: {
    label: 'Niche Market',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'rgba(147, 51, 234, 0.1)',
    description: 'Specialized buyer pool. Target trade professionals or enthusiast groups.',
  },
  unknown: {
    label: 'Unassessed',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    description: 'Demand data not available for this category.',
  },
}

const timeToSellConfig: Record<TimeToSell, { label: string; days: string; color: string }> = {
  fast: { label: 'Quick Sale', days: '< 14 days', color: 'text-green-600 dark:text-green-400' },
  average: { label: 'Average', days: '14-30 days', color: 'text-gray-600 dark:text-gray-400' },
  slow: { label: 'Slow', days: '30+ days', color: 'text-yellow-600 dark:text-yellow-400' },
  unknown: { label: 'Unknown', days: 'N/A', color: 'text-gray-600 dark:text-gray-400' },
}

// Parse raw buyer lens data
export function parseBuyerLensData(raw: any): Partial<BuyerInsightsProps> {
  if (!raw) return {}

  const result: Partial<BuyerInsightsProps> = {}

  // Parse target buyers
  if (raw.target_buyers || raw.targetBuyers || raw.buyer_types) {
    const buyers = raw.target_buyers || raw.targetBuyers || raw.buyer_types
    if (Array.isArray(buyers)) {
      result.targetBuyers = buyers.map((b: any) =>
        typeof b === 'string'
          ? { type: b }
          : { type: b.type || b.name, percentage: b.percentage, description: b.description }
      )
    }
  }

  // Parse demand level
  if (raw.demand || raw.demand_level || raw.demandLevel) {
    const demand = (raw.demand || raw.demand_level || raw.demandLevel).toLowerCase()
    if (demand.includes('high')) result.demandLevel = 'high'
    else if (demand.includes('medium') || demand.includes('moderate')) result.demandLevel = 'medium'
    else if (demand.includes('low')) result.demandLevel = 'low'
  }

  // Parse selling points
  if (raw.selling_points || raw.sellingPoints || raw.best_features) {
    const points = raw.selling_points || raw.sellingPoints || raw.best_features
    result.bestSellingPoints = Array.isArray(points)
      ? points
      : points.split(/[,;]/).map((p: string) => p.trim())
  }

  // Parse price range
  if (raw.price_range || raw.priceRange || raw.perceived_value_range) {
    const range = raw.price_range || raw.priceRange || raw.perceived_value_range
    if (typeof range === 'object') {
      const low = range.low || range.min || 0
      const high = range.high || range.max || 0
      // Calculate mid if not provided, and ensure we have different values
      let mid = range.mid || range.expected || range.average || 0
      if (!mid && low && high) {
        mid = Math.round((low + high) / 2)
      }
      // Only set price range if we have meaningful distinct values
      if (low > 0 || high > 0) {
        result.priceRange = {
          low: low || mid * 0.85, // If no low, estimate at 85% of mid
          mid: mid || Math.round((low + high) / 2),
          high: high || mid * 1.15, // If no high, estimate at 115% of mid
        }
      }
    }
  }

  // Parse other fields
  if (raw.days_on_market || raw.daysOnMarket) {
    result.daysOnMarket = parseInt(raw.days_on_market || raw.daysOnMarket)
  }
  if (raw.seasonal_factors || raw.seasonalFactors) {
    result.seasonalFactors = raw.seasonal_factors || raw.seasonalFactors
  }
  if (raw.local_market || raw.localMarketNotes) {
    result.localMarketNotes = raw.local_market || raw.localMarketNotes
  }

  return result
}

export function BuyerInsights({
  targetBuyers = [],
  demandLevel = 'unknown',
  marketDemand,
  expectedTimeToSell = 'unknown',
  daysOnMarket,
  bestSellingPoints = [],
  marketInsights = [],
  priceRange,
  seasonalFactors,
  localMarketNotes,
  className,
}: BuyerInsightsProps) {
  // Prefer rich market demand assessment over simple demandLevel
  const effectiveDemandLevel: DemandLevel = marketDemand?.level || demandLevel
  const demandInfo = demandConfig[effectiveDemandLevel] || demandConfig.unknown
  const timeInfo = timeToSellConfig[expectedTimeToSell]

  const hasData =
    targetBuyers.length > 0 ||
    effectiveDemandLevel !== 'unknown' ||
    marketDemand ||
    bestSellingPoints.length > 0 ||
    priceRange ||
    marketInsights.length > 0

  if (!hasData) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-gray-400"
          style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
        >
          <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">
              Buyer Insights Not Available
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Not enough market data to provide buyer insights for this vehicle.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Demand & Time to Sell */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Demand Level - Rich assessment with factors */}
        <div
          className="p-4 rounded-lg border-2"
          style={{
            borderColor:
              effectiveDemandLevel === 'high'
                ? 'rgba(34, 197, 94, 0.5)'
                : effectiveDemandLevel === 'low'
                  ? 'rgba(245, 158, 11, 0.5)'
                  : effectiveDemandLevel === 'niche'
                    ? 'rgba(147, 51, 234, 0.5)'
                    : 'var(--border)',
            backgroundColor: demandInfo.bgColor,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className={cn('h-5 w-5', demandInfo.color)} />
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Market Demand
            </span>
            {/* Confidence indicator - always show "Heuristic" when is_heuristic is true */}
            {marketDemand && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  marketDemand.is_heuristic
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' // Heuristic = amber
                    : marketDemand.confidence === 'high'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                )}
              >
                {marketDemand.is_heuristic ? 'Heuristic' : marketDemand.confidence}
              </span>
            )}
          </div>
          <p className={cn('text-xl font-bold', demandInfo.color)}>{demandInfo.label}</p>
          {/* Use rich summary if available, otherwise fallback to simple description */}
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            {marketDemand?.summary || demandInfo.description}
          </p>
          {/* Demand factors */}
          {marketDemand?.basis?.factors && marketDemand.basis.factors.length > 0 && (
            <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Why:
              </p>
              <ul className="text-xs space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {marketDemand.basis.factors.slice(0, 3).map((factor, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-500">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Missing inputs - what would improve the estimate */}
          {marketDemand?.missing_inputs && marketDemand.missing_inputs.length > 0 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                Would improve with: {marketDemand.missing_inputs.slice(0, 2).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Time to Sell - Use marketDemand implications if available */}
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Expected Time to Sell
            </span>
          </div>
          <p className={cn('text-xl font-bold', timeInfo.color)}>
            {marketDemand?.implications?.expected_days_to_sell ||
              (daysOnMarket ? `~${daysOnMarket} days` : timeInfo.days)}
          </p>
          {/* Pricing advice from market demand */}
          {marketDemand?.implications?.pricing_advice ? (
            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {marketDemand.implications.pricing_advice}
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {timeInfo.label} based on similar assets in your market.
            </p>
          )}
          {/* Risk note */}
          {marketDemand?.implications?.risk_note && (
            <p
              className="text-xs mt-2 p-2 rounded"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--foreground)' }}
            >
              ⚠️ {marketDemand.implications.risk_note}
            </p>
          )}
        </div>
      </div>

      {/* Price Range */}
      {priceRange && (
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="font-medium">Expected Sale Price Range</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Quick Sale
              </p>
              <p className="text-lg font-bold font-mono">{formatCurrency(priceRange.low)}</p>
            </div>
            <div className="border-x" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Expected
              </p>
              <p className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
                {formatCurrency(priceRange.mid)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Premium
              </p>
              <p className="text-lg font-bold font-mono">{formatCurrency(priceRange.high)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Target Buyers */}
      {targetBuyers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="font-medium">Target Buyers</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {targetBuyers.map((buyer, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  <Users className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{buyer.type}</p>
                  {buyer.description && (
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {buyer.description}
                    </p>
                  )}
                </div>
                {buyer.percentage && (
                  <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-400">
                    {buyer.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selling Points */}
      {bestSellingPoints.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="font-medium">Key Selling Points</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bestSellingPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              >
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Insights */}
      {marketInsights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {marketInsights.map((insight, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
            >
              <div className="flex-1">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {insight.label}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{insight.value}</p>
                  {insight.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {insight.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Notes */}
      {(seasonalFactors || localMarketNotes) && (
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ backgroundColor: 'var(--muted)' }}
        >
          <Info
            className="h-5 w-5 flex-shrink-0 mt-0.5"
            style={{ color: 'var(--muted-foreground)' }}
          />
          <div className="space-y-2">
            {seasonalFactors && (
              <div>
                <p className="text-sm font-medium">Seasonal Factors</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {seasonalFactors}
                </p>
              </div>
            )}
            {localMarketNotes && (
              <div>
                <p className="text-sm font-medium">Local Market</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {localMarketNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

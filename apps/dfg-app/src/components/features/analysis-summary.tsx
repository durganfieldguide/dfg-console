'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { RiskAssessment, type RiskAssessmentData } from './risk-assessment'
import { PreBidChecklist, type ChecklistItem } from './pre-bid-checklist'
import { PhotoPipelineMetrics, type PhotoMetrics } from './photo-pipeline-metrics'
import { GatesDisplay, type ComputedGates } from './gates-display'
import type { AnalysisResult } from '@/lib/api'

type Verdict = 'BUY' | 'WATCH' | 'PASS'

interface AnalysisSummaryProps {
  analysis: AnalysisResult
  className?: string
}

// Hard definitions (do not soften):
// BUY = bid up to max bid if gates clear. This is a real number.
// WATCH = needs more info or price drop. Do not bid yet.
// PASS = do not spend time. Not "maybe later."
const verdictConfig: Record<
  Verdict,
  {
    icon: React.ElementType
    color: string
    bgColor: string
    borderColor: string
    headline: string
    tooltip: string
  }
> = {
  BUY: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    headline: 'Bid up to max bid shown',
    tooltip: 'Bid up to max bid shown. Economics work if gates clear.',
  },
  WATCH: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    headline: 'Do not bid yet — needs price drop or more info',
    tooltip: 'Do not bid yet. Needs price drop or more information.',
  },
  PASS: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    headline: 'Do not bid — do not spend more time',
    tooltip: 'Do not bid. Do not spend more time on this deal.',
  },
}

// Extract the first meaningful paragraph from markdown
function extractSummaryText(markdown: string): string {
  if (!markdown) return ''

  // Split by double newlines and find first non-heading paragraph
  const paragraphs = markdown.split('\n\n')
  for (const p of paragraphs) {
    const trimmed = p.trim()
    // Skip headings and tables
    if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('---')) {
      continue
    }
    // Return first meaningful paragraph
    if (trimmed.length > 50) {
      return trimmed
    }
  }
  return ''
}

export function AnalysisSummary({ analysis, className }: AnalysisSummaryProps) {
  const fields = analysis.report_fields || {}
  // Normalize verdict to uppercase and map legacy terms to canonical BUY/WATCH/PASS
  const rawVerdict = String(fields.verdict || 'PASS').toUpperCase()
  const normalizedVerdict =
    rawVerdict === 'MARGINAL' ? 'WATCH' : rawVerdict === 'STRONG_BUY' ? 'BUY' : rawVerdict
  const verdict: Verdict =
    normalizedVerdict === 'BUY' || normalizedVerdict === 'WATCH' || normalizedVerdict === 'PASS'
      ? (normalizedVerdict as Verdict)
      : 'PASS'
  const config = verdictConfig[verdict]
  const VerdictIcon = config.icon

  const summaryText = extractSummaryText(analysis.report_markdown || '')

  // Extract new risk assessment data if available (V2.7 format)
  const riskAssessment = (analysis as any).risk_assessment as RiskAssessmentData | undefined
  const riskBanner = (analysis as any).risk_banner as
    | { headline: string; subtext: string; severity: 'critical' | 'warning' | 'info' | 'success' }
    | undefined
  const bidReadiness = (analysis as any).bid_readiness as
    | { status: string; reason: string; blockers: string[] }
    | undefined
  const preBidChecklist = (analysis as any).pre_bid_checklist as ChecklistItem[] | undefined

  // Photo pipeline metrics from condition assessment
  const photoMetrics = (analysis as any).condition?.photo_metrics as PhotoMetrics | undefined

  // Extract market demand assessment (#147) - liquidity narrative
  const marketDemand = (analysis as any).market_demand as
    | {
        level: 'high' | 'moderate' | 'low' | 'niche'
        confidence: 'high' | 'medium' | 'low'
        is_heuristic: boolean
        implications: {
          expected_days_to_sell: string
          pricing_advice: string
          risk_note: string | null
        }
        summary: string
      }
    | undefined

  // Extract verdict gates (#148) - structured gate display
  const verdictGates = (analysis as any)?.investor_lens?.verdict_gates as
    | Array<{
        id: string
        type: 'blocking' | 'downgrade'
        status: 'failed' | 'passed'
        category: 'critical' | 'confidence'
        title: string
        description: string
        condition: string
        impact: string
      }>
    | undefined

  const gatesSummary = (analysis as any)?.investor_lens?.gates_summary as
    | {
        allCriticalPassed: boolean
        passedCount: number
        totalCount: number
      }
    | undefined

  // Map VerdictGate objects to ComputedGates interface for GatesDisplay
  const computedGates: ComputedGates | null =
    verdictGates && verdictGates.length > 0
      ? {
          gates: verdictGates.map((g) => ({
            name: g.id,
            status: g.status as 'passed' | 'failed',
            reason: g.description,
            isCritical: g.category === 'critical',
          })),
          allCriticalPassed: gatesSummary?.allCriticalPassed ?? false,
          passedCount: gatesSummary?.passedCount ?? 0,
          totalCount: gatesSummary?.totalCount ?? verdictGates.length,
          summary: gatesSummary?.allCriticalPassed
            ? 'All critical gates cleared'
            : `${verdictGates.filter((g) => g.category === 'critical' && g.status === 'failed').length} critical gate(s) blocking`,
        }
      : null

  // Check for V2.7 format (observed_issues) or V2.6 format (confirmed_issues)
  const hasRiskData =
    riskAssessment &&
    ((riskAssessment as any).observed_issues?.length > 0 ||
      (riskAssessment as any).unverified_risks?.length > 0 ||
      (riskAssessment as any).confirmed_issues?.length > 0 ||
      (riskAssessment as any).suspected_issues?.length > 0 ||
      riskAssessment.info_gaps?.length > 0)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Bid Readiness Pill (V2.7) */}
      {bidReadiness && (
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            backgroundColor:
              bidReadiness.status === 'BID_READY'
                ? 'rgba(34, 197, 94, 0.15)'
                : bidReadiness.status === 'NOT_BID_READY'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
            color:
              bidReadiness.status === 'BID_READY'
                ? 'rgb(22, 163, 74)'
                : bidReadiness.status === 'NOT_BID_READY'
                  ? 'rgb(217, 119, 6)'
                  : 'rgb(220, 38, 38)',
            border: `2px solid ${
              bidReadiness.status === 'BID_READY'
                ? 'rgba(34, 197, 94, 0.5)'
                : bidReadiness.status === 'NOT_BID_READY'
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'rgba(239, 68, 68, 0.5)'
            }`,
          }}
        >
          {bidReadiness.status === 'BID_READY' && <CheckCircle className="h-5 w-5" />}
          {bidReadiness.status === 'NOT_BID_READY' && <AlertTriangle className="h-5 w-5" />}
          {bidReadiness.status === 'DO_NOT_BID' && <XCircle className="h-5 w-5" />}
          {bidReadiness.status.replace(/_/g, ' ')}
          {bidReadiness.blockers.length > 0 && (
            <span className="text-xs font-normal opacity-75">
              ({bidReadiness.blockers.length} gate{bidReadiness.blockers.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}

      {/* Verdict Hero */}
      <div
        className="p-6 rounded-xl border-2"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--background)' }}
          >
            <VerdictIcon className={cn('h-6 w-6', config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn('text-xl font-bold cursor-help', config.color)}
                title={config.tooltip}
              >
                {verdict}
              </span>
              <span className="font-medium">Recommendation</span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {config.headline}
            </p>
            {summaryText && <p className="mt-3 text-sm leading-relaxed">{summaryText}</p>}
          </div>
        </div>
      </div>

      {/* Verdict Gates (#148) - Structured gate display with status indicators */}
      {computedGates ? (
        <GatesDisplay gates={computedGates} />
      ) : (
        /* Fallback to simple text display for old analyses without verdict_gates */
        (analysis as any)?.investor_lens?.verdict_reasons &&
        (analysis as any).investor_lens.verdict_reasons.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verdict Adjustments:
            </p>
            <ul className="space-y-1">
              {(analysis as any).investor_lens.verdict_reasons.map((reason: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {/* Liquidity Overview (#147) - Time to sell and demand level */}
      {marketDemand && (
        <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Expected Time to Sell
            </h3>
            {marketDemand.is_heuristic && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                Heuristic
              </span>
            )}
          </div>

          {/* Large time display */}
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {marketDemand.implications.expected_days_to_sell}
          </div>

          {/* Demand level badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                marketDemand.level === 'high' &&
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                marketDemand.level === 'moderate' &&
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                marketDemand.level === 'low' &&
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                marketDemand.level === 'niche' &&
                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              )}
            >
              {marketDemand.level.toUpperCase()} demand
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {marketDemand.confidence} confidence
            </span>
          </div>

          {/* Pricing advice */}
          {marketDemand.implications.pricing_advice && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {marketDemand.implications.pricing_advice}
            </p>
          )}

          {/* Risk note */}
          {marketDemand.implications.risk_note && (
            <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              ⚠️ {marketDemand.implications.risk_note}
            </p>
          )}
        </div>
      )}

      {/* Numbers are shown above the fold - Summary focuses on decision + gates */}

      {/* Photo Pipeline Metrics - answers two key questions:
          1. Did the seller provide enough photos?
          2. Did DFG successfully analyze them? */}
      {photoMetrics && <PhotoPipelineMetrics metrics={photoMetrics} />}

      {/* Risk Assessment (gates + blockers) */}
      {hasRiskData && riskAssessment && (
        <RiskAssessment data={riskAssessment} banner={riskBanner} />
      )}

      {/* Pre-Bid Checklist (Must Clear Before Bidding) */}
      {preBidChecklist && preBidChecklist.length > 0 && verdict !== 'PASS' && (
        <PreBidChecklist items={preBidChecklist} />
      )}

      {/* Strengths/Risks and Investment Thesis moved to Investor tab to avoid duplication */}

      {/* Quick Action Guidance - what to do next */}
      <div
        className="flex items-start gap-3 p-4 rounded-lg"
        style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
      >
        <Info className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Next Steps</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {verdict === 'BUY'
              ? 'Review the Condition and Investor Lens tabs for inspection priorities, then proceed to bid.'
              : verdict === 'WATCH'
                ? 'Check the Condition tab carefully. Only proceed if you can verify key concerns.'
                : 'This deal is not recommended. Consider other opportunities.'}
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { AlertTriangle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { AnalysisResult } from '@/lib/api'

interface NextActionCardProps {
  analysis: AnalysisResult | null
  analysisTimestamp?: string | null
  className?: string
}

// Derive next action from verdict
function deriveNextAction(verdict?: string): 'Bid' | 'Inspect' | 'Pass' {
  if (!verdict) return 'Inspect'

  const v = verdict.toUpperCase()

  if (v === 'BUY' || v === 'STRONG_BUY') return 'Bid'
  if (v === 'MARGINAL' || v === 'WATCH') return 'Inspect'
  return 'Pass'
}

// Calculate staleness (> 7 days)
function isAnalysisStale(timestamp?: string | null): boolean {
  if (!timestamp) return false

  const analysisDate = new Date(timestamp)
  const now = new Date()
  const daysDiff = (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysDiff > 7
}

// Format staleness message
function getStalenessMessage(timestamp?: string | null): string {
  if (!timestamp) return ''

  const analysisDate = new Date(timestamp)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24))

  return `Analysis stale (${daysDiff} days)`
}

// Parse reasoning into bullet points
function parseReasoning(reasoning?: string): string[] {
  if (!reasoning) return []

  // Split by newlines, bullets, or numbered lists
  const lines = reasoning
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))

  // If we got only one line and it's long, try to split by sentence
  if (lines.length === 1 && lines[0].length > 80) {
    const sentences = lines[0]
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    return sentences.slice(0, 3)
  }

  // Return up to 3 reasons
  return lines.slice(0, 3)
}

export function NextActionCard({ analysis, analysisTimestamp, className }: NextActionCardProps) {
  // If no analysis, show placeholder
  if (!analysis) {
    return (
      <Card className={cn('border-2 border-dashed', className)}>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No analysis yet — Request Analysis</p>
        </CardContent>
      </Card>
    )
  }

  const verdict = analysis.investor_lens?.verdict || analysis.report_fields?.verdict || 'PASS'
  const nextAction = deriveNextAction(verdict)

  // Prefer verdict_reasons array if available, otherwise parse verdict_reasoning
  const verdictReasons = analysis.investor_lens?.verdict_reasons || []
  const reasoning = analysis.investor_lens?.verdict_reasoning || ''
  const reasons = verdictReasons.length > 0 ? verdictReasons.slice(0, 3) : parseReasoning(reasoning)
  const inspectionPriorities = analysis.investor_lens?.inspection_priorities || []
  const maxBid = analysis.investor_lens?.max_bid
  const stale = isAnalysisStale(analysisTimestamp)
  const stalenessMsg = getStalenessMessage(analysisTimestamp)

  // Top 3 walk triggers
  const walkTriggers = inspectionPriorities.slice(0, 3)

  // Action color coding
  const actionColors = {
    Bid: 'text-green-700 dark:text-green-400',
    Inspect: 'text-yellow-700 dark:text-yellow-400',
    Pass: 'text-red-700 dark:text-red-400',
  }

  return (
    <Card
      className={cn('border-2', stale && 'border-orange-400 dark:border-orange-600', className)}
    >
      <CardHeader className="pb-3">
        <h2 className="text-xl font-bold">
          NEXT ACTION: <span className={actionColors[nextAction]}>{nextAction}</span>
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why section */}
        {reasons.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Why:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {reasons.map((reason, index) => (
                <li key={index} className="text-gray-900 dark:text-gray-100">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Walk Triggers section */}
        {walkTriggers.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
              Walk Triggers (top {walkTriggers.length}):
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {walkTriggers.map((trigger, index) => (
                <li key={index} className="text-gray-900 dark:text-gray-100">
                  {trigger}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Max Bid section */}
        {maxBid !== null && maxBid !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                Max Bid (All-in):
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(maxBid)}
              </span>
            </div>
          </div>
        )}

        {/* Staleness warning */}
        {stale && (
          <div className="pt-2 border-t flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{stalenessMsg}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

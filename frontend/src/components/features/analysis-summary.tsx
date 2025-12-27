'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { RiskAssessment, type RiskAssessmentData } from './risk-assessment';
import { PreBidChecklist, type ChecklistItem } from './pre-bid-checklist';
import { PhotoPipelineMetrics } from './photo-pipeline-metrics';
import type { AnalysisResult, PhotoMetrics } from '@/lib/types';

type Verdict = 'BUY' | 'WATCH' | 'PASS';

interface AnalysisSummaryProps {
  analysis: AnalysisResult;
  className?: string;
}

// Hard definitions (do not soften):
// BUY = bid up to max bid if gates clear. This is a real number.
// WATCH = needs more info or price drop. Do not bid yet.
// PASS = do not spend time. Not "maybe later."
const verdictConfig: Record<Verdict, { icon: React.ElementType; color: string; bgColor: string; borderColor: string; headline: string; tooltip: string }> = {
  BUY: {
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    headline: 'Bid up to max bid shown',
    tooltip: 'Bid up to max bid shown. Economics work if gates clear.',
  },
  WATCH: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    headline: 'Do not bid yet — needs price drop or more info',
    tooltip: 'Do not bid yet. Needs price drop or more information.',
  },
  PASS: {
    icon: XCircleIcon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    headline: 'Do not bid — do not spend more time',
    tooltip: 'Do not bid. Do not spend more time on this deal.',
  },
};

// Extract the first meaningful paragraph from markdown
function extractSummaryText(markdown: string): string {
  if (!markdown) return '';

  // Split by double newlines and find first non-heading paragraph
  const paragraphs = markdown.split('\n\n');
  for (const p of paragraphs) {
    const trimmed = p.trim();
    // Skip headings and tables
    if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('---')) {
      continue;
    }
    // Return first meaningful paragraph
    if (trimmed.length > 50) {
      return trimmed;
    }
  }
  return '';
}

export function AnalysisSummary({ analysis, className }: AnalysisSummaryProps) {
  const fields = analysis.report_fields || {};
  // Normalize verdict to uppercase and map legacy terms to canonical BUY/WATCH/PASS
  const rawVerdict = String(fields.verdict || 'PASS').toUpperCase();
  const normalizedVerdict = rawVerdict === 'MARGINAL' ? 'WATCH'
    : rawVerdict === 'STRONG_BUY' ? 'BUY'
    : rawVerdict;
  const verdict: Verdict = (normalizedVerdict === 'BUY' || normalizedVerdict === 'WATCH' || normalizedVerdict === 'PASS')
    ? normalizedVerdict as Verdict
    : 'PASS';
  const config = verdictConfig[verdict];
  const VerdictIcon = config.icon;

  const summaryText = extractSummaryText(analysis.report_markdown || '');

  // Extract new risk assessment data if available (V2.7 format)
  const riskAssessment = (analysis as any).risk_assessment as RiskAssessmentData | undefined;
  const riskBanner = (analysis as any).risk_banner as { headline: string; subtext: string; severity: 'critical' | 'warning' | 'info' | 'success' } | undefined;
  const bidReadiness = (analysis as any).bid_readiness as { status: string; reason: string; blockers: string[] } | undefined;
  const preBidChecklist = (analysis as any).pre_bid_checklist as ChecklistItem[] | undefined;

  // Photo pipeline metrics from condition assessment
  const photoMetrics = (analysis as any).condition?.photo_metrics as PhotoMetrics | undefined;

  // Check for V2.7 format (observed_issues) or V2.6 format (confirmed_issues)
  const hasRiskData = riskAssessment && (
    (riskAssessment as any).observed_issues?.length > 0 ||
    (riskAssessment as any).unverified_risks?.length > 0 ||
    (riskAssessment as any).confirmed_issues?.length > 0 ||
    (riskAssessment as any).suspected_issues?.length > 0 ||
    riskAssessment.info_gaps?.length > 0
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Bid Readiness Pill (V2.7) */}
      {bidReadiness && (
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            backgroundColor: bidReadiness.status === 'BID_READY'
              ? 'rgba(34, 197, 94, 0.15)'
              : bidReadiness.status === 'NOT_BID_READY'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color: bidReadiness.status === 'BID_READY'
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
          {bidReadiness.status === 'BID_READY' && <CheckCircleIcon className="h-5 w-5" />}
          {bidReadiness.status === 'NOT_BID_READY' && <ExclamationTriangleIcon className="h-5 w-5" />}
          {bidReadiness.status === 'DO_NOT_BID' && <XCircleIcon className="h-5 w-5" />}
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
            {summaryText && (
              <p className="mt-3 text-sm leading-relaxed">
                {summaryText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Numbers are shown above the fold - Summary focuses on decision + gates */}

      {/* Photo Pipeline Metrics - answers two key questions:
          1. Did the seller provide enough photos?
          2. Did DFG successfully analyze them? */}
      {photoMetrics && (
        <PhotoPipelineMetrics metrics={photoMetrics} />
      )}

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
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Next Steps</p>
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
  );
}

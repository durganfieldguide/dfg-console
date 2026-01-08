'use client';

import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnalysisSummary } from './analysis-summary';
import { ConditionAssessment, parseConditionData } from './condition-assessment';
import { InvestmentBreakdown } from './investment-breakdown';
import { RepairPlan, parseRepairPlan } from './repair-plan';
import { VerdictReasoning } from './verdict-reasoning';
import { BuyerInsights, parseBuyerLensData } from './buyer-insights';
import type { AnalysisResult } from '@/lib/api';

interface TabbedAnalysisProps {
  analysis: AnalysisResult | null;
  currentBid: number | null;
  sourceUrl?: string;
  className?: string;
}

export function TabbedAnalysis({ analysis, currentBid, sourceUrl, className }: TabbedAnalysisProps) {
  const fields = analysis?.report_fields || {
    verdict: 'PASS' as const,
    max_bid_mid: 0,
    max_bid_worst: 0,
    max_bid_best: 0,
    retail_est: 0,
    expected_profit: 0,
    expected_margin: 0,
    confidence: 0,
  };

  // Parse condition data
  const conditionAreas = parseConditionData(analysis?.condition || {});

  // Parse repair plan from investor lens
  const repairItems = parseRepairPlan(
    Array.isArray(analysis?.investor_lens?.repair_plan)
      ? analysis.investor_lens.repair_plan.map((r: any) => `${r.item || r.name} $${r.cost || 0}`).join(', ')
      : ''
  );
  const repairTotal = Array.isArray(analysis?.investor_lens?.repair_plan)
    ? analysis.investor_lens.repair_plan.reduce((sum: number, r: any) => sum + (r.cost || 0), 0)
    : 0;

  // Parse buyer lens data
  const buyerData = parseBuyerLensData(analysis?.buyer_lens || {});

  // Single source of truth for exit pricing: investor_lens.phoenix_resale_range
  // This ensures Buyer tab and Investor tab show matching numbers
  const priceRange = analysis?.investor_lens?.phoenix_resale_range
    ? {
        low: analysis.investor_lens.phoenix_resale_range.quick_sale,
        mid: analysis.investor_lens.phoenix_resale_range.market_rate,
        high: analysis.investor_lens.phoenix_resale_range.premium,
      }
    : undefined;

  return (
    <div className={cn('space-y-4 overflow-x-hidden', className)}>
      <Tabs defaultValue="report">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto overflow-x-auto scrollbar-hide">
          <TabsTrigger
            value="report"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:opacity-60 rounded-none px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            Report
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:opacity-60 rounded-none px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="condition"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:opacity-60 rounded-none px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            Condition
          </TabsTrigger>
          <TabsTrigger
            value="investor"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:opacity-60 rounded-none px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            Investor
          </TabsTrigger>
          <TabsTrigger
            value="buyer"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:opacity-60 rounded-none px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            Buyer
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="pt-4">
          <div className="space-y-6">
            {/* Quick Numbers Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-card">
              <div>
                <p className="text-xs text-muted-foreground">Max Bid</p>
                <p className="text-xl font-bold text-green-600 font-mono">
                  {fields.max_bid_mid > 0 ? formatCurrency(fields.max_bid_mid) : 'N/A'}
                </p>
                {fields.max_bid_worst > 0 && fields.max_bid_best > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(fields.max_bid_worst)} - {formatCurrency(fields.max_bid_best)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retail Est.</p>
                <p className="text-xl font-bold text-blue-600 font-mono">
                  {fields.retail_est > 0 ? formatCurrency(fields.retail_est) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Profit</p>
                <p className="text-xl font-bold text-purple-600 font-mono">
                  {fields.expected_profit > 0 ? formatCurrency(fields.expected_profit) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className={cn(
                  'text-xl font-bold font-mono',
                  (fields.expected_margin * 100) >= 25 ? 'text-green-600' :
                  (fields.expected_margin * 100) >= 15 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {fields.expected_margin > 0 ? `${(fields.expected_margin * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
            </div>

            {analysis && <AnalysisSummary analysis={analysis} />}
          </div>
        </TabsContent>

        {/* Condition Tab */}
        <TabsContent value="condition" className="pt-4">
          <ConditionAssessment
            overallCondition={analysis?.condition?.overall_grade}
            areas={conditionAreas}
            summary={analysis?.condition?.summary}
            evidenceLedger={(analysis as any)?.condition?.evidence_ledger}
          />

          {/* Red Flags section */}
          {analysis?.condition?.red_flags && analysis.condition.red_flags.length > 0 && (
            <div className="mt-6 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                Red Flags ({analysis.condition.red_flags.length})
              </h4>
              <ul className="space-y-2">
                {analysis.condition.red_flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs shrink-0',
                      flag.severity === 'dealbreaker' && 'bg-red-200 text-red-800',
                      flag.severity === 'major' && 'bg-orange-200 text-orange-800',
                      flag.severity === 'moderate' && 'bg-yellow-200 text-yellow-800',
                      flag.severity === 'minor' && 'bg-gray-200 text-gray-800'
                    )}>
                      {flag.severity}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{flag.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* Investor Lens Tab */}
        <TabsContent value="investor" className="pt-4">
          <div className="space-y-6">
            {/* Investment Breakdown */}
            <InvestmentBreakdown
              currentBid={currentBid}
              maxBid={fields.max_bid_mid || undefined}
              estimatedRepairs={repairTotal}
            />

            {/* Repair Plan */}
            {repairItems.length > 0 && (
              <RepairPlan items={repairItems} totalEstimate={repairTotal} />
            )}

            {/* Verdict Reasoning */}
            {analysis?.investor_lens?.verdict_reasoning && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Verdict Reasoning</h3>
                <VerdictReasoning
                  reasoning={analysis.investor_lens.verdict_reasoning}
                  priceRange={analysis.investor_lens.phoenix_resale_range}
                  scenarios={analysis.investor_lens.scenarios}
                />
              </div>
            )}

            {/* Deal Killers */}
            {analysis?.investor_lens?.deal_killers && analysis.investor_lens.deal_killers.length > 0 && (
              <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                  Deal Killers
                </h4>
                <ul className="space-y-2">
                  {analysis.investor_lens.deal_killers.map((killer, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <span className="shrink-0">❌</span>
                      {killer}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inspection Priorities */}
            {analysis?.investor_lens?.inspection_priorities && analysis.investor_lens.inspection_priorities.length > 0 && (
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                  Inspection Priorities
                </h4>
                <ul className="space-y-2">
                  {analysis.investor_lens.inspection_priorities.map((priority, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <span className="shrink-0">👁️</span>
                      {priority}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Buyer Lens Tab */}
        <TabsContent value="buyer" className="pt-4">
          <BuyerInsights
            targetBuyers={buyerData.targetBuyers}
            demandLevel={buyerData.demandLevel}
            marketDemand={(analysis as any)?.market_demand}
            expectedTimeToSell={buyerData.daysOnMarket ? 'average' : 'unknown'}
            daysOnMarket={buyerData.daysOnMarket}
            bestSellingPoints={buyerData.bestSellingPoints}
            priceRange={priceRange}
            seasonalFactors={buyerData.seasonalFactors}
            localMarketNotes={buyerData.localMarketNotes}
          />
        </TabsContent>

        {/* Full Report Tab */}
        <TabsContent value="report" className="pt-4">
          {/* Original Listing Link */}
          <div className="mb-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                Open Original Listing
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <ExternalLink className="h-4 w-4" />
                Source link unavailable
              </span>
            )}
          </div>

          {analysis?.report_markdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto border">
                {analysis.report_markdown}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium mb-2">No analysis available yet</p>
              <p className="text-sm">Click the &ldquo;Analyze&rdquo; button above to generate a Dual Lens analysis with Max Bid and Inspection Priorities.</p>
            </div>
          )}

          {/* Metadata */}
          {analysis?.metadata?.analysis_duration_ms && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Analysis completed in {(analysis.metadata.analysis_duration_ms / 1000).toFixed(1)}s
              {analysis.metadata?.total_tokens && ` • ${analysis.metadata.total_tokens.toLocaleString()} tokens`}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

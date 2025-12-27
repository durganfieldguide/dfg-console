'use client';

import * as React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { formatPercent } from '@/lib/utils/format';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

interface EconomicScenario {
  label: string;
  salePrice: number;
  profit: number;
  margin: number;
}

interface ParsedVerdictReasoning {
  maxBid: number;
  allInCost: number;
  scenarios: EconomicScenario[];
  economicTier: string;
  finalVerdict: string;
  gates: string[];
  wasDowngraded: boolean;
}

// Parse the raw verdict reasoning string into structured data
function parseVerdictReasoning(raw: string): ParsedVerdictReasoning | null {
  if (!raw) return null;

  try {
    const result: ParsedVerdictReasoning = {
      maxBid: 0,
      allInCost: 0,
      scenarios: [],
      economicTier: '',
      finalVerdict: '',
      gates: [],
      wasDowngraded: false,
    };

    // Parse "Economics @ max bid $450 (all-in $596):"
    const bidMatch = raw.match(/max bid \$?([\d,]+)\s*\(all-in \$?([\d,]+)\)/i);
    if (bidMatch) {
      result.maxBid = parseInt(bidMatch[1].replace(/,/g, ''));
      result.allInCost = parseInt(bidMatch[2].replace(/,/g, ''));
    }

    // Parse scenarios: "quick-sale $800 -> $204 (25.5%)"
    const scenarioPatterns = [
      { pattern: /quick-sale \$?([\d,]+)\s*->\s*\$?([\d,]+)\s*\(([\d.]+)%\)/i, label: 'Quick Sale' },
      { pattern: /expected \$?([\d,]+)\s*->\s*\$?([\d,]+)\s*\(([\d.]+)%\)/i, label: 'Expected' },
      { pattern: /premium \$?([\d,]+)\s*->\s*\$?([\d,]+)\s*\(([\d.]+)%\)/i, label: 'Premium' },
    ];

    for (const { pattern, label } of scenarioPatterns) {
      const match = raw.match(pattern);
      if (match) {
        result.scenarios.push({
          label,
          salePrice: parseInt(match[1].replace(/,/g, '')),
          profit: parseInt(match[2].replace(/,/g, '')),
          margin: parseFloat(match[3]) / 100,
        });
      }
    }

    // Parse "Economic tier: BUY" (support both old MARGINAL and new WATCH)
    const tierMatch = raw.match(/Economic tier:\s*(BUY|WATCH|MARGINAL|PASS)/i);
    if (tierMatch) {
      const tier = tierMatch[1].toUpperCase();
      result.economicTier = tier === 'MARGINAL' ? 'WATCH' : tier;
    }

    // Parse "Final verdict: PASS" (support both old MARGINAL and new WATCH)
    const verdictMatch = raw.match(/Final verdict:\s*(BUY|WATCH|MARGINAL|PASS)/i);
    if (verdictMatch) {
      const verdict = verdictMatch[1].toUpperCase();
      result.finalVerdict = verdict === 'MARGINAL' ? 'WATCH' : verdict;
    }

    // Check if downgraded
    result.wasDowngraded = result.economicTier !== result.finalVerdict &&
                           result.economicTier !== '' &&
                           result.finalVerdict !== '';

    // Parse gates: "Capped/downgraded by gates: limited photos (<4), title status: unknown"
    const gatesMatch = raw.match(/(?:Capped|downgraded) by gates?:\s*(.+?)(?:\.|$)/i);
    if (gatesMatch) {
      result.gates = gatesMatch[1]
        .split(/,\s*/)
        .map(g => g.trim())
        .filter(g => g.length > 0);
    }

    return result;
  } catch {
    return null;
  }
}

// Human-readable explanations for common gates
const gateExplanations: Record<string, { title: string; description: string; severity: 'warning' | 'danger' }> = {
  'limited photos': {
    title: 'Limited Photos',
    description: 'Fewer than 4 photos available. Hard to assess true condition without more visual evidence.',
    severity: 'warning',
  },
  'title status: unknown': {
    title: 'Unknown Title Status',
    description: 'Cannot verify if the title is clean. Could have liens, salvage history, or other issues.',
    severity: 'danger',
  },
  'title status: salvage': {
    title: 'Salvage Title',
    description: 'Vehicle has a salvage or rebuilt title, significantly reducing resale value.',
    severity: 'danger',
  },
  'high mileage': {
    title: 'High Mileage',
    description: 'Mileage is above average for the year, which may affect resale value and reliability.',
    severity: 'warning',
  },
  'structural damage': {
    title: 'Structural Damage',
    description: 'Evidence of frame or structural damage detected. Major red flag for resale.',
    severity: 'danger',
  },
  'no description': {
    title: 'No Description',
    description: 'Listing lacks description. Cannot assess condition or identify potential issues.',
    severity: 'warning',
  },
};

function getGateInfo(gate: string): { title: string; description: string; severity: 'warning' | 'danger' } {
  const lowerGate = gate.toLowerCase();

  // Check for exact or partial matches
  for (const [key, info] of Object.entries(gateExplanations)) {
    if (lowerGate.includes(key)) {
      return info;
    }
  }

  // Default for unknown gates
  return {
    title: gate.charAt(0).toUpperCase() + gate.slice(1),
    description: 'This factor reduced confidence in the deal.',
    severity: 'warning',
  };
}

interface VerdictReasoningProps {
  reasoning: string;
  className?: string;
}

export function VerdictReasoning({ reasoning, className }: VerdictReasoningProps) {
  const parsed = parseVerdictReasoning(reasoning);

  if (!parsed) {
    // Fallback: just show the raw text in a nicer format
    return (
      <div className={cn('text-sm', className)} style={{ color: 'var(--muted-foreground)' }}>
        {reasoning}
      </div>
    );
  }

  const verdictColors: Record<string, string> = {
    BUY: 'text-green-600 dark:text-green-400',
    WATCH: 'text-yellow-600 dark:text-yellow-400',
    PASS: 'text-red-600 dark:text-red-400',
  };

  // Safe getter for verdict colors with fallback
  const getVerdictColor = (verdict: string) => verdictColors[verdict] || 'text-gray-600 dark:text-gray-400';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Decision Summary */}
      {parsed.wasDowngraded && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg border-l-4 border-yellow-500"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
        >
          <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-300">
              Verdict Downgraded
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              The economics support a <span className={cn('font-semibold', getVerdictColor(parsed.economicTier))}>{parsed.economicTier}</span> rating,
              but risk factors reduced it to <span className={cn('font-semibold', getVerdictColor(parsed.finalVerdict))}>{parsed.finalVerdict}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Economics Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
          <h4 className="font-semibold">Profit Scenarios</h4>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Based on max bid of <span className="font-mono font-medium">{formatCurrency(parsed.maxBid)}</span>
          {parsed.allInCost > parsed.maxBid && (
            <> (total cost with fees: <span className="font-mono font-medium">{formatCurrency(parsed.allInCost)}</span>)</>
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {parsed.scenarios.map((scenario) => (
            <div
              key={scenario.label}
              className="p-4 rounded-lg border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {scenario.label}
              </p>
              <p className="text-lg font-bold font-mono mt-1">
                {formatCurrency(scenario.profit)}
              </p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Sell @ {formatCurrency(scenario.salePrice)}
                </span>
                <span className={cn(
                  'font-medium',
                  scenario.margin >= 0.25 ? 'text-green-600 dark:text-green-400' :
                  scenario.margin >= 0.15 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                )}>
                  {formatPercent(scenario.margin)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Margin Guide */}
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            25%+ Great
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            15-25% Okay
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            &lt;15% Thin
          </span>
        </div>
      </div>

      {/* Risk Gates */}
      {parsed.gates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h4 className="font-semibold">Risk Factors</h4>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            These issues reduced confidence or capped the verdict:
          </p>
          <div className="space-y-3">
            {parsed.gates.map((gate, i) => {
              const info = getGateInfo(gate);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-l-4',
                    info.severity === 'danger' ? 'border-red-500' : 'border-yellow-500'
                  )}
                  style={{
                    backgroundColor: info.severity === 'danger'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                  }}
                >
                  {info.severity === 'danger' ? (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className={cn(
                      'font-medium',
                      info.severity === 'danger'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    )}>
                      {info.title}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {info.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What This Means */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
          <div>
            <p className="font-medium">What This Means</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {parsed.finalVerdict === 'BUY' && (
                <>The numbers work and risk factors are manageable. At your max bid, you should have healthy margins across all sale scenarios.</>
              )}
              {parsed.finalVerdict === 'WATCH' && (
                <>The deal could work, but margins are thin or there are risk factors to consider. Proceed only if you can verify the unknowns or negotiate a lower price.</>
              )}
              {parsed.finalVerdict === 'PASS' && parsed.wasDowngraded && (
                <>While the economics look good on paper, significant risk factors make this deal too uncertain. The unknowns could easily wipe out your profit margin.</>
              )}
              {parsed.finalVerdict === 'PASS' && !parsed.wasDowngraded && (
                <>The numbers don&apos;t support a profitable flip at current prices. Wait for the price to drop or look for a better opportunity.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

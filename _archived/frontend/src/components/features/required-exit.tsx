'use client';

import * as React from 'react';
import { CalculatorIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/format';

// =============================================================================
// Types
// =============================================================================

interface RequiredExitParams {
  totalAllIn: number;
  targetRoiPct: number;
  listingFees: number;
  paymentFeesPct: number;
}

interface RequiredExitResult {
  requiredSalePrice: number;
  requiredNetProceeds: number;
  expectedProfit: number;
  breakdown: {
    totalAllIn: number;
    targetRoiPct: number;
    targetRoiPctDisplay: string;
    listingFees: number;
    paymentFees: number;
    paymentFeesPctDisplay: string;
  };
}

// =============================================================================
// Calculation (matches API implementation)
// =============================================================================

function computeRequiredExitPrice(params: RequiredExitParams): RequiredExitResult {
  const { totalAllIn, targetRoiPct, listingFees, paymentFeesPct } = params;

  // Validate inputs
  if (totalAllIn <= 0) {
    throw new Error('totalAllIn must be positive');
  }

  // Required net proceeds to hit target ROI
  const requiredNetProceeds = totalAllIn * (1 + targetRoiPct);

  // Solve for sale price
  const requiredSalePrice =
    (requiredNetProceeds + listingFees) / (1 - paymentFeesPct);

  // Compute actual payment fees at this sale price
  const paymentFees = requiredSalePrice * paymentFeesPct;

  // Expected profit
  const expectedProfit = requiredSalePrice - listingFees - paymentFees - totalAllIn;

  const roundCurrency = (value: number) => Math.round(value * 100) / 100;

  return {
    requiredSalePrice: roundCurrency(requiredSalePrice),
    requiredNetProceeds: roundCurrency(requiredNetProceeds),
    expectedProfit: roundCurrency(expectedProfit),
    breakdown: {
      totalAllIn: roundCurrency(totalAllIn),
      targetRoiPct,
      targetRoiPctDisplay: `${(targetRoiPct * 100).toFixed(0)}%`,
      listingFees: roundCurrency(listingFees),
      paymentFees: roundCurrency(paymentFees),
      paymentFeesPctDisplay: `${(paymentFeesPct * 100).toFixed(1)}%`,
    },
  };
}

// =============================================================================
// Main Component
// =============================================================================

interface RequiredExitProps {
  /** Total all-in cost (bid + fees + transport + repairs) */
  totalAllIn: number;
  /** Default target ROI (0.20 = 20%) */
  defaultTargetRoi?: number;
  /** Fixed listing fees */
  listingFees?: number;
  /** Payment processing fee rate */
  paymentFeesPct?: number;
  /** Override bid amount (if operator has set one) */
  maxBidOverride?: number;
  className?: string;
}

export function RequiredExit({
  totalAllIn,
  defaultTargetRoi = 0.20,
  listingFees = 150,
  paymentFeesPct = 0.03,
  maxBidOverride,
  className,
}: RequiredExitProps) {
  // Allow operator to override bid amount
  const [bidOverride, setBidOverride] = React.useState<string>(
    maxBidOverride?.toString() || ''
  );

  // Use override if set, otherwise use provided totalAllIn
  const effectiveTotalAllIn = bidOverride
    ? parseFloat(bidOverride) * 1.15 // Rough estimate: bid + 15% fees
    : totalAllIn;

  // Compute result
  const result = React.useMemo(() => {
    if (effectiveTotalAllIn <= 0) return null;
    try {
      return computeRequiredExitPrice({
        totalAllIn: effectiveTotalAllIn,
        targetRoiPct: defaultTargetRoi,
        listingFees,
        paymentFeesPct,
      });
    } catch {
      return null;
    }
  }, [effectiveTotalAllIn, defaultTargetRoi, listingFees, paymentFeesPct]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon className="h-5 w-5" />
          Required Exit Price
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Override Bid Input */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            What-If: Your Bid Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono">$</span>
            <Input
              type="number"
              placeholder={totalAllIn > 0 ? Math.round(totalAllIn / 1.15).toString() : 'Enter bid amount'}
              value={bidOverride}
              onChange={(e) => setBidOverride(e.target.value)}
              className="font-mono"
              min={0}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Estimates total all-in at bid + 15% (fees, transport, etc.)
          </p>
        </div>

        {/* Result */}
        {result ? (
          <div className="space-y-4">
            {/* Main Result */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                To hit {result.breakdown.targetRoiPctDisplay} ROI at {formatCurrency(result.breakdown.totalAllIn)} all-in:
              </p>
              <p className="text-3xl font-bold font-mono mt-2">
                {formatCurrency(result.requiredSalePrice)}
              </p>
              <p className="text-sm mt-1 text-green-600 dark:text-green-400 font-mono">
                +{formatCurrency(result.expectedProfit)} profit
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Total All-In</span>
                <span className="font-mono">{formatCurrency(result.breakdown.totalAllIn)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Target ROI</span>
                <span className="font-mono">{result.breakdown.targetRoiPctDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Required Net Proceeds</span>
                <span className="font-mono">{formatCurrency(result.requiredNetProceeds)}</span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Listing Fees</span>
                <span className="font-mono">−{formatCurrency(result.breakdown.listingFees)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Payment Fees ({result.breakdown.paymentFeesPctDisplay})</span>
                <span className="font-mono">−{formatCurrency(result.breakdown.paymentFees)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                <span>Required Sale Price</span>
                <span className="font-mono">{formatCurrency(result.requiredSalePrice)}</span>
              </div>
            </div>

            {/* Negotiation Copy */}
            <div
              className="p-3 rounded-lg border-l-4 border-blue-500"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            >
              <p className="text-sm font-medium">
                At {formatCurrency(result.breakdown.totalAllIn)} all-in, you need ~{formatCurrency(result.requiredSalePrice)} exit to hit {result.breakdown.targetRoiPctDisplay} ROI
              </p>
            </div>
          </div>
        ) : (
          <div
            className="p-4 rounded-lg text-center"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Enter a bid amount to calculate required exit price
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

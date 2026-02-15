'use client'

import { useState, useMemo } from 'react'
import { Calculator, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface RequiredExitParams {
  totalAllIn: number
  targetRoiPct: number
  listingFees: number
  paymentFeesPct: number
}

interface RequiredExitResult {
  requiredSalePrice: number
  requiredNetProceeds: number
  expectedProfit: number
  breakdown: {
    totalAllIn: number
    targetRoiPct: number
    targetRoiPctDisplay: string
    listingFees: number
    paymentFees: number
    paymentFeesPctDisplay: string
  }
}

// =============================================================================
// Calculation (matches API implementation)
// =============================================================================

function computeRequiredExitPrice(params: RequiredExitParams): RequiredExitResult {
  const { totalAllIn, targetRoiPct, listingFees, paymentFeesPct } = params

  // Validate inputs
  if (totalAllIn <= 0) {
    throw new Error('totalAllIn must be positive')
  }

  // Required net proceeds to hit target ROI
  const requiredNetProceeds = totalAllIn * (1 + targetRoiPct)

  // Solve for sale price
  const requiredSalePrice = (requiredNetProceeds + listingFees) / (1 - paymentFeesPct)

  // Compute actual payment fees at this sale price
  const paymentFees = requiredSalePrice * paymentFeesPct

  // Expected profit
  const expectedProfit = requiredSalePrice - listingFees - paymentFees - totalAllIn

  const roundCurrency = (value: number) => Math.round(value * 100) / 100

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
  }
}

// =============================================================================
// Main Component
// =============================================================================

interface RequiredExitProps {
  /** Total all-in cost (bid + fees + transport + repairs) */
  totalAllIn: number
  /** Default target ROI (0.20 = 20%) */
  defaultTargetRoi?: number
  /** Fixed listing fees */
  listingFees?: number
  /** Payment processing fee rate */
  paymentFeesPct?: number
  /** Override bid amount (if operator has set one) */
  maxBidOverride?: number
  className?: string
}

export function RequiredExit({
  totalAllIn,
  defaultTargetRoi = 0.2,
  listingFees = 150,
  paymentFeesPct = 0.03,
  maxBidOverride,
  className,
}: RequiredExitProps) {
  // Allow operator to override bid amount
  const [bidOverride, setBidOverride] = useState<string>(maxBidOverride?.toString() || '')

  // Use override if set, otherwise use provided totalAllIn
  const effectiveTotalAllIn = bidOverride
    ? parseFloat(bidOverride) * 1.15 // Rough estimate: bid + 15% fees
    : totalAllIn

  // Compute result
  const result = useMemo(() => {
    if (effectiveTotalAllIn <= 0) return null
    try {
      return computeRequiredExitPrice({
        totalAllIn: effectiveTotalAllIn,
        targetRoiPct: defaultTargetRoi,
        listingFees,
        paymentFeesPct,
      })
    } catch {
      return null
    }
  }, [effectiveTotalAllIn, defaultTargetRoi, listingFees, paymentFeesPct])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Required Exit Price
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Override Bid Input */}
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
            <TrendingUp className="h-4 w-4" />
            What-If: Your Bid Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono">$</span>
            <Input
              type="number"
              placeholder={
                totalAllIn > 0 ? Math.round(totalAllIn / 1.15).toString() : 'Enter bid amount'
              }
              value={bidOverride}
              onChange={(e) => setBidOverride(e.target.value)}
              className="font-mono"
              min={0}
            />
          </div>
          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Estimates total all-in at bid + 15% (fees, transport, etc.)
          </p>
        </div>

        {/* Result */}
        {result ? (
          <div className="space-y-4">
            {/* Main Result */}
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                To hit {result.breakdown.targetRoiPctDisplay} ROI at{' '}
                {formatCurrency(result.breakdown.totalAllIn)} all-in:
              </p>
              <p className="text-3xl font-bold font-mono mt-2 text-gray-900 dark:text-white">
                {formatCurrency(result.requiredSalePrice)}
              </p>
              <p className="text-sm mt-1 text-green-600 dark:text-green-400 font-mono">
                +{formatCurrency(result.expectedProfit)} profit
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total All-In</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {formatCurrency(result.breakdown.totalAllIn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Target ROI</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {result.breakdown.targetRoiPctDisplay}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Required Net Proceeds</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {formatCurrency(result.requiredNetProceeds)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-500 dark:text-gray-400">Listing Fees</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  −{formatCurrency(result.breakdown.listingFees)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Payment Fees ({result.breakdown.paymentFeesPctDisplay})
                </span>
                <span className="font-mono text-gray-900 dark:text-white">
                  −{formatCurrency(result.breakdown.paymentFees)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white">Required Sale Price</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {formatCurrency(result.requiredSalePrice)}
                </span>
              </div>
            </div>

            {/* Negotiation Copy */}
            <div className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                At {formatCurrency(result.breakdown.totalAllIn)} all-in, you need ~
                {formatCurrency(result.requiredSalePrice)} exit to hit{' '}
                {result.breakdown.targetRoiPctDisplay} ROI
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg text-center bg-gray-100 dark:bg-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter a bid amount to calculate required exit price
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

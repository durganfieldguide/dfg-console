'use client';

import * as React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { formatPercent } from '@/lib/utils/format';
import {
  Banknote,
  Wrench,
  ReceiptText,
  Calculator,
  TrendingDown,
  Info,
} from 'lucide-react';

interface CostItem {
  label: string;
  amount: number;
  icon: React.ReactNode;
  description?: string;
  isOptional?: boolean;
}

interface InvestmentBreakdownProps {
  currentBid: number | null;
  maxBid?: number;
  buyerPremium?: number; // percentage, e.g., 0.15
  salesTax?: number; // percentage, e.g., 0.086
  estimatedRepairs?: number;
  transportCost?: number;
  otherFees?: number;
  className?: string;
}

export function InvestmentBreakdown({
  currentBid,
  maxBid,
  buyerPremium = 0.15,
  salesTax = 0.086,
  estimatedRepairs = 0,
  transportCost = 0,
  otherFees = 0,
  className,
}: InvestmentBreakdownProps) {
  // Use max bid if available, otherwise use current bid for calculations
  const bidBasis = maxBid || currentBid || 0;

  // Calculate fees
  const buyerPremiumAmount = bidBasis * buyerPremium;
  const taxableAmount = bidBasis + buyerPremiumAmount;
  const salesTaxAmount = taxableAmount * salesTax;

  // Total all-in cost
  const subtotal = bidBasis + buyerPremiumAmount + salesTaxAmount;
  const totalInvestment = subtotal + estimatedRepairs + transportCost + otherFees;

  // Build cost items
  const costItems: CostItem[] = [
    {
      label: maxBid ? 'Max Bid' : 'Current Bid',
      amount: bidBasis,
      icon: <Banknote className="h-5 w-5" />,
      description: maxBid
        ? 'The highest price you should pay at auction'
        : 'Current winning bid amount',
    },
    {
      label: `Buyer Premium (${formatPercent(buyerPremium)})`,
      amount: buyerPremiumAmount,
      icon: <ReceiptText className="h-5 w-5" />,
      description: 'Fee charged by the auction house on top of your winning bid',
    },
    {
      label: `Sales Tax (${formatPercent(salesTax)})`,
      amount: salesTaxAmount,
      icon: <ReceiptText className="h-5 w-5" />,
      description: 'State/local tax on the purchase',
    },
  ];

  if (estimatedRepairs > 0) {
    costItems.push({
      label: 'Estimated Repairs',
      amount: estimatedRepairs,
      icon: <Wrench className="h-5 w-5" />,
      description: 'Projected cost to bring the vehicle to sellable condition',
    });
  }

  if (transportCost > 0) {
    costItems.push({
      label: 'Transport',
      amount: transportCost,
      icon: <TrendingDown className="h-5 w-5" />,
      description: 'Cost to move the vehicle from auction to your location',
      isOptional: true,
    });
  }

  if (otherFees > 0) {
    costItems.push({
      label: 'Other Fees',
      amount: otherFees,
      icon: <Calculator className="h-5 w-5" />,
      description: 'Additional costs (title transfer, registration, etc.)',
      isOptional: true,
    });
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Total */}
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: 'var(--primary)',
          background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.05) 0%, rgba(107, 114, 128, 0.1) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Total Investment
            </p>
            <p className="text-3xl font-bold font-mono">
              {formatCurrency(totalInvestment)}
            </p>
          </div>
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
          >
            <Calculator className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        {maxBid && currentBid !== null && currentBid < maxBid && (
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Based on max bid of {formatCurrency(maxBid)}. Current bid is {formatCurrency(currentBid)}.
          </p>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2">
        {costItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <span style={{ color: 'var(--muted-foreground)' }}>{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.isOptional && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                  >
                    Optional
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {item.description}
                </p>
              )}
            </div>
            <span className="font-mono font-medium text-sm">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Subtotal line */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Auction Subtotal (before repairs)
        </span>
        <span className="font-mono font-medium">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* Educational Note */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-medium">Understanding Your Investment</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            The total investment is what you&apos;ll actually spend before selling.
            This includes auction fees that can add 15-25% to your winning bid.
            Always factor in repairs to avoid surprise costs.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { HelpCircle, Info } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--popover)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--popover)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--popover)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--popover)] border-y-transparent border-l-transparent',
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          className={cn(
            'absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg max-w-xs',
            'animate-in fade-in-0 zoom-in-95 duration-100',
            positionClasses[side]
          )}
          style={{
            backgroundColor: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
          }}
          role="tooltip"
        >
          {content}
          <span
            className={cn('absolute border-4', arrowClasses[side])}
            style={{ borderWidth: '6px' }}
          />
        </span>
      )}
    </span>
  );
}

interface HelpTooltipProps {
  term: string;
  explanation: string;
  learnMoreUrl?: string;
  variant?: 'question' | 'info';
  size?: 'sm' | 'md';
}

// Predefined explanations for common terms
const termExplanations: Record<string, { explanation: string; learnMoreUrl?: string }> = {
  'confidence': {
    explanation: 'How certain we are about this analysis. Higher confidence means more reliable data was available (photos, description, market comps). 5 dots = very confident, 1 dot = limited information.',
  },
  'max bid': {
    explanation: 'The highest price you should pay at auction to maintain your target profit margin. Going above this risks losing money on the flip.',
  },
  'retail estimate': {
    explanation: 'What you can expect to sell this vehicle for on the retail market after repairs. Based on comparable sales in your area.',
  },
  'expected profit': {
    explanation: 'Projected profit after all costs: winning bid, auction fees, repairs, and holding costs. This assumes you sell at the retail estimate.',
  },
  'expected margin': {
    explanation: 'Profit as a percentage of your total investment. A 20%+ margin is generally considered good for flipping.',
  },
  'buyer premium': {
    explanation: 'A fee charged by the auction house on top of your winning bid, typically 10-15%. This is added to your total cost.',
  },
  'sales tax': {
    explanation: 'State/local tax applied to vehicle purchases. Varies by location. Factor this into your all-in cost.',
  },
  'verdict': {
    explanation: 'Our recommendation: BUY means bid up to max bid if gates clear, WATCH means needs more info or price drop, PASS means do not spend more time.',
  },
  'economic tier': {
    explanation: 'Classifies the deal quality: STRONG (25%+ margin), ACCEPTABLE (15-25%), MODERATE (5-15%), or POOR (<5%).',
  },
  'deal killers': {
    explanation: 'Serious issues that could result in significant financial loss. Critical items should make you walk away, major concerns need careful evaluation.',
  },
  'inspection priorities': {
    explanation: 'Items to verify before purchasing. Critical items affect safety/legality, high priority items affect reliability and resale.',
  },
  'repair plan': {
    explanation: 'Estimated repairs needed to make the vehicle retail-ready. Critical repairs affect safety, cosmetic repairs improve sale price.',
  },
  'target buyer': {
    explanation: 'The most likely type of person to purchase this vehicle. Understanding your buyer helps with pricing and marketing.',
  },
  'perceived value': {
    explanation: 'What buyers in the market are willing to pay based on condition, features, and comparable listings.',
  },
  'days on market': {
    explanation: 'How long similar vehicles typically take to sell. Faster sales mean less holding cost and risk.',
  },
  'score': {
    explanation: 'Overall deal quality on a 0-100 scale combining profit potential, confidence, risk factors, and market demand.',
  },
};

export function HelpTooltip({ term, explanation, learnMoreUrl, variant = 'question', size = 'sm' }: HelpTooltipProps) {
  // Use predefined explanation if available
  const predefined = termExplanations[term.toLowerCase()];
  const finalExplanation = explanation || predefined?.explanation || `Information about ${term}`;
  const finalUrl = learnMoreUrl || predefined?.learnMoreUrl;

  const Icon = variant === 'question' ? HelpCircle : Info;
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <p>{finalExplanation}</p>
          {finalUrl && (
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-400"
            >
              Learn more →
            </a>
          )}
        </div>
      }
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        style={{ color: 'var(--muted-foreground)' }}
        aria-label={`Help: ${term}`}
      >
        <Icon className={sizeClasses} />
      </button>
    </Tooltip>
  );
}

// Inline help - wraps text with tooltip
interface InlineHelpProps {
  term: string;
  children: React.ReactNode;
  explanation?: string;
}

export function InlineHelp({ term, children, explanation }: InlineHelpProps) {
  const predefined = termExplanations[term.toLowerCase()];
  const finalExplanation = explanation || predefined?.explanation || `Information about ${term}`;

  return (
    <Tooltip content={finalExplanation}>
      <span
        className="underline decoration-dotted decoration-muted-foreground/50 cursor-help"
        style={{ textDecorationColor: 'var(--muted-foreground)' }}
      >
        {children}
      </span>
    </Tooltip>
  );
}

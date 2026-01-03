'use client';

import { Ban, AlertOctagon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/**
 * Operator inputs types (simplified for this component)
 */
interface OperatorInputs {
  title?: {
    titleStatus?: { value: string; verificationLevel?: string };
    lienStatus?: { value: string; verificationLevel?: string };
  };
}

interface KillSwitchBannerProps {
  operatorInputs: OperatorInputs | null;
  className?: string;
}

/**
 * Kill switch conditions that should block bidding
 */
const KILL_SWITCHES = [
  {
    field: 'title_status',
    check: (inputs: OperatorInputs) => {
      const status = inputs?.title?.titleStatus?.value;
      const verification = inputs?.title?.titleStatus?.verificationLevel;
      const isVerified = verification && ['operator_attested', 'documented', 'third_party_confirmed'].includes(verification);
      return isVerified && status === 'salvage' ? 'Salvage Title' : null;
    },
    severity: 'critical' as const,
  },
  {
    field: 'title_status',
    check: (inputs: OperatorInputs) => {
      const status = inputs?.title?.titleStatus?.value;
      const verification = inputs?.title?.titleStatus?.verificationLevel;
      const isVerified = verification && ['operator_attested', 'documented', 'third_party_confirmed'].includes(verification);
      return isVerified && status === 'parts_only' ? 'Parts Only' : null;
    },
    severity: 'critical' as const,
  },
  {
    field: 'lien_status',
    check: (inputs: OperatorInputs) => {
      const status = inputs?.title?.lienStatus?.value;
      const verification = inputs?.title?.lienStatus?.verificationLevel;
      const isVerified = verification && ['operator_attested', 'documented', 'third_party_confirmed'].includes(verification);
      return isVerified && status === 'lien_present' ? 'Lien Present' : null;
    },
    severity: 'warning' as const,
  },
];

/**
 * Displays kill switch badges for verified disqualifying conditions.
 * These are deal-breakers that should prevent bidding.
 */
export function KillSwitchBanner({ operatorInputs, className }: KillSwitchBannerProps) {
  if (!operatorInputs) return null;

  const activeKillSwitches = KILL_SWITCHES
    .map(ks => ({
      ...ks,
      label: ks.check(operatorInputs),
    }))
    .filter(ks => ks.label !== null);

  if (activeKillSwitches.length === 0) return null;

  const hasCritical = activeKillSwitches.some(ks => ks.severity === 'critical');

  return (
    <Card className={cn(
      'border-2',
      hasCritical
        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
        : 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
      className
    )}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-full',
            hasCritical
              ? 'bg-red-500 text-white'
              : 'bg-orange-400 text-white'
          )}>
            {hasCritical ? (
              <Ban className="h-5 w-5" />
            ) : (
              <AlertOctagon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={cn(
              'font-semibold text-sm',
              hasCritical
                ? 'text-red-700 dark:text-red-300'
                : 'text-orange-700 dark:text-orange-300'
            )}>
              {hasCritical ? 'Deal Breaker Detected' : 'Warning Flag'}
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {activeKillSwitches.map((ks, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    ks.severity === 'critical'
                      ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                      : 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                  )}
                >
                  {ks.label}
                </span>
              ))}
            </div>
          </div>
          <p className={cn(
            'text-xs max-w-[150px] text-right',
            hasCritical
              ? 'text-red-600 dark:text-red-400'
              : 'text-orange-600 dark:text-orange-400'
          )}>
            {hasCritical
              ? 'This opportunity will be auto-rejected'
              : 'Review before proceeding'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

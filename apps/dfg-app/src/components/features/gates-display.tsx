'use client';

import { CheckCircle, XCircle, AlertCircle, HelpCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type GateStatus = 'passed' | 'failed' | 'unknown' | 'not_applicable';

export interface Gate {
  name: string;
  status: GateStatus;
  reason?: string;
  isCritical: boolean;
}

export interface ComputedGates {
  gates: Gate[];
  allCriticalPassed: boolean;
  passedCount: number;
  totalCount: number;
  summary: string;
}

// =============================================================================
// Gate Status Icon
// =============================================================================

function GateStatusIcon({ status }: { status: GateStatus }) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'unknown':
      return <HelpCircle className="h-5 w-5 text-yellow-500" />;
    case 'not_applicable':
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
}

// =============================================================================
// Gate Names
// =============================================================================

const gateLabels: Record<string, string> = {
  title_status: 'Title Status',
  title_in_hand: 'Title In Hand',
  lien_status: 'Lien Status',
  mileage: 'Mileage Verified',
  vin: 'VIN Confirmed',
};

// =============================================================================
// Main Component
// =============================================================================

interface GatesDisplayProps {
  gates?: ComputedGates | null;
  className?: string;
}

export function GatesDisplay({ gates, className }: GatesDisplayProps) {
  if (!gates) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bid Readiness Gates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No gate information available</p>
            <p className="text-xs mt-1">Complete title inputs to see gate status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalGates = gates.gates.filter((g) => g.isCritical);
  const confidenceGates = gates.gates.filter((g) => !g.isCritical);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bid Readiness Gates
          </div>
          <span
            className={cn(
              'text-sm font-normal px-2 py-1 rounded',
              gates.allCriticalPassed
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            )}
          >
            {gates.passedCount}/{gates.totalCount} passed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div
          className={cn(
            'p-3 rounded-lg text-sm',
            gates.allCriticalPassed
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
          )}
        >
          {gates.summary}
        </div>

        {/* Critical Gates */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Critical Gates
          </h4>
          <div className="space-y-2">
            {criticalGates.map((gate) => (
              <div
                key={gate.name}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <GateStatusIcon status={gate.status} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {gateLabels[gate.name] || gate.name}
                  </span>
                </div>
                {gate.reason && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {gate.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Gates */}
        {confidenceGates.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Confidence Gates
            </h4>
            <div className="space-y-2">
              {confidenceGates.map((gate) => (
                <div
                  key={gate.name}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <GateStatusIcon status={gate.status} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {gateLabels[gate.name] || gate.name}
                    </span>
                  </div>
                  {gate.reason && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {gate.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

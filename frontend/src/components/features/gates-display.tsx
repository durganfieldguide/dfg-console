'use client';

import * as React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// =============================================================================
// Types (matching dfg-api types)
// =============================================================================

export type GateSeverity = 'CRITICAL' | 'CONFIDENCE';
export type GateStatus = 'open' | 'cleared';

export interface Gate {
  id: string;
  label: string;
  severity: GateSeverity;
  status: GateStatus;
  clearedBy?: string;
  blocksAction: boolean;
}

export interface ComputedGates {
  gates: Gate[];
  criticalOpen: number;
  confidenceOpen: number;
  allCriticalCleared: boolean;
  bidActionEnabled: boolean;
}

// =============================================================================
// Gate Item Component
// =============================================================================

interface GateItemProps {
  gate: Gate;
}

function GateItem({ gate }: GateItemProps) {
  const isCleared = gate.status === 'cleared';
  const isCritical = gate.severity === 'CRITICAL';

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isCleared
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
          : isCritical
            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
      }`}
    >
      <div className="flex items-center gap-3">
        {isCleared ? (
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : isCritical ? (
          <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        )}
        <div>
          <p className="font-medium text-sm">{gate.label}</p>
          {gate.clearedBy && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {gate.clearedBy}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            isCritical
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
          }`}
        >
          {isCritical ? 'Critical' : 'Confidence'}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            isCleared
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {isCleared ? 'Cleared' : 'Open'}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface GatesDisplayProps {
  gates: ComputedGates | null;
  className?: string;
}

export function GatesDisplay({ gates, className }: GatesDisplayProps) {
  if (!gates) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Gates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No gate information available
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalGates = gates.gates.filter((g) => g.severity === 'CRITICAL');
  const confidenceGates = gates.gates.filter((g) => g.severity === 'CONFIDENCE');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {gates.bidActionEnabled ? (
              <>
                <LockOpenIcon className="h-5 w-5 text-green-600" />
                <span className="text-green-600">Bid Enabled</span>
              </>
            ) : (
              <>
                <LockClosedIcon className="h-5 w-5 text-red-600" />
                <span className="text-red-600">Bid Blocked</span>
              </>
            )}
          </span>
          <div className="flex gap-2 text-xs font-normal">
            {gates.criticalOpen > 0 && (
              <span className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {gates.criticalOpen} critical open
              </span>
            )}
            {gates.confidenceOpen > 0 && (
              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {gates.confidenceOpen} confidence open
              </span>
            )}
            {gates.allCriticalCleared && gates.confidenceOpen === 0 && (
              <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                All cleared
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Gates */}
        {criticalGates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <XCircleIcon className="h-4 w-4 text-red-600" />
              Critical Gates
              <span className="text-xs font-normal" style={{ color: 'var(--muted-foreground)' }}>
                (Must clear to bid)
              </span>
            </h4>
            <div className="space-y-2">
              {criticalGates.map((gate) => (
                <GateItem key={gate.id} gate={gate} />
              ))}
            </div>
          </div>
        )}

        {/* Confidence Gates */}
        {confidenceGates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
              Confidence Gates
              <span className="text-xs font-normal" style={{ color: 'var(--muted-foreground)' }}>
                (Recommended to clear)
              </span>
            </h4>
            <div className="space-y-2">
              {confidenceGates.map((gate) => (
                <GateItem key={gate.id} gate={gate} />
              ))}
            </div>
          </div>
        )}

        {/* Action message */}
        {!gates.bidActionEnabled && (
          <div
            className="p-3 rounded-lg border-l-4 border-red-500"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Clear all critical gates before bidding
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {gates.criticalOpen} critical gate{gates.criticalOpen === 1 ? '' : 's'} remaining
            </p>
          </div>
        )}

        {gates.bidActionEnabled && gates.confidenceOpen > 0 && (
          <div
            className="p-3 rounded-lg border-l-4 border-yellow-500"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
          >
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              Bid enabled, but confidence gates remain open
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Consider clearing {gates.confidenceOpen} confidence gate{gates.confidenceOpen === 1 ? '' : 's'} for better certainty
            </p>
          </div>
        )}

        {gates.allCriticalCleared && gates.confidenceOpen === 0 && (
          <div
            className="p-3 rounded-lg border-l-4 border-green-500"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              All gates cleared - ready to bid
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Title information is verified and complete
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

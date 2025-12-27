/**
 * DFG App - Gate Computation
 *
 * Gates are always computed at render time from current listing + operator inputs.
 * Never store gate status as source of truth.
 *
 * Location: src/domain/gates.ts
 */

import type {
  OperatorInputs,
  Gate,
  ComputedGates,
  GateSeverity,
  VerificationLevel,
  ListingFacts,
} from '../core/types';

// =============================================================================
// Gate Definitions
// =============================================================================

interface GateDefinition {
  id: string;
  label: string;
  severity: GateSeverity;
  check: (listing: ListingFacts, inputs: OperatorInputs | null) => GateCheckResult;
}

interface GateCheckResult {
  cleared: boolean;
  clearedBy?: string;
}

// Minimum verification level to clear a gate
const MIN_VERIFICATION_LEVEL: VerificationLevel = 'operator_attested';

function meetsVerificationThreshold(level: VerificationLevel | undefined): boolean {
  if (!level) return false;
  const levels: VerificationLevel[] = [
    'unverified',
    'operator_attested',
    'documented',
    'third_party_confirmed',
  ];
  return levels.indexOf(level) >= levels.indexOf(MIN_VERIFICATION_LEVEL);
}

// =============================================================================
// Gate Definitions (v1 - Title Only)
// =============================================================================

const GATE_DEFINITIONS: GateDefinition[] = [
  {
    id: 'title_status_unknown',
    label: 'Title Status',
    severity: 'CRITICAL',
    check: (_listing, inputs) => {
      const field = inputs?.title?.titleStatus;
      if (!field) return { cleared: false };
      if (field.value === 'unknown') return { cleared: false };
      if (!meetsVerificationThreshold(field.verificationLevel)) {
        return { cleared: false };
      }
      return {
        cleared: true,
        clearedBy: `${field.value}, ${field.verificationLevel}`,
      };
    },
  },
  {
    id: 'title_in_hand_unknown',
    label: 'Title In Hand',
    severity: 'CRITICAL',
    check: (_listing, inputs) => {
      const field = inputs?.title?.titleInHand;
      if (!field) return { cleared: false };
      if (field.value === 'unknown') return { cleared: false };
      if (!meetsVerificationThreshold(field.verificationLevel)) {
        return { cleared: false };
      }
      return {
        cleared: true,
        clearedBy: `${field.value}, ${field.verificationLevel}`,
      };
    },
  },
  {
    id: 'lien_status_unknown',
    label: 'Lien Status',
    severity: 'CRITICAL',
    check: (_listing, inputs) => {
      const field = inputs?.title?.lienStatus;
      if (!field) return { cleared: false };
      if (field.value === 'unknown') return { cleared: false };
      if (!meetsVerificationThreshold(field.verificationLevel)) {
        return { cleared: false };
      }
      return {
        cleared: true,
        clearedBy: `${field.value}, ${field.verificationLevel}`,
      };
    },
  },
  {
    id: 'mileage_unknown',
    label: 'Mileage',
    severity: 'CRITICAL',
    check: (listing, inputs) => {
      // Can be cleared by listing OR operator input
      const operatorField = inputs?.title?.odometerMiles;

      // Operator input takes precedence
      if (operatorField && meetsVerificationThreshold(operatorField.verificationLevel)) {
        return {
          cleared: true,
          clearedBy: `${operatorField.value.toLocaleString()} mi, ${operatorField.verificationLevel}`,
        };
      }

      // Fall back to listing (but mark as listing-sourced)
      if (listing.odometerMiles !== undefined && listing.odometerMiles > 0) {
        return {
          cleared: true,
          clearedBy: `${listing.odometerMiles.toLocaleString()} mi (listing)`,
        };
      }

      return { cleared: false };
    },
  },
  {
    id: 'vin_unknown',
    label: 'VIN',
    severity: 'CONFIDENCE',
    check: (listing, inputs) => {
      const operatorField = inputs?.title?.vin;

      if (operatorField && meetsVerificationThreshold(operatorField.verificationLevel)) {
        return {
          cleared: true,
          clearedBy: `${operatorField.value}, ${operatorField.verificationLevel}`,
        };
      }

      if (listing.vin && listing.vin.length === 17) {
        return {
          cleared: true,
          clearedBy: `${listing.vin} (listing)`,
        };
      }

      return { cleared: false };
    },
  },
];

// =============================================================================
// Main Computation Function
// =============================================================================

/**
 * Compute all gates from current listing facts + operator inputs.
 *
 * IMPORTANT: This must be called at render time. Do not cache results
 * as source of truth. Snapshots in analysis_runs are for audit only.
 */
export function computeGates(
  listing: ListingFacts,
  operatorInputs: OperatorInputs | null
): ComputedGates {
  const gates: Gate[] = GATE_DEFINITIONS.map((def) => {
    const result = def.check(listing, operatorInputs);
    return {
      id: def.id,
      label: def.label,
      severity: def.severity,
      status: result.cleared ? 'cleared' : 'open',
      clearedBy: result.clearedBy,
      blocksAction: def.severity === 'CRITICAL' && !result.cleared,
    };
  });

  const criticalOpen = gates.filter(
    (g) => g.severity === 'CRITICAL' && g.status === 'open'
  ).length;

  const confidenceOpen = gates.filter(
    (g) => g.severity === 'CONFIDENCE' && g.status === 'open'
  ).length;

  return {
    gates,
    criticalOpen,
    confidenceOpen,
    allCriticalCleared: criticalOpen === 0,
    bidActionEnabled: criticalOpen === 0,
  };
}

/**
 * Get list of blocking gates (for UI messaging)
 */
export function getBlockingGates(gates: ComputedGates): Gate[] {
  return gates.gates.filter((g) => g.blocksAction);
}

/**
 * Format a message explaining why bid is blocked
 */
export function formatBlockedMessage(gates: ComputedGates): string | null {
  const blocking = getBlockingGates(gates);
  if (blocking.length === 0) return null;

  if (blocking.length === 1) {
    return `Clear ${blocking[0].label} gate to bid`;
  }

  return `Clear ${blocking.length} gates to bid: ${blocking.map(g => g.label).join(', ')}`;
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  XCircleIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type DealKillerSeverity = 'critical' | 'major' | 'minor';

interface DealKiller {
  issue: string;
  explanation: string;
  severity: DealKillerSeverity;
  mitigation?: string;
}

interface DealKillersProps {
  items: DealKiller[];
  className?: string;
}

const severityConfig: Record<DealKillerSeverity, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: {
    label: 'Deal Breaker',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: <XCircleIcon className="h-5 w-5" />,
  },
  major: {
    label: 'Major Concern',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: <ShieldExclamationIcon className="h-5 w-5" />,
  },
  minor: {
    label: 'Minor Issue',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
  },
};

// Known deal killer explanations
const dealKillerExplanations: Record<string, { explanation: string; severity: DealKillerSeverity; mitigation?: string }> = {
  'salvage title': {
    explanation: 'Vehicle was declared a total loss by insurance. Significantly reduces resale value and may have hidden damage.',
    severity: 'critical',
    mitigation: 'Get a thorough pre-purchase inspection and factor 30-50% lower resale value into your calculations.',
  },
  'rebuilt title': {
    explanation: 'Previously salvage, now repaired and inspected. Still carries stigma and lower resale value.',
    severity: 'major',
    mitigation: 'Request repair documentation and have a mechanic verify the work quality.',
  },
  'flood damage': {
    explanation: 'Water intrusion can cause hidden electrical issues, mold, and corrosion that appear months later.',
    severity: 'critical',
    mitigation: 'Avoid unless you have expertise in flood vehicle restoration.',
  },
  'frame damage': {
    explanation: 'Structural damage affects safety and handling. Difficult and expensive to repair properly.',
    severity: 'critical',
  },
  'structural damage': {
    explanation: 'Compromised structural integrity means the vehicle may not protect occupants properly in a crash.',
    severity: 'critical',
  },
  'odometer rollback': {
    explanation: 'Mileage has been tampered with. This is illegal and indicates a dishonest seller.',
    severity: 'critical',
  },
  'missing title': {
    explanation: 'No title means you cannot legally register or sell the vehicle. May indicate liens or theft.',
    severity: 'critical',
    mitigation: 'Verify you can obtain a bonded title or duplicate title before purchasing.',
  },
  'unknown title status': {
    explanation: 'Cannot verify the title is clean. Could have liens, salvage history, or other issues.',
    severity: 'major',
    mitigation: 'Run a Carfax or AutoCheck report before bidding.',
  },
  'lien on title': {
    explanation: 'Another party has a financial claim on the vehicle. You may inherit this debt.',
    severity: 'critical',
    mitigation: 'Ensure lien is satisfied before taking ownership.',
  },
  'engine issues': {
    explanation: 'Engine problems can be extremely expensive to repair, often exceeding vehicle value.',
    severity: 'major',
    mitigation: 'Get a compression test and listen for unusual noises before purchasing.',
  },
  'transmission issues': {
    explanation: 'Transmission repairs or replacements are costly, often $2,000-$5,000+.',
    severity: 'major',
    mitigation: 'Test drive extensively and check for slipping or delayed shifts.',
  },
  'airbag deployment': {
    explanation: 'Deployed airbags indicate a significant collision. Replacement costs are high.',
    severity: 'major',
    mitigation: 'Verify all airbags have been properly replaced with OEM parts.',
  },
  'high mileage': {
    explanation: 'Above-average mileage means more wear and potential for mechanical issues.',
    severity: 'minor',
    mitigation: 'Factor in timing belt, suspension, and other high-mileage services.',
  },
  'limited photos': {
    explanation: 'Sellers hiding damage often use few photos. Cannot assess true condition.',
    severity: 'minor',
    mitigation: 'Request additional photos or plan for in-person inspection before bidding high.',
  },
  'no description': {
    explanation: 'Lack of description may hide problems. Harder to assess value.',
    severity: 'minor',
    mitigation: 'Contact seller for details or assume worst-case condition.',
  },
  // Fraud and verification issues
  'fraud': {
    explanation: 'Potential fraud detected. The listing may be misrepresenting what is actually being sold.',
    severity: 'critical',
    mitigation: 'Do not bid until you can verify the item in person or get additional proof from the seller.',
  },
  'wrong image': {
    explanation: 'The photos do not match what is being advertised. This is a major red flag.',
    severity: 'critical',
    mitigation: 'Request correct photos from seller. Do not bid based on mismatched images.',
  },
  'image shows car instead of trailer': {
    explanation: 'The listing photos show a vehicle instead of the advertised trailer. Possible fraud or listing error.',
    severity: 'critical',
    mitigation: 'Contact seller immediately for correct photos. Do not bid until verified.',
  },
  'no verification': {
    explanation: 'Cannot verify that the advertised item actually exists or matches the listing.',
    severity: 'major',
    mitigation: 'Request proof of existence (VIN photos, in-person viewing) before bidding.',
  },
  'cannot assess': {
    explanation: 'Insufficient information to properly evaluate the item. Too much uncertainty.',
    severity: 'major',
    mitigation: 'Request additional photos, documentation, or arrange an in-person inspection.',
  },
  'cannot assess actual condition': {
    explanation: 'Without proper photos or inspection, the true condition is unknown. You could be buying blind.',
    severity: 'major',
    mitigation: 'Do not bid high without verifying condition. Assume worst-case scenario in your calculations.',
  },
  'possible scam': {
    explanation: 'Multiple red flags suggest this listing may be fraudulent.',
    severity: 'critical',
    mitigation: 'Avoid this listing. Report to the auction platform if suspicious.',
  },
  'misrepresentation': {
    explanation: 'The listing appears to misrepresent what is being sold.',
    severity: 'critical',
    mitigation: 'Verify all claims before bidding. Consider reporting to the platform.',
  },
};

// Helper to determine root cause for deduplication
function getRootCause(text: string): string {
  const lower = text.toLowerCase();

  // Identity/mismatch related
  if (lower.includes('mismatch') || lower.includes('wrong') || (lower.includes('image') && lower.includes('car')) ||
      lower.includes('photo shows') || lower.includes('doesn\'t match')) {
    return 'identity_mismatch';
  }
  // Title related
  if (lower.includes('title') || lower.includes('salvage') || lower.includes('lien')) {
    return 'title_issue';
  }
  // Fraud related
  if (lower.includes('fraud') || lower.includes('scam') || lower.includes('suspicious')) {
    return 'fraud_concern';
  }
  // Verification/existence
  if (lower.includes('verify') && lower.includes('exist') || lower.includes('no verification')) {
    return 'existence_concern';
  }
  // Flood/damage
  if (lower.includes('flood') || lower.includes('water damage')) {
    return 'flood_damage';
  }
  // Frame/structural
  if (lower.includes('frame') || lower.includes('structural')) {
    return 'structural_damage';
  }
  // Photos
  if (lower.includes('photo') || lower.includes('image') || lower.includes('picture')) {
    return 'photo_issue';
  }

  return text.slice(0, 30); // Use truncated text as fallback
}

// Parse raw deal killers text into structured items
export function parseDealKillers(raw: string | string[] | any[]): DealKiller[] {
  if (!raw) return [];

  // Handle case where raw is already an array of objects with concern/description
  let lines: string[] = [];

  if (Array.isArray(raw)) {
    lines = raw.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        // Handle object format like { concern: "...", severity: "..." }
        return item.concern || item.description || item.issue || item.text || String(item);
      }
      return String(item);
    }).filter(l => l && l.length > 0);
  } else if (typeof raw === 'string') {
    lines = raw.split(/[;\n]/).map(l => l.trim()).filter(l => l.length > 0);
  }

  if (lines.length === 0) return [];

  const items: DealKiller[] = [];
  const seenRootCauses = new Set<string>();

  for (const line of lines) {
    // Ensure line is a string before calling string methods
    const lineStr = typeof line === 'string' ? line : String(line || '');
    const cleanLine = lineStr.replace(/^[-•*]\s*/, '').trim();
    if (cleanLine.length === 0) continue;

    const lowerLine = cleanLine.toLowerCase();
    const rootCause = getRootCause(lowerLine);

    // Skip if we've already seen this root cause (deduplication)
    if (seenRootCauses.has(rootCause)) continue;
    seenRootCauses.add(rootCause);

    // Try to find a matching known deal killer
    let matched = false;
    for (const [key, info] of Object.entries(dealKillerExplanations)) {
      if (lowerLine.includes(key)) {
        items.push({
          issue: cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1),
          explanation: info.explanation,
          severity: info.severity,
          mitigation: info.mitigation,
        });
        matched = true;
        break;
      }
    }

    // Default for unknown issues
    if (!matched) {
      items.push({
        issue: cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1),
        explanation: 'This issue may affect the vehicle value or your ability to flip it profitably.',
        severity: 'minor',
      });
    }
  }

  // Sort by severity
  const severityOrder: DealKillerSeverity[] = ['critical', 'major', 'minor'];
  items.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return items;
}

export function DealKillers({ items, className }: DealKillersProps) {
  if (items.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-green-500"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
        >
          <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">No Red Flags Found</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              No major red flags identified. Always do your own due diligence.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = items.filter(i => i.severity === 'critical').length;
  const majorCount = items.filter(i => i.severity === 'major').length;
  const minorCount = items.filter(i => i.severity === 'minor').length;

  // Dynamic headline based on what's actually found
  // NEVER say "Confirmed" - we can only say "observed" or "potential"
  // Critical items are RED FLAGS that should stop the deal IF TRUE
  const getHeadline = () => {
    if (criticalCount > 0) {
      return `${criticalCount} Critical Red Flag${criticalCount !== 1 ? 's' : ''}`;
    }
    if (majorCount > 0) {
      return `${majorCount} Major Concern${majorCount !== 1 ? 's' : ''}`;
    }
    return `${minorCount} Item${minorCount !== 1 ? 's' : ''} to Verify`;
  };

  // Dynamic border/background color based on severity
  const getHeaderStyle = () => {
    if (criticalCount > 0) {
      return {
        borderColor: 'rgb(239, 68, 68)',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        textColor: 'text-red-700 dark:text-red-300',
        iconColor: 'text-red-600 dark:text-red-400'
      };
    }
    if (majorCount > 0) {
      return {
        borderColor: 'rgb(249, 115, 22)',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        textColor: 'text-orange-700 dark:text-orange-300',
        iconColor: 'text-orange-600 dark:text-orange-400'
      };
    }
    return {
      borderColor: 'rgb(245, 158, 11)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    };
  };

  const headerStyle = getHeaderStyle();
  const HeaderIcon = criticalCount > 0 ? ShieldExclamationIcon : ExclamationTriangleIcon;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header - dynamic based on severity */}
      <div
        className="p-4 rounded-lg border-l-4"
        style={{
          borderColor: headerStyle.borderColor,
          backgroundColor: headerStyle.bgColor
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HeaderIcon className={cn('h-8 w-8', headerStyle.iconColor)} />
            <div>
              <p className={cn('font-bold text-lg', headerStyle.textColor)}>
                {getHeadline()}
              </p>
              <div className="flex items-center gap-3 text-xs mt-0.5">
                {criticalCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {criticalCount} critical
                  </span>
                )}
                {majorCount > 0 && (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {majorCount} major
                  </span>
                )}
                {minorCount > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {minorCount} minor
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {criticalCount > 0 && (
          <p className="text-sm mt-3 text-red-700 dark:text-red-300">
            These are potential deal breakers IF TRUE. Verify each item before walking away or adjust your max bid accordingly.
          </p>
        )}
        {criticalCount === 0 && majorCount > 0 && (
          <p className="text-sm mt-3 text-orange-700 dark:text-orange-300">
            Major concerns detected. Verify before treating as deal breakers.
          </p>
        )}
      </div>

      {/* Deal Killer Items */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const config = severityConfig[item.severity];
          return (
            <div
              key={index}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="flex items-start gap-3 p-4"
                style={{ backgroundColor: config.bgColor }}
              >
                <span className={cn('flex-shrink-0 mt-0.5', config.color)}>
                  {config.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-semibold', config.color)}>
                      {item.issue}
                    </span>
                    <span
                      className={cn('text-xs px-2 py-0.5 rounded-full', config.color)}
                      style={{ backgroundColor: 'var(--background)' }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: 'var(--foreground)' }}>
                    {item.explanation}
                  </p>
                  {item.mitigation && (
                    <div className="mt-3 flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'var(--background)' }}>
                      <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <span className="font-medium">Mitigation:</span> {item.mitigation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-medium">What to Do</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Deal breakers typically mean you should walk away. Major concerns may be acceptable
            if you can verify the issue or negotiate a lower price. Minor issues are
            negotiating points but rarely reasons to pass.
          </p>
        </div>
      </div>
    </div>
  );
}

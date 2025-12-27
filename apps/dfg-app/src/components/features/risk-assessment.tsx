'use client';

import * as React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Eye,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// Evidence status types - V2.7: observed/unverified/info_gap
export type EvidenceStatus = 'observed' | 'unverified' | 'info_gap';

export interface RiskItem {
  id: string;
  severity: 'deal_breaker' | 'major_concern' | 'minor_issue' | 'info_gap';
  evidence: EvidenceStatus;
  title: string;
  description: string;
  action: string;
  clearable: boolean;
}

export interface TwoAxisVerdict {
  economics: 'BUY' | 'PASS';
  readiness: 'CLEARED' | 'GATED';
  display: string;
  gates: string[];
  explanation: string;
}

export interface RiskBanner {
  headline: string;
  subtext: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
}

// V2.7 format with observed/unverified/info_gap
export interface RiskAssessmentData {
  observed_issues: RiskItem[];
  unverified_risks: RiskItem[];
  info_gaps: RiskItem[];
  verdict: TwoAxisVerdict;
  summary: {
    observed_count: number;
    unverified_count: number;
    info_gap_count: number;
    has_deal_breakers: boolean;
    observed_deal_breakers: number;
    observed_major_concerns: number;
    observed_minor_issues: number;
    gates_blocking: string[];
  };
}

// Legacy V2.6 format (confirmed/suspected)
export interface LegacyV26Data {
  confirmed_issues: RiskItem[];
  suspected_issues: RiskItem[];
  info_gaps: RiskItem[];
  verdict: TwoAxisVerdict;
  summary: {
    confirmed_count: number;
    suspected_count: number;
    info_gap_count: number;
    has_deal_breakers: boolean;
    gates_blocking: string[];
  };
}

// Even older legacy format
export interface LegacyRiskAssessmentData {
  deal_breakers: Array<{ id: string; severity: string; title: string; description: string; clearable: boolean }>;
  major_risks: Array<{ id: string; severity: string; title: string; description: string; clearable: boolean }>;
  minor_issues: Array<{ id: string; severity: string; title: string; description: string; clearable: boolean }>;
  summary: {
    deal_breaker_count: number;
    major_risk_count: number;
    minor_issue_count: number;
    blocks_bidding: boolean;
    requires_verification: string[];
  };
}

interface RiskAssessmentProps {
  data: RiskAssessmentData | LegacyV26Data | LegacyRiskAssessmentData;
  banner?: RiskBanner;
  className?: string;
}

// Evidence badge component - V2.7 style
function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const config = {
    observed: {
      label: 'Observed',
      icon: Eye,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    },
    unverified: {
      label: 'Unverified',
      icon: Search,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    },
    info_gap: {
      label: 'Unknown',
      icon: HelpCircle,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
    // Legacy support
    confirmed: {
      label: 'Confirmed',
      icon: Eye,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    },
    suspected: {
      label: 'Suspected',
      icon: Search,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    },
    unknown: {
      label: 'Unknown',
      icon: HelpCircle,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
  }[status] || {
    label: 'Unknown',
    icon: HelpCircle,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function RiskItemDisplay({ item, showEvidence = true }: { item: RiskItem; showEvidence?: boolean }) {
  const [isHighlighted, setIsHighlighted] = React.useState(false);
  const itemRef = React.useRef<HTMLDivElement>(null);

  // Listen for highlight events
  React.useEffect(() => {
    const handleHighlight = (e: CustomEvent<{ category: string }>) => {
      const category = e.detail.category?.toLowerCase();
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();

      // Match category to item content
      const matches =
        (category === 'price' && (titleLower.includes('price') || titleLower.includes('value') || descLower.includes('price'))) ||
        (category === 'title' && (titleLower.includes('title') || descLower.includes('title'))) ||
        (category === 'condition' && (titleLower.includes('condition') || titleLower.includes('damage') || titleLower.includes('rust') || titleLower.includes('wear'))) ||
        (category === 'timing' && (titleLower.includes('time') || titleLower.includes('end') || titleLower.includes('auction')));

      if (matches) {
        setIsHighlighted(true);
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after animation
        setTimeout(() => setIsHighlighted(false), 2000);
      }
    };

    window.addEventListener('highlight-risk-item', handleHighlight as EventListener);
    return () => window.removeEventListener('highlight-risk-item', handleHighlight as EventListener);
  }, [item.title, item.description]);

  const severityConfig = {
    deal_breaker: {
      icon: ShieldAlert,
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      textColor: 'text-red-600 dark:text-red-400',
    },
    major_concern: {
      icon: AlertTriangle,
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.5)',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    minor_issue: {
      icon: Info,
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    info_gap: {
      icon: HelpCircle,
      bgColor: 'rgba(107, 114, 128, 0.1)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      textColor: 'text-gray-600 dark:text-gray-400',
    },
  }[item.severity];

  const Icon = severityConfig.icon;

  return (
    <div
      ref={itemRef}
      data-risk-item={item.id}
      className={`p-3 rounded-lg border-l-4 flex items-start gap-3 transition-all duration-300 ${
        isHighlighted ? 'ring-2 ring-offset-2 ring-blue-500 scale-[1.02]' : ''
      }`}
      style={{
        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.15)' : severityConfig.bgColor,
        borderLeftColor: severityConfig.borderColor,
      }}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${severityConfig.textColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${severityConfig.textColor}`}>
            {item.title}
          </span>
          {showEvidence && item.evidence && (
            <EvidenceBadge status={item.evidence} />
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {item.description}
        </p>
        {item.action && (
          <p className="text-xs mt-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Action: {item.action}
          </p>
        )}
      </div>
    </div>
  );
}

// Check format type
function isV27Format(data: any): data is RiskAssessmentData {
  return 'observed_issues' in data;
}

function isV26Format(data: any): data is LegacyV26Data {
  return 'confirmed_issues' in data;
}

export function RiskAssessment({ data, banner, className = '' }: RiskAssessmentProps) {
  // Handle V2.7 format (observed/unverified/info_gap)
  if (isV27Format(data)) {
    const { observed_issues, unverified_risks, info_gaps, verdict, summary } = data;
    const hasAnyIssues = observed_issues.length > 0 || unverified_risks.length > 0 || info_gaps.length > 0;

    if (!hasAnyIssues) {
      return (
        <div
          className={`p-4 rounded-lg border-2 ${className}`}
          style={{
            borderColor: 'rgba(34, 197, 94, 0.5)',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">
                No Issues Detected
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Analysis found no significant concerns.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Risk Banner - uses correct severity-based headline */}
        {banner && (
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: banner.severity === 'critical'
                ? 'rgba(239, 68, 68, 0.5)'
                : banner.severity === 'warning'
                  ? 'rgba(245, 158, 11, 0.5)'
                  : banner.severity === 'success'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(107, 114, 128, 0.3)',
              backgroundColor: banner.severity === 'critical'
                ? 'rgba(239, 68, 68, 0.05)'
                : banner.severity === 'warning'
                  ? 'rgba(245, 158, 11, 0.05)'
                  : banner.severity === 'success'
                    ? 'rgba(34, 197, 94, 0.05)'
                    : 'rgba(107, 114, 128, 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              {banner.severity === 'critical' && (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              )}
              {banner.severity === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className={`font-bold ${
                banner.severity === 'critical' ? 'text-red-600' :
                banner.severity === 'warning' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {banner.headline}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {banner.subtext}
            </p>
          </div>
        )}

        {/* Two-axis verdict display */}
        {verdict && (
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: verdict.economics === 'BUY'
                ? verdict.readiness === 'CLEARED'
                  ? 'rgba(34, 197, 94, 0.5)'
                  : 'rgba(245, 158, 11, 0.5)'
                : 'rgba(239, 68, 68, 0.5)',
              backgroundColor: verdict.economics === 'BUY'
                ? verdict.readiness === 'CLEARED'
                  ? 'rgba(34, 197, 94, 0.05)'
                  : 'rgba(245, 158, 11, 0.05)'
                : 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Badge
                  className={
                    verdict.economics === 'BUY'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }
                >
                  {verdict.economics}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    verdict.readiness === 'CLEARED'
                      ? 'border-green-600 text-green-600'
                      : 'border-yellow-600 text-yellow-600'
                  }
                >
                  {verdict.readiness}
                </Badge>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {verdict.explanation}
            </p>
            {verdict.gates.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span className="font-medium">Gates blocking: </span>
                {verdict.gates.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {summary.observed_count > 0 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 gap-1">
              <Eye className="h-3 w-3" />
              {summary.observed_count} Observed
            </Badge>
          )}
          {summary.unverified_count > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 gap-1">
              <Search className="h-3 w-3" />
              {summary.unverified_count} Unverified
            </Badge>
          )}
          {summary.info_gap_count > 0 && (
            <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 gap-1">
              <HelpCircle className="h-3 w-3" />
              {summary.info_gap_count} Info Gap{summary.info_gap_count > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Observed issues - these are FACTS */}
        {observed_issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Observed Issues (Confirmed)
            </h4>
            <div className="space-y-2">
              {observed_issues.map((item) => (
                <RiskItemDisplay key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Unverified risks - patterns, NOT facts */}
        {unverified_risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <Search className="h-4 w-4" />
              To Verify (Patterns Detected)
            </h4>
            <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
              These are NOT confirmed issues - verify before assuming they apply.
            </p>
            <div className="space-y-2">
              {unverified_risks.map((item) => (
                <RiskItemDisplay key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Info gaps */}
        {info_gaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Information Gaps
            </h4>
            <div className="space-y-2">
              {info_gaps.map((item) => (
                <RiskItemDisplay key={item.id} item={item} showEvidence={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle V2.6 format (confirmed/suspected)
  if (isV26Format(data)) {
    const { confirmed_issues, suspected_issues, info_gaps, verdict, summary } = data;
    const hasAnyIssues = confirmed_issues.length > 0 || suspected_issues.length > 0 || info_gaps.length > 0;

    if (!hasAnyIssues) {
      return (
        <div
          className={`p-4 rounded-lg border-2 ${className}`}
          style={{
            borderColor: 'rgba(34, 197, 94, 0.5)',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">
                No Issues Identified
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Two-axis verdict display */}
        {verdict && (
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: verdict.economics === 'BUY'
                ? verdict.readiness === 'CLEARED'
                  ? 'rgba(34, 197, 94, 0.5)'
                  : 'rgba(245, 158, 11, 0.5)'
                : 'rgba(239, 68, 68, 0.5)',
              backgroundColor: verdict.economics === 'BUY'
                ? verdict.readiness === 'CLEARED'
                  ? 'rgba(34, 197, 94, 0.05)'
                  : 'rgba(245, 158, 11, 0.05)'
                : 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Badge
                  className={
                    verdict.economics === 'BUY'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }
                >
                  {verdict.economics}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    verdict.readiness === 'CLEARED'
                      ? 'border-green-600 text-green-600'
                      : 'border-yellow-600 text-yellow-600'
                  }
                >
                  {verdict.readiness}
                </Badge>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {verdict.explanation}
            </p>
          </div>
        )}

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {summary.confirmed_count > 0 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
              {summary.confirmed_count} Confirmed
            </Badge>
          )}
          {summary.suspected_count > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
              {summary.suspected_count} Suspected
            </Badge>
          )}
          {summary.info_gap_count > 0 && (
            <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
              {summary.info_gap_count} Info Gap{summary.info_gap_count > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Confirmed issues */}
        {confirmed_issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Confirmed Issues
            </h4>
            <div className="space-y-2">
              {confirmed_issues.map((item) => (
                <RiskItemDisplay key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Suspected issues - to verify */}
        {suspected_issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              To Verify Before Bidding
            </h4>
            <div className="space-y-2">
              {suspected_issues.map((item) => (
                <RiskItemDisplay key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Info gaps */}
        {info_gaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Information Gaps
            </h4>
            <div className="space-y-2">
              {info_gaps.map((item) => (
                <RiskItemDisplay key={item.id} item={item} showEvidence={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle oldest legacy format
  const { deal_breakers, major_risks, minor_issues, summary } = data as LegacyRiskAssessmentData;
  const hasAnyRisks = deal_breakers.length > 0 || major_risks.length > 0 || minor_issues.length > 0;

  if (!hasAnyRisks) {
    return (
      <div
        className={`p-4 rounded-lg border-2 ${className}`}
        style={{
          borderColor: 'rgba(34, 197, 94, 0.5)',
          backgroundColor: 'rgba(34, 197, 94, 0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">
              No Risk Factors Identified
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Convert legacy items to new format for display
  const convertLegacy = (items: typeof deal_breakers, severity: RiskItem['severity']): RiskItem[] =>
    items.map(item => ({
      ...item,
      severity,
      evidence: 'info_gap' as EvidenceStatus,
      action: '',
    }));

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {summary.deal_breaker_count > 0 && (
          <Badge variant="destructive">
            {summary.deal_breaker_count} Deal Breaker{summary.deal_breaker_count > 1 ? 's' : ''}
          </Badge>
        )}
        {summary.major_risk_count > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800">
            {summary.major_risk_count} Major Risk{summary.major_risk_count > 1 ? 's' : ''}
          </Badge>
        )}
        {summary.minor_issue_count > 0 && (
          <Badge variant="outline">
            {summary.minor_issue_count} Minor Issue{summary.minor_issue_count > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {deal_breakers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Deal Breakers</h4>
          {convertLegacy(deal_breakers, 'deal_breaker').map((item) => (
            <RiskItemDisplay key={item.id} item={item} showEvidence={false} />
          ))}
        </div>
      )}

      {major_risks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Major Risks</h4>
          {convertLegacy(major_risks, 'major_concern').map((item) => (
            <RiskItemDisplay key={item.id} item={item} showEvidence={false} />
          ))}
        </div>
      )}

      {minor_issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Minor Issues</h4>
          {convertLegacy(minor_issues, 'minor_issue').map((item) => (
            <RiskItemDisplay key={item.id} item={item} showEvidence={false} />
          ))}
        </div>
      )}
    </div>
  );
}

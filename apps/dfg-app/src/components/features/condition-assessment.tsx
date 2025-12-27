'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  Wrench,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  Image,
  FileText,
  Fingerprint,
  MessageCircle,
  Lightbulb,
  Box,
} from 'lucide-react';

type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

interface ConditionArea {
  name: string;
  rating: ConditionRating;
  notes?: string;
  details?: string[];
}

// Evidence types from backend
// DIRECT (can verify): photo, listing_text, vin_decode, seller_stated
// INDIRECT (cannot verify alone): pattern, inferred, default
type DirectEvidenceType = 'photo' | 'listing_text' | 'vin_decode' | 'seller_stated';
type IndirectEvidenceType = 'pattern' | 'inferred' | 'default';
type EvidenceType = DirectEvidenceType | IndirectEvidenceType;

interface SourceRef {
  photo_indices?: number[];      // e.g., [0, 2, 5] for photos 1, 3, 6
  text_snippet?: string;         // First 50 chars of matching sentence
  text_hash?: string;            // Hash of full matching text for lookup
  vin_provider?: string;         // e.g., "NHTSA", "CarFax"
  seller_method?: string;        // e.g., "listing_description", "phone_call"
}

interface EvidenceCitation {
  type: EvidenceType;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  detail?: string;
  source_ref?: SourceRef;        // Traceable reference to actual source
}

interface SubsystemEvidence {
  claim: string;
  evidence: EvidenceCitation[];
  verified: boolean;
  verification_basis?: string;   // Explicit explanation of why verified/not
  summary: string;
}

interface EvidenceLedger {
  frame?: SubsystemEvidence;
  axles?: SubsystemEvidence;
  tires?: SubsystemEvidence;
  brakes?: SubsystemEvidence;
  lights?: SubsystemEvidence;
  exterior?: SubsystemEvidence;
  interior?: SubsystemEvidence;
  mechanical?: SubsystemEvidence;
  title?: SubsystemEvidence;
  total_claims: number;
  verified_claims: number;
  photo_backed: number;
  text_backed: number;
  inferred: number;
}

interface ConditionAssessmentProps {
  overallCondition?: string;
  areas: ConditionArea[];
  summary?: string;
  className?: string;
  evidenceLedger?: EvidenceLedger;
}

const ratingConfig: Record<ConditionRating, { label: string; color: string; bgColor: string; icon: React.ReactNode; score: number }> = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: <CheckCircle className="h-5 w-5" />,
    score: 5,
  },
  good: {
    label: 'Good',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: <CheckCircle className="h-5 w-5" />,
    score: 4,
  },
  fair: {
    label: 'Fair',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: <AlertCircle className="h-5 w-5" />,
    score: 3,
  },
  poor: {
    label: 'Poor',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: <XCircle className="h-5 w-5" />,
    score: 2,
  },
  unknown: {
    label: 'Unknown',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: <HelpCircle className="h-5 w-5" />,
    score: 0,
  },
};

// Parse condition text into rating
function parseRating(text: string): ConditionRating {
  const lower = text.toLowerCase();
  if (lower.includes('excellent') || lower.includes('mint') || lower.includes('like new') || lower.includes('perfect')) {
    return 'excellent';
  }
  if (lower.includes('good') || lower.includes('clean') || lower.includes('well maintained') || lower.includes('nice')) {
    return 'good';
  }
  if (lower.includes('fair') || lower.includes('average') || lower.includes('normal wear') || lower.includes('decent')) {
    return 'fair';
  }
  if (lower.includes('poor') || lower.includes('bad') || lower.includes('rough') || lower.includes('damaged') || lower.includes('needs work')) {
    return 'poor';
  }
  return 'unknown';
}

// Parse raw condition data into structured areas
export function parseConditionData(raw: any): ConditionArea[] {
  if (!raw) return [];

  const areas: ConditionArea[] = [];

  // If it's a string, try to parse it
  if (typeof raw === 'string') {
    const sections = raw.split(/[;\n]/).filter(s => s.trim().length > 0);
    for (const section of sections) {
      const [name, ...rest] = section.split(':');
      if (name) {
        const details = rest.join(':').trim();
        areas.push({
          name: name.trim(),
          rating: parseRating(details || name),
          notes: details || undefined,
        });
      }
    }
    return areas;
  }

  // If it's an object with known fields
  if (typeof raw === 'object') {
    const knownAreas = [
      { key: 'exterior', name: 'Exterior' },
      { key: 'interior', name: 'Interior' },
      { key: 'mechanical', name: 'Mechanical' },
      { key: 'tires', name: 'Tires' },
      { key: 'engine', name: 'Engine' },
      { key: 'transmission', name: 'Transmission' },
      { key: 'electrical', name: 'Electrical' },
      { key: 'body', name: 'Body' },
      { key: 'paint', name: 'Paint' },
      { key: 'frame', name: 'Frame' },
    ];

    for (const { key, name } of knownAreas) {
      if (raw[key]) {
        const value = raw[key];
        if (typeof value === 'string') {
          areas.push({
            name,
            rating: parseRating(value),
            notes: value,
          });
        } else if (typeof value === 'object') {
          areas.push({
            name,
            rating: parseRating(value.rating || value.condition || ''),
            notes: value.notes || value.description,
            details: value.details || value.issues,
          });
        }
      }
    }

    // Also check for a general condition
    if (raw.overall || raw.general || raw.condition) {
      const value = raw.overall || raw.general || raw.condition;
      if (typeof value === 'string' && !areas.some(a => a.name === 'Overall')) {
        areas.unshift({
          name: 'Overall',
          rating: parseRating(value),
          notes: value,
        });
      }
    }
  }

  return areas;
}

// Map area names to evidence ledger keys
const areaToLedgerKey: Record<string, keyof EvidenceLedger> = {
  'Frame': 'frame',
  'Axles': 'axles',
  'Tires': 'tires',
  'Brakes': 'brakes',
  'Lights': 'lights',
  'Exterior': 'exterior',
  'Interior': 'interior',
  'Mechanical': 'mechanical',
  'Engine': 'mechanical',
  'Title': 'title',
};

// Direct evidence types that can contribute to verification
const DIRECT_TYPES: EvidenceType[] = ['photo', 'listing_text', 'vin_decode', 'seller_stated'];

// Icon for each evidence type
function EvidenceTypeIcon({ type, className }: { type: EvidenceType; className?: string }) {
  const iconClass = cn('h-4 w-4', className);
  switch (type) {
    case 'photo':
      return <Image className={iconClass} />;
    case 'listing_text':
      return <FileText className={iconClass} />;
    case 'vin_decode':
      return <Fingerprint className={iconClass} />;
    case 'seller_stated':
      return <MessageCircle className={iconClass} />;
    case 'pattern':
      return <Lightbulb className={iconClass} />;
    case 'inferred':
      return <Lightbulb className={iconClass} />;
    case 'default':
      return <Box className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
}

// Evidence type label
function getEvidenceTypeLabel(type: EvidenceType): string {
  switch (type) {
    case 'photo': return 'Photo';
    case 'listing_text': return 'Listing Text';
    case 'vin_decode': return 'VIN Decode';
    case 'seller_stated': return 'Seller Stated';
    case 'pattern': return 'Pattern Match';
    case 'inferred': return 'Inferred';
    case 'default': return 'Default';
    default: return type;
  }
}

// Evidence badge component - tap to expand drawer showing citations
function EvidenceBadge({ evidence }: { evidence: SubsystemEvidence }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!evidence || evidence.evidence.length === 0) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        No evidence
      </span>
    );
  }

  const directEvidence = evidence.evidence.filter(e => DIRECT_TYPES.includes(e.type));
  const hasPhoto = evidence.evidence.some(e => e.type === 'photo');
  const hasText = evidence.evidence.some(e => e.type === 'listing_text');
  const isInferredOnly = directEvidence.length === 0;

  // Color based on verification status
  const bgColor = evidence.verified
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    : isInferredOnly
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';

  const borderColor = evidence.verified
    ? 'border-green-200 dark:border-green-800'
    : isInferredOnly
      ? 'border-yellow-200 dark:border-yellow-800'
      : 'border-blue-200 dark:border-blue-800';

  // Build display text
  const getDisplayText = () => {
    if (evidence.verified) {
      if (hasPhoto && hasText) return 'photo + text';
      if (hasPhoto) {
        const photoEvidence = evidence.evidence.find(e => e.type === 'photo');
        return photoEvidence?.confidence === 'high' ? 'high-conf photo' : 'photo';
      }
      if (hasText) return 'listing text';
      return 'direct evidence';
    } else {
      if (isInferredOnly) return 'inferred only';
      if (hasPhoto || hasText) return 'insufficient conf';
      return 'no direct evidence';
    }
  };

  return (
    <div className="inline-block">
      {/* Clickable badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1 transition-all',
          'hover:ring-1 hover:ring-offset-1 focus:outline-none focus:ring-1 focus:ring-offset-1',
          bgColor
        )}
      >
        {evidence.verified ? '✓' : '⚠'}
        {hasPhoto && <Image className="h-3 w-3" />}
        {hasText && <FileText className="h-3 w-3" />}
        {isInferredOnly && <Lightbulb className="h-3 w-3" />}
        <span>{getDisplayText()}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Expanded drawer */}
      {isExpanded && (
        <div
          className={cn(
            'mt-2 p-3 rounded-lg border text-sm',
            borderColor
          )}
          style={{ backgroundColor: 'var(--background)' }}
        >
          {/* Verification status header */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            {evidence.verified ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            )}
            <span className="font-medium">
              {evidence.verified ? 'Verified' : 'Not Verified'}
            </span>
          </div>

          {/* Verification basis */}
          {evidence.verification_basis && (
            <p className="text-xs mb-3 italic" style={{ color: 'var(--muted-foreground)' }}>
              {evidence.verification_basis}
            </p>
          )}

          {/* Claim */}
          <div className="mb-3">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Claim:
            </p>
            <p className="text-sm">{evidence.claim}</p>
          </div>

          {/* Evidence citations */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
              Evidence ({evidence.evidence.length}):
            </p>
            <div className="space-y-2">
              {evidence.evidence.map((e, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded text-xs flex items-start gap-2',
                    DIRECT_TYPES.includes(e.type)
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  <EvidenceTypeIcon
                    type={e.type}
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      DIRECT_TYPES.includes(e.type)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium">{getEvidenceTypeLabel(e.type)}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded',
                          e.confidence === 'high'
                            ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
                            : e.confidence === 'medium'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        )}
                      >
                        {e.confidence}
                      </span>
                    </div>
                    {e.detail && (
                      <p className="text-gray-600 dark:text-gray-400">{e.detail}</p>
                    )}
                    {/* Source references */}
                    {e.source_ref && (
                      <div className="mt-1 text-[10px] space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {e.source_ref.photo_indices && (
                          <p>Photos: {e.source_ref.photo_indices.map(idx => idx + 1).join(', ')}</p>
                        )}
                        {e.source_ref.text_snippet && (
                          <p className="italic truncate">&quot;{e.source_ref.text_snippet}&quot;</p>
                        )}
                        {e.source_ref.vin_provider && (
                          <p>VIN: {e.source_ref.vin_provider}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {evidence.summary && (
            <p className="mt-3 pt-2 text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              {evidence.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ConditionAssessment({ overallCondition, areas, summary, className, evidenceLedger }: ConditionAssessmentProps) {
  // Calculate overall score WITH coverage penalty
  const scoredAreas = areas.filter(a => a.rating !== 'unknown');
  const unknownAreas = areas.filter(a => a.rating === 'unknown');
  const totalAreas = areas.length;

  // Coverage ratio: how much do we actually know?
  const coverageRatio = totalAreas > 0 ? scoredAreas.length / totalAreas : 0;

  // Raw average score (only from known areas)
  const rawAverageScore = scoredAreas.length > 0
    ? scoredAreas.reduce((sum, a) => sum + ratingConfig[a.rating].score, 0) / scoredAreas.length
    : 0;

  // Confidence level based on coverage
  const confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient' =
    coverageRatio >= 0.8 ? 'high' :
    coverageRatio >= 0.6 ? 'medium' :
    coverageRatio >= 0.4 ? 'low' : 'insufficient';

  // Overall rating - but only if we have enough data
  const overallRating: ConditionRating =
    confidenceLevel === 'insufficient' ? 'unknown' :
    rawAverageScore >= 4.5 ? 'excellent' :
    rawAverageScore >= 3.5 ? 'good' :
    rawAverageScore >= 2.5 ? 'fair' :
    rawAverageScore > 0 ? 'poor' : 'unknown';

  const overallConfig = ratingConfig[overallRating];

  // If we have no areas AND no overall condition, show "unknown"
  if (areas.length === 0 && !overallCondition) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-gray-400"
          style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
        >
          <HelpCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Condition Unknown</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Not enough information to assess the vehicle condition. Request more photos or details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Build confidence label
  const confidenceLabels: Record<string, { text: string; color: string }> = {
    high: { text: 'High Confidence', color: 'text-green-600' },
    medium: { text: 'Medium Confidence', color: 'text-blue-600' },
    low: { text: 'Low Confidence', color: 'text-yellow-600' },
    insufficient: { text: 'Insufficient Data', color: 'text-red-600' },
  };

  const confidence = confidenceLabels[confidenceLevel];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Condition Header - now with coverage info */}
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: confidenceLevel === 'insufficient' ? 'rgba(239, 68, 68, 0.5)' :
                       overallRating === 'poor' ? 'rgba(239, 68, 68, 0.5)' :
                       overallRating === 'excellent' ? 'rgba(34, 197, 94, 0.5)' : 'var(--border)',
          background: confidenceLevel === 'insufficient' ? 'rgba(239, 68, 68, 0.05)' : overallConfig.bgColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Overall Condition
            </p>
            <div className="flex items-center gap-2 mt-1">
              {confidenceLevel === 'insufficient' ? (
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  Insufficient Evidence
                </span>
              ) : (
                <>
                  <span className={cn('text-2xl font-bold', overallConfig.color)}>
                    {overallCondition || overallConfig.label}
                  </span>
                  <span className={overallConfig.color}>
                    {overallConfig.icon}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            {confidenceLevel === 'insufficient' ? (
              <>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Coverage</p>
                <p className="text-lg font-bold font-mono text-red-600">
                  {scoredAreas.length}/{totalAreas} verified
                </p>
              </>
            ) : scoredAreas.length > 0 ? (
              <>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Score</p>
                <p className="text-2xl font-bold font-mono">{rawAverageScore.toFixed(1)}/5</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  ({scoredAreas.length}/{totalAreas} verified)
                </p>
              </>
            ) : null}
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', confidence.color)}
            style={{ backgroundColor: 'var(--background)' }}>
            {confidence.text}
          </span>
          {unknownAreas.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {unknownAreas.length} area{unknownAreas.length > 1 ? 's' : ''} not assessed
            </span>
          )}
        </div>

        {summary && (
          <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
            {summary}
          </p>
        )}
      </div>

      {/* Evidence Summary - if we have ledger data */}
      {evidenceLedger && (
        <div
          className="p-3 rounded-lg border flex items-center justify-between"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
        >
          <div className="flex items-center gap-4 text-xs">
            <span className="font-medium">Evidence Summary:</span>
            <span className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400 font-mono">{evidenceLedger.verified_claims}</span>
              <span style={{ color: 'var(--muted-foreground)' }}>verified</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono">📷 {evidenceLedger.photo_backed}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono">📝 {evidenceLedger.text_backed}</span>
            </span>
            {evidenceLedger.inferred > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <span className="font-mono">⚡ {evidenceLedger.inferred}</span>
                <span>inferred</span>
              </span>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {evidenceLedger.total_claims} claims total
          </span>
        </div>
      )}

      {/* Condition by Area */}
      {areas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map((area, index) => {
            const config = ratingConfig[area.rating];
            // Get evidence for this area from ledger
            const ledgerKey = areaToLedgerKey[area.name];
            const areaEvidence = ledgerKey && evidenceLedger ? evidenceLedger[ledgerKey] as SubsystemEvidence | undefined : undefined;

            return (
              <div
                key={index}
                className="p-3 rounded-lg border"
                style={{ borderColor: 'var(--border)', backgroundColor: config.bgColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{area.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-medium', config.color)}>
                      {config.label}
                    </span>
                    <span className={config.color}>
                      {config.icon}
                    </span>
                  </div>
                </div>
                {/* Evidence citation */}
                {areaEvidence && (
                  <div className="mt-2">
                    <EvidenceBadge evidence={areaEvidence} />
                  </div>
                )}
                {area.notes && (
                  <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                    {area.notes}
                  </p>
                )}
                {area.details && area.details.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {area.details.map((detail, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
                        <span className="mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rating Legend */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-medium">Condition Ratings</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400 font-medium">Excellent:</span> Like new
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Good:</span> Minor wear
            </span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">Fair:</span> Normal wear
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-600 dark:text-red-400 font-medium">Poor:</span> Needs work
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

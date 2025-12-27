'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// =============================================================================
// Types (matching dfg-api types)
// =============================================================================

export type VerificationLevel =
  | 'unverified'
  | 'operator_attested'
  | 'documented'
  | 'third_party_confirmed';

export type InputSource =
  | 'listing'
  | 'auctioneer_call'
  | 'in_person'
  | 'vin_report'
  | 'seller'
  | 'other';

export type TriState = 'yes' | 'no' | 'unknown';
export type TitleStatus = 'clean' | 'salvage' | 'rebuilt' | 'bonded' | 'parts_only' | 'unknown';
export type LienStatus = 'none' | 'lien_present' | 'unknown';

export interface OperatorField<T> {
  value: T;
  source: InputSource;
  verificationLevel: VerificationLevel;
  capturedAt: string;
  notes?: string;
}

export interface TitleInputsV1 {
  titleStatus?: OperatorField<TitleStatus>;
  titleInHand?: OperatorField<TriState>;
  lienStatus?: OperatorField<LienStatus>;
  vin?: OperatorField<string>;
  odometerMiles?: OperatorField<number>;
}

export interface OperatorInputs {
  title?: TitleInputsV1;
  overrides?: {
    maxBidOverride?: OperatorField<number>;
    confirmedPrice?: OperatorField<number>;
  };
}

// =============================================================================
// Options
// =============================================================================

const titleStatusOptions = [
  { value: '', label: 'Select status...' },
  { value: 'clean', label: 'Clean' },
  { value: 'salvage', label: 'Salvage' },
  { value: 'rebuilt', label: 'Rebuilt' },
  { value: 'bonded', label: 'Bonded' },
  { value: 'parts_only', label: 'Parts Only' },
  { value: 'unknown', label: 'Unknown' },
];

const titleInHandOptions = [
  { value: '', label: 'Select...' },
  { value: 'yes', label: 'Yes - In hand' },
  { value: 'no', label: 'No - Not in hand' },
  { value: 'unknown', label: 'Unknown' },
];

const lienStatusOptions = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'No liens' },
  { value: 'lien_present', label: 'Lien present' },
  { value: 'unknown', label: 'Unknown' },
];

const sourceOptions = [
  { value: 'listing', label: 'Listing' },
  { value: 'auctioneer_call', label: 'Auctioneer call' },
  { value: 'in_person', label: 'In person' },
  { value: 'vin_report', label: 'VIN report' },
  { value: 'seller', label: 'Seller' },
  { value: 'other', label: 'Other' },
];

const verificationOptions = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'operator_attested', label: 'Operator attested' },
  { value: 'documented', label: 'Documented' },
  { value: 'third_party_confirmed', label: 'Third party confirmed' },
];

// =============================================================================
// Single Field Component
// =============================================================================

interface TitleFieldProps<T> {
  label: string;
  value: T | undefined;
  source: InputSource;
  verification: VerificationLevel;
  children: React.ReactNode;
  onSourceChange: (source: InputSource) => void;
  onVerificationChange: (level: VerificationLevel) => void;
  isCleared?: boolean;
  helpText?: string;
}

function TitleField<T>({
  label,
  value,
  source,
  verification,
  children,
  onSourceChange,
  onVerificationChange,
  isCleared,
  helpText,
}: TitleFieldProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
          {label}
          {isCleared && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {value !== undefined && !isCleared && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </label>
        {helpText && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {helpText}
          </span>
        )}
      </div>

      {/* Main input */}
      <div>{children}</div>

      {/* Source and verification - shown when value is set */}
      {value !== undefined && (
        <div className="flex gap-2 mt-2">
          <Select
            className="flex-1 text-xs h-8"
            value={source}
            onChange={(e) => onSourceChange(e.target.value as InputSource)}
            options={sourceOptions}
          />
          <Select
            className="flex-1 text-xs h-8"
            value={verification}
            onChange={(e) => onVerificationChange(e.target.value as VerificationLevel)}
            options={verificationOptions}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface TitleInputsProps {
  opportunityId: string;
  initialInputs?: OperatorInputs | null;
  onInputsChange?: (inputs: OperatorInputs) => void;
  onSaveSuccess?: () => void;
}

export function TitleInputs({
  opportunityId,
  initialInputs,
  onInputsChange,
  onSaveSuccess,
}: TitleInputsProps) {
  // Local state for form
  const [titleStatus, setTitleStatus] = useState<TitleStatus | ''>(
    initialInputs?.title?.titleStatus?.value || ''
  );
  const [titleStatusSource, setTitleStatusSource] = useState<InputSource>(
    initialInputs?.title?.titleStatus?.source || 'listing'
  );
  const [titleStatusVerification, setTitleStatusVerification] = useState<VerificationLevel>(
    initialInputs?.title?.titleStatus?.verificationLevel || 'unverified'
  );

  const [titleInHand, setTitleInHand] = useState<TriState | ''>(
    initialInputs?.title?.titleInHand?.value || ''
  );
  const [titleInHandSource, setTitleInHandSource] = useState<InputSource>(
    initialInputs?.title?.titleInHand?.source || 'listing'
  );
  const [titleInHandVerification, setTitleInHandVerification] = useState<VerificationLevel>(
    initialInputs?.title?.titleInHand?.verificationLevel || 'unverified'
  );

  const [lienStatus, setLienStatus] = useState<LienStatus | ''>(
    initialInputs?.title?.lienStatus?.value || ''
  );
  const [lienStatusSource, setLienStatusSource] = useState<InputSource>(
    initialInputs?.title?.lienStatus?.source || 'listing'
  );
  const [lienStatusVerification, setLienStatusVerification] = useState<VerificationLevel>(
    initialInputs?.title?.lienStatus?.verificationLevel || 'unverified'
  );

  const [vin, setVin] = useState<string>(
    initialInputs?.title?.vin?.value || ''
  );
  const [vinSource, setVinSource] = useState<InputSource>(
    initialInputs?.title?.vin?.source || 'listing'
  );
  const [vinVerification, setVinVerification] = useState<VerificationLevel>(
    initialInputs?.title?.vin?.verificationLevel || 'unverified'
  );

  const [odometerMiles, setOdometerMiles] = useState<string>(
    initialInputs?.title?.odometerMiles?.value?.toString() || ''
  );
  const [odometerSource, setOdometerSource] = useState<InputSource>(
    initialInputs?.title?.odometerMiles?.source || 'listing'
  );
  const [odometerVerification, setOdometerVerification] = useState<VerificationLevel>(
    initialInputs?.title?.odometerMiles?.verificationLevel || 'unverified'
  );

  // Track if form is dirty
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Build the operator inputs object
  const buildInputs = useCallback((): OperatorInputs => {
    const now = new Date().toISOString();
    const title: TitleInputsV1 = {};

    if (titleStatus) {
      title.titleStatus = {
        value: titleStatus as TitleStatus,
        source: titleStatusSource,
        verificationLevel: titleStatusVerification,
        capturedAt: now,
      };
    }

    if (titleInHand) {
      title.titleInHand = {
        value: titleInHand as TriState,
        source: titleInHandSource,
        verificationLevel: titleInHandVerification,
        capturedAt: now,
      };
    }

    if (lienStatus) {
      title.lienStatus = {
        value: lienStatus as LienStatus,
        source: lienStatusSource,
        verificationLevel: lienStatusVerification,
        capturedAt: now,
      };
    }

    if (vin.trim()) {
      title.vin = {
        value: vin.trim().toUpperCase(),
        source: vinSource,
        verificationLevel: vinVerification,
        capturedAt: now,
      };
    }

    if (odometerMiles.trim()) {
      const miles = parseInt(odometerMiles, 10);
      if (!isNaN(miles) && miles >= 0) {
        title.odometerMiles = {
          value: miles,
          source: odometerSource,
          verificationLevel: odometerVerification,
          capturedAt: now,
        };
      }
    }

    return { title };
  }, [
    titleStatus, titleStatusSource, titleStatusVerification,
    titleInHand, titleInHandSource, titleInHandVerification,
    lienStatus, lienStatusSource, lienStatusVerification,
    vin, vinSource, vinVerification,
    odometerMiles, odometerSource, odometerVerification,
  ]);

  // Notify parent of changes
  useEffect(() => {
    if (isDirty && onInputsChange) {
      onInputsChange(buildInputs());
    }
  }, [isDirty, buildInputs, onInputsChange]);

  // Mark dirty on any change
  const markDirty = () => setIsDirty(true);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const inputs = buildInputs();
      const res = await fetch(`/api/opportunities/${opportunityId}/inputs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) {
        throw new Error('Failed to save inputs');
      }
      setIsDirty(false);
      onSaveSuccess?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Check if gates are cleared (simplified - full logic is in API)
  const isTitleStatusCleared = Boolean(titleStatus && titleStatus !== 'unknown' &&
    ['operator_attested', 'documented', 'third_party_confirmed'].includes(titleStatusVerification));
  const isTitleInHandCleared = Boolean(titleInHand && titleInHand !== 'unknown' &&
    ['operator_attested', 'documented', 'third_party_confirmed'].includes(titleInHandVerification));
  const isLienStatusCleared = Boolean(lienStatus && lienStatus !== 'unknown' &&
    ['operator_attested', 'documented', 'third_party_confirmed'].includes(lienStatusVerification));
  const isOdometerCleared = Boolean(odometerMiles.trim() &&
    ['operator_attested', 'documented', 'third_party_confirmed'].includes(odometerVerification));
  const isVinCleared = Boolean(vin.trim().length === 17 &&
    ['operator_attested', 'documented', 'third_party_confirmed'].includes(vinVerification));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Title Information</span>
          {isDirty && (
            <span className="text-xs font-normal px-2 py-1 rounded bg-yellow-500 text-white">
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title Status */}
        <TitleField
          label="Title Status"
          value={titleStatus || undefined}
          source={titleStatusSource}
          verification={titleStatusVerification}
          onSourceChange={(s) => { setTitleStatusSource(s); markDirty(); }}
          onVerificationChange={(v) => { setTitleStatusVerification(v); markDirty(); }}
          isCleared={isTitleStatusCleared}
          helpText="Critical gate"
        >
          <Select
            value={titleStatus}
            onChange={(e) => { setTitleStatus(e.target.value as TitleStatus | ''); markDirty(); }}
            options={titleStatusOptions}
          />
        </TitleField>

        {/* Title In Hand */}
        <TitleField
          label="Title In Hand"
          value={titleInHand || undefined}
          source={titleInHandSource}
          verification={titleInHandVerification}
          onSourceChange={(s) => { setTitleInHandSource(s); markDirty(); }}
          onVerificationChange={(v) => { setTitleInHandVerification(v); markDirty(); }}
          isCleared={isTitleInHandCleared}
          helpText="Critical gate"
        >
          <Select
            value={titleInHand}
            onChange={(e) => { setTitleInHand(e.target.value as TriState | ''); markDirty(); }}
            options={titleInHandOptions}
          />
        </TitleField>

        {/* Lien Status */}
        <TitleField
          label="Lien Status"
          value={lienStatus || undefined}
          source={lienStatusSource}
          verification={lienStatusVerification}
          onSourceChange={(s) => { setLienStatusSource(s); markDirty(); }}
          onVerificationChange={(v) => { setLienStatusVerification(v); markDirty(); }}
          isCleared={isLienStatusCleared}
          helpText="Critical gate"
        >
          <Select
            value={lienStatus}
            onChange={(e) => { setLienStatus(e.target.value as LienStatus | ''); markDirty(); }}
            options={lienStatusOptions}
          />
        </TitleField>

        {/* Odometer Miles */}
        <TitleField
          label="Odometer (Miles)"
          value={odometerMiles || undefined}
          source={odometerSource}
          verification={odometerVerification}
          onSourceChange={(s) => { setOdometerSource(s); markDirty(); }}
          onVerificationChange={(v) => { setOdometerVerification(v); markDirty(); }}
          isCleared={isOdometerCleared}
          helpText="Critical gate"
        >
          <Input
            type="number"
            placeholder="Enter mileage..."
            value={odometerMiles}
            onChange={(e) => { setOdometerMiles(e.target.value); markDirty(); }}
            min={0}
          />
        </TitleField>

        {/* VIN */}
        <TitleField
          label="VIN"
          value={vin || undefined}
          source={vinSource}
          verification={vinVerification}
          onSourceChange={(s) => { setVinSource(s); markDirty(); }}
          onVerificationChange={(v) => { setVinVerification(v); markDirty(); }}
          isCleared={isVinCleared}
          helpText="Confidence gate"
        >
          <Input
            placeholder="17-character VIN..."
            value={vin}
            onChange={(e) => { setVin(e.target.value.toUpperCase()); markDirty(); }}
            maxLength={17}
            className="font-mono"
          />
          {vin && vin.length !== 17 && (
            <p className="text-xs mt-1 text-yellow-600">
              VIN should be 17 characters (currently {vin.length})
            </p>
          )}
        </TitleField>

        {/* Save Button */}
        {saveError && (
          <div className="text-red-600 text-sm">{saveError}</div>
        )}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty}
          >
            Save Title Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
